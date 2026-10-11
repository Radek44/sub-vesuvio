/**
 * Painting architecture straight into a VoxelWorld: ground, streets, walls with their facades, roofs,
 * openings. Pure (ymir/voxel only), so the sim collides with exactly what the screen draws.
 *
 * Coordinates are voxels (1/8 m): x east, y up, z south. Facades are painted by (u, v): u along the
 * wall, v up from the floor; that is what keeps a plinth, a dado and a moulding level all round a house.
 */
import type { VoxelWorld } from 'ymir/voxel';
import { M, P, basalt, h2, h3, incertum, mixc, noise2, plaster, quadratum, roofTile, tint, vary } from './palette';

export type Color = number;
/** A face painter: (u along the wall, v up from the floor, the voxel) → a colour, or null for a hole. */
export type Face = (u: number, v: number, x: number, y: number, z: number) => Color | null;

/** Fill columns: the ground surface at `top(x, z)` (inclusive) and `depth` voxels of soil below it. */
export function ground(w: VoxelWorld, x0: number, z0: number, x1: number, z1: number, top: (x: number, z: number) => number, surface: (x: number, y: number, z: number, d: number) => Color, depth = 6): void {
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const t = top(x, z);
    for (let d = 0; d < depth; d++) w.set(x, t - d, z, surface(x, t - d, z, d));
  }
}

/** Earth and grass, autumn-dry, with flowers and tufts. `d` is the depth below the surface. */
export function meadow(x: number, y: number, z: number, d: number): Color {
  if (d > 0) return d > 2 ? vary(P.soil, x, y, z, 0.08) : vary(P.earth, x, y, z, 0.08);
  const n = noise2(x, z, 18, 3);
  const r = h3(x, y, z);
  if (r > 0.992) return [P.flowerRed, P.flowerWhite, P.flowerYellow, P.flowerPurple][Math.floor(r * 4000) % 4];
  const g = n < 0.35 ? P.grassDry : n < 0.7 ? P.grass : P.grassDeep;
  if (noise2(x, z, 9, 8) > 0.78) return vary(P.earth, x, y, z, 0.08); // bare patches
  return vary(g, x, y, z, 0.1);
}

/** Beaten earth (lanes, yards). */
export const dirt = (x: number, y: number, z: number, d: number): Color =>
  d > 2 ? vary(P.soil, x, y, z, 0.08) : vary(mixc(P.earth, P.sidewalkDust, noise2(x, z, 7, 2) * 0.5), x, y, z, 0.07);

/** A box of voxels where every voxel's colour comes from `c` (null leaves it empty). */
export function solid(w: VoxelWorld, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: (x: number, y: number, z: number) => Color | null): void {
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++)
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) {
        const v = c(x, y, z);
        if (v !== null) w.set(x, y, z, v);
      }
}

/**
 * A wall along x (from x0 to x1, at z0..z1 thick) or along z, `h` high from `y0`. `face` paints both of
 * its long faces; the core is mortar-coloured rubble (never seen, but solid).
 */
export function wallX(w: VoxelWorld, x0: number, x1: number, z0: number, z1: number, y0: number, h: number, face: Face): void {
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) for (let v = 0; v < h; v++) {
    const y = y0 + v;
    const c = face(x - x0, v, x, y, z);
    if (c === null) { w.delete(x, y, z); continue; }
    w.set(x, y, z, c);
  }
}
export function wallZ(w: VoxelWorld, z0: number, z1: number, x0: number, x1: number, y0: number, h: number, face: Face): void {
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) for (let v = 0; v < h; v++) {
    const y = y0 + v;
    const c = face(z - z0, v, x, y, z);
    if (c === null) { w.delete(x, y, z); continue; }
    w.set(x, y, z, c);
  }
}

export interface Opening { u0: number; u1: number; v0: number; v1: number; kind: 'door' | 'shop' | 'window' | 'arch' }
const inOpening = (os: Opening[], u: number, v: number) => os.find((o) => u >= o.u0 && u <= o.u1 && v >= o.v0 && v <= o.v1);

export interface FacadeStyle {
  /** The colour above the dado. */
  field: Color;
  /** The dado (to ~1.2 m). */
  dado: Color;
  /** Plinth height in voxels (stone, unplastered). Default 2. */
  plinth?: number;
  /** Dado top in voxels. Default 10. */
  dadoTop?: number;
  /** Unplastered walls show their stonework: 'incertum' (rubble) or 'quadratum' (blocks). */
  bare?: 'incertum' | 'quadratum';
  /** Painted panels in the field (Pompeian walls are framed in panels). Default true. */
  panels?: boolean;
}

/**
 * A Pompeian facade: stone plinth, a dado, a moulding, a plastered field framed in panels, with door,
 * shop and window openings (null = hole). Jambs around openings are tuff blocks; shops have a wooden
 * lintel and threshold slot. `seed` varies the panel rhythm.
 */
