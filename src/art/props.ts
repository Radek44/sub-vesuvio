/**
 * Street furniture and things in Pompeii, as voxel models at 1/8 m (+z is the front). Pure.
 *
 * - Public fountain: four slabs of lava forming a square basin, a pillar on one side with a carved head
 *   whose mouth is the spout (Pompeii had about forty, at street corners, fed from the water towers).
 * - Water tower (castellum secundarium): a tall pillar of brick and rubble with a lead tank on top that
 *   steadies the pressure; lead pipes run down its side and along the pavement.
 * - Amphorae (wine, garum, oil), in racks and leaning on walls; dolia (big storage jars).
 * - Thermopolium counter: masonry with a marble top, dolia set into it, a painted front.
 * - Bakery: hourglass lava mills turned by donkeys, a domed oven.
 * - Lararium: the household shrine, a niche with painted serpents and a lamp.
 */
import { model, type Model } from 'ymir/voxel';
import { P, h3, incertum, mixc, quadratum, roofTile, tint, vary } from './palette';

const set = (m: Model, x: number, y: number, z: number, c: number, glow = false) => (glow ? m.glow : m.solid).set(x, y, z, c);

/** A fountain basin ~1.4 m square and 0.8 m high; the spout pillar at the back (−z). Its water level is y = 5 (model space). */
export function fountain(): Model {
  const m = model();
  const S = 11, H = 6;
  for (let x = 0; x < S; x++) for (let z = 0; z < S; z++) {
    const rim = x === 0 || z === 0 || x === S - 1 || z === S - 1;
    for (let y = 0; y < (rim ? H : 1); y++) {
      // four slabs: each side its own shade, clamped at the corners with iron
      const side = x === 0 ? 0 : x === S - 1 ? 1 : z === 0 ? 2 : 3;
      const corner = (x === 0 || x === S - 1) && (z === 0 || z === S - 1) && y === H - 1;
      set(m, x, y, z, corner ? P.iron : vary(tint(P.basalt, side * 0.03 + (y === H - 1 ? 0.12 : 0)), x, y, z, 0.05));
    }
  }
  // the spout pillar with its carved head
  for (let x = 3; x <= 7; x++) for (let z = -3; z <= -1; z++) for (let y = 0; y < 13; y++) set(m, x, y, z, vary(P.basalt, x, y, z, 0.05));
  for (let x = 4; x <= 6; x++) for (let y = 8; y <= 11; y++) set(m, x, y, 0, vary(P.basaltLight, x, y, 0, 0.06)); // the face in relief
  set(m, 4, 10, 1, P.basaltDark); set(m, 6, 10, 1, P.basaltDark); // eyes
  set(m, 5, 8, 1, P.bronze); // the mouth's bronze pipe
  // a worn groove on the rim where a thousand hands leaned to drink
  return m;
}

/** A water tower: 1.2 m square, `h` voxels tall, with a lead tank on top and pipes down its face. */
export function waterTower(h = 48): Model {
  const m = model();
  for (let x = 0; x < 10; x++) for (let z = 0; z < 10; z++) for (let y = 0; y < h; y++) {
    const face = x === 0 || z === 0 || x === 9 || z === 9;
    if (!face && y < h - 1) continue;
    // brick courses at the corners, rubble between
    const corner = (x < 2 || x > 7) && (z < 2 || z > 7);
    set(m, x, y, z, corner ? quadratum(x + z, y, 3, 2, P.brick) : incertum(x * 3 + z, y, 5));
  }
  // the lead tank, with a lid
  for (let x = -1; x <= 10; x++) for (let z = -1; z <= 10; z++) for (let y = h; y < h + 5; y++) {
    const face = x === -1 || z === -1 || x === 10 || z === 10 || y === h;
    if (face) set(m, x, y, z, vary(P.lead, x, y, z, 0.04));
  }
  // pipes down the front
  for (const px of [3, 6]) for (let y = 0; y < h; y++) set(m, px, y, 10, vary(P.lead, px, y, 10, 0.05));
  return m;
}

