/**
 * The named people of Via dell'Abbondanza. Two are names the street itself gives us:
 * - Stephanus, the fuller: the fullonica at I 6, 7 is named for him from an election notice painted on its
 *   front. A fuller works bare-armed in the one-shouldered exomis, his legs wet to the knee from the vats.
 * - Vetutius Placidus, who kept the thermopolium at I 8, 8 (his name is painted on the front, and his
 *   house opens behind the counter). Stout, aproned, a ladle in his hand.
 * And one of ours:
 * - Fortunata, who sells lamps and pots (a common freedwoman's name at Pompeii). Her cat is missing.
 */
import type { Person } from './people';

export const ABBONDANZA_CAST: Record<string, Person> = {
  Stephanus: {
    build: 'adult', skin: 0xb57d55, hair: 'curls', hairColor: 0x2a1e16, beard: 0x2a1e16, eyes: 0x3a2a1c,
    tunic: 0xece6d8, cut: 'exomis', belt: 0x8a6a3a, apron: 0xc9c2b2, shoes: 0x4a3020,
  },
  Placidus: {
    build: 'stout', skin: 0xc68a60, hair: 'bald', hairColor: 0x4a3a2a, beard: 0x6a5a4a, eyes: 0x3a2a1c,
    tunic: 0x8a4a5a, cut: 'short', belt: 0x4a3020, trim: 0xd9a948, apron: 0xe2d8c0, shoes: 0x3a2a1c, holds: 'ladle',
  },
  Fortunata: {
    build: 'adult', skin: 0xd49a70, hair: 'bun', hairColor: 0x5a3a24, eyes: 0x4a5a3a, freckles: true,
    tunic: 0x5a6a8a, cut: 'long', belt: 0xc9a050, palla: 0xb8643a, shoes: 0x5a3a22,
  },
};
