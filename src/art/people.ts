/**
 * The people of Porta Marina as ymir/voxel humanoids at 1/16 m (double the town's density, so faces and
 * clothes read): a `Person` is plain data (build, skin, hair, clothes, things they carry), and `kitOf`
 * paints it. Pure.
 *
 * Dress, from wall paintings and finds (Pompeii and Herculaneum):
 * - Men and boys: a knee-length tunica, belted; workmen often in the exomis (one shoulder bare).
 * - Women: an ankle-length tunica under a stola, a palla (shawl) over the shoulders or head.
 * - Freeborn boys wear a bulla, a gold or leather amulet on a cord, until they come of age.
 * - Gauls: the hooded cloak (cucullus) in checked wool, and gallicae, closed shoes.
 * - Shoes: sandals (soleae) or closed calcei in town.
 */
import { model, finish, box, pair, rect, type Model, type Build, type CharacterKit } from 'ymir/voxel';
import { mixc, tint, h3, vary } from './palette';
import { FORUM_CAST } from './people-forum';
import { ABBONDANZA_CAST } from './people-abbondanza';

export const PEOPLE_VOX = 0.0625;

export type Hair = 'crop' | 'curls' | 'bun' | 'braids' | 'bald' | 'scarf' | 'shaggy';
export interface Person {
  build: 'child' | 'adult' | 'stout';
  skin: number;
  hair: Hair;
  hairColor: number;
  beard?: number;
  tunic: number;
  /** Knee (men, children), ankle (women), or the one-shouldered exomis. */
  cut: 'short' | 'long' | 'exomis';
  belt?: number;
  /** A stripe down the tunic (a clavus) or a border. */
  trim?: number;
  cloak?: { color: number; check?: number; hood?: boolean };
  palla?: number;
  shoes: number;
  apron?: number;
  bulla?: boolean;
  satchel?: boolean;
  /** Something in the right hand. */
  holds?: 'tablets' | 'stylus' | 'amphora' | 'chisel' | 'ladle' | 'scroll';
  /** Something on the head. */
  carries?: 'hydria' | 'basket';
  /** A broad-brimmed petasus, in this colour (the hero, once the old man gives it). */
  hat?: number;
  freckles?: boolean;
  /** Eye colour. */
  eyes?: number;
}

const WHITE = 0xf6f1e8;

export const BUILDS: Record<Person['build'], Build> = {
  child: { torso: [8, 7, 5], head: [10, 10, 9], arm: 7, leg: 7, legs: true, scale: 1, limb: 1 },
  adult: { torso: [10, 9, 6], head: [10, 10, 9], arm: 9, leg: 9, legs: true, scale: 1, limb: 1 },
  stout: { torso: [12, 9, 8], head: [10, 10, 9], arm: 9, leg: 8, legs: true, scale: 1, limb: 1 },
};

const bounds = (w: number, d: number) => {
  const x0 = -Math.floor(w / 2), z0 = -Math.floor(d / 2);
  return { x0, x1: x0 + w - 1, z0, z1: z0 + d - 1 };
};
/** Woollen cloth: a little irregular, never flat. */
const cloth = (c: number, x: number, y: number, z: number) => tint(c, (h3(x, y, z) - 0.5) * 0.08);
/** Gaulish check: two crossing stripes of `b` on `a`. */
const check = (a: number, b: number, u: number, v: number) => ((u % 4 === 0) || (v % 4 === 0) ? ((u % 4 === 0) && (v % 4 === 0) ? tint(b, -0.15) : b) : a);

