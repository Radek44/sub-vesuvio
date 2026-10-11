/**
 * The world: draws the sim and never changes it. ymir/three `Stage` owns the renderer (sizing, the loop,
 * adaptive quality, teardown); this file owns the scene and the camera.
 */
import * as THREE from 'three';
import { Stage, modelGroup } from 'ymir/three';
import { box, model } from 'ymir/voxel';
import { ARENA, type State } from './sim';

const VOX = 0.125;

const ground = () => {
  const m = model();
  const r = Math.round(ARENA / VOX) + 4;
  box(m.solid, -r, -2, -r, r, -1, r, (x, _y, z) => (Math.hypot(x, z) > r ? null : (x + z) & 8 ? 0xd9c7a0 : 0xcbb48a));
  return m;
};
const hero = () => {
  const m = model();
  box(m.solid, -2, 0, -1, 1, 3, 0, 0x3d6fb6);  // legs and tunic
  box(m.solid, -3, 4, -2, 2, 8, 1, 0xc0392b);
  box(m.solid, -2, 9, -2, 1, 12, 1, 0xe8b98a); // head
  box(m.solid, -2, 13, -2, 1, 13, 1, 0x4a3020);
  return m;
};
const coin = () => {
  const m = model();
  box(m.glow, -2, 0, 0, 1, 3, 0, 0xffd34d);
  return m;
};

export class World {
  readonly stage: Stage;
  private camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  private hero: THREE.Group;
  private coins = new Map<number, THREE.Group>();

  constructor(host: HTMLElement) {
    this.stage = new Stage(host, { camera: this.camera, quality: matchMedia('(pointer: coarse)').matches ? 'balanced' : 'high', toneMapping: THREE.ACESFilmicToneMapping });
    const { scene } = this.stage;
    scene.background = new THREE.Color(0x87b5d9);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a60, 2.2));
    const sun = new THREE.DirectionalLight(0xfff1d8, 1.6);
    sun.position.set(6, 12, 4);
    scene.add(sun);
    scene.add(modelGroup('ground', ground, VOX));
    this.hero = modelGroup('hero', hero, VOX);
    scene.add(this.hero);
  }

  /** Make the scene match the state: move the hero, add and remove coins, aim the camera. */
  sync(s: State, t: number): void {
    this.hero.position.set(s.hero.x, 0, s.hero.z);
    for (const c of s.coins) {
      let g = this.coins.get(c.id);
      if (!g) { g = modelGroup('coin', coin, VOX); this.coins.set(c.id, g); this.stage.scene.add(g); }
      g.position.set(c.at.x, 0.4 + Math.sin(t * 3 + c.id) * 0.1, c.at.z);
      g.rotation.y = t * 2 + c.id;
    }
    for (const [id, g] of this.coins) if (!s.coins.some((c) => c.id === id)) { this.stage.scene.remove(g); this.coins.delete(id); }
    this.camera.position.set(s.hero.x, 11, s.hero.z + 9);
    this.camera.lookAt(s.hero.x, 0, s.hero.z);
  }

  dispose(): void { this.stage.dispose(); }
}
