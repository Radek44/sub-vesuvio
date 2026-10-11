/** The rules, headless: determinism, balance and saves. These run in CI on every push. */
import { describe, expect, it } from 'vitest';
import { determinism, sweep } from 'ymir/testkit';
import { SAVE } from '../src/save';
import { ARENA, GOAL, chase, create, sim, step } from '../src/sim';

describe('sim', () => {
  it('is deterministic: one seed and one policy always play the same game', () => {
    expect(determinism(sim, 42, 3000, (s) => chase(s))).toBeNull();
  });

  it('a player who chases coins wins in under 20 seconds, on every seed', () => {
    const runs = sweep(sim, [1, 2, 3, 4, 5, 6, 7, 8], chase, 60 * 60, (s) => sim.metrics(s));
    for (const r of runs) {
      expect(r.won).toBe(true);
      expect(Number(r.seconds)).toBeLessThan(20);
    }
  });

  it('stays inside the courtyard, never moves faster than full stick, and stops when won', () => {
    let s = create(7);
    for (let i = 0; i < 600; i++) s = step(s, { x: 50, z: 0 }); // a lying input: way past length 1
    expect(Math.hypot(s.hero.x, s.hero.z)).toBeLessThanOrEqual(ARENA + 1e-9);
    let w = create(3);
    while (!w.over) w = step(w, chase(w));
    expect(w.got).toBe(GOAL);
    expect(step(w, chase(w))).toBe(w); // a finished game changes nothing
  });
});

describe('save', () => {
  it('has a migration for every version, and loads garbage as a fresh game without losing it', () => {
    expect(SAVE.check()).toEqual([]);
    expect(SAVE.load({ $v: 1, data: { bestMs: -5, runs: 2.7 } }).state).toEqual({ bestMs: 0, runs: 2, funnels: [] });
    expect(SAVE.load({ $v: 1, data: { bestMs: 1, runs: 1, funnels: ['ftue:first_win', 3] } }).state.funnels).toEqual(['ftue:first_win']);
    expect(SAVE.load('{oops')).toMatchObject({ status: 'broken', raw: '{oops' });
  });
});
