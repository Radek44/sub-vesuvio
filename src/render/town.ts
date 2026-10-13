/**
 * A district on screen: the level's voxels, trees in the wind, props, water, fires and smoke, things lying
 * in the street, the gate's upper mass that steps aside when the hero walks under it; around it the ring
 * of city and country at 1/2 m so the streets never end in empty air; the bay (where there is one) and
 * Vesuvius beyond. One per district: the world makes a new one on arrival and disposes the last.
 * Reads the level; never writes it (or the sim).
 */
import * as THREE from 'three';
import {
  Emitters, Environment, LOOK, Lamps, Particles, Water, WorldView, glowLook, modelGroup, voxelLook, type EmitterSource, type LampSource,
} from 'ymir/three';
import { model, type Model } from 'ymir/voxel';
import { P, VOX, h3, vary } from '../art/palette';
import { amphora, bench, crate, ship } from '../art/props';
import { cypress, fig, olive, oleander, pergola, stonePine, tuft } from '../art/nature';
import type { Level } from '../level/types';
import { RING_VOX, exitStreets, ringWorld } from '../art/city';
import { itemModel } from '../art/items';
import { cat } from '../art/cat';
import { PEOPLE_VOX } from '../art/people';
import type { ItemId } from '../content/items';
import { Backdrop } from './backdrop';
import { buildGround, type GroundStats } from './ground';

const TREES: Record<string, (v: number) => Model> = { pine: stonePine, cypress, olive, fig, oleander, tuft };
/** How far each tree kind bends (world units per unit of height), and where its sway starts (voxels up). */
const SWAY: Record<string, [number, number]> = { pine: [0.012, 50], cypress: [0.02, 12], olive: [0.02, 14], fig: [0.02, 10], oleander: [0.03, 2], tuft: [0.06, 0] };

/** A treadwheel crane: two legs, a jib, a great wheel men walk inside. */
function crane(): Model {
  const m = model();
  for (let y = 0; y < 60; y++) { m.solid.set(-6 + Math.round(y * 0.05), y, 0, P.wood); m.solid.set(6 - Math.round(y * 0.05), y, 0, P.wood); }
  for (let k = 0; k < 40; k++) m.solid.set(Math.round(k * 0.7), 58 + Math.round(k * 0.2), 0, P.woodDark);
  for (let a = 0; a < 64; a++) {
    const t = (a / 64) * Math.PI * 2;
    for (const dz of [-3, 3]) m.solid.set(Math.round(Math.cos(t) * 9), 12 + Math.round(Math.sin(t) * 9), dz, P.woodLight);
  }
  for (let y = 0; y < 30; y++) m.solid.set(27, 66 - y, 0, 0x8a7a5a); // the rope
  for (let x = 24; x <= 30; x++) for (let y = 34; y <= 38; y++) for (let z = -3; z <= 3; z++) m.solid.set(x, y, z, vary(P.limestone, x, y, z, 0.05)); // a block on the hook
  return m;
}

const PROPS: Record<string, (v: number) => Model> = {
  amphora: (v) => amphora(v), table: () => bench(14, true), bench: () => bench(12), crane: () => crane(),
  pergola: (v) => pergola(30 + v * 6, 14, v), ship: () => ship(), grapes: () => crate('grapes'), figs: () => crate('figs'), fish: () => crate('fish'),
};

export interface TownOptions {
  plume?: number;
  /** Draw the ground as a surface instead of voxels (`ground.ts`; the spike: Porta Marina by default). */
  ground?: boolean;
}

export class TownView {
  readonly root = new THREE.Group();
  readonly backdrop: Backdrop;
  readonly particles = new Particles();
  readonly emitters: Emitters;
  readonly lamps: Lamps;
  private view: WorldView;
  private ring: WorldView;
  private occluders: { id: string; view: WorldView; box: [number, number, number, number]; mat: THREE.MeshLambertMaterial; shown: number }[] = [];
  private waters: Water[] = [];
  private pickups: { id: string; g: THREE.Group; y: number; seed: number }[] = [];
  /** Things the story takes away (a flag hides them). */
  private goners: { flag: string; g: THREE.Group }[] = [];
  private mats: THREE.Material[] = [];
  private look = voxelLook({ voxel: VOX });
  private ringLook = voxelLook({ voxel: RING_VOX, edges: 0.06 });
  private glow = glowLook();
  /** The ground surface's counts, when the ground is drawn as one (QA). */
  ground: GroundStats | null = null;
  private groundMesh: THREE.Mesh | null = null;
  /** Where the world starts to curve away, as a fraction of the camera's distance to the focus. */
  bendFrom = 0.9;

