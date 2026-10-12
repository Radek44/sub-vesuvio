/**
 * The Pompeian palette and the surface recipes every building is painted from. Pure: colours are sRGB
 * hex, and every recipe is a function of the voxel's position, so the town looks the same every time.
 *
 * Sources for the look (what the excavations show, not a modern repaint):
 * - Streets: polygonal blocks of grey-black lava (basalt) paving, worn into ruts; raised kerbed
 *   sidewalks; big stepping stones at crossings.
 * - Walls: opus incertum (irregular lava, limestone and tuff in mortar), corners and door jambs in
 *   tuff or brick blocks, then plastered and painted: a dark or red dado, ochre, red or white above.
 * - Roofs: low-pitched terracotta tegulae with half-round imbrices over the joints.
 * - Gate and public buildings: grey Nocera tuff and Sarno limestone blocks.
 */

export const VOX = 0.125;
/** Voxels per metre. */
export const M = 8;

export const P = {
  basalt: 0x4b4c52, basaltLight: 0x5d5e66, basaltDark: 0x393a40, joint: 0x2a292c,
  kerb: 0x8f8a80, sidewalk: 0xa8826a, sidewalkDust: 0xb59a7c, tessera: 0xe9e2d2,
  tuff: 0x8d877a, tuffWarm: 0xa3967a, limestone: 0xc9bd9c, mortar: 0xcfc4ab, lava: 0x55504c, brick: 0xa8553a,
  plasterWhite: 0xefe4cc, ochre: 0xe0b468, red: 0xa8342a, redDark: 0x8a2a24, yellow: 0xdba948, black: 0x2f2a27,
  green: 0x6a8256, moulding: 0xf2ead8, marble: 0xeeeae2,
  tile: 0xb6582f, tileDark: 0x9a4628, imbrex: 0x8c3d22,
  wood: 0x6e4a2c, woodDark: 0x4a301d, woodLight: 0x8c6440, shutter: 0x5b3c24,
  bronze: 0x8a6a34, lead: 0x6f7378, iron: 0x3d3b3a,
  earth: 0x8b6b48, earthDark: 0x6e5236, soil: 0x5f4630,
  grass: 0x93a050, grassDry: 0xb0a65e, grassDeep: 0x6f8a3e, flowerRed: 0xd8483a, flowerWhite: 0xf3efe3, flowerYellow: 0xe8c040, flowerPurple: 0x8a5aa8,
  pine: 0x3e6a35, pineLight: 0x55823f, pineBark: 0x7a5440, cypress: 0x2e5232, olive: 0x8a9a68, oliveDark: 0x6d7d52,
  vine: 0x6f9a3e, vineGold: 0xc0902e, vineRust: 0xa4482a, grape: 0x4b2a52,
  water: 0x3fc6c0, sand: 0xd9c49a, sea: 0x2f8fb0,
  terracotta: 0xb8643a, amphora: 0xc2794a, dolium: 0xa8613c,
  glowFire: 0xffa04a, glowLamp: 0xffc670, glowWindow: 0xffcf86,
} as const;

