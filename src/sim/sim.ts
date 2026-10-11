/**
 * The rules: a pure, fixed-step (60 Hz) simulation of the Prologue. No clock, no DOM, no Three.js, no
 * Math.random. Distances are voxels (1/8 m) on the level's own VoxelWorld, so the hero collides with
 * exactly what the screen draws.
 *
 * - The hero walks with ymir/voxel `moveBody` (steps up kerbs, never through walls).
 * - "Act" talks to, reads or looks at the nearest thing in reach (ymir/core `nearestInteractable`).
 * - Conversations run on ymir/dialogue `step`: the sim lends it the story flags (`test`) and lingua's
 *   checker (`check`), and applies the effects it returns. Movement stops while talking.
 * - Ferox guards the door until he's commanded; then he follows a few steps behind.
 * - The toll collector stops anyone who hasn't spoken to him from walking through the gate.
 */
import { nearestInteractable, type Interactable } from 'ymir/core';
import { settle, step as talkStep, type Cursor, type Ctx } from 'ymir/dialogue';
import { moveBody, type Body, type BodyShape } from 'ymir/voxel';
import type { StepSim } from 'ymir/testkit';
import { check, type ChooseTask, type Grade, type Feedback } from '../lingua';
import { PROLOGUE, TALK_TO, type Cond, type Effect, type Objective } from '../content/prologue';
import { GATE, portaMarina, roadY, type Level } from '../level/portaMarina';

export const STEP_MS = 1000 / 60;
const DT = STEP_MS / 1000;
/** Walking and running, voxels per second (≈ 1.6 and 3.6 m/s). */
export const WALK = 13, RUN = 29;
export const HERO: BodyShape = { radius: 2, height: 13, step: 3, gravity: 160, maxFall: 120 };
const DOG_SHAPE: BodyShape = { radius: 2.5, height: 8, step: 3, gravity: 160, maxFall: 120 };
/** How near (voxels) the hero must be to act on something. */
const REACH = 14;

export type FeroxMode = 'guard' | 'sit' | 'follow';
export interface Ferox { body: Body; facing: number; mode: FeroxMode; speed: number }
export interface Talk {
  script: string;
  cursor: Cursor;
  /** The last answer's grade and feedback (the UI shows it until the next input). */
  result?: Grade;
  feedback?: Feedback;
}
export interface State {
  t: number;
  hero: Body;
  facing: number;
  /** Ground speed this step, voxels/s (for the walk cycle). */
  speed: number;
  ferox: Ferox;
  talk: Talk | null;
  flags: string[];
  objective: Objective;
  name: string;
  /** Every graded answer, for mastery and the progress report. */
  answers: { id: string; grade: Grade }[];
  /** Conversations finished, by script id (the UI's "you've read this" marks). */
  seen: string[];
}

export interface Input {
  /** The stick, −1…1 on the ground plane (x east, z south). */
  x: number;
  z: number;
  run?: boolean;
  /** Act / next line (edge-triggered by the controller). */
  act?: boolean;
  /** At a choice: the option picked (its goto). At a prompt: the answer (option index for choose). */
  pick?: string;
  answer?: number | string;
}
export const IDLE: Input = { x: 0, z: 0 };

export function create(name = 'Marcus', level: Level = portaMarina()): State {
  const s = level.spawns.quay;
  const dog = level.npcs.find((n) => n.who === 'Ferox')!;
  const dogY = groundAt(level, dog.x, dog.z);
  return {
    t: 0,
    hero: { x: s.x, y: s.y, z: s.z, vy: 0, grounded: true },
    facing: Math.PI / 2,
    speed: 0,
    ferox: { body: { x: dog.x, y: dogY, z: dog.z, vy: 0, grounded: true }, facing: 0, mode: 'guard', speed: 0 },
    talk: { script: 'arrival', cursor: { node: 'arrival', line: 0 } },
    flags: [],
    objective: 'gate',
    name,
    answers: [],
    seen: [],
  };
}

