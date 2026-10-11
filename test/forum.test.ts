/**
 * The Forum district: it builds within its chunk budget, its spawns stand on the ground, everything you can
 * act on (exits, shop counters, people, places) can be reached on foot from the street up from the sea gate,
 * every person and place with a conversation has one, and the contract with its neighbours holds.
 */
import { describe, expect, it } from 'vitest';
import { findPath } from 'ymir/core';
import { VoxelWorld } from 'ymir/voxel';
import { SCRIPT, talkFor } from '../src/content';
import { FORUM, FORUM_TALK } from '../src/content/forum';
import { FORUM_CAST } from '../src/art/people-forum';
import { TAGS } from '../src/art/people';
import { ITEMS } from '../src/content/items';
import { D, PZ, ROAD, W, forum, navOf } from '../src/level/forum';
import { district } from '../src/level';

const level = forum();
const nav = navOf(level);
/** Reach for acting on something: the sim's REACH, as the sim measures it from the hero's centre. */
const REACH = 14;

/** Every cell reachable on foot from a point (flood fill over the nav grid). */
function reachable(from: { x: number; z: number }): Set<string> {
  const start = nav.cellAt(from.x, from.z);
  const seen = new Set<string>([`${start.x},${start.z}`]);
  const queue = [start];
  while (queue.length) {
    const c = queue.pop()!;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (!dx && !dz) continue;
      const n = { x: c.x + dx, z: c.z + dz };
      const k = `${n.x},${n.z}`;
      if (seen.has(k) || n.x < 0 || n.z < 0 || n.x * 4 >= W || n.z * 4 >= D) continue;
      if (!nav.passable(c, n)) continue;
      seen.add(k);
      queue.push(n);
    }
  }
  return seen;
}
const fromWest = reachable(level.spawns.west);
/** Can the hero stand somewhere within reach of (x, z)? */
const canReach = (x: number, z: number, r = REACH) => {
  for (const k of fromWest) {
    const [cx, cz] = k.split(',').map(Number);
    const c = nav.centre({ x: cx, z: cz });
    if (Math.hypot(c.x - x, c.z - z) <= r) return true;
  }
  return false;
};

