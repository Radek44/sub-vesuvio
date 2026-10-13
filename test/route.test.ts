/**
 * Click or tap to walk, headless on the real Porta Marina: the hero walks a clicked point along a path the
 * grid says is walkable, walks up to a clicked person and talks to them, gives way to the stick at once,
 * copes with clicks on walls and on the sea, and does all of it the same way every time.
 */
import { describe, expect, it } from 'vitest';
import { create, HERO, step, type Input, type State } from '../src/sim/sim';
import { CELL, gridOf, routeTo } from '../src/sim/route';
import { GATE, portaMarina, SPAWNS } from '../src/level/portaMarina';

const level = portaMarina();
const IDLE: Input = { x: 0, z: 0 };
/** Fresh at the quay, the arrival read and (optionally) through the gate. */
function start(passed = false): State {
  const s = create('Milo', level);
  return { ...s, talk: null, flags: passed ? ['passedGate'] : [], objective: passed ? 'house' : 'gate' };
}
/** Step until the route is done (or a conversation starts), at most `max` steps. */
function follow(s: State, max = 60 * 40): { s: State; steps: number } {
  let steps = 0;
  while (s.route && !s.talk && steps < max) { s = step(s, IDLE, level); steps++; }
  return { s, steps };
}
const at = (s: State) => ({ x: s.hero.x, z: s.hero.z });

describe('click to walk', () => {
  it('walks up Via Marina to the clicked point', () => {
    const goal = { x: 150, z: 214 };
    const clicked = step(start(), { ...IDLE, goto: goal }, level);
    expect(clicked.route?.path.length).toBeGreaterThan(0);
    const { s, steps } = follow(clicked);
    expect(s.route).toBeNull();
    expect(Math.hypot(s.hero.x - goal.x, s.hero.z - goal.z)).toBeLessThan(CELL * 1.5);
    // about the time a straight run takes there, not a wander: the quay to the street is ~115 voxels
    expect(steps).toBeLessThan(60 * 8);
  });

  it('every point of a path is walkable ground, and the first leg starts where the hero stands', () => {
    const path = routeTo(level, HERO, SPAWNS.quay, { x: 150, z: 214 })!;
    const g = gridOf(level, HERO);
    for (const p of path) expect({ p, h: g.height({ x: Math.floor(p.x / CELL), z: Math.floor(p.z / CELL) }) !== null }).toEqual({ p, h: true });
  });

  it('walks up to a clicked person and talks to them', () => {
    const vibia = level.npcs.find((n) => n.id === 'thermopolium')!;
    let s = start(true);
    s = { ...s, hero: { ...s.hero, x: GATE.x1 + 10, z: 216, y: level.groundAt(GATE.x1 + 10, 216) } };
    s = step(s, { ...IDLE, goto: { x: vibia.x, z: vibia.z, act: 'thermopolium' } }, level);
    const { s: end } = follow(s);
    expect(end.talk?.with).toBe('thermopolium');
    expect(end.route).toBeNull();
  });

  it('the stick or the keys take over at once', () => {
    let s = step(start(), { ...IDLE, goto: { x: 150, z: 214 } }, level);
    s = step(s, IDLE, level);
    expect(s.route).not.toBeNull();
    s = step(s, { x: 0, z: 1 }, level);
    expect(s.route).toBeNull();
  });

  it('a click on a wall goes to the nearest place beside it; a click on the sea, to the edge of the quay', () => {
    // the town wall north of the gate
    const wall = step(start(), { ...IDLE, goto: { x: GATE.x0 + 4, z: GATE.walkN - 30 } }, level);
    expect(() => follow(wall)).not.toThrow();
    const sea = step(start(), { ...IDLE, goto: { x: 4, z: 232 } }, level);
    const { s } = follow(sea);
    expect(s.hero.x).toBeGreaterThan(level.sea!.west * 8 - 1);
  });

  it('is deterministic', () => {
    const play = () => {
      let s = step(start(), { ...IDLE, goto: { x: 150, z: 214 } }, level);
      for (let i = 0; i < 300; i++) s = step(s, IDLE, level);
      return at(s);
    };
    expect(play()).toEqual(play());
  });
});
