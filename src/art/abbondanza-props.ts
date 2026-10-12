/**
 * Things on Via dell'Abbondanza, as voxel models at 1/8 m (+z is the front). Pure. Each comes from what the
 * street's excavations and Pompeian paintings show:
 *
 * - The donkey: the small grey ass that turned bakery mills and carried panniers through town (the
 *   stable of the bakery in the House of the Chaste Lovers, IX 12, still held its animals' skeletons).
 * - The cart (plaustrum): a heavy two-wheeled box on solid or spoked wheels, the vehicle that cut the
 *   ruts in the paving. One stands broken at the end of the street, a wheel off.
 * - The fuller's press: the screw press (pressa) that flattened finished cloth; a wall painting from the
 *   fullonica of L. Veranius Hypsaeus (VI 8, 20) shows one, and the one in the fullonica of Stephanus
 *   (I 6, 7) has been rebuilt where it stood, in the front room.
 * - The forge: a masonry hearth with glowing charcoal, a bellows and an iron anvil on a block.
 * - Shelves: lamps (lucernae) in rows, red-slip bowls and jugs, sandals on pegs.
 * - The statue of M. Holconius Rufus in a general's cuirass, as found by the four-way arch.
 * - Roadworks: lead pipes, lifted paving, trestles to keep the carts out.
 */
import { model, type Model } from 'ymir/voxel';
import { P, h3, mixc, tint, vary } from './palette';

const set = (m: Model, x: number, y: number, z: number, c: number, glow = false) => (glow ? m.glow : m.solid).set(x, y, z, c);
const fillM = (m: Model, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: (x: number, y: number, z: number) => number | null) => {
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) {
    const v = c(x, y, z);
    if (v !== null) m.solid.set(x, y, z, v);
  }
};

/** A donkey, about 1.1 m at the withers, standing along z (its head at +z). `panniers` hang baskets either side. */
export function donkey(panniers = false, variant = 0): Model {
  const m = model();
  const coat = [0x8a8278, 0x6e655c, 0x9a8a74][variant % 3];
  const belly = tint(coat, 0.25), dark = tint(coat, -0.35);
  // four legs, darker toward the hooves
  for (const lx of [-2, 1]) for (const lz of [-5, 3]) for (let y = 0; y < 6; y++) for (let dx = 0; dx <= 1; dx++) set(m, lx + dx, y, lz, y === 0 ? 0x2a2420 : y < 2 ? dark : vary(coat, lx, y, lz, 0.05));
  // the barrel of the body
  fillM(m, -2, 6, -6, 2, 10, 4, (x, y, z) => ((Math.abs(x) === 2 && (y === 6 || y === 10)) || (z === -6 && (y === 10)) ? null : y === 6 ? belly : vary(coat, x, y, z, 0.05)));
  // a dark stripe along the back and the cross over the shoulders, as on every donkey
  for (let z = -6; z <= 4; z++) set(m, 0, 11, z, dark);
  for (let x = -2; x <= 2; x++) set(m, x, 11, 2, dark);
  // the neck and the long head, a pale muzzle
  fillM(m, -1, 10, 4, 1, 13, 6, (x, y, z) => vary(coat, x, y, z, 0.05));
  fillM(m, -1, 11, 7, 1, 14, 10, (x, y, z) => (z >= 9 && y <= 12 ? 0xd8d0c4 : vary(coat, x, y, z, 0.05)));
  set(m, -1, 11, 10, 0x2a2420); set(m, 1, 11, 10, 0x2a2420); // nostrils
  set(m, -2, 13, 8, 0x1a1410); set(m, 2, 13, 8, 0x1a1410); // eyes
  // the ears: long, up and a little back
  for (const ex of [-1, 1]) for (let y = 15; y <= 18; y++) { set(m, ex, y, 7, coat); set(m, ex, y, 6, y > 16 ? dark : belly); }
  // a short tail with a tuft
  for (let y = 5; y <= 9; y++) set(m, 0, y, -7, y < 7 ? dark : coat);
  // a halter rope
  for (let x = -2; x <= 2; x++) set(m, x, 12, 8, 0xb89a5a);
  if (panniers) for (const s of [-1, 1]) {
    fillM(m, s * 3, 5, -4, s * 5, 10, 2, (x, y, z) => ((x + y + z) & 1 ? 0xa8844a : 0x8a6a3a));
    for (let x = -2; x <= 2; x++) set(m, x, 11, -1, 0x7a5a3a); // the strap over the back
    for (let z = -3; z <= 1; z++) set(m, s * 4, 11, z, s < 0 ? P.amphora : 0xc89050); // jars and loaves peeping out
  }
  return m;
}

