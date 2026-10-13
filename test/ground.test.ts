/**
 * The ground drawn as a surface (render/ground.ts, the Porta Marina spike) draws the same town: only ground
 * voxels leave the voxel drawing, the surface stands where the hero stands, things that rise off the street
 * (Vibia's counter) keep their painted voxels, and the surface is a small part of what the voxel tops cost.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { VoxelWorld } from 'ymir/voxel';
import { portaMarina } from '../src/level/portaMarina';
import { buildGround, groundHeights, STEP } from '../src/render/ground';

const level = portaMarina();
const h = groundHeights(level);
const W = level.width;
const { draw, stats } = buildGround(level, 0.125, new THREE.MeshLambertMaterial());

describe('the ground as a surface', () => {
  it('stands where the hero stands, over most of the district', () => {
    let n = 0;
    for (let z = 0; z < level.depth; z++) for (let x = 0; x < W; x++) {
      const g = h[z * W + x]!;
      if (g === -32768) continue;
      n++;
      if (g !== level.groundAt(x, z)) throw new Error(`ground at ${x},${z} is ${g}, the hero stands at ${level.groundAt(x, z)}`);
    }
    expect(n).toBeGreaterThan(level.width * level.depth * 0.5);
  });

  it('only ground voxels leave the voxel drawing', () => {
    for (const k of level.world.chunkKeys()) {
      const [ox, oy, oz] = VoxelWorld.origin(k);
      for (let x = ox; x < ox + 32; x += 3) for (let z = oz; z < oz + 32; z += 3) for (let y = oy; y < oy + 32; y++) {
        const c = level.world.get(x, y, z);
        if (c === undefined) continue;
        const g = x >= 0 && x < W && z >= 0 && z < level.depth ? h[z * W + x]! : -32768;
        const underGround = g !== -32768 && y < g;
        if (underGround) expect(draw.has(x, y, z)).toBe(false);
        else if (draw.get(x, y, z) !== c) throw new Error(`voxel ${x},${y},${z} lost from the drawing`);
      }
    }
  });

  it('things that rise off the street keep their voxels: Vibia’s counter', () => {
    const vibia = level.npcs.find((n) => n.id === 'thermopolium')!;
    // the counter stands between Vibia and the street
    let counter = 0;
    for (let z = vibia.z + 2; z < vibia.z + 14; z++) {
      const g = level.groundAt(vibia.x, z);
      if (g > level.groundAt(vibia.x, vibia.z + 20) + STEP) { counter++; expect(h[z * W + vibia.x]).toBe(-32768); }
    }
    expect(counter).toBeGreaterThan(0);
  });

  it('is a small fraction of the voxel tops it replaces', () => {
    expect(stats.columns).toBeGreaterThan(100_000);
    // drawn as voxels, every ground column's top alone is two triangles
    expect(stats.triangles).toBeLessThan(stats.columns * 2 * 0.1);
  });
});
