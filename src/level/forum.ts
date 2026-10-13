/**
 * The Forum, October AD 79: Pompeii's civic heart, at the top of Via Marina. Pure: this module builds the
 * voxels the sim collides with and lists what the world draws on top. Coordinates are voxels (1/8 m):
 * x east, y up, z south. The camera looks north, so the Temple of Jupiter stands at the top of the
 * district with Vesuvius on the horizon behind it (the famous view), and the south end is kept low.
 *
 * What's here, from the excavations (compressed for play, never invented wholesale):
 * - The piazza: long, north–south, paved in pale travertine and closed to carts (the streets end at a step
 *   and stone posts). Two-storey colonnades down its long sides (Doric below, a lighter order and a parapet
 *   above); the old grey tuff colonnade of the second century BC at the south end. Statue bases along the
 *   west side and the south end, bronzes on horseback and men in togas; a low speaker's platform.
 * - North: the Temple of Jupiter (the Capitolium) on its high podium, steps up the front between two
 *   equestrian statues, flanked by two honorary arches; still being repaired after the earthquake of AD 62.
 * - West: the sanctuary of Apollo (a portico round a courtyard, the temple on its podium, the altar, the
 *   sundial on an Ionic column, bronze Apollo and Diana as archers), with the mensa ponderaria (the
 *   official measures) in a niche on its Forum side; Via Marina coming up from the sea gate; the Basilica
 *   at the south-west corner (an aisle round a great colonnade of brick columns, First Style walls, a
 *   tribunal at the far end, walls scratched with graffiti).
 * - East: the Macellum (the food market: shops round a courtyard, the tholos of twelve columns over a water
 *   basin where fish were cleaned, the imperial shrine at the back), the Sanctuary of the Public Lares (open
 *   to the Forum, an apse and niches, unroofed), the Temple of Vespasian (a court with a marble altar carved
 *   with a sacrifice, the little temple at the back), and the Building of Eumachia (the wool trade's hall,
 *   its marble doorway carved with acanthus, the Fountain of Abundance at its corner).
 * - South: three halls of the town's government (council and magistrates), the Comitium (the open voting
 *   enclosure) at the corner, and Via dell'Abbondanza leaving east.
 * - Life: market stalls under awnings (as on the Forum frieze from the Praedia of Julia Felix: cobblers,
 *   stationers, lamp sellers), the fruit and fish of the Macellum, a money changer, a sign painter at work
 *   on an election notice, children at knucklebones.
 */
import { VoxelWorld, navGrid, type Model } from 'ymir/voxel';
import type { Level, Ring, Spawn } from './types';
import { district as districtOf } from './index';
import { P, basalt, h2, h3, mixc, noise2, plaster, quadratum, tint, vary } from '../art/palette';
import { archHole, column, facade, gableRoofX, ground, meadow, solid, street, wallX, wallZ, type Face, type Opening } from '../art/build';
import { amphora, bench, counter, crate, dolium, fountain, lararium } from '../art/props';
import { acanthus, cocciopesto, doubleColumn, firstStyle, gableRoofZ, notice, pediment, roofPlane, slabs } from '../art/forum-build';
import { altar, archer, drums, equestrian, ladder, mat, mensaPonderaria, moneyTable, stall, statueBase, sundial, togatus, woolBales, type Goods } from '../art/forum-props';

export const W = 640;
export const D = 448;
/** The piazza, the sidewalks and most floors (the top voxel's y). The Forum sits at the top of Via Marina. */
export const PZ = 52;
/** Street roadways, a kerb's height below the sidewalks. */
export const ROAD = 49;
/** The colonnades stand a step up from the piazza. */
const F = PZ + 1;
/** The piazza's paving (voxels, inclusive). */
export const PIAZZA = { x0: 236, x1: 403, z0: 136, z1: 391 } as const;
/** Via Marina, coming up from the sea gate (west), and Via dell'Abbondanza, leaving east from the south-east corner. */
export const VIA_MARINA = { x1: 203, zN: 222, zS: 253, walk: 12 } as const;
export const ABBONDANZA = { x0: 436, zN: 372, zS: 395, walk: 12 } as const;
/** The two-storey colonnades: their column lines (x) and the walls behind them. */
const WEST_COL = { back: 204, front: 235, col: 231 } as const;
const EAST_COL = { back: 435, front: 404, col: 408 } as const;
/** The Temple of Jupiter's podium. */
export const CAPITOLIUM = { x0: 276, x1: 363, z0: 32, z1: 111, top: PZ + 22 } as const;

/** Where you arrive: up Via Marina from the sea gate, or back along Via dell'Abbondanza. */
export const SPAWNS: Record<string, Spawn> = {
  west: { x: 14, y: ROAD + 1, z: 238, facing: Math.PI / 2 },
  east: { x: 624, y: ROAD + 1, z: 384, facing: -Math.PI / 2 },
};

