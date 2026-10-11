/**
 * The world: draws the sim and never changes it. ymir/three `Stage` owns the renderer; `TownView` the
 * town; `Townsfolk` the people and Ferox; this file the hero, the camera and the glue. The camera is the
 * classic three-quarter view looking north, so Vesuvius rises behind the town on the curved horizon.
 */
import * as THREE from 'three';
import { Anchors, FollowCamera, LOOK, Stage, applyPose, breathe, createPost, talk, walk, type Rig } from 'ymir/three';
import { CAST } from '../art/people';
import { VOX } from '../art/palette';
import type { Level } from '../level/portaMarina';
import { TALK_TO } from '../content/prologue';
import { groundAt, WALK, type State } from '../sim/sim';
import { personRig, poseDog, Townsfolk } from './actors';
import { BAY } from './moods';
import { TownView } from './town';

export interface WorldOptions { quality?: 'high' | 'balanced' | 'low'; plume?: number }

export class World {
  readonly stage: Stage;
  readonly town: TownView;
  readonly folk: Townsfolk;
  readonly anchors: Anchors;
  readonly camera = new THREE.PerspectiveCamera(30, 1, 0.5, 2000);
  private follow = new FollowCamera(this.camera, { distance: 26, pitch: 0.82, deadZone: 0.8, lag: 5 });
  private hero: Rig;
  private started = false;
  private focus = new THREE.Vector3();
  private walkT = 0;

  constructor(host: HTMLElement, readonly level: Level, o: WorldOptions = {}) {
    const phone = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
    this.stage = new Stage(host, {
      camera: this.camera, quality: o.quality ?? (phone ? 'balanced' : 'high'), toneMapping: THREE.ACESFilmicToneMapping,
      post: createPost({ tiltShift: { amount: 2, focus: 0.42, band: 0.2 }, grade: { saturation: 1.1, warmth: 0.18, vignette: 0.3 } }),
    });
    this.town = new TownView(this.stage.scene, this.stage.renderer, level, { mood: BAY.arrival, plume: o.plume ?? 0.05 });
    LOOK.uBend.value = 0.05;
    this.folk = new Townsfolk(level.npcs, (x, z) => groundAt(level, x, z));
    this.stage.scene.add(this.folk.group);
    this.hero = personRig('hero', CAST.hero);
    this.stage.scene.add(this.hero.root);
    this.anchors = new Anchors((x, y, z) => this.stage.toScreen(x, y, z));
  }

  /** Mesh what's near the hero now (a loading screen calls this until it returns 0). */
  preload(s: State, budgetMs = 30): number { return this.town.sync({ x: s.hero.x, y: s.hero.y, z: s.hero.z }, budgetMs); }

  /** Make the scene match the state. */
  sync(s: State, t: number, dt: number): void {
    const h = s.hero;
    this.town.sync({ x: h.x, y: h.y, z: h.z }, 4);
    // the hero
    this.hero.root.position.set(h.x * VOX, h.y * VOX, h.z * VOX);
    let d = s.facing - this.hero.root.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.hero.root.rotation.y += d * Math.min(1, dt * 12);
    const moving = s.speed > 1 && !s.talk;
    this.walkT += dt * (s.speed / WALK);
    applyPose(this.hero, s.talk ? talk(t, 0.3) : moving ? walk(this.walkT, Math.min(1, s.speed / WALK)) : breathe(t, 0.3));
    // Ferox
    const f = s.ferox;
    const dog = this.folk.ferox;
    dog.root.position.set(f.body.x * VOX, f.body.y * VOX, f.body.z * VOX);
    let fd = f.facing - dog.root.rotation.y;
    fd = Math.atan2(Math.sin(fd), Math.cos(fd));
    dog.root.rotation.y += fd * Math.min(1, dt * 8);
    const near = Math.hypot(h.x - f.body.x, h.z - f.body.z) < 30;
    const mode = f.mode === 'guard' ? 'lie' : f.mode === 'sit' ? 'sit' : f.speed > 20 ? 'run' : f.speed > 2 ? 'walk' : 'stand';
    poseDog(dog, mode, t, f.speed / 20, f.mode === 'follow' ? (near ? 0.8 : 0.4) : near ? 0.2 : 0);
    // people
    const with_ = s.talk ? this.level.npcs.find((n) => TALK_TO[n.id] === s.talk!.script)?.id ?? null : null;
    this.folk.update(dt, t, h, with_);
    // camera: follow the hero a little ahead of where they're walking
    const ahead = moving ? 1.2 : 0;
    this.focus.set(h.x * VOX + Math.sin(s.facing) * ahead, h.y * VOX, h.z * VOX + Math.cos(s.facing) * ahead);
    if (!this.started) { this.follow.snap(this.focus); this.started = true; }
    else this.follow.follow(this.focus, dt);
    this.town.update(dt, this.follow.target, this.camera, { x: h.x, z: h.z });
    this.anchors.update();
  }

  /** The hero's head in screen pixels (for the action prompt). */
  heroScreen(s: State): { x: number; y: number } {
    const p = this.stage.toScreen(s.hero.x * VOX, s.hero.y * VOX + this.hero.height + 0.25, s.hero.z * VOX);
    return { x: p.x, y: p.y };
  }

  dispose(): void { this.town.dispose(); this.stage.dispose(); }
}