  constructor(readonly scene: THREE.Scene, readonly env: Environment, readonly level: Level, o: TownOptions = {}) {
    scene.add(this.root);
    this.mats.push(this.look, this.ringLook, this.glow);
    // the ground as a surface: the voxels left to draw are the rest of the world
    let drawn = level.world;
    if (o.ground) {
      const groundLook = voxelLook({ voxel: VOX, edges: 0 });
      this.mats.push(groundLook);
      const g = buildGround(level, VOX, groundLook);
      drawn = g.draw;
      this.ground = g.stats;
      this.groundMesh = g.mesh;
      this.root.add(g.mesh);
    }
    this.view = new WorldView(drawn, { scale: VOX, solid: this.look, glow: this.glow });
    this.root.add(this.view.group);
    // the city around: built once per district (a second or so, behind the loading screen)
    this.ring = new WorldView(ringWorld(level.width * VOX, level.depth * VOX, level.ring, exitStreets(level, VOX)), { scale: RING_VOX, solid: this.ringLook });
    this.ring.group.traverse((c) => { c.receiveShadow = true; });
    this.root.add(this.ring.group);
    for (const oc of level.occluders) {
      // opaque while fully shown (so the hero's silhouette shows through it), transparent only while it fades
      const mat = voxelLook({ voxel: VOX });
      this.mats.push(mat);
      const view = new WorldView(oc.world, { scale: VOX, solid: mat, glow: this.glow });
      this.root.add(view.group);
      this.occluders.push({ id: oc.id, view, box: [oc.x0, oc.x1, oc.z0, oc.z1], mat, shown: 1 });
    }
    // trees: one material per kind (each sways from its own height)
    const mats = new Map<string, THREE.Material>();
    for (const t of level.trees) {
      const [sway, base] = SWAY[t.kind] ?? [0.02, 0];
      let mat = mats.get(t.kind);
      if (!mat) { mat = voxelLook({ voxel: VOX, sway, swayBase: base * VOX }); mats.set(t.kind, mat); this.mats.push(mat); }
      const make = TREES[t.kind];
      if (!make) continue;
      const g = modelGroup(`tree:${t.kind}:${t.variant}`, () => make(t.variant), VOX, { solid: mat });
      g.position.set(t.x * VOX, t.y * VOX, t.z * VOX);
      g.rotation.y = h3(t.x, 0, t.z) * Math.PI * 2;
      g.traverse((c) => { c.castShadow = t.kind !== 'tuft'; c.receiveShadow = true; });
      this.root.add(g);
    }
    const smallLook = voxelLook({ voxel: PEOPLE_VOX, edges: 0.08 });
    this.mats.push(smallLook);
    for (const p of level.props) {
      if (p.kind === 'talus') continue; // drawn as a pickup below
      if (p.kind === 'cat') {
        const g = modelGroup('animal:cat', cat, PEOPLE_VOX, { solid: smallLook });
        g.position.set(p.x * VOX, p.y * VOX, p.z * VOX);
        g.rotation.y = ((p.rotate ?? 0) * Math.PI) / 2;
        g.traverse((c) => { c.castShadow = true; });
        this.root.add(g);
        if (p.goneWith) this.goners.push({ flag: p.goneWith, g });
        continue;
      }
      const make = PROPS[p.kind];
      if (!make) continue;
      const g = modelGroup(`prop:${p.kind}:${p.variant}`, () => make(p.variant), VOX, { solid: p.kind === 'pergola' ? (mats.get('oleander') ?? this.look) : this.look });
      g.position.set(p.x * VOX, p.y * VOX, p.z * VOX);
      g.rotation.y = ((p.rotate ?? 0) * Math.PI) / 2;
      g.traverse((c) => { c.castShadow = true; c.receiveShadow = true; });
      this.root.add(g);
    }
    // things to pick up: the item's own little model, turning slowly with a glint so the eye finds it
    const itemLook = voxelLook({ voxel: PEOPLE_VOX, edges: 0.08, rim: 0.6 });
    this.mats.push(itemLook);
    for (const sp of level.spots) {
      if (sp.verb !== 'take') continue;
      const item = sp.id.split(':')[1] as ItemId;
      const g = new THREE.Group();
      g.scale.setScalar(1.6); // a little larger than life, so the eye finds it on the paving
      const m = modelGroup(`item:${item}`, () => itemModel(item), PEOPLE_VOX, { solid: itemLook });
      m.traverse((c) => { c.castShadow = true; });
      g.add(m);
      const y = level.groundAt(sp.x, sp.z) * VOX + 0.05;
      g.position.set(sp.x * VOX, y, sp.z * VOX);
      this.root.add(g);
      this.pickups.push({ id: sp.id, g, y, seed: h3(sp.x, 1, sp.z) * 6 });
    }
    for (const a of level.water) {
      const water = new Water({
        x: a.x * VOX, z: a.z * VOX, width: a.w * VOX, depth: a.d * VOX, level: a.level * VOX,
        floor: () => a.floor * VOX, resolution: 8, scale: 0.25, foam: a.kind === 'fountain' ? 0.25 : 0.1, deepAt: 0.5,
        shallow: a.kind === 'impluvium' ? 0x5fb8c0 : 0x52c4c8, deep: 0x2a7f9a,
      });
      this.root.add(water.mesh);
      this.waters.push(water);
    }
    // fires light their corner; smoke and steam rise; fountains run
    const lampOf = (f: Level['fires'][number]): LampSource => ({
      x: f.x * VOX, y: f.y * VOX, z: f.z * VOX,
      ...(f.kind === 'lamp' ? { color: 0xffc070, intensity: 2.5, range: 3.5, flicker: 0.4, day: 0.05 }
        : f.kind === 'oven' ? { color: 0xff8a3a, intensity: 6, range: 5, flicker: 0.7, day: 0.5 }
        : f.kind === 'furnace' ? { color: 0xff7a30, intensity: 6, range: 5, flicker: 0.8, day: 0.5 }
        : { color: 0xff9a4a, intensity: 4, range: 4, flicker: 0.8, day: 0.35 }),
    });
    this.lamps = new Lamps(level.fires.map(lampOf), { max: 6 });
    this.root.add(this.lamps.group);
    const sources: EmitterSource[] = [];
    for (const s of level.smoke) sources.push(s.kind === 'smoke'
      ? { kind: 'smoke', x: s.x * VOX, y: s.y * VOX, z: s.z * VOX, rate: 10, vel: [0.25, 0.5, 0.05], spread: 0.08, area: 0.2, colors: [0xcfc8bd, 0xb4ada2, 0xdcd6cc], size: 1.3, daynight: [0.8, 1.3] }
      : { kind: 'steam', x: s.x * VOX, y: s.y * VOX, z: s.z * VOX, rate: 8, vel: [0.1, 0.35, 0], spread: 0.06, area: 0.2, colors: [0xf4f2ee, 0xe8eef0], size: 1.0 });
    for (const j of level.jets) sources.push(
      { kind: 'spray', x: j.x * VOX, y: j.y * VOX, z: j.z * VOX, rate: 70, vel: [j.dir[0] * 0.55, 0.15, j.dir[1] * 0.55], spread: 0.04, colors: [0xdff6ff, 0xffffff, 0xc6ecf6], size: 0.8, floor: (j.y - 3.2) * VOX },
      { kind: 'mist', x: j.x * VOX, y: (j.y - 3) * VOX, z: (j.z + 4) * VOX, rate: 4, vel: [0, 0.06, 0], spread: 0.04, area: 0.3, colors: [0xeaf6f8], size: 0.9 },
    );
    for (const f of level.fires) if (f.kind !== 'lamp') sources.push({ kind: 'ember', x: f.x * VOX, y: (f.y + 2) * VOX, z: f.z * VOX, rate: 2, vel: [0, 0.6, 0], spread: 0.15, colors: [0xffb050, 0xff7a30], dims: false, daynight: [0.5, 1.5] });
    this.emitters = new Emitters(this.particles, sources);
    this.root.add(this.particles.mesh);
    const sea = level.sea ? { west: level.sea.west, south: 110, level: level.sea.level } : undefined;
    const mid = level.groundAt(level.width / 2, level.depth / 2) * VOX;
    this.backdrop = new Backdrop(scene, { scale: 0.5, sea, mapW: level.width * VOX, mapD: level.depth * VOX, wallX: 24, ground: mid });
    this.backdrop.setPlume(o.plume ?? 0.05);
  }

