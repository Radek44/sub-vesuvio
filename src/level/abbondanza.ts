/**
 * Via dell'Abbondanza, October AD 79: Pompeii's main shopping street, running east from the Forum down to
 * the crossroads with Via Stabiana. Pure: this module builds the voxels the sim collides with and lists what
 * the world draws on top (trees, props, water, fires, people). Coordinates are voxels (1/8 m): x east, y up,
 * z south. The camera looks north, so the street runs left to right across the screen.
 *
 * What's here, from the excavations (compressed for play, never invented wholesale):
 * - The street: lava paving worn into deep cart ruts, high kerbed sidewalks, stepping stones at the
 *   crossings. It falls gently from the Forum to the crossroads, the lowest point, where Via Stabiana runs
 *   down the valley toward the Stabian Gate (it climbs north, falls south).
 * - At the Forum end, the long side wall of the Building of Eumachia, covered in painted notices; the
 *   street shrine of the crossroads gods; the fountain whose relief, a woman with a horn of plenty, gave
 *   the street its modern name.
 * - North side, shop after shop with a house behind or above: a bakery with lava mills and an oven, a
 *   shoemaker, a seller of lamps and pots, a bronze-smith at his forge, and the thermopolium of Vetutius
 *   Placidus (I 8, 8) with dolia in its counter and the painted lararium behind (Mercury and Bacchus).
 *   Upper floors open onto wooden balconies (maeniana) over the sidewalk. Election notices everywhere.
 * - The Stabian Baths, the town's oldest, at the corner: their door on this street, the palaestra and its
 *   pool behind, the furnace smoking, steam from the roof.
 * - The crossroads with Via Stabiana under the four-way arch, and beside it the statue of M. Holconius
 *   Rufus (CIL X 830); a water tower and a fountain at the corner.
 * - East of the crossroads, the fullery of Stephanus (I 6, 7): the press in the front room, the atrium
 *   turned into a washing yard, the treading stalls at the back. (It and Placidus's counter stand east of
 *   Via Stabiana, on the south side, in the real town; here they share the north side with the others.)
 * - The street goes on east toward the amphitheatre, but not today: it is dug up for new lead water pipes
 *   (in AD 79 several streets were opened for work on the water mains).
 * - South of the street the town steps down the hill (Pompeii's lava spur falls toward the Sarno): the
 *   sidewalk widens into a terrace with stalls, benches and the fountain, and below its parapet lie the
 *   roofs and gardens of the lower houses. That keeps the near side low, so the camera sees the street.
 */
import { VoxelWorld, navGrid, type Model } from 'ymir/voxel';
import type { Level, Ring, Spawn } from './types';
import { P, h2, h3, incertum, mixc, plaster, quadratum, roofTile, tint, vary } from '../art/palette';
import { archHole, column, dirt, facade, gableRoofX, ground, meadow, programma, shedRoofX, solid, street, wallX, wallZ, type FacadeStyle, type Opening } from '../art/build';
import { counter, crate, dolium, fountain, lararium, mill, oven, waterTower } from '../art/props';
import { altar, cart, donkey, forge, pavingPile, pipeStack, press, shelf, stall, statue, streetBench, trestle, urineJar, woodpile } from '../art/abbondanza-props';
import { paintedText, shutters, streetZ, terraceWall } from '../art/abbondanza-build';

export const W = 640;
export const D = 448;

// ── The street ──
const ROAD_N = 168, ROAD_S = 199, WALK = 14;
/** The house fronts stand at the north sidewalk's back edge (their outer face). */
const FRONT = ROAD_N - WALK - 1;
/** Where the south sidewalk ends and the terrace begins, and the terrace's parapet. */
const SOUTH = ROAD_S + WALK + 1;
const PARAPET = 228;
/** Via Stabiana's roadway (x), crossing at the street's lowest point; sidewalks either side. */
export const VS = { x0: 528, x1: 559 } as const;
/** The trench of the water works, and the trestles that close the street before it. */
export const WORKS = { barrier: 616, x0: 624, x1: 633 } as const;
/** Via Stabiana is closed both ways: a wagon of firewood for the baths north, a broken cart south. */
const VS_NORTH = 96, VS_SOUTH = 262;

/** Road height along the street (voxels): down from the Forum (54) to the crossroads (48), flat beyond. */
export function roadY(x: number): number {
  return x >= VS.x0 ? 48 : 54 - Math.floor((Math.max(0, x) / VS.x0) * 6);
}
/** Via Stabiana's road height: climbing north toward the Vesuvius Gate, falling south toward the Stabian Gate. */
export function vsY(z: number): number {
  if (z < ROAD_N) return 48 + Math.floor((ROAD_N - z) * 0.05);
  if (z > ROAD_S) return 48 - Math.floor((z - ROAD_S) * 0.05);
  return 48;
}
/** The lower town's ground, south of the parapet. */
const lowY = (x: number) => (x > VS.x1 ? 40 : 42);
const onVS = (x: number) => x >= VS.x0 - WALK && x <= VS.x1 + WALK;

export type { Placed, Source, Spot, Npc, WaterArea, Level } from './types';

/** Where you arrive: walking in from the Forum at the west end, facing east down the street. */
export const SPAWNS: Record<string, Spawn> = {
  west: { x: 14, y: roadY(14) + 1, z: 184, facing: Math.PI / 2 },
};

type TreeKind = 'pine' | 'cypress' | 'olive' | 'fig' | 'oleander' | 'tuft';

