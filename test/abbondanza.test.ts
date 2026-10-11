/**
 * Via dell'Abbondanza: the district builds within its chunk budget; you arrive from the Forum standing on
 * the street; the exit back, every shop counter, every spot and every person can be reached on foot; the
 * street is closed everywhere else (the trench, Via Stabiana both ways, the terrace's parapet), so nobody
 * walks off the edge of the world; and everyone you can talk to has something to say.
 */
import { describe, expect, it } from 'vitest';
import { findPath, type Cell } from 'ymir/core';
import { SCRIPT, talkFor } from '../src/content';
import { ITEMS } from '../src/content/items';
import { personFor } from '../src/art/people';
import { ABBONDANZA_CAST } from '../src/art/people-abbondanza';
import { buildAbbondanza, navOf, roadY, SPAWNS, WORKS } from '../src/level/abbondanza';

const L = buildAbbondanza();
const nav = navOf(L);
const key = (c: Cell) => `${c.x},${c.z}`;
const spawn = L.spawns.west!;
const start = nav.cellAt(spawn.x, spawn.z);

/** Every cell reachable on foot from the spawn (a flood over the walking grid). */
const reachable = (() => {
  const seen = new Set<string>([key(start)]);
  const queue: Cell[] = [start];
  const N: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (queue.length) {
    const c = queue.shift()!;
    for (const [dx, dz] of N) {
      const n = { x: c.x + dx, z: c.z + dz };
      if (seen.has(key(n)) || !nav.passable(c, n)) continue;
      seen.add(key(n));
      queue.push(n);
    }
  }
  return seen;
})();
/** A reachable cell within `r` voxels of (x, z), or null. */
function near(x: number, z: number, r: number): Cell | null {
  const c0 = nav.cellAt(x - r, z - r), c1 = nav.cellAt(x + r, z + r);
  let best: Cell | null = null, bd = Infinity;
  for (let cx = c0.x; cx <= c1.x; cx++) for (let cz = c0.z; cz <= c1.z; cz++) {
    const c = { x: cx, z: cz };
    if (!reachable.has(key(c))) continue;
    const m = nav.centre(c), d = Math.hypot(m.x - x, m.z - z);
    if (d <= r && d < bd) { bd = d; best = c; }
  }
  return best;
}
const walkTo = (x: number, z: number, r: number) => {
  const goal = near(x, z, r);
  return goal ? findPath(nav, start, goal, { maxNodes: 60_000 }) : null;
};

