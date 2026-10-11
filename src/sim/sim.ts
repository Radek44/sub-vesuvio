/**
 * The rules: a pure, fixed-step (60 Hz) simulation of the open city. No clock, no DOM, no Three.js, no
 * Math.random. Distances are voxels (1/8 m) on the current district's own VoxelWorld, so the hero collides
 * with exactly what the screen draws.
 *
 * - The hero walks with ymir/voxel `moveBody` (steps up kerbs, never through walls). Walking into a street's
 *   exit goes on to the next district.
 * - "Act" talks to, reads, buys at or picks up the nearest thing in reach (ymir/core `nearestInteractable`).
 * - Conversations run on ymir/dialogue `step`: the sim lends it the story flags, the inventory and the quests
 *   (`test`) and lingua's checker (`check`), and applies the effects it returns. The world pauses meanwhile.
 * - Shops: the hero opens one at its counter and buys with asses.
 * - Townsfolk walk their loops on a clock that stops while you talk (`walk`): positions are a function of it.
 * - Ferox guards the door until he's commanded; then he follows a few steps behind, district to district.
 * - The toll collector stops anyone who hasn't spoken to him from walking through the gate.
 */
import { nearestInteractable, type Interactable } from 'ymir/core';
import { settle, step as talkStep, type Cursor, type Ctx } from 'ymir/dialogue';
import { moveBody, type Body, type BodyShape } from 'ymir/voxel';
import type { StepSim } from 'ymir/testkit';
import { check, type ChooseTask, type Grade, type Feedback } from '../lingua';
import { SCRIPT, talkFor, type Cond, type Effect, type Objective } from '../content';
import { ITEMS, START_COINS, type ItemId } from '../content/items';
import { QUESTS } from '../content/quests';
import { GATE } from '../level/portaMarina';
import { district, type DistrictId, type Level } from '../level';
import type { Walker } from '../level/types';

export const STEP_MS = 1000 / 60;
const DT = STEP_MS / 1000;
/** Walking and running, voxels per second (≈ 1.6 and 3.6 m/s). Sandals add a fifth to a run. */
export const WALK = 13, RUN = 29, SANDALS = 1.2;
export const HERO: BodyShape = { radius: 2, height: 13, step: 3, gravity: 160, maxFall: 120 };
const DOG_SHAPE: BodyShape = { radius: 2.5, height: 8, step: 3, gravity: 160, maxFall: 120 };
/** How near (voxels) the hero must be to act on something. */
const REACH = 14;

export type FeroxMode = 'guard' | 'sit' | 'follow';
export interface Ferox { body: Body; facing: number; mode: FeroxMode; speed: number; district: DistrictId }
export interface Talk {
  script: string;
  cursor: Cursor;
  /** Who is being spoken with (an npc or walker id), for the world to turn them. */
  with?: string;
  /** The last answer's grade and feedback (the UI shows it until the question comes back). */
  result?: Grade;
  feedback?: Feedback;
}
export interface State {
  t: number;
  district: DistrictId;
  hero: Body;
  facing: number;
  /** Ground speed this step, voxels/s (for the walk cycle). */
  speed: number;
  ferox: Ferox;
  talk: Talk | null;
  /** The shop whose counter the hero is at (its panel is open), or null. */
  shop: string | null;
  /** The townsfolk's walking clock (ms): it stops while the hero talks or shops. */
  walk: number;
  flags: string[];
  objective: Objective;
  name: string;
  coins: number;
  items: Partial<Record<ItemId, number>>;
  /** Side quests by id: the stage each has reached. */
  quests: Record<string, string>;
  visited: DistrictId[];
  /** Every graded answer, for mastery and the progress report. */
  answers: { id: string; grade: Grade }[];
  /** Conversations finished, by script id. */
  seen: string[];
}

export interface Input {
  /** The stick, −1…1 on the ground plane (x east, z south). */
  x: number;
  z: number;
  run?: boolean;
  /** Act / next line (edge-triggered by the controller). */
  act?: boolean;
  /** At a choice: the option picked (its index among those offered, or its goto). At a prompt: the answer. */
  pick?: string | number;
  answer?: number | string;
  /** At a shop: buy one of this. */
  buy?: ItemId;
  /** Close the shop. */
  close?: boolean;
}
export const IDLE: Input = { x: 0, z: 0 };

