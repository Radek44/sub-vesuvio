/**
 * The world: draws the sim and never changes it. ymir/three `Stage` owns the renderer; the sky, sun and
 * camera last the whole game; each district brings its own `TownView` (the town and the ring of city
 * around it) and `Townsfolk` (its people and Ferox), made on arrival and disposed on leaving. This file
 * is the hero, the camera, the name tags and shop signs over the street, and the glue. The camera is the
 * classic three-quarter view looking north, so Vesuvius rises behind the town on the curved horizon.
 */
import * as THREE from 'three';
import { Anchors, Environment, FollowCamera, LOOK, Stage, applyPose, breathe, createPost, talk, walk, type Post, type Rig } from 'ymir/three';
import { CAST, tagFor } from '../art/people';
import { VOX } from '../art/palette';
import type { Level } from '../level/types';
import { WALK, type State } from '../sim/sim';
import { personRig, poseDog, Townsfolk } from './actors';
import { BAY } from './moods';
import { TownView } from './town';

export interface WorldOptions {
  quality?: 'high' | 'balanced' | 'low';
  /** false: never step quality down (QA screenshots on software rendering). */
  ladder?: false;
  /** Show frames per second and the quality steps taken (`?fps`). */
  fps?: boolean;
  plume?: number;
}

/** How near (voxels) a name tag starts to show, and is fully shown. */
const TAG_FAR = 96, TAG_NEAR = 64;
const SIGN_FAR = 150, SIGN_NEAR = 110;

/**
 * Zoom, from a close three-quarter view (40° down, 18 m away) to a high, nearly top-down one (69°, 48 m).
 * The start is the classic view (26 m, 0.83 rad).
 */
const ZOOM_START = 0.27;
const zoomView = (z: number) => ({ distance: 18 + 30 * z, pitch: 0.7 + 0.5 * z });

/**
 * A silhouette where something stands behind a roof or a wall: drawn only where the depth test fails
 * (GreaterDepth), so the hero never disappears under the eaves of a portico. Both passes are opaque, so they
 * sort by render order: the town (0), then the silhouette (1), then the actor itself (2). Only the town is
 * in the depth buffer when the silhouette draws, so the actor's own arms and legs never wash over the actor
 * (drawn after it, the silhouette lit up every part of the hero behind another part, in the open street).
 * Custom blending keeps it see-through without moving it to the transparent pass.
 */
const XRAY = new THREE.MeshBasicMaterial({
  color: 0xf3e8d2, opacity: 0.6, depthWrite: false, depthFunc: THREE.GreaterDepth, fog: false,
  blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
});
function xray(root: THREE.Object3D): void {
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
  for (const m of meshes) {
    m.renderOrder = 2;
    const ghost = new THREE.Mesh(m.geometry, XRAY);
    ghost.renderOrder = 1;
    ghost.castShadow = false;
    m.add(ghost);
  }
}

const cap = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);
const el = (cls: string, html: string): HTMLElement => {
  const d = document.createElement('div');
  d.className = cls;
  d.innerHTML = html;
  return d;
};
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

interface Label { el: HTMLElement; at: () => { x: number; y: number; z: number }; near: number; far: number; dog?: boolean; unbind: () => void }

export class World {
  readonly stage: Stage;
  readonly env: Environment;
  readonly anchors: Anchors;
  readonly camera = new THREE.PerspectiveCamera(30, 1, 0.5, 2000);
  town: TownView | null = null;
  folk: Townsfolk | null = null;
  level: Level | null = null;
  /** The follow camera reads these every frame: zooming changes them (`zoomBy`). */
  private view = { distance: 26, pitch: 0.82, deadZone: 0.8, lag: 5 };
  private follow = new FollowCamera(this.camera, this.view);
  /** 0 is the closest three-quarter view, 1 the highest, most top-down one; eased toward `zoomTo`. */
  private zoom = ZOOM_START;
  private zoomTo = ZOOM_START;
  private hero: Rig;
  private heroHat: Rig;
  private started = false;
  private focus = new THREE.Vector3();
  private walkT = 0;
  private layer: HTMLElement;
  private labels: Label[] = [];
  /** The post chain, kept so the loading screen can draw through it while the stage's loop is paused. */
  private post: Post | null = null;
  private meter: HTMLElement | null = null;
  private meterT = 0;

