/**
 * A placeholder district: a paved square with an exit at each side it needs. Used until a district's
 * real builder lands, so travel works end to end. Pure.
 */
import { VoxelWorld } from 'ymir/voxel';
import { P, vary } from '../art/palette';
import type { DistrictId, Exit, Level, Named, Spawn } from './types';

export function stubDistrict(id: DistrictId, name: Named, exits: Exit[], spawns: Record<string, Spawn>): Level {
  const W = 320, D = 256;
  const w = new VoxelWorld();
  for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) for (let y = 36; y <= 40; y++) w.set(x, y, z, y === 40 ? vary(((x >> 3) + (z >> 3)) & 1 ? P.limestone : P.tuffWarm, x, y, z, 0.05) : P.soil);
  return {
    id, name, world: w, width: W, depth: D, occluders: [], trees: [], props: [], water: [], fires: [], smoke: [], jets: [], spots: [], npcs: [], walkers: [], shops: [],
    exits, spawns, groundAt: () => 41, ring: { kind: () => 'city', height: () => 5 },
  };
}
