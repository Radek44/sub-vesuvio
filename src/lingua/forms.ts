/**
 * The forms generator: every form of every lexicon entry, each tagged. PURE.
 *
 * Built by rule for regular classes (1st, 2nd and 3rd declension nouns, 1st/2nd declension adjectives, the four
 * conjugations' present active indicative, imperative and infinitive). Irregulars are listed in the lexicon
 * (`forms` replaces a cell, `alt` adds an accepted variant), never guessed here.
 */
import type {
  AdjEntry,
  Case,
  Entry,
  FormTable,
  Gender,
  Mood,
  NounEntry,
  Num,
  Person,
  VerbEntry,
} from './lexicon';
import { LEXICON } from './lexicon';

/** What a form is. Only the features that apply are set. */
export interface Tag {
  case?: Case;
  number?: Num;
  gender?: Gender;
  person?: Person;
  mood?: Mood;
}

export interface Form {
  /** The form with macrons. */
  form: string;
  tag: Tag;
  /** `tagKey(tag)`. */
  key: string;
  /** An accepted variant, not the form taught first. */
  alt?: true;
}

export const CASES: readonly Case[] = ['nom', 'gen', 'dat', 'acc', 'abl', 'voc'];
export const NUMBERS: readonly Num[] = ['sg', 'pl'];

/** A stable key for a tag: `nom.sg.f`, `ind.3.sg`, `imp.2.pl`, `inf`, or `-` for a word that never changes. */
export function tagKey(t: Tag): string {
  const parts = [t.mood, t.person, t.case, t.number, t.gender].filter((p) => p !== undefined);
  return parts.length ? parts.join('.') : '-';
}

/** Parse a tag key back (`nom.sg.f` → `{ case: 'nom', number: 'sg', gender: 'f' }`). */
export function parseKey(key: string): Tag {
  const t: Tag = {};
  if (key === '-') return t;
  for (const p of key.split('.')) {
    if (p === 'ind' || p === 'imp' || p === 'inf') t.mood = p;
    else if (p === '1' || p === '2' || p === '3') t.person = Number(p) as Person;
    else if (p === 'sg' || p === 'pl') t.number = p;
    else if (p === 'm' || p === 'f' || p === 'n') t.gender = p;
    else if (['nom', 'gen', 'dat', 'acc', 'abl', 'voc', 'loc'].includes(p)) t.case = p as Case;
    else throw new Error(`bad tag key part ${p} in ${key}`);
  }
  return t;
}

type Cells = Map<string, string[]>;

function put(cells: Cells, key: string, form: string) {
  const list = cells.get(key) ?? [];
  if (!list.includes(form)) list.push(form);
  cells.set(key, list);
}

/** Apply an entry's overrides (`forms` replace, `alt` add), with keys possibly missing the gender (nouns). */
function finish(cells: Cells, e: Entry, gender?: Gender): Form[] {
  const withGender = (k: string) => (gender && !k.includes(`.${gender}`) && /^(nom|gen|dat|acc|abl|voc|loc)\./.test(k) ? `${k}.${gender}` : k);
  const apply = (table: FormTable | undefined, alt: boolean) => {
    if (!table) return [];
    const extra: Form[] = [];
    for (const [k, forms] of Object.entries(table)) {
      const key = withGender(k);
      if (!alt) cells.set(key, [...forms]);
      else for (const f of forms) extra.push({ form: f, tag: parseKey(key), key, alt: true });
    }
    return extra;
  };
  if (e.pos !== 'pron' && e.pos !== 'num') apply(e.forms, false);
  const alts = apply(e.alt, true);
  const out: Form[] = [];
  for (const [key, forms] of cells) {
    const tag = parseKey(key);
    forms.forEach((form, i) => out.push(i === 0 ? { form, tag, key } : { form, tag, key, alt: true }));
  }
  for (const a of alts) if (!out.some((f) => f.key === a.key && f.form === a.form)) out.push(a);
  return out;
}