export function buildForum(): Level {
  const w = new VoxelWorld();
  const archWest = new VoxelWorld(), archEast = new VoxelWorld();
  const L: Level = {
    id: 'forum', name: { la: 'Forum', en: 'The Forum', fr: 'Le Forum' },
    world: w, width: W, depth: D,
    occluders: [
      { id: 'arch-west', world: archWest, x0: 230, x1: 281, z0: 108, z1: 146 },
      { id: 'arch-east', world: archEast, x0: 358, x1: 409, z0: 108, z1: 146 },
    ],
    trees: [], props: [], water: [], fires: [], smoke: [], jets: [], spots: [], npcs: [], walkers: [], shops: [],
    exits: [
      { id: 'to-portaMarina', to: 'portaMarina', arrive: 'east', x0: 0, x1: 3, z0: VIA_MARINA.zN - VIA_MARINA.walk, z1: VIA_MARINA.zS + VIA_MARINA.walk, label: { la: 'Ad Portam Marīnam', en: 'To the Sea Gate', fr: 'Vers la porte de la Mer' } },
      { id: 'to-abbondanza', to: 'abbondanza', arrive: 'west', x0: W - 4, x1: W - 1, z0: ABBONDANZA.zN - ABBONDANZA.walk, z1: ABBONDANZA.zS + ABBONDANZA.walk, label: { la: 'Ad Thermās', en: 'To Via dell’Abbondanza and the Stabian Baths', fr: 'Vers la Via dell’Abbondanza et les thermes de Stabies' } },
    ],
    spawns: SPAWNS,
    groundAt: (x, z) => (w.topAt(Math.round(x), Math.round(z), PZ + 14, PZ - 12) ?? PZ) + 1,
    ring: RING,
  };
  const stamp = (m: Model, x: number, y: number, z: number, rotate = 0) => w.stamp(m, { x, y, z }, { rotate });
  const prop = (kind: string, variant: number, x: number, z: number, rotate = 0, y = PZ + 1) => L.props.push({ kind, variant, x, y, z, rotate });

  // ── Ground: travertine everywhere a floor isn't painted over; the two streets a kerb lower ──
  const isRoad = (x: number, z: number) => (x <= VIA_MARINA.x1 && z >= VIA_MARINA.zN && z <= VIA_MARINA.zS) || (x >= ABBONDANZA.x0 && z >= ABBONDANZA.zN && z <= ABBONDANZA.zS);
  ground(w, 0, 0, W - 1, D - 1, (x, z) => (isRoad(x, z) ? ROAD : PZ), (x, y, z, d) => (d ? vary(P.soil, x, y, z, 0.05) : slabs(x, z)), 6);
  street(w, { x0: 0, x1: VIA_MARINA.x1, zN: VIA_MARINA.zN, zS: VIA_MARINA.zS, walk: VIA_MARINA.walk, y: () => ROAD, steps: [96] });
  street(w, { x0: ABBONDANZA.x0, x1: W - 1, zN: ABBONDANZA.zN, zS: ABBONDANZA.zS, walk: ABBONDANZA.walk, y: () => ROAD, steps: [548] });
  // Closed to carts: the roadways end at a kerb, with stone posts across them
  for (let z = VIA_MARINA.zN; z <= VIA_MARINA.zS; z++) for (let y = ROAD - 2; y <= PZ; y++) w.set(VIA_MARINA.x1 + 1, y, z, vary(y === PZ ? P.kerb : tint(P.kerb, -0.08), VIA_MARINA.x1 + 1, y, z, 0.05));
  for (let z = ABBONDANZA.zN; z <= ABBONDANZA.zS; z++) for (let y = ROAD - 2; y <= PZ; y++) w.set(ABBONDANZA.x0 - 1, y, z, vary(y === PZ ? P.kerb : tint(P.kerb, -0.08), ABBONDANZA.x0 - 1, y, z, 0.05));
  for (const z of [225, 233, 242, 250]) solid(w, 207, F, z, 208, F + 5, z + 1, (x, y, zz) => vary(y === F + 5 ? P.basaltLight : P.basalt, x, y, zz, 0.06));
  for (const z of [375, 383, 391]) solid(w, 430, F, z, 431, F + 5, z + 1, (x, y, zz) => vary(y === F + 5 ? P.basaltLight : P.basalt, x, y, zz, 0.06));
  // a drain along the piazza's edges, and a band of darker slabs framing it
  for (let x = PIAZZA.x0; x <= PIAZZA.x1; x++) for (const z of [PIAZZA.z0, PIAZZA.z1]) w.set(x, PZ, z, vary(P.tuff, x, PZ, z, 0.05));
  for (let z = PIAZZA.z0; z <= PIAZZA.z1; z++) for (const x of [PIAZZA.x0, PIAZZA.x1]) w.set(x, PZ, z, vary(P.tuff, x, PZ, z, 0.05));

  // ── North ──
  capitolium(w, L, stamp);
  arch(w, archWest, 236, 275);
  arch(w, archEast, 364, 403);
  northLane(w);

  // ── West ──
  apollo(w, L, stamp);
  basilica(w, L, stamp);
  colonnade(w, WEST_COL, 24, 209, 'west');
  colonnade(w, WEST_COL, 266, 391, 'west');
  // the official measures, in a niche of the sanctuary's wall, facing the colonnade
  for (let z = 166; z <= 191; z++) for (let y = F; y <= F + 15; y++) {
    w.delete(202, y, z); w.delete(203, y, z);
    w.set(201, y, z, y === F + 15 || z === 166 || z === 191 ? vary(P.moulding, 201, y, z, 0.03) : plaster(P.red, z, y, 5));
  }
  stamp(mensaPonderaria(), 202, F, 191, 1);
  L.spots.push({ id: 'forum-mensa', x: 216, y: F, z: 179, r: 14, verb: 'read' });

  // ── East ──
  macellum(w, L, stamp, prop);
  lares(w, L, stamp);
  vespasian(w, L, stamp);
  eumachia(w, L, stamp, prop);
  colonnade(w, EAST_COL, 24, 355, 'east');
  stamp(moneyTable(), 426, F, 36, 3); // Secundus's table: the banker's business is done in the open
  // the Fountain of Abundance at the top of the street: a woman with a horn of plenty carved on its pillar
  const fx = 446, fz = ABBONDANZA.zN - ABBONDANZA.walk + 1;
  stamp(fountain(), fx, PZ + 1, fz);
  for (let y = PZ + 6; y <= PZ + 12; y++) w.set(fx + 5, y, fz - 1, vary(P.marble, fx + 5, y, fz - 1, 0.04));
  L.water.push({ x: fx + 1, z: fz + 1, w: 9, d: 9, level: PZ + 1 + 5.3, floor: PZ + 1.5, kind: 'fountain' });
  L.jets.push({ x: fx + 5.5, y: PZ + 1 + 8.5, z: fz + 0.5, dir: [0, 1] });
  L.spots.push({ id: 'forum-fountain', x: fx + 5, y: PZ + 1, z: fz + 14, r: 14, verb: 'drink' });

  // ── South ──
  southEnd(w, stamp);
  comitium(w);
  garden(w, L, stamp);

  // ── The piazza: statues, the speaker's platform, stalls ──
  // statues of the town's notables along the west side, riders at the south end
  for (const [z, v] of [[282, 0], [304, 1], [326, 0], [348, 1]] as const) { stamp(statueBase(9, 12, 7, z), 240, F, z); stamp(togatus(v), 244, F + 12, z + 3, 1); }
  for (const [z, v] of [[176, 1], [236, 0], [296, 1], [340, 0]] as const) { stamp(statueBase(9, 12, 7, z), 392, F, z); stamp(togatus(v), 396, F + 12, z + 3, 3); }
  stamp(statueBase(26, 14, 8, 9), 307, F, 383); stamp(equestrian(1), 320, F + 14, 387, 2);
  for (const [x, r] of [[258, 0], [362, 2]] as const) { stamp(statueBase(22, 12, 8, x), x, F, 383); stamp(equestrian(0), x + 11, F + 12, 387, r); }
  // a low speaker's platform (suggestum) on the west side, steps at its south end
  solid(w, 238, F, 186, 254, F + 8, 206, (x, y, z) => (y === F + 8 ? vary(P.marble, x, y, z, 0.03) : quadratum(x + z, y, 6, 3, P.tuff)));
  for (let k = 0; k < 4; k++) solid(w, 242, F, 207 + k * 2, 250, F + 6 - k * 2, 208 + k * 2, (x, y, z) => vary(P.limestone, x, y, z, 0.05));
  // stalls along the colonnades: a stationer, a lamp seller, a cobbler (keepers stand behind, facing the piazza)
  const stalls: { x: number; z: number; goods: Goods; cloth: number; shop?: boolean }[] = [
    { x: 239, z: 152, goods: 'tablets', cloth: P.red, shop: true },
    { x: 386, z: 152, goods: 'lamps', cloth: 0x3f6a9a, shop: true },
    { x: 239, z: 368, goods: 'shoes', cloth: P.green, shop: true },
    // the rest of the market along the colonnades: cloth, vegetables, bronze and clay pots, bread
    { x: 239, z: 172, goods: 'cloth', cloth: P.yellow },
    { x: 239, z: 244, goods: 'veg', cloth: P.green },
    { x: 386, z: 200, goods: 'pots', cloth: P.red },
    { x: 386, z: 262, goods: 'bread', cloth: P.yellow },
    { x: 386, z: 316, goods: 'cloth', cloth: 0x3f6a9a },
    { x: 386, z: 362, goods: 'veg', cloth: P.redDark },
  ];
  for (const s of stalls) stamp(stall(15, s.goods, s.cloth, s.shop ? 'corner' : 'full'), s.x, F, s.z);
  piazzaLife(w, L, stamp, prop);

  // ── Shops: a counter to buy at, a keeper behind it ──
  L.shops.push(
    { id: 'forum-fruit', name: { la: 'Macellum', en: 'Iucunda’s fruit stall in the market hall', fr: 'L’étal de fruits de Iucunda, au marché couvert' }, sign: 'MACELLVM', keeper: 'forum-iucunda', x: 492, z: 109,
      stock: [{ item: 'grapes', price: 1 }, { item: 'apple', price: 1 }, { item: 'cheese', price: 3 }, { item: 'bread', price: 2 }] },
    { id: 'forum-tablets', name: { la: 'Tabulae', en: 'The stationer’s stall', fr: 'L’étal du papetier' }, sign: 'TABVLAE', keeper: 'forum-stationer', x: 246, z: 162,
      stock: [{ item: 'tablet', price: 5 }, { item: 'stylus', price: 2 }] },
    { id: 'forum-lamps', name: { la: 'Lucernae', en: 'The lamp seller’s stall', fr: 'L’étal du marchand de lampes' }, sign: 'LVCERNAE', keeper: 'forum-lamp-seller', x: 393, z: 162,
      stock: [{ item: 'lamp', price: 6 }, { item: 'oil', price: 4 }] },
    { id: 'forum-shoes', name: { la: 'Soleae', en: 'The cobbler’s stall', fr: 'L’étal du cordonnier' }, sign: 'SOLEAE', keeper: 'forum-cobbler', x: 246, z: 378,
      stock: [{ item: 'sandals', price: 10 }, { item: 'hat', price: 7 }] },
  );
  for (const sh of L.shops) L.spots.push({ id: `shop:${sh.id}`, x: sh.x, y: PZ + 1, z: sh.z, r: 12, verb: 'shop' });

  // ── People ──
  L.npcs.push(
    // the named: the banker's clerk at his table, the fruit seller, the sign painter
    { id: 'forum-secundus', who: 'Secundus', x: 430, z: 45, facing: -Math.PI / 2, pose: 'sell' },
    { id: 'forum-iucunda', who: 'Iucunda', x: 489, z: 97, facing: 0, pose: 'sell' },
    { id: 'forum-onesimus', who: 'Onesimus', x: 58, z: 213, facing: Math.PI, pose: 'work' },
    // the keepers of the stalls
    { id: 'forum-stationer', who: 'vir:3', x: 246, z: 148, facing: 0, pose: 'sell' },
    { id: 'forum-lamp-seller', who: 'mercator:6', x: 393, z: 148, facing: 0, pose: 'sell' },
    { id: 'forum-cobbler', who: 'sutor:1', x: 246, z: 364, facing: 0, pose: 'sell' },
    // the people of the Forum
    { id: 'forum-old-man', who: 'senex:3', x: 300, z: 138, facing: 0.3, pose: 'sit' }, // on the bottom step of the temple
    { id: 'forum-merchant', who: 'mercator:4', x: 104, z: 352, facing: 0.6, pose: 'idle' }, // doing a deal in the Basilica
    { id: 'forum-water', who: 'femina:2', x: 462, z: 366, facing: Math.PI, pose: 'drink' }, // at the fountain
    { id: 'forum-mason', who: 'faber:1', x: 352, z: 210, facing: 0.8, pose: 'work' }, // relaying the paving
    { id: 'forum-fuller', who: 'fullo:0', x: 420, z: 336, facing: -1.2, pose: 'idle' }, // by Eumachia's door
    { id: 'forum-farmer', who: 'agricola:2', x: 530, z: 112, facing: 0.4, pose: 'idle' }, // selling to the Macellum
    { id: 'forum-boy', who: 'puer:1', x: 312, z: 298, facing: 1.4, pose: 'sit' }, // knucklebones
    { id: 'forum-girl', who: 'puella:2', x: 322, z: 300, facing: -1.6, pose: 'sit' },
    { id: 'forum-grandmother', who: 'avia:1', x: 332, z: 396, facing: Math.PI, pose: 'sit' }, // on a bench in the south portico
    { id: 'forum-cook', who: 'caupo:1', x: 594, z: 106, facing: 0, pose: 'work' }, // the hot-food counter in the Macellum
  );
  L.walkers.push(
    { id: 'forum-w-round', who: 'femina:5', path: [[262, 172], [378, 172], [378, 364], [262, 364]], speed: 8, phase: 0 },
    { id: 'forum-w-marina', who: 'vir:1', path: [[20, 217], [226, 217], [226, 219], [20, 219]], speed: 10, phase: 90 },
    { id: 'forum-w-runner', who: 'puer:4', path: [[262, 250], [380, 250], [380, 254], [262, 254]], speed: 16, phase: 30 },
    { id: 'forum-w-abbondanza', who: 'mercator:1', path: [[620, 380], [416, 380], [416, 387], [620, 387]], speed: 10, phase: 200 },
    { id: 'forum-w-across', who: 'puella:3', path: [[296, 146], [296, 376], [300, 376], [300, 146]], speed: 9, phase: 120 },
    { id: 'forum-w-colonnade', who: 'senex:2', path: [[218, 276], [218, 384], [221, 384], [221, 276]], speed: 5, phase: 40 },
    { id: 'forum-w-market', who: 'nauta:1', path: [[470, 120], [580, 120], [580, 122], [470, 122]], speed: 9, phase: 60 },
  );
  return L;
}

