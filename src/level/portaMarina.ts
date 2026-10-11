/**
 * Porta Marina, October AD 79: the sea gate, and Via Marina climbing east into the city. Pure: this
 * module builds the voxels the sim collides with and lists what the world draws on top (trees, props,
 * water, fires, people). Coordinates are voxels (1/8 m): x east, y up, z south.
 *
 * What's here, from the excavations (simplified and compressed, never invented wholesale):
 * - The gate: two barrel-vaulted passages through the wall, a narrow one for people on foot and a wide,
 *   steep one for pack animals, in grey tuff and limestone blocks. The road climbs hard through it.
 * - Outside: tombs along the road (an altar tomb and a semicircular bench tomb, as at the Porta Marina
 *   and Herculaneum gate necropoleis), stone pines and vines on the slope, and the Suburban Baths on
 *   their terrace below the walls, windows to the sea, their furnace smoking.
 * - Inside: Via Marina, paved in lava with raised sidewalks and stepping stones. On the north side a
 *   thermopolium (hot-food counter), the House of the Dog (our "CAVE CANEM" house, with its atrium open
 *   to the sky and a garden behind), a bakery with lava mills and an oven; a lane north with a public
 *   fountain and a water tower at its corner. On the south side the precinct of the Temple of Venus,
 *   being rebuilt after the earthquake of AD 62 (it was still unfinished in 79): scaffolding, stone blocks,
 *   a treadwheel crane.
 */
import { VoxelWorld, navGrid, type Model } from 'ymir/voxel';
import type { Level, Spawn, Ring } from './types';
import { district as districtOf } from './index';
import { P, M, h2, h3, incertum, mixc, noise2, plaster, quadratum, tint, vary } from '../art/palette';
import { archHole, column, dirt, facade, gableRoofX, ground, meadow, mosaic, programma, shedRoofX, solid, street, wallX, wallZ, type Opening } from '../art/build';
import { amphora, counter, crate, dolium, fountain, lararium, mill, oven, waterTower } from '../art/props';

export const W = 640;
export const D = 384;

// ── The road's height: up from the harbour side, steeply through the gate, gently on to the Forum ──
export const GATE = { x0: 192, x1: 247, walkN: 172, walkS: 183, roadN: 200, roadS: 231 } as const;
const ROAD_N = 200, ROAD_S = 231, WALK = 12;
export function roadY(x: number): number {
  // from the quay (y 4) up to the gate (y 28)
  if (x < GATE.x0) return 4 + Math.max(0, Math.floor(((x - QUAY - 10) / (GATE.x0 - QUAY - 10)) * 24));
  if (x <= GATE.x1) return 28 + Math.floor(((x - GATE.x0) / (GATE.x1 - GATE.x0 + 1)) * 12);
  return 40 + Math.floor(((x - GATE.x1) / (W - GATE.x1)) * 12);
}
const WALL_TOP = 76;
/** Where the quay's edge is (x, voxels): the sea west of it. */
export const QUAY = 14;

export type TreeKind = 'pine' | 'cypress' | 'olive' | 'fig' | 'oleander' | 'tuft';
export type { Placed, Source, Spot, Npc, WaterArea, Level } from './types';

/** Where you arrive: off the ship at the quay, or walking down from the Forum. */
export const SPAWNS: Record<string, Spawn> = {
  quay: { x: QUAY + 5, y: 5, z: 232, facing: Math.PI / 2 },
  east: { x: W - 18, y: 53, z: 216, facing: -Math.PI / 2 },
};