// --- Nouns ------------------------------------------------------------------------------------------------------

const END1: Record<string, string> = {
  'nom.sg': 'a', 'gen.sg': 'ae', 'dat.sg': 'ae', 'acc.sg': 'am', 'abl.sg': 'ā', 'voc.sg': 'a',
  'nom.pl': 'ae', 'gen.pl': 'ārum', 'dat.pl': 'īs', 'acc.pl': 'ās', 'abl.pl': 'īs', 'voc.pl': 'ae',
  'loc.sg': 'ae', 'loc.pl': 'īs',
};
const END2M: Record<string, string> = {
  'nom.sg': 'us', 'gen.sg': 'ī', 'dat.sg': 'ō', 'acc.sg': 'um', 'abl.sg': 'ō', 'voc.sg': 'e',
  'nom.pl': 'ī', 'gen.pl': 'ōrum', 'dat.pl': 'īs', 'acc.pl': 'ōs', 'abl.pl': 'īs', 'voc.pl': 'ī',
  'loc.sg': 'ī', 'loc.pl': 'īs',
};
const END2N: Record<string, string> = {
  'nom.sg': 'um', 'gen.sg': 'ī', 'dat.sg': 'ō', 'acc.sg': 'um', 'abl.sg': 'ō', 'voc.sg': 'um',
  'nom.pl': 'a', 'gen.pl': 'ōrum', 'dat.pl': 'īs', 'acc.pl': 'a', 'abl.pl': 'īs', 'voc.pl': 'a',
  'loc.sg': 'ī', 'loc.pl': 'īs',
};
const END3: Record<string, string> = {
  'gen.sg': 'is', 'dat.sg': 'ī', 'acc.sg': 'em', 'abl.sg': 'e',
  'nom.pl': 'ēs', 'gen.pl': 'um', 'dat.pl': 'ibus', 'acc.pl': 'ēs', 'abl.pl': 'ibus', 'voc.pl': 'ēs',
};
const END3N: Record<string, string> = {
  'gen.sg': 'is', 'dat.sg': 'ī', 'abl.sg': 'e',
  'nom.pl': 'a', 'gen.pl': 'um', 'dat.pl': 'ibus', 'acc.pl': 'a', 'abl.pl': 'ibus', 'voc.pl': 'a',
};

function strip(word: string, ending: string, what: string): string {
  if (!word.endsWith(ending)) throw new Error(`forms: ${what} ${word} should end in -${ending}`);
  return word.slice(0, word.length - ending.length);
}

/** Second-declension masculine cells from a lemma (nom. sg.) and a stem (from the genitive). */
function second(cells: Cells, lemma: string, stem: string, gender: Gender, vocI: boolean) {
  const table = gender === 'n' ? END2N : END2M;
  for (const [k, end] of Object.entries(table)) {
    if (k.startsWith('loc')) continue;
    put(cells, `${k}.${gender}`, stem + end);
  }
  if (gender !== 'n' && !lemma.endsWith('us')) {
    // -er / -ir: the nominative and vocative singular are the lemma itself (puer, ager, vir).
    cells.set(`nom.sg.${gender}`, [lemma]);
    cells.set(`voc.sg.${gender}`, [lemma]);
  }
  if (vocI) cells.set(`voc.sg.${gender}`, [stem.slice(0, -1) + 'ī']); // fīlius → fīlī, Popidius → Popidī
}