/** A spoked wheel in the yz plane at x, radius `r`, centred at (y, z). */
function wheel(m: Model, x: number, cy: number, cz: number, r: number, flat = false): void {
  for (let a = 0; a < 72; a++) {
    const t = (a / 72) * Math.PI * 2;
    for (const rr of [r, r - 0.7]) {
      const u = Math.round(Math.cos(t) * rr), v = Math.round(Math.sin(t) * rr);
      if (flat) set(m, x + u, cy, cz + v, vary(P.woodDark, u, 0, v, 0.06));
      else set(m, x, cy + v, cz + u, vary(P.woodDark, x, v, u, 0.06));
    }
  }
  for (let k = -r + 1; k < r; k++) for (const [du, dv] of [[k, 0], [0, k]] as const) {
    if (flat) set(m, x + du, cy, cz + dv, P.wood);
    else set(m, x, cy + dv, cz + du, P.wood);
  }
  // the iron tyre's nails
  if (!flat) for (let a = 0; a < 8; a++) set(m, x + (x > 0 ? 1 : -1), cy + Math.round(Math.sin(a * 0.785) * r), cz + Math.round(Math.cos(a * 0.785) * r), P.iron);
}

/**
 * A two-wheeled cart, its shafts toward +z. `load`: what's in it (amphorae, firewood, pipes); `broken`
 * drops it on one side with that wheel lying in the road.
 */
export function cart(load: 'amphorae' | 'wood' | 'pipes' | 'none' = 'none', broken = false): Model {
  const m = model();
  const R = 7;
  const tilt = (x: number) => (broken ? Math.round((x + 6) * -0.5) : 0); // the left side down on its axle
  // the bed: planks on two side beams, low sides
  for (let x = -6; x <= 6; x++) for (let z = -10; z <= 8; z++) {
    const y = R + 1 + tilt(x);
    set(m, x, y, z, vary((z & 3) === 0 ? P.woodDark : P.woodLight, x, y, z, 0.06));
    if (Math.abs(x) === 6 || z === -10) for (let k = 1; k <= 3; k++) set(m, x, y + k, z, vary(P.wood, x, y + k, z, 0.06));
  }
  // the axle and the wheels
  for (let x = -8; x <= 8; x++) set(m, x, R + tilt(x), 0, P.woodDark);
  wheel(m, 8, R, 0, R);
  if (broken) wheel(m, -16, 0, 12, R, true);
  else wheel(m, -8, R, 0, R);
  // the shafts, and a yoke bar
  for (let z = 9; z <= 26; z++) for (const x of [-4, 4]) set(m, x, R + 1 - Math.round((z - 9) * (broken ? 0.4 : 0.25)), z, P.wood);
  if (!broken) for (let x = -4; x <= 4; x++) set(m, x, R - 3, 26, P.woodDark);
  const top = R + 2;
  if (load === 'amphorae') for (let i = 0; i < 8; i++) {
    const ax = -4 + (i % 3) * 4, az = -8 + Math.floor(i / 3) * 6;
    // lying in straw
    for (let k = 0; k < 5; k++) for (const dy of [0, 1]) set(m, ax, top + dy + tilt(ax), az + k, vary(P.amphora, ax, dy, az + k, 0.08));
  }
  if (load === 'wood') for (let x = -5; x <= 5; x++) for (let z = -9; z <= 7; z++) for (let y = 0; y < 5 - Math.floor(Math.abs(x) / 3); y++) {
    const log = ((x + 10) >> 1) + y * 7;
    set(m, x, top + y, z, z === -9 || z === 7 ? (h3(x, y, log) > 0.5 ? 0xc8a070 : 0xb08858) : vary(h3(log, 1, 2) > 0.5 ? 0x7a5a3a : 0x6a4a2e, x, y, z, 0.08));
  }
  if (load === 'pipes') for (let i = 0; i < 4; i++) for (let z = -9; z <= 7; z++) for (let d = 0; d < 2; d++) set(m, -4 + i * 3 + d, top + (i % 2), z, vary(P.lead, i, d, z, 0.05));
  return m;
}

