/**
 * The controller: the only place that combines the sim, input, saves, analytics and the world. It runs
 * the sim in fixed steps (STEP_MS) whatever the frame rate, saves when the story moves, swaps the world's
 * district when the hero walks into the next one (behind a short loading screen), and publishes a view for
 * the UI: the screen, the panel open over it, the action prompt, and toasts for what just happened.
 */
import { createStore } from 'ymir/core';
import { qaParam, saveGame } from 'ymir/platform';
import { bindInput, createInput } from 'ymir/ui';
import { nearestInteractable } from 'ymir/core';
import { analytics } from './analytics';
import { SAVE, type Save } from './save';
import { create, interactables, step, travel, STEP_MS, type Input, type State } from './sim/sim';
import { district } from './level';
import { World } from './render/world';
import { resume } from './resume';
import { ITEMS, type ItemId } from './content/items';
import { QUESTS } from './content/quests';

export type Screen = 'title' | 'loading' | 'play';
/** What's open over the town: the satchel, the journal of tasks, the city map. */
export type Panel = 'bag' | 'journal' | 'map' | null;
export interface Toast { id: number; kind: 'item' | 'coins' | 'quest' | 'place'; text: { en: string; fr: string }; la?: string; item?: ItemId }
export interface View {
  screen: Screen;
  sim: State;
  save: Save;
  touch: boolean;
  /** What "act" would do now (the prompt above the hero), and where on screen. */
  prompt: { verb: string; x: number; y: number } | null;
  /** 0–1 while the town meshes around the hero. */
  loading: number;
  panel: Panel;
  toasts: Toast[];
}

export const store = createStore<View>({ screen: 'title', sim: create(''), save: SAVE.load(null).state, touch: false, prompt: null, loading: 0, panel: null, toasts: [] });
export const input = createInput({
  act: ['KeyE', 'Space', 'Enter', 'pad:A'], run: ['ShiftLeft', 'ShiftRight', 'pad:B'],
  bag: ['KeyI', 'KeyB', 'pad:Y'], journal: ['KeyJ', 'pad:X'], map: ['KeyM', 'pad:Back'], back: ['Escape', 'pad:Start'],
  zoomIn: ['Equal', 'NumpadAdd'], zoomOut: ['Minus', 'NumpadSubtract'], gloss: ['KeyT'],
});

let world: World | null = null;
let acc = 0;
let moved = false;
/** Inputs the UI queued for the next step (a picked option, an answer, a tap on "next", a purchase). */
let queued: Partial<Input> = {};
let total = 1;
/** An act press waiting for the next sim step (a fast display can run frames with no step in them). */
let pendingAct = false;
let toastId = 0;

export function start(host: HTMLElement, save: Save): () => void {
  store.patch({ save });
  if (qaParam('qa') !== null) Object.assign(window, { __game: {
    sim: () => store.get().sim, view: () => store.get(), act: (i: Partial<Input>) => queue(i),
    // QA only: put the story somewhere (screenshots of later scenes); never used by the game
    patch: (p: Partial<State>) => store.patch({ sim: { ...store.get().sim, ...p } }),
    panel: (p: Panel) => openPanel(p),
    world: () => world,
    go: (to: State['district'], arrive: string) => { const sim = travel(store.get().sim, to, arrive); store.patch({ sim }); load(sim); },
    teleport: (x: number, z: number, facing?: number) => {
      const s = store.get().sim, L = district(s.district);
      store.patch({ sim: { ...s, hero: { ...s.hero, x, z, y: L.groundAt(x, z), vy: 0, grounded: true }, facing: facing ?? s.facing } });
    },
  } });
  const unbind = bindInput(input);
  // QA: `?quality=high|balanced|low` to compare, `?ladder=0` to never step down, `?fps` for a frame meter
  const q = qaParam('quality');
  world = new World(host, {
    quality: q === 'high' || q === 'balanced' || q === 'low' ? q : undefined,
    ladder: qaParam('ladder') === '0' ? false : undefined,
    fps: qaParam('fps') !== null,
  });
  world.setLang(save.lang);
  world.setGlosses(save.glosses);
  world.setLevel(district('portaMarina'));
  analytics.step('boot', 'load_finished');
  analytics.step('boot', 'title_shown');
  world.stage.start((dt, t) => frame(dt, t));
  const unzoom = bindZoom(), untap = bindTap();
  return () => { unbind(); unzoom(); untap(); world?.dispose(); world = null; };
}