function nounForms(e: NounEntry): Form[] {
  const cells: Cells = new Map();
  const g = e.gender;
  if (e.decl === 1) {
    const stem = strip(e.lemma, e.only === 'pl' ? 'ae' : 'a', '1st-declension noun');
    for (const [k, end] of Object.entries(END1)) if (!k.startsWith('loc')) put(cells, `${k}.${g}`, stem + end);
    if (e.locative) put(cells, `loc.${e.only === 'pl' ? 'pl' : 'sg'}.${g}`, stem + END1[e.only === 'pl' ? 'loc.pl' : 'loc.sg']);
  } else if (e.decl === 2) {
    const stem = e.only === 'pl' ? strip(e.gen, 'ōrum', '2nd-declension genitive plural') : strip(e.gen, 'ī', '2nd-declension genitive');
    // Allen & Greenough §49: proper names in -ius, and fīlius, have a vocative in -ī.
    const vocI = g !== 'n' && e.lemma.endsWith('ius') && (e.proper === true || e.lemma === 'fīlius');
    second(cells, e.lemma, stem, g, vocI);
    if (e.locative) {
      const end = g === 'n' ? END2N : END2M;
      put(cells, `loc.${e.only === 'pl' ? 'pl' : 'sg'}.${g}`, stem + end[e.only === 'pl' ? 'loc.pl' : 'loc.sg']);
    }
  } else {
    const stem = strip(e.gen, 'is', '3rd-declension genitive');
    const neuter = g === 'n';
    const table = neuter ? END3N : END3;
    put(cells, `nom.sg.${g}`, e.lemma);
    for (const [k, end] of Object.entries(table)) put(cells, `${k}.${g}`, stem + end);
    if (neuter) {
      put(cells, `acc.sg.${g}`, e.lemma);
      put(cells, `voc.sg.${g}`, e.lemma);
    } else {
      put(cells, `voc.sg.${g}`, e.lemma);
    }
    if (e.iStem) {
      cells.set(`gen.pl.${g}`, [stem + 'ium']);
      if (e.iStem === 'mixed') put(cells, `acc.pl.${g}`, stem + 'īs'); // urbīs, nāvīs: accepted beside -ēs
      if (e.iStem === 'neuter') {
        cells.set(`abl.sg.${g}`, [stem + 'ī']);
        for (const c of ['nom', 'acc', 'voc']) cells.set(`${c}.pl.${g}`, [stem + 'ia']);
      }
    }
    // Keep the classical cell order: nom, gen, dat, acc, abl, voc.
    const ordered: Cells = new Map();
    for (const n of NUMBERS) for (const c of CASES) {
      const k = `${c}.${n}.${g}`;
      if (cells.has(k)) ordered.set(k, cells.get(k)!);
    }
    cells.clear();
    for (const [k, v] of ordered) cells.set(k, v);
  }
  if (e.only) for (const k of [...cells.keys()]) if (!k.includes(`.${e.only}.`)) cells.delete(k);
  return finish(cells, e, g);
}

// --- Adjectives -------------------------------------------------------------------------------------------------

function adjForms(e: AdjEntry): Form[] {
  const [m, f, n] = e.parts;
  const stem = strip(f, 'a', 'adjective feminine');
  strip(n, 'um', 'adjective neuter');
  const cells: Cells = new Map();
  const mc: Cells = new Map();
  second(mc, m, stem, 'm', false);
  const fc: Cells = new Map();
  for (const [k, end] of Object.entries(END1)) if (!k.startsWith('loc')) put(fc, `${k}.f`, stem + end);
  const nc: Cells = new Map();
  second(nc, n, stem, 'n', false);
  for (const part of [mc, fc, nc]) for (const [k, v] of part) cells.set(k, v);
  return finish(cells, e);
}

// --- Verbs ------------------------------------------------------------------------------------------------------

const PERSONS: readonly [Person, Num][] = [[1, 'sg'], [2, 'sg'], [3, 'sg'], [1, 'pl'], [2, 'pl'], [3, 'pl']];

