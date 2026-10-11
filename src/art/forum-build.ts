/**
 * Painting the Forum's architecture into a VoxelWorld: the piazza's paving, roofs whose ridge runs north–
 * south (the temples face the Forum), pediments, sloping roof planes, two-storey colonnades, honorary
 * arches, and the wall paintings and carving particular to these buildings. Pure (ymir/voxel only).
 *
 * Sources for the look:
 * - The piazza was paved in large slabs of pale travertine (Augustan), and closed to carts: the streets
 *   that reach it end at a step and a line of stone posts.
 * - Its colonnade had two storeys, Doric below, a lighter order with a parapet above. At the south end the
 *   older grey tuff colonnade (second century BC) still stood; elsewhere a new limestone one was going up
 *   when the city was buried.
 * - The Basilica's walls carry First Style decoration: plaster modelled and painted to look like courses of
 *   coloured marble blocks.
 * - The marble door frame of Eumachia's building is carved with acanthus scrolls full of small creatures.
 */
import type { VoxelWorld } from 'ymir/voxel';
import { P, h2, h3, mixc, noise2, plaster, quadratum, roofTile, tint, vary } from './palette';
import { column, type Color, type Face } from './build';

/**
 * Travertine slabs: big rectangles in courses of varying height, each slab its own length and pale shade,
 * the joints fine. Feet have worn paths lighter, rain and spilt oil have left darker stains, and here and
 * there a slab was replaced in grey tuff after the earthquake.
 */
export const TRAVERTINE = [0xdcd0b4, 0xd4c8aa, 0xe2d8c0, 0xcfc3a4] as const;
export function slabs(x: number, z: number, salt = 0, sw = 14, sd = 8): Color {
  // courses: alternating heights, so the rows don't read as brickwork
  const pair = Math.floor(z / (sd * 2));
  const zz = z - pair * sd * 2;
  const split = sd - 2 + Math.floor(h2(pair, 1, 50 + salt) * 5);
  const row = pair * 2 + (zz < split ? 0 : 1);
  const z0 = pair * sd * 2 + (zz < split ? 0 : split);
  // slabs along the course: jittered joints
  const off = Math.floor(h2(row, 0, 51 + salt) * sw);
  const u = x + off;
  const k = Math.floor(u / sw);
  const jit = (kk: number) => kk * sw + Math.floor((h2(kk, row, 55 + salt) - 0.5) * sw * 0.6);
  const col = u < jit(k) ? k - 1 : u >= jit(k + 1) ? k + 1 : k;
  if (z === z0 || u === jit(col)) return vary(0xb3a78c, x, 0, z, 0.04);
  const id = h2(col, row, 52 + salt);
  const base = TRAVERTINE[Math.floor(id * TRAVERTINE.length) % TRAVERTINE.length];
  const patched = h2(col, row, 54 + salt) > 0.97;
  const wear = (noise2(x, z, 31, 53 + salt) - 0.5) * 0.1 - Math.max(0, noise2(x, z, 13, 56 + salt) - 0.72) * 0.35;
  return vary(tint(patched ? P.tuff : base, wear), x, 1, z, 0.025);
}

/** Cocciopesto: crushed tile in lime, a dull red floor with scattered white tesserae (porticoes, shops). */
export function cocciopesto(x: number, z: number): Color {
  return h2(x, z, 61) > 0.93 ? P.tessera : vary(mixc(0x9a5a44, P.sidewalkDust, noise2(x, z, 9, 62) * 0.4), x, 2, z, 0.06);
}

/**
 * A roof plane over [x0..x1]×[z0..z1]: its height is `yAt(x, z)`, its tiles run down the slope along
 * `slope` ('x' or 'z'), imbrices over the joints. A dark eaves edge where it ends.
 */
export function roofPlane(w: VoxelWorld, x0: number, x1: number, z0: number, z1: number, yAt: (x: number, z: number) => number, slope: 'x' | 'z'): void {
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const y = Math.round(yAt(x, z));
    const u = slope === 'z' ? x - x0 : z - z0, d = slope === 'z' ? z - z0 : x - x0;
    w.set(x, y, z, roofTile(u + 50, d));
    const edge = slope === 'z' ? z === z0 || z === z1 : x === x0 || x === x1;
    if (edge) w.set(x, y - 1, z, vary(P.woodDark, x, y, z, 0.05));
  }
}

/**
 * A gable roof with its ridge along z (a temple's, seen from the Forum): over [x0..x1]×[z0..z1], eaves at
 * `y`, rising 1 for every `run` across. Returns the ridge height.
 */
export function gableRoofZ(w: VoxelWorld, x0: number, x1: number, z0: number, z1: number, y: number, overhang = 2, run = 3): number {
  const xc = (x0 + x1) / 2;
  const half = (x1 - x0) / 2 + overhang;
  let top = y;
  for (let x = x0 - overhang; x <= x1 + overhang; x++) for (let z = z0 - overhang; z <= z1 + overhang; z++) {
    const across = Math.abs(x - xc);
    const ry = y + Math.floor((half - across) / run);
    top = Math.max(top, ry);
    w.set(x, ry, z, across < 1 ? vary(P.imbrex, x, ry, z, 0.05) : roofTile(z - z0 + 100, Math.round(across)));
    if (x === x0 - overhang || x === x1 + overhang) w.set(x, ry - 1, z, vary(P.woodDark, x, ry, z, 0.05));
  }
  return top;
}

