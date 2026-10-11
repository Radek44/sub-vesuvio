/**
 * What lies beyond the playable town: the bay to the west and south, the land falling away, and Vesuvius
 * on the horizon with its plume, which grows chapter by chapter (the player always knows roughly how much
 * time the city has).
 *
 * The town is drawn on a curved world (ymir/three `LOOK.uBend`), so the far land and sea roll away over
 * a horizon near the top of the screen. Vesuvius and its plume are a backdrop on that horizon: they move
 * with the camera, as far things do, and never bend.
 *
 * In AD 79 Vesuvius was a single green cone with vineyards to high on its flanks (the "Bacchus and
 * Vesuvius" fresco from the House of the Centenary shows it so); Somma's ridge is the old rim to its north.
 */
import * as THREE from 'three';
import { LOOK, Water, WorldView, bendable, modelGroup, voxelLook } from 'ymir/three';
import { VoxelWorld, model } from 'ymir/voxel';
import { P, h3, mixc, noise2, tint } from '../art/palette';

/** Vesuvius as seen from Pompeii: about 30 voxels high and 220 wide, the slopes green with vines below, bare grey above. */
function vesuvius() {
  const m = model();
  // a long low range of foothills the mountain stands on, hazed into the horizon
  for (let x = -127; x <= 127; x++) {
    const hgt = Math.round(3 + noise2(x + 400, 0, 18, 9) * 4);
    for (let y = -6; y <= hgt; y++) for (let z = 16; z <= 20; z++) m.solid.set(x, y, z, mixc(0xb9c9bd, 0x93ab92, Math.max(0, (y + 6) / (hgt + 6))));
  }
  for (let x = -110; x <= 110; x++) for (let z = -20; z <= 20; z++) {
    const ax = Math.abs(x);
    // a cone with a broad foot, and Somma's older, lower ridge to the right (north-east, seen from the town)
    const cone = Math.max(0, 34 - ax * 0.36 - Math.abs(z) * 0.5);
    const somma = Math.max(0, 22 - Math.abs(x - 46) * 0.33 - Math.abs(z) * 0.6);
    const top = Math.floor(Math.max(cone, somma) + (noise2(x + 200, z + 50, 9, 3) - 0.5) * 3);
    if (top <= 0) continue;
    for (let y = 0; y <= top; y++) {
      const t = y / 34;
      // seen through ten kilometres of air: blue-green slopes, grey-violet rock
      const green = mixc(0x86a294, 0x9aae96, noise2(x, y + z, 6, 2));
      const rock = mixc(0xa2a0a6, 0xb4b0b2, h3(x, y, z));
      const c = t < 0.55 ? green : t < 0.75 ? mixc(green, rock, (t - 0.55) / 0.2) : rock;
      m.solid.set(x, y, z, tint(c, (h3(x, y, z) - 0.5) * 0.1));
    }
  }
  return m;
}

/** The plume: puffs of grey-white climbing from the summit. `size` 0 is a wisp, 1 is the column of the eruption's eve. */
function plume(size: number) {
  const m = model();
  const H = Math.round(8 + size * 80);
  for (let y = 0; y < H; y++) {
    const t = y / H;
    const r = 1.5 + t * (3 + size * 14) + Math.sin(y * 0.4) * 0.8;
    const drift = t * t * (6 + size * 20); // the wind leans it east
    for (let x = -24; x <= 40; x++) for (let z = -6; z <= 6; z++) {
      const d = Math.hypot(x - drift, z * 1.4);
      if (d > r || h3(x, y, z) > 0.8) continue;
      const c = mixc(0xf2efe8, 0x9a958e, Math.min(1, t * 0.6 + size * 0.4) * h3(x + 1, y, z));
      m.solid.set(x, y, z, c);
    }
  }
  return m;
}

/**
 * The land around the town at 2 m voxels: the rest of Pompeii east of the gate (roofs in blocks between
 * streets), farms, vineyards and pines outside the walls, the ground rising north toward the mountain,
 * the shore falling into the bay west and south. Coordinates in metres; the playable town covers
 * [0, mapW] × [0, mapD] and is left empty here.
 */