/** [stem ending to strip from the 1st sg., indicative endings ×6, imperative sg., imperative pl., infinitive] */
const CONJ: Record<string, [string, string[], string, string, string]> = {
  '1': ['ō', ['ō', 'ās', 'at', 'āmus', 'ātis', 'ant'], 'ā', 'āte', 'āre'],
  '2': ['eō', ['eō', 'ēs', 'et', 'ēmus', 'ētis', 'ent'], 'ē', 'ēte', 'ēre'],
  '3': ['ō', ['ō', 'is', 'it', 'imus', 'itis', 'unt'], 'e', 'ite', 'ere'],
  '3io': ['iō', ['iō', 'is', 'it', 'imus', 'itis', 'iunt'], 'e', 'ite', 'ere'],
  '4': ['iō', ['iō', 'īs', 'it', 'īmus', 'ītis', 'iunt'], 'ī', 'īte', 'īre'],
};

function verbForms(e: VerbEntry): Form[] {
  const cells: Cells = new Map();
  if (e.conj !== 'irr') {
    const [cut, ind, impSg, impPl, inf] = CONJ[String(e.conj)];
    const stem = strip(e.lemma, cut, `conjugation ${e.conj} verb`);
    PERSONS.forEach(([p, n], i) => put(cells, `ind.${p}.${n}`, stem + ind[i]));
    put(cells, 'imp.2.sg', stem + impSg);
    put(cells, 'imp.2.pl', stem + impPl);
    put(cells, 'inf', stem + inf);
  }
  return finish(cells, e);
}

// --- Everything else --------------------------------------------------------------------------------------------

function listed(table: FormTable, e: Entry, extra: Tag = {}): Form[] {
  const out: Form[] = [];
  for (const [k, forms] of Object.entries(table)) {
    const tag = { ...parseKey(k), ...extra };
    const key = tagKey(tag);
    forms.forEach((form, i) => out.push(i === 0 ? { form, tag, key } : { form, tag, key, alt: true }));
  }
  if (e.alt) out.push(...listed(e.alt, e, extra).map((f) => ({ ...f, alt: true as const })));
  return out;
}

function generate(e: Entry): Form[] {
  switch (e.pos) {
    case 'noun':
      return nounForms(e);
    case 'adj':
      return adjForms(e);
    case 'verb':
      return verbForms(e);
    case 'pron':
      return listed(e.forms, e, e.person ? { person: e.person } : {});
    case 'num':
      return e.indeclinable ? [{ form: e.lemma, tag: {}, key: '-' }] : listed(e.forms!, e);
    default: {
      if (e.plural) {
        return [
          { form: e.lemma, tag: { mood: 'imp', person: 2, number: 'sg' }, key: 'imp.2.sg' },
          { form: e.plural, tag: { mood: 'imp', person: 2, number: 'pl' }, key: 'imp.2.pl' },
        ];
      }
      return [{ form: e.lemma, tag: {}, key: '-' }, ...(e.variants ?? []).map((v) => ({ form: v, tag: {}, key: '-' }))];
    }
  }
}

const cache = new Map<string, readonly Form[]>();

/** Every form of an entry, taught forms first in each cell, then accepted variants (`alt`). */
export function formsOf(e: Entry): readonly Form[] {
  let f = cache.get(e.id);
  if (!f) cache.set(e.id, (f = Object.freeze(generate(e))));
  return f;
}

/** The forms of an entry for one tag key (`nom.sg.f`, `ind.3.sg`…); the taught form first. */
export function cell(e: Entry, key: string): string[] {
  return formsOf(e).filter((f) => f.key === key).map((f) => f.form);
}

/** The taught form of an entry for a tag (first in its cell), or undefined. */
export function formFor(e: Entry, tag: Tag): string | undefined {
  const key = tagKey(tag);
  return formsOf(e).find((f) => f.key === key && !f.alt)?.form ?? formsOf(e).find((f) => f.key === key)?.form;
}

/** Every form in the lexicon, with its entry. */
export function allForms(): { entry: Entry; form: Form }[] {
  return LEXICON.flatMap((entry) => formsOf(entry).map((form) => ({ entry, form })));
}