/** Everything the hero can act on: the level's spots and its people (Ferox included). */
export function interactables(level: Level): (Interactable & { talk: string })[] {
  const out: (Interactable & { talk: string })[] = [];
  for (const s of level.spots) if (TALK_TO[s.id]) out.push({ id: s.id, x: s.x, z: s.z, radius: Math.max(REACH, s.r), verb: s.verb, talk: TALK_TO[s.id] });
  for (const n of level.npcs) {
    const key = n.id === 'ferox' ? 'ferox' : n.id;
    if (TALK_TO[key]) out.push({ id: key, x: n.x, z: n.z, radius: REACH + 4, verb: n.who === 'Ferox' ? 'command' : 'speak', talk: TALK_TO[key] });
  }
  // the house's door: the fauces behind the mosaic (Ferox lies across it until he follows)
  const dog = level.npcs.find((n) => n.who === 'Ferox');
  if (dog) out.push({ id: 'door', x: dog.x, z: dog.z - 16, radius: REACH, verb: 'knock', talk: 'door' });
  return out;
}

const has = (s: State, f: string) => s.flags.includes(f);
/** The conversation context: the hero's name, the story flags, lingua's checker. The UI reads beats with it too. */
export function ctxOf(s: State): Ctx<Cond> {
  return {
    vars: { name: s.name },
    test: (c) => ('flag' in c ? has(s, c.flag) : 'not' in c ? !has(s, c.not) : false),
    check: (_id, answer, data) => {
      const task = (data as { task?: ChooseTask } | undefined)?.task;
      if (!task) return 'wrong';
      return check(task, answer as number).grade;
    },
  };
}

function apply(s: State, effects: Effect[]): State {
  let next = s;
  for (const e of effects) {
    if ('set' in e) { if (!has(next, e.set)) next = { ...next, flags: [...next.flags, e.set] }; }
    else if ('objective' in e) next = { ...next, objective: e.objective };
    else if ('ferox' in e) next = { ...next, ferox: { ...next.ferox, mode: e.ferox } };
  }
  return next;
}

/** One step. Never mutates `s`. */
export function step(s: State, input: Input, level: Level = portaMarina()): State {
  let next: State = { ...s, t: s.t + STEP_MS };
  if (next.talk) next = stepTalk(next, input);
  else next = stepWalk(next, input, level);
  next = stepFerox(next, level);
  return next;
}

function stepTalk(s: State, input: Input): State {
  const talk = s.talk!;
  const ctx = ctxOf(s);
  const here = settle(PROLOGUE, talk.cursor, ctx);
  if (!here) return endTalk(s);
  const node = PROLOGUE[here.node];
  const atPrompt = !node.lines[here.line] && node.then && 'prompt' in node.then && typeof node.then.prompt === 'object';
  const atChoice = !node.lines[here.line] && node.then && 'options' in node.then;
  if (atPrompt) {
    if (input.answer === undefined) return s;
    const id = (node.then as { prompt: { id: string; data?: unknown } }).prompt.id;
    const data = (node.then as { prompt: { data?: unknown } }).prompt.data as { task: ChooseTask };
    const graded = check(data.task, input.answer as number);
    const r = talkStep(PROLOGUE, here, { answer: input.answer }, ctx);
    let next = apply(s, r.effects);
    next = { ...next, answers: [...next.answers, { id, grade: graded.grade }] };
    return moveOn(next, { ...talk, result: graded.grade, feedback: graded.feedback }, r.cursor);
  }
  if (atChoice) {
    if (!input.pick) return s;
    const r = talkStep(PROLOGUE, here, { pick: input.pick }, ctx);
    return moveOn(apply(s, r.effects), talk, r.cursor);
  }
  if (!input.act) return s;
  const r = talkStep(PROLOGUE, here, {}, ctx);
  // the last answer's feedback stays until the question comes back (the UI shows it there)
  return moveOn(apply(s, r.effects), talk, r.cursor);
}

/** After the effects are applied: read on under the new story flags (a line can unlock the next). */
function moveOn(s: State, talk: Talk, cursor: Cursor | null): State {
  const next = cursor && settle(PROLOGUE, cursor, ctxOf(s));
  return next ? { ...s, talk: { ...talk, cursor: next } } : endTalk({ ...s, talk });
}

function endTalk(s: State): State {
  const script = s.talk?.script;
  return { ...s, talk: null, seen: script && !s.seen.includes(script) ? [...s.seen, script] : s.seen };
}