function torso(p: Person): Model {
  const m = model();
  const S = m.solid;
  const [w, h, d] = BUILDS[p.build].torso;
  const { x0, x1, z0, z1 } = bounds(w, d);
  box(S, x0, 0, z0, x1, h - 1, z1, (x, y, z) => {
    // exomis: the right shoulder and that side of the chest bare
    if (p.cut === 'exomis' && x >= 1 && y >= h - 3 && z >= z0) return p.skin;
    if (p.belt !== undefined && (y === 2 || (y === 1 && p.build !== 'child'))) return p.belt;
    if (p.trim !== undefined && z === z1 && (x === -2 || x === 1)) return p.trim;
    // folds: vertical shading where the wool hangs from the belt
    const fold = y < 2 && ((x + 40) % 3 === 0) ? -0.1 : 0;
    return tint(cloth(p.tunic, x, y, z), fold);
  }, 0);
  // the neckline
  rect(S, -2, h - 1, 1, h - 1, z1, p.cut === 'exomis' ? p.skin : tint(p.tunic, -0.2));
  if (p.apron !== undefined) box(S, x0 + 1, 0, z1 + 1, x1 - 1, h - 3, z1 + 1, (x, y) => cloth(p.apron!, x, y, 3));
  if (p.bulla) { S.set(-1, h - 3, z1 + 1, 0xd9a83a); S.set(0, h - 3, z1 + 1, 0xd9a83a); S.set(-1, h - 4, z1 + 1, 0xc0902a); S.set(0, h - 4, z1 + 1, 0xc0902a); rect(S, -2, h - 2, 1, h - 2, z1 + 1, 0x6a4a2a); }
  if (p.satchel) {
    // a strap across the chest, the bag on the left hip
    for (let y = 0; y < h; y++) S.set(Math.round(x1 - 1 - (y * (w - 2)) / h), h - 1 - y, z1 + 1, 0x6a4628);
    box(S, x0 - 1, 0, z0, x0 - 1, 3, z1, 0x7a5232);
  }
  if (p.cloak) {
    const c = p.cloak;
    // over the back and shoulders, falling to the backs of the knees (below the torso it's on the legs)
    box(S, x0 - 1, 0, z0 - 1, x1 + 1, h, z0 - 1, (x, y) => (c.check !== undefined ? check(c.color, c.check, x + 20, y) : cloth(c.color, x, y, 1)));
    box(S, x0 - 1, h, z0 - 1, x1 + 1, h, z1, (x, _y, z) => (c.check !== undefined ? check(c.color, c.check, x + 20, z + 20) : cloth(c.color, x, h, z)));
    // a bronze brooch at the throat
    S.set(x1 - 1, h - 1, z1 + 1, 0xc9a050);
  }
  if (p.palla !== undefined) {
    box(S, x0 - 1, h - 4, z0 - 1, x1 + 1, h, z0 - 1, (x, y) => cloth(p.palla!, x, y, 2));
    box(S, x0 - 1, h - 1, z0, x0 - 1, h, z1, (x, y, z) => cloth(p.palla!, x, y, z));
    box(S, x1 + 1, h - 1, z0, x1 + 1, h, z1, (x, y, z) => cloth(p.palla!, x, y, z));
  }
  return finish(m);
}

