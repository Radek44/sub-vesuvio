/**
 * What townspeople say when you talk to them: a greeting in Latin, then a line of town life (a fact about
 * Pompeii worth knowing, never a lecture). One short conversation per kind of person (the Latin word on
 * their name tag); `chatFor` picks theirs. Linted like all content.
 */
import type { Script } from 'ymir/dialogue';
import { TAGS, type TagKind } from '../art/people';
import type { Cond, Effect } from './types';

const LINES: Record<TagKind, [string, string]> = {
  puella: ['«Salvē!» My mother says not to talk to strangers. But you have a dog, so you’re not a stranger.', 'Did you know there are about forty fountains in Pompeii? I’ve drunk from thirty-one.'],
  puer: ['«Salvē!» Want to play knucklebones? You throw them, and how they land is your score.', 'The best ones are made from real sheep’s ankles. Mine are, anyway.'],
  femina: ['«Salvē.» The market is busy today. Everyone wants figs before the rains.', 'If you want good bread, the bakers stamp their names on it. Look for the stamp.'],
  vir: ['«Salvē.» Have you seen the election notices? Painted on every wall, red letters.', 'Every year, two new aediles. Every year, the same promises: water, bread, games.'],
  senex: ['«Salvē», young one. Sit, rest. I walked these streets before your father was born.', 'Seventeen years ago the ground shook so hard the temples fell. We built them again. We always do.'],
  avia: ['«Salvē», child. You look hungry. Everyone looks hungry to me.', 'My grandson says the mountain smokes in the mornings now. Mountains don’t smoke, I tell him.'],
  nauta: ['«Salvē!» Just in from Puteoli with a hold full of grain and a captain full of complaints.', 'The sea’s been strange this month. Fish where there were none. Gulls inland.'],
  mercator: ['«Salvē!» Wool from the north, glass from Alexandria, garum from right here. Pompeii’s fish sauce is the best in the world.', 'A good merchant counts in his head. «Ūnus, duo, trēs»… you learn fast when the money is yours.'],
  agricola: ['«Salvē.» Grapes for the presses. The vintage is in, and the slopes of the mountain gave us more than ever.', 'The soil up there is black and rich. My grandfather said it was fire, once. Old stories.'],
  faber: ['«Salvē.» Mind the dust. Every wall in this town is being fixed by someone.', 'Lime, sand, water, and patience. That’s plaster. Then the painters make it red.'],
  pistor: ['«Salvē!» Bread, fresh before dawn. Eight pieces to a loaf: easy to share, easy to sell.', 'Donkeys turn the mills. I turn the donkeys. Nobody turns me, so I’m in charge.'],
  caupo: ['«Salvē!» Sit, eat. Lentils, bread, olives. Something hot for something bronze.', 'Write on my walls and I’ll charge you for the paint.'],
  sutor: ['«Salvē.» Your sandals are walking you to ruin. Soles thin as a leaf.', 'Good soles, a good strap, and you’ll walk to Rome and back.'],
  fullo: ['«Salvē.» Don’t breathe in too deep. Washing cloth isn’t a sweet-smelling trade.', 'We tread the cloth in vats, rinse, brush, and press it. White as new. Mostly.'],
};

/** The conversation for a kind of townsperson. */
export const chatFor = (kind: TagKind): string => `chat:${kind}`;

export const TOWNSFOLK: Script<Cond, Effect> = Object.fromEntries(
  (Object.keys(TAGS) as TagKind[]).map((k) => {
    const id = chatFor(k);
    return [id, { id, lines: LINES[k].map((text) => ({ who: `${k}:0`, text })) }];
  }),
);
