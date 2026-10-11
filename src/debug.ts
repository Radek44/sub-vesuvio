/**
 * Art check: the level under the town renderer, camera on a point (`?at=x,z` in voxels, `?mood=`,
 * `?bend=`, `?pitch=`, `?dist=`, `?yaw=`). `window.artCheck` reports timings. Not part of the game.
 */
import * as THREE from 'three';
import { FollowCamera, LOOK, MOODS, Stage, createPost } from 'ymir/three';
import { portaMarina } from './level/portaMarina';
import { TownView, VOX } from './render/town';
import { BAY } from './render/moods';

const q = new URLSearchParams(location.search);
const num = (k: string, d: number) => (q.has(k) ? Number(q.get(k)) : d);
const [ax, az] = (q.get('at') ?? '250,215').split(',').map(Number);
const t0 = performance.now();
const level = portaMarina();
const buildMs = performance.now() - t0;
const camera = new THREE.PerspectiveCamera(num('fov', 30), 1, 0.5, 2000);
const stage = new Stage(document.getElementById('world')!, { camera, ladder: false, toneMapping: THREE.ACESFilmicToneMapping, post: q.get('post') === '0' ? undefined : createPost() });
const mood = (BAY as Record<string, typeof MOODS.golden>)[q.get('mood') ?? 'arrival'] ?? BAY.arrival;
const town = new TownView(stage.scene, stage.renderer, level, { mood, plume: num('plume', 0.05) });
LOOK.uBend.value = num('bend', 0.004);
const y = (level.world.topAt(ax, az, 120, -20) ?? 0) + 1;
const focus = new THREE.Vector3(ax * VOX, y * VOX, az * VOX);
const follow = new FollowCamera(camera, { pitch: num('pitch', 0.82), distance: num('dist', 26), yaw: num('yaw', 0) });
follow.snap(focus);
const t1 = performance.now();
town.syncAll();
const meshMs = performance.now() - t1;
town.update(0.016, focus, camera, { x: ax, z: az });
const live = q.get('live') === '1';
if (live) stage.start((dt) => town.update(dt, focus, camera, { x: ax, z: az }));
else stage.draw();
(window as unknown as { town: unknown }).town = { town, camera, focus, stage };
(window as unknown as { artCheck: unknown }).artCheck = { buildMs: Math.round(buildMs), meshMs: Math.round(meshMs), chunks: level.world.chunkKeys().length };