export function buildAbbondanza(): Level {
  const w = new VoxelWorld();
  const upper = new VoxelWorld();
  const L: Level = {
    id: 'abbondanza', name: { la: 'Via dell’Abbondanza', en: 'Via dell’Abbondanza', fr: 'La Via dell’Abbondanza' },
    world: w, width: W, depth: D,
    occluders: [{ id: 'arch', world: upper, x0: VS.x0 - 18, x1: VS.x1 + 18, z0: FRONT - 2, z1: SOUTH + 4 }],
    trees: [], props: [], water: [], fires: [], smoke: [], jets: [], spots: [], npcs: [], walkers: [], shops: [],
    exits: [{ id: 'to-forum', to: 'forum', arrive: 'east', x0: 0, x1: 3, z0: ROAD_N - WALK, z1: PARAPET - 1, label: { la: 'Ad Forum', en: 'To the Forum', fr: 'Vers le Forum' } }],
    spawns: SPAWNS,
    groundAt: (x, z) => {
      const base = onVS(x) && (z < ROAD_N - WALK || z > ROAD_S + WALK) ? vsY(z) : roadY(x);
      return (w.topAt(Math.round(x), Math.round(z), base + 17, -30) ?? base) + 1;
    },
    ring: RING,
  };
  const tree = (kind: TreeKind, variant: number, x: number, z: number, y: number) => L.trees.push({ kind, variant, x, z, y });
  const prop = (kind: string, variant: number, x: number, y: number, z: number, rotate = 0) => L.props.push({ kind, variant, x, y, z, rotate });
  const stamp = (m: Model, x: number, y: number, z: number, rotate = 0) => w.stamp(m, { x, y, z }, { rotate });
  const walkY = (x: number) => roadY(x) + 3; // sidewalk top voxel

  // ── Ground: building plots north at sidewalk height, the terrace south, the lower town below it ──
  // (Via Stabiana's own columns are left to its street painter: it climbs and falls on its own)
  for (const [x0, x1] of [[0, VS.x0 - WALK - 1], [VS.x1 + WALK + 1, W - 1]] as const) {
    ground(w, x0, 0, x1, FRONT, (x) => walkY(x), dirt, 8);
    ground(w, x0, SOUTH, x1, PARAPET - 1, (x) => walkY(x), (x, y, z, d) => (d ? vary(P.soil, x, y, z, 0.05) : terraceTop(x, z)), 8);
    ground(w, x0, PARAPET + 2, x1, D - 1, (x) => lowY(x), (x, y, z, d) => meadow(x, y, z, d), 6);
  }

  // ── The street, and Via Stabiana across it ──
  street(w, { x0: 0, x1: W - 1, zN: ROAD_N, zS: ROAD_S, walk: WALK, y: roadY, steps: [262, 452] });
  // at the crossroads the side street's roadway runs straight through: no sidewalk across it
  for (let x = VS.x0; x <= VS.x1; x++) for (const [z0, z1] of [[ROAD_N - WALK, ROAD_N - 1], [ROAD_S + 1, ROAD_S + WALK]] as const) for (let z = z0; z <= z1; z++) {
    for (let y = roadY(x) + 1; y <= roadY(x) + 3; y++) w.delete(x, y, z);
    w.set(x, roadY(x), z, vary(P.basalt, x, roadY(x), z, 0.08));
  }
  streetZ(w, { z0: 0, z1: ROAD_N - WALK - 1, xW: VS.x0, xE: VS.x1, walk: WALK, y: vsY, steps: [124] });
  streetZ(w, { z0: SOUTH, z1: D - 1, xW: VS.x0, xE: VS.x1, walk: WALK, y: vsY, steps: [244] });

  // ── The terrace's parapet: the town steps down to the south ──
  for (const [x0, x1] of [[0, VS.x0 - WALK - 1], [VS.x1 + WALK + 1, W - 1]] as const) {
    terraceWall(w, x0, x1, PARAPET, PARAPET + 1, (x) => lowY(x) - 2, (x) => walkY(x) + 5);
  }

  // ── North side, west to east ──
  eumachia(0, 59);
  // the lane north between Eumachia's wall and the bakery, closed by a gate
  for (let x = 60; x <= 71; x++) for (let z = 64; z <= FRONT; z++) w.set(x, walkY(x), z, vary(mixc(P.basalt, P.sidewalkDust, 0.3), x, walkY(x), z, 0.08));
  wallZ(w, 64, FRONT, 57, 59, walkY(60) + 1, 30, facade({ field: P.plasterWhite, dado: P.red, panels: false }, [], 3));
  solid(w, 60, walkY(60) + 1, 104, 71, walkY(60) + 22, 105, (x, y) => (y === walkY(60) + 22 ? P.woodDark : vary((x - 60) % 4 === 0 ? P.woodDark : P.shutter, x, y, 104, 0.05)));
  bakery(72, 151);
  sutor(152, 219);
  lamps(220, 291);
  smith(292, 363);
  placidus(364, 439);
  baths(440, VS.x0 - WALK - 1);
  fullonica(VS.x1 + WALK + 1, W - 1);
  backRow(0, 439, 0, 63);
  backRow(440, VS.x0 - WALK - 1, 0, 17);
  backRow(VS.x1 + WALK + 1, W - 1, 0, 37);

  // masonry benches against the house fronts, by the doors, for clients waiting and for idlers
  for (const bx of [194, 428]) w.stamp(streetBench(12), { x: bx, y: walkY(bx) + 1, z: FRONT + 1 });

  // ── The crossroads: the four-way arch, Holconius's statue, the water tower and a fountain ──
  tetrapylon();
  stamp(statue(), 507, walkY(507) + 1, FRONT + 7);
  L.spots.push({ id: 'abb-arch', x: (VS.x0 + VS.x1) / 2, y: roadY(VS.x0), z: ROAD_S - 4, r: 22, verb: 'look' });
  stamp(waterTower(44), 492, walkY(492) + 1, SOUTH + 1);
  const sfy = walkY(476);
  stamp(fountain(), 482, sfy + 1, SOUTH - 1, 2);
  L.water.push({ x: 472, z: ROAD_S + 4, w: 9, d: 9, level: sfy + 1 + 5.3, floor: sfy + 1.5, kind: 'fountain' });
  L.jets.push({ x: 476.5, y: sfy + 1 + 8.5, z: SOUTH - 2.5, dir: [0, -1] });
  for (let x = 482; x <= 492; x++) w.set(x, walkY(x), SOUTH + 1, vary(P.lead, x, 0, SOUTH, 0.05)); // the lead pipe from the tower
  for (let z = SOUTH + 1; z < SOUTH + 6; z++) w.set(493, walkY(493), z, P.lead);

  // ── The terrace along the south side: stalls, benches, the mule, children at knucklebones ──
  terrace();
  // a mule cart stopped in the road with wine for the counters (the donkey between the shafts)
  stamp(cart('amphorae'), 318, roadY(318) + 1, 190, 1);
  stamp(donkey(false, 1), 342, roadY(342) + 1, 190, 1);

  // ── The water works at the east end: trestles, the trench, pipes and lifted paving ──
  roadworks();
  // Via Stabiana closed north by the firewood wagon for the baths, south by a cart with a wheel off
  vsBlock();

  // ── The lower town, below the parapet ──
  lowerTown();

  // ── Shops: a counter to buy at, a keeper behind it ──
  L.shops.push(
    { id: 'abb-pistor', name: { la: 'Pistor', en: 'The bakery', fr: 'La boulangerie' }, sign: 'PISTOR', keeper: 'abb-pistor', x: 93, z: FRONT + 5,
      stock: [{ item: 'bread', price: 1 }, { item: 'treat', price: 1 }] },
    { id: 'abb-sutor', name: { la: 'Sūtor', en: 'The shoemaker’s', fr: 'Le cordonnier' }, sign: 'SVTOR', keeper: 'abb-sutor', x: 170, z: FRONT + 5,
      stock: [{ item: 'sandals', price: 8 }] },
    { id: 'abb-lucernae', name: { la: 'Lucernae', en: 'Fortunata’s lamps and pots', fr: 'Les lampes et poteries de Fortunata' }, sign: 'LVCERNAE', keeper: 'abb-fortunata', x: 244, z: FRONT + 5,
      stock: [{ item: 'lamp', price: 3 }, { item: 'oil', price: 4 }, { item: 'flask', price: 3 }] },
    { id: 'abb-faber', name: { la: 'Faber', en: 'The bronze-smith', fr: 'Le bronzier' }, sign: 'FABER', keeper: 'abb-faber', x: 315, z: FRONT + 5,
      stock: [{ item: 'stylus', price: 2 }, { item: 'tablet', price: 3 }] },
    { id: 'abb-caupo', name: { la: 'Thermopolium', en: 'Vetutius Placidus’s counter', fr: 'Le comptoir de Vetutius Placidus' }, sign: 'CAVPO', keeper: 'abb-placidus', x: 392, z: FRONT + 5,
      stock: [{ item: 'bread', price: 2 }, { item: 'cheese', price: 3 }, { item: 'grapes', price: 2 }, { item: 'apple', price: 1 }] },
    { id: 'abb-fullo', name: { la: 'Fullō', en: 'Stephanus’s fullery', fr: 'La foulerie de Stephanus' }, sign: 'FVLLO', keeper: 'abb-stephanus', x: 595, z: FRONT + 5,
      stock: [{ item: 'hat', price: 5 }] },
  );
  for (const sh of L.shops) L.spots.push({ id: `shop:${sh.id}`, x: sh.x, y: walkY(sh.x), z: sh.z, r: 12, verb: 'shop' });

  // ── The people of the street ──
  L.npcs.push(
    { id: 'abb-reader', who: 'vir:4', x: 24, z: FRONT + 11, facing: Math.PI, pose: 'idle' }, // reading the games notice
    { id: 'abb-painter', who: 'faber:5', x: 33, z: FRONT + 4, facing: Math.PI, pose: 'work' }, // painting it
    { id: 'abb-water', who: 'femina:6', x: 40, z: FRONT + 9, facing: Math.PI / 2, pose: 'drink' },
    { id: 'abb-kid-1', who: 'puer:5', x: 150, z: SOUTH + 7, facing: Math.PI / 2, pose: 'sit' },
    { id: 'abb-kid-2', who: 'puella:4', x: 158, z: SOUTH + 8, facing: -Math.PI / 2, pose: 'sit' },
    { id: 'abb-stall', who: 'agricola:2', x: 104, z: SOUTH + 9, facing: Math.PI * 0.85, pose: 'sell' },
    { id: 'abb-fishwife', who: 'femina:3', x: 262, z: SOUTH + 9, facing: Math.PI * 1.15, pose: 'sell' },
    { id: 'abb-old', who: 'senex:2', x: 384, z: PARAPET - 3, facing: Math.PI, pose: 'sit' },
    { id: 'abb-bather', who: 'mercator:3', x: 466, z: FRONT + 6, facing: 0.4, pose: 'idle' },
    { id: 'abb-carter', who: 'vir:2', x: 350, z: ROAD_S - 4, facing: -Math.PI / 2, pose: 'idle' },
    { id: 'abb-workman', who: 'faber:6', x: 606, z: ROAD_N + 18, facing: Math.PI / 2, pose: 'work' },
  );
  L.walkers.push(
    { id: 'abb-w-shopper', who: 'femina:7', path: [[74, FRONT + 8], [494, FRONT + 8], [494, FRONT + 10], [74, FRONT + 10]], speed: 8, phase: 0 },
    { id: 'abb-w-grandmother', who: 'avia:4', path: [[300, FRONT + 11], [80, FRONT + 11], [80, FRONT + 12], [300, FRONT + 12]], speed: 5, phase: 90 },
    { id: 'abb-w-girl', who: 'puella:6', path: [[20, ROAD_S + 7], [466, ROAD_S + 7], [466, ROAD_S + 9], [20, ROAD_S + 9]], speed: 9, phase: 100 },
    { id: 'abb-w-porter', who: 'vir:9', path: [[20, ROAD_N + 6], [604, ROAD_N + 6], [604, ROAD_N + 8], [20, ROAD_N + 8]], speed: 10, phase: 200 },
    { id: 'abb-w-merchant', who: 'mercator:4', path: [[290, ROAD_S - 6], [20, ROAD_S - 6], [20, ROAD_S - 8], [290, ROAD_S - 8]], speed: 10, phase: 40 },
    { id: 'abb-w-boy', who: 'puer:7', path: [[267, FRONT + 4], [267, ROAD_S + 10], [269, ROAD_S + 10], [269, FRONT + 4]], speed: 7, phase: 0 },
    { id: 'abb-w-stabiana', who: 'vir:8', path: [[537, VS_NORTH + 14], [537, VS_SOUTH - 8], [539, VS_SOUTH - 8], [539, VS_NORTH + 14]], speed: 9, phase: 60 },
    { id: 'abb-w-slave', who: 'femina:9', path: [[578, FRONT + 8], [610, FRONT + 8], [610, FRONT + 10], [578, FRONT + 10]], speed: 6, phase: 10 },
  );
  return L;

  // ── Surfaces ──
  function terraceTop(x: number, z: number): number {
    // big slabs of grey tuff and limestone, laid in rows, a gutter at the kerb side
    const row = Math.floor((z - SOUTH) / 5);
    const uu = x + (row & 1) * 4;
    if ((z - SOUTH) % 5 === 4 || uu % 9 === 0) return tint(P.tuff, -0.2);
    const id = Math.floor(uu / 9) * 31 + row;
    return vary(h2(id, row, 8) > 0.6 ? P.limestone : mixc(P.tuff, P.sidewalkDust, 0.4), x, 0, z, 0.05);
  }

  /** The Forum end: the long south wall of the Building of Eumachia, the shrine of the crossroads, the fountain of Abundance. */
  function eumachia(x0: number, x1: number): void {
    const y0 = walkY(30);
    const H = 38;
    // the wall: limestone pilasters, a white field over a red dado, a cornice
    const base = facade({ field: P.plasterWhite, dado: P.red, panels: false }, [], 9);
    const face = (u: number, v: number, x: number, y: number, z: number) => {
      if (v >= H - 2) return vary(P.moulding, x, y, z, 0.03);
      if (u % 15 < 3 && v > 1) return quadratum(u, v, 3, 3, P.limestone);
      return base(u, v, x, y, z);
    };
    for (let x = x0; x <= x1; x++) for (let z = 64; z <= FRONT; z++) for (let y = walkY(x) + 1; y <= y0; y++) w.delete(x, y, z);
    wallX(w, x0, x1, FRONT - 2, FRONT, y0 + 1, H, face);
    wallZ(w, 64, FRONT, x1 - 2, x1, y0 + 1, H - 4, facade({ field: P.plasterWhite, dado: P.red, panels: false }, [], 4));
    // behind it, the building's portico roof and its courtyard
    for (let x = x0; x <= x1 - 3; x++) for (let z = 64; z < FRONT - 2; z++) w.set(x, y0, z, vary(z < 110 ? mixc(P.sidewalkDust, P.limestone, 0.4) : P.marble, x, y0, z, 0.04));
    shedRoofX(w, x0, x1 - 3, 112, FRONT - 3, y0 + H - 3, -1, 0);
    for (let x = x0 + 6; x < x1 - 3; x += 12) column(w, x, 108, y0 + 1, 22, 2, P.marble);
    shedRoofX(w, x0, x1 - 3, 64, 78, y0 + 26, 1, 0);
    // the shrine of the crossroads gods painted on the wall, its altar in front
    w.stamp(lararium(), { x: x0 + 2, y: y0 + 4, z: FRONT });
    for (let u = 0; u < 14; u++) for (let v = 0; v < 22; v++) if (u === 0 || u === 13 || v === 21) w.set(x0 + 1 + u, y0 + 1 + v, FRONT, P.red);
    w.stamp(altar(), { x: x0 + 4, y: walkY(x0 + 4) + 1, z: FRONT + 2 });
    L.spots.push({ id: 'abb-shrine', x: x0 + 8, y: walkY(x0 + 8), z: FRONT + 10, r: 12, verb: 'look' });
    // the games notice, signed by its painter (CIL IV 3884, condensed): pairs of gladiators, a hunt, awnings
    paintedText(w, x0 + 15, y0 + 12, FRONT, ['PARIA XX', 'VENATIO', 'VELA ERVNT', 'SCR CELER'], { ink: P.red, ink2: P.black });
    // older notices half painted over, and a ladder where the painter is at work
    for (const [u0, v0, len] of [[2, 25, 12], [2, 31, 12]] as const) {
      const pr = programma(u0, v0, len, u0);
      for (let u = u0; u < u0 + len; u++) for (let v = v0; v <= v0 + 4; v++) { const c = pr(u, v); if (c !== null) w.set(x0 + u, y0 + 1 + v, FRONT, c); }
    }
    for (let v = 0; v < 26; v++) for (const lx of [x0 + 29, x0 + 32]) w.set(lx, y0 + 1 + v, FRONT + 2 - Math.floor(v / 13), P.woodLight);
    for (let v = 2; v < 26; v += 3) for (let lx = x0 + 30; lx <= x0 + 31; lx++) w.set(lx, y0 + 1 + v, FRONT + 2 - Math.floor(v / 13), P.wood);
    L.spots.push({ id: 'abb-games', x: x0 + 26, y: walkY(x0 + 26), z: FRONT + 9, r: 14, verb: 'read' });
    // the fountain of Abundance at the corner: the relief on its pillar is the woman with the horn of plenty
    const fy = walkY(x0 + 49);
    stamp(fountain(), x0 + 44, fy + 1, FRONT + 2);
    for (let x = x0 + 47; x <= x0 + 51; x++) for (let v = 9; v <= 12; v++) {
      const dx = x - (x0 + 49);
      // her head and shoulders at the centre, the horn of plenty curling up on her left, spilling fruit
      const figure = (Math.abs(dx) <= 1 && v >= 10) || (dx === 2 && v >= 9) || (dx === 1 && v === 9);
      const fruit = dx === 2 && v === 12;
      w.set(x, fy + 1 + v, FRONT + 2, fruit ? 0xb8643a : figure ? vary(dx === 2 ? P.limestone : P.tuffWarm, x, v, 1, 0.05) : vary(P.basaltLight, x, v, 0, 0.05));
    }
    L.water.push({ x: x0 + 45, z: FRONT + 3, w: 9, d: 9, level: fy + 1 + 5.3, floor: fy + 1.5, kind: 'fountain' });
    L.jets.push({ x: x0 + 49.5, y: fy + 1 + 8.5, z: FRONT + 2.5, dir: [0, 1] });
    L.spots.push({ id: 'abb-fountain', x: x0 + 49, y: fy, z: ROAD_N + 2, r: 14, verb: 'drink' });
  }

  /**
   * A shop with its house, on the north side: the street front with its openings, a front room (the shop)
   * under a gable roof, rooms and a yard or garden behind. Two storeys get a balcony and lit windows.
   * Returns the floor height. `inside` furnishes it (it's given the feet height).
   */
  function shopHouse(s: ShopSpec, inside?: (fy: number) => void): number {
    const { x0, x1 } = s;
    const y0 = walkY((x0 + x1) >> 1);
    const h = s.storeys === 2 ? 46 : 32;
    const zb = FRONT - 22; // the front room's back wall (zb..zb+2)
    const face = facade(s.style, s.openings, s.seed);
    const rubble = facade({ field: P.plasterWhite, dado: P.plasterWhite, panels: false, bare: 'incertum' }, [], s.seed);
    const inner = facade({ field: P.plasterWhite, dado: P.red, panels: false }, s.door ? [{ u0: s.door[0] - 3, u1: s.door[1] - 3, v0: 0, v1: 20, kind: 'door' }] : [], s.seed);
    // clear the plot down to the floor, then floors: tiles in the shop, the yard or garden behind
    for (let x = x0; x <= x1; x++) for (let z = s.z0; z <= FRONT; z++) {
      for (let y = y0 + 1; y <= y0 + 4; y++) w.delete(x, y, z);
      const shop = z >= zb;
      const c = shop ? vary(0xb9a58a, x, y0, z, 0.05) : s.back === 'garden' ? meadow(x, y0, z, 0) : s.back === 'yard' ? vary(mixc(P.basalt, P.sidewalkDust, 0.55), x, y0, z, 0.08) : vary(mixc(P.limestone, P.sidewalkDust, 0.5), x, y0, z, 0.06);
      w.set(x, y0, z, c);
    }
    wallX(w, x0, x1, FRONT - 2, FRONT, y0 + 1, h, face);
    wallX(w, x0 + 3, x1 - 3, zb, zb + 2, y0 + 1, h - 4, inner);
    wallZ(w, zb, FRONT, x0, x0 + 2, y0 + 1, h, rubble);
    wallZ(w, zb, FRONT, x1 - 2, x1, y0 + 1, h, rubble);
    // the rooms and garden behind: side and back walls, a lean-to along the back
    const hb = 24;
    wallZ(w, s.z0, zb, x0, x0 + 2, y0 + 1, hb, rubble);
    wallZ(w, s.z0, zb, x1 - 2, x1, y0 + 1, hb, rubble);
    wallX(w, x0, x1, s.z0, s.z0 + 2, y0 + 1, hb, rubble);
    if (s.rooms !== false) {
      wallX(w, x0 + 3, x1 - 3, s.z0 + 14, s.z0 + 15, y0 + 1, hb - 4, facade({ field: s.style.field, dado: s.style.dado, panels: false }, [{ u0: 6, u1: 12, v0: 0, v1: 16, kind: 'door' }, { u0: 30, u1: 36, v0: 0, v1: 16, kind: 'door' }], s.seed + 1));
      shedRoofX(w, x0, x1, s.z0, s.z0 + 15, y0 + hb + 4, 1, 1);
    }
    // the shop's lintel-high sign, its threshold and shutters
    for (const o of s.openings) if (o.kind === 'shop') shutters(w, x0 + o.u0, x0 + o.u1, FRONT, y0, o.v1 + 1);
    if (s.sign) paintedText(w, x0 + s.sign.u - Math.ceil((s.sign.text.length * 4 + 1) / 2), y0 + 25, FRONT, [s.sign.text], { ink: s.sign.ink ?? P.red });
    for (const n of s.notices ?? []) paintedText(w, x0 + n.u, y0 + 1 + n.v, FRONT, n.lines, { ink: n.ink ?? P.red, ink2: n.ink2 ?? P.black });
    for (const [u0, v0, len] of s.marks ?? []) {
      const pr = programma(u0, v0, len, s.seed + u0);
      for (let u = u0; u < u0 + len; u++) for (let v = v0; v <= v0 + 4; v++) { const c = pr(u, v); if (c !== null && w.has(x0 + u, y0 + 1 + v, FRONT)) w.set(x0 + u, y0 + 1 + v, FRONT, c); }
    }
    if (s.storeys === 2) {
      // upper windows, lit, and a balcony (maenianum) on beams over the sidewalk
      for (let u = 8; u < x1 - x0 - 8; u += 14) for (let v = 35; v <= 40; v++) for (let k = 0; k < 4; k++) {
        if (s.balcony && u + k >= s.balcony[0] && u + k <= s.balcony[1]) continue;
        w.delete(x0 + u + k, y0 + 1 + v, FRONT); w.delete(x0 + u + k, y0 + 1 + v, FRONT - 1);
        w.set(x0 + u + k, y0 + 1 + v, FRONT - 2, P.glowWindow, true);
      }
      if (s.balcony) {
        const [b0, b1] = s.balcony;
        const by = y0 + 32;
        for (let x = x0 + b0; x <= x0 + b1; x++) {
          for (let z = FRONT + 1; z <= FRONT + 6; z++) w.set(x, by, z, vary(P.woodLight, x, by, z, 0.06));
          if (x % 6 === 0) for (let z = FRONT + 1; z <= FRONT + 6; z++) w.set(x, by - 1, z, P.woodDark);
          for (let k = 1; k <= 6; k++) if (x % 3 === 0 || k === 6) w.set(x, by + k, FRONT + 6, k === 6 ? P.woodDark : P.wood);
        }
        // a door out onto it, a pot of herbs, washing on the rail
        for (let v = 32; v <= 42; v++) for (let u = b0 + 6; u <= b0 + 11; u++) { w.delete(x0 + u, y0 + 1 + v, FRONT); w.delete(x0 + u, y0 + 1 + v, FRONT - 1); w.set(x0 + u, y0 + 1 + v, FRONT - 2, v > 40 ? P.woodDark : 0x3a2a1c); }
        for (let x = x0 + b1 - 8; x <= x0 + b1 - 3; x++) for (let k = 2; k <= 5; k++) w.set(x, by + k, FRONT + 7, vary(h3(x, 1, s.seed) > 0.5 ? 0xe8dcc0 : 0x8a4a5a, x, by + k, FRONT + 7, 0.05));
        for (let k = 1; k <= 3; k++) { w.set(x0 + b0 + 2, by + k, FRONT + 4, P.terracotta); if (k === 3) for (const d of [-1, 1]) w.set(x0 + b0 + 2 + d, by + 4, FRONT + 4, P.green); }
        shedRoofX(w, x0 + b0, x0 + b1, FRONT + 1, FRONT + 5, y0 + h - 2, 1, 1);
      }
    }
    gableRoofX(w, x0, x1, zb, FRONT, y0 + h + 1, 2);
    inside?.(y0 + 1);
    void L;
    return y0;
  }

  function bakery(x0: number, x1: number): void {
    const z0 = 64;
    const y0 = shopHouse({
      x0, x1, z0, storeys: 1, style: { field: P.ochre, dado: P.black }, seed: 5, back: 'yard', door: [38, 48],
      openings: [{ u0: 8, u1: 34, v0: 0, v1: 22, kind: 'shop' }],
      sign: { text: 'PISTOR', u: 21 },
      // Cn. Helvius Sabinus for aedile: his notices are on walls all over town
      notices: [{ lines: ['CN HELVIVM', 'SABINVM AED'], u: 34, v: 7 }],
      marks: [[38, 24, 18]],
    }, (fy) => {
      // the counter of loaves inside the opening, the keeper behind, sacks of flour
      solid(w, x0 + 10, fy, FRONT - 7, x0 + 28, fy + 6, FRONT - 4, (x, y, z) => (y === fy + 6 ? vary(P.limestone, x, y, z, 0.04) : z === FRONT - 4 ? plaster(P.red, x, y, 2) : vary(P.mortar, x, y, z, 0.05)));
      for (let i = 0; i < 3; i++) stamp(crate('bread'), x0 + 11 + i * 6, fy + 7, FRONT - 7);
      L.npcs.push({ id: 'abb-pistor', who: 'pistor:2', x: x0 + 20, z: FRONT - 12, facing: 0, pose: 'sell' });
      w.stamp(shelf(24, 'pots', 3), { x: x0 + 6, y: fy + 4, z: FRONT - 19 });
      for (let i = 0; i < 4; i++) solid(w, x0 + 52 + i * 5, fy, FRONT - 18, x0 + 55 + i * 5, fy + 4, FRONT - 15, (x, y, z) => vary(0xe2d8c0, x, y, z, 0.05));
    });
    // the mill yard behind, open to the sky: lava mills, the donkey at one, the oven at the back
    for (const [mx, mz] of [[x0 + 16, 108], [x0 + 38, 104], [x0 + 60, 110]] as const) w.stamp(mill(), { x: mx, y: y0 + 1, z: mz });
    w.stamp(donkey(false, 0), { x: x0 + 38, y: y0 + 1, z: 94 }, { rotate: 1 });
    w.stamp(oven(), { x: x1 - 18, y: y0 + 1, z: 92 });
    L.fires.push({ kind: 'oven', x: x1 - 18, y: y0 + 10, z: 101 });
    L.smoke.push({ kind: 'smoke', x: x1 - 18, y: y0 + 26, z: 85 });
    // a kneading table and flour
    solid(w, x0 + 6, y0 + 1, 86, x0 + 20, y0 + 6, 91, (x, y, z) => (y === y0 + 6 ? vary(P.woodLight, x, y, z, 0.05) : x === x0 + 6 || x === x0 + 20 ? P.wood : null));
    for (let x = x0 + 8; x <= x0 + 18; x++) for (let z = 87; z <= 90; z++) if (h3(x, 2, z) > 0.4) w.set(x, y0 + 7, z, 0xefe6d2);
    L.spots.push({ id: 'abb-programma', x: x0 + 56, y: walkY(x0 + 56), z: FRONT + 9, r: 14, verb: 'read' });
  }

  function sutor(x0: number, x1: number): void {
    const y0 = shopHouse({
      x0, x1, z0: 64, storeys: 2, style: { field: P.red, dado: P.black }, seed: 7, back: 'garden', door: [20, 30],
      openings: [{ u0: 6, u1: 30, v0: 0, v1: 22, kind: 'shop' }, { u0: 58, u1: 63, v0: 0, v1: 20, kind: 'door' }],
      sign: { text: 'SVTOR', u: 18, ink: P.black },
      // M. Cerrinius Vatia for aedile (the notices whose supporters are the late drinkers and the petty thieves)
      notices: [{ lines: ['VATIAM', 'AED'], u: 32, v: 4, ink: P.red, ink2: P.red }],
      balcony: [36, 64],
    }, (fy) => {
      // the workbench with lasts and a hide, sandals on pegs, hides hung from a pole
      solid(w, x0 + 8, fy, FRONT - 8, x0 + 22, fy + 5, FRONT - 5, (x, y, z) => (y === fy + 5 ? vary(P.woodLight, x, y, z, 0.05) : x === x0 + 8 || x === x0 + 22 ? P.wood : null));
      for (let x = x0 + 10; x <= x0 + 20; x += 3) { w.set(x, fy + 6, FRONT - 7, 0x8a6a40); w.set(x, fy + 6, FRONT - 6, 0x8a6a40); }
      for (let x = x0 + 14; x <= x0 + 20; x++) for (let z = FRONT - 8; z <= FRONT - 5; z++) w.set(x, fy + 6, z, 0x7a4a2a);
      L.npcs.push({ id: 'abb-sutor', who: 'sutor:1', x: x0 + 18, z: FRONT - 12, facing: 0, pose: 'sell' });
      w.set(x0 + 10, fy + 6, FRONT - 6, P.glowLamp, true);
      L.fires.push({ kind: 'lamp', x: x0 + 10, y: fy + 7, z: FRONT - 6 });
      w.stamp(shelf(26, 'sandals', 1), { x: x0 + 4, y: fy + 6, z: FRONT - 19 });
      for (let x = x0 + 34; x <= x0 + 60; x++) w.set(x, fy + 18, FRONT - 16, P.woodDark);
      for (let i = 0; i < 4; i++) for (let x = x0 + 35 + i * 7; x <= x0 + 39 + i * 7; x++) for (let y = fy + 9; y <= fy + 17; y++) w.set(x, y, FRONT - 16, vary(i & 1 ? 0x8a5a32 : 0x6a4026, x, y, 1, 0.08));
    });
    tree('olive', 1, x0 + 34, 90, y0 + 1);
    L.spots.push({ id: 'abb-vatia', x: x0 + 44, y: walkY(x0 + 44), z: FRONT + 9, r: 14, verb: 'read' });
  }

  function lamps(x0: number, x1: number): void {
    const y0 = shopHouse({
      x0, x1, z0: 64, storeys: 2, style: { field: P.yellow, dado: P.redDark }, seed: 2, back: 'court', door: [50, 60],
      openings: [{ u0: 6, u1: 40, v0: 0, v1: 22, kind: 'shop' }, { u0: 56, u1: 61, v0: 0, v1: 20, kind: 'door' }],
      sign: { text: 'LVCERNAE', u: 23 },
      balcony: [44, 66],
      marks: [[44, 6, 22]],
    }, (fy) => {
      // a plank counter covered in lamps, shelves of lamps and pots, lamps lit to show they work
      solid(w, x0 + 10, fy, FRONT - 7, x0 + 30, fy + 5, FRONT - 5, (x, y, z) => (y === fy + 5 ? vary(P.woodLight, x, y, z, 0.05) : vary(P.wood, x, y, z, 0.05)));
      for (let x = x0 + 11; x <= x0 + 29; x += 3) { w.set(x, fy + 6, FRONT - 6, 0xc0703e); w.set(x + 1, fy + 6, FRONT - 6, 0xc0703e); }
      w.set(x0 + 14, fy + 7, FRONT - 6, P.glowLamp, true); w.set(x0 + 26, fy + 7, FRONT - 6, P.glowLamp, true);
      L.fires.push({ kind: 'lamp', x: x0 + 14, y: fy + 8, z: FRONT - 6 }, { kind: 'lamp', x: x0 + 40, y: fy + 14, z: FRONT - 17 });
      L.npcs.push({ id: 'abb-fortunata', who: 'Fortunata', x: x0 + 22, z: FRONT - 11, facing: 0, pose: 'sell' });
      w.stamp(shelf(30, 'lamps', 2), { x: x0 + 4, y: fy + 4, z: FRONT - 19 });
      w.stamp(shelf(28, 'pots', 5), { x: x0 + 36, y: fy + 4, z: FRONT - 19 });
      for (let i = 0; i < 5; i++) w.stamp(dolium(), { x: x0 + 40 + i * 6, y: fy - 3, z: FRONT - 7 });
    });
    // pots out on the sidewalk, as shops did
    for (let i = 0; i < 4; i++) prop('amphora', i, x0 + 4 + i * 3, y0 + 1, FRONT + 2);
    for (let x = x0 + 46; x <= x0 + 60; x += 4) for (let k = 0; k < 3; k++) w.set(x, walkY(x) + 1 + k, FRONT + 2, k === 2 ? 0xa85a32 : P.terracotta);
    tree('oleander', 0, x0 + 18, 96, y0 + 1);
    tree('oleander', 1, x0 + 52, 92, y0 + 1);
    w.stamp(fountain(), { x: x0 + 30, y: y0 + 1, z: 98 });
    L.water.push({ x: x0 + 31, z: 99, w: 9, d: 9, level: y0 + 1 + 5.3, floor: y0 + 1.5, kind: 'fountain' });
  }

  function smith(x0: number, x1: number): void {
    const y0 = shopHouse({
      x0, x1, z0: 64, storeys: 1, style: { field: 0xd9c7a8, dado: P.redDark }, seed: 11, back: 'yard', door: [44, 54],
      openings: [{ u0: 8, u1: 36, v0: 0, v1: 22, kind: 'shop' }],
      sign: { text: 'FABER', u: 22 },
      marks: [[40, 8, 24], [42, 16, 20]],
    }, (fy) => {
      // the forge against the back wall, its flue through the roof; bronze on shelves; the smith's bench
      w.stamp(forge(), { x: x0 + 30, y: fy, z: FRONT - 13 });
      L.fires.push({ kind: 'hearth', x: x0 + 30, y: fy + 9, z: FRONT - 15 });
      solid(w, x0 + 28, fy + 30, FRONT - 18, x0 + 32, fy + 42, FRONT - 14, (x, y, z) => quadratum(x + z, y, 3, 2, P.brick));
      L.smoke.push({ kind: 'smoke', x: x0 + 30, y: fy + 44, z: FRONT - 16 });
      w.stamp(shelf(16, 'bronze', 4), { x: x0 + 6, y: fy + 4, z: FRONT - 19 });
      L.npcs.push({ id: 'abb-faber', who: 'faber:3', x: x0 + 18, z: FRONT - 9, facing: 0, pose: 'sell' });
      solid(w, x0 + 44, fy, FRONT - 10, x0 + 60, fy + 5, FRONT - 6, (x, y, z) => (y === fy + 5 ? vary(P.woodLight, x, y, z, 0.05) : x === x0 + 44 || x === x0 + 60 ? P.wood : null));
      for (let x = x0 + 46; x <= x0 + 58; x += 4) for (let k = 0; k < 3; k++) w.set(x, fy + 6 + k, FRONT - 8, vary(P.bronze, x, k, 1, 0.1));
    });
    // the yard: charcoal, scrap, a trough
    solid(w, x0 + 6, y0 + 1, 74, x0 + 24, y0 + 4, 84, (x, y, z) => (h3(x, y, z) > 0.2 ? vary(0x2a2624, x, y, z, 0.1) : null));
    solid(w, x0 + 40, y0 + 1, 76, x0 + 56, y0 + 4, 82, (x, y, z) => (y === y0 + 4 && x > x0 + 40 && x < x0 + 56 && z > 76 && z < 82 ? 0x4a7a86 : vary(P.lava, x, y, z, 0.05)));
    tree('fig', 1, x0 + 56, 96, y0 + 1);
  }

  function placidus(x0: number, x1: number): void {
    const y0 = shopHouse({
      x0, x1, z0: 64, storeys: 2, style: { field: P.green, dado: P.black }, seed: 4, back: 'garden', door: [56, 66],
      openings: [{ u0: 6, u1: 50, v0: 0, v1: 22, kind: 'shop' }, { u0: 58, u1: 63, v0: 0, v1: 20, kind: 'door' }],
      sign: { text: 'CAVPO', u: 28 },
      balcony: [48, 70],
      marks: [[52, 22, 20]],
    }, (fy) => {
      // the L-shaped counter with its dolia, the steaming pot at the end; the lararium painting on the back wall
      stamp(counter(30), x0 + 12, fy, FRONT - 8);
      L.smoke.push({ kind: 'steam', x: x0 + 37, y: fy + 12, z: FRONT - 13 });
      L.fires.push({ kind: 'hearth', x: x0 + 37, y: fy + 9, z: FRONT - 13 });
      w.stamp(lararium(), { x: x0 + 20, y: fy + 6, z: FRONT - 19 });
      L.fires.push({ kind: 'lamp', x: x0 + 25, y: fy + 12, z: FRONT - 18 });
      L.npcs.push({ id: 'abb-placidus', who: 'Placidus', x: x0 + 26, z: FRONT - 11, facing: 0, pose: 'sell' });
      // tables for those who sit, amphorae in the corner
      prop('table', 0, x0 + 44, fy, FRONT - 15);
      prop('bench', 0, x0 + 51, fy, FRONT - 8);
      for (let i = 0; i < 4; i++) prop('amphora', i, x0 + 66 + (i % 2) * 3, fy, FRONT - 16 + Math.floor(i / 2) * 4);
      L.npcs.push({ id: 'abb-granny', who: 'avia:3', x: x0 + 56, z: FRONT - 7, facing: 0, pose: 'sit' });
    });
    // his house behind: a garden dining room under a vine pergola, a fig
    prop('pergola', 1, x0 + 10, y0 + 1, 82);
    tree('fig', 0, x0 + 58, 96, y0 + 1);
    tree('cypress', 0, x0 + 66, 84, y0 + 1);
  }

  /** The Stabian Baths at the corner: the street door, shops either side, the palaestra and pool, the bath block and furnace. */
  function baths(x0: number, x1: number): void {
    const y0 = walkY((x0 + x1) >> 1);
    const z0 = 20;
    const H = 34;
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= FRONT; z++) {
      for (let y = y0 + 1; y <= y0 + 4; y++) w.delete(x, y, z);
      w.set(x, y0, z, vary(z < FRONT - 30 ? mixc(P.sand, P.sidewalkDust, 0.4) : P.marble, x, y0, z, 0.04));
    }
    const doorU = 30;
    const f = facade({ field: P.plasterWhite, dado: P.red }, [{ u0: 4, u1: 20, v0: 0, v1: 20, kind: 'shop' }, { u0: doorU, u1: doorU + 14, v0: 0, v1: 24, kind: 'arch' }, { u0: 54, u1: 68, v0: 0, v1: 20, kind: 'shop' }], 13);
    wallX(w, x0, x1, FRONT - 2, FRONT, y0 + 1, H, f);
    for (const [u0, u1] of [[4, 20], [54, 68]] as const) shutters(w, x0 + u0, x0 + u1, FRONT, y0, 21, true);
    // the vestibule: a short passage to a curtained door into the palaestra
    wallZ(w, FRONT - 26, FRONT - 3, x0 + doorU - 3, x0 + doorU - 1, y0 + 1, H, facade({ field: P.plasterWhite, dado: P.red, panels: false }, [], 2));
    wallZ(w, FRONT - 26, FRONT - 3, x0 + doorU + 15, x0 + doorU + 17, y0 + 1, H, facade({ field: P.plasterWhite, dado: P.red, panels: false }, [], 2));
    solid(w, x0 + doorU, y0 + 1, FRONT - 26, x0 + doorU + 14, y0 + 24, FRONT - 25, (x, y) => (y > y0 + 20 ? P.woodDark : vary((x & 1) ? 0x8a3a2a : 0x9a4a32, x, y, FRONT - 25, 0.05)));
    // the south range of rooms behind the shops, roofed
    wallX(w, x0, x1, FRONT - 28, FRONT - 26, y0 + 1, H, facade({ field: P.plasterWhite, dado: P.red }, [{ u0: doorU, u1: doorU + 14, v0: 0, v1: 24, kind: 'arch' }], 14));
    wallZ(w, z0, FRONT, x0, x0 + 2, y0 + 1, H - 6, facade({ field: P.plasterWhite, dado: P.red, panels: false }, [], 5));
    wallZ(w, FRONT - 29, FRONT, x1 - 2, x1, y0 + 1, H, facade({ field: P.plasterWhite, dado: P.red }, [], 6));
    gableRoofX(w, x0, x1, FRONT - 28, FRONT, y0 + H + 1, 2);
    // the palaestra: a sandy court with a colonnade, the swimming pool along its west side
    for (let x = x0 + 6; x <= x0 + 46; x += 10) column(w, x, FRONT - 34, y0 + 1, 24, 2, P.plasterWhite);
    for (let z = FRONT - 44; z >= z0 + 10; z -= 12) column(w, x0 + 46, z, y0 + 1, 24, 2, P.plasterWhite);
    shedRoofX(w, x0 + 3, x1 - 26, FRONT - 38, FRONT - 29, y0 + 29, 1, 1);
    const px0 = x0 + 6, px1 = x0 + 34, pz0 = z0 + 18, pz1 = z0 + 66;
    for (let x = px0 - 1; x <= px1 + 1; x++) for (let z = pz0 - 1; z <= pz1 + 1; z++) {
      const rim = x === px0 - 1 || x === px1 + 1 || z === pz0 - 1 || z === pz1 + 1;
      if (rim) w.set(x, y0 + 1, z, vary(P.marble, x, y0 + 1, z, 0.03));
      else { w.set(x, y0 - 3, z, vary(0x5a9aa8, x, y0 - 3, z, 0.06)); for (let y = y0 - 2; y <= y0; y++) w.delete(x, y, z); }
    }
    L.water.push({ x: px0, z: pz0, w: px1 - px0 + 1, d: pz1 - pz0 + 1, level: y0 + 0.4, floor: y0 - 2.5, kind: 'pool' });
    // the bath block along Via Stabiana: high walls, a barrel roof, round skylights, the furnace between
    const bx0 = x1 - 24;
    const win: Opening[] = [];
    for (let u = 8; u < FRONT - z0 - 34; u += 18) win.push({ u0: u, u1: u + 6, v0: 18, v1: 28, kind: 'window' });
    wallZ(w, z0, FRONT - 29, x1 - 2, x1, y0 + 1, H + 2, facade({ field: P.plasterWhite, dado: P.red }, win, 15));
    wallZ(w, z0, FRONT - 29, bx0, bx0 + 2, y0 + 1, H + 2, facade({ field: P.plasterWhite, dado: P.red }, win, 16));
    wallX(w, bx0, x1, z0, z0 + 2, y0 + 1, H + 2, facade({ field: P.plasterWhite, dado: P.red, panels: false }, [], 17));
    for (const a of win) for (let u = a.u0; u <= a.u1; u++) for (let v = a.v0; v <= a.v1; v++) {
      const pane = (u - a.u0) % 3 === 0 || (v - a.v0) % 5 === 0;
      w.set(x1 - 2, y0 + 1 + v, z0 + u, pane ? P.bronze : 0xffd9a0, !pane);
    }
    const mid = (bx0 + x1) / 2, half = (x1 - bx0) / 2 + 1;
    for (let z = z0 - 1; z <= FRONT - 28; z++) for (let x = bx0 - 1; x <= x1 + 1; x++) {
      const t = Math.min(1, Math.abs(x - mid) / half);
      const ry = y0 + H + 2 + Math.round(Math.sqrt(1 - t * t) * 7);
      const sky = (z - z0) % 22 === 11 && Math.abs(x - mid) < 2;
      w.set(x, ry, z, sky ? 0xffe0b0 : roofTile(z - z0 + 7, Math.abs(x - Math.round(mid))), sky);
    }
    L.smoke.push({ kind: 'steam', x: mid, y: y0 + H + 12, z: z0 + 33 }, { kind: 'steam', x: mid, y: y0 + H + 12, z: z0 + 77 });
    // the furnace (praefurnium) between the men's and women's hot rooms: its stack through the roof
    solid(w, bx0 + 8, y0 + 1, z0 + 50, bx0 + 15, y0 + 52, z0 + 57, (x, y, z) => quadratum(x + z, y, 4, 2, P.brick));
    L.smoke.push({ kind: 'smoke', x: bx0 + 12, y: y0 + 54, z: z0 + 54 });
    L.fires.push({ kind: 'furnace', x: bx0 + 12, y: y0 + 4, z: z0 + 59 });
    tree('pine', 2, x0 + 20, z0 + 4, y0 + 1);
    L.spots.push({ id: 'abb-baths', x: x0 + doorU + 7, y: y0, z: FRONT + 6, r: 14, verb: 'look' });
    // a lamp burning in the vestibule
    w.set(x0 + doorU + 1, y0 + 18, FRONT - 20, P.glowLamp, true);
    L.fires.push({ kind: 'lamp', x: x0 + doorU + 2, y: y0 + 18, z: FRONT - 20 });
  }

  /** The fullery of Stephanus: press in the front room; the atrium made a washing yard; treading stalls behind. */
  function fullonica(x0: number, x1: number): void {
    const z0 = 40;
    const y0 = shopHouse({
      x0, x1, z0, storeys: 1, style: { field: P.plasterWhite, dado: P.redDark }, seed: 8, back: 'court', door: [34, 46], rooms: false,
      openings: [{ u0: 8, u1: 34, v0: 0, v1: 22, kind: 'shop' }],
      sign: { text: 'FVLLO', u: 21 },
      marks: [[38, 6, 22], [40, 14, 18]],
    }, (fy) => {
      w.stamp(press(), { x: x0 + 22, y: fy, z: FRONT - 15 });
      L.npcs.push({ id: 'abb-stephanus', who: 'Stephanus', x: x0 + 12, z: FRONT - 10, facing: 0.3, pose: 'sell' });
      // folded cloth waiting, white and saffron and red
      for (let i = 0; i < 3; i++) solid(w, x0 + 44 + i * 6, fy, FRONT - 9, x0 + 48 + i * 6, fy + 2 + i, FRONT - 6, (x, y, z) => vary([0xf0ebe0, 0xd9a43a, 0xa8342a][i]!, x, y, z, 0.04));
    });
    // the urine jars by the door
    for (let i = 0; i < 2; i++) w.stamp(urineJar(), { x: x0 + 3 + i * 6, y: walkY(x0 + 3) + 1, z: FRONT + 4 });
    // the yard: the old impluvium now a washing basin; rinsing tanks in steps; cloth drying on poles
    const basin = (bx0: number, bz0: number, bx1: number, bz1: number, depth: number) => {
      for (let x = bx0 - 1; x <= bx1 + 1; x++) for (let z = bz0 - 1; z <= bz1 + 1; z++) {
        const rim = x === bx0 - 1 || x === bx1 + 1 || z === bz0 - 1 || z === bz1 + 1;
        if (rim) for (let y = y0; y <= y0 + 3; y++) w.set(x, y, z, vary(y === y0 + 3 ? P.limestone : 0x8a3a30, x, y, z, 0.05));
        else { w.set(x, y0 - depth, z, vary(0x8a3a30, x, y0, z, 0.06)); for (let y = y0 - depth + 1; y <= y0 + 3; y++) w.delete(x, y, z); }
      }
      L.water.push({ x: bx0, z: bz0, w: bx1 - bx0 + 1, d: bz1 - bz0 + 1, level: y0 + 1.5, floor: y0 - depth + 0.5, kind: 'pool' });
    };
    basin(x0 + 14, 88, x0 + 34, 104, 3);
    for (let i = 0; i < 3; i++) basin(x1 - 18, 58 + i * 16, x1 - 6, 70 + i * 16, 3);
    // the treading stalls (saltus) along the back: five small tubs between low walls
    for (let i = 0; i < 5; i++) {
      const sx = x0 + 6 + i * 9;
      for (let x = sx; x <= sx + 8; x++) for (let z = z0 + 3; z <= z0 + 14; z++) {
        const wall = x === sx || x === sx + 8 || z === z0 + 14;
        if (wall) for (let y = y0 + 1; y <= y0 + 8; y++) w.set(x, y, z, vary(y === y0 + 8 ? P.limestone : plaster(P.plasterWhite, x, y, 6), x, y, z, 0.03));
        else w.set(x, y0, z, vary(0x8a3a30, x, y0, z, 0.06));
      }
      L.water.push({ x: sx + 1, z: z0 + 3, w: 7, d: 11, level: y0 + 3, floor: y0 + 0.5, kind: 'pool' });
    }
    L.npcs.push({ id: 'abb-fuller', who: 'fullo:1', x: x0 + 19, z: z0 + 18, facing: Math.PI, pose: 'work' });
    // drying poles across the yard, cloth hanging
    for (const pz of [78, 116]) {
      for (const px of [x0 + 6, x0 + 32]) for (let y = y0 + 1; y <= y0 + 20; y++) w.set(px, y, pz, P.wood);
      for (let x = x0 + 6; x <= x0 + 32; x++) {
        w.set(x, y0 + 20, pz, P.woodDark);
        if (x > x0 + 7 && x < x0 + 31 && (x - x0) % 11 !== 0) for (let k = 1; k <= 9 - ((x * 3) % 4); k++) w.set(x, y0 + 20 - k, pz, vary([0xf0ebe0, 0xd9a43a, 0x5a6a8a, 0xf0ebe0][Math.floor((x - x0) / 11) % 4]!, x, k, pz, 0.03));
      }
    }
    // a narrow pent roof along the back wall, over the stalls' far ends (the tubs themselves stand in the open)
    shedRoofX(w, x0 + 3, x1 - 3, z0 + 3, z0 + 6, y0 + 22, 1, 0);
    L.smoke.push({ kind: 'steam', x: x0 + 24, y: y0 + 4, z: 96 });
  }

  /** The four-way arch over the crossroads. Below head height it is solid ground for the sim; above, it lifts away. */
  function tetrapylon(): void {
    const by = roadY(VS.x0);
    const ax0 = VS.x0 - 10, ax1 = VS.x1 + 10, az0 = ROAD_N - 10, az1 = ROAD_S + 10;
    const HEAD = 20, TOP = 52, SPRING = 26;
    const holeX = archHole(VS.x0 - ax0, VS.x1 - VS.x0 + 1, SPRING);
    const holeZ = archHole(ROAD_N - az0, ROAD_S - ROAD_N + 1, SPRING);
    for (let x = ax0; x <= ax1; x++) for (let z = az0; z <= az1; z++) {
      const inX = x >= VS.x0 && x <= VS.x1, inZ = z >= ROAD_N && z <= ROAD_S;
      for (let v = 1; v <= TOP; v++) {
        const y = by + v;
        let solidHere: boolean;
        if (inX && inZ) solidHere = v > SPRING + 16; // the vault over the middle
        else if (inX) solidHere = !holeX(x - ax0, v); // north and south faces
        else if (inZ) solidHere = !holeZ(z - az0, v); // west and east faces
        else solidHere = v > 3; // the four piers, on the sidewalk corners
        if (!solidHere) continue;
        const face = x === ax0 || x === ax1 || z === az0 || z === az1;
        const cornice = v >= TOP - 3 && v < TOP && face;
        const roof = v === TOP && !face;
        const panel = (z === az0 || z === az1) && v >= SPRING + 18 && v <= TOP - 6 && x >= VS.x0 + 2 && x <= VS.x1 - 2;
        const impost = v === SPRING || v === SPRING - 1;
        let c: number;
        if (roof) c = vary(((x >> 2) + (z >> 2)) & 1 ? P.tuffWarm : tint(P.tuffWarm, -0.08), x, y, z, 0.04);
        else if (v === TOP) c = vary(P.moulding, x, y, z, 0.03);
        else if (cornice) c = v === TOP - 2 ? vary(P.marble, x, y, z, 0.03) : vary(P.moulding, x, y, z, 0.03);
        else if (panel) {
          // the dedication, cut and painted red: lines of letters on a marble panel
          const pv = v - (SPRING + 18), pu = x - (VS.x0 + 2);
          const edge = pv === 0 || v === TOP - 6 || pu === 0 || x === VS.x1 - 2;
          c = edge ? P.moulding : pv % 3 === 2 && pu > 1 && h2(pu, pv, 5) > 0.35 && pu % 4 !== 0 ? 0x8a2a24 : vary(P.marble, x, y, z, 0.02);
        }
        else if (impost) c = vary(P.marble, x, y, z, 0.03);
        else if (face && v < SPRING && !inX && !inZ) c = ((x + z) % 10 < 2) ? tint(P.marble, -0.08) : vary(P.marble, x, y, z, 0.03); // marble-faced piers
        else c = quadratum((inX ? x : z) + (inX ? 0 : 3), v, 8, 4, h2(x >> 3, z >> 3, 2) > 0.5 ? P.limestone : P.tuffWarm);
        (v > HEAD ? upper : w).set(x, y, z, c);
      }
    }
    // the cornice projects a voxel all round, on the upper mass
    for (let x = ax0 - 1; x <= ax1 + 1; x++) for (let z = az0 - 1; z <= az1 + 1; z++) {
      if (x >= ax0 && x <= ax1 && z >= az0 && z <= az1) continue;
      upper.set(x, by + TOP - 2, z, vary(P.marble, x, by + TOP - 2, z, 0.03));
    }
  }

  /** The terrace along the south side of the street: stalls, benches, the mule, children, amphorae. */
  function terrace(): void {
    // a fruit stall: a trestle table of grapes and figs
    prop('table', 0, 92, walkY(92) + 1, SOUTH + 2);
    prop('grapes', 0, 94, walkY(94) + 8, SOUTH + 3); prop('figs', 0, 101, walkY(101) + 8, SOUTH + 3);
    prop('grapes', 1, 108, walkY(108) + 1, SOUTH + 7);
    // fish on seaweed from the harbour
    prop('table', 0, 250, walkY(250) + 1, SOUTH + 2);
    prop('fish', 0, 252, walkY(252) + 8, SOUTH + 3); prop('fish', 1, 258, walkY(258) + 8, SOUTH + 3);
    // benches along the parapet, for the old men who watch the street
    for (const bx of [130, 200, 372, 430]) w.stamp(streetBench(14), { x: bx, y: walkY(bx) + 1, z: PARAPET - 4 });
    // the donkey with panniers tied at a ring, waiting for its owner
    w.stamp(donkey(true, 2), { x: 214, y: walkY(214) + 1, z: SOUTH + 8 }, { rotate: 3 });
    for (let y = 1; y <= 5; y++) w.set(200, walkY(200) + y, PARAPET - 1, P.iron);
    // amphorae stacked by the parapet near the counters, a crate of grapes for the vintage
    for (let i = 0; i < 6; i++) prop('amphora', i, 400 + i * 3, walkY(400) + 1, PARAPET - 3);
    for (let i = 0; i < 3; i++) prop('amphora', i, 300 + i * 4, walkY(300) + 1, PARAPET - 3);
    w.stamp(crate('grapes'), { x: 160, y: walkY(160) + 1, z: SOUTH + 3 });
    // the children's knucklebones on the paving between them
    for (const [x, z] of [[153, SOUTH + 8], [155, SOUTH + 6], [154, SOUTH + 9]] as const) w.set(x, walkY(x) + 1, z, 0xefe6d2);
    // potted oleanders and a little fig against the parapet, for shade
    tree('oleander', 0, 60, PARAPET - 4, walkY(60) + 1);
    tree('oleander', 1, 344, PARAPET - 4, walkY(344) + 1);
    tree('fig', 1, 450, PARAPET - 5, walkY(450) + 1);
    // the garland-seller, a basket stall, pots and jugs: their tables face the street, their frames toward us
    for (const [x, kind, v] of [[184, 'garlands', 0], [314, 'baskets', 1], [236, 'pots', 2], [52, 'garlands', 3]] as const) w.stamp(stall(kind, v), { x, y: walkY(x) + 1, z: SOUTH + 8 }, { rotate: 2 });
    L.npcs.push({ id: 'abb-garlands', who: 'puella:8', x: 177, z: SOUTH + 10, facing: Math.PI * 0.9, pose: 'sell' });
    // east of the crossroads, a few more amphorae and a bench
    w.stamp(streetBench(12), { x: 584, y: walkY(584) + 1, z: PARAPET - 4 });
  }

  /** The east end: the street dug up for new lead pipes; trestles across it; paving stacked; a pipe ready. */
  function roadworks(): void {
    const bx = WORKS.barrier;
    // the trestles: a fence of red-and-white planks right across the street, sidewalks and terrace
    for (let z = ROAD_N - WALK; z < PARAPET; z++) {
      const g = w.topAt(bx, z, 80, 0) ?? walkY(bx);
      for (let x = bx; x <= bx + 1; x++) for (let k = 1; k <= 9; k++) {
        const plank = k === 5 || k === 8 || k === 9;
        const post = z % 12 === 0 || z % 12 === 1;
        w.set(x, g + k, z, plank ? vary(((z >> 2) & 1) ? P.red : P.plasterWhite, x, k, z, 0.05) : post ? P.woodDark : vary(P.woodLight, x, k, z, 0.06));
      }
    }
    // the trench across the roadway, the old pipe exposed, the new one beside it
    const ty = roadY(WORKS.x0);
    for (let x = WORKS.x0; x <= WORKS.x1; x++) for (let z = ROAD_N; z <= ROAD_S; z++) {
      for (let y = ty - 6; y <= ty; y++) w.delete(x, y, z);
      w.set(x, ty - 7, z, vary(P.soil, x, ty - 7, z, 0.08));
      w.set(x, ty - 8, z, P.soil);
    }
    for (let x = WORKS.x0 - 1; x <= WORKS.x1 + 1; x++) for (const z of [ROAD_N - 1, ROAD_S + 1]) for (let y = ty - 6; y <= ty; y++) w.set(x, y, z, vary(P.soil, x, y, z, 0.08));
    for (const x of [WORKS.x0 - 1, WORKS.x1 + 1]) for (let z = ROAD_N; z <= ROAD_S; z++) for (let y = ty - 6; y < ty; y++) w.set(x, y, z, vary(P.earth, x, y, z, 0.08));
    for (let z = ROAD_N; z <= ROAD_S; z++) { w.set(WORKS.x0 + 3, ty - 6, z, P.lead); w.set(WORKS.x0 + 4, ty - 6, z, tint(P.lead, -0.15)); }
    // spoil heaps on the sidewalks, the lifted paving, pipes waiting, a spade
    for (const [cx, cz] of [[WORKS.x0 + 4, ROAD_N - 7], [WORKS.x0 + 6, ROAD_S + 7]] as const) for (let dx = -6; dx <= 6; dx++) for (let dz = -4; dz <= 4; dz++) {
      const hgt = Math.round(5 - Math.hypot(dx * 0.8, dz) );
      for (let k = 1; k <= hgt; k++) w.set(cx + dx, walkY(cx) + k, cz + dz, vary(P.earth, cx + dx, k, cz + dz, 0.1));
    }
    w.stamp(pavingPile(), { x: bx - 18, y: walkY(bx) + 1, z: ROAD_S + 2 });
    w.stamp(pipeStack(22, 3), { x: bx - 26, y: walkY(bx) + 1, z: SOUTH + 2 });
    for (let k = 0; k < 12; k++) w.set(bx - 4, walkY(bx) + 1 + Math.floor(k * 0.8), ROAD_S + 10 - Math.floor(k * 0.3), k > 9 ? P.iron : P.wood);
    w.stamp(trestle(14), { x: bx - 16, y: roadY(bx) + 1, z: ROAD_S - 1 });
    L.spots.push({ id: 'abb-roadworks', x: bx - 8, y: roadY(bx), z: (ROAD_N + ROAD_S) / 2, r: 20, verb: 'look' });
  }

  /** Via Stabiana closed: north, a wagon of firewood for the baths' furnace unloading; south, a cart with a wheel off. */
  function vsBlock(): void {
    const close = (z: number) => {
      for (let x = VS.x0 - WALK; x <= VS.x1 + WALK; x++) {
        const g = w.topAt(x, z, 80, 0) ?? vsY(z);
        for (let k = 1; k <= 8; k++) for (let dz = 0; dz <= 1; dz++) w.set(x, g + k, z + dz, k === 4 || k === 8 ? vary(((x >> 2) & 1) ? P.red : P.plasterWhite, x, k, z, 0.05) : x % 10 === 0 ? P.woodDark : vary(P.woodLight, x, k, z + dz, 0.06));
      }
    };
    close(VS_NORTH);
    w.stamp(cart('wood'), { x: (VS.x0 + VS.x1) >> 1, y: vsY(VS_NORTH - 20) + 1, z: VS_NORTH - 30 });
    w.stamp(woodpile(12), { x: VS.x0 - 13, y: (w.topAt(VS.x0 - 10, VS_NORTH - 10, 80, 0) ?? vsY(VS_NORTH)) + 1, z: VS_NORTH - 12 });
    w.stamp(donkey(false, 2), { x: VS.x1 - 4, y: vsY(VS_NORTH - 50) + 1, z: VS_NORTH - 40 });
    close(VS_SOUTH);
    w.stamp(cart('amphorae', true), { x: (VS.x0 + VS.x1) >> 1, y: vsY(VS_SOUTH + 30) + 1, z: VS_SOUTH + 38 }, { rotate: 2 });
    for (let i = 0; i < 4; i++) prop('amphora', i, VS.x0 + 4 + i * 5, vsY(VS_SOUTH + 8) + 1, VS_SOUTH + 8 + (i % 2) * 3);
  }

  /**
   * The lower town below the terrace: houses with compluviate roofs round their atria, gardens with
   * trees and vines, a kitchen garden, an inn's garden under a pergola. Single storey, so the street stays
   * in view; every wall closes the lower town off from the street above.
   */
  function lowerTown(): void {
    const z0 = PARAPET + 2;
    // west of Via Stabiana
    lowHouse(0, 118, z0, 322, 1, { atrium: true, garden: 'fig' });
    kitchenGarden(122, 198, z0, 322);
    lowHouse(202, 330, z0, 322, 2, { atrium: true, garden: 'peristyle' });
    lowHouse(334, 420, z0, 322, 3, { atrium: true, garden: 'olive' });
    innGarden(424, VS.x0 - WALK - 1, z0, 322);
    // a lane, then the next block
    for (let x = 0; x < VS.x0 - WALK; x++) for (let z = 323; z <= 333; z++) w.set(x, lowY(x), z, vary(mixc(P.basalt, P.sidewalkDust, 0.25), x, lowY(x), z, 0.08));
    lowHouse(0, 96, 334, D - 1, 4, { atrium: true, garden: 'vines' });
    lowHouse(100, 210, 334, D - 1, 5, { atrium: true, garden: 'fig' });
    kitchenGarden(214, 286, 334, D - 1);
    lowHouse(290, 400, 334, D - 1, 6, { atrium: true, garden: 'olive' });
    lowHouse(404, VS.x0 - WALK - 1, 334, D - 1, 7, { atrium: false, garden: 'fig' });
    // east of Via Stabiana: a vineyard behind a small house
    lowHouse(VS.x1 + WALK + 1, W - 1, z0, 300, 8, { atrium: true, garden: 'olive' });
    vineyard(VS.x1 + WALK + 1, W - 1, 304, D - 1);
  }

  interface LowOpts { atrium: boolean; garden: 'fig' | 'olive' | 'peristyle' | 'vines' }
  /** A single-storey house: rooms round an atrium (roof sloping in to the impluvium), a garden behind. Roofs stay below y 64. */
  function lowHouse(x0: number, x1: number, z0: number, z1: number, seed: number, o: LowOpts): void {
    const y0 = lowY(x0);
    const fields = [P.ochre, P.plasterWhite, P.red, P.yellow, 0xd9c7a8, 0xc98a5a, P.plasterWhite, P.ochre, P.red];
    const field = fields[seed % fields.length]!;
    const wallH = 63 - y0 - 1;
    const f = facade({ field, dado: seed % 2 ? P.black : P.red, panels: false }, [], seed);
    // the house is the north half (toward the street), the garden the south half
    const hz1 = z0 + Math.floor((z1 - z0) * 0.55);
    wallX(w, x0, x1, z0, z0 + 2, y0 + 1, wallH, f);
    wallX(w, x0, x1, z1 - 2, z1, y0 + 1, wallH - 6, f);
    wallZ(w, z0, z1, x0, x0 + 2, y0 + 1, wallH, f);
    wallZ(w, z0, z1, x1 - 2, x1, y0 + 1, wallH, f);
    wallX(w, x0, x1, hz1 - 2, hz1, y0 + 1, wallH, facade({ field, dado: P.red, panels: true }, [{ u0: ((x1 - x0) >> 1) - 5, u1: ((x1 - x0) >> 1) + 5, v0: 0, v1: 12, kind: 'door' }], seed + 3));
    // the roof: rooms round the atrium, sloping in to the opening
    const ax0 = x0 + 18, ax1 = x1 - 18, az0 = z0 + 14, az1 = hz1 - 14;
    const top = 63;
    for (let x = x0 - 1; x <= x1 + 1; x++) for (let z = z0 - 1; z <= hz1 + 1; z++) {
      const inHole = o.atrium && x > ax0 && x < ax1 && z > az0 && z < az1;
      if (inHole) continue;
      const d = Math.min(x - (x0 - 1), (x1 + 1) - x, z - (z0 - 1), (hz1 + 1) - z);
      const ry = o.atrium ? top - Math.min(4, Math.floor(d / 3)) : Math.min(top, y0 + wallH + 1 + Math.floor(d / 3));
      w.set(x, ry, z, roofTile(x - x0 + 300, d));
      if (x === x0 - 1 || x === x1 + 1 || z === z0 - 1 || z === hz1 + 1) w.set(x, ry - 1, z, vary(P.woodDark, x, ry, z, 0.05));
    }
    if (o.atrium) {
      // the atrium floor and its impluvium
      for (let x = ax0 + 1; x < ax1; x++) for (let z = az0 + 1; z < az1; z++) w.set(x, y0, z, vary(0x8a3a30, x, y0, z, 0.04));
      const ix0 = ax0 + 4, ix1 = ax1 - 4, iz0 = az0 + 4, iz1 = az1 - 4;
      if (ix1 > ix0 && iz1 > iz0) {
        for (let x = ix0 - 1; x <= ix1 + 1; x++) for (let z = iz0 - 1; z <= iz1 + 1; z++) {
          const rim = x === ix0 - 1 || x === ix1 + 1 || z === iz0 - 1 || z === iz1 + 1;
          w.set(x, rim ? y0 + 1 : y0, z, rim ? vary(P.marble, x, y0 + 1, z, 0.03) : vary(0x6fa6b0, x, y0, z, 0.08));
        }
        L.water.push({ x: ix0, z: iz0, w: ix1 - ix0 + 1, d: iz1 - iz0 + 1, level: y0 + 0.8, floor: y0 + 0.2, kind: 'impluvium' });
      }
    }
    // the garden: grass and beds, a colonnade along its north side, trees
    for (let x = x0 + 3; x <= x1 - 3; x++) for (let z = hz1 + 1; z <= z1 - 3; z++) {
      const path = Math.abs(x - ((x0 + x1) >> 1)) < 2 || Math.abs(z - ((hz1 + z1) >> 1)) < 2;
      w.set(x, y0, z, path ? vary(mixc(P.sidewalkDust, P.limestone, 0.4), x, y0, z, 0.06) : meadow(x, y0, z, 0));
    }
    const gx = (x0 + x1) >> 1, gz = (hz1 + z1) >> 1;
    if (o.garden === 'peristyle') {
      for (let x = x0 + 8; x <= x1 - 8; x += 12) for (const z of [hz1 + 6, z1 - 7]) column(w, x, z, y0 + 1, 14, 1, P.plasterWhite);
      w.stamp(fountain(), { x: gx - 5, y: y0 + 1, z: gz - 3 });
      L.water.push({ x: gx - 4, z: gz - 2, w: 9, d: 9, level: y0 + 1 + 5.3, floor: y0 + 1.5, kind: 'fountain' });
      L.jets.push({ x: gx + 0.5, y: y0 + 1 + 8.5, z: gz - 2.5, dir: [0, 1] });
      tree('oleander', 0, x0 + 20, gz, y0 + 1); tree('oleander', 1, x1 - 20, gz + 4, y0 + 1);
      prop('pergola', 0, gx + 16, y0 + 1, hz1 + 10);
    } else if (o.garden === 'vines') {
      prop('pergola', 2, x0 + 10, y0 + 1, gz - 6);
      tree('cypress', 1, x1 - 14, gz, y0 + 1);
    } else {
      tree(o.garden === 'fig' ? 'fig' : 'olive', seed % 2, gx - 12, gz, y0 + 1);
      tree('oleander', seed % 2, gx + 14, gz + 6, y0 + 1);
      if ((x1 - x0) > 100) tree('cypress', seed % 3, x1 - 16, gz - 6, y0 + 1);
    }
    // a kitchen's smoke from some roofs
    if (seed % 3 === 1) L.smoke.push({ kind: 'smoke', x: x0 + 10, y: top + 3, z: z0 + 8 });
  }

  /** A walled kitchen garden: rows of cabbages, leeks and beans, a well, a hut. */
  function kitchenGarden(x0: number, x1: number, z0: number, z1: number): void {
    const y0 = lowY(x0);
    const f = facade({ field: P.plasterWhite, dado: P.plasterWhite, panels: false, bare: 'incertum' }, [], x0);
    wallX(w, x0, x1, z0, z0 + 1, y0 + 1, 10, f);
    wallX(w, x0, x1, z1 - 1, z1, y0 + 1, 8, f);
    wallZ(w, z0, z1, x0, x0 + 1, y0 + 1, 10, f);
    wallZ(w, z0, z1, x1 - 1, x1, y0 + 1, 10, f);
    for (let x = x0 + 2; x <= x1 - 2; x++) for (let z = z0 + 2; z <= z1 - 2; z++) {
      const row = (z - z0) % 6;
      const crop = Math.floor((x - x0) / 18) % 3;
      if (row < 2) { w.set(x, y0, z, vary(P.earthDark, x, y0, z, 0.08)); continue; }
      w.set(x, y0, z, vary(P.earth, x, y0, z, 0.08));
      if (h3(x, crop, z) > 0.35) w.set(x, y0 + 1, z, vary([0x5f8f3a, 0x7a9a48, 0x4f7d32][crop]!, x, y0 + 1, z, 0.12));
      if (crop === 2 && row === 3 && (x & 1)) for (let k = 2; k <= 4; k++) w.set(x, y0 + k, z, vary(0x6a8a3a, x, k, z, 0.1));
    }
    // a well head and a little tool hut with a tiled lean-to
    for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) if (dx * dx + dz * dz <= 10 && dx * dx + dz * dz >= 4) for (let k = 1; k <= 4; k++) w.set(x0 + 20 + dx, y0 + k, z0 + 12 + dz, quadratum(dx + 9, k, 3, 2, P.tuff));
    solid(w, x1 - 22, y0 + 1, z0 + 4, x1 - 6, y0 + 12, z0 + 16, (x, y, z) => (x === x1 - 22 || x === x1 - 6 || z === z0 + 4 || z === z0 + 16 ? incertum(x + z, y, 3) : null));
    shedRoofX(w, x1 - 22, x1 - 6, z0 + 4, z0 + 16, y0 + 15, 1, 1);
    tree('olive', 0, x0 + 18, z1 - 16, y0 + 1);
    if (x1 - x0 > 70) tree('olive', 1, x1 - 18, z1 - 20, y0 + 1);
  }

  /** An inn's garden: tables under a vine pergola, dolia, oleanders. */
  function innGarden(x0: number, x1: number, z0: number, z1: number): void {
    const y0 = lowY(x0);
    const f = facade({ field: P.red, dado: P.black, panels: false }, [], 21);
    wallZ(w, z0, z1, x0, x0 + 2, y0 + 1, 12, f);
    wallZ(w, z0, z1, x1 - 2, x1, y0 + 1, 18, f);
    wallX(w, x0, x1, z1 - 2, z1, y0 + 1, 12, f);
    // the inn's kitchen block against the terrace, tiled
    wallX(w, x0, x1, z0, z0 + 2, y0 + 1, 18, f);
    wallX(w, x0 + 3, x1 - 3, z0 + 22, z0 + 24, y0 + 1, 16, facade({ field: P.red, dado: P.black, panels: false }, [{ u0: 20, u1: 30, v0: 0, v1: 12, kind: 'door' }], 22));
    shedRoofX(w, x0, x1, z0, z0 + 24, 63, 1, 1);
    L.smoke.push({ kind: 'smoke', x: x0 + 12, y: 66, z: z0 + 6 });
    for (let x = x0 + 3; x <= x1 - 3; x++) for (let z = z0 + 25; z <= z1 - 3; z++) w.set(x, y0, z, (x + z) % 7 === 0 ? vary(P.limestone, x, y0, z, 0.05) : vary(mixc(P.sidewalkDust, P.earth, 0.3), x, y0, z, 0.06));
    for (let i = 0; i < 2; i++) prop('pergola', 1 + i, x0 + 10 + i * 40, y0 + 1, z0 + 36);
    for (let i = 0; i < 2; i++) { prop('table', 0, x0 + 18 + i * 40, y0 + 1, z0 + 41); prop('bench', 0, x0 + 18 + i * 40, y0 + 1, z0 + 48); }
    for (let i = 0; i < 4; i++) w.stamp(dolium(), { x: x1 - 12, y: y0 - 2, z: z0 + 60 + i * 9 });
    tree('oleander', 0, x0 + 14, z1 - 14, y0 + 1);
    tree('fig', 0, x0 + 56, z1 - 18, y0 + 1);
  }

  /** Rows of vines on stakes, gold and rust in October, the grapes being picked. */
  function vineyard(x0: number, x1: number, z0: number, z1: number): void {
    const y0 = lowY(x0);
    const f = facade({ field: P.plasterWhite, dado: P.plasterWhite, panels: false, bare: 'incertum' }, [], 30);
    wallZ(w, z0, z1, x0, x0 + 1, y0 + 1, 10, f);
    wallX(w, x0, x1, z0, z0 + 1, y0 + 1, 10, f);
    for (let x = x0 + 2; x <= x1; x++) for (let z = z0 + 2; z <= z1; z++) {
      w.set(x, y0, z, vary((z - z0) % 8 < 2 ? P.earthDark : P.earth, x, y0, z, 0.08));
      if ((z - z0) % 8 === 4) {
        const stake = (x - x0) % 8 === 0;
        for (let k = 1; k <= (stake ? 8 : 6); k++) {
          if (!stake && k < 4) continue;
          const r = h3(x, k, z);
          w.set(x, y0 + k, z, stake ? P.wood : r < 0.4 ? P.vine : r < 0.7 ? P.vineGold : r < 0.9 ? P.vineRust : P.grape);
        }
      }
    }
    for (let i = 0; i < 3; i++) w.stamp(crate('grapes'), { x: x0 + 12 + i * 16, y: y0 + 1, z: z0 + 10 + i * 24 });
  }

  /** The backs of the next block north (they face the next street), roofs and gardens, seen past the shops. */
  function backRow(x0: number, x1: number, z0: number, z1: number): void {
    let x = x0;
    let i = 0;
    while (x < x1 - 20) {
      const wd = Math.min(x1 - x, 44 + Math.floor(h2(i, 1, 51) * 30));
      const hx1 = x + wd - 1;
      const y0 = walkY(x);
      const hgt = 20 + Math.floor(h2(i, 2, 51) * 5);
      const f = facade({ field: [P.ochre, P.plasterWhite, P.red, P.yellow, 0xd9c7a8][i % 5]!, dado: P.red, panels: false }, [], i);
      wallX(w, x, hx1, z1 - 2, z1, y0 + 1, hgt, f);
      wallZ(w, z0, z1, x, x + 2, y0 + 1, hgt, f);
      const garden = h2(i, 3, 51) > 0.5 && z1 - z0 > 40;
      if (garden) {
        // rooms along the street side (north, beyond the box) and along ours, a garden between
        const gz0 = z0 + 16, gz1 = z1 - 18;
        gableRoofX(w, x, hx1, z0, gz0 - 1, y0 + hgt + 1, 1);
        gableRoofX(w, x, hx1, gz1 + 1, z1, y0 + hgt + 1, 1);
        wallX(w, x + 3, hx1 - 3, gz1 - 1, gz1, y0 + 1, hgt, f);
        for (let xx = x + 3; xx <= hx1 - 3; xx++) for (let z = gz0; z < gz1 - 1; z++) w.set(xx, y0, z, meadow(xx, y0, z, 0));
      } else gableRoofX(w, x, hx1, z0, z1, y0 + hgt + 1, 1);
      if (garden) tree(h2(i, 4, 51) > 0.5 ? 'cypress' : 'olive', i % 3, x + (wd >> 1), z0 + 18, y0 + 1);
      x += wd;
      i++;
    }
    // behind the shops and the baths' far side, more of the same is the ring's (the next street north)
    void L;
  }
}