const levelOf = (s: State, level?: Level) => (level && level.id === s.district ? level : district(s.district));

export function create(name = 'Marcus', level: Level = district('portaMarina')): State {
  const sp = level.spawns.quay ?? Object.values(level.spawns)[0];
  // Ferox lies across his own threshold at Porta Marina; any other district starts him at the hero's spawn
  const dog = level.npcs.find((n) => n.who === 'Ferox') ?? { x: sp.x - 10, z: sp.z };
  return {
    t: 0,
    district: level.id,
    hero: { x: sp.x, y: sp.y, z: sp.z, vy: 0, grounded: true },
    facing: sp.facing,
    speed: 0,
    ferox: { body: { x: dog.x, y: level.groundAt(dog.x, dog.z), z: dog.z, vy: 0, grounded: true }, facing: 0, mode: 'guard', speed: 0, district: 'portaMarina' },
    talk: { script: 'arrival', cursor: { node: 'arrival', line: 0 } },
    shop: null,
    walk: 0,
    flags: [],
    objective: 'gate',
    name,
    coins: START_COINS,
    items: {},
    quests: {},
    visited: [level.id],
    answers: [],
    seen: [],
  };
}

/** Where a walker is on its loop at `clock` ms, and which way it faces. */
export function walkerAt(w: Walker, clock: number): { x: number; z: number; facing: number } {
  const p = w.path;
  let total = 0;
  const seg: number[] = [];
  for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]); seg.push(l); total += l; }
  if (total <= 0) return { x: p[0][0], z: p[0][1], facing: 0 };
  let d = (((w.phase + (w.speed * clock) / 1000) % total) + total) % total;
  for (let i = 0; i < p.length; i++) {
    if (d <= seg[i] || i === p.length - 1) {
      const a = p[i], b = p[(i + 1) % p.length], k = seg[i] ? d / seg[i] : 0;
      return { x: a[0] + (b[0] - a[0]) * k, z: a[1] + (b[1] - a[1]) * k, facing: Math.atan2(b[0] - a[0], b[1] - a[1]) };
    }
    d -= seg[i];
  }
  return { x: p[0][0], z: p[0][1], facing: 0 };
}

export type Target = Interactable & { talk?: string; shop?: string; take?: ItemId; with?: string };

/** Everything the hero can act on now: spots, people (walkers where they are), shops, pickups, Ferox. */
export function interactables(level: Level, s?: Pick<State, 'walk' | 'flags' | 'ferox' | 'district'>): Target[] {
  const out: Target[] = [];
  for (const sp of level.spots) {
    if (s?.flags.includes(`gone:${sp.id}`)) continue; // someone or something that has left the scene
    if (sp.verb === 'shop') { out.push({ id: sp.id, x: sp.x, z: sp.z, radius: Math.max(REACH, sp.r), verb: 'shop', shop: sp.id.slice(5) }); continue; }
    if (sp.verb === 'take') {
      if (s?.flags.includes(`took:${sp.id}`)) continue;
      out.push({ id: sp.id, x: sp.x, z: sp.z, radius: REACH, verb: 'take', take: sp.id.split(':')[1] as ItemId });
      continue;
    }
    const t = talkFor(sp.id);
    if (t) out.push({ id: sp.id, x: sp.x, z: sp.z, radius: Math.max(REACH, sp.r), verb: sp.verb, talk: t });
  }
  for (const n of level.npcs) {
    if (n.who === 'Ferox') continue;
    const t = talkFor(n.id, n.who);
    if (t) out.push({ id: n.id, x: n.x, z: n.z, radius: REACH + 4, verb: 'speak', talk: t, with: n.id });
  }
  for (const w of level.walkers) {
    const t = talkFor(w.id, w.who);
    if (!t) continue;
    const at = walkerAt(w, s?.walk ?? 0);
    out.push({ id: w.id, x: at.x, z: at.z, radius: REACH + 2, verb: 'speak', talk: t, with: w.id });
  }
  // Ferox, wherever he is in this district; and the House of the Dog's door behind where he lies
  if (!s || s.ferox.district === level.id) {
    const f = s?.ferox.body ?? level.npcs.find((n) => n.who === 'Ferox');
    if (f) out.push({ id: 'ferox', x: f.x, z: f.z, radius: REACH + 4, verb: 'command', talk: 'ferox' });
  }
  const home = level.npcs.find((n) => n.who === 'Ferox');
  if (home) out.push({ id: 'door', x: home.x, z: home.z - 16, radius: REACH, verb: 'knock', talk: 'door' });
  return out;
}

