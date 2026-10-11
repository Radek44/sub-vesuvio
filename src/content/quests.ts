/**
 * Side quests: small favours for the people of the town, each with a little Latin at its heart (a count,
 * a word for a thing) and a reward in asses or something useful. Data: the journal reads `QUESTS`; the
 * conversations in `QUEST_SCRIPT` start them, check them and finish them with effects; `advance` moves a
 * stage on by itself when the hero has what's needed.
 *
 * Every Latin word is linted (test/content.test.ts) like all content.
 */
import type { Script } from 'ymir/dialogue';
import { choose, la, type Cond, type Effect } from './types';

export interface Quest {
  title: { la: string; en: string; fr: string };
  /** Who asked (a name or a townsperson's Latin tag), and where. */
  giver: string;
  district: 'portaMarina' | 'forum' | 'abbondanza';
  /** Stages in order; the last is `done`. */
  order: string[];
  /** What the journal says at each stage. */
  stages: Record<string, { en: string; fr: string }>;
  advance?: { from: string; to: string; when: Cond }[];
  reward: { en: string; fr: string };
}

export const QUESTS: Record<string, Quest> = {
  tali: {
    title: { la: 'Tālī', en: 'Lucius’s knucklebones', fr: 'Les osselets de Lucius' },
    giver: 'Lucius', district: 'portaMarina', order: ['search', 'back', 'done'],
    stages: {
      search: { en: 'Lucius lost his four knucklebones playing on Via Marina. Find all four.', fr: 'Lucius a perdu ses quatre osselets en jouant sur la Via Marina. Retrouve-les tous les quatre.' },
      back: { en: 'You have all four. Take them back to Lucius by the fountain.', fr: 'Tu les as tous les quatre. Rapporte-les à Lucius, près de la fontaine.' },
      done: { en: 'Lucius has his knucklebones back, and you know how to count to four.', fr: 'Lucius a retrouvé ses osselets, et tu sais compter jusqu’à quatre.' },
    },
    advance: [{ from: 'search', to: 'back', when: { has: 'talus', n: 4 } }],
    reward: { en: '4 asses', fr: '4 as' },
  },
  panis: {
    title: { la: 'Pānēs', en: 'Bread for Vibia', fr: 'Du pain pour Vibia' },
    giver: 'Vibia', district: 'portaMarina', order: ['buy', 'back', 'done'],
    stages: {
      buy: { en: 'Vibia needs three loaves of bread. Buy them from Modestus the baker, up the street.', fr: 'Vibia a besoin de trois pains. Achète-les à Modestus le boulanger, plus haut dans la rue.' },
      back: { en: 'You have three loaves. Bring them to Vibia’s counter.', fr: 'Tu as trois pains. Apporte-les au comptoir de Vibia.' },
      done: { en: 'Vibia’s customers have their bread.', fr: 'Les clients de Vibia ont leur pain.' },
    },
    advance: [{ from: 'buy', to: 'back', when: { has: 'bread', n: 3 } }],
    reward: { en: '3 asses and a bowl of lentils', fr: '3 as et un bol de lentilles' },
  },
  senex: {
    title: { la: 'Senex', en: 'The old man’s lunch', fr: 'Le déjeuner du vieil homme' },
    giver: 'senex', district: 'portaMarina', order: ['food', 'done'],
    stages: {
      food: { en: 'The old man on the tomb bench outside the gate is hungry. Bring him something to eat: bread, cheese, grapes or an apple.', fr: 'Le vieil homme sur le banc du tombeau, hors de la porte, a faim. Apporte-lui à manger : du pain, du fromage, du raisin ou une pomme.' },
      done: { en: 'The old man ate, and gave you his old sun hat.', fr: 'Le vieil homme a mangé, et t’a donné son vieux chapeau de soleil.' },
    },
    reward: { en: 'a sun hat (petasus)', fr: 'un chapeau de soleil (petasus)' },
  },
};

const lucius = (text: string, extra: object = {}) => ({ who: 'Lucius', text, ...extra });

