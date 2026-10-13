/**
 * The district's ground drawn as a surface instead of as voxels (spike: Porta Marina). The sim keeps the
 * level's VoxelWorld as it is (collision, paths, rules); only the drawing changes.
 *
 * - **Which columns are ground.** What can be walked onto from where the district is entered (`groundHeights`):
 *   streets, pavements, fields, floors, steps. Walls, eaves, roofs, counters and parapets stay voxels, and so
 *   does the street under an eave.
 * - **The surface.** One mesh: the tops of equal-height runs of ground merged into quads of at most `MAX`
 *   voxels a side (the world's curve bends per vertex, so a quad can't be too long), and the faces between
 *   ground at different heights (kerbs, steps) or down to a lower neighbour. On a voxel mesh every top face
 *   is a quad of its own: the merged surface is a small fraction of the triangles.
 * - **The colour.** The tops' colours, voxel for voxel, go into a texture one texel per voxel (8 per metre):
 *   up close it is the same painted pixel ground; far away it is mipmapped, so it stops shimmering. The
 *   darkening the voxel mesher bakes at the foot of a wall is baked into the texture. Sides sample their
 *   top's texel and darken toward their foot.
 * - **What's drawn as voxels:** a copy of the world without the ground columns' voxels (public API only).
 *   A Ymir `WorldView` option to hide voxels would avoid the copy; see the spike's notes.
 */
import * as THREE from 'three';
import { VoxelWorld } from 'ymir/voxel';
import type { Level } from '../level/types';

/** Solid voxels under the feet for a column to be ground; air above it; the longest side of a merged top. */
export const DEEP = 4, CLEAR = 6, MAX = 16;
/** The highest step between neighbouring ground columns (the hero's own step). */
export const STEP = 3;
/** How dark a side gets at its foot (the voxel mesher's corner shading, roughly). */
const FOOT = 0.72;
const NONE = -32768;

/**
 * The feet height of every ground column (x + z × width), or NONE where the column stays voxels. Ground is
 * what can be walked onto from where the district is entered: level columns over solid voxels with air above,
 * reached from a spawn by steps of at most `STEP` voxels (kerbs, stairs, the meadow's bumps). A counter, a
 * parapet or a roof stands too high above its neighbours to be stepped onto, so it keeps its painted sides.
 */
export function groundHeights(level: Level): Int16Array {
  const { width: W, depth: D, world: w } = level;
  const cand = new Int16Array(W * D).fill(NONE);
  for (let z = 0; z < D; z++) {
    for (let x = 0; x < W; x++) {
      const g = level.groundAt(x, z);
      let ok = true;
      for (let y = g - DEEP; y < g && ok; y++) if (!w.solid(x, y, z)) ok = false;
      for (let y = g; y < g + CLEAR && ok; y++) if (w.solid(x, y, z)) ok = false;
      if (ok) cand[z * W + x] = g;
    }
  }
  const h = new Int16Array(W * D).fill(NONE);
  const queue: number[] = [];
  for (const sp of Object.values(level.spawns)) {
    const i = Math.round(sp.z) * W + Math.round(sp.x);
    if (cand[i] !== NONE && h[i] === NONE) { h[i] = cand[i]!; queue.push(i); }
  }
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q]!, x = i % W, z = (i - x) / W;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= W || nz >= D) continue;
      const n = nz * W + nx;
      if (h[n] !== NONE || cand[n] === NONE || Math.abs(cand[n]! - h[i]!) > STEP) continue;
      h[n] = cand[n]!;
      queue.push(n);
    }
  }
  return h;
}

/** The world as drawn in voxels: every voxel but the ground columns' (at and under their surface). */
export function drawWorld(level: Level, h: Int16Array): VoxelWorld {
  const { width: W, depth: D, world: w } = level;
  const out = new VoxelWorld();
  for (const k of w.chunkKeys()) {
    const [ox, oy, oz] = VoxelWorld.origin(k);
    for (let x = ox; x < ox + 32; x++) {
      for (let z = oz; z < oz + 32; z++) {
        const g = x >= 0 && x < W && z >= 0 && z < D ? h[z * W + x]! : NONE;
        for (let y = oy; y < oy + 32; y++) {
          if (g !== NONE && y < g) continue;
          const c = w.get(x, y, z);
          if (c !== undefined) out.set(x, y, z, c, w.isGlow(x, y, z));
        }
      }
    }
  }
  return out;
}

export interface GroundStats { columns: number; tops: number; sides: number; triangles: number; ms: number }

