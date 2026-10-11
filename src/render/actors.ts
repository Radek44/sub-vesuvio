/**
 * People and Ferox on screen: ymir/three rigs for the cast, posed every frame by what they're doing
 * (selling at a counter, sitting at the toll table, chiselling, carrying water, walking), turning to
 * look at the hero when the hero comes near. Ferox is his own little rig: body, head, four legs, tail.
 * Reads the sim; never writes it.
 */
import * as THREE from 'three';
import { applyPose, breathe, makeRig, rest, talk, walk, work, voxelLook, type Pose, type Rig, modelGroup } from 'ymir/three';
import { PEOPLE_VOX, buildOf, kitOf, personFor, type Person } from '../art/people';
import { DOG, dogBody, dogHead, dogLeg, dogTail } from '../art/dog';
import { VOX } from '../art/palette';
import type { Level, Npc, Walker } from '../level/types';
import { walkerAt } from '../sim/sim';

const look = voxelLook({ voxel: PEOPLE_VOX, edges: 0.08 });

export function personRig(id: string, p: Person): Rig {
  const rig = makeRig(buildOf(p), kitOf(p), { voxel: PEOPLE_VOX, key: `person:${id}`, solid: look });
  rig.root.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
  return rig;
}

export interface DogRig { root: THREE.Group; body: THREE.Group; head: THREE.Group; legs: THREE.Group[]; tail: THREE.Group }

export function dogRig(): DogRig {
  const s = PEOPLE_VOX;
  const part = (key: string, build: () => ReturnType<typeof dogBody>) => {
    const g = new THREE.Group();
    const m = modelGroup(key, build, s, { solid: look });
    m.position.set(-0.5 * s, 0, -0.5 * s);
    g.add(m);
    return g;
  };
  const root = new THREE.Group();
  const body = part('dog:body', dogBody);
  body.position.y = DOG.legH * s;
  root.add(body);
  const head = part('dog:head', dogHead);
  head.position.set(0, (DOG.bodyH - 3) * s, (DOG.bodyLen / 2 - 1) * s);
  body.add(head);
  const legs = [[-2, DOG.shoulderZ, true], [1, DOG.shoulderZ, true], [-2, DOG.hipZ, false], [1, DOG.hipZ, false]].map(([x, z, front]) => {
    const g = part(`dog:leg:${front}`, () => dogLeg(front as boolean));
    g.position.set((x as number) * s, 1 * s, (z as number) * s);
    body.add(g);
    return g;
  });
  const tail = part('dog:tail', dogTail);
  tail.position.set(0, (DOG.bodyH - 1) * s, (-DOG.bodyLen / 2) * s);
  body.add(tail);
  root.traverse((o) => { o.castShadow = true; });
  return { root, body, head, legs, tail };
}

export type DogMode = 'lie' | 'sit' | 'stand' | 'walk' | 'run';

/** Pose Ferox: lying across the threshold, sitting, standing alert, walking or loping. */
export function poseDog(d: DogRig, mode: DogMode, t: number, speed: number, wag: number): void {
  const s = PEOPLE_VOX;
  const legH = DOG.legH * s;
  let bodyY = legH, pitch = 0;
  const gait = mode === 'run' ? 16 : 10;
  const sw = mode === 'walk' || mode === 'run' ? Math.sin(t * gait) * Math.min(1, speed) * (mode === 'run' ? 0.9 : 0.6) : 0;
  const legRot = [sw, -sw, -sw, sw];
  if (mode === 'lie') { bodyY = 1.5 * s; legRot[0] = legRot[1] = -1.45; legRot[2] = legRot[3] = 1.45; }
  if (mode === 'sit') { bodyY = legH * 0.8; pitch = -0.55; legRot[2] = legRot[3] = 1.3; }
  d.body.position.y = bodyY + (mode === 'run' ? Math.abs(sw) * 0.03 : 0);
  d.body.rotation.x = pitch;
  d.legs.forEach((l, i) => { l.rotation.x = legRot[i]; });
  d.head.rotation.x = mode === 'lie' ? 0.35 + Math.sin(t * 0.7) * 0.03 : mode === 'sit' ? 0.45 : -0.05 + Math.sin(t * 2) * 0.03;
  d.head.rotation.y = mode === 'lie' ? Math.sin(t * 0.3) * 0.2 : 0;
  d.tail.rotation.y = Math.sin(t * (6 + wag * 10)) * (0.15 + wag * 0.6);
  d.tail.rotation.x = mode === 'lie' ? 0.8 : -0.3 + wag * -0.4;
}