/** Is this event over the town itself (the canvas, or the stick's zone that covers it), not a panel? */
const overTown = (e: Event) => !!(e.target as Element | null)?.closest?.('canvas, [data-joy]');

/**
 * Zoom the camera: the mouse wheel and a trackpad pinch (Chrome and Firefox send it as a wheel with Ctrl,
 * Safari as gesture events) over the town, and a two-finger pinch on a touch screen. The stick's zone covers
 * the town, so events are watched on the document; over a panel the wheel scrolls the panel instead.
 * The keys are input actions.
 */
function bindZoom(): () => void {
  const wheel = (e: WheelEvent) => {
    if (!overTown(e)) return;
    e.preventDefault();
    const px = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    world?.zoomBy(Math.max(-0.15, Math.min(0.15, px / (e.ctrlKey ? 120 : 600))));
  };
  let scale = 1;
  const gStart = (e: Event) => { if (overTown(e)) { e.preventDefault(); scale = 1; } };
  const gChange = (e: Event) => { if (!overTown(e)) return; e.preventDefault(); const k = (e as Event & { scale: number }).scale; world?.zoomBy((scale - k) * 0.8); scale = k; };
  const touches = new Map<number, { x: number; y: number }>();
  let apart = 0;
  const spread = () => { const [a, b] = [...touches.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  const down = (e: PointerEvent) => { if (e.pointerType !== 'touch') return; touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); apart = touches.size === 2 ? spread() : 0; };
  const move = (e: PointerEvent) => {
    if (!touches.has(e.pointerId)) return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size !== 2) return;
    const d = spread();
    if (apart) world?.zoomBy((apart - d) / 500);
    apart = d;
  };
  const up = (e: PointerEvent) => { touches.delete(e.pointerId); apart = 0; };
  document.addEventListener('wheel', wheel, { passive: false });
  document.addEventListener('gesturestart', gStart);
  document.addEventListener('gesturechange', gChange);
  document.addEventListener('pointerdown', down);
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
  document.addEventListener('pointercancel', up);
  return () => {
    document.removeEventListener('wheel', wheel);
    document.removeEventListener('gesturestart', gStart);
    document.removeEventListener('gesturechange', gChange);
    document.removeEventListener('pointerdown', down);
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    document.removeEventListener('pointercancel', up);
  };
}

/**
 * A click or a tap on the town walks the hero there, or up to whoever or whatever was clicked, to act on
 * it. A drag is the stick (ymir/ui `Joystick` covers the town), so only a short press that barely moved counts.
 */
function bindTap(): () => void {
  let down: { id: number; x: number; y: number; t: number } | null = null;
  const press = (e: PointerEvent) => { down = e.isPrimary && e.button === 0 && overTown(e) ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() } : null; };
  const release = (e: PointerEvent) => {
    const d = down;
    down = null;
    if (!d || d.id !== e.pointerId || !world) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10 || performance.now() - d.t > 450) return;
    const v = store.get();
    if (v.screen !== 'play' || v.panel || v.sim.talk || v.sim.shop) return;
    const r = world.stage.canvas.getBoundingClientRect();
    const g = world.pick(e.clientX - r.left, e.clientY - r.top, v.sim);
    if (g) { queue({ goto: g }); analytics.track('walk_to', { act: g.act ? 1 : 0 }); }
  };
  document.addEventListener('pointerdown', press);
  document.addEventListener('pointerup', release);
  return () => { document.removeEventListener('pointerdown', press); document.removeEventListener('pointerup', release); };
}

/** Start (`fresh`: a new journey, even under the same name) or continue: from the title screen. */
export function play(name: string, fresh = false): void {
  const save = store.get().save;
  const sim = resume(name, !fresh && save.name === name ? save.story : null);
  if (save.name !== name) analytics.step('ftue', 'named');
  store.patch({ sim, screen: 'loading', save: { ...save, name }, panel: null });
  load(sim);
}

/**
 * Show the hero's district and mesh around them behind the loading screen. The stage's own loop is paused
 * meanwhile and the loading screen runs its own: the stage judges quality by frame rate and never steps
 * back up, and a loading frame spends most of its time meshing, so counted frames would cost the game its
 * post-processing, shadows and full resolution every time the hero walked into a new district.
 */
