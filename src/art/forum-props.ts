/**
 * The Forum's things, as voxel models at 1/8 m (+z is the front). Pure.
 *
 * - Statue bases and statues: the Forum was crowded with honorific statues of the town's notables and the
 *   imperial family, standing (in a toga) or on horseback, on tall bases with an inscription on the front.
 *   The bases survive along the west side and at the south end; the bronzes were salvaged in antiquity.
 * - Apollo and Diana as archers, in bronze, facing each other across Apollo's courtyard (the originals are
 *   in the Naples museum; casts stand in the sanctuary today).
 * - The mensa ponderaria: the town's official measures, a limestone table with bowl-shaped hollows of
 *   different sizes, each with a hole in its floor (plugged while measuring) to let the grain or oil out.
 * - A sundial on an Ionic column, as in the Apollo sanctuary: a marble block hollowed into a bowl with the
 *   hour lines cut in it, and a bronze pin.
 * - An altar with a relief of a sacrifice: a bull led to the altar, as on the altar in the Temple of
 *   Vespasian's court.
 * - Market stalls: trestle tables under cloth awnings, as on the frieze of the Forum market from the
 *   Praedia of Julia Felix (cobblers, cloth and metal sellers, bread, fruit, all under the colonnade).
 * - A money changer's table: a bronze balance, stacks of coins, a strongbox.
 */
import { model, type Model } from 'ymir/voxel';
import { P, h3, mixc, quadratum, tint, vary } from './palette';

const set = (m: Model, x: number, y: number, z: number, c: number, glow = false) => (glow ? m.glow : m.solid).set(x, y, z, c);
const box = (m: Model, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: (x: number, y: number, z: number) => number | null) => {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
    const v = c(x, y, z);
    if (v !== null) set(m, x, y, z, v);
  }
};

/** Bronze as it looked new: warm brown with a polished sheen, a little patina in the folds. */
export const BRONZE = [0x8a6a34, 0x9a7a40, 0x7a5a2c, 0x6f6a4a];
const bronze = (x: number, y: number, z: number) => vary(BRONZE[Math.floor(h3(x, y, z + 9) * 3.2) % 4], x, y, z, 0.08);
const marble = (x: number, y: number, z: number) => vary(P.marble, x, y, z, 0.04);

/**
 * A statue base, `w` wide (x), `h` high, `d` deep: a moulded plinth and cornice of white stone, the die
 * between them stuccoed, an inscription panel on the front (+z). The pivot is its front-left-bottom corner.
 */
export function statueBase(w: number, h: number, d: number, seed = 0): Model {
  const m = model();
  for (let x = -1; x <= w; x++) for (let z = -1; z <= d; z++) for (let y = 0; y < h; y++) {
    const outer = x < 0 || x >= w || z < 0 || z >= d;
    const mould = y < 2 || y >= h - 2;
    if (outer && !mould) continue;
    set(m, x, y, z, mould ? vary(P.moulding, x, y, z, 0.03) : vary(mixc(P.marble, P.limestone, 0.3), x, y, z, 0.04));
  }
  // the inscription: lines of carved letters, finely cut, picked out in faded red
  for (let x = 2; x <= w - 3; x++) for (let y = h - 6; y >= 4 && y >= h - 9; y--) {
    if ((h - 6 - y) % 2 === 1) continue;
    if (h3(x, y, seed) > 0.5 && x % 3 !== 0) set(m, x, y, d - 1, y === h - 6 ? 0x8a5a48 : 0x7a7064);
  }
  return m;
}