export function buildPortaMarina(): Level {
  const w = new VoxelWorld();
  const upper = new VoxelWorld();
  const L: Level = {
    id: 'portaMarina', name: { la: 'Porta Marina', en: 'The Sea Gate', fr: 'La porte de la Mer' },
    world: w, width: W, depth: D, occluders: [{ id: 'gate', world: upper, x0: GATE.x0 - 8, x1: GATE.x1 + 8, z0: 160, z1: 240 }],
    trees: [], props: [], water: [], fires: [], smoke: [], jets: [], spots: [], npcs: [], walkers: [], shops: [],
    exits: [{ id: 'to-forum', to: 'forum', arrive: 'west', x0: W - 4, x1: W - 1, z0: ROAD_N - WALK, z1: ROAD_S + WALK, label: { en: 'To the Forum', fr: 'Vers le Forum' } }],
    spawns: SPAWNS,
    groundAt: (x, z) => (w.topAt(Math.round(x), Math.round(z), roadY(x) + 16, -30) ?? roadY(x)) + 1,
    ring: RING,
    sea: { west: QUAY * 0.125, level: -0.8 },
  };
  const tree = (kind: TreeKind, variant: number, x: number, z: number, y?: number) => L.trees.push({ kind, variant, x, z, y: y ?? surfaceAt(x, z) + 1 });
  const prop = (kind: string, variant: number, x: number, y: number, z: number, rotate = 0) => L.props.push({ kind, variant, x, y, z, rotate });
  const stamp = (m: Model, x: number, y: number, z: number, rotate = 0) => w.stamp(m, { x, y, z }, { rotate });

  // ── Ground ──
  // Outside the walls the hill rises north of the road and falls south toward the baths and the sea.
  const outside = (x: number, z: number) => {
    const r = roadY(x);
    if (x < QUAY) return -24; // the harbour basin's floor, under the water
    if (x < QUAY + 10) return 4; // the quay, a step up from the water
    if (z < ROAD_N - WALK) return r + 3 + Math.floor((ROAD_N - WALK - z) * 0.1 + noise2(x, z, 40, 1) * 6);
    if (z > ROAD_S + WALK) return Math.max(-10, r + 3 - Math.floor((z - ROAD_S - WALK) * 0.45));
    return r;
  };
  // Inside, building plots are flat terraces stepped with the road.
  const inside = (x: number, z: number) => {
    const r = roadY(x);
    if (z < ROAD_N - WALK) return r + 3;
    if (z > ROAD_S + WALK) return roadY(Math.min(W - 1, Math.max(GATE.x1 + 1, x))) + 6; // the temple terrace
    return r;
  };
  function surfaceAt(x: number, z: number): number { return x < GATE.x0 ? outside(x, z) : inside(x, z); }
  ground(w, 0, 0, GATE.x0 - 1, D - 1, outside, meadow, 8);
  ground(w, GATE.x0, 0, W - 1, D - 1, inside, (x, y, z, d) => (z > ROAD_S + WALK ? garden(x, y, z, d) : dirt(x, y, z, d)), 8);

  // ── The quay: big tuff blocks, bollards, the road starting up the hill ──
  for (let x = QUAY; x < QUAY + 10; x++) for (let z = 0; z < D; z++) for (let y = -24; y <= 4; y++) w.set(x, y, z, y === 4 ? vary(((x >> 2) + (z >> 3)) & 1 ? P.tuff : P.tuffWarm, x, y, z, 0.05) : quadratum(z, y, 8, 3, P.tuff));
  for (const bz of [150, 260, 330]) for (let y = 5; y <= 8; y++) for (let x = QUAY + 2; x <= QUAY + 3; x++) for (let z = bz; z <= bz + 1; z++) w.set(x, y, z, vary(P.basalt, x, y, z, 0.05));
  L.props.push({ kind: 'ship', variant: 0, x: QUAY - 26, y: -14, z: 236 });
  for (let i = 0; i < 4; i++) L.props.push({ kind: 'amphora', variant: i, x: QUAY + 4 + (i % 2) * 3, y: 5, z: 246 + i * 3 });
  // ── Via Marina ──
  street(w, { x0: QUAY + 10, x1: GATE.x0 - 1, zN: ROAD_N, zS: ROAD_S, walk: WALK, y: roadY, steps: [] });
  street(w, { x0: GATE.x1 + 1, x1: W - 1, zN: ROAD_N, zS: ROAD_S, walk: WALK, y: roadY, steps: [486] });
  // through the gate: the bare ramp, paved, no sidewalks (the pedestrian vault has its own)
  for (let x = GATE.x0; x <= GATE.x1; x++) for (let z = GATE.roadN; z <= GATE.roadS; z++) {
    const y = roadY(x);
    for (let d = 0; d < 6; d++) w.set(x, y - d, z, d ? vary(P.soil, x, y - d, z) : tint(vary(P.basalt, x, y, z, 0.1), (h2(x >> 2, z >> 2, 9) - 0.5) * 0.15));
  }
  for (let x = GATE.x0; x <= GATE.x1; x++) for (let z = GATE.walkN; z <= GATE.walkS; z++) {
    const y = roadY(x) + 3;
    for (let d = 0; d < 8; d++) w.set(x, y - d, z, d ? vary(P.soil, x, y - d, z) : vary(P.limestone, x, y, z, 0.06));
  }

  // ── The city wall and the gate ──
  const wallFace = (u: number, v: number) => quadratum(u, v, 10, 5, (h2(u >> 3, v >> 2, 3) > 0.7 ? P.limestone : P.tuff));
  for (let z = 0; z < D; z++) {
    if (z >= 160 && z <= 260) continue; // the gate's own block
    const base = Math.min(...[GATE.x0, GATE.x0 + 12, GATE.x1].map((x) => surfaceAt(x, z))) - 2;
    for (let x = GATE.x0; x <= GATE.x0 + 23; x++) for (let y = base; y <= WALL_TOP; y++) {
      // merlons along the top of the outer face
      if (y > WALL_TOP - 4 && x > GATE.x0 + 3) continue;
      if (y > WALL_TOP - 4 && (z % 10) < 4) continue;
      w.set(x, y, z, wallFace(z, y));
    }
  }
  // The gate block: x 192..247, z 160..260, with two vaults east–west.
  const walkHole = archHole(GATE.walkN, GATE.walkS - GATE.walkN + 1, 16);
  const roadHole = archHole(GATE.roadN, GATE.roadS - GATE.roadN + 1, 22);
  const HEAD = 18; // voxels above the road the hero's world keeps; the rest is the hideable upper mass
  for (let x = GATE.x0; x <= GATE.x1; x++) {
    const ry = roadY(x);
    for (let z = 160; z <= 260; z++) for (let y = ry - 2; y <= WALL_TOP + 4; y++) {
      const walkV = y - (ry + 3), roadV = y - ry;
      if (z >= GATE.walkN && z <= GATE.walkS && walkV >= 0 && walkHole(z, walkV)) continue;
      if (z >= GATE.roadN && z <= GATE.roadS && roadV >= 0 && roadHole(z, roadV)) continue;
      if (y < ry && z >= GATE.walkN && z <= GATE.roadS) continue; // the floor is already there
      const outerFace = x <= GATE.x0 + 1 || x >= GATE.x1 - 1;
      const walkway = y === WALL_TOP;
      const c = walkway ? vary(((x >> 3) + (z >> 2)) & 1 ? P.limestone : tint(P.limestone, -0.06), x, y, z, 0.04) : outerFace ? quadratum(z, y, 8, 4, h2(z >> 3, y >> 2, 5) > 0.6 ? P.limestone : P.tuff) : incertum(z + x, y, 2);
      // a walkway on top, merlons only along the outer and inner faces
      const top = y > WALL_TOP;
      const parapet = x <= GATE.x0 + 1 || x >= GATE.x1 - 1;
      if (top && (!parapet || (z % 10) < 5)) continue;
      // the cut where the upper mass lifts away reads as a clean section, like an architect's drawing
      const cut = y === ry + HEAD && !(z >= GATE.walkN && z <= GATE.roadS);
      (y > ry + HEAD ? upper : w).set(x, y, z, cut ? vary(0x4a3a30, x, y, z, 0.04) : c);
    }
  }
  // a small shrine niche of Minerva inside the main vault (gates had them), with a lamp
  L.fires.push({ kind: 'lamp', x: 220, y: roadY(220) + 14, z: 233 });

  // ── Outside: the necropolis by the road, pines, vines ──
  altarTomb(w, 120, 168, outside(130, 168));
  scholaTomb(w, 40, 160, outside(60, 160));
  for (const [x, z, k] of [[20, 120, 0], [90, 90, 1], [150, 130, 2], [60, 40, 0], [170, 50, 1]] as const) tree('pine', k, x, z);
  for (const [x, z, k] of [[112, 175, 0], [160, 175, 1], [30, 175, 2]] as const) tree('cypress', k, x, z);
  for (const [x, z] of [[100, 30], [130, 20], [40, 100]] as const) tree('olive', (x + z) % 2, x, z);
  for (let i = 0; i < 40; i++) { const x = Math.floor(h2(i, 1, 4) * 180), z = Math.floor(h2(i, 2, 4) * 180); tree('tuft', i % 4, x, z); }
  // vines on the slope north (the vintage is under way)
  for (const [x, z] of [[20, 20], [60, 70], [120, 60]] as const) L.props.push({ kind: 'pergola', variant: x % 3, x, y: outside(x + 12, z + 6) + 1, z });

  // ── Outside, south: the Suburban Baths on their terrace ──
  baths(w, L, 24, 300, 160, 372, -10);

  // ── Inside, north side of Via Marina ──
  const front = ROAD_N - WALK - 1; // the house fronts stand at the sidewalk's back edge
  // 1. The thermopolium, with rooms above
  building(w, L, 252, 303, 120, front, inside(260, 150), 50, { field: P.ochre, dado: P.red }, [
    { u0: 8, u1: 40, v0: 0, v1: 22, kind: 'shop' },
  ], 1, (y0) => {
    stamp(counter(26), 262, y0, front - 4);
    L.smoke.push({ kind: 'steam', x: 286, y: y0 + 12, z: front - 9 });
    L.fires.push({ kind: 'hearth', x: 286, y: y0 + 9, z: front - 8 });
    for (let i = 0; i < 4; i++) prop('amphora', i, 256 + i * 3, y0, front - 14, 0);
    L.npcs.push({ id: 'thermopolium', who: 'Vibia', x: 276, z: front - 9, facing: 0, pose: 'sell' });
  });
  // 2. The House of the Dog: shops either side of the fauces, atrium open to the sky, garden behind
  houseOfTheDog(w, L, 308, 399, front);
  // 3. The bakery
  bakery(w, L, 404, 470, front);
  // 4. The lane north, its fountain and water tower
  const laneY = inside(486, 150);
  for (let x = 474; x <= 497; x++) for (let z = 40; z < front + 1; z++) w.set(x, laneY, z, vary(mixc(P.basalt, P.sidewalkDust, 0.25), x, laneY, z, 0.08));
  const fy = roadY(486) + 3;
  stamp(fountain(), 486 - 5, fy + 1, ROAD_N - WALK + 1);
  L.water.push({ x: 486 - 4, z: ROAD_N - WALK + 2, w: 9, d: 9, level: fy + 1 + 5.3, floor: fy + 1.5, kind: 'fountain' });
  L.jets.push({ x: 486 + 0.5, y: fy + 1 + 8.5, z: ROAD_N - WALK + 1.5, dir: [0, 1] });
  L.spots.push({ id: 'fountain', x: 486, y: fy + 1, z: ROAD_N - WALK + 12, r: 14, verb: 'drink' });
  stamp(waterTower(52), 500, laneY + 1, front - 12);
  for (let x = 500; x < 560; x++) w.set(x, fy, ROAD_N - WALK + 1, vary(P.lead, x, fy, ROAD_N - 1, 0.05)); // the lead pipe along the kerb
  // 5. Houses and a shop toward the Forum
  building(w, L, 502, 568, 110, front, inside(530, 150), 52, { field: P.plasterWhite, dado: P.black }, [
    { u0: 6, u1: 22, v0: 0, v1: 20, kind: 'shop' }, { u0: 34, u1: 40, v0: 0, v1: 20, kind: 'door' }, { u0: 50, u1: 56, v0: 30, v1: 38, kind: 'window' },
  ], 3, (y0) => {
    for (let i = 0; i < 6; i++) prop('amphora', i, 510 + (i % 3) * 4, y0, front - 6 - Math.floor(i / 3) * 4);
    L.npcs.push({ id: 'wine', who: 'Faustus', x: 516, z: front + 4, facing: 0, pose: 'sell' });
  });
  building(w, L, 572, 639, 100, front, inside(600, 150), 48, { field: P.red, dado: P.black }, [
    { u0: 10, u1: 16, v0: 0, v1: 20, kind: 'door' }, { u0: 30, u1: 50, v0: 0, v1: 20, kind: 'shop' },
  ], 4);

  // ── Inside, south side: the precinct of the Temple of Venus, under reconstruction ──
  templeOfVenus(w, L, GATE.x1 + 6, 600, ROAD_S + WALK + 1);

  // Stepping stones' crossing, a cart's ruts, the people of the street
  // the toll collector sits outside the gate, by the road, with his table and tablets
  L.npcs.push({ id: 'portitor', who: 'Sextus', x: GATE.x0 - 14, z: ROAD_S + 6, facing: -Math.PI / 2, pose: 'sit' });
  prop('table', 0, GATE.x0 - 24, roadY(GATE.x0 - 24) + 4, ROAD_S + 3);
  L.npcs.push({ id: 'water-carrier', who: 'Prima', x: 478, z: ROAD_N - WALK + 6, facing: Math.PI, pose: 'drink' });
  L.npcs.push({ id: 'kids', who: 'Lucius', x: 430, z: ROAD_N - 6, facing: 0.6, pose: 'idle' });

  // The tombs and the gate can be read; people spoken to (the sim decides what each says).
  L.spots.push({ id: 'gate', x: GATE.x0 - 6, y: roadY(GATE.x0 - 6), z: GATE.roadN + 4, r: 18, verb: 'look' });
  L.spots.push({ id: 'tomb', x: 135, y: outside(135, 186), z: 186, r: 16, verb: 'read' });

  // ── Shops: a counter to buy at, a keeper behind it ──
  L.shops.push(
    { id: 'thermopolium', name: { la: 'Thermopolium', en: 'Vibia’s hot-food counter', fr: 'Le comptoir chaud de Vibia' }, sign: 'THERMOPOLIVM', keeper: 'thermopolium', x: 276, z: front + 4,
      stock: [{ item: 'bread', price: 2 }, { item: 'cheese', price: 3 }, { item: 'grapes', price: 1 }, { item: 'apple', price: 1 }] },
    { id: 'baker', name: { la: 'Pistor', en: 'Modestus’s bakery', fr: 'La boulangerie de Modestus' }, sign: 'PISTOR', keeper: 'baker', x: 436, z: front + 4,
      stock: [{ item: 'bread', price: 1 }, { item: 'treat', price: 1 }] },
    { id: 'oil', name: { la: 'Oleum', en: 'Faustus’s wine and oil shop', fr: 'Le marchand de vin et d’huile Faustus' }, sign: 'OLEVM', keeper: 'wine', x: 516, z: front + 8,
      stock: [{ item: 'oil', price: 4 }, { item: 'flask', price: 3 }] },
  );
  for (const sh of L.shops) L.spots.push({ id: `shop:${sh.id}`, x: sh.x, y: roadY(sh.x) + 3, z: sh.z, r: 12, verb: 'shop' });

  // ── The people of the street ──
  L.npcs.push(
    { id: 'old-man', who: 'senex:0', x: 62, z: 176, facing: 0.2, pose: 'sit' }, // resting on the schola tomb's bench
    { id: 'grape-farmer', who: 'agricola:1', x: 168, z: 244, facing: -1.2, pose: 'idle' }, // waiting at the gate with grapes
    { id: 'mason-2', who: 'faber:2', x: 360, z: 285, facing: Math.PI, pose: 'work' },
    { id: 'boy-fountain', who: 'puer:3', x: 498, z: ROAD_N - WALK + 8, facing: -0.6, pose: 'idle' },
  );
  L.walkers.push(
    { id: 'sailor', who: 'nauta:0', path: [[30, 236], [170, 236], [170, 228], [30, 228]], speed: 11, phase: 0 },
    { id: 'girl', who: 'puella:1', path: [[260, 194], [620, 194], [620, 196], [260, 196]], speed: 9, phase: 120 },
    { id: 'grandmother', who: 'avia:0', path: [[270, 236], [600, 236], [600, 238], [270, 238]], speed: 6, phase: 40 },
    { id: 'merchant', who: 'mercator:2', path: [[300, 212], [630, 212], [630, 220], [300, 220]], speed: 10, phase: 300 },
    { id: 'woman', who: 'femina:4', path: [[486, 120], [486, 186], [560, 194], [486, 194]], speed: 8, phase: 0 },
  );
  return L;

  function garden(x: number, y: number, z: number, d: number): number {
    if (d > 0) return vary(P.soil, x, y, z, 0.08);
    // a gravel walk round the temple, grass between
    const walk = noise2(x, z, 30, 9) > 0.55;
    return walk ? vary(mixc(P.sidewalkDust, P.limestone, 0.4), x, y, z, 0.07) : meadow(x, y, z, d);
  }
}

