/**
 * Prologue: Porta Marina. The hero climbs from the harbour, gets past the toll collector at the sea gate
 * in their first Latin, finds the house with the dog at its door, and wins Ferox over with two commands.
 *
 * Plain data on ymir/dialogue `Script` v2. Latin inside English is in «guillemets»; a line in Latin
 * throughout has `notes.la`. `notes.gloss` gives the tap-to-see meanings. Every Latin word is linted by
 * lingua in `test/content.test.ts`, and every prompt's right answer is checked to be accepted.
 *
 * Grammar here (design §7, Prologue): salvē/valē, sum/es, quis/quid, a first accusative heard (epistulam),
 * and three imperatives for Ferox (sedē, venī, ī).
 */
import type { Script } from 'ymir/dialogue';
import type { ChooseTask } from '../lingua';

/** Conditions the sim tests. */
export type Cond = { flag: string } | { not: string };
/** Effects the sim applies. */
export type Effect = { set: string } | { objective: Objective } | { ferox: 'sit' | 'follow' };
export type Objective = 'gate' | 'house' | 'ferox' | 'door' | 'forum';

/** The objective line at the top of the screen. */
export const OBJECTIVES: Record<Objective, { en: string; fr: string }> = {
  gate: { en: 'Climb Via Marina to the sea gate', fr: 'Monte la Via Marina jusqu’à la porte de la mer' },
  house: { en: 'Find your uncle’s house: “the house of the dog”', fr: 'Trouve la maison de ton oncle : “la maison du chien”' },
  ferox: { en: 'Get past the dog at the door', fr: 'Passe devant le chien de la porte' },
  door: { en: 'Knock at your uncle’s door', fr: 'Frappe à la porte de ton oncle' },
  forum: { en: 'Find Tullia, the banker’s daughter, at the Forum', fr: 'Trouve Tullia, la fille du banquier, au Forum' },
};

const la = { la: true };
const choose = (options: ChooseTask['options']): { task: ChooseTask } => ({ task: { step: 'choose', options } });

