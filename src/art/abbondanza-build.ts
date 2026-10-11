/**
 * Painters Via dell'Abbondanza adds to `build.ts`: a street running north–south (Via Stabiana, crossing it),
 * signs and election notices painted in real letters, shop shutters, and the terrace walls where the
 * town steps down to the south. Pure (ymir/voxel only).
 *
 * Shop signs and notices were painted by professional sign-writers (scriptores) in red and black on a
 * whitewashed patch, in tall, narrow capitals; the next notice was often painted over the last.
 */
import type { VoxelWorld } from 'ymir/voxel';
import { P, basalt, h2, incertum, mixc, noise2, plaster, quadratum, tint, vary } from './palette';
import { letters, textWidth } from './abbondanza-props';

/** A street running along z: lava paving between kerbs, raised sidewalks either side, ruts, stepping stones. */
export interface StreetZSpec {
  z0: number; z1: number;
  /** The roadway's west and east edges (inclusive). */
  xW: number; xE: number;
  walk: number;
  /** Road height at z (voxels). */
  y: (z: number) => number;
  kerb?: number;
  /** z positions of stepping-stone crossings. */
  steps?: number[];
}
export function streetZ(w: VoxelWorld, s: StreetZSpec): void {
  const kerb = s.kerb ?? 3;
  const mid = (s.xW + s.xE) / 2;
  for (let z = s.z0; z <= s.z1; z++) {
    const y = s.y(z);
    for (let x = s.xW - s.walk; x <= s.xE + s.walk; x++) {
      if (x >= s.xW && x <= s.xE) {
        const rut = Math.abs(Math.abs(x - mid) - 5.5) < 1;
        for (let d = 0; d < 5; d++) w.set(x, y - d, z, d === 0 ? (rut ? tint(basalt(z + 300, x, 1), -0.12) : basalt(z + 300, x, Math.max(0, 1 - Math.abs(x - mid) / 8))) : vary(P.soil, x, y - d, z, 0.05));
        continue;
      }
      const edge = x === s.xW - 1 || x === s.xE + 1;
      for (let d = 0; d < 5 + kerb; d++) {
        const yy = y + kerb - d;
        const c = d === 0 ? (edge ? vary(P.kerb, x, yy, z, 0.06) : walkTop(x, z)) : edge && d <= kerb ? vary(tint(P.kerb, -0.08), x, yy, z, 0.06) : vary(P.soil, x, yy, z, 0.05);
        w.set(x, yy, z, c);
      }
    }
  }
  for (const sz of s.steps ?? []) {
    const y = s.y(sz);
    for (const cx of [s.xW + 3, Math.round(mid), s.xE - 3]) for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
      if (dz * dz * 0.7 + dx * dx > 5) continue;
      for (let k = 1; k <= kerb; k++) w.set(cx + dx, y + k, sz + dz, vary(k === kerb ? P.basaltLight : P.basalt, cx + dx, y + k, sz + dz, 0.06));
    }
  }
}

/** Sidewalk top: beaten earth and cocciopesto with white tesserae (as `build.ts` paints its sidewalks). */
export function walkTop(x: number, z: number): number {
  if (h2(x, z, 41) > 0.94) return P.tessera;
  return vary(mixc(P.sidewalk, P.sidewalkDust, noise2(x, z, 10, 5)), x, 0, z, 0.06);
}

/**
 * Painted words on a wall facing +z (the camera), at its outer face `z`: a whitewashed panel with a thin
 * border and the text in capitals, `lines` stacked from the top down. `x0`, `y0` are the panel's left and
 * bottom. Returns the panel's width.
 */
export function paintedText(w: VoxelWorld, x0: number, y0: number, z: number, lines: string[], o: { ink?: number; ink2?: number; ground?: number; border?: number | null; pad?: number } = {}): number {
  const pad = o.pad ?? 1;
  const wd = Math.max(...lines.map(textWidth)) + pad * 2;
  const ht = lines.length * 6 - 1 + pad * 2;
  const ground = o.ground ?? P.plasterWhite;
  for (let u = 0; u < wd; u++) for (let v = 0; v < ht; v++) {
    const rim = o.border !== null && (u === 0 || v === 0 || u === wd - 1 || v === ht - 1);
    w.set(x0 + u, y0 + v, z, rim ? (o.border ?? tint(ground, -0.1)) : vary(ground, x0 + u, y0 + v, z, 0.025));
  }
  lines.forEach((line, i) => {
    const lw = textWidth(line);
    const ox = x0 + pad + Math.floor((wd - pad * 2 - lw) / 2);
    const oy = y0 + ht - pad - 5 - i * 6;
    const ink = i === 0 ? (o.ink ?? P.red) : (o.ink2 ?? o.ink ?? P.red);
    letters(line, (u, v) => w.set(ox + u, oy + v, z, vary(ink, ox + u, oy + v, z, 0.04)));
  });
  return wd;
}

/**
 * Shop shutters: Pompeian shops closed with upright boards slid into a groove in the lava threshold. By
 * day they stand stacked inside one jamb; `closed` fills the whole opening (a shop not open today).
 * The threshold stone with its groove is laid across the opening at floor level.
 */
export function shutters(w: VoxelWorld, x0: number, x1: number, zFace: number, floor: number, height: number, closed = false): void {
  for (let x = x0; x <= x1; x++) for (let z = zFace - 2; z <= zFace; z++) w.set(x, floor, z, z === zFace - 1 ? P.joint : vary(P.lava, x, floor, z, 0.06));
  if (closed) {
    for (let x = x0; x <= x1; x++) for (let v = 1; v <= height; v++) w.set(x, floor + v, zFace - 1, vary((x - x0) % 5 === 0 ? P.woodDark : P.shutter, x, floor + v, zFace - 1, 0.05));
    return;
  }
  // the day's boards, leaning stacked inside the west jamb
  for (let k = 0; k < 4; k++) for (let v = 1; v <= height - 2; v++) for (let x = x0; x <= x0 + 1; x++) w.set(x, floor + v, zFace - 4 - k, vary(k & 1 ? P.shutter : P.woodDark, x, floor + v, zFace - 4 - k, 0.05));
}

/**
 * A terrace's retaining wall facing +z: courses of grey tuff blocks below, the parapet above plastered and
 * painted with a red band, a coping of limestone. Patches where the plaster has fallen show the rubble.
 */
export function terraceWall(w: VoxelWorld, x0: number, x1: number, z0: number, z1: number, yBottom: (x: number) => number, yTop: (x: number) => number): void {
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const b = yBottom(x), t = yTop(x);
    for (let y = b; y <= t; y++) {
      const fromTop = t - y;
      let c: number;
      if (fromTop === 0) c = vary(P.limestone, x, y, z, 0.04);
      else if (fromTop <= 5) c = noise2(x, y * 3, 7, 12) > 0.8 ? incertum(x, y, 4) : fromTop === 5 ? plaster(P.red, x, y, 9) : plaster(0xe8dcc0, x, y, 9);
      else c = quadratum(x, y - b, 10, 4, h2(x >> 3, y >> 2, 6) > 0.7 ? P.tuffWarm : P.tuff);
      w.set(x, y, z, c);
    }
  }
}

