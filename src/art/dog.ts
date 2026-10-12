/**
 * Ferox, the big scruffy guard dog of the House of the Dog (a Molossian, the Roman guard breed: deep
 * chest, heavy head, dark brindle coat), wearing the red collar of the CAVE CANEM mosaic. Parts at
 * 1/16 m, each on its pivot, so the world can rig him: body (pivot at the shoulders' height, centre),
 * head (pivot at the neck), four legs (pivot at the hip or shoulder, hanging), tail (pivot at its root).
 * +z is his front. Pure.
 */
import { model, finish, type Model } from 'ymir/voxel';
import { h3, mixc, tint } from './palette';

const COAT = 0x3c3633, COAT2 = 0x5a4a3e, BELLY = 0x6e5a48, MUZZLE = 0x8a7462, NOSE = 0x161210, COLLAR = 0xb0302a, RING = 0xc9a050;

/** Brindle: dark stripes over a brown-grey base, with scruff. */
const fur = (x: number, y: number, z: number) => {
  const stripe = ((x * 3 + y * 2 + z) & 7) < 3;
  return tint(stripe ? COAT : mixc(COAT, COAT2, 0.6), (h3(x, y, z) - 0.5) * 0.18);
};

export const DOG = { bodyLen: 18, bodyH: 9, bodyW: 8, legH: 8, shoulderZ: 6, hipZ: -7 } as const;

export function dogBody(): Model {
  const m = model();
  const { bodyLen: L, bodyH: H, bodyW: W } = DOG;
  for (let z = -L / 2; z < L / 2; z++) for (let y = 0; y < H; y++) for (let x = -W / 2; x < W / 2; x++) {
    // a deep chest tapering to the waist; a rounded back
    const t = (z + L / 2) / L;
    const depth = H * (0.62 + 0.38 * t);
    if (y < H - depth) continue;
    const r = Math.abs(x + 0.5) / (W / 2);
    if (r > 0.92 && (y === H - 1 || y === H - Math.ceil(depth))) continue;
    const belly = y < H - depth + 2 && Math.abs(x + 0.5) < 2.5;
    // scruffy: a few tufts stand off the back
    m.solid.set(x, y, z, belly ? tint(BELLY, (h3(x, y, z) - 0.5) * 0.1) : fur(x, y, z));
    if (y === H - 1 && h3(x, z, 3) > 0.82) m.solid.set(x, H, z, fur(x, H, z));
  }
  return finish(m);
}

export function dogHead(): Model {
  const m = model();
  const S = m.solid;
  // the skull: broad, set on a thick neck that rises from the pivot
  for (let x = -4; x <= 3; x++) for (let y = 0; y <= 7; y++) for (let z = -3; z <= 3; z++) {
    if ((x === -4 || x === 3) && (y === 7 || y === 0)) continue;
    S.set(x, y, z, fur(x + 9, y, z));
  }
  // the muzzle, heavy and lighter, the black nose, the jowls
  for (let x = -2; x <= 1; x++) for (let y = 0; y <= 3; y++) for (let z = 4; z <= 7; z++) S.set(x, y, z, tint(MUZZLE, (h3(x, y, z) - 0.5) * 0.1));
  for (let x = -1; x <= 0; x++) { S.set(x, 3, 8, NOSE); S.set(x, 2, 8, NOSE); }
  for (const x of [-3, 2]) for (let y = 0; y <= 1; y++) S.set(x, y, 5, tint(MUZZLE, -0.1));
  S.set(-1, 0, 7, 0x8a3a3a); // the tongue, just showing
  // eyes, amber, under heavy brows
  for (const x of [-3, 2]) { S.set(x, 5, 4, 0xc8902a); S.set(x, 6, 4, tint(COAT, -0.1)); }
  m.glow.set(-3, 5, 4, 0xffe0a0);
  // ears: folded rose ears
  for (const x of [-5, 4]) for (let y = 5; y <= 7; y++) S.set(x, y, -1 + (y - 5), tint(COAT, -0.15));
  // the red collar with its bronze ring, round the neck
  for (let x = -4; x <= 3; x++) for (const z of [-3, 3]) S.set(x, 0, z, COLLAR);
  for (let z = -3; z <= 3; z++) { S.set(-4, 0, z, COLLAR); S.set(3, 0, z, COLLAR); }
  S.set(-1, -1, 3, RING); S.set(0, -1, 3, RING);
  return finish(m);
}

export function dogLeg(front: boolean): Model {
  const m = model();
  const n = DOG.legH;
  for (let y = -n + 1; y <= 0; y++) for (let x = -1; x <= 0; x++) for (let z = -1; z <= 0; z++) m.solid.set(x, y, z, y > -3 && !front ? fur(x, y, z) : y <= -n + 1 ? BELLY : fur(x, y, z + 3));
  m.solid.set(-1, -n + 1, 1, BELLY); m.solid.set(0, -n + 1, 1, BELLY); // the paw
  return finish(m);
}

export function dogTail(): Model {
  const m = model();
  // a thick tail, curving down, its tip lighter
  for (let k = 0; k < 8; k++) {
    const z = -k, y = -Math.round(k * 0.7);
    m.solid.set(0, y, z, k > 5 ? COAT2 : fur(0, y, z));
    if (k < 4) m.solid.set(-1, y, z, fur(1, y, z));
  }
  return finish(m);
}
