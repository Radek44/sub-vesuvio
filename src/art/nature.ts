/**
 * Trees and plants of the Bay of Naples in October, as voxel models at 1/8 m (the world's scale). Each
 * is a ymir/voxel `Model` drawn once per variant and shared, swaying with the wind (`voxelLook` sway
 * from the crown's base). Pure.
 *
 * - Stone pine (Pinus pinea): the bay's silhouette, a tall bare trunk and a flat umbrella crown.
 * - Italian cypress: a dark green flame by tombs and gardens.
 * - Olive: silvery, gnarled, low.
 * - Fig: broad leaves, in house gardens.
 * - Oleander: a flowering shrub (pink and white), garden beds.
 * - Vines on a pergola, golden and rust in October, with the last grapes before the vintage.
 */
import { model, type Model } from 'ymir/voxel';
import { P, h3, mixc, noise2, tint, vary } from './palette';

/** A trunk from (0,0,0) up `h` voxels, leaning by (lx, lz) over its height, `r` thick, with root flare. */
function trunk(m: Model, h: number, r: number, lx: number, lz: number, bark: number): [number, number] {
  let x = 0, z = 0;
  for (let y = 0; y < h; y++) {
    const t = y / h;
    x = lx * t * t; z = lz * t * t;
    const rr = r + (y < 3 ? 3 - y : 0) * 0.6 - t * 0.6;
    for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
      if (dx * dx + dz * dz > rr * rr + 0.5) continue;
      const vx = Math.round(x) + dx, vz = Math.round(z) + dz;
      // plates of bark: vertical furrows
      const furrow = (vx + vz * 3 + Math.floor(y / 3)) % 4 === 0;
      m.solid.set(vx, y, vz, vary(furrow ? tint(bark, -0.2) : bark, vx, y, vz, 0.08));
    }
  }
  return [Math.round(x), Math.round(z)];
}

/** Leaves in a blob: an ellipsoid shell around (cx, cy, cz), radii (rx, ry, rz), thinned by noise so light gets in. */
function crown(m: Model, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, colors: number[], density = 0.82, shell = 2.5): void {
  for (let x = -rx; x <= rx; x++) for (let y = -ry; y <= ry; y++) for (let z = -rz; z <= rz; z++) {
    const d = (x * x) / (rx * rx) + (y * y) / (ry * ry) + (z * z) / (rz * rz);
    if (d > 1) continue;
    // only the outer shell: the inside is never seen, and leaves it light
    const inner = ((x * x) / ((rx - shell) ** 2) + (y * y) / (Math.max(1, ry - shell) ** 2) + (z * z) / ((rz - shell) ** 2));
    if (inner < 1 && rx > shell + 1) continue;
    const X = cx + x, Y = cy + y, Z = cz + z;
    const n = noise2(X * 3 + Y, Z * 3 - Y, 5, 17);
    if (h3(X, Y, Z) > density + (n - 0.5) * 0.3) continue;
    // lit on top, darker beneath: bake a little of it so the crown reads even in shadow
    const up = (y + ry) / (2 * ry);
    const base = colors[Math.floor(h3(X, Y + 1, Z) * colors.length)];
    m.solid.set(X, Y, Z, vary(tint(base, (up - 0.5) * 0.25), X, Y, Z, 0.1));
  }
}

export function stonePine(variant: number): Model {
  const m = model();
  const h = 62 + (variant % 3) * 10;
  const lean = [[6, -3], [-5, 4], [3, 5]][variant % 3];
  const [tx, tz] = trunk(m, h, 2.2, lean[0], lean[1], P.pineBark);
  // the umbrella: several flat lobes, wider than tall, at the top
  const lobes = [[0, 0, 0], [11, -2, 6], [-12, 1, -5], [5, 2, -12], [-6, -1, 11], [14, -3, -8]];
  for (let i = 0; i < lobes.length - (variant % 2); i++) {
    const [lx, ly, lz] = lobes[i];
    crown(m, tx + lx, h + 4 + ly, tz + lz, 16 - (i % 3), 4, 14 - (i % 2), [P.pine, P.pineLight, P.pine, mixc(P.pine, P.pineLight, 0.5)], 0.88, 2.5);
  }
  // two bare branches up into the crown
  for (const [bx, bz] of [[8, 4], [-7, -5]]) for (let k = 0; k < 10; k++) {
    const x = tx + Math.round((bx * k) / 10), z = tz + Math.round((bz * k) / 10), y = h - 6 + k;
    m.solid.set(x, y, z, P.pineBark);
  }
  return m;
}

export function cypress(variant: number): Model {
  const m = model();
  const h = 70 + (variant % 3) * 8;
  trunk(m, 8, 1.4, 0, 0, P.pineBark);
  for (let y = 4; y < h; y++) {
    const t = (y - 4) / (h - 4);
    // a flame: widest a third of the way up, to a point
    const r = Math.max(0.6, 7 * Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.05)) * (1 - t * 0.55));
    for (let x = -8; x <= 8; x++) for (let z = -8; z <= 8; z++) {
      const d = Math.hypot(x, z);
      if (d > r || d < r - 2.5) continue;
      if (h3(x, y, z) > 0.9) continue;
      m.solid.set(x, y, z, vary(h3(x, y + 3, z) > 0.7 ? tint(P.cypress, 0.15) : P.cypress, x, y, z, 0.1));
    }
  }
  return m;
}