type Stamp = (m: Model, x: number, y: number, z: number, rotate?: number) => unknown;
type Prop = (kind: string, variant: number, x: number, z: number, rotate?: number, y?: number) => unknown;

/**
 * The open piazza, kept below knee height so the view to the temple stays clear: sellers on mats, a patch
 * being repaved (the travertine was still being relaid after the earthquake), benches by the statues,
 * the children's knucklebones.
 */
function piazzaLife(w: VoxelWorld, L: Level, stamp: Stamp, prop: Prop): void {
  // repaving: the old slabs up, the sand bed showing, new slabs stacked, a heap of sand, a barrow
  const rx0 = 340, rx1 = 378, rz0 = 196, rz1 = 228;
  for (let x = rx0; x <= rx1; x++) for (let z = rz0; z <= rz1; z++) {
    const edge = x - rx0 < 3 || rx1 - x < 3 || z - rz0 < 2 || rz1 - z < 2;
    if (edge && h2(x >> 2, z >> 2, 81) > 0.35) continue; // ragged: some old slabs still down
    w.delete(x, PZ, z);
    w.set(x, PZ - 1, z, vary(mixc(P.sand, P.mortar, noise2(x, z, 6, 82)), x, PZ - 1, z, 0.06));
  }
  for (const [sx, sz, n] of [[344, 200, 4], [358, 200, 3], [344, 210, 2]] as const) solid(w, sx, PZ, sz, sx + 11, PZ + n, sz + 6, (x, y, z) => vary(y === PZ + n ? 0xe2d8c0 : (y & 1) ? 0xcfc3a4 : 0xd8cdb2, x, y, z, 0.04));
  for (let x = 360; x <= 374; x++) for (let z = 212; z <= 226; z++) {
    const hgt = Math.round(5 - Math.hypot(x - 367, z - 219) * 0.75);
    for (let y = PZ; y < PZ + hgt; y++) w.set(x, y, z, vary(P.sand, x, y, z, 0.07));
  }
  solid(w, 350, PZ, 216, 355, PZ + 3, 219, (x, y, z) => (y === PZ + 3 && x > 350 && x < 355 && z > 216 && z < 219 ? null : vary(P.wood, x, y, z, 0.06))); // the barrow
  for (let k = 0; k < 8; k++) w.set(348 + k, PZ, 223, P.woodLight); // a plank
  // sellers on mats: garlic and onions, pots, eggs and cheeses, cloth
  stamp(mat(12, 8, 0xb8a888, 'veg'), 262, F, 312); stamp(mat(10, 8, 0x8a4a3a, 'pots'), 270, F, 340);
  stamp(mat(12, 7, 0x6a7a8a, 'cheese'), 358, F, 284); stamp(mat(10, 8, 0xc9a050, 'cloth'), 354, F, 330);
  stamp(mat(9, 7, 0x8a7a5a, 'apples'), 262, F, 196); stamp(mat(10, 7, 0x5a6a7a, 'figs'), 300, F, 262); stamp(mat(8, 8, 0x9a6a4a, 'bread'), 330, F, 360);
  stamp(mat(11, 7, 0xb8a888, 'pots'), 300, F, 180);
  // a herald's low wooden dais, where sales are cried and lost things announced
  solid(w, 322, F, 268, 333, F + 4, 275, (x, y, z) => vary(y === F + 4 ? P.woodLight : P.wood, x, y, z, 0.06));
  stamp(bench(6, true), 324, F + 5, 270);
  // benches by the statues, baskets and jars by the stalls
  L.props.push({ kind: 'bench', variant: 0, x: 254, y: F, z: 292, rotate: 1 }, { kind: 'bench', variant: 0, x: 254, y: F, z: 338, rotate: 1 }, { kind: 'bench', variant: 0, x: 380, y: F, z: 246, rotate: 1 });
  prop('figs', 0, 256, 166); prop('amphora', 1, 401, 160); prop('amphora', 2, 403, 164); prop('grapes', 0, 256, 380);
  prop('fish', 1, 256, 252); prop('figs', 2, 382, 210); prop('amphora', 0, 382, 270); prop('grapes', 2, 380, 324);
  // the knucklebones, thrown on the paving between the two children
  for (const [x, z] of [[315, 300], [317, 302], [318, 299], [314, 303]] as const) w.set(x, F, z, 0xf0e8d8);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// North

/** The Temple of Jupiter: a podium 2.75 m high, a deep porch of six by three columns, the cella behind, steps up the front. */
function capitolium(w: VoxelWorld, L: Level, stamp: Stamp): void {
  const { x0, x1, z0, z1, top } = CAPITOLIUM;
  // the podium: a moulded base and cornice, tuff blocks stuccoed, marble paving on top
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) for (let y = F; y <= top; y++) {
    const edge = x === x0 || x === x1 || z === z0 || z === z1;
    if (!edge && y < top) continue;
    const c = y === top ? (edge ? vary(P.moulding, x, y, z, 0.03) : vary(P.marble, x, y, z, 0.03))
      : y <= F + 1 || y >= top - 1 ? vary(P.moulding, x, y, z, 0.03) : quadratum(x + z, y, 10, 4, mixc(P.plasterWhite, P.tuff, 0.25));
    w.set(x, y, z, c);
  }
  for (let x = x0 + 1; x < x1; x++) for (let z = z0 + 1; z < z1; z++) for (let y = top - 4; y < top; y++) w.set(x, y, z, P.tuff); // the core under the top (never seen)
  // the steps, between the two riders
  for (let x = 292; x <= 347; x++) for (let z = z1 + 1; z <= z1 + 24; z++) {
    const s = Math.floor((z1 + 24 - z) / 2) + 1;
    const y = Math.min(top, PZ + s * 2);
    for (let yy = PZ - 3; yy <= y; yy++) w.set(x, yy, z, yy === y ? vary(P.marble, x, yy, z, 0.03) : vary(P.limestone, x, yy, z, 0.04));
  }
  for (const x of [278, 349]) { stamp(statueBase(13, 14, 16, x), x, F, z1 + 5); stamp(equestrian(x & 1), x + 6, F + 14, z1 + 13, 3); }
  // the cella: thick walls, its great door open
  const cx0 = 281, cx1 = 359, cz0 = 34, cz1 = 65, base = top + 1, H = 32;
  const cella = facade({ field: P.plasterWhite, dado: mixc(P.plasterWhite, P.tuff, 0.3), dadoTop: 6, panels: false }, [{ u0: 28, u1: 50, v0: 0, v1: 24, kind: 'door' }], 4);
  wallX(w, cx0, cx1, cz1 - 2, cz1, base, H, cella);
  wallX(w, cx0, cx1, cz0, cz0 + 2, base, H, (u, v, x, y, z) => cella(u + 60, v, x, y, z));
  wallZ(w, cz0, cz1, cx0, cx0 + 2, base, H, (u, v, x, y, z) => cella(u + 60, v, x, y, z));
  wallZ(w, cz0, cz1, cx1 - 2, cx1, base, H, (u, v, x, y, z) => cella(u + 60, v, x, y, z));
  for (let x = cx0 + 3; x < cx1 - 2; x++) for (let z = cz0 + 3; z < cz1 - 2; z++) w.set(x, top, z, vary(0x8a8478, x, top, z, 0.05)); // the dim floor inside
  // the porch: three rows of six Corinthian columns
  for (const z of [78, 92, 106]) for (let k = 0; k < 6; k++) column(w, 285 + k * 14, z, base, H, 3, P.plasterWhite);
  for (let k = 0; k < 6; k++) for (let x = 285 + k * 14 - 3; x <= 285 + k * 14 + 3; x++) for (const z of [78, 92, 106]) w.set(x, base + H - 1, z, vary(0xe8dcc0, x, base + H - 1, z, 0.04)); // acanthus capitals, pale
  // the entablature and ceiling, then the roof and the pediment
  const ent = base + H;
  for (let x = x0 + 3; x <= x1 - 3; x++) for (let z = cz0; z <= z1; z++) for (let y = ent; y < ent + 3; y++) {
    const edge = x <= x0 + 4 || x >= x1 - 4 || z >= z1 - 1 || z <= cz0 + 1;
    if (!edge && y < ent + 2) continue;
    w.set(x, y, z, y === ent + 1 && edge ? vary(0xe8dcc0, x, y, z, 0.03) : vary(P.moulding, x, y, z, 0.03));
  }
  const eaves = ent + 3;
  gableRoofZ(w, x0 + 3, x1 - 3, cz0, z1, eaves, 2, 3);
  pediment(w, x0 + 3, x1 - 3, z1 + 1, -1, eaves, 3, 2);
  // scaffolding up the east side: the earthquake's damage is still being made good
  for (let z = 38; z <= 100; z += 10) for (let y = top + 1; y <= eaves + 4; y++) w.set(x1 - 1, y, z, P.wood);
  for (const yy of [top + 12, top + 24]) for (let z = 36; z <= 102; z++) { w.set(x1 - 1, yy, z, P.woodLight); w.set(x1 - 2, yy, z, P.woodLight); }
  stamp(drums(), x1 + 22, F, 58);
  L.spots.push({ id: 'forum-jupiter', x: 320, y: F, z: z1 + 28, r: 18, verb: 'look' });
  L.fires.push({ kind: 'lamp', x: 320, y: base + 10, z: cz1 + 2 });
}

/**
 * An honorary arch over the lane beside the temple: brick faced in marble, a niche for a statue in each
 * pier, a cornice and an attic with an inscription. Everything above head height goes into `upper`, which
 * steps aside when the hero walks through.
 */