/** A building on the north side: walls round [x0..x1]×[z0..z1] (z1 is the street front), floor at y0, `h` tall, a gable roof. */
function building(w: VoxelWorld, L: Level, x0: number, x1: number, z0: number, z1: number, y0: number, h: number, style: { field: number; dado: number }, openings: Opening[], seed: number, inside?: (y0: number) => void): void {
  const f = facade({ ...style }, openings, seed);
  const plain = facade({ field: P.plasterWhite, dado: P.plasterWhite, panels: false, bare: 'incertum' }, [], seed);
  // floor
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) w.set(x, y0, z, vary(0xb9a58a, x, y0, z, 0.05));
  wallX(w, x0, x1, z1 - 2, z1, y0 + 1, h, f); // the street front, painted
  wallX(w, x0, x1, z0, z0 + 2, y0 + 1, h - 6, plain); // the back
  wallZ(w, z0, z1, x0, x0 + 2, y0 + 1, h - 2, (u, v, x, y, z) => plain(u, v, x, y, z));
  wallZ(w, z0, z1, x1 - 2, x1, y0 + 1, h - 2, (u, v, x, y, z) => plain(u, v, x, y, z));
  // an upper floor: a balcony (maenianum) over the street on beams, with a wooden rail
  for (let x = x0 + 4; x <= x1 - 4; x++) for (let z = z1 + 1; z <= z1 + 7; z++) {
    w.set(x, y0 + 30, z, vary(P.woodLight, x, y0 + 30, z, 0.06));
    if (z === z1 + 7 && (x % 3 === 0)) for (let k = 1; k <= 6; k++) w.set(x, y0 + 30 + k, z, P.wood);
    if (z === z1 + 7) w.set(x, y0 + 37, z, P.woodDark);
  }
  // beams under it, and its own little roof
  for (let x = x0 + 4; x <= x1 - 4; x += 6) for (let z = z1 + 1; z <= z1 + 7; z++) w.set(x, y0 + 29, z, P.woodDark);
  shedRoofX(w, x0 + 4, x1 - 4, z1 + 1, z1 + 6, y0 + h - 4, 1, 1);
  // windows above the balcony, lit in the evening
  for (let x = x0 + 10; x < x1 - 8; x += 16) for (let y = y0 + 40; y < y0 + 46; y++) for (let xx = x; xx < x + 4; xx++) w.set(xx, y, z1 - 2, P.glowWindow, true);
  // painted notices on the dado and field
  const prog = programma(6 + seed * 3, 13, 20 + (seed % 2) * 8, seed);
  for (let x = x0; x <= x1; x++) for (let v = 12; v <= 18; v++) {
    const c = prog(x - x0, v);
    if (c !== null && !w.isGlow(x, y0 + 1 + v, z1)) w.set(x, y0 + 1 + v, z1, c);
  }
  gableRoofX(w, x0, x1, z0, z1, y0 + h + 1, 3);
  inside?.(y0 + 1);
  void L;
}