/** A wine amphora (Dressel 2-4 shape), about 1 m tall, standing on its point in sand or leant in a rack. */
export function amphora(variant = 0): Model {
  const m = model();
  const c = [P.amphora, mixc(P.amphora, P.terracotta, 0.5), 0xc9905c][variant % 3];
  const profile = [0.5, 0.8, 1.2, 1.7, 2.2, 2.6, 2.8, 2.9, 2.9, 2.8, 2.6, 2.3, 1.6, 1.0, 0.9, 0.9, 1.3];
  profile.forEach((r, y) => {
    for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) if (x * x + z * z <= r * r + 0.3) set(m, x, y, z, vary(c, x, y, z, 0.06));
  });
  // the two handles
  for (const s of [-1, 1]) { set(m, 2 * s, 14, 0, c); set(m, 2 * s, 13, 0, c); set(m, 2 * s, 12, 0, c); }
  return m;
}

/** A thermopolium counter, L-shaped, `len` voxels along the street: masonry, painted front, marble top with dolia. */
export function counter(len = 26): Model {
  const m = model();
  for (let x = 0; x < len; x++) for (let z = 0; z < 6; z++) for (let y = 0; y < 8; y++) {
    const front = z === 5;
    if (y === 7) {
      // marble top with three round mouths of dolia
      const hole = [6, 13, 20].some((hx) => (x - hx) ** 2 + (z - 2.5) ** 2 < 4);
      set(m, x, y, z, hole ? 0x2a1d14 : vary(P.marble, x, y, z, 0.04));
      continue;
    }
    if (!front) { set(m, x, y, z, vary(P.mortar, x, y, z, 0.05)); continue; }
    // painted front: red field, a yellow border, and polychrome marble chips set in it
    const border = y === 0 || y === 6 || x === 0 || x === len - 1;
    const chip = !border && h3(x, y, 3) > 0.86;
    set(m, x, y, z, border ? P.yellow : chip ? [P.marble, 0x6b8a6a, 0xc9a070][Math.floor(h3(x, y, 4) * 3)] : vary(P.red, x, y, z, 0.05));
  }
  // the short arm of the L, with a little hearth at its end (the steaming pot sits on it)
  for (let x = len - 6; x < len; x++) for (let z = -8; z < 0; z++) for (let y = 0; y < 8; y++) set(m, x, y, z, y === 7 ? vary(P.marble, x, y, z, 0.04) : vary(P.mortar, x, y, z, 0.05));
  for (let x = len - 5; x < len - 1; x++) for (let z = -7; z < -3; z++) set(m, x, 8, z, vary(0x3a302a, x, 8, z, 0.08));
  // a bronze pot on the hearth
  for (let x = len - 4; x <= len - 2; x++) for (let z = -6; z <= -4; z++) for (let y = 9; y <= 11; y++) set(m, x, y, z, vary(P.bronze, x, y, z, 0.06));
  set(m, len - 4, 8, -3, P.glowFire, true); set(m, len - 2, 8, -3, P.glowFire, true);
  return m;
}

/** A lava mill: the conical meta below, the hourglass catillus on it, a wooden frame for the donkey. */
export function mill(): Model {
  const m = model();
  for (let y = 0; y < 3; y++) for (let x = -6; x <= 6; x++) for (let z = -6; z <= 6; z++) if (x * x + z * z <= 36) set(m, x, y, z, vary(y === 2 ? P.basaltLight : P.basalt, x, y, z, 0.05)); // base
  for (let y = 3; y < 17; y++) {
    const t = (y - 3) / 13;
    const r = 2 + 3.3 * Math.abs(t - 0.5) * 2 * 0.85 + 0.4;
    for (let x = -6; x <= 6; x++) for (let z = -6; z <= 6; z++) if (x * x + z * z <= r * r) set(m, x, y, z, vary(P.lava, x, y, z, 0.07));
  }
  for (const s of [-1, 1]) for (let k = 0; k < 7; k++) set(m, s * (4 + k), 10, 0, P.wood); // the arms the donkey pushes
  return m;
}