/** A standing figure in a toga (a magistrate, a benefactor), marble or bronze, about 2.2 m. Pivot: between the feet. */
export function togatus(variant = 0): Model {
  const m = model();
  const mat = variant % 2 ? bronze : marble;
  // the toga falls to the feet, its folds running diagonally from the left shoulder
  for (let y = 0; y <= 11; y++) {
    const half = y < 2 ? 2 : y < 9 ? 2 : 3;
    for (let x = -half; x <= half; x++) for (let z = -1; z <= 1; z++) {
      const fold = ((x + y + 20) % 3 === 0 && z === 1) ? -0.12 : 0;
      set(m, x, y, z, tint(mat(x, y, z), fold));
    }
  }
  for (const x of [-1, 1]) set(m, x, 0, 2, mat(x, 0, 2)); // the toes
  // the right arm raised in the gesture of address; the left holds a scroll in the toga's fold
  for (let k = 0; k < 4; k++) set(m, 3 + Math.min(k, 1), 9 + Math.min(k, 1), 1 + k, mat(3, 9 + k, 1));
  set(m, -3, 6, 2, P.moulding);
  // neck and head (the head of a real man: these were portraits)
  set(m, 0, 12, 0, mat(0, 12, 0));
  for (let x = -1; x <= 1; x++) for (let y = 13; y <= 15; y++) for (let z = -1; z <= 1; z++) set(m, x, y, z, mat(x, y, z));
  set(m, 0, 14, 2, tint(mat(0, 14, 2), -0.1)); // the nose
  if (variant % 2 === 0) for (const x of [-1, 1]) set(m, x, 14, 2, 0x4a3a30); // painted eyes on marble
  return m;
}

/** A rider on horseback in bronze, the horse stepping forward with a foreleg raised. The horse runs along +x. */
export function equestrian(variant = 0): Model {
  const m = model();
  // the body: a barrel, rounded at the corners
  for (let x = -6; x <= 6; x++) for (let y = 8; y <= 13; y++) for (let z = -2; z <= 2; z++) {
    if ((Math.abs(x) === 6 || y === 8 || y === 13) && Math.abs(z) === 2) continue;
    set(m, x, y, z, bronze(x, y, z));
  }
  // legs: three planted, the near foreleg raised and bent
  for (const [lx, lz] of [[-5, -1], [-5, 1], [5, -1]] as const) for (let y = 0; y < 8; y++) set(m, lx, y, lz, bronze(lx, y, lz));
  for (let y = 4; y < 8; y++) set(m, 5, y, 1, bronze(5, y, 1));
  set(m, 6, 4, 1, bronze(6, 4, 1)); set(m, 7, 4, 1, bronze(7, 4, 1)); set(m, 7, 3, 1, bronze(7, 3, 1));
  // neck and head, the head bowed a little, the ears up
  for (let k = 0; k < 5; k++) for (let z = -1; z <= 1; z++) for (let y = 0; y < 3; y++) set(m, 6 + Math.floor(k * 0.6), 12 + k + y, z, bronze(6 + k, 12 + k + y, z));
  for (let x = 9; x <= 11; x++) for (let y = 15; y <= 17; y++) for (let z = -1; z <= 1; z++) if (!(x === 11 && y === 17)) set(m, x, y, z, bronze(x, y, z));
  set(m, 9, 18, -1, bronze(9, 18, -1)); set(m, 9, 18, 1, bronze(9, 18, 1));
  // mane and tail
  for (let k = 0; k < 5; k++) set(m, 6 + Math.floor(k * 0.6), 15 + k, 0, tint(bronze(6, 15 + k, 0), -0.15));
  for (let y = 7; y <= 12; y++) set(m, -7 - (y < 9 ? 1 : 0), y, 0, tint(bronze(-7, y, 0), -0.12));
  // the rider: legs down the horse's sides, a cuirass or a tunic, a cloak behind, the right arm raised
  for (const z of [-3, 3]) for (let y = 9; y <= 13; y++) set(m, 0, y, z, bronze(0, y, z));
  for (let x = -1; x <= 1; x++) for (let y = 14; y <= 19; y++) for (let z = -2; z <= 2; z++) if (Math.abs(z) < 2 || y < 18) set(m, x, y, z, bronze(x, y, z));
  for (let y = 13; y <= 18; y++) for (let z = -2; z <= 2; z++) set(m, -2, y, z, tint(bronze(-2, y, z), -0.1)); // the cloak
  for (let k = 0; k < 4; k++) set(m, 2 + k, 18 + Math.min(k, 2), 2, bronze(2 + k, 18, 2));
  for (let x = -1; x <= 1; x++) for (let y = 20; y <= 22; y++) for (let z = -1; z <= 1; z++) set(m, x, y, z, bronze(x, y, z));
  if (variant % 2) for (let x = -1; x <= 1; x++) set(m, x, 23, 0, 0xc9a050); // a gilded wreath
  return m;
}

