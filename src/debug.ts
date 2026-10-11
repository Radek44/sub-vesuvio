/**
 * Art check: a district (`?district=forum`) under the town renderer, camera on a point (`?at=x,z` in voxels, `?mood=`,
 * `?bend=`, `?pitch=`, `?dist=`, `?yaw=`). `window.artCheck` reports timings. Not part of the game.
 */
import * as THREE from 'three';
import { Environment, FollowCamera, LOOK, MOODS, Stage, createPost } from 'ymir/three';
import { district, type DistrictId } from './level';
import { TownView, VOX } from './render/town';
import { BAY } from './render/moods';

const q = new URLSearchParams(location.search);
const num = (k: string, d: number) => (q.has(k) ? Number(q.get(k)) : d);
const [ax, az] = (q.get('at') ?? '250,215').split(',').map(Number);
const t0 = performance.now();
const level = district((q.get('district') ?? 'portaMarina') as DistrictId);
const buildMs = performance.now() - t0;
const camera = new THREE.PerspectiveCamera(num('fov', 30), 1, 0.5, 2000);
const stage = new Stage(document.getElementById('world')!, { camera, ladder: false, toneMapping: THREE.ACESFilmicToneMapping, post: q.get('post') === '0' ? undefined : createPost() });
const mood = (BAY as Record<string, typeof MOODS.golden>)[q.get('mood') ?? 'arrival'] ?? BAY.arrival;
const env = new Environment(stage.scene, { mood, renderer: stage.renderer, shadowExtent: 18, horizon: 0.55 });
const town = new TownView(stage.scene, env, level, { plume: num('plume', 0.05) });
LOOK.uBend.value = num('bend', 0.004);
const y = (level.world.topAt(ax, az, 120, -20) ?? 0) + 1;
const focus = new THREE.Vector3(ax * VOX, y * VOX, az * VOX);
const follow = new FollowCamera(camera, { pitch: num('pitch', 0.82), distance: num('dist', 26), yaw: num('yaw', 0) });
follow.snap(focus);
const t1 = performance.now();
town.syncAll();
const meshMs = performance.now() - t1;
const frame = (dt: number) => { env.update(dt, focus, camera, 0.35); town.update(dt, focus, camera, { x: ax, z: az }, () => false); };
frame(0.016);
const live = q.get('live') === '1';
if (live) stage.start((dt) => frame(dt));
else stage.draw();
(window as unknown as { town: unknown }).town = { town, camera, focus, stage };
(window as unknown as { artCheck: unknown }).artCheck = { buildMs: Math.round(buildMs), meshMs: Math.round(meshMs), chunks: level.world.chunkKeys().length };
