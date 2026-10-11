/**
 * The controller: the only place that combines the sim, input, saves, analytics and the world. It runs
 * the sim in fixed steps (STEP_MS) whatever the frame rate, saves when the story moves, and publishes a
 * view for the UI.
 */
import { createStore } from 'ymir/core';
import { qaParam, saveGame } from 'ymir/platform';
import { bindInput, createInput } from 'ymir/ui';
import { analytics } from './analytics';
import { SAVE, type Save } from './save';
import { create, interactables, step, STEP_MS, type Input, type State } from './sim/sim';
import { portaMarina } from './level/portaMarina';
import { World } from './render/world';
import { nearestInteractable } from 'ymir/core';

export type Screen = 'title' | 'loading' | 'play';
export interface View {
  screen: Screen;
  sim: State;
  save: Save;
  touch: boolean;
  /** What "act" would do now (the prompt above the hero), and where on screen. */
  prompt: { verb: string; x: number; y: number } | null;
  /** 0–1 while the town meshes around the hero. */
  loading: number;
}

const level = portaMarina();
export const store = createStore<View>({ screen: 'title', sim: create('', level), save: SAVE.load(null).state, touch: false, prompt: null, loading: 0 });
export const input = createInput({ act: ['KeyE', 'Space', 'Enter', 'pad:A'], run: ['ShiftLeft', 'ShiftRight', 'pad:B'] });

let world: World | null = null;
let acc = 0;
let moved = false;
/** Inputs the UI queued for the next step (a picked option, an answer, a tap on "next"). */
let queued: Partial<Input> = {};
let total = 1;

export function start(host: HTMLElement, save: Save): () => void {
  store.patch({ save });
  if (qaParam('qa') !== null) Object.assign(window, { __game: {
    sim: () => store.get().sim, view: () => store.get(), act: (i: Partial<Input>) => queue(i),
    // QA only: put the story somewhere (screenshots of later scenes); never used by the game
    patch: (p: Partial<State>) => store.patch({ sim: { ...store.get().sim, ...p } }),
  } });
  const unbind = bindInput(input);
  world = new World(host, level);
  analytics.step('boot', 'load_finished');
  analytics.step('boot', 'title_shown');
  world.stage.start((dt, t) => frame(dt, t));
  return () => { unbind(); world?.dispose(); world = null; };
}

/** Start or continue: from the title screen. */
export function play(name: string): void {
  const save = store.get().save;
  let sim = create(name || 'Marcus', level);
  const st = save.name === name ? save.story : null;
  if (st) {
    sim = { ...sim, flags: st.flags, objective: st.objective, answers: st.answers, seen: st.seen, talk: null,
      hero: { ...sim.hero, x: st.at.x, y: st.at.y, z: st.at.z }, facing: st.at.facing, ferox: { ...sim.ferox, mode: st.ferox } };
    if (st.ferox === 'follow') sim = { ...sim, ferox: { ...sim.ferox, body: { ...sim.hero, x: sim.hero.x - 10 } } };
  }
  if (save.name !== name) analytics.step('ftue', 'named');
  store.patch({ sim, screen: 'loading', save: { ...save, name } });
  total = Math.max(1, world?.preload(sim, 0) ?? 1);
}

export function setLang(lang: 'en' | 'fr'): void { const save = { ...store.get().save, lang }; store.patch({ save }); void saveGame(SAVE, save); }

/** The UI's inputs: next line, an option picked, an answer given. */
export function queue(i: Partial<Input>): void { queued = { ...queued, ...i }; }

function frame(dt: number, t: number): void {
  input.update();
  const view = store.get();
  if (!world) return;
  if (view.screen === 'loading') {
    const left = world.preload(view.sim, 24);
    store.patch({ loading: 1 - left / total });
    if (left === 0) store.patch({ screen: 'play', loading: 1 });
    world.sync(view.sim, t, dt);
    return;
  }
  if (view.screen !== 'play') { world.sync(view.sim, t, dt); return; }
  const v = input.vector();
  let s = view.sim;
  const before = s;
  let act = input.pressed('act') || !!queued.act;
  const extra = { pick: queued.pick, answer: queued.answer };
  queued = {};
  for (acc += dt * 1000; acc >= STEP_MS; acc -= STEP_MS) {
    // the stick is screen-relative; the camera looks north, so screen up is −z
    s = step(s, { x: v.x, z: v.y, run: input.down('run'), act, ...extra }, level);
    act = false; extra.pick = undefined; extra.answer = undefined;
  }
  if (s !== before) {
    if (!moved && (v.x || v.y)) { moved = true; analytics.step('boot', 'first_move'); }
    onStory(before, s);
    store.patch({ sim: s, touch: input.device() === 'touch' });
  }
  world.sync(s, t, dt);
  // the action prompt: what "act" would do, floating over the hero
  if (!s.talk) {
    const it = nearestInteractable(interactables(level), { x: s.hero.x, z: s.hero.z }, { x: Math.sin(s.facing), z: Math.cos(s.facing) });
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
  // save when the story moves (a flag, an objective, an answer) or a conversation ends
  if (gained.length || s.objective !== before.objective || s.answers.length !== before.answers.length || (before.talk && !s.talk)) persist(s);
}

function persist(s: State): void {
  const save: Save = {
    ...store.get().save,
    story: { flags: s.flags, objective: s.objective, answers: s.answers, seen: s.seen, at: { x: s.hero.x, y: s.hero.y, z: s.hero.z, facing: s.facing }, ferox: s.ferox.mode },
  };
  store.patch({ save });
  void saveGame(SAVE, save);
}