  constructor(host: HTMLElement, private o: WorldOptions = {}) {
    const phone = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
    const post = createPost({ tiltShift: { amount: 1.5, focus: 0.42, band: 0.28 }, grade: { saturation: 1.1, warmth: 0.18, vignette: 0.3 } });
    this.stage = new Stage(host, {
      camera: this.camera, quality: o.quality ?? (phone ? 'balanced' : 'high'), toneMapping: THREE.ACESFilmicToneMapping,
      post: (r, s, c) => (this.post = post(r, s, c)), ladder: o.ladder,
    });
    if (o.fps) { this.meter = el('fps', ''); host.appendChild(this.meter); }
    this.env = new Environment(this.stage.scene, { mood: BAY.arrival, renderer: this.stage.renderer, shadowExtent: 18, horizon: 0.55 });
    LOOK.uBend.value = 0.018; // a gentle roll: the Forum's temples stay in view across the piazza
    this.hero = personRig('hero', CAST.hero);
    this.heroHat = personRig('hero:hat', { ...CAST.hero, hat: 0xc9a868 });
    this.stage.scene.add(this.hero.root, this.heroHat.root);
    xray(this.hero.root);
    xray(this.heroHat.root);
    this.anchors = new Anchors((x, y, z) => this.stage.toScreen(x, y, z));
    this.layer = el('tags', '');
    host.appendChild(this.layer);
  }

  /** Show a district: dispose the last one's town and people, build this one's (behind a loading screen). */
  setLevel(level: Level): void {
    if (this.level === level) return;
    this.town?.dispose();
    this.folk?.dispose();
    for (const l of this.labels) { l.unbind(); l.el.remove(); }
    this.labels = [];
    this.level = level;
    this.town = new TownView(this.stage.scene, this.env, level, { plume: this.o.plume ?? 0.05 });
    this.folk = new Townsfolk(level);
    this.stage.scene.add(this.folk.group);
    xray(this.folk.ferox.root);
    this.started = false;
    // name tags: a name for the cast, the Latin for what they are (and its meaning) for everyone else
    for (const p of this.folk.people) {
      const t = tagFor(p.who);
      const html = t.name ? `<b>${esc(t.name)}</b>` : `<b lang="la">${esc(cap(t.la ?? ''))}</b><small class="en">${esc(t.en ?? '')}</small><small class="fr">${esc(t.fr ?? '')}</small>`;
      this.label(el(`tag${t.name ? ' named' : ''}`, html), () => this.folk!.headOf(p), TAG_NEAR, TAG_FAR);
    }
    this.label(el('tag named dog', '<b>Ferox</b>'), () => {
      const r = this.folk!.ferox.root.position;
      return { x: r.x, y: r.y + 0.75, z: r.z };
    }, TAG_NEAR, TAG_FAR, true);
    // shop signs: the painted Latin over the counter, and whose shop it is
    for (const s of level.shops) {
      const y = level.groundAt(s.x, s.z) * VOX + 3.3; // over the door, above the keeper's name
      this.label(el('sign', `<b lang="la">${esc(s.sign)}</b><small class="en">${esc(s.name.en)}</small><small class="fr">${esc(s.name.fr)}</small>`),
        () => ({ x: s.x * VOX, y, z: s.z * VOX }), SIGN_NEAR, SIGN_FAR);
    }
    // where the streets go: a waymarker at each exit
    for (const e of level.exits) {
      const x = (e.x0 + e.x1) / 2, z = (e.z0 + e.z1) / 2;
      const y = level.groundAt(x, z) * VOX + 1.6;
      this.label(el('way', `<span class="en">${esc(e.label.en)}</span><span class="fr">${esc(e.label.fr)}</span>`), () => ({ x: x * VOX, y, z: z * VOX }), SIGN_NEAR, SIGN_FAR);
    }
  }

  private label(e: HTMLElement, at: () => { x: number; y: number; z: number }, near: number, far: number, dog = false): void {
    this.layer.appendChild(e);
    this.labels.push({ el: e, at, near, far, dog, unbind: this.anchors.bind(e, at) });
  }

  setLang(lang: 'en' | 'fr'): void { this.layer.dataset.lang = lang; }

  /** Mesh what's near the hero now (a loading screen calls this until it returns 0). */
  preload(s: State, budgetMs = 30): number { return this.town ? this.town.sync({ x: s.hero.x, y: s.hero.y, z: s.hero.z }, budgetMs, false) : 1; }

  /**
   * Draw a frame outside the stage's loop (the loading screen, while the loop is paused): through the post
   * chain while the stage still has it, so the look doesn't change, and without counting toward the
   * stage's frame rate, so slow loading frames never cost the game its quality.
   */
  drawNow(dt: number): void {
    if (this.post && !this.stage.stats().steps.includes('post')) this.post.render(dt);
    else this.stage.renderer.render(this.stage.scene, this.camera);
  }