export function facade(style: FacadeStyle, openings: Opening[] = [], seed = 0): Face {
  const plinth = style.plinth ?? 2, dadoTop = style.dadoTop ?? 10;
  return (u, v, x, y, z) => {
    const o = inOpening(openings, u, v);
    if (o) return null;
    // jambs and lintels framing each opening
    for (const op of openings) {
      const nearU = (u === op.u0 - 1 || u === op.u1 + 1) && v >= op.v0 && v <= op.v1 + 1;
      const lintel = v === op.v1 + 1 && u >= op.u0 - 1 && u <= op.u1 + 1;
      if (op.kind === 'shop' && lintel) return vary(P.woodDark, x, y, z, 0.06);
      if (op.kind === 'window' && (nearU || lintel || v === op.v0 - 1 && u >= op.u0 && u <= op.u1)) return vary(P.moulding, x, y, z, 0.03);
      if ((op.kind === 'door' || op.kind === 'arch' || op.kind === 'shop') && (nearU || lintel)) return quadratum(u, v, 4, 3, P.tuff);
    }
    if (style.bare === 'incertum') return v < plinth ? quadratum(u, v, 6, 3, P.tuff) : incertum(u + seed * 13, v);
    if (style.bare === 'quadratum') return quadratum(u, v, 8, 4, P.tuff);
    if (v < plinth) return quadratum(u, v, 6, 2, P.tuff);
    if (v < dadoTop) return plaster(style.dado, u, v, seed);
    if (v === dadoTop) return vary(P.moulding, x, y, z, 0.03);
    // panels: thin frames in a darker shade every ~2.5 m
    if (style.panels !== false) {
      const pw = 20 + (seed % 3) * 2;
      const pu = (u + seed * 5) % pw;
      if ((pu === 1 || pu === pw - 2) && v > dadoTop + 2) return tint(style.field, -0.14);
    }
    // weathering: darker near the ground, a little grime under the eaves
    const grime = Math.max(0, 1 - (v - dadoTop) / 6) * 0.04;
    return tint(plaster(style.field, u, v, seed), -grime);
  };
}

/** Stuck-on detail: painted election notices (programmata): red letters on a whitewashed patch. Purely decorative. */
export function programma(u0: number, v0: number, len: number, seed: number): (u: number, v: number) => Color | null {
  return (u, v) => {
    if (u < u0 || u >= u0 + len || v < v0 || v > v0 + 4) return null;
    const lu = u - u0, lv = v - v0;
    if (lv === 0 || lv === 4) return P.plasterWhite;
    // letter-ish strokes: two lines of red marks
    const mark = (lv === 1 || lv === 3) && h2(lu, lv + seed * 9, 77) > 0.42 && lu % 4 !== 3;
    return mark ? (lv === 1 ? P.red : P.black) : P.plasterWhite;
  };
}

/**
 * A low-pitched gable roof over [x0..x1]×[z0..z1] with its ridge along x, from eaves height `y`:
 * terracotta tegulae and imbrices, an overhang, and a ridge of imbrices. Pompeian roofs are low: 1 up
 * for every 3 across.
 */
export function gableRoofX(w: VoxelWorld, x0: number, x1: number, z0: number, z1: number, y: number, overhang = 2): void {
  const zc = (z0 + z1) / 2;
  const half = (z1 - z0) / 2 + overhang;
  for (let x = x0 - overhang; x <= x1 + overhang; x++) for (let z = z0 - overhang; z <= z1 + overhang; z++) {
    const across = Math.abs(z - zc);
    const down = Math.round(across);
    const ry = y + Math.floor((half - across) / 3);
    const ridge = across < 1;
    w.set(x, ry, z, ridge ? vary(P.imbrex, x, ry, z, 0.05) : roofTile(x - x0 + 100, down));
    // the roof's thickness so it reads solid from the eaves side
    if ((z === z0 - overhang || z === z1 + overhang)) w.set(x, ry - 1, z, vary(P.woodDark, x, ry, z, 0.05));
  }
}

/** A lean-to roof (a shop, a portico) sloping down toward +z (`toward` = 1) or −z (−1). */
export function shedRoofX(w: VoxelWorld, x0: number, x1: number, z0: number, z1: number, yHigh: number, toward: 1 | -1 = 1, overhang = 2): void {
  const za = toward === 1 ? z0 : z1;
  for (let x = x0 - overhang; x <= x1 + overhang; x++) for (let z = z0 - (toward === -1 ? overhang : 0); z <= z1 + (toward === 1 ? overhang : 0); z++) {
    const d = Math.abs(z - za);
    const ry = yHigh - Math.floor(d / 3);
    w.set(x, ry, z, roofTile(x - x0 + 50, d));
  }
}