function stepWalk(s: State, input: Input, level: Level): State {
  const m = Math.hypot(input.x, input.z);
  const k = m > 1 ? 1 / m : 1;
  const speed = input.run ? RUN : WALK;
  let wish = { x: input.x * k * speed * DT, z: input.z * k * speed * DT };
  // The toll collector stops anyone who hasn't answered him: past the outer face of the gate, back you go.
  if (!has(s, 'passedGate') && s.hero.x + wish.x > GATE.x0 - 16) wish = { x: Math.min(0, wish.x), z: wish.z };
  const r = moveBody(level.world, s.hero, wish, DT, HERO);
  // People are solid too: a soft push out of anyone the hero walks into.
  let body = r.body;
  for (const n of level.npcs) {
    if (n.who === 'Ferox' && s.ferox.mode === 'follow') continue;
    const nx = n.who === 'Ferox' ? s.ferox.body.x : n.x, nz = n.who === 'Ferox' ? s.ferox.body.z : n.z;
    const dx = body.x - nx, dz = body.z - nz, d = Math.hypot(dx, dz), min = HERO.radius + 3;
    if (d < min && d > 1e-6) {
      const push = moveBody(level.world, body, { x: (dx / d) * (min - d), z: (dz / d) * (min - d) }, DT, HERO);
      body = push.body;
    }
  }
  const moved = Math.hypot(body.x - s.hero.x, body.z - s.hero.z) / DT;
  const facing = m > 0.15 ? Math.atan2(input.x, input.z) : s.facing;
  let next: State = { ...s, hero: body, facing, speed: moved };
  // Walking up to the gate starts the toll collector's questions by itself.
  if (!has(next, 'passedGate') && body.x > GATE.x0 - 22 && !next.talk) {
    return { ...next, talk: { script: 'portitor', cursor: { node: 'portitor', line: 0 } } };
  }
  if (input.act) {
    const it = nearestInteractable(interactables(level), { x: body.x, z: body.z }, { x: Math.sin(facing), z: Math.cos(facing) });
    if (it) next = { ...next, talk: { script: it.talk, cursor: { node: it.talk, line: 0 } }, facing: Math.atan2(it.x - body.x, it.z - body.z) };
  }
  return next;
}

function stepFerox(s: State, level: Level): State {
  const f = s.ferox;
  if (f.mode !== 'follow') return f.speed ? { ...s, ferox: { ...f, speed: 0 } } : s;
  // a spot a little behind the hero
  const tx = s.hero.x - Math.sin(s.facing) * 12, tz = s.hero.z - Math.cos(s.facing) * 12;
  const dx = tx - f.body.x, dz = tz - f.body.z, d = Math.hypot(dx, dz);
  // Too far behind (stuck on a corner): he catches up the way dogs do, by appearing at your heels.
  if (d > 140) {
    const y = (level.world.topAt(Math.round(tx), Math.round(tz), 120, -20) ?? s.hero.y - 1) + 1;
    return { ...s, ferox: { ...f, body: { x: tx, y, z: tz, vy: 0, grounded: true }, speed: 0 } };
  }
  if (d < 4) return f.speed ? { ...s, ferox: { ...f, speed: 0 } } : s;
  const speed = d > 30 ? RUN * 1.1 : WALK * 1.15;
  const stepLen = Math.min(d, speed * DT);
  const r = moveBody(level.world, f.body, { x: (dx / d) * stepLen, z: (dz / d) * stepLen }, DT, DOG_SHAPE);
  const moved = Math.hypot(r.body.x - f.body.x, r.body.z - f.body.z) / DT;
  return { ...s, ferox: { ...f, body: r.body, facing: Math.atan2(dx, dz), speed: moved } };
}

/**
 * Where someone standing at (x, z) stands (voxels): the first floor below head height above the street,
 * so a shopkeeper under a roof stands on the shop floor, not on the tiles.
 */
export const groundAt = (level: Level, x: number, z: number): number => (level.world.topAt(Math.round(x), Math.round(z), roadY(x) + 16, -30) ?? roadY(x)) + 1;

export const sim: StepSim<State, Input> = {
  id: 'sub-vesuvio',
  title: 'Sub Vesuvio',
  create: (seed: number) => create(seed % 2 ? 'Marcus' : 'Livia'),
  step: (s, i) => step(s, i),
  idle: IDLE,
  stepMs: STEP_MS,
  time: (s) => s.t,
  over: (s) => s.objective === 'forum',
  metrics: (s) => ({ objective: s.objective, flags: s.flags.length, answers: s.answers.length, right: s.answers.filter((a) => a.grade === 'right').length, seconds: Math.round(s.t / 100) / 10 }),
};