  /** Make the scene match the state. */
  sync(s: State, t: number, dt: number, loading = false): void {
    const town = this.town, folk = this.folk;
    if (!town || !folk) return;
    const h = s.hero;
    town.sync({ x: h.x, y: h.y, z: h.z }, 4, !loading);
    // the hero (in the petasus, once the old man has given it)
    const hatted = !!s.items.hat;
    this.hero.root.visible = !hatted;
    this.heroHat.root.visible = hatted;
    const rig = hatted ? this.heroHat : this.hero;
    rig.root.position.set(h.x * VOX, h.y * VOX, h.z * VOX);
    let d = s.facing - rig.root.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    rig.root.rotation.y += d * Math.min(1, dt * 12);
    (hatted ? this.hero : this.heroHat).root.rotation.y = rig.root.rotation.y;
    const busy = !!s.talk || !!s.shop;
    const moving = s.speed > 1 && !busy;
    this.walkT += dt * (s.speed / WALK);
    applyPose(rig, s.talk ? talk(t, 0.3) : moving ? walk(this.walkT, Math.min(1, s.speed / WALK)) : breathe(t, 0.3));
    // Ferox, when he's in this district
    const f = s.ferox;
    const dog = folk.ferox;
    dog.root.visible = f.district === s.district;
    dog.root.position.set(f.body.x * VOX, f.body.y * VOX, f.body.z * VOX);
    let fd = f.facing - dog.root.rotation.y;
    fd = Math.atan2(Math.sin(fd), Math.cos(fd));
    dog.root.rotation.y += fd * Math.min(1, dt * 8);
    const near = Math.hypot(h.x - f.body.x, h.z - f.body.z) < 30;
    const mode = f.mode === 'guard' ? 'lie' : f.mode === 'sit' ? 'sit' : f.speed > 20 ? 'run' : f.speed > 2 ? 'walk' : 'stand';
    poseDog(dog, mode, t, f.speed / 20, f.mode === 'follow' ? (near ? 0.8 : 0.4) : near ? 0.2 : 0);
    // people
    const with_ = s.talk?.with ?? (s.shop ? this.level?.shops.find((x) => x.id === s.shop)?.keeper ?? null : null);
    folk.update(dt, t, h, with_, s.walk, busy);
    // camera: follow the hero a little ahead of where they're walking
    const ahead = moving ? 1.2 : 0;
    this.focus.set(h.x * VOX + Math.sin(s.facing) * ahead, h.y * VOX, h.z * VOX + Math.cos(s.facing) * ahead);
    this.zoom += (this.zoomTo - this.zoom) * Math.min(1, dt * 10);
    Object.assign(this.view, zoomView(this.zoom));
    if (!this.started) { this.follow.snap(this.focus); this.started = true; }
    else this.follow.follow(this.focus, dt);
    this.env.update(dt, this.follow.target, this.camera, 0.35);
    town.update(dt, this.follow.target, this.camera, { x: h.x, z: h.z }, (f) => s.flags.includes(f));
    // labels fade in as the hero comes near; none while a conversation or a shop is open
    for (const l of this.labels) {
      const p = l.at();
      const dist = Math.hypot(p.x / VOX - h.x, p.z / VOX - h.z);
      const k = busy || (l.dog && f.district !== s.district) ? 0 : Math.max(0, Math.min(1, (l.far - dist) / (l.far - l.near)));
      const op = k.toFixed(2);
      if (l.el.style.opacity !== op) l.el.style.opacity = op; // a style write per label per frame adds up
    }
    this.anchors.update();
    if (this.meter && (this.meterT += dt) > 0.5) {
      this.meterT = 0;
      const st = this.stage.stats(), r = this.stage.renderer;
      this.meter.textContent = `${st.fps} fps · ${r.getPixelRatio()}× · ${r.info.render.calls} draws${st.steps.length ? ` · dropped: ${st.steps.join(', ')}` : ''}`;
    }
  }

  /** Zoom out (positive) or in (negative), in steps of the whole range; it eases there. */
  zoomBy(d: number): void { this.zoomTo = Math.max(0, Math.min(1, this.zoomTo + d)); }

  /** The hero's head in screen pixels (for the action prompt), or null when it's off screen. */
  heroScreen(s: State): { x: number; y: number } | null {
    const p = this.stage.toScreen(s.hero.x * VOX, s.hero.y * VOX + this.hero.height + 0.25, s.hero.z * VOX);
    if (!p.visible || p.x < 0 || p.y < 0 || p.x > this.stage.width || p.y > this.stage.height) return null;
    return { x: p.x, y: p.y };
  }

  dispose(): void {
    this.town?.dispose();
    this.folk?.dispose();
    for (const l of this.labels) l.unbind();
    this.layer.remove();
    this.env.dispose();
    this.stage.dispose();
  }
}