/** The fuller's screw press: two posts, a beam, the wooden screw and its capstan bar, folded cloth between boards. */
export function press(): Model {
  const m = model();
  for (const px of [-7, 6]) fillM(m, px, 0, -2, px + 1, 24, 1, (x, y, z) => vary(P.wood, x, y, z, 0.06));
  fillM(m, -8, 25, -2, 8, 27, 1, (x, y, z) => vary(P.woodDark, x, y, z, 0.05)); // the top beam
  fillM(m, -6, 2, -2, 5, 3, 1, (x, y, z) => vary(P.woodLight, x, y, z, 0.05)); // the bed
  // the cloth, folded in a stack, white and saffron
  for (let y = 4; y <= 9; y++) for (let x = -5; x <= 4; x++) for (let z = -1; z <= 0; z++) set(m, x, y, z, vary(y % 3 === 0 ? 0xd9a43a : 0xf0ebe0, x, y, z, 0.04));
  fillM(m, -6, 10, -2, 5, 11, 1, (x, y, z) => vary(P.woodLight, x, y, z, 0.05)); // the pressing board
  // the screw: a spiral thread down from the beam
  for (let y = 12; y <= 24; y++) for (let a = 0; a < 4; a++) {
    const t = y * 0.9 + a * Math.PI / 2;
    set(m, Math.round(Math.cos(t) * 1.4) - 1, y, Math.round(Math.sin(t) * 1.4), a === 0 ? P.woodDark : P.wood);
  }
  for (let x = -7; x <= 5; x++) set(m, x, 18, 0, P.woodLight); // the bar you turn it with
  return m;
}

/** A forge: a waist-high masonry hearth with live charcoal, a bellows, and an iron anvil on a wooden block in front. */
export function forge(): Model {
  const m = model();
  fillM(m, -6, 0, -6, 6, 7, 2, (x, y, z) => vary(y === 7 ? P.brick : P.mortar, x, y, z, 0.06));
  for (let x = -4; x <= 4; x++) for (let z = -4; z <= 0; z++) set(m, x, 8, z, h3(x, 8, z) > 0.45 ? P.glowFire : 0x3a2418, h3(x, 8, z) > 0.45);
  // a hood and a flue above (the smoke goes up through the roof)
  fillM(m, -5, 18, -6, 5, 20, 1, (x, y, z) => vary(P.brick, x, y, z, 0.06));
  fillM(m, -2, 21, -5, 2, 30, -1, (x, y, z) => vary(P.brick, x, y, z, 0.06));
  // the bellows on the left, leather on wood
  fillM(m, -10, 3, -4, -7, 6, 0, (_x, y) => (y === 3 || y === 6 ? P.wood : 0x7a4a2a));
  // the anvil on its block, in front
  fillM(m, -1, 0, 6, 1, 4, 8, (x, y, z) => vary(P.woodDark, x, y, z, 0.05));
  fillM(m, -3, 5, 6, 3, 6, 8, (x, y, z) => vary(P.iron, x, y, z, 0.04));
  set(m, 4, 6, 7, P.iron); set(m, 5, 6, 7, P.iron); // the horn
  // a hammer lying on it, and a glowing bar
  for (let x = -2; x <= 1; x++) set(m, x, 7, 7, x === 1 ? P.glowFire : P.iron, x === 1);
  return m;
}