function houseOfTheDog(w: VoxelWorld, L: Level, x0: number, x1: number, front: number): void {
  const y0 = roadY(Math.round((x0 + x1) / 2)) + 3;
  const z0 = 70;
  const style = { field: P.yellow, dado: P.redDark };
  const fauces = { u0: 40, u1: 50, v0: 0, v1: 24, kind: 'door' as const };
  const openings: Opening[] = [{ u0: 6, u1: 30, v0: 0, v1: 22, kind: 'shop' }, fauces, { u0: 60, u1: 84, v0: 0, v1: 22, kind: 'shop' }];
  const f = facade(style, openings, 2);
  const plain = facade({ field: P.plasterWhite, dado: P.plasterWhite, panels: false, bare: 'incertum' }, [], 2);
  // floors: shops and fauces at street level, atrium and garden behind
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= front; z++) w.set(x, y0, z, vary(0xc9b89c, x, y0, z, 0.04));
  wallX(w, x0, x1, front - 2, front, y0 + 1, 44, f);
  wallX(w, x0, x1, z0, z0 + 2, y0 + 1, 30, plain);
  wallZ(w, z0, front, x0, x0 + 2, y0 + 1, 40, plain);
  wallZ(w, z0, front, x1 - 2, x1, y0 + 1, 40, plain);
  // CAVE CANEM: the mosaic in the fauces, a black dog on white with a red collar
  const fx0 = x0 + 40, fx1 = x0 + 50;
  mosaic(w, fx0, front - 14, fx1, front - 3, y0, (u, v) => dogMosaic(u, v));
  // the shop walls either side of the fauces, its roof low
  wallZ(w, front - 30, front - 3, fx0 - 3, fx0 - 1, y0 + 1, 30, (u, v) => plaster(P.redDark, u, v, 1));
  wallZ(w, front - 30, front - 3, fx1 + 1, fx1 + 3, y0 + 1, 30, (u, v) => plaster(P.redDark, u, v, 1));
  shedRoofX(w, x0, fx0 - 1, front - 30, front, y0 + 46, 1, 3);
  shedRoofX(w, fx1 + 1, x1, front - 30, front, y0 + 46, 1, 3);
  // the atrium: roofs slope inward to the compluvium; below it the impluvium catches the rain
  const ax0 = x0 + 20, ax1 = x1 - 20, az0 = front - 70, az1 = front - 31;
  for (let x = ax0; x <= ax1; x++) for (let z = az0; z <= az1; z++) w.set(x, y0, z, vary(0x8a3a30, x, y0, z, 0.04)); // cocciopesto floor, red
  for (let x = x0 + 3; x <= x1 - 3; x++) for (let z = az0 - 2; z <= az1; z++) {
    const ix = Math.min(x - ax0, ax1 - x), iz = Math.min(z - az0, az1 - z);
    const toHole = Math.min(Math.max(0, ix - 10), Math.max(0, iz - 8));
    const inHole = x > ax0 + 14 && x < ax1 - 14 && z > az0 + 12 && z < az1 - 10;
    if (inHole) continue;
    const y = y0 + 34 + Math.floor(Math.max(0, Math.min(Math.abs(x - (ax0 + ax1) / 2) - 8, Math.abs(z - (az0 + az1) / 2) - 6)) / 3) + 0 * toHole;
    w.set(x, y, z, roofTileAt(x, z));
  }
  const ix0 = ax0 + 16, ix1 = ax1 - 16, iz0 = az0 + 14, iz1 = az1 - 12;
  for (let x = ix0 - 1; x <= ix1 + 1; x++) for (let z = iz0 - 1; z <= iz1 + 1; z++) {
    const rim = x === ix0 - 1 || x === ix1 + 1 || z === iz0 - 1 || z === iz1 + 1;
    if (rim) w.set(x, y0 + 1, z, vary(P.marble, x, y0 + 1, z, 0.03));
    else { w.set(x, y0, z, vary(0x6fa6b0, x, y0, z, 0.08)); }
  }
  L.water.push({ x: ix0, z: iz0, w: ix1 - ix0 + 1, d: iz1 - iz0 + 1, level: y0 + 0.8, floor: y0 + 0.2, kind: 'impluvium' });
  // the lararium on the atrium wall, its lamp lit
  w.stamp(lararium(), { x: ax0 + 2, y: y0 + 8, z: az0 - 1 });
  L.fires.push({ kind: 'lamp', x: ax0 + 7, y: y0 + 14, z: az0 + 1 });
  // the garden (peristyle) behind: open to the sky, a fig, oleanders, a little fountain
  const gz0 = z0 + 3, gz1 = az0 - 3;
  for (let x = x0 + 3; x <= x1 - 3; x++) for (let z = gz0; z <= gz1; z++) w.set(x, y0, z, meadow(x, y0, z, 0));
  for (let x = x0 + 8; x <= x1 - 8; x += 12) column(w, x, gz1 - 2, y0 + 1, 26, 1, P.plasterWhite);
  shedRoofX(w, x0 + 3, x1 - 3, gz1 - 5, gz1 + 1, y0 + 30, -1, 1);
  L.trees.push({ kind: 'fig', variant: 0, x: x0 + 24, y: y0 + 1, z: gz0 + 12 });
  L.trees.push({ kind: 'oleander', variant: 0, x: x1 - 20, y: y0 + 1, z: gz0 + 8 });
  L.trees.push({ kind: 'oleander', variant: 1, x: x1 - 36, y: y0 + 1, z: gz0 + 18 });
  w.stamp(fountain(), { x: x0 + 52, y: y0 + 1, z: gz0 + 10 });
  L.water.push({ x: x0 + 53, z: gz0 + 11, w: 9, d: 9, level: y0 + 1 + 5.3, floor: y0 + 1.5, kind: 'fountain' });
  L.jets.push({ x: x0 + 57.5, y: y0 + 1 + 8.5, z: gz0 + 10.5, dir: [0, 1] });
  // Ferox, lying across the threshold
  L.npcs.push({ id: 'ferox', who: 'Ferox', x: fx0 + 5, z: front - 6, facing: 0, pose: 'lie' });
  L.spots.push({ id: 'cave-canem', x: fx0 + 5, y: y0, z: front + 6, r: 16, verb: 'read' });
  // shops: amphorae on one side, a fuller's vats glimpse on the other
  for (let i = 0; i < 5; i++) w.stamp(amphora(i), { x: x0 + 8 + i * 4, y: y0 + 1, z: front - 22 });
  w.stamp(dolium(), { x: x1 - 24, y: y0 - 3, z: front - 16 });
  w.stamp(dolium(), { x: x1 - 12, y: y0 - 3, z: front - 16 });
}