const has = (s: State, f: string) => s.flags.includes(f);
const count = (s: State, i: ItemId) => s.items[i] ?? 0;
const stageIndex = (q: string, stage: string) => QUESTS[q]?.order.indexOf(stage) ?? -1;

/** The conversation context: the hero's name, story flags, inventory and quests, lingua's checker. The UI reads beats with it too. */
export function ctxOf(s: State): Ctx<Cond> {
  return {
    vars: { name: s.name },
    test: (c) => {
      if ('flag' in c) return has(s, c.flag);
      if ('not' in c) return !has(s, c.not);
      if ('has' in c) return count(s, c.has) >= (c.n ?? 1);
      if ('quest' in c) {
        const at = s.quests[c.quest];
        if (at === undefined) return false;
        return c.past ? stageIndex(c.quest, at) >= stageIndex(c.quest, c.stage) : at === c.stage;
      }
      return false;
    },
    check: (_id, answer, data) => {
      const task = (data as { task?: ChooseTask } | undefined)?.task;
      if (!task) return 'wrong';
      return check(task, answer as number).grade;
    },
  };
}

function give(s: State, item: ItemId, n: number): State {
  const now = Math.max(0, Math.min(ITEMS[item].max, count(s, item) + n));
  const items = { ...s.items, [item]: now };
  if (!now) delete items[item];
  return autoAdvance({ ...s, items });
}

/** Quest stages that move on their own when the hero has what they need (four knucklebones: go back). */
function autoAdvance(s: State): State {
  let next = s;
  for (const [id, q] of Object.entries(QUESTS)) {
    const at = next.quests[id];
    for (const a of q.advance ?? []) if (at === a.from && ctxOf(next).test!(a.when)) next = { ...next, quests: { ...next.quests, [id]: a.to } };
  }
  return next;
}

function apply(s: State, effects: Effect[]): State {
  let next = s;
  for (const e of effects) {
    if ('set' in e) { if (!has(next, e.set)) next = { ...next, flags: [...next.flags, e.set] }; }
    else if ('objective' in e) next = { ...next, objective: e.objective };
    else if ('ferox' in e) next = { ...next, ferox: { ...next.ferox, mode: e.ferox } };
    else if ('give' in e) next = give(next, e.give, e.n ?? 1);
    else if ('take' in e) next = give(next, e.take, -(e.n ?? 1));
    else if ('coins' in e) next = { ...next, coins: Math.max(0, next.coins + e.coins) };
    else if ('quest' in e) next = autoAdvance({ ...next, quests: { ...next.quests, [e.quest]: e.stage } });
  }
  return next;
}

/** One step. Never mutates `s`. `level` may be passed for speed; it must be the state's district. */
export function step(s: State, input: Input, level?: Level): State {
  const L = levelOf(s, level);
  let next: State = { ...s, t: s.t + STEP_MS };
  if (next.talk) next = stepTalk(next, input);
  else if (next.shop) next = stepShop(next, input, L);
  else {
    next = { ...next, walk: next.walk + STEP_MS };
    next = stepWalk(next, input, L);
  }
  if (next.district !== s.district) return next; // travelled: Ferox came along already
  return stepFerox(next, L);
}