export function olive(variant: number): Model {
  const m = model();
  // a gnarled, split trunk
  const [ax, az] = trunk(m, 18, 2, 4, -2, 0x6b5a4a);
  for (const [bx, bz] of [[-7, 3], [6, 5], [2, -7]]) for (let k = 0; k < 12; k++) {
    const x = ax + Math.round((bx * k) / 12), z = az + Math.round((bz * k) / 12);
    m.solid.set(x, 16 + Math.round(k * 0.7), z, 0x6b5a4a);
  }
  const lobes = [[-6, 0, 3], [6, 2, 4], [1, 4, -6], [0, 6, 0]];
  for (let i = 0; i < lobes.length - (variant % 2); i++) {
    const [lx, ly, lz] = lobes[i];
    crown(m, ax + lx, 26 + ly, az + lz, 10, 7, 9, [P.olive, P.oliveDark, P.olive], 0.7, 3);
  }
  return m;
}

export function fig(variant: number): Model {
  const m = model();
  trunk(m, 12, 1.6, variant % 2 ? 2 : -2, 1, 0x8a8478);
  crown(m, 0, 20, 0, 13, 8, 12, [0x4f7d32, 0x5f8f3a, 0x46702c], 0.8, 3);
  // ripe figs, purple-brown, here and there under the crown
  for (let i = 0; i < 14; i++) {
    const x = Math.round((h3(i, 1, variant) - 0.5) * 22), z = Math.round((h3(i, 2, variant) - 0.5) * 20);
    m.solid.set(x, 14 + Math.round(h3(i, 3, variant) * 3), z, 0x5a3048);
  }
  return m;
}

export function oleander(variant: number): Model {
  const m = model();
  const flower = variant % 2 ? 0xe86a9a : P.flowerWhite;
  for (let x = -7; x <= 7; x++) for (let y = 0; y <= 12; y++) for (let z = -6; z <= 6; z++) {
    const d = (x * x) / 49 + ((y - 6) ** 2) / 49 + (z * z) / 36;
    if (d > 1 || h3(x, y, z) > 0.75) continue;
    const top = y > 6 && h3(x, y + 5, z) > 0.8;
    m.solid.set(x, y, z, top ? vary(flower, x, y, z, 0.06) : vary(0x4e7a3a, x, y, z, 0.1));
  }
  return m;
}

/** A clump of grass or reeds: a few blades. */
export function tuft(variant: number): Model {
  const m = model();
  for (let i = 0; i < 7; i++) {
    const x = Math.round((h3(i, variant, 1) - 0.5) * 4), z = Math.round((h3(i, variant, 2) - 0.5) * 4);
    const h = 2 + Math.floor(h3(i, variant, 3) * 3);
    for (let y = 0; y < h; y++) m.solid.set(x, y, z, vary(y === h - 1 ? P.grassDry : P.grass, x, y, z, 0.1));
  }
  return m;
}

/** A pergola of vines over posts: `len` long (x), `wd` wide (z), 2.4 m high; golden-rust October leaves and grapes. */
export function pergola(len: number, wd: number, variant: number): Model {
  const m = model();
  const H = 19;
  for (const px of [0, len - 1]) for (const pz of [0, wd - 1]) for (let y = 0; y < H; y++) m.solid.set(px, y, pz, vary(P.wood, px, y, pz, 0.06));
  for (let x = 0; x < len; x++) for (const pz of [0, wd - 1]) m.solid.set(x, H, pz, P.woodDark);
  for (let z = 0; z < wd; z += 4) for (let x = 0; x < len; x++) m.solid.set(x, H, z, P.wood);
  for (let x = -1; x <= len; x++) for (let z = -1; z <= wd; z++) for (let y = H + 1; y <= H + 2; y++) {
    if (h3(x, y, z + variant) > 0.72) continue;
    const r = h3(x + 3, y, z);
    const c = r < 0.45 ? P.vine : r < 0.75 ? P.vineGold : P.vineRust;
    m.solid.set(x, y, z, vary(c, x, y, z, 0.1));
  }
  // grapes hanging under the leaves
  for (let i = 0; i < Math.floor((len * wd) / 40); i++) {
    const x = Math.floor(h3(i, 7, variant) * len), z = 1 + Math.floor(h3(i, 8, variant) * (wd - 2));
    for (let k = 0; k < 3; k++) m.solid.set(x, H - k, z, k === 2 ? tint(P.grape, -0.1) : P.grape);
  }
  // the vine's own trunks twisting up the posts
  for (const pz of [0, wd - 1]) for (let y = 0; y < H; y++) m.solid.set(1, y, pz + (pz ? -1 : 1), vary(0x5a4030, 1, y, pz, 0.1));
  return m;
}