/** A stable 0–1 hash of a voxel (or any integer triple). */
export function h3(x: number, y: number, z: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export const h2 = (x: number, z: number, salt = 0): number => h3(x, salt, z);

/** Smooth value noise in 2D, 0–1, with cells `size` voxels wide. */
export function noise2(x: number, z: number, size: number, salt = 0): number {
  const fx = x / size, fz = z / size;
  const ix = Math.floor(fx), iz = Math.floor(fz);
  const tx = fx - ix, tz = fz - iz;
  const sx = tx * tx * (3 - 2 * tx), sz = tz * tz * (3 - 2 * tz);
  const a = h2(ix, iz, salt), b = h2(ix + 1, iz, salt), c = h2(ix, iz + 1, salt), d = h2(ix + 1, iz + 1, salt);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}

/** Brightness nudge, like ymir/voxel `vary`, with our hash. */
export function tint(c: number, k: number): number {
  const f = 1 + k;
  const ch = (s: number) => Math.max(0, Math.min(255, Math.round(((c >> s) & 255) * f)));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
export function mixc(a: number, b: number, k: number): number {
  const ch = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * k);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
/** Per-voxel variation of ±amt. */
export const vary = (c: number, x: number, y: number, z: number, amt = 0.06): number => tint(c, (h3(x, y, z) - 0.5) * 2 * amt);

/**
 * Irregular blocks: a jittered grid of cells `size` voxels across, each cell its own id, with joints
 * where cells meet. Returns the cell id, or -1 on a joint. Used for basalt paving and opus incertum.
 */
export function cells(u: number, v: number, size: number, salt = 0): number {
  // Jitter each cell's centre; a voxel belongs to the nearest centre (a Voronoi of the jittered grid).
  const cu = Math.floor(u / size), cv = Math.floor(v / size);
  let best = Infinity, second = Infinity, id = 0;
  for (let du = -1; du <= 1; du++) for (let dv = -1; dv <= 1; dv++) {
    const gu = cu + du, gv = cv + dv;
    const pu = (gu + 0.2 + h2(gu, gv, salt) * 0.6) * size, pv = (gv + 0.2 + h2(gu, gv, salt + 7) * 0.6) * size;
    const d = (u - pu) ** 2 + (v - pv) ** 2;
    if (d < best) { second = best; best = d; id = gu * 7919 + gv; }
    else if (d < second) second = d;
  }
  // A joint where the two nearest centres are almost equally near.
  return Math.sqrt(second) - Math.sqrt(best) < 0.9 ? -1 : id;
}

/** Basalt paving: polygonal blocks about 0.6 m across, dark joints, each block its own shade. */
export function basalt(x: number, z: number, worn = 0): number {
  const id = cells(x, z, 5, 11);
  if (id < 0) return P.joint;
  const r = h2(id, 3, 5);
  const base = r < 0.33 ? P.basalt : r < 0.66 ? P.basaltLight : P.basaltDark;
  // polished by feet and wheels down the middle
  return tint(base, (h3(x, 0, z) - 0.5) * 0.08 + worn * 0.12);
}

/** Opus incertum: irregular stones of lava, limestone and tuff set in pale mortar. */
export function incertum(u: number, v: number, salt = 0): number {
  const id = cells(u, v, 3, 31 + salt);
  if (id < 0) return vary(P.mortar, u, v, salt, 0.05);
  const r = h2(id, 1, salt);
  const base = r < 0.4 ? P.lava : r < 0.7 ? P.limestone : r < 0.88 ? P.tuff : P.tuffWarm;
  return vary(base, u, v, id, 0.07);
}

/** Squared blocks (opus quadratum) of tuff or limestone, `w`×`h` voxels, courses offset by half a block. */
export function quadratum(u: number, v: number, w = 8, h = 4, stone: number = P.tuff): number {
  const row = Math.floor(v / h);
  const uu = u + (row & 1) * (w >> 1);
  if (v % h === 0 || uu % w === 0) return tint(stone, -0.18);
  const id = Math.floor(uu / w) * 31 + row;
  return vary(tint(stone, (h2(id, row, 3) - 0.5) * 0.12), u, v, id, 0.04);
}

/** Painted plaster: a field colour with the faint mottling of hand-applied lime. */
export function plaster(c: number, u: number, v: number, salt = 0): number {
  return tint(c, (noise2(u, v, 6, salt) - 0.5) * 0.08 + (h3(u, v, salt) - 0.5) * 0.04);
}

/** Terracotta roof: rows of tegulae running down the slope, imbrices over the joints every `pitch` voxels. */
export function roofTile(u: number, down: number, pitch = 4): number {
  if (u % pitch === 0) return vary(P.imbrex, u, down, 1, 0.06);
  const course = Math.floor(down / 3);
  return vary((course + Math.floor(u / pitch)) & 1 ? P.tile : P.tileDark, u, down, 2, 0.07);
}
