/**
 * The lexicon: every Latin word the game knows, with macrons, class, gender, principal parts or genitive,
 * meanings in English and French, and the grammar point it belongs to. PURE data plus lookups.
 *
 * Spelling is Classical with modern lower case and consonantal v (`vīlla`, `valē`) and no j (`iam`, `iubeō`).
 * The forms generator (`forms.ts`) builds every form from these entries; whatever it can't build by rule is listed
 * here explicitly (`forms` replaces, `alt` adds an accepted variant).
 *
 * Scope: the vertical slice (Prologue at Porta Marina, Chapter 1 at the Forum) plus what Ferox, Tullia and the
 * election need. Everything a beginner meets first.
 */
import { fold } from './normalize';

export type Case = 'nom' | 'gen' | 'dat' | 'acc' | 'abl' | 'voc' | 'loc';
export type Num = 'sg' | 'pl';
export type Gender = 'm' | 'f' | 'n';
export type Person = 1 | 2 | 3;
export type Mood = 'ind' | 'imp' | 'inf';
export type Pos = 'noun' | 'adj' | 'num' | 'pron' | 'verb' | 'adv' | 'prep' | 'conj' | 'interj';

/** The grammar point a word is first taught under (the Codex and mastery group words by it). */
export type GrammarPoint =
  | 'greetings'
  | 'sum'
  | 'decl1'
  | 'decl2'
  | 'decl3'
  | 'adj12'
  | 'numbers'
  | 'pronouns'
  | 'conj1'
  | 'conj2'
  | 'conj3'
  | 'conj3io'
  | 'conj4'
  | 'irregular'
  | 'prepositions'
  | 'particles'
  | 'questions';

/**
 * Overrides keyed by tag key (see `tagKey` in forms.ts): `nom.sg` for nouns (gender is the noun's own),
 * `nom.sg.m` for adjectives, numerals and pronouns, `ind.3.sg` / `imp.2.pl` / `inf` for verbs, `-` for a word
 * that never changes.
 */
export type FormTable = Readonly<Record<string, readonly string[]>>;

interface EntryBase {
  /** Unique id; the lemma unless two lemmas collide. */
  id: string;
  /** Dictionary form with macrons. */
  lemma: string;
  pos: Pos;
  en: string;
  fr: string;
  point: GrammarPoint;
  /** Replaces generated forms for these tags (first form is the one taught). */
  forms?: FormTable;
  /** Adds accepted variants for these tags (recognised and accepted, never taught first). */
  alt?: FormTable;
  note?: string;
}

export interface NounEntry extends EntryBase {
  pos: 'noun';
  /** Genitive singular (genitive plural for a plural-only noun). */
  gen: string;
  gender: Gender;
  decl: 1 | 2 | 3;
  proper?: boolean;
  /** Only singular (most names) or only plural (`Pompeiī`). */
  only?: Num;
  /** Third declension i-stems: `mixed` (urbs, nāvis: gen. pl. -ium) or `neuter` (mare: abl. -ī, pl. -ia, -ium). */
  iStem?: 'mixed' | 'neuter';
  /** Town names take a locative (`Rōmae`, `Pompeiīs`). */
  locative?: boolean;
}

export interface AdjEntry extends EntryBase {
  pos: 'adj';
  /** Masculine, feminine, neuter nominative singular. */
  parts: readonly [string, string, string];
}

export interface NumEntry extends EntryBase {
  pos: 'num';
  value: number;
  /** Indeclinable numerals (4–10) have one form; 1–3 decline and list their forms in `forms`. */
  indeclinable: boolean;
}

export interface PronEntry extends EntryBase {
  pos: 'pron';
  /** Every form, listed (`ego`, `tū`, `quis`). */
  forms: FormTable;
  person?: Person;
}

export type Conjugation = 1 | 2 | 3 | '3io' | 4 | 'irr';

export interface VerbEntry extends EntryBase {
  pos: 'verb';
  /** Principal parts: present, infinitive, perfect, supine (null where the verb has none). */
  parts: readonly [string, string, string | null, string | null];
  conj: Conjugation;
}

export interface ParticleEntry extends EntryBase {
  pos: 'adv' | 'prep' | 'conj' | 'interj';
  /** Other spellings of the same word (`ē` for `ex`, `ā` for `ab`). */
  variants?: readonly string[];
  /** Prepositions: the case(s) they take. */
  governs?: readonly ('acc' | 'abl')[];
  /** Greetings that change for one person / several: the plural (`salvēte`). */
  plural?: string;
}

export type Entry = NounEntry | AdjEntry | NumEntry | PronEntry | VerbEntry | ParticleEntry;

// ---------------------------------------------------------------------------------------------------------------
// Builders: compact rows for the data below.

