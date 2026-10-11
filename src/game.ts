/**
 * The controller: the only place that combines the sim, input, saves, analytics and the world. It runs
 * the sim in fixed steps (STEP_MS) whatever the frame rate, and publishes a view for the UI.
 */
import { createStore } from 'ymir/core';
import { qaParam, saveGame } from 'ymir/platform';
import { bindInput, createInput } from 'ymir/ui';
import { analytics } from './analytics';
import { SAVE, type Save } from './save';
import { create, step, STEP_MS, type State } from './sim';
import { World } from './world';

export interface View { sim: State; save: Save; touch: boolean }
export const store = createStore<View>({ sim: create(1), save: SAVE.load(null).state, touch: false });
export const input = createInput({ again: ['Enter', 'Space', 'pad:A', 'touch'] });

let world: World | null = null;
let acc = 0;
let moved = false;

export function start(host: HTMLElement, save: Save): () => void {
  store.patch({ save });
  // `?qa`: the state for browser checks (scripts/smoke.mjs). Read-only; nothing in the game depends on it.
  if (qaParam('qa') !== null) Object.assign(window, { __game: { sim: () => store.get().sim } });
  const unbind = bindInput(input);
  world = new World(host);
  newRun();
  analytics.step('boot', 'load_finished');
  world.stage.start((dt, t) => frame(dt, t));
  return () => { unbind(); world?.dispose(); world = null; };
}

export function newRun(): void {
  const save = store.get().save;
  const runs = save.runs + 1;
  store.patch({ sim: create((Date.now() ^ (runs * 2654435761)) >>> 0), save: { ...save, runs } });
  void saveGame(SAVE, store.get().save);
  analytics.step('run', 'run_start', runs);
  analytics.step('ftue', runs === 1 ? 'first_run' : 'second_run');
}

function frame(dt: number, t: number): void {
  input.update();
  const v = input.vector();
  let s = store.get().sim;
  if (s.over && input.pressed('again')) { newRun(); s = store.get().sim; }
  const before = s;
  for (acc += dt * 1000; acc >= STEP_MS; acc -= STEP_MS) s = step(s, { x: v.x, z: v.y });
  if (s !== before) {
    if (!moved && (v.x || v.y)) { moved = true; analytics.step('boot', 'first_move'); }
    if (s.got > before.got) onCoins(before, s);
    store.patch({ sim: s, touch: input.device() === 'touch' });
  }
  world?.sync(s, t);
}

function onCoins(before: State, s: State): void {
  const runs = store.get().save.runs;
  if (before.got === 0) analytics.step('ftue', 'first_coin');
  if (before.got < 5 && s.got >= 5) analytics.step('run', 'coin_5', runs);
  if (!s.over) return;
  analytics.step('run', 'won', runs);
  analytics.step('ftue', 'first_win');
  analytics.track('run_won', { ms: Math.round(s.t), coins: s.got });
  const save = store.get().save;
  if (!save.bestMs || s.t < save.bestMs) { store.patch({ save: { ...save, bestMs: Math.round(s.t) } }); void saveGame(SAVE, store.get().save); }
}