function head(p: Person): Model {
  const m = model();
  const S = m.solid, G = m.glow;
  const [w, h, d] = BUILDS[p.build].head;
  const { x0, x1, z0, z1 } = bounds(w, d);
  // the neck, then the head, the jaw a little narrower
  box(S, -2, 0, -2, 1, 0, 1, tint(p.skin, -0.1), 0);
  box(S, x0, 1, z0, x1, h, z1, (x, y) => (y <= 2 && (x === x0 || x === x1) ? null : p.skin), 0.02);
  const f = z1;
  // eyes: whites, dark irises looking ahead, a glint
  const iris = p.eyes ?? 0x3a2a1c;
  pair(S, -4, 5, -3, 6, f, WHITE);
  pair(S, -3, 5, -3, 6, f, iris);
  G.set(-3, 6, f, 0xffffff); G.set(2, 6, f, 0xffffff);
  // brows, a nose, a mouth, ears
  pair(S, -4, 7, -3, 7, f, tint(p.hairColor, -0.1));
  box(S, -1, 4, f + 1, 0, 5, f + 1, tint(p.skin, -0.06), 0);
  rect(S, -1, 2, 0, 2, f, tint(p.skin, -0.35));
  S.set(-2, 3, f, tint(p.skin, -0.2)); S.set(1, 3, f, tint(p.skin, -0.2));
  pair(S, x0 - 1, 4, x0 - 1, 6, 0, tint(p.skin, -0.08));
  // cheeks, freckles
  pair(S, -5, 4, -4, 4, f, mixc(p.skin, 0xd86a5a, 0.25));
  if (p.freckles) for (const [x, y] of [[-4, 4], [3, 4], [-2, 5], [2, 5]]) S.set(x, y, f, tint(p.skin, -0.18));
  if (p.beard !== undefined) {
    box(S, x0, 1, f - 3, x1, 3, f, (x, y, z) => (y === 2 && Math.abs(x + 0.5) < 2 && z === f ? tint(p.skin, -0.35) : cloth(p.beard!, x, y, z)));
  }
  hair(m, p, x0, x1, z0, z1, h);
  if (p.carries === 'hydria') {
    // a cloth ring, then the water jar balanced on it
    box(S, -3, h + 1, -3, 2, h + 1, 2, 0xd8cdb0, 0);
    for (let y = 0; y < 9; y++) {
      const r = y < 2 ? 2 : y < 6 ? 3.6 : y < 8 ? 1.6 : 2.4;
      box(S, -4, h + 2 + y, -4, 3, h + 2 + y, 3, (x, _y, z) => ((x + 0.5) ** 2 + (z + 0.5) ** 2 <= r * r ? (y === 4 ? 0x2a1a12 : 0xb8643a) : null), 0.05);
    }
  }
  if (p.carries === 'basket') {
    // a wicker basket of grapes from the vintage, balanced on the head
    box(S, -4, h + 1, -4, 3, h + 3, 3, (x, y, z) => (Math.abs(x + 0.5) > 3 || Math.abs(z + 0.5) > 3 || y === h + 1 ? ((x + y + z) & 1 ? 0xa8844a : 0x8a6a3a) : null), 0);
    box(S, -3, h + 3, -3, 2, h + 4, 2, (x, y, z) => (h3(x, y, z) > 0.25 ? (h3(x, y + 1, z) > 0.5 ? 0x4b2a52 : 0x5a3a62) : null), 0);
  }
  if (p.hat !== undefined) {
    // the petasus: a broad straw brim, a low round crown
    const c = p.hat;
    box(S, x0 - 3, h + 1, z0 - 3, x1 + 3, h + 1, z1 + 3, (x, _y, z) => ((x + 0.5) ** 2 + (z - (z0 + z1) / 2) ** 2 <= 64 ? vary(c, x, h, z, 0.06) : null), 0);
    box(S, x0 + 1, h + 2, z0 + 1, x1 - 1, h + 4, z1 - 1, (x, y, z) => (y === h + 2 ? tint(c, -0.3) : vary(tint(c, -0.06), x, y, z, 0.05)), 0);
  }
  return finish(m);
}