function arch(w: VoxelWorld, upper: VoxelWorld, x0: number, x1: number): void {
  const z0 = 120, z1 = 135, wd = x1 - x0 + 1, pier = 6;
  const hole = archHole(pier, wd - pier * 2, 22);
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) for (let v = 0; v <= 43; v++) {
    const u = x - x0, y = F + v;
    if (hole(u, v)) continue;
    const face = z === z0 || z === z1;
    const niche = face && v >= 6 && v <= 17 && Math.abs(u - pier / 2 + 0.5) < 2 || face && v >= 6 && v <= 17 && Math.abs(u - (wd - pier / 2) + 0.5) < 2;
    let c: number;
    if (v === 0 || v === 36 || v === 37 || v === 43) c = vary(P.moulding, x, y, z, 0.03);
    else if (v > 37 && face && v >= 39 && v <= 41 && u > 6 && u < wd - 7) c = h3(x, y, 5) > 0.5 ? 0x5a5048 : vary(P.marble, x, y, z, 0.03); // the inscription
    else if (niche) c = vary(tint(P.marble, -0.2), x, y, z, 0.04);
    else c = quadratum(u + z, v, 8, 4, P.marble);
    (v > 18 ? upper : w).set(x, y, z, c);
  }
}

/** The lane behind the temple and the house fronts closing the north side. */
function northLane(w: VoxelWorld): void {
  for (let x = WEST_COL.back; x <= EAST_COL.back; x++) for (let z = 3; z <= 23; z++) w.set(x, PZ, z, basalt(x, z, 0.4));
  // the fronts of houses across the lane: doors shut, a shop's shutters, notices, balconies over the lane
  const style = { field: P.ochre, dado: P.redDark };
  const doors = [24, 70, 120, 168, 214];
  const f = facade(style, [], 11);
  const front: Face = (u, v, x, y, z) => {
    for (const d of doors) {
      if (u >= d && u <= d + 9 && v < 20) return v === 19 || u === d || u === d + 9 ? quadratum(u, v, 4, 3, P.tuff) : vary((u - d) % 3 === 0 ? P.woodDark : P.wood, x, y, z, 0.05);
      if (u >= d + 18 && u <= d + 34 && v < 18) return (u - d) % 4 === 0 ? P.woodDark : vary(P.shutter, x, y, z, 0.06); // shop shutters
    }
    const n = notice(22, u >> 5)(u % 46 - 12, v - 22);
    if (n !== null) return n;
    if (v >= 30 && v <= 34 && u % 20 >= 8 && u % 20 <= 11) return P.glowWindow;
    return f(u, v, x, y, z);
  };
  wallX(w, WEST_COL.back, EAST_COL.back, 0, 2, F, 40, front);
  for (let x = WEST_COL.back; x <= EAST_COL.back; x++) for (let v = 30; v <= 34; v++) if ((x - WEST_COL.back) % 20 >= 8 && (x - WEST_COL.back) % 20 <= 11) w.set(x, F + v, 2, P.glowWindow, true);
  roofPlane(w, WEST_COL.back - 1, EAST_COL.back + 1, 0, 6, (_x, z) => 95 - z / 3, 'z');
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// West

/** The sanctuary of Apollo: a portico round a courtyard, the temple on its podium, the altar and the sundial. */
function apollo(w: VoxelWorld, L: Level, stamp: Stamp): void {
  const x0 = 0, x1 = 203, z0 = 0, z1 = 209;
  const court = { x0: 25, x1: 178, z0: 25, z1: 184 };
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const inCourt = x >= court.x0 && x <= court.x1 && z >= court.z0 && z <= court.z1;
    const forecourt = inCourt && Math.abs(x - 101) < 44 && z > 24;
    w.set(x, PZ, z, !inCourt ? cocciopesto(x, z) : forecourt ? slabs(x, z, 2, 10, 7) : vary(mixc(P.sidewalkDust, P.limestone, noise2(x, z, 5, 83) * 0.6), x, PZ, z, 0.09));
  }
  // the walls: a painted front on Via Marina with the entrance, plain stucco elsewhere; toward the Forum it rises to the colonnade's roof
  const street = facade({ field: P.plasterWhite, dado: P.red }, [{ u0: 92, u1: 112, v0: 0, v1: 24, kind: 'door' }], 6);
  const prog = [notice(26, 1), notice(20, 2), notice(30, 3), notice(24, 4)];
  wallX(w, x0, x1, z1 - 2, z1, F, 34, (u, v, x, y, z) => {
    for (let i = 0; i < prog.length; i++) { const c = prog[i](u - (14 + i * 46 + (i > 1 ? 30 : 0)), v - 14); if (c !== null && z === z1) return c; }
    return street(u, v, x, y, z);
  });
  const plain = facade({ field: P.plasterWhite, dado: P.redDark, panels: false }, [], 6);
  wallX(w, x0, x1, z0, z0 + 2, F, 34, plain);
  wallZ(w, z0, z1, x0, x0 + 2, F, 34, plain);
  wallZ(w, z0, z1, x1 - 2, x1, F, 43, facade({ field: P.plasterWhite, dado: P.red }, [{ u0: 60, u1: 72, v0: 0, v1: 22, kind: 'door' }, { u0: 136, u1: 148, v0: 0, v1: 22, kind: 'door' }], 7));
  // the portico: columns round the courtyard, a beam on them, roofs sloping in from the walls
  const pc = { x0: 22, x1: 181, z0: 22, z1: 187 };
  for (let x = pc.x0; x <= pc.x1; x += 14) for (const z of [pc.z0, pc.z1]) column(w, x, z, F, 22, 2, P.plasterWhite);
  for (let z = pc.z0 + 14; z < pc.z1; z += 14) for (const x of [pc.x0, pc.x1]) column(w, x, z, F, 22, 2, P.plasterWhite);
  for (let x = pc.x0 - 2; x <= pc.x1 + 2; x++) for (const z of [pc.z0, pc.z1]) for (let y = F + 22; y <= F + 23; y++) for (let k = -1; k <= 1; k++) w.set(x, y, z + k, vary(P.moulding, x, y, z, 0.03));
  for (let z = pc.z0 - 2; z <= pc.z1 + 2; z++) for (const x of [pc.x0, pc.x1]) for (let y = F + 22; y <= F + 23; y++) for (let k = -1; k <= 1; k++) w.set(x + k, y, z, vary(P.moulding, x, y, z, 0.03));
  roofPlane(w, 3, 200, 3, pc.z0 + 1, (_x, z) => F + 33 - (z - 3) / 2.2, 'z');
  roofPlane(w, 3, 200, pc.z1 - 1, 206, (_x, z) => F + 33 - (206 - z) / 2.2, 'z');
  roofPlane(w, 3, pc.x0 + 1, pc.z0 + 2, pc.z1 - 2, (x) => F + 33 - (x - 3) / 2.2, 'x');
  roofPlane(w, pc.x1 - 1, 200, pc.z0 + 2, pc.z1 - 2, (x) => F + 33 - (200 - x) / 2.2, 'x');
  // the temple: a podium, stairs up the front, columns all round, the cella, a low roof
  const tx0 = 72, tx1 = 131, tz0 = 30, tz1 = 113, ptop = PZ + 12;
  for (let x = tx0; x <= tx1; x++) for (let z = tz0; z <= tz1; z++) for (let y = F; y <= ptop; y++) {
    const edge = x === tx0 || x === tx1 || z === tz0 || z === tz1;
    if (!edge && y < ptop) continue;
    w.set(x, y, z, y === ptop ? vary(edge ? P.moulding : P.marble, x, y, z, 0.03) : y <= F ? vary(P.moulding, x, y, z, 0.03) : quadratum(x + z, y, 8, 3, P.tuff));
  }
  for (let x = 88; x <= 115; x++) for (let z = tz1 + 1; z <= tz1 + 18; z++) {
    const y = Math.min(ptop, PZ + 2 * (Math.floor((tz1 + 18 - z) / 3) + 1));
    for (let yy = PZ; yy <= y; yy++) w.set(x, yy, z, yy === y ? vary(P.limestone, x, yy, z, 0.04) : vary(P.tuff, x, yy, z, 0.05));
  }
  const cbase = ptop + 1, CH = 20;
  for (const x of [76, 86, 97, 107, 117, 127]) for (const z of [36, 108]) column(w, x, z, cbase, CH, 2, P.plasterWhite);
  for (let z = 46; z <= 98; z += 10) for (const x of [76, 127]) column(w, x, z, cbase, CH, 2, P.plasterWhite);
  const cellaFace = facade({ field: P.yellow, dado: P.red, dadoTop: 6 }, [{ u0: 12, u1: 20, v0: 0, v1: 14, kind: 'door' }], 8);
  wallX(w, 86, 117, 92, 94, cbase, CH, cellaFace);
  wallX(w, 86, 117, 42, 44, cbase, CH, (u, v, x, y, z) => cellaFace(u + 40, v, x, y, z));
  wallZ(w, 42, 94, 86, 88, cbase, CH, (u, v, x, y, z) => cellaFace(u + 40, v, x, y, z));
  wallZ(w, 42, 94, 115, 117, cbase, CH, (u, v, x, y, z) => cellaFace(u + 40, v, x, y, z));
  for (let x = tx0 + 2; x <= tx1 - 2; x++) for (let z = tz0 + 2; z <= tz1 - 2; z++) {
    const edge = x <= tx0 + 6 || x >= tx1 - 6 || z <= tz0 + 8 || z >= tz1 - 7;
    if (edge) w.set(x, cbase + CH, z, vary(P.moulding, x, cbase + CH, z, 0.03));
  }
  gableRoofZ(w, tx0 + 2, tx1 - 2, tz0 + 2, tz1 - 2, cbase + CH + 1, 2, 4);
  pediment(w, tx0 + 2, tx1 - 2, tz1, -1, cbase + CH + 1, 4, 2);
  // the altar before the steps; the sundial on its column to the left; Apollo and Diana drawing their bows
  stamp(altar(false), 96, F, 142);
  stamp(sundial(), 66, F, 144);
  stamp(statueBase(7, 8, 7, 3), 166, F, 96); stamp(archer(false), 169, F + 8, 99, 3);
  stamp(statueBase(7, 8, 7, 4), 31, F, 96); stamp(archer(true), 34, F + 8, 99, 1);
  L.trees.push({ kind: 'cypress', variant: 0, x: 42, y: F, z: 42 }, { kind: 'cypress', variant: 1, x: 160, y: F, z: 42 });
  L.trees.push({ kind: 'oleander', variant: 1, x: 42, y: F, z: 170 }, { kind: 'oleander', variant: 0, x: 160, y: F, z: 172 });
  L.fires.push({ kind: 'lamp', x: 101, y: cbase + 8, z: 96 });
  L.spots.push({ id: 'forum-sundial', x: 66, y: F, z: 158, r: 14, verb: 'look' });
  // the sign painter's ladder against the street wall
  stamp(ladder(30), 64, F, 210);
}

