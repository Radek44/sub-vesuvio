/**
 * The rules: a pure, fixed-step simulation. No clock, no DOM, no Three.js, no Math.random. The seed lives
 * in the state, so one seed and one stream of inputs always play the same game. That is what lets
 * ymir/testkit check determinism, sweep balance and drive Norn specs (test/sim.test.ts).
 *
 * The starter game: walk the hero around a round courtyard and pick up GOAL coins. Replace it with yours.
 */
import { Rng, clampTo, dist, type Vec } from 'ymir/core';
import type { StepSim } from 'ymir/testkit';

export const STEP_MS = 1000 / 60;
/** The playable radius, in world units. */
export const ARENA = 9;
/** World units per second at full stick. */
export const SPEED = 6;
export const GOAL = 10;
/** Coins on the ground at once. */
const ON_GROUND = 3;
const PICKUP = 0.8;

export interface Coin { id: number; at: Vec }
export interface State { rng: number; t: number; hero: Vec; coins: Coin[]; got: number; nextId: number; over: boolean }
/** The move direction on the ground plane, length 0–1 (ymir/ui `Input.vector()`, with y as z). */
export interface Input { x: number; z: number }
export const IDLE: Input = { x: 0, z: 0 };

export function create(seed: number): State {
  let s: State = { rng: seed >>> 0, t: 0, hero: { x: 0, z: 0 }, coins: [], got: 0, nextId: 1, over: false };
  while (s.coins.length < ON_GROUND) s = spawn(s);
  return s;
}

function spawn(s: State): State {
  const r = new Rng(s.rng);
  const a = r.float() * Math.PI * 2;
  const d = 2 + r.float() * (ARENA - 2.5);
  const coin: Coin = { id: s.nextId, at: { x: Math.cos(a) * d, z: Math.sin(a) * d } };
  return { ...s, rng: r.seed, nextId: s.nextId + 1, coins: [...s.coins, coin] };
}

/** One step. Never mutates `s`; a finished game returns `s` unchanged. */
export function step(s: State, input: Input): State {
  if (s.over) return s;
  const m = Math.hypot(input.x, input.z);
  const k = m > 1 ? 1 / m : 1; // never faster than SPEED, whatever the input claims
  const move = (SPEED * STEP_MS) / 1000;
  const hero = clampTo({ x: s.hero.x + input.x * k * move, z: s.hero.z + input.z * k * move }, ARENA);
  let next: State = { ...s, t: s.t + STEP_MS, hero };
  const hit = next.coins.filter((c) => dist(c.at, hero) < PICKUP);
  if (!hit.length) return next;
  next = { ...next, coins: next.coins.filter((c) => !hit.includes(c)), got: next.got + hit.length };
  while (next.coins.length < ON_GROUND && next.got + next.coins.length < GOAL) next = spawn(next);
  return next.got >= GOAL ? { ...next, over: true } : next;
}

/** A bot that walks to the nearest coin: what the tests and balance sweeps play with. */
export function chase(s: State): Input {
  let best: Coin | null = null;
  for (const c of s.coins) if (!best || dist(c.at, s.hero) < dist(best.at, s.hero)) best = c;
  if (!best) return IDLE;
  const dx = best.at.x - s.hero.x, dz = best.at.z - s.hero.z, l = Math.hypot(dx, dz) || 1;
  return { x: dx / l, z: dz / l };
}

export const sim: StepSim<State, Input> = {
  id: 'sub-vesuvio',
  title: "Sub Vesuvio",
  create,
  step,
  idle: IDLE,
  stepMs: STEP_MS,
  time: (s) => s.t,
  over: (s) => s.over,
  metrics: (s) => ({ coins: s.got, seconds: Math.round(s.t / 100) / 10, won: s.over }),
};