/** A shelf board fixed to a wall (+z out from the wall), `len` long, with things on it. */
export function shelf(len: number, what: 'lamps' | 'pots' | 'sandals' | 'bronze', variant = 0): Model {
  const m = model();
  for (let row = 0; row < 3; row++) {
    const y = row * 6;
    for (let x = 0; x < len; x++) for (let z = 0; z < 3; z++) set(m, x, y, z, vary(P.woodLight, x, y, z, 0.05));
    for (let x = 1; x < len - 1;) {
      const r = h3(x, row, variant);
      if (what === 'lamps') {
        // a little oil lamp: body, nozzle toward us, a ring handle behind
        const c = r < 0.6 ? 0xc0703e : r < 0.85 ? 0xa85a32 : P.bronze;
        set(m, x, y + 1, 1, c); set(m, x + 1, y + 1, 1, c); set(m, x, y + 1, 2, c); set(m, x + 1, y + 1, 2, c);
        set(m, x, y + 2, 1, tint(c, -0.15)); set(m, x + 1, y + 2, 1, tint(c, -0.15));
        if (r > 0.75) set(m, x, y + 2, 2, P.glowLamp, true); // one or two lit, to show they work
        x += 3;
      } else if (what === 'pots') {
        // bowls, jugs and cups in red-slip and plain ware
        const c = r < 0.5 ? 0xb0442c : r < 0.8 ? P.terracotta : 0xd9c4a0;
        const tall = r > 0.6;
        for (let dy = 1; dy <= (tall ? 4 : 2); dy++) for (let dx = 0; dx < 3; dx++) set(m, x + dx, y + dy, 1, (dy === 1 && (dx === 0 || dx === 2)) || (tall && dy === 4 && dx !== 1) ? tint(c, -0.1) : c);
        x += 4;
      } else if (what === 'sandals') {
        // pairs of soles with straps, hung on pegs (on the board's front edge)
        const c = r < 0.5 ? 0x7a4a2a : 0x5a3a22;
        for (const dx of [0, 2]) for (let dy = -3; dy <= 0; dy++) set(m, x + dx, y + dy, 3, dy === -3 || dy === 0 ? tint(c, -0.2) : c);
        x += 5;
      } else {
        // bronze vessels: a cauldron, a jug, a ladle
        const c = r < 0.5 ? P.bronze : 0x9a7a3c;
        for (let dy = 1; dy <= 3; dy++) for (let dx = 0; dx < 3; dx++) set(m, x + dx, y + dy, 1, vary(c, x + dx, dy, row, 0.08));
        if (r > 0.5) set(m, x + 1, y + 4, 1, c);
        x += 4;
      }
    }
  }
  // brackets
  for (const bx of [0, len - 1]) for (let y = -2; y < 12; y++) set(m, bx, y, 0, P.woodDark);
  return m;
}

/**
 * A marble statue of a man in a general's cuirass and cloak, on a base with a panel for the inscription.
 * About 2 m on a 1.2 m base; it faces +z.
 */
export function statue(): Model {
  const m = model();
  const marble = (x: number, y: number, z: number) => vary(P.marble, x, y, z, 0.03);
  // the base: moulded top and foot, the panel facing out
  fillM(m, -5, 0, -4, 5, 9, 4, (x, y, z) => (y === 0 || y === 9 ? vary(P.moulding, x, y, z, 0.03) : z === 4 && Math.abs(x) <= 3 && y >= 3 && y <= 7 ? (h3(x, y, 9) > 0.55 && y % 2 === 1 ? 0x6a645a : P.marble) : marble(x, y, z)));
  const y0 = 10;
  // legs, the kilt of leather strips (pteryges), the cuirass with its modelled chest, the cloak over one shoulder
  for (const lx of [-2, 1]) fillM(m, lx, y0, -1, lx + 1, y0 + 6, 0, marble);
  fillM(m, -3, y0 + 7, -2, 2, y0 + 8, 1, (x, _y, z) => ((x + z) & 1 ? tint(P.marble, -0.08) : P.marble));
  fillM(m, -3, y0 + 9, -2, 2, y0 + 14, 1, (x, y, z) => (z === 1 && y === y0 + 12 && Math.abs(x + 0.5) < 2 ? tint(P.marble, -0.1) : marble(x, y, z)));
  fillM(m, -4, y0 + 10, -3, -4, y0 + 15, 1, marble); // the cloak's fall
  // arms: the right raised in the speaker's gesture, the left holding the sword hilt
  fillM(m, 3, y0 + 12, 0, 3, y0 + 14, 3, marble);
  set(m, 3, y0 + 15, 3, P.marble);
  fillM(m, -4, y0 + 8, 0, -4, y0 + 13, 1, marble);
  // the head, a little turned
  fillM(m, -1, y0 + 15, -1, 0, y0 + 15, 0, marble);
  fillM(m, -2, y0 + 16, -2, 1, y0 + 19, 1, marble);
  set(m, -1, y0 + 18, 2, tint(P.marble, -0.12)); set(m, 0, y0 + 18, 2, tint(P.marble, -0.12));
  return m;
}

