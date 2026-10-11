/**
 * Fortunata's cat: small and grey, one white foot, sitting tall the way cats in Roman mosaics do (the cat
 * with a partridge from the House of the Faun is Pompeii's own). One model at 1/16 m, +z her front. Pure.
 */
import { model, finish, type Model } from 'ymir/voxel';
import { h3, tint } from './palette';

const GREY = 0x8a8a8e, DARK = 0x5e5e64, WHITE = 0xeeeae2, PINK = 0xd88a8a, EYE = 0xc9b030;

export function cat(): Model {
  const m = model();
  const S = m.solid;
  const fur = (x: number, y: number, z: number) => tint(((x + y * 2) & 3) === 0 ? DARK : GREY, (h3(x, y, z) - 0.5) * 0.12);
  // haunches and body, sitting: wide at the bottom, narrowing up to the chest
  for (let y = 0; y < 7; y++) {
    const rx = y < 3 ? 2 : 1.5, rz = y < 3 ? 3 : 2;
    for (let x = -2; x <= 2; x++) for (let z = -3; z <= 2; z++) {
      if (Math.abs(x) > rx || z < -rz || (y > 3 && z < -1)) continue;
      S.set(x, y, z, fur(x, y, z));
    }
  }
  // front legs, one white foot
  for (let y = 0; y < 4; y++) { S.set(-1, y, 3, y === 0 ? WHITE : fur(-1, y, 3)); S.set(1, y, 3, fur(1, y, 3)); }
  // the head
  for (let x = -2; x <= 2; x++) for (let y = 7; y <= 10; y++) for (let z = -1; z <= 2; z++) S.set(x, y, z, fur(x, y, z));
  S.set(-2, 11, 0, DARK); S.set(-2, 11, 1, DARK); S.set(2, 11, 0, DARK); S.set(2, 11, 1, DARK); // ears
  S.set(-2, 11, 2, PINK); S.set(2, 11, 2, PINK);
  m.glow.set(-1, 9, 3, EYE); m.glow.set(1, 9, 3, EYE);
  S.set(0, 8, 3, PINK); // the nose
  // the tail curled round her feet
  for (const [x, z] of [[2, -3], [3, -2], [3, -1], [3, 0], [3, 1], [3, 2], [2, 3]] as const) S.set(x, 0, z, fur(x, 0, z));
  return finish(m);
}