function load(s: State): void {
  if (!world) return;
  world.setLevel(district(s.district));
  total = Math.max(1, world.preload(s, 0));
  store.patch({ screen: 'loading', loading: 0 });
  world.stage.pause(true);
  let last = -1, drawn = -1;
  const tick = (now: number) => {
    const w = world, view = store.get();
    if (!w || view.screen !== 'loading') return;
    // The loading screen needs no smooth frame rate: mesh in big slices and show the town building up a
    // few times a second (slow phones and CI's software rendering load faster).
    const left = w.preload(view.sim, 150);
    store.patch({ loading: 1 - left / total });
    if (left === 0 || drawn < 0 || now - drawn > 200) {
      const dt = last < 0 ? 0 : Math.min(0.05, (now - last) / 1000);
      last = drawn = now;
      w.sync(view.sim, now / 1000, dt, true);
      w.drawNow(dt);
    }
    if (left > 0) { requestAnimationFrame(tick); return; }
    store.patch({ screen: 'play', loading: 1 });
    w.stage.pause(false);
  };
  requestAnimationFrame(tick);
}

/** Translations under the Latin labels in town, on or off (the title screen, the HUD, or T). */
export function setGlosses(on: boolean): void {
  const save = { ...store.get().save, glosses: on };
  store.patch({ save });
  world?.setGlosses(on);
  analytics.track('glosses', { on: on ? 1 : 0 });
  void saveGame(SAVE, save);
}

export function setLang(lang: 'en' | 'fr'): void {
  const save = { ...store.get().save, lang };
  store.patch({ save });
  world?.setLang(lang);
  void saveGame(SAVE, save);
}

/** The UI's inputs: next line, an option picked, an answer given, something bought, the shop closed. */
export function queue(i: Partial<Input>): void { queued = { ...queued, ...i }; }

/** Open a panel over the town (or close it with null). The world pauses under a panel. */
export function openPanel(p: Panel): void {
  const cur = store.get().panel;
  const next = cur === p ? null : p;
  if (next) analytics.track('panel', { panel: next });
  store.patch({ panel: next });
}

export function dismissToast(id: number): void { store.patch({ toasts: store.get().toasts.filter((t) => t.id !== id) }); }

function toast(t: Omit<Toast, 'id'>): void {
  const id = ++toastId;
  store.patch({ toasts: [...store.get().toasts.slice(-2), { ...t, id }] });
  setTimeout(() => dismissToast(id), 3200);
}

function frame(dt: number, t: number): void {
  input.update();
  const view = store.get();
  if (!world) return;
  if (view.screen === 'loading') return; // the loading screen runs its own loop (`load`)
  if (view.screen !== 'play') { world.sync(view.sim, t, dt); return; }
  if (input.pressed('gloss')) setGlosses(!store.get().save.glosses);
  if (input.down('zoomIn')) world.zoomBy(-dt * 0.8);
  if (input.down('zoomOut')) world.zoomBy(dt * 0.8);
  // panels: their keys toggle them; Escape closes whatever is open (a panel, then a shop)
  for (const p of ['bag', 'journal', 'map'] as const) if (input.pressed(p) && !view.sim.talk) openPanel(p);
  if (input.pressed('back')) { if (store.get().panel) openPanel(null); else if (view.sim.shop) queue({ close: true }); }
  if (store.get().panel) { world.sync(view.sim, t, dt); queued = {}; acc = 0; return; }
  const v = input.vector();
  let s = view.sim;
  const before = s;
  pendingAct ||= input.pressed('act') || !!queued.act;
  const extra: Partial<Input> = { pick: queued.pick, answer: queued.answer, buy: queued.buy, close: queued.close, goto: queued.goto };
  let stepped = false;
  for (acc += dt * 1000; acc >= STEP_MS; acc -= STEP_MS) {
    // the stick is screen-relative; the camera looks north, so screen up is −z
    s = step(s, { x: v.x, z: v.y, run: input.down('run'), act: pendingAct, ...extra });
    pendingAct = false;
    extra.pick = extra.answer = extra.buy = undefined;
    extra.close = undefined;
    extra.goto = undefined;
    stepped = true;
    if (s.district !== before.district) break;
  }
  // what the UI queued is only spent once a step has read it
  if (stepped) queued = {};
  if (s !== before) {
    if (!moved && (v.x || v.y)) { moved = true; analytics.step('boot', 'first_move'); }
    onStory(before, s);
    store.patch({ sim: s, touch: input.device() === 'touch' });
  }
  if (s.district !== before.district) { acc = 0; load(s); return; }
  world.sync(s, t, dt);
  // the action prompt: what "act" would do, floating over the hero
  if (!s.talk && !s.shop) {
    const it = nearestInteractable(interactables(world.level!, s), { x: s.hero.x, z: s.hero.z }, { x: Math.sin(s.facing), z: Math.cos(s.facing) });
    const p = it ? world.heroScreen(s) : null;
    const cur = store.get().prompt;
    if (!it || !p) { if (cur) store.patch({ prompt: null }); }
    else if (!cur || cur.verb !== it.verb || Math.abs(cur.x - p.x) > 0.5 || Math.abs(cur.y - p.y) > 0.5) store.patch({ prompt: { verb: it.verb, x: p.x, y: p.y } });
  } else if (store.get().prompt) store.patch({ prompt: null });
}