/** A trestle (sawhorse) with two planks across it: what keeps carts and people out of a trench. `len` along x. */
export function trestle(len: number): Model {
  const m = model();
  for (const lx of [1, len - 2]) for (let y = 0; y < 8; y++) for (const lz of [-1, 1]) set(m, lx, y, lz * (y < 4 ? 2 - (y >> 1) : 0), P.woodDark);
  for (let x = 0; x < len; x++) for (const y of [4, 8]) for (let z = -1; z <= 0; z++) set(m, x, y, z, vary(((x >> 2) & 1) ? P.red : P.plasterWhite, x, y, z, 0.05));
  for (let x = 0; x < len; x++) for (let y = 5; y <= 7; y++) set(m, x, y, 0, vary(P.woodLight, x, y, 0, 0.06));
  return m;
}

/** A stack of lead water pipes (fistulae), each ~10 cm across, along x, and the folded seam on top. */
export function pipeStack(len: number, rows = 3): Model {
  const m = model();
  for (let r = 0; r < rows; r++) for (let i = 0; i < rows - r; i++) {
    const z = i * 3 + r * 1.5, y = r * 2;
    for (let x = 0; x < len; x++) for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) set(m, x, y + dy, Math.round(z) + dz, vary(dy ? tint(P.lead, 0.1) : P.lead, x, y + dy, z + dz, 0.04));
  }
  return m;
}

/** Lifted paving blocks, stacked crooked by the trench. */
export function pavingPile(): Model {
  const m = model();
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(h3(i, 1, 3) * 10), z = Math.floor(h3(i, 2, 3) * 8), y = Math.floor(i / 3) * 2;
    fillM(m, x, y, z, x + 4, y + 1, z + 3, (xx, yy, zz) => vary(h3(i, 3, 3) > 0.5 ? P.basalt : P.basaltLight, xx, yy, zz, 0.07));
  }
  return m;
}

/** A pile of split firewood for the baths' furnace. */
export function woodpile(len: number): Model {
  const m = model();
  for (let x = 0; x < len; x++) for (let z = 0; z < 8; z++) for (let y = 0; y < 8 - Math.abs(z - 4); y++) {
    const log = (x >> 1) * 13 + y * 7 + (z >> 1);
    set(m, x, y, z, z === 0 || z === 7 || x === 0 || x === len - 1 ? (h3(log, 1, 1) > 0.5 ? 0xc8a070 : 0xb08858) : vary(h3(log, 2, 1) > 0.5 ? 0x7a5a3a : 0x6a4a2e, x, y, z, 0.08));
  }
  return m;
}

/** A masonry street bench (Pompeii's facades have them, for clients waiting and for idlers), plastered red. */
export function streetBench(len: number): Model {
  const m = model();
  fillM(m, 0, 0, 0, len - 1, 3, 3, (x, y, z) => (y === 3 ? vary(P.limestone, x, y, z, 0.05) : vary(P.red, x, y, z, 0.05)));
  return m;
}

/**
 * A market stall: a trestle table 14 long with its goods, and a low frame behind for hanging things.
 * Garlands (the coronarii wove them for feasts and shrines), baskets, or pots and jugs.
 */
