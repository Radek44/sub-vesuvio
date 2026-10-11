/**
 * The named people of the Forum, dressed from the wall paintings of the Forum market (the Praedia of Julia
 * Felix frieze) and the finds of Pompeii and Herculaneum. Pure data; `kitOf` in people.ts paints them.
 *
 * - Secundus: a freedman, clerk to Tullia's father the banker. He keeps the money table in the colonnade
 *   by the Macellum: wax tablets, a balance, a strongbox. A white tunic with no stripe (he is not of the
 *   council's class), a satchel for the tablets, one in his hand.
 * - Iucunda: sells fruit in the Macellum. A headscarf against the sun, a long tunic, an apron stained
 *   with figs.
 * - Onesimus: a sign painter (scriptor), out with his ladder and pot of red ochre painting election notices.
 *   One-shouldered work tunic, an apron spattered red.
 */
import type { Person } from './people';

const SKIN = { med: 0xc68a60, olive: 0xb57d55, deep: 0x9a6442, fair: 0xe3b28c, warm: 0xd49a70 };

export const FORUM_CAST: Record<string, Person> = {
  Secundus: {
    build: 'adult', skin: SKIN.olive, hair: 'crop', hairColor: 0x2a1e16, eyes: 0x3a2a1c,
    tunic: 0xece4d2, cut: 'short', belt: 0x4a3020, shoes: 0x3a2a1c, holds: 'tablets', satchel: true,
  },
  Iucunda: {
    build: 'stout', skin: SKIN.warm, hair: 'scarf', hairColor: 0x3a2418, eyes: 0x4a3420,
    tunic: 0x6a7a4a, cut: 'long', apron: 0xd8c8b0, belt: 0x8a6a3a, shoes: 0x5a3a22, palla: 0xb8643a,
  },
  Onesimus: {
    build: 'adult', skin: SKIN.deep, hair: 'curls', hairColor: 0x1a1210, beard: 0x1a1210, eyes: 0x2a1a10,
    tunic: 0x9a8a6a, cut: 'exomis', belt: 0x5a3a20, apron: 0xc87a5a, shoes: 0x4a3020, holds: 'stylus',
  },
};