/** A pose for what a townsperson is doing. */
export function npcPose(pose: Npc['pose'], t: number, seed: number, talking: boolean): Pose {
  if (talking) return talk(t, seed);
  switch (pose) {
    case 'work': return work(t, seed);
    case 'sell': { const p = breathe(t, seed); p.armRX = -0.5 + Math.sin(t * 1.3 + seed) * 0.15; p.lean = 0.05; return p; }
    case 'sit': { const p = rest(); p.legL = -1.45; p.legR = -1.45; p.bounce = -0.28; p.armRX = -0.7; p.armLX = -0.5; p.headX = 0.15 + Math.sin(t * 0.5 + seed) * 0.05; return p; }
    case 'drink': { const p = breathe(t, seed); p.armLX = -0.3; p.armRZ = -0.3; p.headX = 0.1; return p; }
    default: return breathe(t, seed);
  }
}

interface Person3 { id: string; who: string; rig: Rig; seed: number; facing: number; npc?: Npc; walker?: Walker }

/**
 * Everyone in a district: the cast and townsfolk standing at their work, the walkers on their loops (where
 * `walkerAt` says they are at the sim's walk clock), and Ferox. One per district, like the TownView.
 */
export class Townsfolk {
  readonly group = new THREE.Group();
  readonly people: Person3[] = [];
  readonly ferox: DogRig;

  constructor(readonly level: Level) {
    let i = 0;
    for (const npc of level.npcs) {
      if (npc.who === 'Ferox') continue;
      const p = personFor(npc.who);
      if (!p) continue;
      const rig = personRig(npc.who, p);
      rig.root.position.set(npc.x * VOX, level.groundAt(npc.x, npc.z) * VOX, npc.z * VOX);
      rig.root.rotation.y = npc.facing;
      this.group.add(rig.root);
      this.people.push({ id: npc.id, who: npc.who, npc, rig, seed: i++ * 1.7, facing: npc.facing });
    }
    for (const w of level.walkers) {
      const p = personFor(w.who);
      if (!p) continue;
      const rig = personRig(w.who, p);
      this.group.add(rig.root);
      this.people.push({ id: w.id, who: w.who, walker: w, rig, seed: i++ * 1.7, facing: 0 });
    }
    this.ferox = dogRig();
    this.group.add(this.ferox.root);
  }

  /** Where someone's head is (world units), for their name tag. */
  headOf(p: Person3): { x: number; y: number; z: number } {
    const r = p.rig.root.position;
    return { x: r.x, y: r.y + p.rig.height + 0.15, z: r.z };
  }

  /**
   * Pose everyone. Standing people turn to look at a hero who comes near; walkers walk their loop at the
   * sim's walk clock (it stops while the hero talks or shops) and stop to face the hero when spoken to.
   */
  update(dt: number, t: number, hero: { x: number; z: number }, talking: string | null, clock: number, paused: boolean): void {
    for (const r of this.people) {
      if (r.walker) {
        const at = walkerAt(r.walker, clock);
        r.rig.root.position.set(at.x * VOX, this.level.groundAt(at.x, at.z) * VOX, at.z * VOX);
        const talks = talking === r.id;
        const want = talks ? Math.atan2(hero.x - at.x, hero.z - at.z) : at.facing;
        let d = want - r.facing;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        r.facing += d * Math.min(1, dt * 6);
        r.rig.root.rotation.y = r.facing;
        const stride = (clock / 1000) * (r.walker.speed / 13) * 1.6 + r.seed;
        applyPose(r.rig, talks ? talk(t, r.seed) : paused ? breathe(t, r.seed) : walk(stride, Math.min(1, r.walker.speed / 13)));
        continue;
      }
      const npc = r.npc!;
      const dx = hero.x - npc.x, dz = hero.z - npc.z;
      const near = dx * dx + dz * dz < 40 * 40 && npc.pose !== 'work';
      const want = near ? Math.atan2(dx, dz) : npc.facing;
      let d = want - r.facing;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      r.facing += d * Math.min(1, dt * 4);
      r.rig.root.rotation.y = r.facing;
      applyPose(r.rig, npcPose(npc.pose, t, r.seed, talking === npc.id));
    }
  }

  dispose(): void { this.group.removeFromParent(); }
}

export { walk };