export const PROLOGUE: Script<Cond, Effect> = {
  // ── Arriving ──
  arrival: {
    id: 'arrival',
    lines: [
      { who: 'you', text: 'Pompeii. The ship from Massilia is already unloading behind you.' },
      { who: 'you', text: 'Uncle Marcus’s letter is in your satchel. It’s in Latin. You can read exactly one word of it: «salvē».' },
      { who: 'you', text: 'Up the hill, the sea gate. He said to come straight there.', do: [{ objective: 'gate' }] },
    ],
  },

  // ── The tomb by the road ──
  tomb: {
    id: 'tomb',
    lines: [
      { who: 'you', text: 'An old tomb by the road, painted white. Big letters run across it: «SALVE VIATOR».', notes: { gloss: { salvē: { en: 'hello', fr: 'bonjour' }, viātor: { en: 'traveller', fr: 'voyageur' } } } },
      { who: 'you', text: 'The dead say hello to people passing by. «Salvē» you know. «Viātor» must be you: the traveller.' },
    ],
  },

  // ── The toll collector at the gate ──
  portitor: {
    id: 'portitor',
    lines: [
      { who: 'Sextus', text: '«Valē», then. Mind the dog.', when: { flag: 'passedGate' }, goto: 'end' },
      { who: 'Sextus', text: 'Salvē!', notes: la },
      { who: 'you', text: 'A man at a table under the arch, wax tablets in hand. He’s collecting tolls. He’s looking at you.' },
      { who: 'Sextus', text: 'Quis es?', notes: { ...la, gloss: { quis: { en: 'who?', fr: 'qui ?' }, es: { en: 'are you', fr: 'es-tu' } } } },
    ],
    then: { goto: 'portitor-ask' },
  },
  'portitor-ask': {
    id: 'portitor-ask',
    lines: [],
    then: {
      prompt: {
        id: 'quis-es', who: 'Sextus', prompt: 'Tell him who you are.',
        data: choose([
          { text: '«Salvē! {name} sum.»', right: true },
          { text: '«Valē! {name} sum.»', feedback: { en: '«Valē» is goodbye. You’ve only just arrived!', fr: '«Valē», c’est au revoir. Tu viens à peine d’arriver !' } },
          { text: '«Salvē! Rōma sum.»', feedback: { en: 'That says you are Rome itself. Bold, but no.', fr: 'Ça dit que tu es Rome en personne. Audacieux, mais non.' } },
        ]),
        results: { right: 'portitor-carry', else: 'portitor-retry' },
        do: { right: [{ set: 'saidName' }] },
      },
    },
  },
  'portitor-retry': {
    id: 'portitor-retry',
    lines: [{ who: 'Sextus', text: 'Quid?', notes: { ...la, gloss: { quid: { en: 'what?', fr: 'quoi ?' } } } }],
    then: { goto: 'portitor-ask' },
  },
  'portitor-carry': {
    id: 'portitor-carry',
    lines: [
      { who: 'Sextus', text: '«Bene.» A Gaul who speaks Latin. Almost.', notes: { gloss: { bene: { en: 'good, well', fr: 'bien' } } } },
      { who: 'Sextus', text: 'Quid portās?', notes: { ...la, gloss: { quid: { en: 'what', fr: 'quoi' }, portās: { en: 'are you carrying', fr: 'portes-tu' } } } },
      { who: 'you', text: 'He points at your satchel. Everything that comes through this gate pays a toll.' },
    ],
    then: {
      prompt: {
        id: 'quid-portas', who: 'Sextus', prompt: 'Tell him what you carry.',
        data: choose([
          { text: '«Epistulam portō.»', right: true },
          { text: '«Epistula portō.»', feedback: { en: 'So close! The letter is what you carry, so it takes the accusative: «epistulam».', fr: 'Presque ! La lettre est ce que tu portes, donc il faut l’accusatif : «epistulam».' } },
          { text: '«Canem portō.»', feedback: { en: 'You are not carrying a dog. Not yet.', fr: 'Tu ne portes pas de chien. Pas encore.' } },
        ]),
        results: { right: 'portitor-pass', else: 'portitor-carry-retry' },
      },
    },
  },
  'portitor-carry-retry': {
    id: 'portitor-carry-retry',
    lines: [{ who: 'Sextus', text: 'Quid portās?', notes: la }],
    then: { goto: 'portitor-carry-ask' },
  },
  'portitor-carry-ask': {
    id: 'portitor-carry-ask',
    lines: [],
    then: {
      prompt: {
        id: 'quid-portas', who: 'Sextus', prompt: 'Tell him what you carry.',
        data: choose([
          { text: '«Epistulam portō.»', right: true },
          { text: '«Epistula portō.»', feedback: { en: 'So close! The letter is what you carry, so it takes the accusative: «epistulam».', fr: 'Presque ! La lettre est ce que tu portes, donc il faut l’accusatif : «epistulam».' } },
          { text: '«Canem portō.»', feedback: { en: 'You are not carrying a dog. Not yet.', fr: 'Tu ne portes pas de chien. Pas encore.' } },
        ]),
        results: { right: 'portitor-pass', else: 'portitor-carry-retry' },
      },
    },
  },
  'portitor-pass': {
    id: 'portitor-pass',
    lines: [
      { who: 'Sextus', text: 'A letter. No toll on letters. «Intrā!»', notes: { gloss: { intrā: { en: 'come in!', fr: 'entre !' } } } },
      { who: 'you', text: 'He waves you through. Uncle’s letter says his house is on this street: “the house of the dog”.', do: [{ set: 'passedGate' }, { objective: 'house' }] },
    ],
  },

  // ── People on Via Marina ──
  vibia: {
    id: 'vibia',
    lines: [
      { who: 'Vibia', text: '«Salvē!» Hot lentils, fresh bread, wine with honey. No? Just looking?' },
      { who: 'Vibia', text: 'The house of the dog? Up the street, the yellow one. You can’t miss the dog.', when: { not: 'feroxFollows' }, do: [{ set: 'heardFerox' }] },
      { who: 'Vibia', text: 'And a word of advice: Ferox only listens to Latin. His master taught him that way.', when: { not: 'feroxFollows' } },
      { who: 'Vibia', text: 'Ferox walking with a stranger! Well. He has good taste, at least.', when: { flag: 'feroxFollows' } },
    ],
  },
  faustus: {
    id: 'faustus',
    lines: [
      { who: 'Faustus', text: '«Vīnum!» New wine from the slopes of the mountain. The harvest is in, and what a harvest!', notes: { gloss: { vīnum: { en: 'wine', fr: 'vin' } } } },
      { who: 'Faustus', text: 'The ground shook again last night. Knocked two jars off my shelf. The mountain is thirsty, my grandmother used to say.' },
    ],
  },
  modestus: {
    id: 'modestus',
    lines: [
      { who: 'Modestus', text: 'Bread! Fresh from the oven, stamped with my name so nobody passes off theirs as mine.' },
      { who: 'Modestus', text: 'The mills turn all night. The donkeys don’t like it any more than I do.' },
    ],
  },
  prima: {
    id: 'prima',
    lines: [
      { who: 'Prima', text: '«Aqua!» Heavy, this jar. The fountain at the corner never stops running.', notes: { gloss: { aqua: { en: 'water', fr: 'eau' } } } },
      { who: 'Prima', text: 'Well. Almost never. Lately it splutters, and the water tastes of iron. Nobody knows why.' },
    ],
  },
  lucius: {
    id: 'lucius',
    lines: [
      { who: 'Lucius', text: '«Salvē!» Are you really from Gaul? Do they have dogs there? Bigger than Ferox?' },
      { who: 'Lucius', text: 'Ferox likes me. I think. He hasn’t bitten me. That’s liking, isn’t it?' },
    ],
  },
  celsus: {
    id: 'celsus',
    lines: [
      { who: 'Celsus', text: 'Stand back, stones fall. Seventeen years since the great earthquake and we’re still rebuilding Venus’s house.' },
      { who: 'Celsus', text: 'The earth shakes, we build again. That’s Pompeii.' },
    ],
  },

  // ── Places ──
  fountain: {
    id: 'fountain',
    lines: [
      { who: 'you', text: 'Cold water, from the aqueduct through the lead pipes. The stone where people lean to drink is worn smooth.' },
      { who: 'you', text: 'Your uncle looked after this water. Somewhere, it starts in the hills and runs all the way here.' },
    ],
  },
  temple: {
    id: 'temple',
    lines: [{ who: 'you', text: 'The Temple of Venus, the city’s goddess. Half of it is scaffolding. Masons shout and ropes creak.' }],
  },
  baths: {
    id: 'baths',
    lines: [{ who: 'you', text: 'Baths outside the walls, windows full of steam, a furnace smoking at the back. Later, maybe. You smell like a ship.' }],
  },
  gate: {
    id: 'gate',
    lines: [{ who: 'you', text: 'The sea gate: a narrow arch for people, a wide, steep one for mules. Everything that comes up from the harbour comes through here.' }],
  },

  // ── The house of the dog ──
  'cave-canem': {
    id: 'cave-canem',
    lines: [
      { who: 'you', text: 'In the doorway, a mosaic in black and white: a chained dog, and two words. «CAVE CANEM».', notes: { gloss: { cavē: { en: 'beware!', fr: 'prends garde !' }, canem: { en: 'the dog (object)', fr: 'le chien (complément)' } } } },
      { who: 'you', text: '«Cavē», beware. «Canem», the dog. Beware of the dog. The dog in question is lying right on top of it.' },
    ],
  },
  ferox: {
    id: 'ferox',
    lines: [
      { who: 'Ferox', text: 'Ferox lies across the threshold, sniffs, and wags once at you.', when: { flag: 'feroxFollows' }, goto: 'end' },
      { who: 'you', text: 'A huge, scruffy dog lies across the doorway. He lifts his head. A low growl, like a cart on cobbles.', do: [{ objective: 'ferox' }] },
      { who: 'you', text: 'Vibia said he only listens to Latin.', when: { flag: 'heardFerox' } },
      { who: 'you', text: 'Maybe, if he sat, you could step past him.' },
    ],
    then: { goto: 'ferox-sit' },
  },
  'ferox-sit': {
    id: 'ferox-sit',
    lines: [],
    then: {
      prompt: {
        id: 'ferox-sede', who: 'Ferox', prompt: 'Tell Ferox to sit.',
        data: choose([
          { text: '«Sedē!»', right: true },
          { text: '«Venī!»', feedback: { en: '«Venī» means come! He is already here. That’s the problem.', fr: '«Venī» veut dire viens ! Il est déjà là. C’est bien le problème.' } },
          { text: '«Cavē!»', feedback: { en: '«Cavē» is beware! He is the thing to beware of.', fr: '«Cavē», c’est prends garde ! C’est lui, le danger.' } },
        ]),
        results: { right: 'ferox-sits', else: 'ferox-growl' },
        do: { right: [{ ferox: 'sit' }] },
      },
    },
  },
  'ferox-growl': {
    id: 'ferox-growl',
    lines: [{ who: 'Ferox', text: 'Ferox tilts his head. The growl stops, then starts again. Try again.' }],
    then: { goto: 'ferox-sit' },
  },
  'ferox-sits': {
    id: 'ferox-sits',
    lines: [
      { who: 'Ferox', text: 'Ferox sits. His tail thumps the mosaic once, twice.' },
      { who: 'you', text: 'He’s watching you as if you’re about to say something important.' },
    ],
    then: { goto: 'ferox-come' },
  },
  'ferox-come': {
    id: 'ferox-come',
    lines: [],
    then: {
      prompt: {
        id: 'ferox-veni', who: 'Ferox', prompt: 'Call him to come with you.',
        data: choose([
          { text: '«Venī!»', right: true },
          { text: '«Ī!»', feedback: { en: '«Ī» means go away! He looks deeply hurt.', fr: '«Ī» veut dire va-t’en ! Il a l’air profondément vexé.' } },
          { text: '«Sedē!»', feedback: { en: 'He’s sitting already. Very nicely.', fr: 'Il est déjà assis. Très sagement.' } },
        ]),
        results: { right: 'ferox-joins', else: 'ferox-come-again' },
        do: { right: [{ ferox: 'follow' }, { set: 'feroxFollows' }, { objective: 'door' }] },
      },
    },
  },
  'ferox-come-again': {
    id: 'ferox-come-again',
    lines: [{ who: 'Ferox', text: 'Ferox stays put, ears up, waiting for the right word.' }],
    then: { goto: 'ferox-come' },
  },
  'ferox-joins': {
    id: 'ferox-joins',
    lines: [{ who: 'Ferox', text: 'Ferox bounds to your side. He seems to have decided you are his.' }],
  },
  door: {
    id: 'door',
    lines: [
      { who: 'you', text: 'The big door is barred from inside. You knock. Nothing. You knock again. Nothing.', when: { flag: 'feroxFollows' } },
      { who: 'you', text: 'Ferox noses at the gap under the door and whines. Then he digs at the mat and drags out… a wax tablet.', when: { flag: 'feroxFollows' }, do: [{ set: 'foundTablet' }] },
      { who: 'you', text: 'Uncle’s handwriting. Half of it is numbers. The rest looks like a code. And one name you can read: «TVLLIA».', when: { flag: 'feroxFollows' }, do: [{ objective: 'forum' }] },
      { who: 'you', text: 'Not with that dog lying across the doorway.', when: { not: 'feroxFollows' } },
    ],
  },
  end: { id: 'end', lines: [] },
};

/** Who or what starts which conversation. */
export const TALK_TO: Record<string, string> = {
  portitor: 'portitor', thermopolium: 'vibia', wine: 'faustus', baker: 'modestus', 'water-carrier': 'prima', kids: 'lucius', mason: 'celsus',
  ferox: 'ferox', 'cave-canem': 'cave-canem', fountain: 'fountain', temple: 'temple', baths: 'baths', gate: 'gate', tomb: 'tomb', door: 'door',
};