function hair(m: Model, p: Person, x0: number, x1: number, z0: number, z1: number, h: number): void {
  const S = m.solid;
  const c = p.hairColor;
  const hc = (x: number, y: number, z: number) => tint(c, (h3(x, y, z) - 0.5) * 0.18);
  switch (p.hair) {
    case 'bald':
      box(S, x0, 3, z0, x1, 6, z0, hc); // a fringe round the back
      break;
    case 'crop':
      box(S, x0, h, z0, x1, h + 1, z1, hc);
      box(S, x0, 6, z0, x1, h, z0, hc);
      for (const x of [x0, x1]) box(S, x, 6, z0, x, h, z1 - 2, hc);
      rect(S, x0, h - 1, x1, h - 1, z1, (x, y) => hc(x, y, z1)); // the fringe
      break;
    case 'curls':
      box(S, x0 - 1, h - 1, z0 - 1, x1 + 1, h + 2, z1, (x, y, z) => (h3(x, y, z) > 0.2 ? hc(x, y, z) : null));
      box(S, x0 - 1, 4, z0 - 1, x1 + 1, h, z0, hc);
      for (const x of [x0 - 1, x1 + 1]) box(S, x, 5, z0, x, h, z1 - 3, hc);
      rect(S, x0, h - 1, x1, h - 1, z1 + 1, (x) => ((x + 9) % 2 ? hc(x, h, z1) : null));
      break;
    case 'shaggy':
      box(S, x0 - 1, h - 1, z0 - 1, x1 + 1, h + 2, z1 + 1, (x, y, z) => (h3(x, y, z) > 0.15 ? hc(x, y, z) : null));
      box(S, x0 - 1, 2, z0 - 1, x1 + 1, h, z0, hc);
      for (const x of [x0 - 1, x1 + 1]) box(S, x, 3, z0, x, h, z1, hc);
      rect(S, x0, h - 2, x1, h - 1, z1 + 1, (x, y) => ((x + y + 9) % 3 ? hc(x, y, z1) : null));
      break;
    case 'bun':
    case 'braids':
      box(S, x0, h, z0, x1, h + 1, z1, hc);
      box(S, x0 - 1, 4, z0 - 1, x1 + 1, h, z0, hc);
      for (const x of [x0 - 1, x1 + 1]) box(S, x, 4, z0, x, h, z1 - 2, hc);
      // a centre parting
      rect(S, -1, h + 1, 0, h + 1, z1, tint(c, -0.25));
      if (p.hair === 'bun') box(S, -2, h - 1, z0 - 3, 1, h + 2, z0 - 1, hc);
      else for (const x of [x0 - 1, x1 + 1]) box(S, x, -4, z0, x, 4, z0 + 1, (_x, y) => (y % 2 ? hc(x, y, 0) : tint(c, -0.2)));
      break;
    case 'scarf': {
      const s = 0xb8442e;
      box(S, x0 - 1, 5, z0 - 1, x1 + 1, h + 1, z1, (x, y, z) => (z === z1 && y < h - 1 ? null : cloth(s, x, y, z)));
      box(S, x0 - 1, h - 1, z1, x1 + 1, h - 1, z1, tint(s, 0.15));
      box(S, -2, 0, z0 - 2, 1, 6, z0 - 1, (x, y, z) => cloth(s, x, y, z)); // the knot down the back
      break;
    }
  }
  if (p.cloak?.hood) {
    // the hood down on the shoulders behind the head
    box(S, x0 - 1, 0, z0 - 2, x1 + 1, 4, z0 - 1, (x, y) => (p.cloak!.check !== undefined ? check(p.cloak!.color, p.cloak!.check!, x + 20, y + 20) : cloth(p.cloak!.color, x, y, 9)));
  }
}

function arm(p: Person, side: -1 | 1): Model {
  const m = model();
  const S = m.solid;
  const n = BUILDS[p.build].arm;
  const hand = -(n - 1);
  const bare = p.cut === 'exomis' && side === 1;
  // short sleeves: the tunic covers the upper third
  box(S, -1, hand, -1, 1, 0, 1, (x, y, z) => (y <= hand + 1 ? p.skin : !bare && y > hand + n * 0.6 ? cloth(p.tunic, x, y, z) : p.skin), 0.02);
  if (p.cloak && side === -1) box(S, -2, hand + 3, -2, -2, 0, 1, (x, y, z) => (p.cloak!.check !== undefined ? check(p.cloak!.color, p.cloak!.check!, z + 20, y + 20) : cloth(p.cloak!.color, x, y, z)));
  if (side === 1) {
    switch (p.holds) {
      case 'tablets': box(S, -1, hand - 1, 2, 1, hand + 3, 2, (_x, y) => (y === hand + 1 ? 0x3a2a1a : 0x8a6a3a)); break;
      case 'stylus': box(S, 0, hand - 3, 2, 0, hand, 2, 0xb8a070); break;
      case 'scroll': box(S, -2, hand, 2, 2, hand + 1, 2, 0xe8dcc0); break;
      case 'chisel': box(S, 0, hand - 4, 2, 0, hand, 2, (_x, y) => (y < hand - 2 ? 0x6a6a6e : 0x7a5a3a)); break;
      case 'ladle': box(S, 0, hand - 5, 2, 0, hand, 2, 0x8a6a34); box(S, -1, hand - 6, 1, 1, hand - 5, 3, 0x8a6a34); break;
      case 'amphora':
        for (let y = 0; y < 8; y++) box(S, -2, hand - 6 + y, 2, 2, hand - 6 + y, 5, (x, _y, z) => ((x) ** 2 + (z - 3.5) ** 2 <= (y < 2 ? 1 : y < 6 ? 4.5 : 1.5) ? 0xc2794a : null));
        break;
    }
  }
  return finish(m);
}