/** The ground surface for `level`, with what it replaced: the world to draw in voxels and the counts. */
export function buildGround(level: Level, voxel: number, material: THREE.MeshLambertMaterial): { draw: VoxelWorld; mesh: THREE.Mesh; stats: GroundStats } {
  const t0 = performance.now();
  const { width: W, depth: D, world: w } = level;
  const h = groundHeights(level);
  const isG = (x: number, z: number) => x >= 0 && x < W && z >= 0 && z < D && h[z * W + x] !== NONE;
  const H = (x: number, z: number) => h[z * W + x]!;
  // the colour of every ground top, darkened where walls and posts crowd it (the mesher's corner shading)
  const tex = new Uint8Array(W * (D + 1) * 4);
  let columns = 0;
  for (let z = 0; z < D; z++) {
    for (let x = 0; x < W; x++) {
      if (!isG(x, z)) continue;
      columns++;
      const g = H(x, z), c = w.get(x, g - 1, z) ?? 0x808080;
      let crowd = 0;
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        if (!dx && !dz) continue;
        if (w.solid(x + dx, g, z + dz)) crowd += dx && dz ? 0.5 : 1;
        if (w.solid(x + dx, g + 1, z + dz)) crowd += dx && dz ? 0.25 : 0.5;
      }
      const k = Math.max(0.55, 1 - crowd * 0.07), i = (z * W + x) * 4;
      tex[i] = ((c >> 16) & 255) * k; tex[i + 1] = ((c >> 8) & 255) * k; tex[i + 2] = (c & 255) * k; tex[i + 3] = 255;
    }
  }
  tex.fill(255, W * D * 4); // a spare white row (mipmaps of the last row blend toward it, not toward black)
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], col: number[] = [], idx: number[] = [];
  const quad = (p: number[][], n: number[], uvs: number[][], c: THREE.Color | THREE.Color[]) => {
    const base = pos.length / 3;
    for (let i = 0; i < 4; i++) {
      const k = Array.isArray(c) ? c[i]! : c;
      pos.push(p[i]![0]! * voxel, p[i]![1]! * voxel, p[i]![2]! * voxel); nor.push(...n); uv.push(...uvs[i]!); col.push(k.r, k.g, k.b);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  const one = new THREE.Color(1, 1, 1);
  // tops: equal heights merged greedily, at most MAX a side
  const done = new Uint8Array(W * D);
  let tops = 0;
  for (let z = 0; z < D; z++) {
    for (let x = 0; x < W; x++) {
      if (!isG(x, z) || done[z * W + x]) continue;
      const g = H(x, z);
      const fits = (a: number, b: number) => isG(a, b) && H(a, b) === g && !done[b * W + a];
      let dw = 1;
      while (dw < MAX && x + dw < W && fits(x + dw, z)) dw++;
      let dd = 1;
      grow: while (dd < MAX && z + dd < D) { for (let k = 0; k < dw; k++) if (!fits(x + k, z + dd)) break grow; dd++; }
      for (let b = z; b < z + dd; b++) done.fill(1, b * W + x, b * W + x + dw);
      const u0 = x / W, u1 = (x + dw) / W, v0 = z / (D + 1), v1 = (z + dd) / (D + 1);
      quad([[x, g, z], [x, g, z + dd], [x + dw, g, z + dd], [x + dw, g, z]], [0, 1, 0], [[u0, v0], [u0, v1], [u1, v1], [u1, v0]], one);
      tops++;
    }
  }
  // sides: wherever a ground top stands above its neighbour's (another ground column, or voxels that stop
  // lower), in the top's own colour (sampled from the texture), darker toward the foot like the mesher's corner
  // shading. Runs along an edge with the same heights are one quad.
  let sides = 0;
  const below = (x: number, z: number, g: number): number | null => {
    if (isG(x, z)) return H(x, z) < g ? H(x, z) : null;
    if (w.solid(x, g - 1, z)) return null; // voxels there cover it
    const t = w.topAt(x, z, g - 1, g - 48);
    return t === null ? g - 48 : t + 1;
  };
  const shade = [new THREE.Color(1, 1, 1), new THREE.Color(FOOT, FOOT, FOOT), new THREE.Color(FOOT, FOOT, FOOT), new THREE.Color(1, 1, 1)];
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    // walk each line of columns along the edge's direction: x-facing sides run along z, z-facing along x
    const lines = dx ? W : D, along = dx ? D : W;
    for (let l = 0; l < lines; l++) {
      let run: { a: number; g: number; lo: number } | null = null;
      const flush = (end: number) => {
        if (!run) return;
        const { a: s0, g, lo } = run;
        if (dx) {
          const x = l, ex = dx > 0 ? x + 1 : x, u = (x + 0.5) / W, v0 = s0 / (D + 1), v1 = end / (D + 1);
          const p = dx > 0 ? [[ex, g, end], [ex, lo, end], [ex, lo, s0], [ex, g, s0]] : [[ex, g, s0], [ex, lo, s0], [ex, lo, end], [ex, g, end]];
          const t = dx > 0 ? [[u, v1], [u, v1], [u, v0], [u, v0]] : [[u, v0], [u, v0], [u, v1], [u, v1]];
          quad(p, [dx, 0, 0], t, shade);
        } else {
          const z = l, ez = dz > 0 ? z + 1 : z, v = (z + 0.5) / (D + 1), u0 = s0 / W, u1 = end / W;
          const p = dz > 0 ? [[s0, g, ez], [s0, lo, ez], [end, lo, ez], [end, g, ez]] : [[end, g, ez], [end, lo, ez], [s0, lo, ez], [s0, g, ez]];
          const t = dz > 0 ? [[u0, v], [u0, v], [u1, v], [u1, v]] : [[u1, v], [u1, v], [u0, v], [u0, v]];
          quad(p, [0, 0, dz], t, shade);
        }
        sides++;
        run = null;
      };
      for (let k = 0; k < along; k++) {
        const x = dx ? l : k, z = dx ? k : l;
        const lo = isG(x, z) ? below(x + dx, z + dz, H(x, z)) : null;
        if (lo === null) { flush(k); continue; }
        const g = H(x, z);
        if (run && (run.g !== g || run.lo !== lo || k - run.a >= MAX)) flush(k);
        if (!run) run = { a: k, g, lo };
      }
      flush(along);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  const map = new THREE.DataTexture(tex, W, D + 1, THREE.RGBAFormat);
  map.colorSpace = THREE.SRGBColorSpace;
  map.magFilter = THREE.NearestFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.anisotropy = 4;
  map.needsUpdate = true;
  material.map = map;
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  const draw = drawWorld(level, h);
  return { draw, mesh, stats: { columns, tops, sides, triangles: idx.length / 3, ms: Math.round(performance.now() - t0) } };
}