/** Apollo (or his sister Diana) as an archer in bronze, the bow held out in the left hand. Faces +z. */
export function archer(sister = false): Model {
  const m = model();
  // legs apart in the stride, a short chiton for Diana, bare for Apollo
  for (let y = 0; y <= 6; y++) for (const x of [-2, -1, 1, 2]) if (y > 4 || Math.abs(x) === (y < 3 ? 2 : 1) || (sister && y > 3)) set(m, x, y, 0, bronze(x, y, 0));
  for (let x = -2; x <= 2; x++) for (let y = 7; y <= 12; y++) for (let z = -1; z <= 0; z++) set(m, x, y, z, bronze(x, y, z));
  if (sister) for (let x = -3; x <= 3; x++) for (let z = -1; z <= 1; z++) set(m, x, 5 + (x & 1), z, tint(bronze(x, 5, z), -0.08));
  // arms out: the left holds the bow at arm's length, the right drawn back to the shoulder
  for (let k = 0; k < 5; k++) set(m, -3 - k, 11, 0, bronze(-3 - k, 11, 0));
  for (let y = 7; y <= 15; y++) set(m, -8, y, 1 - Math.round(Math.abs(y - 11) * 0.3), tint(P.bronze, -0.25));
  for (let k = 0; k < 3; k++) set(m, 3 + k, 11, 0, bronze(3 + k, 11, 0));
  // the head, hair tied up
  for (let x = -1; x <= 1; x++) for (let y = 13; y <= 15; y++) for (let z = -1; z <= 1; z++) set(m, x, y, z, bronze(x, y, z));
  set(m, 0, 16, -1, tint(P.bronze, -0.2));
  return m;
}

/**
 * The mensa ponderaria: the town's measures. A limestone table, 3 m long, its top cut with five big bowls
 * and a lower ledge with four small ones, each with a drain hole. Its front (+z) faces the Forum.
 */
export function mensaPonderaria(): Model {
  const m = model();
  const stone = (x: number, y: number, z: number) => vary(P.limestone, x, y, z, 0.05);
  box(m, 0, 0, 0, 23, 7, 5, (x, y, z) => (y === 7 ? vary(tint(P.limestone, 0.06), x, y, z, 0.04) : stone(x, y, z)));
  box(m, 1, 0, 6, 22, 4, 8, (x, y, z) => (y === 4 ? vary(tint(P.limestone, 0.06), x, y, z, 0.04) : stone(x, y, z)));
  // the bowls: hollows in the top, dark at their floors where the drain holes are
  const bowls: [number, number, number, number][] = [[3, 2.5, 7, 2.6], [8.5, 2.5, 7, 2.3], [13.5, 2.5, 7, 2], [18, 2.5, 7, 1.7], [21.5, 2.5, 7, 1.2], [4, 7, 4, 1.2], [9, 7, 4, 1.2], [14, 7, 4, 1], [19, 7, 4, 1]];
  for (const [cx, cz, top, r] of bowls) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) {
    const d = Math.hypot(x - cx, z - cz);
    if (d > r) continue;
    const depth = Math.max(1, Math.round((1 - d / (r + 0.5)) * r));
    for (let y = top; y > top - depth; y--) m.solid.delete(x, y, z);
    set(m, x, top - depth, z, d < 0.8 ? 0x2a2420 : vary(tint(P.limestone, -0.18), x, top - depth, z, 0.04));
  }
  return m;
}