/** A column: a Doric shaft of stuccoed tuff on a plinth, fluted (alternate shades), with a capital. */
export function column(w: VoxelWorld, cx: number, cz: number, y0: number, h: number, r = 2, color: Color = P.plasterWhite): void {
  for (let v = 0; v < h; v++) {
    const y = y0 + v;
    const cap = v >= h - 2;
    const rr = cap ? r + 1 : r;
    for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) {
      if (dx * dx + dz * dz > rr * rr + rr) continue;
      const flute = !cap && ((Math.round(Math.atan2(dz, dx) * 4 / Math.PI) & 1) === 1);
      w.set(cx + dx, y, cz + dz, vary(flute ? tint(color, -0.08) : color, cx + dx, y, cz + dz, 0.03));
    }
  }
}

/** A round arch (barrel vault seen end-on) is open where this is true: width `wd` from u0, springing at `spring`, crown radius wd/2. */
export function archHole(u0: number, wd: number, spring: number): (u: number, v: number) => boolean {
  const r = wd / 2, cu = u0 + r - 0.5;
  return (u, v) => u >= u0 && u < u0 + wd && (v < spring || (u - cu) ** 2 + (v - spring) ** 2 <= r * r);
}

/** The street: lava paving between kerbs, raised sidewalks, ruts down the middle, stepping stones where `steps` says. */
export interface StreetSpec {
  x0: number; x1: number;
  /** The roadway's north and south edges (inclusive). */
  zN: number; zS: number;
  /** Sidewalk width each side. */
  walk: number;
  /** Road surface height at x (voxels). */
  y: (x: number) => number;
  /** Sidewalk height above the road. Default 3 (≈ 40 cm, as in Pompeii). */
  kerb?: number;
  /** x positions of stepping-stone crossings. */
  steps?: number[];
}
export function street(w: VoxelWorld, s: StreetSpec): void {
  const kerb = s.kerb ?? 3;
  const mid = (s.zN + s.zS) / 2;
  for (let x = s.x0; x <= s.x1; x++) {
    const y = s.y(x);
    for (let z = s.zN - s.walk; z <= s.zS + s.walk; z++) {
      const road = z >= s.zN && z <= s.zS;
      if (road) {
        // two ruts a cart's width apart (≈ 1.4 m), worn smooth and darker
        const rut = Math.abs(Math.abs(z - mid) - 5.5) < 1;
        for (let d = 0; d < 5; d++) w.set(x, y - d, z, d === 0 ? (rut ? tint(basalt(x, z, 1), -0.12) : basalt(x, z, Math.max(0, 1 - Math.abs(z - mid) / 8))) : vary(P.soil, x, y - d, z, 0.05));
        continue;
      }
      const edge = z === s.zN - 1 || z === s.zS + 1;
      for (let d = 0; d < 5 + kerb; d++) {
        const yy = y + kerb - d;
        let c: Color;
        if (d === 0) c = edge ? vary(P.kerb, x, yy, z, 0.06) : sidewalkTop(x, z);
        else if (edge && d <= kerb) c = vary(tint(P.kerb, -0.08), x, yy, z, 0.06);
        else c = vary(P.soil, x, yy, z, 0.05);
        w.set(x, yy, z, c);
      }
    }
  }
  // stepping stones: three oval lava blocks across the road, at sidewalk height, gaps for wheels
  for (const sx of s.steps ?? []) {
    const y = s.y(sx);
    const stones = [s.zN + 3, Math.round(mid), s.zS - 3];
    for (const cz of stones) for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
      if (dx * dx * 0.7 + dz * dz > 5) continue;
      for (let k = 1; k <= kerb; k++) w.set(sx + dx, y + k, cz + dz, vary(k === kerb ? P.basaltLight : P.basalt, sx + dx, y + k, cz + dz, 0.06));
    }
  }
}

/** Sidewalk: beaten earth and cocciopesto (crushed tile in lime) with scattered white tesserae. */
function sidewalkTop(x: number, z: number): Color {
  const r = h2(x, z, 41);
  if (r > 0.94) return P.tessera;
  return vary(mixc(P.sidewalk, P.sidewalkDust, noise2(x, z, 10, 5)), x, 0, z, 0.06);
}

/** A floor of mosaic: black-and-white tesserae in a field with a border (the House of the Dog's entrance). */
export function mosaic(w: VoxelWorld, x0: number, z0: number, x1: number, z1: number, y: number, pattern?: (u: number, v: number) => Color | null): void {
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const u = x - x0, v = z - z0;
    const border = u === 0 || v === 0 || x === x1 || z === z1 || u === 2 || v === 2 || x === x1 - 2 || z === z1 - 2;
    const c = pattern?.(u, v) ?? (border ? P.black : P.marble);
    w.set(x, y, z, vary(c, x, y, z, 0.03));
  }
}

export { M };
