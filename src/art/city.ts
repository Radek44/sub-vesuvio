/**
 * The city around a district, at 1/2 m voxels: what fills the view beyond the playable streets so the
 * town never ends in empty air. Pure: one VoxelWorld built from the district's `Ring` (what lies in each
 * direction, and how high the ground is), in metres at RING_VOX per voxel.
 *
 * - City: insulae, blocks of houses about 30 m by 20 m between lava-paved streets, each house its own
 *   plaster colour under a tiled roof, some with an atrium open to the sky, gardens with trees.
 * - Country: fields, vine rows, olive groves and the odd farmhouse.
 * - Wall: the city wall's band of tuff blocks.
 * - Sea: nothing; the bay's water plane shows.
 */
import { VoxelWorld } from 'ymir/voxel';
import type { Level, Ring } from '../level/types';
import { P, h2, h3, mixc, noise2, tint, vary } from './palette';

export const RING_VOX = 0.5;
/** How far the ring reaches beyond the playable box (metres). */
export const RING_REACH = 56;

const WALLS = [P.ochre, P.plasterWhite, P.red, P.yellow, 0xd9c7a8, 0xc98a5a, P.plasterWhite];

/**
 * Build the ring around a playable box of `w` × `d` metres. Voxel coordinates are metres / RING_VOX, so a
 * WorldView at scale RING_VOX lines up with the district's own world (which starts at 0, 0).
 */
/** A street (metres) running on out of the district, painted as paving through the ring. */
export interface RingStreet { x0: number; x1: number; z0: number; z1: number }

/** Where the district's streets leave its box: each exit carried on to the ring's edge. */
export function exitStreets(L: Pick<Level, 'exits' | 'width' | 'depth'>, vox = 0.125): RingStreet[] {
  const w = L.width * vox, d = L.depth * vox, far = RING_REACH + 4;
  return L.exits.map((e) => {
    const x0 = e.x0 * vox, x1 = (e.x1 + 1) * vox, z0 = e.z0 * vox, z1 = (e.z1 + 1) * vox;
    if (x1 >= w - 1) return { x0: w - 1, x1: w + far, z0, z1 };
    if (x0 <= 1) return { x0: -far, x1: 1, z0, z1 };
    if (z0 <= 1) return { x0, x1, z0: -far, z1: 1 };
    return { x0, x1, z0: d - 1, z1: d + far };
  });
}

export function ringWorld(w: number, d: number, ring: Ring, streets: readonly RingStreet[] = []): VoxelWorld {
  const out = new VoxelWorld();
  const S = RING_VOX;
  const x0 = Math.floor(-RING_REACH / S), x1 = Math.ceil((w + RING_REACH) / S);
  const z0 = Math.floor(-RING_REACH / S), z1 = Math.ceil((d + RING_REACH) / S);
  for (let gx = x0; gx < x1; gx++) for (let gz = z0; gz < z1; gz++) {
    const x = gx * S, z = gz * S;
    // inside the playable box (with half a metre of overlap): the district draws itself
    if (x >= 0.5 && x < w - 0.5 && z >= 0.5 && z < d - 0.5) continue;
    const kind = ring.kind(x, z);
    if (kind === 'sea') continue;
    const g = Math.round(ring.height(x, z) / S);
    const st = streets.find((r) => x >= r.x0 && x < r.x1 && z >= r.z0 && z < r.z1);
    if (st) { street(out, gx, gz, x, z, g, st); continue; }
    if (kind === 'wall') { column(out, gx, g - 4, g + 14, (y) => vary(((y + (gx >> 2) + (gz >> 2)) & 3) ? P.tuff : P.limestone, gx, y, gz, 0.05)); continue; }
    if (kind === 'country') { country(out, gx, gz, x, z, g); continue; }
    city(out, gx, gz, x, z, g);
  }
  return out;
}

/** A street going on: lava paving down the middle, raised sidewalks along its sides, as in the district. */
function street(w: VoxelWorld, gx: number, gz: number, x: number, z: number, g: number, r: RingStreet): void {
  const across = r.x1 - r.x0 > r.z1 - r.z0 ? Math.min(z - r.z0, r.z1 - 0.01 - z) : Math.min(x - r.x0, r.x1 - 0.01 - x);
  const walk = across < 1.5;
  const top = walk ? g + 1 : g;
  for (let y = g - 3; y <= top; y++) w.set(gx, y, gz, y < top ? P.soil : walk ? (across > 1 ? P.kerb : vary(P.limestone, gx, y, gz, 0.06)) : vary(P.basalt, gx, y, gz, 0.12));
}

function column(w: VoxelWorld, gx: number, y0: number, y1: number, c: (y: number) => number, gz = 0): void {
  for (let y = y0; y <= y1; y++) w.set(gx, y, gz, c(y));
}