describe('the Forum', () => {
  it('builds as the forum, within its chunk budget', () => {
    expect(level.id).toBe('forum');
    expect(district('forum')).toBe(level);
    expect(level.width).toBe(W);
    expect(level.depth).toBe(D);
    expect(level.world.chunkKeys().length).toBeLessThan(550);
    // nothing outside the box (the ring draws what lies beyond)
    for (const k of level.world.chunkKeys()) {
      const [x, , z] = VoxelWorld.origin(k);
      expect({ k, inside: x >= 0 && x < W && z >= 0 && z < D }).toEqual({ k, inside: true });
    }
  });

  it('keeps the contract: two spawns standing on the ground, two exits where streets meet the edge', () => {
    expect(Object.keys(level.spawns).sort()).toEqual(['east', 'west']);
    for (const [id, s] of Object.entries(level.spawns)) {
      expect({ id, y: s.y }).toEqual({ id, y: level.groundAt(s.x, s.z) });
      expect({ id, onRoad: s.y }).toEqual({ id, onRoad: ROAD + 1 });
    }
    expect(level.spawns.west.x).toBeLessThan(40);
    expect(level.spawns.west.facing).toBeCloseTo(Math.PI / 2);
    expect(level.spawns.east.x).toBeGreaterThan(W - 40);
    expect(level.spawns.east.facing).toBeCloseTo(-Math.PI / 2);
    const exits = Object.fromEntries(level.exits.map((e) => [e.id, e]));
    expect(exits['to-portaMarina']).toMatchObject({ to: 'portaMarina', arrive: 'east', x0: 0 });
    expect(exits['to-abbondanza']).toMatchObject({ to: 'abbondanza', arrive: 'west', x1: W - 1 });
    // each spawn is on the street its exit leads back along, inside the exit's band but clear of it
    expect(level.spawns.west.z).toBeGreaterThanOrEqual(exits['to-portaMarina'].z0);
    expect(level.spawns.west.z).toBeLessThanOrEqual(exits['to-portaMarina'].z1);
    expect(level.spawns.west.x).toBeGreaterThan(exits['to-portaMarina'].x1 + 4);
    expect(level.spawns.east.z).toBeGreaterThanOrEqual(exits['to-abbondanza'].z0);
    expect(level.spawns.east.z).toBeLessThanOrEqual(exits['to-abbondanza'].z1);
    expect(level.spawns.east.x).toBeLessThan(exits['to-abbondanza'].x0 - 4);
    expect(level.sea).toBeUndefined();
    // the piazza sits at the top of Via Marina
    expect(level.groundAt(320, 260)).toBe(PZ + 1);
  });

  it('can be walked: both exits, every shop counter, person and place are reachable from the street up from the sea gate', () => {
    for (const e of level.exits) expect({ exit: e.id, reach: canReach((e.x0 + e.x1) / 2, (e.z0 + e.z1) / 2, 6) }).toEqual({ exit: e.id, reach: true });
    for (const s of level.spots) expect({ spot: s.id, reach: canReach(s.x, s.z, Math.max(REACH, s.r)) }).toEqual({ spot: s.id, reach: true });
    for (const n of level.npcs) expect({ npc: n.id, reach: canReach(n.x, n.z, REACH + 4) }).toEqual({ npc: n.id, reach: true });
    // and a path, not just a flood: from the sea-gate street to the far exit
    const a = nav.cellAt(level.spawns.west.x, level.spawns.west.z), b = nav.cellAt(level.spawns.east.x, level.spawns.east.z);
    const path = findPath(nav, a, b, { maxNodes: 200_000 });
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(100);
  });

  it('walkers walk on walkable ground, never stepping more than a kerb up or down along their loops', () => {
    for (const wk of level.walkers) {
      for (const [x, z] of wk.path) {
        const c = nav.cellAt(x, z);
        expect({ walker: wk.id, at: [x, z], ok: nav.height(c) !== null }).toEqual({ walker: wk.id, at: [x, z], ok: true });
      }
      for (let i = 0; i < wk.path.length; i++) {
        const [ax, az] = wk.path[i], [bx, bz] = wk.path[(i + 1) % wk.path.length];
        const n = Math.ceil(Math.hypot(bx - ax, bz - az));
        let prev = level.groundAt(ax, az);
        for (let k = 1; k <= n; k++) {
          const x = ax + ((bx - ax) * k) / n, z = az + ((bz - az) * k) / n;
          const y = level.groundAt(x, z);
          if (Math.abs(y - prev) > 3) expect({ walker: wk.id, at: [Math.round(x), Math.round(z)], step: y - prev }).toEqual({ walker: wk.id, at: [Math.round(x), Math.round(z)], step: 0 });
          prev = y;
        }
      }
    }
  });

  it('has shops with a keeper, a sign, a counter to act on and stock from the item list', () => {
    expect(level.shops.length).toBeGreaterThanOrEqual(3);
    for (const sh of level.shops) {
      expect({ shop: sh.id, keeper: level.npcs.some((n) => n.id === sh.keeper) }).toEqual({ shop: sh.id, keeper: true });
      expect({ shop: sh.id, spot: level.spots.some((s) => s.id === `shop:${sh.id}` && s.verb === 'shop') }).toEqual({ shop: sh.id, spot: true });
      expect(sh.sign).toMatch(/^[A-Z ]+$/);
      for (const s of sh.stock) {
        expect(s.item in ITEMS).toBe(true);
        expect(s.price).toBeGreaterThanOrEqual(1);
        expect(s.price).toBeLessThanOrEqual(12);
      }
    }
  });

  it('every person and place has something to say, and every named person is in the cast', () => {
    const kinds = new Set(Object.keys(TAGS));
    for (const n of level.npcs) {
      const talk = talkFor(n.id, n.who);
      expect({ npc: n.id, talk: talk !== null && talk in SCRIPT }).toEqual({ npc: n.id, talk: true });
      const named = !n.who.includes(':');
      if (named) expect({ npc: n.id, cast: n.who in FORUM_CAST }).toEqual({ npc: n.id, cast: true });
      else expect({ npc: n.id, kind: kinds.has(n.who.split(':')[0]) }).toEqual({ npc: n.id, kind: true });
    }
    for (const w of level.walkers) expect({ walker: w.id, kind: kinds.has(w.who.split(':')[0]) }).toEqual({ walker: w.id, kind: true });
    for (const s of level.spots) if (s.verb !== 'shop') expect({ spot: s.id, talk: talkFor(s.id) !== null && talkFor(s.id)! in SCRIPT }).toEqual({ spot: s.id, talk: true });
    expect(Object.keys(FORUM_CAST).length).toBeGreaterThanOrEqual(2);
  });

  it('owns its conversation ids (all forum-), and every one is reached from a person or a place', () => {
    for (const id of Object.keys(FORUM)) expect(id.startsWith('forum-')).toBe(true);
    for (const [k, v] of Object.entries(FORUM_TALK)) {
      expect(k.startsWith('forum-')).toBe(true);
      expect(v in FORUM).toBe(true);
      expect(level.npcs.some((n) => n.id === k) || level.spots.some((s) => s.id === k)).toBe(true);
    }
  });

  it('is lit, watered and planted: lamps, fountains, smoke, a few trees', () => {
    expect(level.water.length).toBeGreaterThanOrEqual(2);
    expect(level.jets.length).toBeGreaterThanOrEqual(2);
    expect(level.fires.some((f) => f.kind === 'lamp')).toBe(true);
    expect(level.smoke.length).toBeGreaterThanOrEqual(1);
    expect(level.trees.length).toBeGreaterThan(0);
    expect(level.walkers.length).toBeGreaterThanOrEqual(5);
    expect(level.walkers.length).toBeLessThanOrEqual(8);
  });
});