function stepTalk(s: State, input: Input): State {
  const talk = s.talk!;
  const ctx = ctxOf(s);
  const here = settle(SCRIPT, talk.cursor, ctx);
  if (!here) return endTalk(s);
  const node = SCRIPT[here.node];
  const atPrompt = !node.lines[here.line] && node.then && 'prompt' in node.then && typeof node.then.prompt === 'object';
  const atChoice = !node.lines[here.line] && node.then && 'options' in node.then;
  if (atPrompt) {
    if (input.answer === undefined) return s;
    const id = (node.then as { prompt: { id: string; data?: unknown } }).prompt.id;
    const data = (node.then as { prompt: { data?: unknown } }).prompt.data as { task: ChooseTask };
    const graded = check(data.task, input.answer as number);
    const r = talkStep(SCRIPT, here, { answer: input.answer }, ctx);
    let next = apply(s, r.effects);
    next = { ...next, answers: [...next.answers, { id, grade: graded.grade }] };
    return moveOn(next, { ...talk, result: graded.grade, feedback: graded.feedback }, r.cursor);
  }
  if (atChoice) {
    if (input.pick === undefined) return s;
    const r = talkStep(SCRIPT, here, { pick: input.pick }, ctx);
    return moveOn(apply(s, r.effects), talk, r.cursor);
  }
  if (!input.act) return s;
  const r = talkStep(SCRIPT, here, {}, ctx);
  // the last answer's feedback stays until the question comes back (the UI shows it there)
  return moveOn(apply(s, r.effects), talk, r.cursor);
}

/** After the effects are applied: read on under the new state (a line can unlock the next). */
function moveOn(s: State, talk: Talk, cursor: Cursor | null): State {
  const next = cursor && settle(SCRIPT, cursor, ctxOf(s));
  return next ? { ...s, talk: { ...talk, cursor: next } } : endTalk({ ...s, talk });
}

function endTalk(s: State): State {
  const script = s.talk?.script;
  return { ...s, talk: null, seen: script && !s.seen.includes(script) ? [...s.seen, script] : s.seen };
}

/** The shop at the counter: buy what you can afford and carry; close to walk on. */
function stepShop(s: State, input: Input, L: Level): State {
  if (input.close || input.act) return { ...s, shop: null };
  if (!input.buy) return s;
  const shop = L.shops.find((x) => x.id === s.shop);
  const line = shop?.stock.find((x) => x.item === input.buy);
  if (!shop || !line) return s;
  if (s.coins < line.price || count(s, line.item as ItemId) >= ITEMS[line.item as ItemId].max) return s;
  return give({ ...s, coins: s.coins - line.price }, line.item as ItemId, 1);
}

function stepWalk(s: State, input: Input, L: Level): State {
  const m = Math.hypot(input.x, input.z);
  const k = m > 1 ? 1 / m : 1;
  const speed = input.run ? RUN * (count(s, 'sandals') ? SANDALS : 1) : WALK;
  let wish = { x: input.x * k * speed * DT, z: input.z * k * speed * DT };
  // The toll collector stops anyone who hasn't answered him: past the outer face of the gate, back you go.
  if (L.id === 'portaMarina' && !has(s, 'passedGate') && s.hero.x + wish.x > GATE.x0 - 16) wish = { x: Math.min(0, wish.x), z: wish.z };
  const r = moveBody(L.world, s.hero, wish, DT, HERO);
  // People are solid too: a soft push out of anyone standing the hero walks into.
  let body = r.body;
  const solid: { x: number; z: number }[] = L.npcs.filter((n) => n.who !== 'Ferox').map((n) => ({ x: n.x, z: n.z }));
  if (s.ferox.district === L.id && s.ferox.mode !== 'follow') solid.push({ x: s.ferox.body.x, z: s.ferox.body.z });
  for (const n of solid) {
    const dx = body.x - n.x, dz = body.z - n.z, d = Math.hypot(dx, dz), min = HERO.radius + 3;
    if (d < min && d > 1e-6) body = moveBody(L.world, body, { x: (dx / d) * (min - d), z: (dz / d) * (min - d) }, DT, HERO).body;
  }
  // The district's edge holds, except where a street goes on.
  const exit = L.exits.find((e) => body.x >= e.x0 && body.x <= e.x1 && body.z >= e.z0 && body.z <= e.z1);
  if (exit) return travel({ ...s, hero: body }, exit.to, exit.arrive);
  body = { ...body, x: Math.max(2, Math.min(L.width - 3, body.x)), z: Math.max(2, Math.min(L.depth - 3, body.z)) };
  const moved = Math.hypot(body.x - s.hero.x, body.z - s.hero.z) / DT;
  const facing = m > 0.15 ? Math.atan2(input.x, input.z) : s.facing;
  let next: State = { ...s, hero: body, facing, speed: moved };
  // Walking up to the gate starts the toll collector's questions by itself.
  if (L.id === 'portaMarina' && !has(next, 'passedGate') && body.x > GATE.x0 - 22) {
    return { ...next, talk: { script: 'portitor', cursor: { node: 'portitor', line: 0 }, with: 'portitor' } };
  }
  if (input.act) {
    const it = nearestInteractable(interactables(L, next), { x: body.x, z: body.z }, { x: Math.sin(facing), z: Math.cos(facing) });
    if (!it) return next;
    const face = Math.atan2(it.x - body.x, it.z - body.z);
    if (it.shop) return { ...next, shop: it.shop, facing: face };
    if (it.take) return give({ ...next, flags: [...next.flags, `took:${it.id}`], facing: face }, it.take, 1);
    if (it.talk) return { ...next, talk: { script: it.talk, cursor: { node: it.talk, line: 0 }, with: it.with }, facing: face };
  }
  return next;
}