function country(w: VoxelWorld, gx: number, gz: number, x: number, z: number, g: number): void {
  const n = noise2(x, z, 30, 21);
  const field = n < 0.28 ? 0xb5a45c : n < 0.5 ? 0x93a050 : n < 0.72 ? 0x7a9244 : 0x9a7d50;
  const vines = n > 0.5 && n < 0.72 && (Math.floor(z / 2) & 1) === 0;
  for (let y = g - 3; y <= g; y++) w.set(gx, y, gz, y === g ? vary(vines ? 0x5f7a38 : field, gx, y, gz, 0.1) : P.earthDark);
  if (vines) w.set(gx, g + 1, gz, vary(h3(gx, 1, gz) > 0.6 ? P.vineGold : P.vine, gx, g + 1, gz, 0.1));
  // olive trees and stone pines scattered across the fields
  const r = h2(gx >> 3, gz >> 3, 41);
  if (r > 0.82 && (gx & 7) === 3 && (gz & 7) === 3) tree(w, gx, gz, g, r > 0.93 ? 'pine' : 'olive');
}

function tree(w: VoxelWorld, gx: number, gz: number, g: number, kind: 'pine' | 'olive' | 'cypress'): void {
  const h = kind === 'pine' ? 14 : kind === 'cypress' ? 4 : 4;
  for (let y = g + 1; y <= g + h; y++) w.set(gx, y, gz, P.pineBark);
  const r = kind === 'pine' ? 5 : kind === 'cypress' ? 1 : 3;
  const top = g + h + 1;
  for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) for (let dy = 0; dy <= (kind === 'cypress' ? 10 : 2); dy++) {
    const rr = kind === 'cypress' ? Math.max(1, r + 1 - dy / 4) : r;
    if (dx * dx + dz * dz > rr * rr + 1 - dy) continue;
    const c = kind === 'olive' ? P.olive : kind === 'cypress' ? P.cypress : P.pine;
    w.set(gx + dx, top + dy - (kind === 'cypress' ? 6 : 0), gz + dz, vary(c, gx + dx, dy, gz + dz, 0.12));
  }
}

/** Insulae: a grid of blocks 30 × 20 m with 5 m streets; each block split into houses 6–10 m wide. */
function city(w: VoxelWorld, gx: number, gz: number, x: number, z: number, g: number): void {
  const bx = Math.floor(x / 35), bz = Math.floor(z / 25);
  const ux = x - bx * 35, uz = z - bz * 25;
  // streets between the blocks: lava paving, kerbs
  if (ux >= 30 || uz >= 20) {
    const kerb = (ux >= 30 && (ux < 31 || ux >= 34)) || (uz >= 20 && (uz < 21 || uz >= 24));
    for (let y = g - 3; y <= g; y++) w.set(gx, y, gz, y === g ? (kerb ? P.kerb : vary(P.basalt, gx, y, gz, 0.12)) : P.soil);
    return;
  }
  // a garden in some blocks' middles
  const garden = h2(bx, bz, 7) > 0.55 && ux > 9 && ux < 21 && uz > 6 && uz < 14;
  if (garden) {
    for (let y = g - 2; y <= g; y++) w.set(gx, y, gz, y === g ? vary(P.grassDeep, gx, y, gz, 0.12) : P.earthDark);
    if ((gx & 7) === 2 && (gz & 7) === 5) tree(w, gx, gz, g, h3(gx, 2, gz) > 0.6 ? 'cypress' : 'olive');
    return;
  }
  // houses: 6–10 m wide along x, the whole block deep, each its own colour and height
  const hx = Math.floor((ux + h2(bx, bz, 3) * 6) / 8);
  const id = bx * 977 + bz * 131 + hx;
  const H = Math.round((4 + h2(id, 1, 9) * 4) / RING_VOX); // 4–8 m
  const wall = WALLS[Math.floor(h2(id, 2, 9) * WALLS.length)];
  const edgeX = Math.abs(((ux + h2(bx, bz, 3) * 6) % 8)) < RING_VOX * 1.01;
  const edge = ux < 1 || ux >= 29 || uz < 1 || uz >= 19 || edgeX;
  // an atrium open to the sky in some houses
  const atrium = h2(id, 3, 9) > 0.6 && Math.abs(uz - 10) < 2 && Math.abs(((ux + h2(bx, bz, 3) * 6) % 8) - 4) < 1.5;
  const roofY = g + H + Math.floor((10 - Math.abs(uz - 10)) / 6); // a low gable along x
  for (let y = g - 2; y <= roofY; y++) {
    if (atrium && y > g) continue;
    let c: number;
    if (y >= g + H) c = vary(((gx + (y & 1)) & 1) ? P.tile : P.tileDark, gx, y, gz, 0.08);
    else if (!edge) continue; // the inside of a house is never seen; walls only
    else if (y < g + 2) c = vary(P.red, gx, y, gz, 0.05); // the dado
    else c = tint(vary(wall, gx, y, gz, 0.05), (h3(id, 4, 9) - 0.5) * 0.1);
    w.set(gx, y, gz, c);
  }
  if (atrium) w.set(gx, g, gz, mixc(P.water, P.marble, 0.3));
}