export function stall(kind: 'garlands' | 'baskets' | 'pots', variant = 0): Model {
  const m = model();
  for (let x = 0; x < 14; x++) for (let z = 0; z < 6; z++) set(m, x, 5, z, vary(P.woodLight, x, 5, z, 0.06));
  for (const lx of [0, 13]) for (const lz of [0, 5]) for (let y = 0; y < 5; y++) set(m, lx, y, lz, P.wood);
  // the frame at the back of the table (−z side), 1.5 m high, with a bar across
  for (const lx of [0, 13]) for (let y = 6; y <= 12; y++) set(m, lx, y, 0, P.woodDark);
  for (let x = 0; x < 14; x++) set(m, x, 12, 0, P.woodDark);
  const flowers = [P.flowerRed, P.flowerWhite, P.flowerYellow, P.flowerPurple, 0xe86a9a];
  if (kind === 'garlands') {
    // garlands hung in loops from the bar, and a heap of loose flowers and leaves on the table
    for (let g = 0; g < 3; g++) for (let k = 0; k <= 4; k++) {
      const x = 1 + g * 4 + k, y = 11 - Math.round(Math.sin((k / 4) * Math.PI) * 3);
      set(m, x, y, 0, h3(x, y, g + variant) > 0.5 ? flowers[(g + k) % flowers.length]! : P.green);
    }
    for (let x = 1; x < 13; x++) for (let z = 1; z < 5; z++) if (h3(x, z, variant) > 0.3) set(m, x, 6, z, h3(x, 7, z) > 0.55 ? P.grassDeep : flowers[Math.floor(h3(z, x, 3) * flowers.length)]!);
  } else if (kind === 'baskets') {
    for (let i = 0; i < 3; i++) for (let x = 1 + i * 4; x <= 3 + i * 4; x++) for (let z = 1; z <= 4; z++) for (let y = 6; y <= 8; y++) {
      const side = x === 1 + i * 4 || x === 3 + i * 4 || z === 1 || z === 4 || y === 6;
      set(m, x, y, z, side ? ((x + y + z) & 1 ? 0xa8844a : 0x8a6a3a) : [P.grape, 0x6a3a52, 0xd9a43a][i]!);
    }
    for (let k = 0; k < 4; k++) for (let y = 8; y <= 10; y++) set(m, 2 + k * 3, y, 0, (y + k) & 1 ? 0xa8844a : 0x8a6a3a);
  } else {
    for (let x = 1; x < 13; x += 3) for (let y = 6; y <= 6 + (x % 2 ? 3 : 2); y++) for (let dx = 0; dx < 2; dx++) for (let z = 2; z <= 3; z++) set(m, x + dx, y, z, vary(x % 2 ? P.terracotta : 0xb0442c, x, y, z, 0.06));
    for (let k = 0; k < 4; k++) { set(m, 2 + k * 3, 10, 0, 0xb0442c); set(m, 2 + k * 3, 9, 0, 0xb0442c); }
  }
  return m;
}

/** A small masonry altar for the street shrine (the crossroads gods, the Lares Compitales). */
export function altar(): Model {
  const m = model();
  fillM(m, 0, 0, 0, 7, 8, 5, (x, y, z) => (y === 8 || y === 0 ? vary(P.moulding, x, y, z, 0.03) : vary(P.plasterWhite, x, y, z, 0.04)));
  // ash and a little flame of the morning's offering
  for (let x = 2; x <= 5; x++) for (let z = 1; z <= 4; z++) set(m, x, 9, z, 0x6a645e);
  set(m, 3, 10, 2, P.glowFire, true); set(m, 4, 10, 3, P.glowFire, true);
  return m;
}

/** A fuller's urine jar by the door (fullers collected it from passers-by: the ammonia cleaned wool). */
export function urineJar(): Model {
  const m = model();
  for (let y = 0; y < 6; y++) {
    const r = y < 1 ? 1.5 : y < 4 ? 2.5 : 1.6;
    for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) if (x * x + z * z <= r * r) set(m, x, y, z, y === 5 && x * x + z * z < 1.5 ? 0x8a7a30 : vary(mixc(P.amphora, 0x8a6a4a, 0.3), x, y, z, 0.06));
  }
  return m;
}

// ── Letters: painted capitals for shop signs and election notices, 3×5 voxels each ──

const GLYPHS: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', L: '100100100100111',
  M: '101111111101101', N: '101111111111101', O: '010101101101010', P: '110101110100100', Q: '010101101110011',
  R: '110101110101101', S: '011100010001110', T: '111010010010010', V: '101101101101010', X: '101101010101101',
  ' ': '000000000000000', '·': '000000010000000',
};

/** Width of a painted text in voxels (3 per letter, 1 between). */
export const textWidth = (s: string): number => s.length * 4 - 1;

/** Call `put(u, v)` for every voxel of the text's letters (u from 0 to the right, v from 0 at the bottom). */
export function letters(s: string, put: (u: number, v: number) => void): void {
  [...s].forEach((ch, i) => {
    const g = GLYPHS[ch] ?? GLYPHS[' ']!;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r * 3 + c] === '1') put(i * 4 + c, 4 - r);
  });
}