/** A sundial on an Ionic column: the dial a hollowed block facing south (+z), its hour lines cut, a bronze pin. */
export function sundial(): Model {
  const m = model();
  for (let y = 0; y < 2; y++) box(m, -3, y, -3, 3, y, 3, (x, yy, z) => vary(P.limestone, x, yy, z, 0.04));
  for (let y = 2; y < 18; y++) for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) {
    if (x * x + z * z > 5) continue;
    const flute = (Math.round(Math.atan2(z, x) * 4 / Math.PI) & 1) === 1;
    set(m, x, y, z, vary(flute ? tint(P.marble, -0.08) : P.marble, x, y, z, 0.03));
  }
  // the Ionic capital: two scrolled volutes either side
  box(m, -3, 18, -2, 3, 18, 2, (x, y, z) => vary(P.marble, x, y, z, 0.03));
  for (const sx of [-4, 4]) box(m, sx, 17, -1, sx, 18, 1, () => tint(P.marble, -0.1));
  // the dial: a block, its south face hollowed into a quarter-bowl
  box(m, -3, 19, -2, 3, 23, 2, (x, y, z) => {
    const bowl = x * x + (y - 23) ** 2 + (z - 2) ** 2 < 9.5 && z > -1;
    if (bowl) return null;
    return vary(P.marble, x, y, z, 0.03);
  });
  // the hour lines fanning across the bowl
  for (const x of [-2, -1, 0, 1, 2]) for (let y = 20; y <= 22; y++) {
    let z = 2;
    while (z > -2 && !m.solid.has(x, y, z)) z--;
    if (m.solid.has(x, y, z) && (x + y) % 2 === 0) set(m, x, y, z, 0x5a5048);
  }
  for (let z = -1; z <= 2; z++) set(m, 0, 23, z, P.bronze); // the gnomon
  return m;
}

/** An altar: a tuff core faced in marble, with a cornice and rolled bolsters at the top. `relief`: a sacrifice carved on the front. */
export function altar(relief = false): Model {
  const m = model();
  const W = 12, D = 8, H = 8;
  box(m, 0, 0, 0, W - 1, H - 1, D - 1, (x, y, z) => (y === H - 1 || y === 0 ? vary(P.moulding, x, y, z, 0.03) : marble(x, y, z)));
  box(m, -1, 0, -1, W, 0, D, (x, y, z) => vary(P.moulding, x, y, z, 0.03));
  for (const x of [0, W - 1]) box(m, x, H, 0, x, H, D - 1, (xx, y, z) => vary(P.marble, xx, y, z, 0.03)); // the bolsters
  box(m, 3, H, 2, W - 4, H, D - 3, () => 0x3a2a22); // the hearth on top, ash-dark
  if (relief) {
    // the front: the priest with his toga over his head, a bull led by an attendant, a flute player
    const fig = (x: number, y0: number, h: number) => { for (let y = y0; y < y0 + h; y++) set(m, x, y, D, vary(tint(P.marble, -0.12), x, y, D, 0.03)); };
    fig(1, 1, 5); fig(2, 1, 6);
    for (let x = 4; x <= 8; x++) for (let y = 2; y <= 3; y++) set(m, x, y, D, vary(tint(P.marble, -0.15), x, y, D, 0.03)); // the bull
    fig(4, 1, 2); fig(8, 1, 2); set(m, 9, 4, D, tint(P.marble, -0.15));
    fig(10, 1, 6);
  }
  return m;
}

export type Goods = 'grapes' | 'figs' | 'fish' | 'bread' | 'apples' | 'shoes' | 'lamps' | 'tablets' | 'cheese' | 'wool' | 'cloth' | 'pots' | 'veg';
const GOODS: Record<Goods, number[]> = {
  grapes: [P.grape, 0x5a3a62, 0x7a8a3a], figs: [0x6a3a52, 0x5a3048, 0x7a8a4a], fish: [0xb8c4cc, 0x9aa8b2, 0xd0d8dc], bread: [0xc89050, 0xb07a40, 0xd8a868],
  apples: [0xb8402a, 0x9aa83a, 0xd06a3a], shoes: [0x6a4628, 0x8a5a32, 0x4a3020], lamps: [P.terracotta, 0xc2794a, 0x9a5a34], tablets: [0x8a6a3a, 0x2a2420, 0x8a6a3a],
  cheese: [0xe8dcb0, 0xd8c890, 0xf0e8c8], wool: [0xf0ead8, 0xe2d8c0, 0xd8cdb0], cloth: [0xa8342a, 0x3f6a9a, 0xdba948],
  pots: [P.bronze, 0xb08a40, P.terracotta], veg: [0x6a8a3a, 0xe8dcc0, 0x8a4a6a],
};

/**
 * A market stall: a trestle table `len` long with goods on it, four posts and a cloth awning sloping down
 * to the front (+z). The seller stands behind it (−z). Pivot: the table's front-left corner on the ground.
 * `canopy: 'corner'` shades only the left end on one pole, so the seller stays in view.
 */
