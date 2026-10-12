/**
 * Every item as a little voxel model at 1/16 m: the inventory's icons (rendered once with ymir/three
 * `renderModels`) and the things lying in the street. Pure.
 *
 * Pompeian bread was round and cut into eight wedges before baking (loaves were found carbonised in an
 * oven); sandals were soleae with a strap; the petasus was the broad-brimmed traveller's hat; lamps were
 * clay with a nozzle for the wick.
 */
import { model, type Model } from 'ymir/voxel';
import type { ItemId } from '../content/items';
import { h3, vary } from './palette';

const set = (m: Model, x: number, y: number, z: number, c: number) => m.solid.set(x, y, z, c);
const disc = (m: Model, r: number, y0: number, y1: number, c: (x: number, y: number, z: number) => number | null) => {
  for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) for (let y = y0; y <= y1; y++) if (x * x + z * z <= r * r + r * 0.5) { const v = c(x, y, z); if (v !== null) set(m, x, y, z, v); }
};

const MODELS: Record<ItemId, () => Model> = {
  bread: () => {
    const m = model();
    disc(m, 6, 0, 3, (x, y, z) => {
      if (y === 3 && (x * x + z * z) > 30) return null;
      // eight wedges scored from the middle out
      const a = Math.atan2(z, x), wedge = Math.abs(Math.sin(a * 4)) < 0.18 && y >= 2;
      return wedge ? 0x8a5a2a : vary(y === 3 ? 0xc68a48 : 0xb0763a, x, y, z, 0.06);
    });
    return m;
  },
  cheese: () => {
    const m = model();
    disc(m, 5, 0, 3, (x, y, z) => (x > 0 && z > 0 ? null : vary(y === 3 || x === 0 || z === 0 ? 0xf0dca0 : 0xe2c070, x, y, z, 0.05)));
    return m;
  },
  grapes: () => {
    const m = model();
    for (let y = 0; y < 8; y++) { const r = Math.max(1, 4 - Math.abs(y - 5) * 0.8); disc(m, Math.round(r), y, y, (x, yy, z) => (h3(x, yy, z) > 0.2 ? vary(0x5a2a62, x, yy, z, 0.15) : null)); }
    set(m, 0, 8, 0, 0x5a4a2a); set(m, 1, 9, 0, 0x6f9a3e); set(m, 2, 9, 0, 0x6f9a3e);
    return m;
  },
  apple: () => {
    const m = model();
    for (let y = 0; y < 6; y++) { const r = y === 0 || y === 5 ? 2 : 3; disc(m, r, y, y, (x, yy, z) => vary(x > 0 ? 0xc8402a : 0xa83422, x, yy, z, 0.06)); }
    set(m, 0, 6, 0, 0x5a3a20); set(m, 1, 7, 0, 0x6f9a3e);
    return m;
  },
  oil: () => {
    const m = model();
    const profile = [2, 3, 4, 4, 4, 3, 2, 1, 1, 2];
    profile.forEach((r, y) => disc(m, r, y, y, (x, yy, z) => vary(y >= 8 ? 0xb8643a : 0xc2794a, x, yy, z, 0.05)));
    for (const s of [-1, 1]) for (let y = 5; y <= 8; y++) set(m, s * 3, y, 0, 0xb8643a);
    return m;
  },
  flask: () => {
    const m = model();
    [2, 3, 3, 3, 2, 1, 1].forEach((r, y) => disc(m, r, y, y, (x, yy, z) => vary(0x8ab0a8, x, yy, z, 0.08)));
    set(m, 0, 7, 0, 0x6a4a2a);
    return m;
  },
  sandals: () => {
    const m = model();
    for (const side of [-3, 3]) {
      for (let z = -5; z <= 5; z++) for (let x = -1; x <= 1; x++) set(m, side + x, 0, z, vary(0x8a5a32, x, 0, z, 0.06));
      for (const z of [-1, 3]) for (let x = -1; x <= 1; x++) set(m, side + x, 1, z, 0x5a3a22);
      set(m, side, 1, -4, 0x5a3a22);
    }
    return m;
  },
  hat: () => {
    const m = model();
    disc(m, 7, 0, 0, (x, y, z) => vary(0xb89a62, x, y, z, 0.06)); // the broad brim
    disc(m, 3, 1, 3, (x, y, z) => vary(y === 3 ? 0xa8884e : 0xb08f56, x, y, z, 0.05)); // the low crown
    for (let x = -3; x <= 3; x++) set(m, x, 1, 3, 0x6a4a2a); // a cord
    return m;
  },
  lamp: () => {
    const m = model();
    disc(m, 3, 0, 2, (x, y, z) => vary(y === 2 && x * x + z * z < 2 ? 0x4a2a18 : 0xb8643a, x, y, z, 0.05));
    for (let z = 3; z <= 6; z++) set(m, 0, 1, z, 0xb8643a); // the nozzle
    m.glow.set(0, 2, 6, 0xffb050);
    for (let y = 1; y <= 3; y++) set(m, 0, y, -4, 0xa85a32); // the handle
    return m;
  },
  tablet: () => {
    const m = model();
    for (let x = -5; x <= 5; x++) for (let z = -4; z <= 4; z++) set(m, x, 0, z, Math.abs(x) === 5 || Math.abs(z) === 4 ? 0x8a6a3a : (h3(x, 0, z) > 0.8 ? 0x2a1d14 : 0x3a2a1c));
    for (let x = -5; x <= 5; x++) set(m, x, 1, -4, 0x6a4a2a);
    return m;
  },
  stylus: () => {
    const m = model();
    for (let z = -6; z <= 6; z++) set(m, 0, 0, z, z > 4 ? 0xd8c8a0 : 0xb8a070);
    set(m, 0, 0, 7, 0x8a8a8a);
    return m;
  },
  treat: () => {
    const m = model();
    disc(m, 2, 0, 2, (x, y, z) => vary(0xa8783a, x, y, z, 0.1));
    return m;
  },
  talus: () => {
    const m = model();
    // a sheep's knucklebone: a lumpy little bone, ivory
    for (let x = -2; x <= 2; x++) for (let y = 0; y <= 2; y++) for (let z = -1; z <= 1; z++) if (!(Math.abs(x) === 2 && y === 2)) set(m, x, y, z, vary(0xe8dcc0, x, y, z, 0.08));
    set(m, 0, 1, 2, 0xd8c8a8); set(m, -1, 3, 0, 0xd8c8a8);
    return m;
  },
};

export function itemModel(id: ItemId): Model { return MODELS[id](); }
export const ITEM_IDS = Object.keys(MODELS) as ItemId[];