const declOf = (gen: string): 1 | 2 | 3 =>
  gen.endsWith('ae') ? 1 : gen.endsWith('is') ? 3 : 2;

type Extra = Partial<Pick<NounEntry, 'proper' | 'only' | 'iStem' | 'locative' | 'forms' | 'alt' | 'note' | 'id'>> & {
  decl?: 1 | 2 | 3;
};

function N(lemma: string, gen: string, gender: Gender, en: string, fr: string, x: Extra = {}): NounEntry {
  const decl = x.decl ?? declOf(gen);
  const point: GrammarPoint = decl === 1 ? 'decl1' : decl === 2 ? 'decl2' : 'decl3';
  return { id: x.id ?? lemma, lemma, pos: 'noun', gen, gender, decl, en, fr, point, ...x };
}

function A(parts: string, en: string, fr: string, x: Partial<Pick<AdjEntry, 'forms' | 'alt' | 'note'>> = {}): AdjEntry {
  const [m, f, n] = parts.split(/,\s*/);
  return { id: m, lemma: m, pos: 'adj', parts: [m, f, n], en, fr, point: 'adj12', ...x };
}

function V(
  parts: string,
  conj: Conjugation,
  en: string,
  fr: string,
  x: Partial<Pick<VerbEntry, 'forms' | 'alt' | 'note' | 'point'>> = {},
): VerbEntry {
  const [p1, p2, p3, p4] = parts.split(/,\s*/).map((p) => (p === '—' ? null : p));
  const point: GrammarPoint =
    conj === 1 ? 'conj1' : conj === 2 ? 'conj2' : conj === 3 ? 'conj3' : conj === '3io' ? 'conj3io' : conj === 4 ? 'conj4' : 'irregular';
  return { id: p1!, lemma: p1!, pos: 'verb', parts: [p1!, p2!, p3, p4], conj, en, fr, point, ...x };
}

function P(
  pos: ParticleEntry['pos'],
  lemma: string,
  en: string,
  fr: string,
  point: GrammarPoint,
  x: Partial<Pick<ParticleEntry, 'variants' | 'governs' | 'plural' | 'note'>> = {},
): ParticleEntry {
  return { id: lemma, lemma, pos, en, fr, point, ...x };
}

function num(lemma: string, value: number, en: string, fr: string, forms?: FormTable): NumEntry {
  return { id: lemma, lemma, pos: 'num', value, indeclinable: !forms, en, fr, point: 'numbers', ...(forms ? { forms } : {}) };
}