describe('Via dell’Abbondanza', () => {
  it('builds within its budget, at the size of a district', () => {
    expect(L.id).toBe('abbondanza');
    expect(L.width).toBeLessThanOrEqual(640);
    expect(L.depth).toBeLessThanOrEqual(448);
    expect(L.world.chunkKeys().length).toBeLessThan(550);
    expect(L.sea).toBeUndefined();
  });

  it('keeps its contract: spawn west on the street, facing east; exit west to the Forum, arriving east', () => {
    expect(Object.keys(SPAWNS)).toEqual(['west']);
    expect(spawn.x).toBeLessThan(24);
    expect(Math.cos(spawn.facing)).toBeCloseTo(0, 5);
    expect(Math.sin(spawn.facing)).toBeCloseTo(1, 5);
    const exit = L.exits.find((e) => e.id === 'to-forum')!;
    expect(exit).toMatchObject({ to: 'forum', arrive: 'east', x0: 0 });
    expect(L.exits).toHaveLength(1);
    // the spawn is inside the street, not in the exit (or you would leave as you arrive)
    expect(spawn.x > exit.x1 && spawn.z >= exit.z0 && spawn.z <= exit.z1).toBe(true);
  });

  it('you arrive standing on the paving, at the Forum’s level', () => {
    const g = L.groundAt(spawn.x, spawn.z);
    expect(g).toBe(spawn.y);
    expect(L.world.solid(Math.round(spawn.x), g - 1, Math.round(spawn.z))).toBe(true);
    expect(L.world.solid(Math.round(spawn.x), g, Math.round(spawn.z))).toBe(false);
    expect(g).toBeGreaterThanOrEqual(52);
    expect(g).toBeLessThanOrEqual(57);
    // the street slopes gently down to the east
    expect(roadY(600)).toBeLessThan(roadY(0));
    expect(roadY(0) - roadY(600)).toBeLessThanOrEqual(8);
  });

  it('the way back to the Forum is a walk along the street', () => {
    const exit = L.exits[0]!;
    const path = walkTo((exit.x0 + exit.x1) / 2, (exit.z0 + exit.z1) / 2, 10);
    expect(path).not.toBeNull();
  });

  it('every shop has a sign, a keeper at the counter and wares, and you can walk up to it', () => {
    expect(L.shops.length).toBeGreaterThanOrEqual(4);
    expect(L.shops.length).toBeLessThanOrEqual(6);
    const sold = new Set(L.shops.flatMap((s) => s.stock.map((x) => x.item)));
    for (const item of ['sandals', 'hat', 'lamp', 'tablet', 'stylus']) expect({ item, sold: sold.has(item) }).toEqual({ item, sold: true });
    for (const sh of L.shops) {
      expect(sh.sign).toMatch(/^[A-Z]+$/);
      expect(L.npcs.some((n) => n.id === sh.keeper)).toBe(true);
      for (const s of sh.stock) expect({ shop: sh.id, item: s.item, ok: s.item in ITEMS && s.price >= 1 && s.price <= 12 }).toEqual({ shop: sh.id, item: s.item, ok: true });
      const spot = L.spots.find((s) => s.id === `shop:${sh.id}`);
      expect(spot?.verb).toBe('shop');
      expect({ shop: sh.id, path: walkTo(sh.x, sh.z, 6) !== null }).toEqual({ shop: sh.id, path: true });
    }
  });

  it('every spot and every person can be reached on foot from where you arrive', () => {
    for (const s of L.spots) expect({ spot: s.id, path: walkTo(s.x, s.z, Math.max(8, s.r)) !== null }).toEqual({ spot: s.id, path: true });
    for (const n of L.npcs) expect({ npc: n.id, path: walkTo(n.x, n.z, 14) !== null }).toEqual({ npc: n.id, path: true });
  });

  it('everyone has something to say, and every spot has its words', () => {
    for (const n of L.npcs) {
      const talk = talkFor(n.id, n.who);
      expect({ npc: n.id, talk: talk !== null && talk in SCRIPT }).toEqual({ npc: n.id, talk: true });
      expect({ npc: n.id, who: personFor(n.who) !== null }).toEqual({ npc: n.id, who: true });
    }
    for (const s of L.spots.filter((s) => !s.id.startsWith('shop:'))) expect({ spot: s.id, talk: (talkFor(s.id) ?? '') in SCRIPT }).toEqual({ spot: s.id, talk: true });
    // the named cast all appear, and every id is the district's own
    for (const who of Object.keys(ABBONDANZA_CAST)) expect(L.npcs.some((n) => n.who === who)).toBe(true);
    for (const id of [...L.npcs.map((n) => n.id), ...L.spots.map((s) => s.id.replace(/^shop:/, '')), ...L.shops.map((s) => s.id)]) expect(id.startsWith('abb-')).toBe(true);
    expect(L.npcs.length - L.shops.length).toBeGreaterThanOrEqual(8);
    expect(L.walkers.length).toBeGreaterThanOrEqual(6);
  });

  it('walkers keep to walkable ground, never climbing more than a kerb between steps', () => {
    for (const wk of L.walkers) {
      for (const [x, z] of wk.path) expect({ walker: wk.id, at: [x, z], ok: nav.height(nav.cellAt(x, z)) !== null }).toEqual({ walker: wk.id, at: [x, z], ok: true });
      // walk the loop a voxel at a time: the ground never jumps more than 3 (a kerb) between samples
      for (let i = 0; i < wk.path.length; i++) {
        const [ax, az] = wk.path[i]!, [bx, bz] = wk.path[(i + 1) % wk.path.length]!;
        const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az)));
        let prev = L.groundAt(ax, az);
        for (let k = 1; k <= n; k++) {
          const x = ax + ((bx - ax) * k) / n, z = az + ((bz - az) * k) / n;
          const g = L.groundAt(x, z);
          if (Math.abs(g - prev) > 3) expect({ walker: wk.id, at: [Math.round(x), Math.round(z)], jump: g - prev }).toBeNull();
          prev = g;
        }
      }
    }
  });

  it('the street is closed everywhere but the Forum: nobody walks off the edge of the world', () => {
    const exit = L.exits[0]!;
    for (const k of reachable) {
      const [cx, cz] = k.split(',').map(Number) as [number, number];
      const m = nav.centre({ x: cx, z: cz });
      const inExit = m.x <= exit.x1 + 4 && m.z >= exit.z0 && m.z <= exit.z1;
      expect({ cell: k, inside: inExit || (m.x > 4 && m.x < L.width - 4 && m.z > 4 && m.z < L.depth - 4) }).toEqual({ cell: k, inside: true });
      // nothing out on the street past the trestles at the water works (Stephanus's shop runs on east indoors)
      expect({ cell: k, beyondWorks: m.x > WORKS.barrier + 2 && m.z > 154 }).toEqual({ cell: k, beyondWorks: false });
    }
    // and the lower town below the parapet is out of reach
    expect(near(300, 300, 20)).toBeNull();
  });
});