function bakery(w: VoxelWorld, L: Level, x0: number, x1: number, front: number): void {
  const y0 = roadY(Math.round((x0 + x1) / 2)) + 3;
  const z0 = 96;
  const f = facade({ field: P.ochre, dado: P.black }, [{ u0: 20, u1: 44, v0: 0, v1: 22, kind: 'shop' }], 5);
  const plain = facade({ field: P.plasterWhite, dado: P.plasterWhite, panels: false, bare: 'incertum' }, [], 5);
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= front; z++) w.set(x, y0, z, vary(mixc(P.basalt, P.sidewalkDust, 0.5), x, y0, z, 0.08));
  wallX(w, x0, x1, front - 2, front, y0 + 1, 40, f);
  wallX(w, x0, x1, z0, z0 + 2, y0 + 1, 34, plain);
  wallZ(w, z0, front, x0, x0 + 2, y0 + 1, 34, plain);
  wallZ(w, z0, front, x1 - 2, x1, y0 + 1, 34, plain);
  // the shop front room roofed; the mill yard behind open to the sky
  shedRoofX(w, x0, x1, front - 26, front, y0 + 42, 1, 3);
  for (const [mx, mz] of [[x0 + 16, front - 52], [x0 + 36, front - 56], [x0 + 52, front - 50]] as const) w.stamp(mill(), { x: mx, y: y0 + 1, z: mz });
  w.stamp(oven(), { x: x1 - 16, y: y0 + 1, z: z0 + 18 });
  L.fires.push({ kind: 'oven', x: x1 - 16, y: y0 + 10, z: z0 + 27 });
  L.smoke.push({ kind: 'smoke', x: x1 - 16, y: y0 + 26, z: z0 + 11 });
  L.npcs.push({ id: 'baker', who: 'Modestus', x: x0 + 32, z: front - 12, facing: 0, pose: 'sell' });
  for (let i = 0; i < 3; i++) w.stamp(crate('bread'), { x: x0 + 24 + i * 7, y: y0 + 1, z: front - 6 });
}