export function farLand(mapW: number, mapD: number, wallX: number): VoxelWorld {
  const w = new VoxelWorld();
  const S = 2; // metres per voxel
  for (let gx = -160; gx <= 220; gx++) for (let gz = -220; gz <= 130; gz++) {
    const x = gx * S, z = gz * S;
    if (x >= -2 && x < mapW + 2 && z >= -2 && z < mapD + 2) continue;
    // the harbour side stays open water near the town; the coast curves away to the north
    if (x < 2 && z > -90) continue;
    const shore = -24 + noise2(z, 0, 60, 4) * 30 - Math.max(0, z - 60) * 0.25;
    const southShore = 110 + noise2(x, 0, 70, 5) * 40;
    if (x < shore || z > southShore) continue; // the bay
    const city = x > wallX && z > -260 && z < 90;
    let h = 1 + Math.max(0, -z) * 0.035 + noise2(x, z, 90, 6) * 3 + Math.min(1, (x - shore) / 20) * 2;
    if (city) h = Math.max(h, 4 + noise2(x, z, 200, 7) * 2);
    const top = Math.max(0, Math.round(h / S));
    const haze = (c: number) => mixc(c, 0xc9cfc8, Math.min(0.45, Math.hypot(x - mapW / 2, z - mapD / 2) / 900));
    for (let y = Math.max(0, top - 2); y <= top; y++) {
      let c: number;
      if (x - shore < 8) c = 0xd9c49a; // sand
      else if (city) {
        // insulae: blocks of roofs between a grid of streets, every so often a garden
        const sx = ((x - wallX) % 36 + 36) % 36, sz = ((z + 400) % 30 + 30) % 30;
        const streetCell = sx < 4 || sz < 4;
        c = streetCell ? 0x6a665e : h3(gx >> 2, 1, gz >> 2) > 0.85 ? 0x6f8a46 : (h3(gx, 2, gz) > 0.5 ? P.tile : P.tileDark);
        if (!streetCell && y === top && h3(gx >> 1, 3, gz >> 1) > 0.4) w.set(gx, top + 1, gz, haze(h3(gx, 4, gz) > 0.5 ? P.tile : 0xa04a2a));
      } else {
        const n = noise2(x, z, 40, 8);
        const field = n < 0.3 ? 0xb4a45a : n < 0.55 ? 0x8e9a50 : n < 0.8 ? 0x6f8a40 : 0x9a7a4e;
        c = vineRow(x, z, n) ? 0x5f7a38 : field;
      }
      w.set(gx, y, gz, haze(tint(c, (h3(gx, y, gz) - 0.5) * 0.12)));
    }
    // pines dotting the countryside
    if (!city && x - shore > 12 && h3(gx, 9, gz) > 0.985) {
      w.set(gx, top + 1, gz, 0x7a5440);
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) w.set(gx + dx, top + 2, gz + dz, haze(0x4a7438));
    }
  }
  return w;
}
const vineRow = (_x: number, z: number, n: number) => n > 0.45 && n < 0.62 && ((Math.floor(z / 3) & 1) === 0);

export class Backdrop {
  readonly group = new THREE.Group();
  /** The bay, where the district has a shore; inland, a plain of hazy land under the ring of city. */
  readonly sea: Water | null;
  private plain: THREE.Mesh | null = null;
  private mountain: THREE.Group;
  private plumeGroup: THREE.Group | null = null;
  private plumeSize = -1;
  private mat: THREE.MeshLambertMaterial;
  readonly land: WorldView;

  constructor(scene: THREE.Scene, private o: { scale: number; sea?: { west: number; south: number; level: number }; mapW: number; mapD: number; wallX: number; ground?: number }) {
    // The land beyond the map (`farLand`) stays off: with the world's curve it is over the horizon, and
    // near the map's edges it read as a floating slab. The sea and the mountain carry the distance.
    this.land = new WorldView(new VoxelWorld(), { scale: 2 });
    void farLand;
    // The sea: a wide bent plane west and south of the town; its floor slopes down from the shore.
    const span = 1600;
    const sea = o.sea;
    if (sea) {
      this.sea = new Water({
        x: sea.west - span, z: -span / 2, width: span * 2, depth: span * 2, level: sea.level,
        floor: (x, z) => sea.level - Math.min(12, 1 + Math.max(0, sea.west - x, z - sea.south) * 0.08),
        resolution: 0.08, scale: 3, shallow: 0x46b8c4, deep: 0x1d5f8f, deepAt: 6, foam: 0.6,
      });
      this.sea.mesh.renderOrder = 1;
      scene.add(this.sea.mesh);
    } else {
      // inland: the far city and fields as one hazy plain, just under the ring's ground, rolling over the horizon
      this.sea = null;
      const geo = new THREE.PlaneGeometry(span * 2, span * 2, 64, 64).rotateX(-Math.PI / 2);
      // the colour of roofs and fields seen through haze; just under the district's own ground, so it reaches the horizon
      this.plain = new THREE.Mesh(geo, bendable(new THREE.MeshLambertMaterial({ color: 0xa8916c })));
      this.plain.position.set(o.mapW / 2, (o.ground ?? 0) - 0.6, o.mapD / 2);
      this.plain.receiveShadow = true;
      scene.add(this.plain);
    }
    // Vesuvius: lit, but without fog (the haze is painted in) and without the curve (it sits on the horizon).
    this.mat = voxelLook({ voxel: 1, edges: 0, rim: 0.25, bend: false });
    // a sky layer: drawn after the dome and before the town, so the town covers it wherever it rises
    this.mat.fog = false;
    this.mat.depthTest = false;
    this.mat.depthWrite = false;
    this.mountain = modelGroup('vesuvius', vesuvius, 1, { solid: this.mat });
    // meshes only: a Group's renderOrder becomes its children's group order, which sorts before the sky's
    this.mountain.traverse((c) => { if ((c as THREE.Mesh).isMesh) c.renderOrder = -5; });
    this.group.add(this.mountain);
    this.group.name = 'backdrop';
    scene.add(this.group);
  }