/** The Basilica: outer walls, an aisle round a great colonnade, the nave open to the sky, the tribunal at the far end. */
function basilica(w: VoxelWorld, L: Level, stamp: Stamp): void {
  const x0 = 0, x1 = 203, z0 = 266, z1 = 447;
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const nave = x > 36 && x < 167 && z > 298 && z < 414;
    w.set(x, PZ, z, nave ? tint(mixc(slabs(x, z, 7, 10, 10), P.tuff, 0.4), -0.03) : cocciopesto(x, z));
  }
  const outside = facade({ field: P.plasterWhite, dado: P.tuffWarm, panels: false }, [{ u0: 92, u1: 108, v0: 0, v1: 16, kind: 'door' }], 9);
  wallX(w, x0, x1, z0, z0 + 2, F, 20, (u, v, x, y, z) => {
    const n = notice(24, 7)(u - 30, v - 13) ?? notice(30, 8)(u - 140, v - 13);
    return n !== null && z === z0 ? n : outside(u, v, x, y, z);
  });
  wallZ(w, z0, z1, x0, x0 + 2, F, 32, firstStyle(1));
  wallX(w, x0, x1, z1 - 2, z1, F, 24, firstStyle(2));
  const doors: Opening[] = [14, 38, 62, 86, 110].map((u) => ({ u0: u, u1: u + 12, v0: 0, v1: 24, kind: 'door' as const }));
  wallZ(w, z0, z1, x1 - 2, x1, F, 43, facade({ field: P.plasterWhite, dado: P.red }, doors, 10));
  // First Style inside: plaster modelled as coloured marble blocks
  const fs = firstStyle(0);
  for (let x = x0 + 3; x <= x1 - 3; x++) for (let v = 0; v < 20; v++) if (w.has(x, F + v, z0 + 2)) w.set(x, F + v, z0 + 2, fs(x, v, x, F + v, z0 + 2) ?? P.plasterWhite);
  for (let z = z0 + 3; z <= z1 - 3; z++) for (let v = 0; v < 43; v++) if (w.has(x1 - 2, F + v, z)) w.set(x1 - 2, F + v, z, fs(z, v, x1 - 2, F + v, z) ?? P.plasterWhite);
  // graffiti scratched into the plaster by the north door: names, sums, a little poem
  for (let x = 70; x <= 130; x++) for (let v = 4; v <= 12; v++) if (h3(x, v, 31) > 0.86 && (x < 92 || x > 108)) w.set(x, F + v, z0 + 2, 0x4a4038);
  // the great colonnade round the nave: 10 by 4 columns of brick, stuccoed (two still bare, waiting for the plasterers)
  const nx0 = 34, nx1 = 169, nz0 = 296, nz1 = 416, CH = 40;
  const cols: [number, number][] = [];
  for (let k = 0; k < 10; k++) cols.push([nx0 + Math.round((k * (nx1 - nx0)) / 9), nz0], [nx0 + Math.round((k * (nx1 - nx0)) / 9), nz1]);
  for (const z of [326, 356, 386]) cols.push([nx0, z], [nx1, z]);
  cols.forEach(([x, z], i) => {
    column(w, x, z, F, CH, 3, i === 5 || i === 12 ? P.brick : 0xebe0c8);
    if (i === 5 || i === 12) for (let y = F; y < F + CH; y++) for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) if (w.has(x + dx, y, z + dz) && (y + dx + dz) % 3 === 0) w.set(x + dx, y, z + dz, tint(P.brick, -0.15));
  });
  for (let x = nx0 - 3; x <= nx1 + 3; x++) for (const z of [nz0, nz1]) for (let y = F + CH; y <= F + CH + 1; y++) for (let k = -2; k <= 2; k++) w.set(x, y, z + k, vary(P.moulding, x, y, z + k, 0.03));
  for (let z = nz0 - 3; z <= nz1 + 3; z++) for (const x of [nx0, nx1]) for (let y = F + CH; y <= F + CH + 1; y++) for (let k = -2; k <= 2; k++) w.set(x + k, y, z, vary(P.moulding, x + k, y, z, 0.03));
  // the aisle roofs, high at the colonnade, down to the outer walls
  const top = F + CH + 2;
  roofPlane(w, 3, x1 - 3, z0 + 3, nz0 - 3, (_x, z) => F + 20 + ((z - z0 - 3) / (nz0 - z0 - 6)) * (top - F - 20), 'z');
  // the south aisle's roof is being retiled: its rafters bare, a few courses of tiles back on at the top
  const south = (z: number) => Math.round(top - ((z - nz1 - 3) / (z1 - nz1 - 6)) * (top - F - 24));
  for (let x = 3; x <= x1 - 3; x++) for (let z = nz1 + 3; z <= z1 - 3; z++) {
    if (z < nz1 + 9) w.set(x, south(z), z, vary(((Math.floor(z / 3) + Math.floor(x / 4)) & 1) ? P.tile : P.tileDark, x, south(z), z, 0.07));
    else if (x % 7 === 0) w.set(x, south(z), z, vary(P.wood, x, south(z), z, 0.06));
    else if ((z - nz1) % 9 === 0) w.set(x, south(z) + 1, z, vary(P.woodLight, x, south(z) + 1, z, 0.06));
  }
  for (let k = 0; k < 4; k++) solid(w, 120 + k * 9, F, 425, 125 + k * 9, F + 2 + k, 429, (x, y, z) => vary((y & 1) ? P.tile : P.tileDark, x, y, z, 0.06)); // stacks of new tiles waiting
  roofPlane(w, 3, nx0 - 3, nz0 - 2, nz1 + 2, (x) => F + 32 + ((x - 3) / (nx0 - 6)) * (top - F - 32), 'x');
  roofPlane(w, nx1 + 3, x1 - 3, nz0 - 2, nz1 + 2, () => top, 'x');
  // the tribunal at the west end: a raised platform behind a row of columns, where the magistrates sat
  solid(w, 4, F, 326, 26, F + 12, 386, (x, y, z) => (y === F + 12 ? vary(P.marble, x, y, z, 0.03) : quadratum(z, y, 6, 3, P.tuffWarm)));
  for (let z = 330; z <= 382; z += 13) column(w, 26, z, F + 13, 24, 2, P.plasterWhite);
  // in the nave: a bench, a table where a deal is being written up, amphorae of a merchant's samples
  // in the nave: a money changer, a scribe writing up a sale, merchants' samples, a crowd's benches facing the tribunal
  stamp(dolium(), 60, PZ - 3, 330); stamp(amphora(0), 66, F, 336); stamp(amphora(2), 70, F, 334); stamp(amphora(1), 62, F, 340);
  stamp(moneyTable(), 120, F, 318); stamp(moneyTable(), 74, F, 402);
  stamp(bench(14, true), 86, F, 344); stamp(bench(12), 87, F, 352); stamp(bench(12), 87, F, 338);
  for (const z of [330, 344, 358, 372, 386]) stamp(bench(16), 44, F, z, 1);
  stamp(mat(10, 7, 0x8a7a5a, 'cloth'), 132, F, 366); stamp(mat(8, 8, 0x6a5a4a, 'pots'), 104, F, 392);
  for (const [x, z] of [[146, 340], [150, 344], [144, 348]] as const) solid(w, x, F, z, x + 3, F + 3, z + 2, (xx, y, zz) => vary(0xd8cdb0, xx, y, zz, 0.08)); // sacks of grain, samples for a buyer
  L.props.push({ kind: 'table', variant: 0, x: 128, y: F, z: 396 }, { kind: 'amphora', variant: 2, x: 156, y: F, z: 330 }, { kind: 'amphora', variant: 0, x: 160, y: F, z: 333 });
  L.spots.push({ id: 'forum-basilica', x: 112, y: F, z: 282, r: 16, verb: 'read' });
}

/**
 * A two-storey colonnade along z, between the building walls (`back`) and the piazza (`front`): a step up,
 * Doric columns below (the old grey tuff ones at the south end, new limestone elsewhere), an architrave
 * carrying the gallery floor, slimmer columns and a parapet above, a tiled roof sloping to the piazza.
 */