/**
 * The pediment under a ridge-along-z gable, on the face z = `z` (two voxels thick toward `back`): a
 * triangle of white stucco framed by the raking cornice, a moulding along its base, and a disc (a shield,
 * a wreath) in the tympanum. `y` is the eaves height the roof was built from.
 */
export function pediment(w: VoxelWorld, x0: number, x1: number, z: number, back: 1 | -1, y: number, run = 3, overhang = 2): void {
  const xc = (x0 + x1) / 2, half = (x1 - x0) / 2 + overhang;
  for (let x = x0; x <= x1; x++) {
    const top = y + Math.floor((half - Math.abs(x - xc)) / run) - 1;
    for (let yy = y - 2; yy <= top; yy++) for (let k = 0; k < 2; k++) {
      const zz = z + back * k;
      const rake = yy >= top - 1 || yy <= y - 1;
      const disc = Math.hypot(x - xc, yy - (y + (top - y) * 0.35)) < 2.2 && k === 0;
      w.set(x, yy, zz, rake ? vary(P.moulding, x, yy, zz, 0.03) : disc ? vary(0xc9a050, x, yy, zz, 0.06) : vary(P.plasterWhite, x, yy, zz, 0.03));
    }
  }
}

/** First Style wall painting: plaster modelled as courses of coloured marble blocks, a dado of upright slabs, a cornice. */
export function firstStyle(seed = 0): Face {
  const blocks = [0xc9a26a, 0xa8342a, 0x6a8256, 0xd9c7a8, 0x3a3a3a, 0xdba948];
  return (u, v, x, y, z) => {
    if (v < 2) return quadratum(u, v, 6, 2, P.tuff);
    if (v < 10) return u % 9 === 0 ? tint(P.ochre, -0.25) : plaster(blocks[(Math.floor(u / 9) + seed) % 2 ? 5 : 3], u, v, seed); // upright slabs
    if (v === 10 || v === 11) return vary(P.moulding, x, y, z, 0.03);
    const row = Math.floor((v - 12) / 4), uu = u + (row & 1) * 5;
    if ((v - 12) % 4 === 0 || uu % 10 === 0) return tint(P.plasterWhite, -0.1); // the drafted joints
    const c = blocks[Math.floor(h2(Math.floor(uu / 10), row, 70 + seed) * blocks.length)];
    return plaster(c, u, v, seed + 3);
  };
}

/**
 * Acanthus scrolls in marble, for a door frame: a running scroll of leaves, with here and there a bird,
 * a lizard or an insect hiding in it. (u along the frame, v across it.)
 */
export function acanthus(u: number, v: number, x: number, y: number, z: number): Color {
  const s = Math.sin(u * 0.55) * 2.2 + 3;
  const stem = Math.abs(v - s) < 0.8;
  const leaf = Math.abs(v - s) < 2.2 && ((u + Math.round(s)) % 4 === 0 || (u + Math.round(s)) % 4 === 1);
  const creature = h3(Math.floor(u / 6), 3, 71) > 0.82 && (u % 6) === 3 && v >= 2 && v <= 4;
  if (v === 0 || v === 6) return vary(P.moulding, x, y, z, 0.02);
  if (creature) return 0x9a8a72;
  if (stem) return vary(tint(P.marble, -0.12), x, y, z, 0.03);
  if (leaf) return vary(tint(P.marble, -0.06), x, y, z, 0.03);
  return vary(P.marble, x, y, z, 0.02);
}

/** Painted election notices (programmata): red and black capitals on a whitewashed patch, `len` long, 5 high. */
export function notice(len: number, seed: number): (u: number, v: number) => Color | null {
  return (u, v) => {
    if (u < 0 || u >= len || v < 0 || v > 5) return null;
    if (v === 0 || v === 5) return P.plasterWhite;
    // a big first line (the candidate's name) and a smaller second (the office, and who asks)
    const big = v >= 3;
    const mark = big ? h2(u, v + seed * 9, 77) > 0.35 && u % 4 !== 3 : v === 1 && h2(u, seed * 9, 78) > 0.5 && u % 3 !== 2;
    return mark ? (big ? P.red : P.black) : P.plasterWhite;
  };
}

/**
 * A column of the two-storey colonnade: the lower shaft (`r`, `h` high from `y0`), and above its
 * architrave (`archH`) a lighter upper shaft `h2` high. Tuff for the old Samnite colonnade, limestone for
 * the new one.
 */
export function doubleColumn(w: VoxelWorld, cx: number, cz: number, y0: number, h: number, upper: number, archH: number, stone: Color): void {
  column(w, cx, cz, y0, h, 2, stone);
  column(w, cx, cz, y0 + h + archH, upper, 1, stone);
}