/** A bread oven: a dome of brick on a masonry base, its mouth glowing. +z is the mouth. */
export function oven(): Model {
  const m = model();
  for (let x = -10; x <= 10; x++) for (let z = -10; z <= 8; z++) for (let y = 0; y < 8; y++) set(m, x, y, z, vary(P.mortar, x, y, z, 0.05));
  for (let x = -9; x <= 9; x++) for (let z = -9; z <= 7; z++) for (let y = 8; y < 18; y++) {
    const d = (x * x) / 81 + ((y - 8) ** 2) / 100 + ((z + 1) ** 2) / 72;
    if (d > 1 || d < 0.6) continue;
    set(m, x, y, z, quadratum(x + z, y, 3, 2, P.brick));
  }
  for (let x = -3; x <= 3; x++) for (let y = 8; y <= 12; y++) { m.solid.delete(x, y, 8); m.solid.delete(x, y, 7); set(m, x, y, 6, y < 11 ? P.glowFire : 0x3a2418, y < 11); }
  // a chimney stub at the back
  for (let y = 16; y < 24; y++) for (let x = -1; x <= 1; x++) for (let z = -8; z <= -6; z++) set(m, x, y, z, quadratum(x, y, 3, 2, P.brick));
  return m;
}

/** A lararium: a painted niche with an aedicula roof, the household gods and two serpents, a lamp. Flat against a wall (+z out). */
export function lararium(): Model {
  const m = model();
  for (let x = 0; x < 12; x++) for (let y = 0; y < 16; y++) {
    const niche = x > 2 && x < 9 && y > 4 && y < 12;
    set(m, x, y, 0, niche ? vary(0xc96a40, x, y, 0, 0.05) : vary(P.plasterWhite, x, y, 0, 0.04));
    // serpents winding across the lower panel
    if (y < 4 && Math.abs(y - 2 - Math.round(Math.sin(x * 0.9) * 1.4)) < 1) set(m, x, y, 1, 0x4f7a3a);
  }
  for (let x = 1; x < 11; x++) set(m, x, 12, 1, P.moulding); // the ledge
  for (let x = 2; x < 10; x++) set(m, x, 13 + (Math.abs(x - 5.5) < 2 ? 1 : 0), 1, P.tile); // the little pediment
  set(m, 5, 5, 1, P.glowLamp, true); // the lamp
  return m;
}

/** A dolium, the big storage jar, half sunk. */
export function dolium(): Model {
  const m = model();
  for (let y = 0; y < 9; y++) {
    const r = 3.5 + Math.sin((y / 9) * Math.PI) * 1.5;
    for (let x = -5; x <= 5; x++) for (let z = -5; z <= 5; z++) if (x * x + z * z <= r * r && (y < 8 || x * x + z * z > (r - 1.2) ** 2)) set(m, x, y, z, vary(P.dolium, x, y, z, 0.06));
  }
  return m;
}

/** A plain wooden bench or table: `len` long. */
export function bench(len = 12, table = false): Model {
  const m = model();
  const H = table ? 6 : 4, D = table ? 6 : 3;
  for (let x = 0; x < len; x++) for (let z = 0; z < D; z++) set(m, x, H, z, vary(P.woodLight, x, H, z, 0.06));
  for (const lx of [0, len - 1]) for (const lz of [0, D - 1]) for (let y = 0; y < H; y++) set(m, lx, y, lz, P.wood);
  return m;
}

/** A crate of something for sale: grapes, figs, fish on ice of seaweed, bread. */
export function crate(kind: 'grapes' | 'figs' | 'fish' | 'bread'): Model {
  const m = model();
  for (let x = 0; x < 6; x++) for (let z = 0; z < 5; z++) for (let y = 0; y < 3; y++) {
    const side = x === 0 || z === 0 || x === 5 || z === 4 || y === 0;
    if (side) set(m, x, y, z, vary(P.woodLight, x, y, z, 0.07));
  }
  const fill = { grapes: P.grape, figs: 0x6a3a52, fish: 0xb8c4cc, bread: 0xc89050 }[kind];
  for (let x = 1; x < 5; x++) for (let z = 1; z < 4; z++) set(m, x, 3, z, vary(fill, x, 3, z, 0.12));
  return m;
}

/**
 * A merchant ship (corbita) of the kind that sailed Massilia–Puteoli: a broad hull tarred black with a
 * painted strake, a swan-neck sternpost, a forward-raking foremast (artemon) and a mainmast with its sail
 * brailed up to the yard, a deckhouse aft and two steering oars. About 14 m long; lies along z, bow to −z.
 */
