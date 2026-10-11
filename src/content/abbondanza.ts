/**
 * Via dell'Abbondanza: the shopping street. Shopkeepers calling their wares, Stephanus the fuller and his
 * one joke, Vetutius Placidus at his counter, Fortunata the lamp-seller who has lost her cat; and the walls
 * themselves, which talk more than anyone: election notices, a games poster, the shrine of the crossroads.
 *
 * Plain data on ymir/dialogue `Script` v2, like the Prologue. Latin inside English is in «guillemets»; a
 * line in Latin throughout has `notes.la`; `notes.gloss` gives tap meanings. Every Latin word is linted by
 * lingua (`test/content.test.ts`). Real Pompeian texts cite their published source in `notes.source`.
 *
 * Grammar here, beginner level: greetings, «est» and «sum», the accusative of what you buy, see or look
 * for («pānem», «fēlem», «soleās»), plural commands to a crowd («emite», «venīte»), and numbers in asses.
 */
import type { Script } from 'ymir/dialogue';
import { choose, la, type Cond, type Effect } from './types';

export const ABBONDANZA: Script<Cond, Effect> = {
  // ── Stephanus, the fuller ──
  'abb-stephanus': {
    id: 'abb-stephanus',
    lines: [
      { who: 'Stephanus', text: '«Salvē!» Mind the floor, it’s wet. It’s always wet. I’m Stephanus, and this is my fullery.' },
      { who: 'Stephanus', text: 'People bring me their tunics and togas filthy, and I give them back white. Well. Whiter.', when: { not: 'abbMetStephanus' } },
      { who: 'you', text: 'At the back, a man stands in a tub up to his knees, stamping. And stamping. And going nowhere.', when: { not: 'abbMetStephanus' } },
      {
        who: 'Stephanus', text: '«Ambulō, ambulō, sed nōn eō!» That’s the fullers’ joke. We have one joke. We tell it a lot.',
        notes: { gloss: { ambulō: { en: 'I walk', fr: 'je marche' }, sed: { en: 'but', fr: 'mais' }, nōn: { en: 'not', fr: 'ne… pas' }, eō: { en: 'I go', fr: 'je vais' } } },
        when: { not: 'abbMetStephanus' },
      },
      { who: 'Stephanus', text: 'The jars by my door? Don’t ask. All right: people fill them for me, on their way past. Yes, with that. Nothing gets wool cleaner.', when: { not: 'abbMetStephanus' } },
      { who: 'Stephanus', text: 'When the cloth is dry it goes into the press. Turn the screw, and out it comes as flat as a wax tablet.', do: [{ set: 'abbMetStephanus' }] },
      { who: 'Stephanus', text: 'What worries me is the water. A fuller lives on water, and this month it comes slow and cloudy. My vats take all morning to fill.' },
      {
        who: 'Stephanus', text: 'A hat for the sun? Wool, fulled here until it’s as thick as felt. «Ecce petasus!» Five asses.',
        notes: { gloss: { ecce: { en: 'look! here is…', fr: 'voici !' }, petasus: { en: 'sun hat', fr: 'chapeau de soleil' } } },
      },
    ],
  },
  'abb-fuller': {
    id: 'abb-fuller',
    lines: [
      { who: 'fullo:1', text: '«Salvē.» Can’t stop. If I stop, the cloth stops. Stamp, stamp, stamp.' },
      { who: 'fullo:1', text: 'Water, fuller’s earth, and feet. All day. My feet are the cleanest in Pompeii.' },
    ],
  },

  // ── Vetutius Placidus, at his counter ──
  'abb-placidus': {
    id: 'abb-placidus',
    lines: [
      {
        who: 'Placidus', text: '«Salvē, amīce! Intrā!» Sit, eat! Hot lentils, wine with honey, bread, cheese.',
        notes: { gloss: { amīce: { en: 'friend!', fr: 'ami !' }, intrā: { en: 'come in!', fr: 'entre !' } } },
      },
      { who: 'Placidus', text: 'Vetutius Placidus, at your service. The jars in my counter keep the food hot, or cold, or hidden. Depends on the jar.' },
      { who: 'you', text: 'Behind him, a shrine painted on the wall: two gods, a pair of fat snakes, and the household spirits dancing between them.', when: { not: 'abbMetPlacidus' } },
      { who: 'Placidus', text: 'Mercury, for profit, and Bacchus, for wine. Between the two of them, business is good.', when: { not: 'abbMetPlacidus' } },
      { who: 'Placidus', text: 'Where do I keep the takings? Somewhere nobody looks. A man who sells wine never keeps his money in a purse.', do: [{ set: 'abbMetPlacidus' }] },
      {
        who: 'Placidus', text: 'My trouble is wine. Three days I’ve waited for a cart from the farms on the mountain, and the street’s dug up at the end. «Ubi est vīnum?»',
        notes: { gloss: { ubi: { en: 'where?', fr: 'où ?' }, est: { en: 'is', fr: 'est' }, vīnum: { en: 'wine', fr: 'vin' } } },
      },
    ],
  },
  'abb-granny': {
    id: 'abb-granny',
    lines: [
      { who: 'avia:3', text: '«Salvē», child. I come here every day. Placidus’s lentils are the only thing my teeth still agree with.' },
      { who: 'avia:3', text: 'His father had this counter, and his grandfather. Before the earthquake, the street was even busier. Imagine.' },
    ],
  },

  // ── Fortunata, lamps and pots ──
  'abb-fortunata': {
    id: 'abb-fortunata',
    lines: [
      {
        who: 'Fortunata', text: '«Lucernās vēndō!» Lamps! Clay ones for every day, bronze ones for showing off. And oil to fill them.',
        notes: { gloss: { lucernās: { en: 'lamps (object)', fr: 'des lampes (complément)' }, vēndō: { en: 'I sell', fr: 'je vends' } } },
      },
      { who: 'Fortunata', text: 'You’ve found her, then? No? «Fēlēs» is still out there somewhere.', when: { flag: 'abbAskedCat' }, goto: 'abb-end' },
      {
        who: 'Fortunata', text: 'Oh, forgive me. I’m not myself today. «Fēlem meam quaerō.»',
        notes: { gloss: { fēlem: { en: 'cat (object)', fr: 'chat (complément)' }, meam: { en: 'my', fr: 'ma' }, quaerō: { en: 'I’m looking for', fr: 'je cherche' } } },
      },
      { who: 'Fortunata', text: 'She keeps the mice out of my oil jars. Small and grey, with one white foot. Gone since the ground shook, on market day.' },
      { who: 'Fortunata', text: 'Fēlem vidēs?', notes: { ...la, gloss: { fēlem: { en: 'cat (object)', fr: 'chat (complément)' }, vidēs: { en: 'do you see', fr: 'vois-tu' } } } },
    ],
    then: { goto: 'abb-fortunata-ask' },
  },
  'abb-fortunata-ask': {
    id: 'abb-fortunata-ask',
    lines: [],
    then: {
      prompt: {
        id: 'abb-felem-vides', who: 'Fortunata', prompt: 'Tell her you don’t see her cat.',
        data: choose([
          { text: '«Fēlem nōn videō.»', right: true },
          { text: '«Fēlēs nōn videō.»', feedback: { en: 'Nearly! The cat is what you (don’t) see, so it takes the accusative: «fēlem». «Fēlēs» here would be lots of cats.', fr: 'Presque ! Le chat est ce que tu (ne) vois (pas), donc il faut l’accusatif : «fēlem». Ici, «fēlēs», ce serait plein de chats.' } },
          { text: '«Fēlem nōn vidēs.»', feedback: { en: '«Vidēs» is “you see”: that tells her she doesn’t see the cat. She knows! Answer about yourself: «videō», I see.', fr: '«Vidēs», c’est “tu vois” : tu lui dis qu’elle ne voit pas le chat. Elle le sait ! Réponds pour toi : «videō», je vois.' } },
        ]),
        results: { right: 'abb-fortunata-thanks', else: 'abb-fortunata-again' },
        do: { right: [{ set: 'abbAskedCat' }] },
      },
    },
  },
  'abb-fortunata-again': {
    id: 'abb-fortunata-again',
    lines: [{ who: 'Fortunata', text: 'Fēlem vidēs?', notes: la }],
    then: { goto: 'abb-fortunata-ask' },
  },
  'abb-fortunata-thanks': {
    id: 'abb-fortunata-thanks',
    lines: [
      { who: 'Fortunata', text: 'No. Nobody has. If you see a grey cat with one white foot, you’ll tell me? I’ll find you a lamp for your trouble.' },
      { who: 'you', text: 'A grey cat, one white foot. You make a note of it. Ferox may have his own opinions about cats.' },
    ],
  },

  // ── Shopkeepers calling their wares ──
  'abb-sutor': {
    id: 'abb-sutor',
    lines: [
      {
        who: 'sutor:1', text: '«Soleās vēndō!» Sandals! Cut to your foot while you wait.',
        notes: { gloss: { soleās: { en: 'sandals (object)', fr: 'des sandales (complément)' }, vēndō: { en: 'I sell', fr: 'je vends' } } },
      },
      { who: 'sutor:1', text: 'Look at yours. Gaulish boots, in October, in Pompeii? Your feet must be cooking.' },
      {
        who: 'sutor:1', text: 'Eight asses a pair: «octō assēs». Good leather, from the tanners down the street.',
        notes: { gloss: { octō: { en: 'eight', fr: 'huit' }, assēs: { en: 'asses (bronze coins)', fr: 'as (pièces de bronze)' } } },
      },
    ],
  },
  'abb-pistor': {
    id: 'abb-pistor',
    lines: [
      {
        who: 'pistor:2', text: '«Pānem emite!» Bread, still warm! Round loaves, scored in eight before baking, so they break clean.',
        notes: { gloss: { pānem: { en: 'bread (object)', fr: 'du pain (complément)' }, emite: { en: 'buy! (to several people)', fr: 'achetez !' } } },
      },
      { who: 'pistor:2', text: 'Out the back, the donkey turns the mill all night. His name is Celer: “Quick”. It’s a joke.' },
    ],
  },
  'abb-faber': {
    id: 'abb-faber',
    lines: [
      { who: 'faber:3', text: '«Salvē!» Bronze! Pots, lamps, buckles, and the best styli in Pompeii.' },
      { who: 'faber:3', text: 'A stylus has a point to write in the wax and a flat end to rub it out. Make a mistake, turn it round. Easy.' },
      {
        who: 'faber:3', text: 'My brother-in-law makes the tablets; I make what you write with. «Stilum et tabulam»: five asses, the two together.',
        notes: { gloss: { stilum: { en: 'a stylus (object)', fr: 'un stylet (complément)' }, et: { en: 'and', fr: 'et' }, tabulam: { en: 'a tablet (object)', fr: 'une tablette (complément)' } } },
      },
    ],
  },
  'abb-painter': {
    id: 'abb-painter',
    lines: [
      { who: 'faber:5', text: 'Careful, the paint’s wet. Red ochre and a steady hand, that’s the trade.' },
      { who: 'faber:5', text: 'Election time. Every candidate wants his name on every wall, so we paint all night, by lamplight, or by the moon when the oil runs out.' },
      {
        who: 'faber:5', text: 'Tonight’s is for a man who promises water for everyone. They all promise water. «Aqua!» Everybody wants «aqua».',
        notes: { gloss: { aqua: { en: 'water', fr: 'eau' } } },
      },
    ],
  },
  'abb-workman': {
    id: 'abb-workman',
    lines: [
      { who: 'faber:6', text: 'Can’t pass, friend. New pipes going in, by the aedile’s orders. Go round by the Forum.' },
      { who: 'faber:6', text: 'Lead pipes, from the water tower to the houses. The old ones cracked when the ground shook.' },
      { who: 'faber:6', text: 'Funny thing, though. We opened the old pipe and it was half dry. The water’s going somewhere. Just not here.' },
    ],
  },

  // ── The walls talk ──
  'abb-programma': {
    id: 'abb-programma',
    lines: [
      { who: 'you', text: 'Red letters on a whitewashed patch, taller than you: a man’s name, Gnaeus Helvius Sabinus, and three letters, A E D.' },
      {
        who: 'you', text: 'Short for «aedīlem». He wants to be aedile: the man in charge of the streets, the markets and the water.',
        notes: { gloss: { aedīlem: { en: 'aedile (object)', fr: 'édile (complément)' } }, source: 'Programmata of Cn. Helvius Sabinus, candidate for aedile in AD 79, among the commonest at Pompeii (CIL IV).' },
      },
      {
        who: 'you', text: 'The notices call their man «virum bonum»: a good man. Every one of them, apparently, is a good man.',
        notes: { gloss: { virum: { en: 'man (object)', fr: 'homme (complément)' }, bonum: { en: 'good', fr: 'bon' } }, source: 'The formula v(irum) b(onum), common in Pompeian programmata (CIL IV).' },
      },
    ],
  },
  'abb-vatia': {
    id: 'abb-vatia',
    lines: [
      { who: 'you', text: 'Another notice: Marcus Cerrinius Vatia, who also wants to be aedile.' },
      {
        who: 'you', text: 'The last line of these says who asks you to vote for him: «rogant», they ask. And who are they, for Vatia? “The late drinkers, all of them.”',
        notes: { gloss: { rogant: { en: 'they ask', fr: 'ils demandent' } }, source: 'CIL IV 581: M. Cerrinium Vatiam aed(ilem) o(ro) v(os) f(aciatis), seribibi universi rogant.' },
      },
      {
        who: 'you', text: 'Another wall says the petty thieves back him too. Either Vatia has strange friends, or somebody paid a painter to make fun of him.',
        notes: { source: 'CIL IV 576: Vatiam aed(ilem) furunculi rog(ant).' },
      },
    ],
  },
  'abb-games': {
    id: 'abb-games',
    lines: [
      {
        who: 'you', text: 'A long painted poster: twenty pairs of gladiators, a wild-beast hunt, and awnings against the sun. Games «Pompeiīs»: here, at Pompeii.',
        notes: { gloss: { pompeiīs: { en: 'at Pompeii', fr: 'à Pompéi' } }, source: 'CIL IV 3884 (on the House of Trebius Valens, III 2, 1): the games of D. Lucretius Satrius Valens, gladiatorum paria XX… venatio legitima et vela erunt.' },
      },
      {
        who: 'you', text: 'And at the bottom, in small letters, the painter signed his work: Aemilius Celer wrote this, on his own, by the light of the moon.',
        notes: { source: 'CIL IV 3884: scr(ipsit) Aemilius Celer sing(ulus) ad luna(m).' },
      },
    ],
  },
  'abb-fountain': {
    id: 'abb-fountain',
    lines: [
      { who: 'you', text: 'A public fountain, the spout set in a carved relief: a woman holding a horn of plenty, spilling fruit.' },
      {
        who: 'you', text: 'Cold, clean «aqua», day and night. The rim of the basin is worn smooth where a thousand hands have leaned to drink.',
        notes: { gloss: { aqua: { en: 'water', fr: 'eau' } } },
      },
      { who: 'you', text: 'Long after you, people will name the whole street after her: Via dell’Abbondanza, the street of Abundance.' },
    ],
  },
  'abb-shrine': {
    id: 'abb-shrine',
    lines: [
      { who: 'you', text: 'A shrine painted on the wall: two snakes winding toward an altar, and the gods of the crossroads dancing, cups in hand.' },
      { who: 'you', text: 'The little altar below still has warm ash on it. Someone left a cake and a pinch of incense this morning.' },
      { who: 'you', text: 'Every neighbourhood keeps its own gods of the street corner. They look after whoever walks past. That includes you, now.' },
    ],
  },
  'abb-arch': {
    id: 'abb-arch',
    lines: [
      { who: 'you', text: 'Where Via Stabiana crosses the street, an arch with four faces stands over the crossroads, faced in marble.' },
      {
        who: 'you', text: 'Beside it, a statue in a general’s armour: Marcus Holconius Rufus. The base lists everything: five times the town’s chief magistrate, priest of Augustus, “patron of the colony”.',
        notes: { source: 'CIL X 830, the base of the statue of M. Holconius Rufus found by the arch (the statue is in the Naples Archaeological Museum).' },
      },
      { who: 'you', text: 'His family paid for half the Large Theatre. In Pompeii, rich men get statues by buying the town things.' },
    ],
  },
  'abb-baths': {
    id: 'abb-baths',
    lines: [
      { who: 'you', text: 'The Stabian Baths, the oldest in town. Through the door: a sandy courtyard where men wrestle and throw balls, and a cold pool along one side.' },
      { who: 'you', text: 'At the back, slaves feed the furnace. The floors of the hot rooms stand on little brick pillars, with hot air running underneath.' },
      { who: 'you', text: 'It costs a quadrans to go in: a quarter of an as. Another day.' },
    ],
  },
  'abb-roadworks': {
    id: 'abb-roadworks',
    lines: [
      { who: 'you', text: 'The street ends in a trench. The paving stones are stacked to one side, and new lead pipes wait to go in.' },
      { who: 'you', text: 'Beyond it, the street runs on east, toward the amphitheatre. Not today.' },
    ],
  },

  'abb-end': { id: 'abb-end', lines: [] },
};

/** Spot or npc id → conversation id, for this district. */
export const ABBONDANZA_TALK: Record<string, string> = {
  'abb-stephanus': 'abb-stephanus', 'abb-fuller': 'abb-fuller', 'abb-placidus': 'abb-placidus', 'abb-granny': 'abb-granny',
  'abb-fortunata': 'abb-fortunata', 'abb-sutor': 'abb-sutor', 'abb-pistor': 'abb-pistor', 'abb-faber': 'abb-faber',
  'abb-painter': 'abb-painter', 'abb-workman': 'abb-workman',
  'abb-programma': 'abb-programma', 'abb-vatia': 'abb-vatia', 'abb-games': 'abb-games', 'abb-fountain': 'abb-fountain',
  'abb-shrine': 'abb-shrine', 'abb-arch': 'abb-arch', 'abb-baths': 'abb-baths', 'abb-roadworks': 'abb-roadworks',
};