interface ShopSpec {
  x0: number; x1: number;
  /** The back of the plot (z). */
  z0: number;
  storeys: 1 | 2;
  style: FacadeStyle;
  seed: number;
  openings: Opening[];
  /** The doorway (u range) from the shop into the rooms behind. */
  door?: [number, number];
  back: 'garden' | 'yard' | 'court';
  /** The trade painted over the shop opening, centred at `u`. */
  sign?: { text: string; u: number; ink?: number };
  /** Election notices in legible letters (u, v: the panel's bottom-left). */
  notices?: { lines: string[]; u: number; v: number; ink?: number; ink2?: number }[];
  /** Older notices, faded to marks: [u, v, length]. */
  marks?: (readonly [number, number, number])[];
  /** The balcony's span (u). */
  balcony?: [number, number];
  /** A range of rooms along the back of the plot (default true). */
  rooms?: boolean;
}

/**
 * Beyond the box: the city all round. West, the Forum (the street runs on into it); north, the next blocks
 * up the slope; south, the lower town falling toward the theatres and the Stabian Gate; east, the street
 * running on toward the amphitheatre.
 */
const RING: Ring = {
  kind: () => 'city',
  height: (x, z) => {
    if (z > D / 8 - 1) return 5.25 - Math.min(1.5, (z - D / 8) * 0.04);
    if (x > W / 8) return 6;
    if (x < 0) return 6.75;
    return roadY(x * 8) / 8 + 0.375;
  },
};

/** Walkable cells for paths (NPCs, tests): below every balcony and roof, above every floor of the street. */
export function navOf(L: Level) {
  return navGrid(L.world, { cell: 4, clearance: 14, step: 3, top: 68 });
}