export const QUEST_SCRIPT: Script<Cond, Effect> = {
  // ── Lucius's knucklebones ──
  'q-tali': {
    id: 'q-tali', lines: [],
    then: {
      cases: [
        { when: { quest: 'tali', stage: 'done' }, goto: 'q-tali-after' },
        { when: { has: 'talus', n: 4 }, goto: 'q-tali-back' },
        { when: { quest: 'tali', stage: 'search' }, goto: 'q-tali-wait' },
      ],
      else: 'q-tali-start',
    },
  },
  'q-tali-start': {
    id: 'q-tali-start',
    lines: [
      lucius('«Salvē!» Are you really from Gaul? Never mind. Have you seen my knucklebones?'),
      lucius('My «tālī». Four of them, sheep’s bones, the best in Pompeii. I threw them and they bounced everywhere.', { notes: { gloss: { tālī: { en: 'knucklebones', fr: 'osselets' } } } }),
      lucius('One went toward the gate, I think. One by the baker’s. The others… somewhere. Will you look?', { do: [{ quest: 'tali', stage: 'search' }] }),
    ],
  },
  'q-tali-wait': {
    id: 'q-tali-wait',
    lines: [lucius('Still looking? There were four. «Quattuor»! Count them on your fingers if you have to.', { notes: { gloss: { quattuor: { en: 'four', fr: 'quatre' } } } })],
  },
  'q-tali-back': {
    id: 'q-tali-back',
    lines: [lucius('You found them! Let me see… how many have you got?')],
    then: {
      prompt: {
        id: 'quot-tali', who: 'Lucius', prompt: 'Tell Lucius how many you found.',
        data: choose([
          { text: '«Quattuor tālī.»', right: true },
          { text: '«Trēs tālī.»', feedback: { en: '«Trēs» is three. Count again: «ūnus, duo, trēs, quattuor».', fr: '«Trēs», c’est trois. Recompte : «ūnus, duo, trēs, quattuor».' } },
          { text: '«Duo tālī.»', feedback: { en: '«Duo» is two. You have twice that many!', fr: '«Duo», c’est deux. Tu en as deux fois plus !' } },
        ]),
        results: { right: 'q-tali-thanks', else: 'q-tali-again' },
        do: { right: [{ take: 'talus', n: 4 }, { coins: 4 }, { quest: 'tali', stage: 'done' }] },
      },
    },
  },
  'q-tali-again': {
    id: 'q-tali-again',
    lines: [lucius('Hmm? Count them again. Out loud. In Latin, like a Roman.')],
    then: { goto: 'q-tali-back' },
  },
  'q-tali-thanks': {
    id: 'q-tali-thanks',
    lines: [lucius('«Quattuor»! All of them! «Grātiās!» Here: four asses, one for each.', { notes: { gloss: { grātiās: { en: 'thank you', fr: 'merci' } } } })],
  },
  'q-tali-after': {
    id: 'q-tali-after',
    lines: [lucius('Want to play? You throw, and the way they land is your score. The best throw is called Venus!')],
  },

  // ── Bread for Vibia ──
  'q-panis': {
    id: 'q-panis', lines: [],
    then: {
      cases: [
        { when: { quest: 'panis', stage: 'done' }, goto: 'vibia' },
        { when: { has: 'bread', n: 3 }, goto: 'q-panis-back' },
        { when: { quest: 'panis', stage: 'buy' }, goto: 'q-panis-wait' },
      ],
      else: 'q-panis-start',
    },
  },
  'q-panis-start': {
    id: 'q-panis-start',
    lines: [
      { who: 'Vibia', text: '«Salvē!» Hot lentils, olives, cheese… and no bread. Modestus forgot me this morning, of all mornings.' },
      { who: 'Vibia', text: 'The house of the dog? Up the street, the yellow one. Mind Ferox: he only listens to Latin.', when: { not: 'feroxFollows' }, do: [{ set: 'heardFerox' }] },
      { who: 'Vibia', text: 'Would you run up to his bakery for me? Three loaves. Here are three asses: one each.', do: [{ coins: 3 }, { quest: 'panis', stage: 'buy' }] },
      { who: 'Vibia', text: 'He stamps his name on every loaf, so I’ll know they’re his. «Trēs pānēs»: three loaves!', notes: { gloss: { trēs: { en: 'three', fr: 'trois' }, pānēs: { en: 'loaves', fr: 'pains' } } } },
    ],
  },
  'q-panis-wait': {
    id: 'q-panis-wait',
    lines: [{ who: 'Vibia', text: 'Three loaves from Modestus, the baker with the mills. My customers are getting hungry. So am I.' }],
  },
  'q-panis-back': {
    id: 'q-panis-back',
    lines: [{ who: 'Vibia', text: 'Bread! Bless you. How many did you bring?' }],
    then: {
      prompt: {
        id: 'quot-panes', who: 'Vibia', prompt: 'Tell Vibia how many loaves.',
        data: choose([
          { text: '«Trēs pānēs.»', right: true },
          { text: '«Trēs pānis.»', feedback: { en: 'Nearly! More than one loaf takes the plural: «pānēs».', fr: 'Presque ! Plus d’un pain, c’est le pluriel : «pānēs».' } },
          { text: '«Ūnus pānis.»', feedback: { en: '«Ūnus» is one. Look in your satchel again!', fr: '«Ūnus», c’est un. Regarde encore dans ta besace !' } },
        ]),
        results: { right: 'q-panis-thanks', else: 'q-panis-again' },
        do: { right: [{ take: 'bread', n: 3 }, { coins: 3 }, { quest: 'panis', stage: 'done' }] },
      },
    },
  },
  'q-panis-again': {
    id: 'q-panis-again',
    lines: [{ who: 'Vibia', text: 'Say it properly, love, the Roman way. How many?' }],
    then: { goto: 'q-panis-back' },
  },
  'q-panis-thanks': {
    id: 'q-panis-thanks',
    lines: [
      { who: 'Vibia', text: '«Trēs pānēs!» Perfect. Here: three asses for your legs, and a bowl of lentils for your stomach.' },
      { who: 'you', text: 'The lentils are hot, salty and very good. Your stomach agrees.' },
    ],
  },

  // ── The old man's lunch ──
  'q-senex': {
    id: 'q-senex', lines: [],
    then: {
      cases: [
        { when: { quest: 'senex', stage: 'done' }, goto: 'q-senex-after' },
        { when: { has: 'bread' }, goto: 'q-senex-bread' },
        { when: { has: 'cheese' }, goto: 'q-senex-cheese' },
        { when: { has: 'grapes' }, goto: 'q-senex-grapes' },
        { when: { has: 'apple' }, goto: 'q-senex-apple' },
        { when: { quest: 'senex', stage: 'food' }, goto: 'q-senex-wait' },
      ],
      else: 'q-senex-start',
    },
  },
  'q-senex-start': {
    id: 'q-senex-start',
    lines: [
      { who: 'senex:0', text: '«Salvē», young traveller. Sit. This bench is for travellers: the dead man who built it said so.' },
      { who: 'senex:0', text: 'I came out to watch the ships and forgot my lunch. My knees won’t take me back up that hill twice.', do: [{ quest: 'senex', stage: 'food' }] },
    ],
  },
  'q-senex-wait': { id: 'q-senex-wait', lines: [{ who: 'senex:0', text: 'Anything will do. Bread, cheese, a few grapes. I’m not fussy. I’m old.' }] },
  'q-senex-bread': { id: 'q-senex-bread', lines: [{ who: 'senex:0', text: 'Bread! «Pānis»!', notes: { gloss: { pānis: { en: 'bread', fr: 'pain' } } }, do: [{ take: 'bread' }] }], then: { goto: 'q-senex-thanks' } },
  'q-senex-cheese': { id: 'q-senex-cheese', lines: [{ who: 'senex:0', text: 'Cheese! «Caseus»!', notes: { gloss: { caseus: { en: 'cheese', fr: 'fromage' } } }, do: [{ take: 'cheese' }] }], then: { goto: 'q-senex-thanks' } },
  'q-senex-grapes': { id: 'q-senex-grapes', lines: [{ who: 'senex:0', text: 'Grapes! «Ūva»!', notes: { gloss: { ūva: { en: 'grape', fr: 'raisin' } } }, do: [{ take: 'grapes' }] }], then: { goto: 'q-senex-thanks' } },
  'q-senex-apple': { id: 'q-senex-apple', lines: [{ who: 'senex:0', text: 'An apple! «Mālum»!', notes: { gloss: { mālum: { en: 'apple', fr: 'pomme' } } }, do: [{ take: 'apple' }] }], then: { goto: 'q-senex-thanks' } },
  'q-senex-thanks': {
    id: 'q-senex-thanks',
    lines: [
      { who: 'senex:0', text: '«Grātiās»! You have a good heart. Here: my old sun hat. My head is too bald to care any more.', do: [{ give: 'hat' }, { quest: 'senex', stage: 'done' }] },
      { who: 'senex:0', text: 'A «petasus». Travellers wear them. Wear it with pride.', notes: { gloss: { petasus: { en: 'sun hat', fr: 'chapeau de soleil' } } } },
    ],
  },
  'q-senex-after': { id: 'q-senex-after', lines: [{ who: 'senex:0', text: 'The hat suits you. Better than it suited me, and I was handsome once.' }] },
};

/** These conversations replace a person's usual one (their favour wraps their small talk). */
export const QUESTS_TALK: Record<string, string> = {
  kids: 'q-tali', thermopolium: 'q-panis', 'old-man': 'q-senex',
};

export { la };