function onStory(before: State, s: State): void {
  if (!before.talk && s.talk) analytics.step('ftue', 'first_talk');
  if (s.answers.length > before.answers.length) {
    const a = s.answers[s.answers.length - 1];
    analytics.step('ftue', 'first_latin');
    analytics.track('answer', { id: a.id, grade: a.grade, step: 'choose' });
  }
  const gained = s.flags.filter((f) => !before.flags.includes(f));
  for (const f of gained) {
    if (f === 'passedGate') analytics.step('ftue', 'passed_gate');
    if (f === 'feroxFollows') analytics.step('ftue', 'ferox_follows');
    if (f === 'foundTablet') analytics.step('ftue', 'found_tablet');
  }
  if (s.objective !== before.objective && s.objective === 'ferox') analytics.step('ftue', 'found_house');
  // what just happened, as toasts: things gained, coins, quests moving on, a new part of town
  for (const id of Object.keys(ITEMS) as ItemId[]) {
    const n = (s.items[id] ?? 0) - (before.items[id] ?? 0);
    if (n > 0) {
      const it = ITEMS[id];
      toast({ kind: 'item', item: id, la: n > 1 ? it.plural ?? it.la : it.la, text: { en: `+${n} ${it.en}`, fr: `+${n} ${it.fr}` } });
      if (before.shop) analytics.track('buy', { item: id, shop: before.shop });
    }
  }
  const dc = s.coins - before.coins;
  if (dc > 0) toast({ kind: 'coins', text: { en: `+${dc} ${dc === 1 ? 'as' : 'asses'}`, fr: `+${dc} as` } });
  for (const [id, stage] of Object.entries(s.quests)) {
    if (before.quests[id] === stage) continue;
    const q = QUESTS[id];
    if (!q) continue;
    const started = before.quests[id] === undefined, done = stage === 'done';
    toast({ kind: 'quest', la: q.title.la, text: started ? { en: `New task: ${q.title.en}`, fr: `Nouvelle tâche : ${q.title.fr}` } : done ? { en: `Done: ${q.title.en}`, fr: `Terminé : ${q.title.fr}` } : { en: q.stages[stage].en, fr: q.stages[stage].fr } });
    analytics.track('quest', { quest: id, stage });
  }
  if (s.district !== before.district) {
    const L = district(s.district);
    if (!before.visited.includes(s.district)) toast({ kind: 'place', text: { en: L.name.en, fr: L.name.fr } });
    analytics.track('travel', { to: s.district, first: !before.visited.includes(s.district) });
  }
  // save when the story moves (a flag, an objective, an answer, a quest, the purse or satchel, a new district) or a conversation ends
  const moved = gained.length || s.objective !== before.objective || s.answers.length !== before.answers.length || (before.talk && !s.talk)
    || s.district !== before.district || s.coins !== before.coins || s.items !== before.items || s.quests !== before.quests;
  if (moved) persist(s);
}

function persist(s: State): void {
  const save: Save = {
    ...store.get().save,
    story: {
      flags: s.flags, objective: s.objective, answers: s.answers, seen: s.seen, at: { x: s.hero.x, y: s.hero.y, z: s.hero.z, facing: s.facing },
      ferox: s.ferox.mode, district: s.district, feroxDistrict: s.ferox.district, coins: s.coins, items: s.items, quests: s.quests, visited: s.visited,
    },
  };
  store.patch({ save });
  void saveGame(SAVE, save);
}
