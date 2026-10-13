/**
 * Walking where the player clicked or tapped: a path over the district's ground (ymir/core `findPath`) on a
 * grid of half-metre cells, then pulled straight wherever the way is clear, so the hero walks lines, not a
 * staircase of grid steps. PURE: no clock, no random; a level's grid is worked out once and kept.
 *
 * A cell is walkable when the ground across it is level enough to step up (the body's `step`), there is head
 * room over all of it (its `height`: a wall a voxel thick inside the cell blocks it), it is inside the
 * district's box, and it isn't sea. The ground is the level's own `groundAt`, so Via Marina's slope reads
 * right and a portico's roof is overhead, never floor.
 */
import { findPath, type Cell, type PathGrid } from 'ymir/core';
import type { BodyShape } from 'ymir/voxel';
import type { Level } from '../level/types';

/** Cell size, voxels (half a metre). */
export const CELL = 4;
/** Voxels per metre (the sea's shoreline is given in metres). */
const PER_M = 8;

export interface Point { x: number; z: number }

interface Grid extends PathGrid { height(c: Cell): number | null }
const grids = new WeakMap<Level, Grid>();

export function gridOf(level: Level, body: BodyShape): Grid {
  const known = grids.get(level);
  if (known) return known;
  const cache = new Map<number, number | null>();
  const cols = Math.ceil(level.width / CELL);
  const height = (c: Cell): number | null => {
    const key = c.z * cols + c.x;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const x0 = c.x * CELL, z0 = c.z * CELL;
    let h: number | null = null;
    const inside = x0 >= 2 && z0 >= 2 && x0 + CELL <= level.width - 3 && z0 + CELL <= level.depth - 3;
    const sea = level.sea ? x0 < level.sea.west * PER_M : false;
    if (inside && !sea) {
      let lo = Infinity, hi = -Infinity, ok = true;
      for (let dx = 0; dx < CELL && ok; dx++) {
        for (let dz = 0; dz < CELL && ok; dz++) {
          const x = x0 + dx, z = z0 + dz, g = level.groundAt(x, z);
          for (let y = g; y < g + body.height; y++) if (level.world.solid(x, y, z)) { ok = false; break; }
          lo = Math.min(lo, g); hi = Math.max(hi, g);
        }
      }
      if (ok && hi - lo <= body.step) h = hi;
    }
    cache.set(key, h);
    return h;
  };
  const grid: Grid = {
    height,
    passable(a, b) {
      const ha = height(a), hb = height(b);
      return ha !== null && hb !== null && Math.abs(hb - ha) <= body.step;
    },
  };
  grids.set(level, grid);
  return grid;
}

const cellOf = (p: Point): Cell => ({ x: Math.floor(p.x / CELL), z: Math.floor(p.z / CELL) });
const centre = (c: Cell): Point => ({ x: c.x * CELL + CELL / 2, z: c.z * CELL + CELL / 2 });

/** The walkable cell nearest `c` (itself if walkable), within `rings` cells, nearest first; or null. */
function nearestWalkable(g: Grid, c: Cell, rings = 8): Cell | null {
  if (g.height(c) !== null) return c;
  for (let r = 1; r <= rings; r++) {
    let best: Cell | null = null, bestD = Infinity;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const n = { x: c.x + dx, z: c.z + dz };
        const d = dx * dx + dz * dz;
        if (d < bestD && g.height(n) !== null) { best = n; bestD = d; }
      }
    }
    if (best) return best;
  }
  return null;
}

/** Can the hero walk straight from cell `a` to cell `b`? (Every cell the line crosses, and every step, is walkable.) */
function clear(g: Grid, a: Cell, b: Cell): boolean {
  const n = Math.ceil(Math.max(Math.abs(b.x - a.x), Math.abs(b.z - a.z)) * 2);
  let prev = a;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    // the line's corridor is the body's width: test the cells on either side of it too
    const x = a.x + 0.5 + (b.x - a.x) * t, z = a.z + 0.5 + (b.z - a.z) * t;
    for (const [ox, oz] of [[0, 0], [0.35, 0.35], [-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35]] as const) {
      const c = { x: Math.floor(x + ox), z: Math.floor(z + oz) };
      if (g.height(c) === null) return false;
    }
    const c = { x: Math.floor(x), z: Math.floor(z) };
    if (!g.passable(prev, c) && (prev.x !== c.x || prev.z !== c.z)) return false;
    prev = c;
  }
  return true;
}

const N8: readonly [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

/**
 * Breadth-first from `a` over walkable ground (never cutting a corner, as `findPath`): the cells to the first
 * cell `done` accepts, or else to the cell reached that scores lowest. Null when nothing was reached.
 */
function flood(g: Grid, a: Cell, done: (c: Cell) => boolean, score: (c: Cell) => number, max = 40_000): Cell[] | null {
  const key = (c: Cell) => `${c.x},${c.z}`;
  const from = new Map<string, Cell | null>([[key(a), null]]);
  const queue: Cell[] = [a];
  let best = a, bestScore = score(a), found: Cell | null = done(a) ? a : null;
  for (let i = 0; i < queue.length && !found && i < max; i++) {
    const c = queue[i]!;
    for (const [dx, dz] of N8) {
      const n = { x: c.x + dx, z: c.z + dz };
      if (from.has(key(n)) || !g.passable(c, n)) continue;
      if (dx && dz && !(g.passable(c, { x: c.x + dx, z: c.z }) && g.passable(c, { x: c.x, z: c.z + dz }))) continue;
      from.set(key(n), c);
      queue.push(n);
      if (done(n)) { found = n; break; }
      const sc = score(n);
      if (sc < bestScore) { best = n; bestScore = sc; }
    }
  }
  const end = found ?? best;
  if (end === a && !found && queue.length === 1) return null;
  const cells: Cell[] = [];
  for (let c: Cell | null = end; c; c = from.get(key(c)) ?? null) cells.unshift(c);
  return cells;
}

/** Pull a grid path straight: from each corner on to the farthest cell still in clear sight. */
function straighten(g: Grid, cells: Cell[]): Point[] {
  const out: Point[] = [];
  let i = 0;
  while (i < cells.length - 1) {
    let j = cells.length - 1;
    while (j > i + 1 && !clear(g, cells[i]!, cells[j]!)) j--;
    out.push(centre(cells[j]!));
    i = j;
  }
  return out;
}

/**
 * The way from `from` to `to` (voxels) as points to walk to in turn; empty when already there, null when
 * there's nowhere to go. With `within`, the walk ends at the nearest place that close to `to` (someone behind
 * a counter is talked to across it). Without, it ends at `to`, or at the nearest walkable place to a click on
 * a wall or a roof, or, when `to` can't be reached at all (a closed courtyard, the sea), at the reachable
 * place nearest it.
 */
export function routeTo(level: Level, body: BodyShape, from: Point, to: Point, within = 0): Point[] | null {
  const g = gridOf(level, body);
  const a = nearestWalkable(g, cellOf(from), 2);
  if (!a) return null;
  const dist = (c: Cell) => { const p = centre(c); return Math.hypot(p.x - to.x, p.z - to.z); };
  if (within > 0) {
    const cells = flood(g, a, (c) => dist(c) <= within, dist);
    return cells ? straighten(g, cells) : null;
  }
  const b = nearestWalkable(g, cellOf(to));
  if (b && a.x === b.x && a.z === b.z) return [];
  const cells = (b && findPath(g, a, b, { maxNodes: 40_000 })) || flood(g, a, () => false, dist);
  return cells ? straighten(g, cells) : null;
}