function colonnade(w: VoxelWorld, c: { back: number; front: number; col: number }, z0: number, z1: number, side: 'west' | 'east'): void {
  const xa = Math.min(c.back, c.front), xb = Math.max(c.back, c.front);
  const LOWER = 21, ARCH = 3, UPPER = 11;
  for (let x = xa; x <= xb; x++) for (let z = z0; z <= z1; z++) {
    const stylobate = Math.abs(x - c.col) <= 3 || x === c.front;
    w.set(x, F, z, stylobate ? vary(P.limestone, x, F, z, 0.04) : cocciopesto(x, z));
  }
  for (let z = z0 + 6; z <= z1 - 4; z += 12) {
    const stone = z > 300 && side === 'west' ? P.tuff : P.limestone;
    doubleColumn(w, c.col, z, F + 1, LOWER, UPPER, ARCH, stone);
  }
  const ay = F + 1 + LOWER;
  for (let z = z0; z <= z1; z++) {
    // the architrave on the columns, the gallery floor behind it
    for (let x = xa; x <= xb; x++) w.set(x, ay + ARCH - 1, z, vary(P.woodDark, x, ay + ARCH - 1, z, 0.05));
    for (let x = c.col - 2; x <= c.col + 2; x++) for (let y = ay; y < ay + ARCH; y++) w.set(x, y, z, vary(y === ay ? P.moulding : P.plasterWhite, x, y, z, 0.03));
    // the upper parapet between the columns, and the upper architrave
    for (let y = ay + ARCH; y < ay + ARCH + 3; y++) if (!w.has(c.col, y, z)) w.set(c.col, y, z, vary(P.plasterWhite, c.col, y, z, 0.03));
    for (let x = c.col - 1; x <= c.col + 1; x++) for (let y = ay + ARCH + UPPER; y <= ay + ARCH + UPPER + 1; y++) w.set(x, y, z, vary(P.moulding, x, y, z, 0.03));
  }
  const yTop = ay + ARCH + UPPER + 2;
  roofPlane(w, xa, xb, z0, z1, (x) => 95 - (Math.abs(x - c.back) / (xb - xa)) * (95 - yTop), 'x');
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// East

/** The Macellum: shops round a courtyard, the tholos over its basin in the middle, the shrine at the back. */
function macellum(w: VoxelWorld, L: Level, stamp: Stamp, prop: Prop): void {
  const x0 = 436, x1 = 639, z0 = 0, z1 = 151;
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) w.set(x, PZ, z, x > 459 && x < 611 && z > 23 && z < 127 ? slabs(x, z, 3, 9, 9) : cocciopesto(x, z));
  // the Forum front: the entrance between shops (the money changers' tabernae), rising to the colonnade's roof
  const front: Opening[] = [{ u0: 66, u1: 86, v0: 0, v1: 28, kind: 'arch' }, ...[8, 28, 46, 92, 110, 128].map((u) => ({ u0: u, u1: u + 13, v0: 0, v1: 20, kind: 'shop' as const }))];
  wallZ(w, z0, z1, x0, x0 + 2, F, 43, facade({ field: P.plasterWhite, dado: P.red }, front, 12));
  wallX(w, x0, x1, z0, z0 + 2, F, 40, facade({ field: P.plasterWhite, dado: P.redDark, panels: false }, [], 12));
  wallX(w, x0, x1, z1 - 2, z1, F, 20, facade({ field: P.ochre, dado: P.redDark }, [], 13));
  wallZ(w, z0, z1, x1 - 2, x1, F, 42, facade({ field: P.plasterWhite, dado: P.redDark, panels: false }, [], 13));
  // the tabernae behind the front: a back wall, partitions, a roof
  wallZ(w, z0 + 3, z1 - 3, 457, 459, F, 34, facade({ field: P.plasterWhite, dado: P.red }, [{ u0: 63, u1: 84, v0: 0, v1: 28, kind: 'arch' }], 14));
  for (const z of [26, 44, 62, 89, 107, 125]) wallX(w, 439, 456, z, z + 1, F, 34, facade({ field: P.ochre, dado: P.red }, [], 14));
  for (let x = 439; x <= 459; x++) for (let z = 3; z <= z1 - 3; z++) if (z < 64 || z > 88) w.set(x, F + 34, z, roofTileAt(x, z));
  // shops along the north and south sides, open to the courtyard
  for (let x = 462; x <= 610; x += 18) { wallZ(w, 3, 23, x, x + 1, F, 32, facade({ field: P.ochre, dado: P.red }, [], 15)); wallZ(w, 127, 148, x, x + 1, F, 20, facade({ field: P.ochre, dado: P.red }, [], 15)); }
  roofPlane(w, 460, 612, 3, 25, (_x, z) => F + 39 - (z - 3) / 4, 'z');
  roofPlane(w, 460, 612, 125, 150, (_x, z) => F + 23 - (z - 125) / 8, 'z');
  for (let x = 464; x < 610; x += 18) { prop('amphora', x % 3, x + 5, 10); prop('amphora', (x + 1) % 3, x + 9, 9); stamp(crate(['grapes', 'figs', 'bread', 'fish'][(x >> 2) % 4] as 'grapes'), x + 6, F, 136); }
  // the east side: a hall, the shrine of the imperial family (statues on a podium in an apse), the fish and meat market
  const back = facade({ field: P.red, dado: P.black }, [{ u0: 14, u1: 30, v0: 0, v1: 24, kind: 'door' }, { u0: 54, u1: 92, v0: 0, v1: 30, kind: 'arch' }, { u0: 116, u1: 132, v0: 0, v1: 24, kind: 'door' }], 16);
  wallZ(w, 3, z1 - 3, 611, 613, F, 34, back);
  for (const z of [46, 103]) wallX(w, 614, 636, z, z + 1, F, 38, facade({ field: P.red, dado: P.black }, [], 16));
  solid(w, 624, F, 62, 636, F + 7, 92, (x, y, z) => (y === F + 7 ? vary(P.marble, x, y, z, 0.03) : quadratum(z, y, 6, 3, P.marble)));
  for (const z of [70, 84]) { stamp(statueBase(5, 6, 5, z), 628, F + 8, z - 2); stamp(togatus(z === 70 ? 0 : 2), 630, F + 14, z, 3); }
  L.fires.push({ kind: 'lamp', x: 622, y: F + 12, z: 77 });
  solid(w, 616, F, 140, 636, F + 6, 145, (x, y, z) => (y === F + 6 ? vary(P.marble, x, y, z, 0.03) : vary(P.mortar, x, y, z, 0.05))); // the marble counter for fish
  roofPlane(w, 611, 638, 3, z1 - 3, (x) => F + 41 - (638 - x) / 4, 'x');
  // the tholos: twelve columns round the basin, a ring of roof open over the water
  const cx = 536, cz = 75;
  for (let x = cx - 28; x <= cx + 28; x++) for (let z = cz - 28; z <= cz + 28; z++) {
    const r = Math.hypot(x - cx, z - cz);
    if (r <= 27) w.set(x, F, z, vary(r > 25 ? P.limestone : P.marble, x, F, z, 0.03));
    if (r >= 10 && r <= 27) {
      const y = Math.round(F + 31 - (r - 10) / 4);
      w.set(x, y, z, r > 26 ? vary(P.woodDark, x, y, z, 0.05) : vary(((Math.floor(Math.atan2(z - cz, x - cx) * 12)) & 1) ? P.tile : P.tileDark, x, y, z, 0.07));
    }
    if (r >= 20 && r <= 24) for (let y = F + 25; y <= F + 27; y++) w.set(x, y, z, vary(P.moulding, x, y, z, 0.03));
  }
  for (let k = 0; k < 12; k++) column(w, Math.round(cx + Math.cos((k * Math.PI) / 6) * 22), Math.round(cz + Math.sin((k * Math.PI) / 6) * 22), F + 1, 24, 2, P.plasterWhite);
  const bx0 = cx - 9, bx1 = cx + 9, bz0 = cz - 9, bz1 = cz + 9;
  for (let x = bx0; x <= bx1; x++) for (let z = bz0; z <= bz1; z++) {
    const rim = x === bx0 || x === bx1 || z === bz0 || z === bz1;
    if (rim) for (let y = F + 1; y <= F + 3; y++) w.set(x, y, z, vary(P.marble, x, y, z, 0.03));
    else { w.set(x, F, z, vary(0x5f9aa0, x, F, z, 0.08)); w.set(x, F - 1, z, vary(0x4f8890, x, F - 1, z, 0.08)); }
  }
  for (let y = F; y <= F + 5; y++) w.set(cx, y, cz, vary(P.marble, cx, y, cz, 0.03)); // the spout
  L.water.push({ x: bx0 + 1, z: bz0 + 1, w: bx1 - bx0 - 1, d: bz1 - bz0 - 1, level: F + 2.4, floor: F + 0.2, kind: 'pool' });
  L.jets.push({ x: cx + 0.5, y: F + 6, z: cz + 0.5, dir: [0, 1] });
  // stalls round the tholos: Iucunda's fruit, fish, bread, figs; the hot-food counter in the corner
  stamp(stall(18, 'grapes', P.yellow, 'corner'), 480, F, 101);
  stamp(stall(12, 'apples', P.yellow), 500, F, 101);
  stamp(stall(14, 'fish', 0x3f6a9a), 560, F, 101);
  stamp(stall(14, 'bread', P.red), 480, F, 38);
  stamp(stall(14, 'figs', P.green), 562, F, 38);
  stamp(stall(10, 'cheese', P.plasterWhite), 520, F, 38);
  stamp(counter(16), 588, F, 112);
  L.fires.push({ kind: 'hearth', x: 601, y: F + 9, z: 106 });
  L.smoke.push({ kind: 'smoke', x: 601, y: F + 16, z: 106 });
  for (let i = 0; i < 3; i++) prop('fish', i, 566 + i * 4, 112);
  prop('grapes', 1, 470, 112); prop('figs', 1, 474, 116);
  L.spots.push({ id: 'forum-tholos', x: cx, y: F, z: cz + 34, r: 18, verb: 'look' });
}