function leg(p: Person): Model {
  const m = model();
  const S = m.solid;
  const n = BUILDS[p.build].leg;
  const foot = -(n - 1);
  // how far the tunic comes down the leg
  const hem = p.cut === 'long' ? foot + 1 : foot + Math.round(n * 0.55);
  box(S, -1, foot, -1, 1, 0, 1, (x, y, z) => {
    if (y <= foot + 1) {
      // sandals: straps over the skin; Gaulish shoes closed
      if (y === foot) return p.shoes;
      return p.cloak?.check !== undefined ? p.shoes : (x + z) % 2 ? p.shoes : p.skin;
    }
    if (y >= hem) return cloth(p.tunic, x, y, z);
    return p.skin;
  }, 0.02);
  box(S, -1, foot, 2, 1, foot, 2, p.shoes); // the toes
  if (p.cut === 'long') box(S, -2, foot + 1, -2, 2, 0, 2, (x, y, z) => (Math.abs(x) === 2 || Math.abs(z) === 2 ? cloth(p.tunic, x, y, z) : null)); // the skirt hangs wider
  if (p.cloak && p.build !== 'child') box(S, -1, foot + 3, -2, 1, 0, -2, (x, y, z) => (p.cloak!.check !== undefined ? check(p.cloak!.color, p.cloak!.check!, x + 20, y + 20) : cloth(p.cloak!.color, x, y, z)));
  return finish(m);
}

export function kitOf(p: Person): CharacterKit {
  return { torso: () => torso(p), head: () => head(p), arm: (side) => arm(p, side), leg: () => leg(p) };
}
export const buildOf = (p: Person): Build => BUILDS[p.build];

// ── The cast at Porta Marina ──
const SKIN = { med: 0xc68a60, olive: 0xb57d55, deep: 0x9a6442, fair: 0xe3b28c, warm: 0xd49a70 };