function baths(w: VoxelWorld, L: Level, x0: number, z0: number, x1: number, z1: number, y0: number): void {
  // the terrace
  for (let x = x0 - 8; x <= x1 + 8; x++) for (let z = z0 - 8; z <= z1 + 8; z++) {
    const t = w.topAt(x, z, 200, -16) ?? y0;
    for (let y = Math.min(t, y0); y <= y0; y++) w.set(x, y, z, y === y0 ? vary(P.sidewalkDust, x, y, z, 0.06) : quadratum(x + z, y, 6, 3, P.tuff));
    for (let y = y0 + 1; y <= t; y++) w.delete(x, y, z);
  }
  // a ramp down from the road
  for (let x = x1 - 4; x <= x1 + 14; x++) for (let z = ROAD_S + WALK + 1; z < z0 - 8; z++) {
    const t = Math.round(roadY(x) + 3 - ((z - ROAD_S - WALK) / (z0 - 8 - ROAD_S - WALK)) * (roadY(x) + 3 - y0));
    for (let y = t - 4; y <= t; y++) w.set(x, y, z, y === t ? vary((z & 3) === 0 ? P.tuff : P.limestone, x, y, z, 0.06) : vary(P.soil, x, y, z));
    for (let y = t + 1; y <= t + 30; y++) w.delete(x, y, z);
  }
  const arches: Opening[] = [];
  for (let u = 10; u < x1 - x0 - 10; u += 22) arches.push({ u0: u, u1: u + 11, v0: 10, v1: 30, kind: 'window' });
  const f = facade({ field: P.plasterWhite, dado: P.red }, arches, 7);
  const BH = 38;
  wallX(w, x0, x1, z1 - 2, z1, y0 + 1, BH, f); // the south face, toward us: tall windows
  wallX(w, x0, x1, z0, z0 + 2, y0 + 1, BH, facade({ field: P.plasterWhite, dado: P.red }, [{ u0: 100, u1: 110, v0: 0, v1: 22, kind: 'door' }], 8));
  wallZ(w, z0, z1, x0, x0 + 2, y0 + 1, BH, facade({ field: P.plasterWhite, dado: P.red }, [{ u0: 20, u1: 31, v0: 10, v1: 30, kind: 'window' }, { u0: 50, u1: 61, v0: 10, v1: 30, kind: 'window' }], 9));
  wallZ(w, z0, z1, x1 - 2, x1, y0 + 1, BH, facade({ field: P.plasterWhite, dado: P.red }, [], 10));
  // the warm rooms glow behind the windows (glass in Roman baths was real: small panes in bronze frames)
  for (const a of arches) for (let u = a.u0; u <= a.u1; u++) for (let v = a.v0; v <= a.v1; v++) {
    const pane = (u - a.u0) % 4 === 0 || (v - a.v0) % 6 === 0;
    w.set(x0 + u, y0 + 1 + v, z1 - 3, pane ? P.bronze : 0xffd9a0, !pane);
  }
  for (let x = x0 + 3; x < x1 - 2; x++) for (let z = z0 + 3; z < z1 - 2; z++) w.set(x, y0, z, vary(P.marble, x, y0, z, 0.03));
  gableRoofX(w, x0, x1, z0, z1, y0 + BH + 1, 3);
  // the furnace (praefurnium) stack at the north-east corner: smoke and steam
  for (let x = x1 - 12; x <= x1 - 4; x++) for (let z = z0 + 4; z <= z0 + 12; z++) for (let y = y0 + 1; y <= y0 + 58; y++) w.set(x, y, z, quadratum(x + z, y, 4, 2, P.brick));
  L.smoke.push({ kind: 'smoke', x: x1 - 8, y: y0 + 60, z: z0 + 8 });
  L.smoke.push({ kind: 'steam', x: x0 + 40, y: y0 + 50, z: (z0 + z1) / 2 });
  L.fires.push({ kind: 'furnace', x: x1 - 8, y: y0 + 6, z: z0 + 14 });
  L.spots.push({ id: 'baths', x: x1 + 4, y: y0, z: z0 - 6, r: 18, verb: 'look' });
}