export function stall(len: number, goods: Goods, cloth: number, canopy: 'full' | 'corner' = 'full'): Model {
  const m = model();
  const D = 5;
  // the table top and its trestles
  box(m, 0, 5, 0, len - 1, 5, D - 1, (x, y, z) => vary(P.woodLight, x, y, z, 0.07));
  for (const x of [1, len - 2]) box(m, x, 0, 0, x, 4, D - 1, (xx, y, z) => (y === 0 || z === 0 || z === D - 1 || y === 4 ? vary(P.wood, xx, y, z, 0.06) : null));
  // the goods: heaped where food, laid in rows where made things
  const cs = GOODS[goods];
  const heap = goods === 'grapes' || goods === 'figs' || goods === 'apples' || goods === 'fish' || goods === 'bread';
  for (let x = 1; x < len - 1; x++) for (let z = 0; z < D; z++) {
    const c = cs[Math.floor(h3(x, 7, z) * cs.length)];
    if (heap) {
      if ((x % 7) === 0) { set(m, x, 6, z, vary(P.woodLight, x, 6, z, 0.06)); continue; } // basket rims between heaps
      set(m, x, 6, z, vary(c, x, 6, z, 0.1));
      if (z > 0 && z < D - 1 && (x % 7) > 1 && (x % 7) < 6) set(m, x, 7, z, vary(c, x, 7, z, 0.1));
    } else if (goods === 'lamps') {
      if ((x % 3) === 1 && (z % 2) === 1) { set(m, x, 6, z, vary(c, x, 6, z, 0.06)); if (z === 1) set(m, x, 7, z, P.glowLamp, true); }
    } else if (goods === 'tablets') {
      if ((x % 4) !== 0 && z > 0) set(m, x, 6, z, (x % 4) === 2 ? 0x2a2420 : vary(c, x, 6, z, 0.06));
    } else if (goods === 'shoes') {
      if ((x % 3) !== 0 && (z === 1 || z === 3)) set(m, x, 6, z, vary(c, x, 6, z, 0.08));
    } else {
      set(m, x, 6, z, vary(c, x, 6, z, 0.06));
      if ((x + z) % 3 === 0) set(m, x, 7, z, vary(c, x, 7, z, 0.06));
    }
  }
  const stripe = (x: number, y: number, z: number) => vary(Math.floor((x + 40) / 3) % 2 === 0 ? cloth : mixc(cloth, P.plasterWhite, 0.7), x, y, z, 0.05);
  if (canopy === 'corner') {
    // one pole at the back-left, a square of cloth tied out over the end of the table
    for (let y = 0; y < 19; y++) set(m, 0, y, -2, vary(P.wood, 0, y, -2, 0.06));
    for (let x = -3; x <= 5; x++) for (let z = -5; z <= 4; z++) set(m, x, 19 - (z > 1 ? 1 : 0), z, stripe(x, 19, z));
    return m;
  }
  // posts and awning: higher at the back, striped
  const back = -7;
  for (const x of [0, len - 1]) for (const z of [back, D]) for (let y = 0; y < (z === back ? 17 : 15); y++) set(m, x, y, z, vary(P.wood, x, y, z, 0.06));
  for (let x = -1; x <= len; x++) for (let z = back - 1; z <= D + 1; z++) {
    const y = 17 - Math.floor((z - back + 1) / 4);
    set(m, x, y, z, stripe(x, y, z));
    if (z === D + 1) set(m, x, y - 1, z, stripe(x, y - 1, z)); // the hem
  }
  return m;
}

/** A seller's mat on the paving: a cloth with goods set out in baskets and heaps. Pivot: its corner. Never above knee height. */
export function mat(w: number, d: number, cloth: number, goods: Goods): Model {
  const m = model();
  box(m, 0, 0, 0, w - 1, 0, d - 1, (x, y, z) => vary((x + z) % 6 === 0 ? tint(cloth, -0.15) : cloth, x, y, z, 0.05));
  const cs = GOODS[goods];
  for (let x = 1; x < w - 2; x += 3) for (let z = 1; z < d - 2; z += 3) {
    const c = cs[Math.floor(h3(x, 3, z) * cs.length)];
    for (let dx = 0; dx <= 1; dx++) for (let dz = 0; dz <= 1; dz++) set(m, x + dx, 1, z + dz, vary(goods === 'pots' ? c : P.woodLight, x + dx, 1, z + dz, 0.08));
    for (let dx = 0; dx <= 1; dx++) for (let dz = 0; dz <= 1; dz++) if (h3(x + dx, 4, z + dz) > 0.3) set(m, x + dx, 2, z + dz, vary(c, x + dx, 2, z + dz, 0.1));
  }
  return m;
}