export const CAST: Record<string, Person> = {
  /** The hero: twelve, from Massilia's Gaulish hinterland, off the ship this morning. */
  hero: {
    build: 'child', skin: SKIN.fair, hair: 'shaggy', hairColor: 0x9a4a26, freckles: true, eyes: 0x4a6a3a,
    tunic: 0xd8c8a0, cut: 'short', belt: 0x5a3a20, shoes: 0x5a3a22,
    cloak: { color: 0x3f6a7a, check: 0x8fa6a0, hood: true }, satchel: true,
  },
  Tullia: {
    build: 'child', skin: SKIN.warm, hair: 'braids', hairColor: 0x2a1a12, eyes: 0x3a2a1c,
    tunic: 0xd9a03a, cut: 'long', belt: 0x8a2a24, trim: 0x8a2a24, shoes: 0x7a3a22, palla: 0x3f6a9a, holds: 'tablets',
  },
  Vibia: { build: 'stout', skin: SKIN.olive, hair: 'scarf', hairColor: 0x3a2418, tunic: 0x9a5a3a, cut: 'long', apron: 0xe2d8c0, shoes: 0x5a3a22, holds: 'ladle' },
  Faustus: { build: 'stout', skin: SKIN.med, hair: 'bald', hairColor: 0x5a4a3a, beard: 0x5a4a3a, tunic: 0x6a7a4a, cut: 'short', belt: 0x4a3020, shoes: 0x4a3020, holds: 'amphora' },
  Sextus: { build: 'adult', skin: SKIN.med, hair: 'crop', hairColor: 0x2a1e16, tunic: 0xece4d2, cut: 'short', belt: 0x6a4a2a, trim: 0x8a2a24, shoes: 0x3a2a1c, holds: 'tablets' },
  Prima: { build: 'adult', skin: SKIN.deep, hair: 'bun', hairColor: 0x1a1210, tunic: 0x7a8a9a, cut: 'long', belt: 0x5a4a3a, shoes: 0x4a3a2a, carries: 'hydria' },
  Lucius: { build: 'child', skin: SKIN.med, hair: 'curls', hairColor: 0x2a1a10, tunic: 0xe8dcc2, cut: 'short', belt: 0x8a6a3a, shoes: 0x5a3a22, bulla: true },
  Modestus: { build: 'adult', skin: SKIN.olive, hair: 'crop', hairColor: 0x3a2a1a, beard: 0x3a2a1a, tunic: 0xf0ebe0, cut: 'short', apron: 0xd8cdb8, belt: 0xbdb3a0, shoes: 0x5a4a3a, holds: 'scroll' },
  Celsus: { build: 'adult', skin: SKIN.deep, hair: 'crop', hairColor: 0x1e1612, beard: 0x1e1612, tunic: 0x8a7a5a, cut: 'exomis', belt: 0x4a3020, apron: 0x7a5a3a, shoes: 0x3a2a1c, holds: 'chisel' },
};

// ── Townsfolk: everyone without a name in the story wears the Latin for what they are ──

/** The Latin a townsperson's name tag shows (nominative, with macrons), and what it means. */
export const TAGS = {
  puella: { la: 'puella', en: 'girl', fr: 'fille' },
  puer: { la: 'puer', en: 'boy', fr: 'garçon' },
  femina: { la: 'fēmina', en: 'woman', fr: 'femme' },
  vir: { la: 'vir', en: 'man', fr: 'homme' },
  senex: { la: 'senex', en: 'old man', fr: 'vieil homme' },
  avia: { la: 'avia', en: 'grandmother', fr: 'grand-mère' },
  nauta: { la: 'nauta', en: 'sailor', fr: 'marin' },
  mercator: { la: 'mercātor', en: 'merchant', fr: 'marchand' },
  agricola: { la: 'agricola', en: 'farmer', fr: 'paysan' },
  faber: { la: 'faber', en: 'craftsman', fr: 'artisan' },
  pistor: { la: 'pistor', en: 'baker', fr: 'boulanger' },
  caupo: { la: 'caupō', en: 'innkeeper', fr: 'aubergiste' },
  sutor: { la: 'sūtor', en: 'shoemaker', fr: 'cordonnier' },
  fullo: { la: 'fullō', en: 'fuller', fr: 'foulon' },
} as const;
export type TagKind = keyof typeof TAGS;

const TUNICS = [0xd8c8a0, 0xb8643a, 0x6a7a4a, 0x7a8a9a, 0xe8dcc2, 0x9a5a3a, 0x5a6a8a, 0xc9a050, 0x8a4a5a, 0xece4d2];
const HAIR = [0x1a1210, 0x2a1a10, 0x3a2418, 0x5a3a24, 0x6a4a2a, 0x8a6a4a];
const SKINS = Object.values(SKIN);
const pick = <T,>(a: readonly T[], v: number, salt: number): T => a[Math.floor(h3(v, salt, 17) * a.length) % a.length];