function templeOfVenus(w: VoxelWorld, L: Level, x0: number, x1: number, z0: number): void {
  // the precinct's parapet along the street, plastered, with steps up to the terrace in the middle
  for (let x = x0; x <= x1; x++) {
    const ry = roadY(x) + 3, ty = roadY(Math.max(GATE.x1 + 1, x)) + 6;
    const stair = x >= 372 && x <= 404;
    for (let z = z0; z <= z0 + 2; z++) for (let y = ry + 1; y <= ty + (stair ? 0 : 8); y++) {
      if (stair) { w.set(x, Math.min(ty, ry + (z - z0 + 1) * 2), z, vary(P.limestone, x, y, z, 0.04)); continue; }
      w.set(x, y, z, y === ty + 8 ? vary(P.moulding, x, y, z, 0.03) : plaster(P.plasterWhite, x, y, 4));
    }
  }
  // the podium of the temple, half rebuilt: courses of new limestone, scaffolding, blocks waiting
  const px0 = 330, px1 = 450, pz0 = 290, pz1 = 372;
  const py = roadY(390) + 6;
  for (let x = px0; x <= px1; x++) for (let z = pz0; z <= pz1; z++) for (let y = py + 1; y <= py + 20; y++) {
    const edge = x === px0 || x === px1 || z === pz0 || z === pz1;
    // the finished courses rise higher at the back: work moves forward
    const done = py + 8 + Math.floor(((pz1 - z) / (pz1 - pz0)) * 12);
    if (y > done) continue;
    w.set(x, y, z, edge ? quadratum(x + z, y, 8, 4, P.limestone) : vary(P.limestone, x, y, z, 0.05));
  }
  // a few columns standing at the back, unfluted drums still being set
  for (let x = px0 + 10; x < px1; x += 20) column(w, x, pz0 + 8, py + 21, 44 - ((x / 20) % 2) * 14, 3, P.limestone);
  // scaffolding along the front of the podium
  for (let x = px0 - 4; x <= px1 + 4; x += 12) for (let y = py + 1; y <= py + 36; y++) w.set(x, y, pz1 + 4, P.wood);
  for (const yy of [py + 12, py + 24, py + 36]) for (let x = px0 - 4; x <= px1 + 4; x++) { w.set(x, yy, pz1 + 4, P.woodLight); w.set(x, yy, pz1 + 5, P.woodLight); }
  // blocks waiting on the terrace
  for (let i = 0; i < 6; i++) {
    const bx = 300 + i * 26 + Math.floor(h2(i, 1, 6) * 6), bz = 270 + Math.floor(h2(i, 2, 6) * 10);
    solid(w, bx, py + 1, bz, bx + 9, py + 5, bz + 6, (x, y, z) => vary(P.limestone, x, y, z, 0.05));
  }
  // a treadwheel crane (polyspastos) by the podium
  L.props.push({ kind: 'crane', variant: 0, x: px1 + 20, y: py + 1, z: pz1 - 10 });
  // the portico along the north side of the terrace and trees in the precinct
  // a colonnade round the temple's podium (the precinct's porticoes stood back from the street)
  const ty = roadY(390) + 6;
  for (let x = px0 - 12; x <= px1 + 12; x += 14) column(w, x, pz0 - 14, ty + 1, 26, 2, P.plasterWhite);
  for (let x = px0 - 16; x <= px1 + 16; x++) for (let z = pz0 - 18; z <= pz0 - 10; z++) w.set(x, ty + 27, z, vary(z === pz0 - 18 ? P.moulding : P.plasterWhite, x, ty + 27, z, 0.03));
  shedRoofX(w, px0 - 16, px1 + 16, pz0 - 18, pz0 - 4, ty + 32, 1, 1);
  for (const [x, z, k] of [[280, 300, 0], [500, 310, 1], [560, 290, 2]] as const) L.trees.push({ kind: 'cypress', variant: k, x, z, y: roadY(x) + 7 });
  for (const [x, z] of [[290, 350], [520, 360]] as const) L.trees.push({ kind: 'pine', variant: (x / 10) % 3, x, z, y: roadY(x) + 7 });
  L.npcs.push({ id: 'mason', who: 'Celsus', x: px0 + 40, z: pz1 + 12, facing: Math.PI, pose: 'work' });
  L.spots.push({ id: 'temple', x: 388, y: roadY(388) + 3, z: z0 - 4, r: 18, verb: 'look' });
}

