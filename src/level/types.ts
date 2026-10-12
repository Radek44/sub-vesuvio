/**
 * What a district is, for the sim and the world. A district is one walkable part of Pompeii (Porta Marina,
 * the Forum, Via dell'Abbondanza…), built as its own VoxelWorld at 1/8 m and loaded one at a time. Streets
 * run off its edges into the next district (`exits`). Around it, a coarser ring of the rest of the city
 * and the countryside (`ring`, at 1/2 m) fills the view so the town never ends in empty air.
 *
 * Coordinates are voxels of the district's own world: x east, y up, z south.
 */
import type { VoxelWorld } from 'ymir/voxel';

export type DistrictId = 'portaMarina' | 'forum' | 'abbondanza';
export type Text = { en: string; fr: string };
export type Named = Text & { la: string };

export interface Placed {
  kind: string; variant: number; x: number; y: number; z: number; rotate?: number;
  /** A story flag that takes it out of the world (Fortunata's cat, once she's home). */
  goneWith?: string;
}
export interface Source { x: number; y: number; z: number }
export type Verb = 'speak' | 'read' | 'look' | 'drink' | 'enter' | 'command' | 'knock' | 'shop' | 'take' | 'go';
/** Something the hero can act on: its conversation is `TALK_TO[id]` in the content, or a shop, or an exit. */
export interface Spot { id: string; x: number; y: number; z: number; r: number; verb: Verb }
export type Pose = 'idle' | 'sit' | 'work' | 'sell' | 'drink' | 'lie';
/**
 * Someone who stands (or sits, or works) in one place. `who` is a cast name (`Vibia`) or a townsperson
 * type with a variant (`puella:2`, `pistor:0`): those wear the Latin word for what they are as a name tag.
 */
export interface Npc { id: string; who: string; x: number; z: number; facing: number; pose: Pose }
/** Someone walking a loop of waypoints (voxels), at `speed` voxels per second, starting `phase` voxels along it. */
export interface Walker { id: string; who: string; path: [number, number][]; speed: number; phase: number }
export interface WaterArea { x: number; z: number; w: number; d: number; level: number; floor: number; kind: 'fountain' | 'pool' | 'impluvium' }
/** Walk into the box and you go on to `to`, arriving at its spawn `arrive`. */
export interface Exit { id: string; to: DistrictId; arrive: string; x0: number; x1: number; z0: number; z1: number; label: Text }
export interface Spawn { x: number; y: number; z: number; facing: number }
/** A shop: its painted sign, its keeper (an npc id), what it sells (item ids and prices in asses), and the counter to act on. */
export interface Shop { id: string; name: Named; sign: string; keeper: string; stock: { item: string; price: number }[]; x: number; z: number }

/** The coarse ring around a district: what lies in each direction beyond the playable box. */
export type RingKind = 'city' | 'country' | 'sea' | 'wall';
export interface Ring {
  /** What's at a point (metres, district frame) outside the box. */
  kind: (x: number, z: number) => RingKind;
  /** Ground height there (metres). */
  height: (x: number, z: number) => number;
}

export interface Level {
  id: DistrictId;
  name: Named;
  world: VoxelWorld;
  /** Size in voxels: the playable box is [0, width) × [0, depth). */
  width: number;
  depth: number;
  /** Parts above head height that step aside when the hero walks under them (a gate's mass, an arch). */
  occluders: { id: string; world: VoxelWorld; x0: number; x1: number; z0: number; z1: number }[];
  trees: Placed[];
  props: Placed[];
  water: WaterArea[];
  fires: (Source & { kind: 'hearth' | 'oven' | 'lamp' | 'furnace' })[];
  smoke: (Source & { kind: 'smoke' | 'steam' })[];
  jets: (Source & { dir: [number, number] })[];
  spots: Spot[];
  npcs: Npc[];
  walkers: Walker[];
  shops: Shop[];
  exits: Exit[];
  spawns: Record<string, Spawn>;
  /** Where someone standing at (x, z) stands: the floor under head height above the street (voxels). */
  groundAt: (x: number, z: number) => number;
  ring: Ring;
  /** The sea, if this district can see it: the shoreline's x (west of it is water) and the sea level (metres). */
  sea?: { west: number; level: number };
}
