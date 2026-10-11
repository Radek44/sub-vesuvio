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
  'forum-stylus': {
    title: { la: 'Stilus', en: 'A stylus for Secundus', fr: 'Un stylet pour Secundus' },
    giver: 'Secundus', district: 'forum', order: ['asked', 'done'],
    stages: {
      asked: { en: 'Secundus, the banker’s clerk in the Forum’s east colonnade, snapped his stylus. The stationer by the temple steps sells them.', fr: 'Secundus, le commis du banquier sous la colonnade est du Forum, a cassé son stylet. Le papetier près des marches du temple en vend.' },
      done: { en: 'Secundus is writing his sums again, with your stylus.', fr: 'Secundus fait de nouveau ses comptes, avec ton stylet.' },
    },
    reward: { en: '3 asses', fr: '3 as' },
  },
  feles: {
    title: { la: 'Fēlēs', en: 'Fortunata’s cat', fr: 'La chatte de Fortunata' },
    giver: 'Fortunata', district: 'abbondanza', order: ['search', 'back', 'done'],
    stages: {
      search: { en: 'Fortunata the lamp-seller lost her cat when the ground shook: small, grey, one white foot. Cats go where the fish is.', fr: 'Fortunata, la marchande de lampes, a perdu sa chatte quand la terre a tremblé : petite, grise, une patte blanche. Les chats vont là où il y a du poisson.' },
      back: { en: 'The cat is in your satchel, complaining. Take her back to Fortunata on Via dell’Abbondanza.', fr: 'La chatte est dans ta besace, et elle proteste. Ramène-la à Fortunata, sur la Via dell’Abbondanza.' },
      done: { en: 'Fortunata has her cat back, and her oil jars are safe from mice again.', fr: 'Fortunata a retrouvé sa chatte, et ses jarres d’huile sont de nouveau à l’abri des souris.' },
    },
    reward: { en: 'an oil lamp and 2 asses', fr: 'une lampe à huile et 2 as' },
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

// ── Fortunata's cat ── (she asks in her own conversation, abb-fortunata, which starts the quest)
Object.assign(QUEST_SCRIPT, {
  'q-feles': {
    id: 'q-feles', lines: [],
    then: {
      cases: [
        { when: { quest: 'feles', stage: 'done' }, goto: 'q-feles-after' },
        { when: { quest: 'feles', stage: 'back' }, goto: 'q-feles-back' },
      ],
      else: 'abb-fortunata',
    },
  },
  'q-feles-cat': {
    id: 'q-feles-cat', lines: [],
    then: { cases: [{ when: { quest: 'feles', stage: 'search' }, goto: 'q-feles-found' }], else: 'q-feles-idle' },
  },
  'q-feles-idle': {
    id: 'q-feles-idle',
    lines: [{ who: 'you', text: 'A small grey cat with one white foot, washing herself among the amphorae and watching the fish baskets. She ignores you completely.' }],
  },
  'q-feles-found': {
    id: 'q-feles-found',
    lines: [{ who: 'you', text: 'Small, grey, one white foot, watching the fish baskets as if they owed her money. It’s her! Say what you see, the Roman way.' }],
    then: {
      prompt: {
        id: 'quid-vides-feles', who: 'you', prompt: 'What do you see?',
        data: choose([
          { text: '«Fēlem videō.»', right: true },
          { text: '«Fēlēs videō.»', feedback: { en: 'Nearly! She is what you see, so the cat takes the accusative: «fēlem».', fr: 'Presque ! C’est elle que tu vois, donc le chat prend l’accusatif : «fēlem».' } },
          { text: '«Canem videō.»', feedback: { en: '«Canem» is a dog. Ferox would be flattered, the cat would not.', fr: '«Canem», c’est un chien. Ferox serait flatté, la chatte beaucoup moins.' } },
        ]),
        results: { right: 'q-feles-scoop', else: 'q-feles-found' },
        do: { right: [{ quest: 'feles', stage: 'back' }, { set: 'gone:cat' }] },
      },
    },
  },
  'q-feles-scoop': {
    id: 'q-feles-scoop',
    lines: [{ who: 'you', text: '«Fēlem videō!» You scoop her up. She grumbles, turns round twice and settles in your satchel as if she owned it.', notes: { gloss: { fēlem: { en: 'cat (object)', fr: 'chat (complément)' }, videō: { en: 'I see', fr: 'je vois' } } } }],
  },
  'q-feles-back': {
    id: 'q-feles-back',
    lines: [
      { who: 'you', text: 'You open your satchel. A grey head with yellow eyes pops out and looks around, unimpressed.' },
      { who: 'Fortunata', text: 'Oh! And what is that in your bag?' },
    ],
    then: {
      prompt: {
        id: 'quid-est-feles', who: 'Fortunata', prompt: 'Tell her what it is.',
        data: choose([
          { text: '«Fēlēs est.»', right: true },
          { text: '«Fēlem est.»', feedback: { en: 'With «est» (it is), the noun stays in the nominative: «fēlēs est».', fr: 'Avec «est» (c’est), le nom reste au nominatif : «fēlēs est».' } },
          { text: '«Canis est.»', feedback: { en: '«Canis» is a dog. Look again: one white foot, and a very low opinion of you.', fr: '«Canis», c’est un chien. Regarde mieux : une patte blanche, et une très mauvaise opinion de toi.' } },
        ]),
        results: { right: 'q-feles-thanks', else: 'q-feles-again' },
        do: { right: [{ give: 'lamp' }, { coins: 2 }, { quest: 'feles', stage: 'done' }] },
      },
    },
  },
  'q-feles-again': { id: 'q-feles-again', lines: [{ who: 'Fortunata', text: 'Hmm? Say it again, properly. What is it?' }], then: { goto: 'q-feles-back' } },
  'q-feles-thanks': {
    id: 'q-feles-thanks',
    lines: [
      { who: 'Fortunata', text: '«Fēlēs mea!» My cat! Where was she? The harbour? Of course she was. The fish.', notes: { gloss: { mea: { en: 'my', fr: 'ma' } } } },
      { who: 'Fortunata', text: 'Here: my best clay lamp, and two asses. When it’s dark, you’ll think of us. «Grātiās!»' },
    ],
  },
  'q-feles-after': { id: 'q-feles-after', lines: [{ who: 'Fortunata', text: 'She hasn’t left the oil jars since. Not one mouse. Need a lamp? I give a good price to cat-finders.' }] },
} satisfies Script<Cond, Effect>);

/** These conversations replace a person's usual one (their favour wraps their small talk). */
export const QUESTS_TALK: Record<string, string> = {
  kids: 'q-tali', thermopolium: 'q-panis', 'old-man': 'q-senex', 'abb-fortunata': 'q-feles', cat: 'q-feles-cat',
};

export { la };