/** An altar tomb: a stepped base and a block with a moulded top, plastered white, an inscription panel. */
function altarTomb(w: VoxelWorld, x0: number, z0: number, y0: number): void {
  solid(w, x0, y0, z0, x0 + 30, y0 + 4, z0 + 18, (x, y, z) => quadratum(x + z, y, 6, 2, P.tuff));
  solid(w, x0 + 4, y0 + 5, z0 + 3, x0 + 26, y0 + 26, z0 + 15, (x, y, z) => (y > y0 + 23 ? vary(P.moulding, x, y, z, 0.03) : plaster(P.plasterWhite, x, y, 3)));
  // the inscription panel facing the road
  for (let x = x0 + 8; x <= x0 + 22; x++) for (let y = y0 + 12; y <= y0 + 19; y++) w.set(x, y, z0 + 16, (y === y0 + 12 || y === y0 + 19 || x === x0 + 8 || x === x0 + 22) ? P.moulding : (h3(x, y, 1) > 0.55 && (y - y0) % 2 === 0 ? P.black : P.marble));
  // a cippus (marker) and an urn on top
  solid(w, x0 + 12, y0 + 27, z0 + 7, x0 + 18, y0 + 32, z0 + 11, (x, y, z) => vary(P.marble, x, y, z, 0.04));
}

/** A schola tomb: a semicircular stone bench where travellers could sit, open to the road. */
function scholaTomb(w: VoxelWorld, x0: number, z0: number, y0: number): void {
  const cx = x0 + 22, cz = z0 + 24;
  for (let x = x0; x <= x0 + 44; x++) for (let z = z0; z <= cz; z++) {
    const d = Math.hypot(x - cx, z - cz);
    if (d > 22 || d < 15) continue;
    const back = d > 19;
    for (let y = y0; y <= y0 + (back ? 9 : 4); y++) w.set(x, y, z, back && y > y0 + 4 ? plaster(P.plasterWhite, x, y, 6) : quadratum(x + z, y, 5, 2, P.tuff));
  }
  // winged lion feet at the bench's ends
  for (const ex of [x0 + 1, x0 + 43]) solid(w, ex - 1, y0, cz - 2, ex + 1, y0 + 5, cz, () => P.tuffWarm);
}

/** CAVE CANEM: a black chained dog on white, red collar, the words beneath (as a pattern of black marks). */
function dogMosaic(u: number, v: number): number | null {
  const border = u === 0 || v === 0 || u === 10 || v === 11 || u === 1 || v === 1 || u === 9 || v === 10;
  if (border) return P.black;
  // the dog: body, head, legs (seen from the door, so drawn the right way up for someone entering)
  const dog = (v >= 3 && v <= 5 && u >= 2 && u <= 7) || (v >= 2 && v <= 4 && u >= 7 && u <= 8) || ((u === 3 || u === 6) && v === 6) || (u === 1 && v === 3);
  if (u === 7 && v === 5) return P.red;
  if (dog) return P.black;
  if (v === 8 && u >= 2 && u <= 8 && u % 2 === 0) return P.black; // the letters, CAVE CANEM, as marks
  return P.marble;
}

const roofTileAt = (x: number, z: number) => ((x % 4) === 0 ? vary(P.imbrex, x, 0, z, 0.06) : vary(((Math.floor(z / 3) + Math.floor(x / 4)) & 1) ? P.tile : P.tileDark, x, 1, z, 0.07));

/**
 * Beyond the box: the bay to the west, the city wall running north and south from the gate, the city
 * east of it, vineyards and pines on the slope outside the walls, the land falling to the sea south.
 */
const RING: Ring = {
  kind: (x, z) => {
    if (x < 1.75) return 'sea';
    if (x >= 24 && x < 27) return 'wall';
    if (x < 24) return z > 100 ? 'sea' : 'country';
    return 'city';
  },
  height: (x, z) => {
    if (x < 24) return z < 0 ? 3 + Math.min(10, -z * 0.12) : z > 48 ? Math.max(0, 2 - (z - 48) * 0.05) : 3;
    return 6.5;
  },
};

/** The level (via the district registry, which keeps it built). */
export function portaMarina(): Level { return districtOf('portaMarina'); }

/** Walkable cells for paths (NPCs, the dog, tests). */
export function navOf(L: Level) {
  return navGrid(L.world, { cell: 4, clearance: 14, step: 3, top: 66 }); // below every roof and balcony: they are not floors
}

export { M };