/** The Sanctuary of the Public Lares: open to the Forum, an apse at the back, niches in the side walls, marble floor, no roof. */
function lares(w: VoxelWorld, L: Level, stamp: Stamp): void {
  const x0 = 436, x1 = 639, z0 = 149, z1 = 215;
  // opus sectile: squares of white marble framed in green cipollino, a lozenge of giallo antico or red africano in each
  for (let x = x0; x <= 600; x++) for (let z = z0; z <= z1; z++) {
    const u = x % 12, v = z % 12, lozenge = Math.abs(u - 6) + Math.abs(v - 6) < 4;
    const c = u === 0 || v === 0 ? 0x8a9a7a : lozenge ? ((Math.floor(x / 12) + Math.floor(z / 12)) & 1 ? 0xd9c08a : 0xa86a5a) : P.marble;
    w.set(x, PZ, z, vary(c, x, PZ, z, 0.04));
  }
  const marble: Face = (u, v, x, y, z) => (v < 2 || v === 30 ? vary(P.moulding, x, y, z, 0.03) : quadratum(u, v, 10, 6, (Math.floor(u / 10) + Math.floor(v / 6)) % 3 === 0 ? 0xd9c7a8 : P.marble));
  wallZ(w, z0 + 3, z1, x0, x0 + 2, F, 43, (u, v, x, y, z) => (u > 7 && u < z1 - z0 - 9 && v <= 28 ? null : marble(u, v, x, y, z)));
  // niches for the statues of the gods in both side walls (the north one backs onto the Macellum's shops)
  const niches = (u: number, v: number) => (u >= 40 && u <= 56 || u >= 84 && u <= 100) && v >= 5 && v <= 15;
  wallX(w, x0 + 3, 600, z1 - 2, z1, F, 20, (u, v, x, y, z) => (niches(u + 3, v) && z !== z1 ? null : marble(u + 3, v, x, y, z)));
  for (let x = x0 + 3; x <= 600; x++) for (let v = 0; v < 20; v++) {
    const u = x - x0;
    if (niches(u, v)) { w.delete(x, F + v, z0 + 1); w.delete(x, F + v, z0 + 2); w.set(x, F + v, z0, vary(P.marble, x, F + v, z0, 0.03)); }
    else w.set(x, F + v, z0 + 2, marble(u, v, x, F + v, z0 + 2) ?? P.marble);
  }
  // the apse
  const ax = 572, az = 182, R = 30;
  for (let x = ax; x <= ax + R + 2; x++) for (let z = z0; z <= z1; z++) {
    const r = Math.hypot(x - ax, z - az);
    if (r >= R - 2 && r <= R + 1 || x > ax + R - 2 && (r > R + 1)) for (let v = 0; v < 30; v++) w.set(x, F + v, z, marble(z, v, x, F + v, z) ?? P.marble);
  }
  stamp(statueBase(6, 10, 5, 2), ax + 14, F, az - 3); stamp(togatus(1), ax + 17, F + 10, az, 3);
  stamp(altar(false), 506, F, az - 4);
  L.fires.push({ kind: 'lamp', x: ax + 12, y: F + 12, z: az });
  // behind the apse, rooms of the house next door with a roof sloping to the west
  wallZ(w, z0 + 3, z1, 603, 605, F, 36, facade({ field: P.plasterWhite, dado: P.redDark, panels: false }, [], 17));
  roofPlane(w, 603, x1, z0 + 3, z1, (x) => 95 - (x1 - x) / 6, 'x');
  L.spots.push({ id: 'forum-lares', x: 448, y: F, z: az, r: 16, verb: 'look' });
}

/** The Temple of Vespasian: a court with a marble altar carved with a sacrifice, the little temple on its podium at the back. */
function vespasian(w: VoxelWorld, L: Level, stamp: Stamp): void {
  const x0 = 436, x1 = 639, z0 = 216, z1 = 286;
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) w.set(x, PZ, z, slabs(x, z, 9, 8, 8));
  const panels = facade({ field: P.red, dado: P.black }, [], 18);
  wallZ(w, z0, z1, x0, x0 + 2, F, 43, facade({ field: P.plasterWhite, dado: P.red }, [{ u0: 27, u1: 45, v0: 0, v1: 26, kind: 'door' }], 18));
  wallX(w, x0 + 3, x1, z1 - 2, z1, F, 20, panels);
  // marble jambs on the door
  for (let z = z0 + 25; z <= z0 + 47; z++) for (let v = 0; v <= 28; v++) if (z <= z0 + 26 || z >= z0 + 46 || v >= 27) w.set(x0, F + v, z, vary(P.marble, x0, F + v, z, 0.03));
  stamp(altar(true), 509, F, 246, 3);
  // the court's walls: painted aediculae (little framed niches) between pilasters, as on the real walls
  for (const z of [z0 - 1, z1 - 2]) for (let x = 452; x <= 540; x += 22) for (let v = 0; v < 20; v++) for (let k = 0; k < 9; k++) {
    const zz = z, xx = x + k;
    const frame = k === 0 || k === 8 || v === 16 || v === 17;
    if (frame) w.set(xx, F + v, zz, vary(P.marble, xx, F + v, zz, 0.03));
    else if (v >= 4 && v < 16) w.set(xx, F + v, zz, plaster(0x3a3a4a, xx, v, 3));
  }
  for (const z of [232, 270]) column(w, 448, z, F, 24, 2, P.marble);
  for (let x = 439; x <= 452; x++) for (let z = z0; z <= z1 - 3; z++) w.set(x, F + 24, z, vary(P.moulding, x, F + 24, z, 0.03));
  roofPlane(w, 439, 452, z0, z1 - 3, (x) => F + 30 - (x - 439) / 2.4, 'x');
  L.trees.push({ kind: 'oleander', variant: 1, x: 532, y: F, z: 226 }, { kind: 'oleander', variant: 0, x: 532, y: F, z: 278 });
  // the temple: podium, a porch of four columns, the cella, a gable roof facing the court
  const tx0 = 556, tx1 = 609, tz0 = 228, tz1 = 276, ptop = PZ + 10;
  solid(w, tx0, F, tz0, tx1, ptop, tz1, (x, y, z) => (y === ptop ? vary(P.marble, x, y, z, 0.03) : quadratum(z + x, y, 8, 3, P.marble)));
  for (let x = tx0 - 10; x < tx0; x++) for (let z = 242; z <= 262; z++) { const y = Math.min(ptop, PZ + (x - tx0 + 11)); for (let yy = PZ; yy <= y; yy++) w.set(x, yy, z, vary(P.marble, x, yy, z, 0.03)); }
  for (const z of [232, 245, 259, 272]) column(w, 561, z, ptop + 1, 22, 2, P.marble);
  const cella = facade({ field: P.marble, dado: P.marble, panels: false }, [{ u0: 16, u1: 24, v0: 0, v1: 16, kind: 'door' }], 19);
  wallZ(w, 236, 268, 568, 570, ptop + 1, 22, cella);
  wallZ(w, 236, 268, 604, 606, ptop + 1, 22, (u, v, x, y, z) => cella(u + 40, v, x, y, z));
  wallX(w, 568, 606, 236, 238, ptop + 1, 22, (u, v, x, y, z) => cella(u + 40, v, x, y, z));
  wallX(w, 568, 606, 266, 268, ptop + 1, 22, (u, v, x, y, z) => cella(u + 40, v, x, y, z));
  for (let x = 558; x <= 607; x++) for (let z = 230; z <= 274; z++) w.set(x, ptop + 23, z, vary(P.moulding, x, ptop + 23, z, 0.03));
  gableRoofX(w, 558, 607, 230, 274, ptop + 24, 2);
  const zc = 252, half = 24;
  for (let z = 230; z <= 274; z++) { const t = ptop + 24 + Math.floor((half - Math.abs(z - zc)) / 3) - 1; for (let y = ptop + 22; y <= t; y++) for (const x of [557, 558]) w.set(x, y, z, y >= t - 1 ? vary(P.moulding, x, y, z, 0.03) : vary(P.marble, x, y, z, 0.03)); }
  wallZ(w, z0, z1 - 3, 612, 614, F, 37, facade({ field: P.plasterWhite, dado: P.redDark, panels: false }, [], 20));
  roofPlane(w, 612, 639, z0, z1, (x) => 95 - (639 - x) / 6, 'x');
  L.fires.push({ kind: 'lamp', x: 503, y: F + 9, z: 252 });
  L.spots.push({ id: 'forum-vespasian', x: 490, y: F, z: 252, r: 16, verb: 'look' });
}