  /** The plume for this chapter (0 wisp … 1 the last night). */
  setPlume(size: number): void {
    const s = Math.round(size * 10) / 10;
    if (s === this.plumeSize) return;
    this.plumeSize = s;
    if (this.plumeGroup) this.mountain.remove(this.plumeGroup);
    this.plumeGroup = modelGroup(`plume:${s}`, () => plume(s), 1, { solid: this.mat });
    this.plumeGroup.position.set(0, 33, 0);
    this.plumeGroup.traverse((c) => { if ((c as THREE.Mesh).isMesh) c.renderOrder = -4; });
    this.mountain.add(this.plumeGroup);
  }

  /**
   * Keep the mountain on the horizon: at a fixed bearing from the camera (NNW of Pompeii, `bearing`
   * radians west of the view's north) and `elevation` below the horizontal (where the curve's horizon is).
   */
  /**
   * Where the curved ground's horizon sits on screen, as the tangent of its angle above the view axis
   * (view space: the curve is applied there). `height` is the camera's height above the ground ahead.
   */
  static horizon(camera: THREE.PerspectiveCamera, height: number): number {
    const fwd = camera.getWorldDirection(new THREE.Vector3());
    const p = Math.asin(-fwd.y);
    const k = LOOK.uBend.value, d0 = LOOK.uBendFrom.value;
    let best = -Infinity;
    for (let R = 2; R < 2000; R *= 1.04) {
      const d = R * Math.cos(p) + height * Math.sin(p);
      const v = R * Math.sin(p) - height * Math.cos(p) - k * Math.max(0, d - d0) ** 2;
      best = Math.max(best, v / d);
    }
    return best;
  }

  /**
   * Keep the mountain on the horizon: at a fixed bearing from the camera (NNW of Pompeii, left of the
   * view's north), its foot on the curve's horizon. Returns the horizon's world-space dip, for the sky.
   */
  update(camera: THREE.PerspectiveCamera, height: number, bearing = -0.2, distance = 400): number {
    const h = Backdrop.horizon(camera, height);
    // the foot two-thirds of the way up the top half of the view: the summit and plume fit under the top edge
    const top = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const dir = new THREE.Vector3(Math.tan(bearing) * top / 0.27, top * 0.5, -1).normalize().applyQuaternion(camera.quaternion);
    this.group.position.copy(camera.position).addScaledVector(dir, distance);
    // a painted card: it faces the camera, so the mountain shows its profile however steeply we look down
    this.group.quaternion.copy(camera.quaternion);
    this.group.scale.setScalar(this.o.scale * (distance / 300));
    if (this.plumeGroup) this.plumeGroup.rotation.y = Math.sin(LOOK.uTime.value * 0.05) * 0.04;
    const ahead = new THREE.Vector3(0, h, -1).normalize().applyQuaternion(camera.quaternion);
    return ahead.y;
  }

  dispose(): void {
    this.sea?.dispose();
    if (this.plain) { this.plain.removeFromParent(); this.plain.geometry.dispose(); (this.plain.material as THREE.Material).dispose(); }
    this.land.dispose(); this.group.removeFromParent(); this.mat.dispose(); }
}

export const SEA_COLOR = P.sea;