/** A townsperson of a kind, varied by `variant` (clothes, hair, build, what they carry). Pure and stable. */
export function townsperson(kind: TagKind, variant: number): Person {
  const v = variant + kind.length * 31;
  const skin = pick(SKINS, v, 1), hairColor = pick(HAIR, v, 2), tunic = pick(TUNICS, v, 3);
  const shoes = pick([0x5a3a22, 0x3a2a1c, 0x4a3020], v, 4);
  const base = { skin, hairColor, tunic, shoes, belt: pick([0x5a3a20, 0x8a6a3a, 0x4a3020], v, 5) };
  switch (kind) {
    case 'puella': return { ...base, build: 'child', hair: h3(v, 6, 1) > 0.5 ? 'braids' : 'bun', cut: 'long', palla: h3(v, 7, 1) > 0.6 ? pick(TUNICS, v, 8) : undefined };
    case 'puer': return { ...base, build: 'child', hair: h3(v, 6, 1) > 0.5 ? 'curls' : 'crop', cut: 'short', bulla: h3(v, 9, 1) > 0.4 };
    case 'femina': return { ...base, build: h3(v, 6, 2) > 0.7 ? 'stout' : 'adult', hair: h3(v, 6, 1) > 0.4 ? 'bun' : 'scarf', cut: 'long', palla: h3(v, 7, 1) > 0.4 ? pick(TUNICS, v, 8) : undefined, carries: h3(v, 10, 1) > 0.8 ? 'hydria' : undefined };
    case 'avia': return { ...base, build: 'stout', hair: 'scarf', hairColor: 0xb8b2a8, cut: 'long', palla: 0x6a6a7a };
    case 'senex': return { ...base, build: 'adult', hair: 'bald', hairColor: 0xc8c2b8, beard: 0xd8d2c8, cut: 'long', cloak: { color: pick([0x6a5a4a, 0x7a6a5a], v, 9) } };
    case 'nauta': return { ...base, build: 'adult', hair: 'shaggy', beard: hairColor, cut: 'exomis', tunic: pick([0x7a8a9a, 0x5a6a8a, 0xb8a888], v, 3) };
    case 'mercator': return { ...base, build: 'stout', hair: 'crop', cut: 'short', trim: 0x8a2a24, holds: 'tablets', cloak: { color: pick([0x8a3a2a, 0x3a5a7a], v, 9) } };
    case 'agricola': return { ...base, build: 'adult', hair: 'crop', beard: hairColor, cut: 'exomis', tunic: 0x8a7a5a, carries: 'basket' };
    case 'faber': return { ...base, build: 'adult', hair: 'crop', beard: hairColor, cut: 'exomis', apron: 0x7a5a3a, holds: 'chisel' };
    case 'pistor': return { ...base, build: 'adult', hair: 'crop', cut: 'short', tunic: 0xf0ebe0, apron: 0xd8cdb8, holds: 'scroll' };
    case 'caupo': return { ...base, build: 'stout', hair: 'bald', beard: hairColor, cut: 'short', apron: 0xe2d8c0, holds: 'ladle' };
    case 'sutor': return { ...base, build: 'adult', hair: 'crop', cut: 'short', apron: 0x5a3a24, holds: 'stylus' };
    case 'fullo': return { ...base, build: 'adult', hair: 'crop', cut: 'exomis', tunic: 0xe8e4da, apron: 0xb8b2a8 };
    default: return { ...base, build: 'adult', hair: 'crop', cut: 'short' };
  }
}

/** A cast name (`Vibia`) or a townsperson (`puella:2`) as a Person. */
export function personFor(who: string): Person | null {
  const named = CAST[who] ?? FORUM_CAST[who] ?? ABBONDANZA_CAST[who];
  if (named) return named;
  const [kind, v] = who.split(':');
  return kind in TAGS ? townsperson(kind as TagKind, Number(v) || 0) : null;
}
/** What a name tag over someone says: their name, or the Latin for what they are. */
export function tagFor(who: string): { la?: string; name?: string; en?: string; fr?: string } {
  if (CAST[who] || FORUM_CAST[who] || ABBONDANZA_CAST[who]) return { name: who };
  const kind = who.split(':')[0] as TagKind;
  return TAGS[kind] ? { ...TAGS[kind] } : { name: who };
}