/** The Building of Eumachia: the acanthus doorway on the Forum, a courtyard with a portico, the statue of Concordia Augusta in the apse. */
function eumachia(w: VoxelWorld, L: Level, stamp: Stamp, prop: Prop): void {
  const x0 = 436, x1 = 639, z0 = 287, z1 = 359;
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) w.set(x, PZ, z, x > 468 && x < 598 && z > 302 && z < 346 ? slabs(x, z, 11) : vary(P.marble, x, PZ, z, 0.04));
  const door = { u0: 28, u1: 46 };
  wallZ(w, z0, z1, x0, x0 + 2, F, 43, (u, v, x, y, z) => {
    if (u >= door.u0 && u <= door.u1 && v <= 26) return null;
    // the marble frame: jambs and lintel carved with acanthus scrolls
    if (x === x0 && u >= door.u0 - 7 && u <= door.u1 + 7 && v <= 33) {
      if (u < door.u0) return acanthus(v, door.u0 - 1 - u, x, y, z);
      if (u > door.u1) return acanthus(v, u - door.u1 - 1, x, y, z);
      return acanthus(u, v - 27, x, y, z);
    }
    if (x === x0 && v >= 36 && v <= 39 && u > 4 && u < z1 - z0 - 4) return h3(u, v, 40) > 0.5 && v !== 36 && v !== 39 ? 0x5a5048 : vary(P.marble, x, y, z, 0.03); // her name along the front
    return quadratum(u, v, 10, 5, P.marble);
  });
  // the south side on Via dell'Abbondanza: a side door, an inscription over it, notices
  const side = facade({ field: P.plasterWhite, dado: P.red }, [{ u0: 148, u1: 160, v0: 0, v1: 22, kind: 'door' }], 21);
  wallX(w, x0, x1, z1 - 2, z1, F, 28, (u, v, x, y, z) => {
    if (z === z1 && u >= 144 && u <= 164 && v >= 23 && v <= 27) return v === 23 || v === 27 ? P.moulding : h3(u, v, 41) > 0.5 ? 0x5a5048 : P.marble;
    const n = notice(28, 12)(u - 40, v - 13) ?? notice(22, 13)(u - 90, v - 13);
    return n !== null && z === z1 ? n : side(u, v, x, y, z);
  });
  wallZ(w, z0, z1, x1 - 2, x1, F, 40, facade({ field: P.plasterWhite, dado: P.redDark, panels: false }, [], 22));
  // the courtyard's portico and its roofs
  for (let x = 468; x <= 598; x += 13) for (const z of [302, 346]) column(w, x, z, F, 24, 2, P.marble);
  for (const z of [315, 333]) for (const x of [468, 598]) column(w, x, z, F, 24, 2, P.marble);
  roofPlane(w, 471, 595, z0, 304, (_x, z) => F + 20 + (z - z0) / 4, 'z');
  roofPlane(w, 471, 595, 344, z1 - 3, (_x, z) => F + 24 + (z - 344) / 6, 'z');
  roofPlane(w, 439, 470, z0, z1 - 3, (x) => F + 41 - (x - 439) / 2.6, 'x');
  roofPlane(w, 596, 636, z0, z1 - 3, (x) => F + 26 + (x - 596) / 2.6, 'x');
  for (const [za, zb] of [[z0, 304], [344, z1 - 3]] as const) { wallZ(w, za, zb, 469, 470, F, 30, facade({ field: P.plasterWhite, dado: P.red, panels: false }, [], 22)); wallZ(w, za, zb, 596, 597, F, 26, facade({ field: P.plasterWhite, dado: P.red, panels: false }, [], 22)); }
  // the apse with Concordia Augusta, Eumachia's own statue before it (the fullers paid for it)
  stamp(statueBase(7, 10, 6, 5), 612, F, 320); stamp(togatus(0), 615, F + 10, 323, 3);
  stamp(statueBase(6, 8, 5, 6), 584, F, 321); stamp(togatus(2), 587, F + 8, 323, 3);
  // wool for sale
  stamp(woolBales(4), 480, F, 308); stamp(woolBales(3), 540, F, 336); stamp(woolBales(4), 572, F, 308);
  prop('amphora', 0, 446, 300); prop('amphora', 2, 449, 352);
  L.spots.push({ id: 'forum-eumachia', x: 426, y: F, z: z0 + 33, r: 16, verb: 'read' });
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// South (kept low: the camera looks north over it)

/** The old tuff portico across the south end, and the three halls of the town's government behind it. */
function southEnd(w: VoxelWorld, stamp: Stamp): void {
  const z0 = 392, z1 = 403;
  for (let x = WEST_COL.back; x <= PIAZZA.x1; x++) for (let z = z0; z <= z1; z++) w.set(x, F, z, z <= z0 + 2 ? vary(P.tuff, x, F, z, 0.05) : cocciopesto(x, z));
  for (let x = WEST_COL.back + 6; x <= PIAZZA.x1 - 3; x += 12) column(w, x, z0 + 2, F + 1, 20, 2, P.tuff);
  for (let x = WEST_COL.back; x <= PIAZZA.x1; x++) for (let y = F + 21; y <= F + 22; y++) for (let z = z0; z <= z0 + 4; z++) w.set(x, y, z, vary(y === F + 22 ? P.moulding : P.tuffWarm, x, y, z, 0.04));
  roofPlane(w, WEST_COL.back, PIAZZA.x1, z0, z1, (_x, z) => F + 23 + (z - z0) / 6, 'z');
  stamp(statueBase(14, 3, 4, 0), 326, F, 399); stamp(statueBase(14, 3, 4, 1), 220, F, 399); // marble benches against the halls
  // the halls: the council in the middle, magistrates' offices either side; a wide door each, gable roofs
  const halls: [number, number][] = [[204, 270], [274, 336], [340, 403]];
  for (const [hx0, hx1] of halls) {
    for (let x = hx0; x <= hx1; x++) for (let z = 404; z < D; z++) w.set(x, PZ, z, vary(P.marble, x, PZ, z, 0.04));
    const mid = Math.round((hx1 - hx0) / 2);
    const f = facade({ field: P.plasterWhite, dado: P.tuff }, [{ u0: mid - 9, u1: mid + 9, v0: 0, v1: 18, kind: 'door' }], hx0);
    wallX(w, hx0, hx1, 404, 406, F, 24, f);
    wallX(w, hx0, hx1, D - 3, D - 1, F, 24, f);
    wallZ(w, 404, D - 1, hx0, hx0 + 2, F, 24, facade({ field: P.plasterWhite, dado: P.tuff, panels: false }, [], hx0));
    wallZ(w, 404, D - 1, hx1 - 2, hx1, F, 24, facade({ field: P.plasterWhite, dado: P.tuff, panels: false }, [], hx0));
    gableRoofZ(w, hx0, hx1, 404, D - 2, F + 25, 1, 3);
    pediment(w, hx0, hx1, 404, 1, F + 25, 3, 1);
  }
}

/** The Comitium: the open voting enclosure at the corner, wide doorways to the Forum and the street, a platform inside. */
function comitium(w: VoxelWorld): void {
  const x0 = 404, x1 = 519, z0 = 408, z1 = D - 1;
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) w.set(x, PZ, z, slabs(x, z, 13, 10, 6));
  const f = facade({ field: P.plasterWhite, dado: P.tuff }, [{ u0: 8, u1: 30, v0: 0, v1: 16, kind: 'arch' }, { u0: 46, u1: 70, v0: 0, v1: 16, kind: 'arch' }, { u0: 86, u1: 106, v0: 0, v1: 16, kind: 'arch' }], 23);
  wallX(w, x0, x1, z0, z0 + 2, F, 20, f);
  wallZ(w, z0, z1, x0, x0 + 2, F, 20, facade({ field: P.plasterWhite, dado: P.tuff }, [{ u0: 8, u1: 30, v0: 0, v1: 16, kind: 'arch' }], 23));
  wallZ(w, z0, z1, x1 - 2, x1, F, 20, facade({ field: P.plasterWhite, dado: P.tuff, panels: false }, [], 23));
  wallX(w, x0, x1, z1 - 2, z1, F, 20, facade({ field: P.plasterWhite, dado: P.tuff, panels: false }, [], 23));
  // the platform where the magistrates presided, and the wooden gangways the voters filed along
  solid(w, 440, F, 432, 490, F + 7, z1 - 3, (x, y, z) => (y === F + 7 ? vary(P.marble, x, y, z, 0.03) : quadratum(x, y, 6, 3, P.tuff)));
  for (const x of [420, 436, 500]) for (let z = 416; z <= 428; z++) for (let y = F; y <= F + 5; y++) if (y === F + 5 || z % 4 === 0) w.set(x, y, z, vary(P.wood, x, y, z, 0.06));
}

/**
 * South of Via dell'Abbondanza, east of the Comitium: the walled garden behind a house on the next street,
 * vines on a pergola, a fig and an olive, a little shrine on the back wall. Low, so the street stays in view.
 */
function garden(w: VoxelWorld, L: Level, stamp: Stamp): void {
  const x0 = 520, x1 = W - 1, z0 = 408, z1 = D - 1;
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const path = Math.abs(z - 426) < 3 || Math.abs(x - 556) < 3;
    w.set(x, PZ, z, path ? vary(mixc(P.sidewalkDust, P.limestone, 0.4), x, PZ, z, 0.07) : meadow(x, PZ, z, 0));
  }
  const wall = facade({ field: P.plasterWhite, dado: P.red, dadoTop: 5, panels: false }, [{ u0: 30, u1: 41, v0: 0, v1: 10, kind: 'door' }], 26);
  wallX(w, x0, x1, z0, z0 + 2, F, 12, (u, v, x, y, z) => {
    const n = notice(24, 15)(u - 54, v - 5) ?? notice(20, 16)(u - 88, v - 5);
    return n !== null && z === z0 ? n : wall(u, v, x, y, z);
  });
  for (let x = x0 + 30; x <= x0 + 41; x++) for (let v = 10; v < 12; v++) w.set(x, F + v, z0 + 1, vary(P.tuff, x, F + v, z0 + 1, 0.05)); // the gate's lintel
  wallX(w, x0, x1, z1 - 2, z1, F, 10, wall);
  wallZ(w, z0, z1, x0, x0 + 2, F, 12, wall);
  wallZ(w, z0, z1, x1 - 2, x1, F, 10, wall);
  stamp(lararium(), 596, F + 4, z1 - 3, 2);
  L.props.push({ kind: 'pergola', variant: 1, x: 566, y: F, z: 414 }, { kind: 'pergola', variant: 0, x: 528, y: F, z: 432 });
  L.trees.push({ kind: 'fig', variant: 1, x: 616, y: F, z: 420 }, { kind: 'olive', variant: 0, x: 540, y: F, z: 418 }, { kind: 'oleander', variant: 0, x: 626, y: F, z: 438 });
  for (let i = 0; i < 6; i++) L.trees.push({ kind: 'tuft', variant: i % 4, x: 530 + i * 17, y: F, z: 412 + (i % 3) * 11 });
}

const roofTileAt = (x: number, z: number) => ((x % 4) === 0 ? vary(P.imbrex, x, 0, z, 0.06) : vary(((Math.floor(z / 3) + Math.floor(x / 4)) & 1) ? P.tile : P.tileDark, x, 1, z, 0.07));

/** Beyond the box: the city all round. The Forum is in the middle of town, on its highest ground. */
const RING: Ring = {
  kind: () => 'city',
  height: (x, z) => 6.5 - Math.max(0, -x - 10, z - D / 8 - 10, x - W / 8 - 10, -z - 10) * 0.04,
};

/** The level (via the district registry, which keeps it built). */
export function forum(): Level { return districtOf('forum'); }

/** Walkable cells for paths (NPCs, the dog, tests): ground below every architrave, gallery and roof. */
export function navOf(L: Level) {
  return navGrid(L.world, { cell: 4, clearance: 14, step: 3, top: PZ + 16 });
}