/** Explicit tables: rows of `key: form[/variant…]`. */
function table(rows: string): FormTable {
  const out: Record<string, string[]> = {};
  for (const line of rows.trim().split('\n')) {
    const [key, forms] = line.split(':').map((s) => s.trim());
    out[key] = forms.split('/').map((s) => s.trim());
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Greetings, interjections

const greetings: Entry[] = [
  P('interj', 'salvē', 'hello! (to one person)', 'bonjour ! salut ! (à une personne)', 'greetings', {
    plural: 'salvēte',
    note: 'Imperative of salveō, "be well". Salvēte greets several people.',
  }),
  P('interj', 'valē', 'goodbye! (to one person)', 'au revoir ! (à une personne)', 'greetings', {
    plural: 'valēte',
    note: 'Imperative of valeō, "be strong". Valēte says goodbye to several people.',
  }),
  P('interj', 'avē', 'hail! greetings! (to one person)', 'salut ! je te salue ! (à une personne)', 'greetings', {
    plural: 'avēte',
  }),
  P('interj', 'ecce', 'look! here is…', 'voici ! regarde !', 'particles'),
];

// ---------------------------------------------------------------------------------------------------------------
// Pronouns

const pronouns: Entry[] = [
  {
    id: 'ego', lemma: 'ego', pos: 'pron', person: 1, point: 'pronouns',
    en: 'I, me (plural: we, us)', fr: 'je, moi (pluriel : nous)',
    forms: table(`
      nom.sg: ego
      gen.sg: meī
      dat.sg: mihi/mihī
      acc.sg: mē
      abl.sg: mē
      nom.pl: nōs
      gen.pl: nostrum/nostrī
      dat.pl: nōbīs
      acc.pl: nōs
      abl.pl: nōbīs`),
  },
  {
    id: 'tū', lemma: 'tū', pos: 'pron', person: 2, point: 'pronouns',
    en: 'you (one person; plural: you all)', fr: 'tu, toi (pluriel : vous)',
    forms: table(`
      nom.sg: tū
      gen.sg: tuī
      dat.sg: tibi/tibī
      acc.sg: tē
      abl.sg: tē
      voc.sg: tū
      nom.pl: vōs
      gen.pl: vestrum/vestrī
      dat.pl: vōbīs
      acc.pl: vōs
      abl.pl: vōbīs
      voc.pl: vōs`),
  },
  {
    id: 'quis', lemma: 'quis', pos: 'pron', point: 'questions',
    en: 'who? (quid: what?)', fr: 'qui ? (quid : quoi ? que ?)',
    note: 'Interrogative pronoun, singular. Masculine and feminine share quis; neuter is quid.',
    forms: table(`
      nom.sg.m: quis
      gen.sg.m: cuius
      dat.sg.m: cui
      acc.sg.m: quem
      abl.sg.m: quō
      nom.sg.f: quis
      gen.sg.f: cuius
      dat.sg.f: cui
      acc.sg.f: quem
      abl.sg.f: quō
      nom.sg.n: quid
      gen.sg.n: cuius
      dat.sg.n: cui
      acc.sg.n: quid
      abl.sg.n: quō`),
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Verbs

const verbs: Entry[] = [
  // Irregular
  V('sum, esse, fuī, —', 'irr', 'I am; to be', 'je suis ; être', {
    point: 'sum',
    forms: table(`
      ind.1.sg: sum
      ind.2.sg: es
      ind.3.sg: est
      ind.1.pl: sumus
      ind.2.pl: estis
      ind.3.pl: sunt
      imp.2.sg: es
      imp.2.pl: este
      inf: esse`),
  }),
  V('possum, posse, potuī, —', 'irr', 'I can, I am able', 'je peux ; pouvoir', {
    forms: table(`
      ind.1.sg: possum
      ind.2.sg: potes
      ind.3.sg: potest
      ind.1.pl: possumus
      ind.2.pl: potestis
      ind.3.pl: possunt
      inf: posse`),
  }),
  V('eō, īre, iī, itum', 'irr', 'I go', 'je vais ; aller', {
    forms: table(`
      ind.1.sg: eō
      ind.2.sg: īs
      ind.3.sg: it
      ind.1.pl: īmus
      ind.2.pl: ītis
      ind.3.pl: eunt
      imp.2.sg: ī
      imp.2.pl: īte
      inf: īre`),
  }),
  V('exeō, exīre, exiī, exitum', 'irr', 'I go out, I leave', 'je sors ; sortir', {
    forms: table(`
      ind.1.sg: exeō
      ind.2.sg: exīs
      ind.3.sg: exit
      ind.1.pl: exīmus
      ind.2.pl: exītis
      ind.3.pl: exeunt
      imp.2.sg: exī
      imp.2.pl: exīte
      inf: exīre`),
  }),
  V('volō, velle, voluī, —', 'irr', 'I want', 'je veux ; vouloir', {
    forms: table(`
      ind.1.sg: volō
      ind.2.sg: vīs
      ind.3.sg: vult
      ind.1.pl: volumus
      ind.2.pl: vultis
      ind.3.pl: volunt
      inf: velle`),
    note: 'No imperative. Older spellings volt, voltis are not used here.',
  }),

  // First conjugation
  V('amō, amāre, amāvī, amātum', 1, 'I love, I like', "j'aime ; aimer"),
  V('portō, portāre, portāvī, portātum', 1, 'I carry', 'je porte ; porter'),
  V('ambulō, ambulāre, ambulāvī, ambulātum', 1, 'I walk', 'je marche ; marcher'),
  V('habitō, habitāre, habitāvī, habitātum', 1, 'I live (in a place)', "j'habite ; habiter"),
  V('labōrō, labōrāre, labōrāvī, labōrātum', 1, 'I work', 'je travaille ; travailler'),
  V('intrō, intrāre, intrāvī, intrātum', 1, 'I enter, I go in', "j'entre ; entrer"),
  V('spectō, spectāre, spectāvī, spectātum', 1, 'I watch, I look at', 'je regarde ; regarder'),
  V('clāmō, clāmāre, clāmāvī, clāmātum', 1, 'I shout', 'je crie ; crier'),
  V('nāvigō, nāvigāre, nāvigāvī, nāvigātum', 1, 'I sail', 'je navigue ; naviguer'),
  V('dō, dare, dedī, datum', 1, 'I give', 'je donne ; donner', {
    note: 'The a is short except in dās and dā.',
    forms: table(`
      ind.1.pl: damus
      ind.2.pl: datis
      imp.2.pl: date
      inf: dare`),
  }),
  V('stō, stāre, stetī, statum', 1, 'I stand', 'je suis debout ; se tenir debout'),
  V('vocō, vocāre, vocāvī, vocātum', 1, 'I call', "j'appelle ; appeler"),
  V('parō, parāre, parāvī, parātum', 1, 'I prepare, I get ready', 'je prépare ; préparer'),
  V('narrō, narrāre, narrāvī, narrātum', 1, 'I tell, I relate', 'je raconte ; raconter'),
  V('exspectō, exspectāre, exspectāvī, exspectātum', 1, 'I wait for, I expect', "j'attends ; attendre"),
  V('festīnō, festīnāre, festīnāvī, festīnātum', 1, 'I hurry', 'je me dépêche ; se dépêcher'),
  V('salūtō, salūtāre, salūtāvī, salūtātum', 1, 'I greet', 'je salue ; saluer'),
  V('numerō, numerāre, numerāvī, numerātum', 1, 'I count', 'je compte ; compter'),

  // Second conjugation
  V('videō, vidēre, vīdī, vīsum', 2, 'I see', 'je vois ; voir'),
  V('sedeō, sedēre, sēdī, sessum', 2, 'I sit', "je suis assis ; être assis, s'asseoir"),
  V('habeō, habēre, habuī, habitum', 2, 'I have, I hold', "j'ai ; avoir"),
  V('teneō, tenēre, tenuī, tentum', 2, 'I hold', 'je tiens ; tenir'),
  V('timeō, timēre, timuī, —', 2, 'I fear, I am afraid', "je crains, j'ai peur ; craindre"),
  V('maneō, manēre, mānsī, mānsum', 2, 'I stay, I wait', 'je reste ; rester'),
  V('respondeō, respondēre, respondī, respōnsum', 2, 'I answer, I reply', 'je réponds ; répondre'),
  V('rīdeō, rīdēre, rīsī, rīsum', 2, 'I laugh, I smile', 'je ris ; rire'),
  V('iubeō, iubēre, iussī, iussum', 2, 'I order, I tell (someone to do something)', "j'ordonne ; ordonner"),
  V('mordeō, mordēre, momordī, morsum', 2, 'I bite', 'je mords ; mordre'),
  V('caveō, cavēre, cāvī, cautum', 2, 'I beware, I watch out for', 'je prends garde ; prendre garde à', {
    note: 'Cavē canem! "Beware of the dog!" is written CAVE CANEM at Pompeii.',
  }),

  // Third conjugation
  V('dīcō, dīcere, dīxī, dictum', 3, 'I say, I speak', 'je dis ; dire', { forms: table('imp.2.sg: dīc') }),
  V('dūcō, dūcere, dūxī, ductum', 3, 'I lead, I take (someone)', 'je conduis, je mène ; conduire', {
    forms: table('imp.2.sg: dūc'),
  }),
  V('mittō, mittere, mīsī, missum', 3, 'I send', "j'envoie ; envoyer"),
  V('quaerō, quaerere, quaesīvī, quaesītum', 3, 'I look for, I search; I ask', 'je cherche ; chercher'),
  V('currō, currere, cucurrī, cursum', 3, 'I run', 'je cours ; courir'),
  V('scrībō, scrībere, scrīpsī, scrīptum', 3, 'I write', "j'écris ; écrire"),
  V('legō, legere, lēgī, lēctum', 3, 'I read; I choose', 'je lis ; lire'),
  V('petō, petere, petīvī, petītum', 3, 'I head for, I seek, I ask for', 'je me dirige vers, je demande ; chercher à atteindre'),
  V('agō, agere, ēgī, āctum', 3, 'I do, I drive; (grātiās agō) I thank', 'je fais, je pousse ; (grātiās agō) je remercie'),
  V('pōnō, pōnere, posuī, positum', 3, 'I put, I place', 'je pose, je place ; poser'),
  V('tremō, tremere, tremuī, —', 3, 'I tremble, I shake', 'je tremble ; trembler'),

  // Third conjugation -iō
  V('capiō, capere, cēpī, captum', '3io', 'I take, I catch', 'je prends ; prendre'),
  V('faciō, facere, fēcī, factum', '3io', 'I make, I do', 'je fais ; faire', { forms: table('imp.2.sg: fac') }),
  V('fugiō, fugere, fūgī, fugitum', '3io', 'I run away, I flee', "je fuis ; fuir, s'enfuir"),

  // Fourth conjugation
  V('audiō, audīre, audīvī, audītum', 4, 'I hear, I listen', "j'entends, j'écoute ; entendre"),
  V('dormiō, dormīre, dormīvī, dormītum', 4, 'I sleep', 'je dors ; dormir'),
  V('veniō, venīre, vēnī, ventum', 4, 'I come', 'je viens ; venir'),
  V('sciō, scīre, scīvī, scītum', 4, 'I know', 'je sais ; savoir'),
  V('aperiō, aperīre, aperuī, apertum', 4, 'I open', "j'ouvre ; ouvrir"),
  V('inveniō, invenīre, invēnī, inventum', 4, 'I find', 'je trouve ; trouver'),
];

// ---------------------------------------------------------------------------------------------------------------
// Nouns

const nouns1: Entry[] = [
  N('porta', 'portae', 'f', 'gate, door', 'porte'),
  N('aqua', 'aquae', 'f', 'water', 'eau'),
  N('via', 'viae', 'f', 'road, street, way', 'route, rue, chemin'),
  N('puella', 'puellae', 'f', 'girl', 'fille, jeune fille'),
  N('fēmina', 'fēminae', 'f', 'woman', 'femme'),
  N('epistula', 'epistulae', 'f', 'letter (a message)', 'lettre'),
  N('taberna', 'tabernae', 'f', 'shop, inn', 'boutique, auberge'),
  N('vīlla', 'vīllae', 'f', 'country house, villa', 'maison de campagne, villa'),
  N('fāma', 'fāmae', 'f', 'rumour, reputation', 'rumeur, réputation'),
  N('terra', 'terrae', 'f', 'earth, ground, land', 'terre, sol'),
  N('unda', 'undae', 'f', 'wave', 'vague'),
  N('nauta', 'nautae', 'm', 'sailor', 'marin, matelot', { note: 'First declension but masculine.' }),
  N('agricola', 'agricolae', 'm', 'farmer', 'agriculteur, paysan', { note: 'First declension but masculine.' }),
  N('incola', 'incolae', 'm', 'inhabitant', 'habitant', { note: 'First declension, usually masculine.' }),
  N('poēta', 'poētae', 'm', 'poet', 'poète', { note: 'First declension but masculine.' }),
  N('rosa', 'rosae', 'f', 'rose', 'rose'),
  N('fīlia', 'fīliae', 'f', 'daughter', 'fille (enfant)', {
    alt: table('dat.pl: fīliābus\nabl.pl: fīliābus'),
    note: 'Dative and ablative plural are also fīliābus, to tell daughters from sons (fīliīs).',
  }),
  N('pecūnia', 'pecūniae', 'f', 'money', 'argent'),
  N('cēna', 'cēnae', 'f', 'dinner', 'dîner'),
  N('īnsula', 'īnsulae', 'f', 'island; block of flats', "île ; immeuble"),
  N('tabula', 'tabulae', 'f', 'writing tablet; board', 'tablette'),
  N('ancilla', 'ancillae', 'f', 'enslaved woman, maid', 'servante, esclave'),
  N('hōra', 'hōrae', 'f', 'hour', 'heure'),
  N('familia', 'familiae', 'f', 'household, family', 'maisonnée, famille', {
    alt: table('gen.sg: familiās'),
    note: 'The old genitive familiās survives in pater familiās, head of the household.',
  }),
  N('flamma', 'flammae', 'f', 'flame', 'flamme'),
  N('basilica', 'basilicae', 'f', 'basilica (hall of business and law)', 'basilique (salle des affaires et de la justice)'),
  N('grātia', 'grātiae', 'f', 'thanks; favour (grātiās agō: I thank)', 'reconnaissance ; faveur (grātiās agō : je remercie)'),
  N('Tullia', 'Tulliae', 'f', 'Tullia (a girl’s name)', 'Tullia (prénom de fille)', { proper: true, only: 'sg' }),
  N('Euplia', 'Eupliae', 'f', 'Euplia (a woman’s name)', 'Euplia (prénom de femme)', { proper: true, only: 'sg' }),
  N('Rōma', 'Rōmae', 'f', 'Rome', 'Rome', { proper: true, only: 'sg', locative: true }),
  N('Massilia', 'Massiliae', 'f', 'Massilia (Marseille)', 'Massilia (Marseille)', { proper: true, only: 'sg', locative: true }),
];

const nouns2: Entry[] = [
  N('servus', 'servī', 'm', 'enslaved man, slave', 'esclave'),
  N('amīcus', 'amīcī', 'm', 'friend', 'ami'),
  N('dominus', 'dominī', 'm', 'master, lord', 'maître'),
  N('avunculus', 'avunculī', 'm', 'uncle (mother’s brother)', 'oncle (frère de la mère)'),
  N('fīlius', 'fīliī', 'm', 'son', 'fils', { alt: table('gen.sg: fīlī') }),
  N('deus', 'deī', 'm', 'god', 'dieu', {
    forms: table(`
      voc.sg: deus
      nom.pl: deī/diī/dī
      dat.pl: deīs/diīs/dīs
      abl.pl: deīs/diīs/dīs
      voc.pl: deī/diī/dī`),
    alt: table('gen.pl: deum'),
    note: 'Irregular plural: deī, diī or dī; dative and ablative deīs, diīs or dīs.',
  }),
  N('puer', 'puerī', 'm', 'boy', 'garçon', { note: 'Keeps its e: puerī.' }),
  N('ager', 'agrī', 'm', 'field', 'champ', { note: 'Drops its e: agrī.' }),
  N('liber', 'librī', 'm', 'book', 'livre', { note: 'Not līber, "free".' }),
  N('vir', 'virī', 'm', 'man', 'homme'),
  N('Gallus', 'Gallī', 'm', 'a Gaul', 'un Gaulois'),
  N('nummus', 'nummī', 'm', 'coin', 'pièce de monnaie', {
    alt: table('gen.pl: nummum'),
    note: 'Genitive plural nummum is common in sums of money.',
  }),
  N('lūdus', 'lūdī', 'm', 'game; school', 'jeu ; école'),
  N('populus', 'populī', 'm', 'people, nation', 'peuple'),
  N('mūrus', 'mūrī', 'm', 'wall', 'mur'),
  N('hortus', 'hortī', 'm', 'garden', 'jardin'),
  N('equus', 'equī', 'm', 'horse', 'cheval'),
  N('cibus', 'cibī', 'm', 'food', 'nourriture'),
  N('fūmus', 'fūmī', 'm', 'smoke', 'fumée'),
  N('forum', 'forī', 'n', 'forum, market square', 'forum, place publique'),
  N('templum', 'templī', 'n', 'temple', 'temple'),
  N('oppidum', 'oppidī', 'n', 'town', 'ville'),
  N('vīnum', 'vīnī', 'n', 'wine', 'vin'),
  N('verbum', 'verbī', 'n', 'word', 'mot'),
  N('dōnum', 'dōnī', 'n', 'gift', 'cadeau, don'),
  N('signum', 'signī', 'n', 'sign, signal; seal', 'signe, signal ; sceau'),
  N('aedificium', 'aedificiī', 'n', 'building', 'bâtiment', { alt: table('gen.sg: aedificī') }),
  N('Pompeiī', 'Pompeiōrum', 'm', 'Pompeii (the town)', 'Pompéi (la ville)', {
    decl: 2,
    proper: true,
    only: 'pl',
    locative: true,
    note: 'Plural in form: Pompeiī sunt. "In Pompeii" is the locative Pompeiīs.',
  }),
  N('Vesuvius', 'Vesuviī', 'm', 'Vesuvius (the mountain)', 'le Vésuve', { proper: true, only: 'sg', alt: table('gen.sg: Vesuvī') }),
  N('Gnaeus', 'Gnaeī', 'm', 'Gnaeus (a man’s first name)', 'Gnaeus (prénom d’homme)', { proper: true, only: 'sg' }),
  N('Popidius', 'Popidiī', 'm', 'Popidius (a family name)', 'Popidius (nom de famille)', { proper: true, only: 'sg' }),
];

const nouns3: Entry[] = [
  N('canis', 'canis', 'm', 'dog', 'chien', { note: 'Genitive plural canum, not -ium.' }),
  N('pater', 'patris', 'm', 'father', 'père'),
  N('māter', 'mātris', 'f', 'mother', 'mère'),
  N('frāter', 'frātris', 'm', 'brother', 'frère'),
  N('soror', 'sorōris', 'f', 'sister', 'sœur'),
  N('rēx', 'rēgis', 'm', 'king', 'roi'),
  N('homō', 'hominis', 'm', 'person, human being', 'être humain, homme'),
  N('mercātor', 'mercātōris', 'm', 'merchant, trader', 'marchand'),
  N('viātor', 'viātōris', 'm', 'traveller', 'voyageur', { note: 'Roadside tombs greet passers-by: SALVE VIATOR.' }),
  N('nōmen', 'nōminis', 'n', 'name', 'nom'),
  N('nāvis', 'nāvis', 'f', 'ship', 'navire, bateau', {
    iStem: 'mixed',
    alt: table('acc.sg: nāvim\nabl.sg: nāvī'),
  }),
  N('cīvis', 'cīvis', 'm', 'citizen', 'citoyen', { iStem: 'mixed', alt: table('abl.sg: cīvī') }),
  N('urbs', 'urbis', 'f', 'city', 'ville', { iStem: 'mixed' }),
  N('mōns', 'montis', 'm', 'mountain', 'montagne', { iStem: 'mixed' }),
  N('mare', 'maris', 'n', 'sea', 'mer', { iStem: 'neuter', alt: table('abl.sg: mare\ngen.pl: marum') }),
  N('aedīlis', 'aedīlis', 'm', 'aedile (town official in charge of streets, markets and water)', 'édile (magistrat chargé des rues, des marchés et de l’eau)', {
    iStem: 'mixed',
    forms: table('abl.sg: aedīlī'),
    note: 'Ablative singular aedīlī: it was an adjective first.',
  }),
  N('Ferōx', 'Ferōcis', 'm', 'Ferox (the dog: "Fierce")', 'Ferox (le chien : « Féroce »)', { proper: true, only: 'sg' }),
  N('Celer', 'Celeris', 'm', 'Celer (a man’s surname: "Quick")', 'Celer (surnom d’homme : « Rapide »)', { proper: true, only: 'sg' }),
];

// ---------------------------------------------------------------------------------------------------------------
// Adjectives (first and second declension)

const adjectives: Entry[] = [
  A('magnus, magna, magnum', 'big, great; loud', 'grand ; fort (voix)'),
  A('parvus, parva, parvum', 'small, little', 'petit'),
  A('bonus, bona, bonum', 'good', 'bon'),
  A('malus, mala, malum', 'bad, evil', 'mauvais, méchant'),
  A('novus, nova, novum', 'new', 'nouveau'),
  A('multus, multa, multum', 'much; (plural) many', 'beaucoup de ; (pluriel) nombreux'),
  A('laetus, laeta, laetum', 'happy, glad', 'heureux, joyeux'),
  A('īrātus, īrāta, īrātum', 'angry', 'en colère'),
  A('Rōmānus, Rōmāna, Rōmānum', 'Roman', 'romain'),
  A('Gallicus, Gallica, Gallicum', 'Gallic, from Gaul', 'gaulois'),
  A('Pompeiānus, Pompeiāna, Pompeiānum', 'of Pompeii, Pompeian', 'pompéien'),
  A('longus, longa, longum', 'long', 'long'),
  A('plēnus, plēna, plēnum', 'full', 'plein'),
  A('fessus, fessa, fessum', 'tired', 'fatigué'),
  A('pulcher, pulchra, pulchrum', 'beautiful, handsome', 'beau'),
  A('miser, misera, miserum', 'miserable, unhappy', 'malheureux'),
  A('ruber, rubra, rubrum', 'red', 'rouge'),
  A('līber, lībera, līberum', 'free', 'libre', { note: 'Not liber, "book".' }),
  A('meus, mea, meum', 'my, mine', 'mon, ma, mes', { forms: table('voc.sg.m: mī') }),
  A('tuus, tua, tuum', 'your, yours (of one person)', 'ton, ta, tes'),
  A('noster, nostra, nostrum', 'our, ours', 'notre, nos'),
];

// ---------------------------------------------------------------------------------------------------------------
// Numbers

const numbers: Entry[] = [
  num('ūnus', 1, 'one', 'un', table(`
    nom.sg.m: ūnus
    gen.sg.m: ūnīus
    dat.sg.m: ūnī
    acc.sg.m: ūnum
    abl.sg.m: ūnō
    nom.sg.f: ūna
    gen.sg.f: ūnīus
    dat.sg.f: ūnī
    acc.sg.f: ūnam
    abl.sg.f: ūnā
    nom.sg.n: ūnum
    gen.sg.n: ūnīus
    dat.sg.n: ūnī
    acc.sg.n: ūnum
    abl.sg.n: ūnō`)),
  num('duo', 2, 'two', 'deux', table(`
    nom.pl.m: duo
    gen.pl.m: duōrum
    dat.pl.m: duōbus
    acc.pl.m: duōs/duo
    abl.pl.m: duōbus
    nom.pl.f: duae
    gen.pl.f: duārum
    dat.pl.f: duābus
    acc.pl.f: duās
    abl.pl.f: duābus
    nom.pl.n: duo
    gen.pl.n: duōrum
    dat.pl.n: duōbus
    acc.pl.n: duo
    abl.pl.n: duōbus`)),
  num('trēs', 3, 'three', 'trois', table(`
    nom.pl.m: trēs
    gen.pl.m: trium
    dat.pl.m: tribus
    acc.pl.m: trēs/trīs
    abl.pl.m: tribus
    nom.pl.f: trēs
    gen.pl.f: trium
    dat.pl.f: tribus
    acc.pl.f: trēs/trīs
    abl.pl.f: tribus
    nom.pl.n: tria
    gen.pl.n: trium
    dat.pl.n: tribus
    acc.pl.n: tria
    abl.pl.n: tribus`)),
  num('quattuor', 4, 'four', 'quatre'),
  num('quīnque', 5, 'five', 'cinq'),
  num('sex', 6, 'six', 'six'),
  num('septem', 7, 'seven', 'sept'),
  num('octō', 8, 'eight', 'huit'),
  num('novem', 9, 'nine', 'neuf'),
  num('decem', 10, 'ten', 'dix'),
];

// ---------------------------------------------------------------------------------------------------------------
// Prepositions, adverbs, conjunctions

const particles: Entry[] = [
  P('conj', 'et', 'and', 'et', 'particles'),
  P('conj', 'sed', 'but', 'mais', 'particles'),
  P('conj', 'quod', 'because', 'parce que', 'particles'),
  P('conj', 'sī', 'if', 'si', 'particles'),
  P('adv', 'nōn', 'not', 'ne… pas', 'particles'),
  P('adv', 'ita', 'so, thus; yes', 'ainsi ; oui', 'particles'),
  P('adv', 'minimē', 'no, not at all', 'non, pas du tout', 'particles'),
  P('adv', 'hīc', 'here', 'ici', 'particles'),
  P('adv', 'ibi', 'there', 'là', 'particles'),
  P('adv', 'nunc', 'now', 'maintenant', 'particles'),
  P('adv', 'iam', 'now, already', 'déjà, maintenant', 'particles'),
  P('adv', 'hodiē', 'today', "aujourd'hui", 'particles'),
  P('adv', 'semper', 'always', 'toujours', 'particles'),
  P('adv', 'etiam', 'also, even', 'aussi, même', 'particles'),
  P('adv', 'quoque', 'also, too', 'aussi', 'particles'),
  P('adv', 'bene', 'well', 'bien', 'particles'),
  P('adv', 'valdē', 'very, very much', 'très, beaucoup', 'particles'),
  P('adv', 'ubi', 'where?; when', 'où ? ; quand', 'questions'),
  P('adv', 'cūr', 'why?', 'pourquoi ?', 'questions'),
  P('adv', 'quot', 'how many?', 'combien ?', 'questions', { note: 'Indeclinable.' }),
  P('adv', 'nihil', 'nothing', 'rien', 'particles', { note: 'An indeclinable noun, used as subject or object.' }),
  P('prep', 'in', 'in, on (+ abl.); into, onto (+ acc.)', 'dans, sur (+ abl.) ; vers l’intérieur de (+ acc.)', 'prepositions', {
    governs: ['acc', 'abl'],
  }),
  P('prep', 'ad', 'to, towards (+ acc.)', 'vers, à (+ acc.)', 'prepositions', { governs: ['acc'] }),
  P('prep', 'per', 'through (+ acc.)', 'à travers, par (+ acc.)', 'prepositions', { governs: ['acc'] }),
  P('prep', 'prope', 'near (+ acc.)', 'près de (+ acc.)', 'prepositions', { governs: ['acc'] }),
  P('prep', 'sub', 'under, at the foot of (+ abl.); under (+ acc., with motion)', 'sous, au pied de (+ abl.)', 'prepositions', {
    governs: ['abl', 'acc'],
  }),
  P('prep', 'cum', 'with (+ abl.)', 'avec (+ abl.)', 'prepositions', { governs: ['abl'] }),
  P('prep', 'ex', 'out of, from (+ abl.)', 'hors de, de (+ abl.)', 'prepositions', {
    governs: ['abl'],
    variants: ['ē'],
    note: 'ē before consonants only; ex before anything.',
  }),
  P('prep', 'ab', 'from, away from; by (+ abl.)', 'de, loin de ; par (+ abl.)', 'prepositions', {
    governs: ['abl'],
    variants: ['ā'],
    note: 'ā before consonants only; ab before anything.',
  }),
  P('prep', 'dē', 'down from; about (+ abl.)', 'du haut de ; au sujet de (+ abl.)', 'prepositions', { governs: ['abl'] }),
];

/** Every entry, in teaching order. */
export const LEXICON: readonly Entry[] = [
  ...greetings,
  ...pronouns,
  ...verbs,
  ...nouns1,
  ...nouns2,
  ...nouns3,
  ...adjectives,
  ...numbers,
  ...particles,
];

const byId = new Map<string, Entry>();
const byKey = new Map<string, Entry[]>();
for (const e of LEXICON) {
  if (byId.has(e.id)) throw new Error(`lexicon: duplicate id ${e.id}`);
  byId.set(e.id, e);
  const k = fold(e.lemma);
  byKey.set(k, [...(byKey.get(k) ?? []), e]);
}

/** The entry with this id (ids are lemmas with macrons, e.g. `puella`, `fīlius`, `dūcō`). */
export function entry(id: string): Entry | undefined {
  return byId.get(id);
}

/** Entries whose lemma folds to the same key as `lemma` (macrons, case, i/j and u/v ignored). */
export function lemmas(lemma: string): Entry[] {
  return byKey.get(fold(lemma)) ?? [];
}

/** Find an entry by id, or by lemma when the lemma is unambiguous (`liber` and `līber` are told apart by macron). */
export function find(lemma: string): Entry | undefined {
  const exact = byId.get(lemma.normalize('NFC'));
  if (exact) return exact;
  const all = lemmas(lemma);
  return all.length === 1 ? all[0] : undefined;
}