/** A money changer's table: a bronze balance, stacks of coins, a strongbox bound in iron. Front +z. */
export function moneyTable(): Model {
  const m = model();
  box(m, 0, 5, 0, 11, 5, 4, (x, y, z) => vary(P.woodLight, x, y, z, 0.06));
  for (const x of [0, 11]) for (const z of [0, 4]) for (let y = 0; y < 5; y++) set(m, x, y, z, P.wood);
  // the balance: a post, a beam, two pans
  for (let y = 6; y <= 10; y++) set(m, 3, y, 2, P.bronze);
  for (let x = 0; x <= 6; x++) set(m, x, 10, 2, P.bronze);
  for (const px of [0, 6]) { set(m, px, 9, 2, P.bronze); for (let x = px - 1; x <= px + 1; x++) set(m, x, 7, 2, tint(P.bronze, 0.1)); }
  // coins: bronze asses and silver denarii in little towers
  for (const [cx, cz, n, c] of [[8, 1, 3, 0xb08a40], [9, 3, 2, 0xc8c8c8], [10, 1, 4, 0xb08a40], [8, 3, 1, 0xd9a83a]] as const) for (let y = 6; y < 6 + n; y++) set(m, cx, y, cz, c);
  // the wax tablets, open
  box(m, 5, 6, 3, 8, 6, 4, (x) => (x === 6 || x === 7 ? 0x2a2420 : 0x8a6a3a));
  // the strongbox (arca) beside the table
  box(m, 13, 0, 0, 18, 5, 4, (x, y, z) => (y === 5 || x === 13 || x === 18 || y === 0 ? vary(P.iron, x, y, z, 0.08) : vary(P.woodDark, x, y, z, 0.06)));
  set(m, 15, 3, 5, 0xc9a050); set(m, 16, 3, 5, 0xc9a050); // the lock plate
  return m;
}

/** A ladder `h` voxels tall, leaning on a wall behind it (−z). */
export function ladder(h: number): Model {
  const m = model();
  for (let y = 0; y < h; y++) {
    const z = Math.floor((h - y) / 6);
    set(m, 0, y, z, P.wood); set(m, 4, y, z, P.wood);
    if (y % 3 === 1) for (let x = 1; x <= 3; x++) set(m, x, y, z, P.woodLight);
  }
  return m;
}

/** Bales of wool, stacked: the wool trade's goods in Eumachia's hall. */
export function woolBales(n = 4): Model {
  const m = model();
  for (let i = 0; i < n; i++) {
    const bx = (i % 2) * 7, by = Math.floor(i / 2) * 5, bz = (i % 3) - 1;
    box(m, bx, by, bz, bx + 6, by + 4, bz + 5, (x, y, z) => ((x === bx + 3 || y === by + 2) && (z === bz || z === bz + 5 || x === bx || x === bx + 6) ? 0x8a6a3a : vary(GOODS.wool[(x + y) % 3], x, y, z, 0.06)));
  }
  return m;
}

/** A pile of new limestone column drums and a block waiting to be set: the Forum was being rebuilt in 79. */
export function drums(): Model {
  const m = model();
  for (const [cx, cz] of [[0, 0], [7, 1], [3, 7]] as const) for (let y = 0; y < 4; y++) for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) {
    if (x * x + z * z > 10) continue;
    set(m, cx + x, y, cz + z, y === 3 ? vary(tint(P.limestone, 0.08), x, y, z, 0.04) : quadratum(x + z, y, 4, 2, P.limestone));
  }
  for (let y = 4; y < 8; y++) for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) if (x * x + z * z <= 6) set(m, x, y, z, vary(P.limestone, x, y, z, 0.05));
  return m;
}
