/**
 * The Forum's conversations: the people (the banker's clerk, the fruit seller, the sign painter) and the
 * things to look at and read (the Temple of Jupiter, the official measures, the sundial, Eumachia's doorway,
 * the Basilica's graffiti, the Lares, the Temple of Vespasian, the tholos, the Fountain of Abundance).
 *
 * Plain data on ymir/dialogue `Script` v2, like the Prologue: «Latin» in guillemets, `notes.la` for lines in
 * Latin throughout, `notes.gloss` for tap meanings. Ids are global, so every one starts `forum-`. Every real
 * Pompeian text cites its published source in `notes.source` (CIL = Corpus Inscriptionum Latinarum: IV for
 * the painted and scratched texts, X for the inscriptions of Campania).
 *
 * Grammar here (design §7, Chapter 1): est and sum, first-declension nominatives (ūva, mēnsa, hōra, lāna),
 * an accusative read off an election notice, numbers to five, and one question: «Ubi est Tullia?»
 * The story is not moved on here: Secundus only says that Tullia comes to the Forum in the afternoons.
 */
import type { Script } from 'ymir/dialogue';
import { choose, la, type Cond, type Effect } from './types';

const g = (en: string, fr: string) => ({ en, fr });

export const FORUM: Script<Cond, Effect> = {
  // ── Secundus, the banker's clerk, at his money table in the colonnade ──
  'forum-secundus': {
    id: 'forum-secundus',
    lines: [
      { who: 'Secundus', text: 'Back again?', when: { flag: 'forumHeardTullia' }, goto: 'forum-secundus-again' },
      { who: 'you', text: 'A thin man at a folding table under the colonnade: wax tablets, a bronze balance, little towers of coins, a strongbox bound in iron.' },
      { who: 'Secundus', text: '«Salvē!» Changing money? Silver for bronze, bronze for silver. A small fee. A very small fee.' },
      { who: 'you', text: 'Tullia, the banker’s daughter: hers is the one name you could read on Uncle’s tablet. A man with a money table might know where she is.' },
    ],
    then: { goto: 'forum-secundus-ask' },
  },
  'forum-secundus-ask': {
    id: 'forum-secundus-ask',
    lines: [],
    then: {
      prompt: {
        id: 'forum-ubi-tullia', who: 'Secundus', prompt: 'Ask him where Tullia is.',
        data: choose([
          { text: '«Quis est Tullia?»', feedback: { en: 'You know who she is: «quis» asks who. To ask where, it’s «ubi».', fr: 'Tu sais qui elle est : «quis» demande qui. Pour demander où, c’est «ubi».' } },
          { text: '«Ubi est Tullia?»', right: true },
          { text: '«Ubi es, Tullia?»', feedback: { en: '«Es» means “you are”: that calls out to Tullia herself, and she isn’t here. Ask about her: «est».', fr: '«Es» veut dire “tu es” : tu appelles Tullia elle-même, et elle n’est pas là. Parle d’elle : «est».' } },
        ]),
        results: { right: 'forum-secundus-tullia', else: 'forum-secundus-retry' },
      },
    },
  },
  'forum-secundus-retry': {
    id: 'forum-secundus-retry',
    lines: [{ who: 'Secundus', text: 'Quid?', notes: { ...la, gloss: { quid: g('what?', 'quoi ?') } } }],
    then: { goto: 'forum-secundus-ask' },
  },
  'forum-secundus-tullia': {
    id: 'forum-secundus-tullia',
    lines: [
      { who: 'Secundus', text: 'Tullia? The master’s daughter. «Ego scrība sum.» I keep her father’s tablets, and she keeps an eye on me.', notes: { gloss: { scrība: g('clerk', 'scribe, secrétaire') } } },
      { who: 'Secundus', text: 'Tullia nōn hīc est.', notes: { ...la, gloss: { nōn: g('not', 'ne… pas'), hīc: g('here', 'ici') } } },
      { who: 'Secundus', text: 'She comes to the Forum in the afternoons with her father’s ledgers under her arm, and checks every sum I made in the morning. She finds mistakes I haven’t made yet.' },
      { who: 'Secundus', text: 'Come back when the shadow on the sundial in Apollo’s courtyard is long. «Valē!»', do: [{ set: 'forumHeardTullia' }] },
      { who: 'you', text: 'As you turn to go, his eyes fall on the tablet in your satchel, the one in Uncle’s hand. Then, quickly, back to his coins.' },
    ],
  },

  // Side quest `forum-stylus`: Secundus's stylus has snapped; the stationer's stall by the temple sells them.
  'forum-secundus-again': {
    id: 'forum-secundus-again',
    lines: [
      { who: 'Secundus', text: '«Tullia nōn hīc est.» Not yet. In the afternoons. The sums don’t check themselves, more’s the pity.', notes: { gloss: { nōn: g('not', 'ne… pas'), hīc: g('here', 'ici') } } },
    ],
    then: { cases: [{ when: { quest: 'forum-stylus', stage: 'done' }, goto: 'forum-end' }, { when: { has: 'stylus' }, goto: 'forum-stylus-give' }], else: 'forum-stylus-ask' },
  },
  'forum-stylus-ask': {
    id: 'forum-stylus-ask',
    lines: [
      { who: 'Secundus', text: 'And my stylus snapped this morning, halfway through a sum. The stationer by the temple steps sells them. Bring me one and I’ll pay you back, and a little over.', do: [{ quest: 'forum-stylus', stage: 'asked' }] },
    ],
  },
  'forum-stylus-give': {
    id: 'forum-stylus-give',
    lines: [
      { who: 'you', text: 'You hold out a stylus: iron, a sharp point for writing, a flat end for smoothing the wax.' },
      { who: 'Secundus', text: '«Bene!» Two for the stylus and one for your trouble. Don’t tell the master I overpaid.', notes: { gloss: { bene: g('good, well', 'bien') } }, do: [{ take: 'stylus' }, { coins: 3 }, { quest: 'forum-stylus', stage: 'done' }] },
    ],
  },

  // ── Fortunata, the fruit seller in the Macellum ──
  'forum-fortunata': {
    id: 'forum-fortunata',
    lines: [
      { who: 'Fortunata', text: '«Salvē!» Grapes from the slopes of the mountain, apples, the last of the figs, cheese from the hills. Fish? Over by the water. Follow your nose.' },
      { who: 'Fortunata', text: 'One bunch is «ūva». Two are «ūvae». Say it right and I’ll pick you the sweetest.', notes: { gloss: { ūva: g('a bunch of grapes', 'une grappe de raisin'), ūvae: g('bunches of grapes', 'des grappes de raisin') } } },
      { who: 'Fortunata', text: '«Ūna ūva, ūnus as.» One bunch, one coin. The aediles check my scales, so don’t look at me like that.', notes: { gloss: { ūna: g('one', 'une'), as: g('an as, a bronze coin', 'un as, une pièce de bronze') } } },
      { who: 'Fortunata', text: 'The ground shook in the night and the whole heap of figs walked off the table. The children of Pompeii ate well this morning.' },
    ],
  },

  // ── Onesimus, the sign painter, at work on Via Marina ──
  'forum-onesimus': {
    id: 'forum-onesimus',
    lines: [
      { who: 'you', text: 'A man with a pot of red paint and a brush, up and down a ladder, painting tall letters on the wall.' },
      { who: 'Onesimus', text: '«Salvē!» Mind the pot. Red ochre never comes out of wool. Ask the fullers; they’ll charge you to try.' },
      { who: 'Onesimus', text: 'Election notices. Two new aediles every year, and every candidate wants his name on every wall. This one is for Gnaeus Popidius Celer.' },
      { who: 'Onesimus', text: 'Big letters: «Gnaeum Popidium Celerem aedīlem». His name is in the accusative, like a thing you carry: the town is being asked to make him aedile. The little letters after it say “please do”.', notes: { gloss: { aedīlem: g('aedile (the office he wants)', 'édile (la charge qu’il veut)') } } },
      { who: 'Onesimus', text: 'He pays well, Celer. Promises water to every street that votes for him. Funny, with the fountains coughing the way they do.' },
      { who: 'Onesimus', text: 'My favourite notice in town isn’t mine. Someone painted that all the late-night drinkers ask you to vote for Vatia. Another says the petty thieves want him too. His rivals paid for those, I’d bet.', notes: { source: 'CIL IV 581 (M. Cerrinium Vatiam aed. o. v. f. seribibi universi rogant) and CIL IV 576 (Vatiam aed. furunculi rog.)' } },
      { who: 'Onesimus', text: 'And the Popidii have been putting their name on things here for two hundred years. The old grey colonnade at the south end? A Popidius had it built, and had it written on the stone.', notes: { source: 'CIL X 794 (V. Popidius Ep. f. q. porticus faciendas coeravit)' } },
    ],
  },

  // ── Places ──
  'forum-jupiter': {
    id: 'forum-jupiter',
    lines: [
      { who: 'you', text: 'The Temple of Jupiter on its high podium, steps up the front between two bronze riders. Jupiter, Juno and Minerva live here together: the gods of Rome itself.' },
      { who: 'you', text: '«Templum magnum est.» And behind it, filling half the sky, the mountain: «Vesuvius».', notes: { gloss: { templum: g('temple', 'temple'), magnum: g('big, great', 'grand') } } },
      { who: 'you', text: 'Scaffolding still climbs one side. The earthquake seventeen years ago cracked half the town, and the temple is still being mended.' },
    ],
  },
  'forum-mensa': {
    id: 'forum-mensa',
    lines: [
      { who: 'you', text: 'A long stone table in a niche of the wall, its top hollowed into bowls of different sizes: the «mēnsa» of the town’s official measures.', notes: { gloss: { mēnsa: g('table', 'table') } } },
      { who: 'you', text: 'You count the big bowls: «ūnus, duo, trēs, quattuor, quīnque». Pour in your grain or your oil and you’ll know if the seller cheated you. A hole in the bottom of each lets it out again.' },
      { who: 'you', text: 'Carved on it: two magistrates had the measures made equal to Rome’s. Before that, Pompeii measured the old Oscan way.', notes: { source: 'CIL X 793 (A. Clodius A. f. Flaccus, N. Arcaeus N. f. Arellianus Caledus d. v. i. d. mensuras exaequandas ex dec. decr.)' } },
    ],
  },
  'forum-sundial': {
    id: 'forum-sundial',
    lines: [
      { who: 'you', text: 'On a slim Ionic column beside Apollo’s altar, a sundial: a marble bowl with lines cut across it, and a bronze pin whose shadow walks over them.' },
      { who: 'you', text: 'Each space between the lines is an «hōra». The Romans split the daylight into twelve of them, so a summer hour is long and a winter hour is short.', notes: { gloss: { hōra: g('hour', 'heure') } } },
      { who: 'you', text: 'Two magistrates paid for it out of their own pockets, and had their names carved on it so nobody would forget.', notes: { source: 'CIL X 802 (L. Sepunius L. f. Sandilianus, M. Herennius A. f. Epidianus duovir. i. d. d. s. p. f. c.)' } },
      { who: 'you', text: 'Above you «Apollō» draws his bronze bow, and across the courtyard his sister Diana draws hers. Nobody walks between them.' },
    ],
  },
  'forum-eumachia': {
    id: 'forum-eumachia',
    lines: [
      { who: 'you', text: 'A marble doorframe carved with acanthus leaves curling in scrolls, and hiding in the leaves, little birds and insects.' },
      { who: 'you', text: 'Along the front runs a woman’s name: «Eumachia». A public priestess built all this with her own money, in her own name and her son’s.', notes: { source: 'CIL X 810 (Eumachia L. f. sacerd. publ. nomine suo et M. Numistri Frontonis fili chalcidicum cryptam porticus Concordiae Augustae pietati sua pecunia fecit eademque dedicavit)' } },
      { who: 'you', text: 'Inside are bales of «lāna», wool, and a statue of Eumachia that the fullers set up to thank her. In this town, wool is money.', notes: { gloss: { lāna: g('wool', 'laine') }, source: 'CIL X 813 (Eumachiae L. f. sacerd. publ. fullones)' } },
    ],
  },
  'forum-basilica': {
    id: 'forum-basilica',
    lines: [
      { who: 'you', text: 'The Basilica: a great hall where merchants strike deals and judges hear cases. Its plaster is painted to look like blocks of coloured marble.' },
      { who: 'you', text: 'Every wall within reach is scratched with writing: names, sums, jokes, insults, a heart.' },
      { who: 'you', text: 'One little poem catches your eye: “I’m amazed, O wall, that you haven’t fallen down, holding up the boring scribbles of so many writers.”', notes: { source: 'CIL IV 1904 (admiror, o paries, te non cecidisse ruinis, qui tot scriptorum taedia sustineas); the same lines are scratched at the theatre and the amphitheatre' } },
      { who: 'you', text: '«Basilica magna est.» So, by the look of it, is the boredom of the people waiting in it.' },
    ],
  },
  'forum-lares': {
    id: 'forum-lares',
    lines: [
      { who: 'you', text: 'An open hall facing the Forum, faced in coloured marble, with a curved apse at the back and niches waiting for statues.' },
      { who: 'you', text: 'It belongs to the Lares, the gods who look after the whole city the way a family’s Lares look after a house. Some say it was built after the great earthquake, to keep the city safe.' },
    ],
  },
  'forum-vespasian': {
    id: 'forum-vespasian',
    lines: [
      { who: 'you', text: 'A small temple behind a white marble altar. Carved on the altar: a priest with his toga drawn over his head, a bull led to the sacrifice, a flute player.' },
      { who: 'you', text: 'Whose temple? Some say the emperor Vespasian’s, some say the Genius of Augustus. The priests aren’t telling.' },
    ],
  },
  'forum-tholos': {
    id: 'forum-tholos',
    lines: [
      { who: 'you', text: 'In the middle of the market, twelve columns in a ring around a basin of water. The fishmongers clean their fish here, and the drain glitters with scales.' },
      { who: 'you', text: 'A boy holds up a basket and shouts «Piscis!» at you. One fish. You had hoped for more than one.', notes: { gloss: { piscis: g('fish', 'poisson') } } },
    ],
  },
  'forum-fountain': {
    id: 'forum-fountain',
    lines: [
      { who: 'you', text: 'A fountain at the top of the street, its pillar carved with a woman holding a horn of plenty. «Fōns», a fountain. «Aqua», water.', notes: { gloss: { fōns: g('fountain, spring', 'fontaine, source'), aqua: g('water', 'eau') } } },
      { who: 'you', text: 'The water comes, but slowly, in coughs. Uncle Marcus would want to know why.' },
    ],
  },
  'forum-end': { id: 'forum-end', lines: [] },
};

/** Spot or npc id → conversation id, for this district. */
export const FORUM_TALK: Record<string, string> = {
  'forum-secundus': 'forum-secundus', 'forum-fortunata': 'forum-fortunata', 'forum-onesimus': 'forum-onesimus',
  'forum-jupiter': 'forum-jupiter', 'forum-mensa': 'forum-mensa', 'forum-sundial': 'forum-sundial', 'forum-eumachia': 'forum-eumachia',
  'forum-basilica': 'forum-basilica', 'forum-lares': 'forum-lares', 'forum-vespasian': 'forum-vespasian', 'forum-tholos': 'forum-tholos',
  'forum-fountain': 'forum-fountain',
};