  /**
   * Mesh nearest the focus (voxels), within a budget. Returns the district's chunks still waiting: the
   * loading screen waits for those; the ring of city beyond streams in after, nearest first.
   */
  sync(focusVox: { x: number; y: number; z: number }, budgetMs = 4, ring = true): number {
    this.view.focus(focusVox.x, focusVox.y, focusVox.z);
    const t0 = performance.now();
    let pending = this.view.sync(budgetMs).pending;
    for (const o of this.occluders) pending += o.view.sync(1).pending;
    const k = VOX / RING_VOX;
    this.ring.focus(focusVox.x * k, focusVox.y * k, focusVox.z * k);
    if (ring) this.ring.sync(Math.max(1, budgetMs - (performance.now() - t0)));
    return pending;
  }
  syncAll(): void { this.view.syncAll(); this.ring.syncAll(); for (const o of this.occluders) o.view.syncAll(); }

  /** Per frame: lamps, smoke, the curve, the mountain, pickups turning (taken ones gone), the gate stepping aside. */
  update(dt: number, focus: THREE.Vector3, camera: THREE.PerspectiveCamera, heroVox: { x: number; z: number }, has: (flag: string) => boolean): void {
    LOOK.uBendFrom.value = camera.position.distanceTo(focus) * this.bendFrom;
    this.lamps.update(dt, focus);
    this.emitters.update(dt, focus, LOOK.uNight.value, 30);
    this.particles.update(dt);
    const dip = this.backdrop.update(camera, camera.position.y - focus.y);
    if (this.env.sky) this.env.sky.uniforms.uDip.value = -dip;
    const t = LOOK.uTime.value;
    for (const p of this.pickups) {
      p.g.visible = !has(`took:${p.id}`);
      if (!p.g.visible) continue;
      p.g.rotation.y = t * 0.8 + p.seed;
      p.g.position.y = p.y + 0.06 + Math.sin(t * 2.2 + p.seed) * 0.04;
    }
    for (const g of this.goners) g.g.visible = !has(g.flag);
    for (const o of this.occluders) {
      const [x0, x1, z0, z1] = o.box;
      const under = heroVox.x >= x0 && heroVox.x <= x1 && heroVox.z >= z0 && heroVox.z <= z1;
      o.shown += ((under ? 0 : 1) - o.shown) * Math.min(1, dt * 6);
      o.mat.opacity = 0.12 + 0.88 * o.shown;
      const fading = o.shown < 0.99;
      if (o.mat.transparent !== fading) { o.mat.transparent = fading; o.mat.needsUpdate = true; }
      o.mat.depthWrite = o.shown > 0.95;
      o.view.group.visible = o.shown > 0.02 || !under;
    }
  }

  dispose(): void {
    this.groundMesh?.geometry.dispose();
    (this.groundMesh?.material as THREE.MeshLambertMaterial | undefined)?.map?.dispose();
    this.view.dispose();
    this.ring.dispose();
    for (const o of this.occluders) o.view.dispose();
    for (const w of this.waters) w.dispose();
    for (const m of this.mats) m.dispose();
    this.backdrop.dispose();
    this.lamps.dispose();
    this.particles.dispose();
    this.root.removeFromParent();
  }
}

export { VOX };