export function ship(): Model {
  const m = model();
  const L = 112, B = 34, H = 18;
  for (let z = -L / 2; z < L / 2; z++) {
    const t = (z + L / 2) / L; // 0 bow … 1 stern
    // the hull's half-width: full amidships, fining to bow and stern
    const half = (B / 2) * Math.min(1, Math.sin(Math.PI * Math.min(0.98, t * 0.92 + 0.04)) * 1.25);
    for (let y = 0; y <= H; y++) {
      // the sides flare out from the keel
      const w = half * (0.35 + 0.65 * Math.min(1, y / (H * 0.6)));
      for (let x = -Math.ceil(w); x <= Math.ceil(w); x++) {
        const side = Math.abs(x) >= Math.floor(w) - 0.5;
        const deck = y === H - 2;
        if (!side && !deck) continue;
        let c: number = 0x2a2220; // tar
        if (y >= H - 4 && side) c = 0xa8342a; // the painted wale
        if (y === H - 5 && side) c = 0xd9a648;
        if (deck) c = vary(0x9a7a52, x, y, z, 0.06);
        if (side && y < H - 4) c = vary(((y >> 1) & 1) ? 0x2a2220 : 0x352a26, x, y, z, 0.05); // planks
        if (y > H - 2 && side) c = 0x5a3a24; // the rail
        m.solid.set(x, y, z, c);
      }
    }
  }
  // the swan-neck sternpost, curling up and forward
  for (let k = 0; k < 22; k++) {
    const a = (k / 22) * Math.PI * 0.9;
    const z = L / 2 - 2 + Math.round(Math.sin(a) * 6), y = H + Math.round((1 - Math.cos(a)) * 10);
    for (const dx of [-1, 0]) m.solid.set(dx, y, z, k > 18 ? 0xe8dcc0 : 0x5a3a24);
  }
  // the cutwater at the bow
  for (let k = 0; k < 8; k++) for (const dx of [-1, 0]) m.solid.set(dx, H - 2 + Math.round(k * 0.5), -L / 2 - k, 0x2a2220);
  // masts: the mainmast amidships, the artemon raking over the bow
  for (let y = H; y < H + 70; y++) for (const dx of [-1, 0]) for (const dz of [-1, 0]) m.solid.set(dx, y, dz, 0x6a4a2c);
  for (let k = 0; k < 30; k++) for (const dx of [-1, 0]) m.solid.set(dx, H + Math.round(k * 0.8), -L / 2 + 10 - Math.round(k * 0.6), 0x6a4a2c);
  // the yard with the sail brailed up under it, in cream linen with brail lines
  for (let x = -26; x <= 26; x++) for (let y = H + 60; y <= H + 64; y++) {
    const yard = y === H + 64;
    m.solid.set(x, y, 1, yard ? 0x5a3a24 : vary(x % 6 === 0 ? 0xc9bb9a : 0xeee2c8, x, y, 1, 0.05));
  }
  // rigging: stays from masthead to bow and stern
  for (let k = 0; k < 40; k++) {
    m.solid.set(0, H + 69 - Math.round(k * 1.3), -Math.round(k * 1.3), 0x3a2e24);
    m.solid.set(0, H + 69 - Math.round(k * 1.3), Math.round(k * 1.25), 0x3a2e24);
  }
  // the deckhouse aft, with a tiled roof
  for (let x = -8; x <= 7; x++) for (let z = 30; z <= 44; z++) for (let y = H - 1; y <= H + 9; y++) {
    const wall = x === -8 || x === 7 || z === 30 || z === 44;
    if (y === H + 9) m.solid.set(x, y, z, roofTile(x + 8, z));
    else if (wall) m.solid.set(x, y, z, y === H + 4 && (z === 30) && Math.abs(x) < 3 ? 0x2a1d14 : vary(0x8a6a44, x, y, z, 0.06));
  }
  // the two steering oars at the quarters
  for (const s of [-1, 1]) for (let k = 0; k < 24; k++) m.solid.set(s * (B / 2 + 1), H - Math.round(k * 0.9), 38 + Math.round(k * 0.25), 0x6a4a2c);
  // amphorae stowed on deck
  for (let i = 0; i < 10; i++) {
    const x = -10 + (i % 5) * 5, z = -16 + Math.floor(i / 5) * 6;
    for (let dx = 0; dx < 2; dx++) for (let y = H - 1; y < H + 2; y++) m.solid.set(x + dx, y, z, vary(0xc2794a, x, y, z, 0.08));
  }
  return m;
}