/** Into the next district at its spawn; Ferox comes too if he's following. */
export function travel(s: State, to: DistrictId, arrive: string): State {
  const L = district(to);
  const sp = L.spawns[arrive] ?? Object.values(L.spawns)[0];
  const y = L.groundAt(sp.x, sp.z);
  const hero: Body = { x: sp.x, y, z: sp.z, vy: 0, grounded: true };
  const ferox = s.ferox.mode === 'follow'
    ? { ...s.ferox, district: to, body: { ...hero, x: sp.x - Math.sin(sp.facing) * 10, z: sp.z - Math.cos(sp.facing) * 10, y: L.groundAt(sp.x - Math.sin(sp.facing) * 10, sp.z - Math.cos(sp.facing) * 10) }, speed: 0 }
    : s.ferox;
  return { ...s, district: to, hero, facing: sp.facing, speed: 0, ferox, shop: null, visited: s.visited.includes(to) ? s.visited : [...s.visited, to] };
}

function stepFerox(s: State, L: Level): State {
  const f = s.ferox;
  if (f.mode !== 'follow' || f.district !== s.district) return f.speed ? { ...s, ferox: { ...f, speed: 0 } } : s;
  // a spot a little behind the hero
  const tx = s.hero.x - Math.sin(s.facing) * 12, tz = s.hero.z - Math.cos(s.facing) * 12;
  const dx = tx - f.body.x, dz = tz - f.body.z, d = Math.hypot(dx, dz);
  // Too far behind (stuck on a corner): he catches up the way dogs do, by appearing at your heels.
  if (d > 140) return { ...s, ferox: { ...f, body: { x: tx, y: L.groundAt(tx, tz), z: tz, vy: 0, grounded: true }, speed: 0 } };
  if (d < 4) return f.speed ? { ...s, ferox: { ...f, speed: 0 } } : s;
  const speed = d > 30 ? RUN * 1.25 : WALK * 1.15;
  const stepLen = Math.min(d, speed * DT);
  const r = moveBody(L.world, f.body, { x: (dx / d) * stepLen, z: (dz / d) * stepLen }, DT, DOG_SHAPE);
  const moved = Math.hypot(r.body.x - f.body.x, r.body.z - f.body.z) / DT;
  return { ...s, ferox: { ...f, body: r.body, facing: Math.atan2(dx, dz), speed: moved } };
}

/** Where someone standing at (x, z) in the state's district stands (voxels). */
export const groundAt = (level: Level, x: number, z: number): number => level.groundAt(x, z);

export const sim: StepSim<State, Input> = {
  id: 'sub-vesuvio',
  title: 'Sub Vesuvio',
  create: (seed: number) => create(seed % 2 ? 'Marcus' : 'Livia'),
  step: (s, i) => step(s, i),
  idle: IDLE,
  stepMs: STEP_MS,
  time: (s) => s.t,
  over: (s) => s.objective === 'forum',
  metrics: (s) => ({ objective: s.objective, district: s.district, coins: s.coins, flags: s.flags.length, answers: s.answers.length, right: s.answers.filter((a) => a.grade === 'right').length, seconds: Math.round(s.t / 100) / 10 }),
};
