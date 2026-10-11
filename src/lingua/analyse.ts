/**
 * The analyser: a written form → every reading the lexicon allows. PURE.
 *
 * `analyse('puellae')` returns four readings (gen. sg., dat. sg., nom. pl., voc. pl.); the game never pretends a
 * form has one meaning when it has several. Lookup ignores macrons, case, i/j and u/v; a macron that *is* typed
 * narrows the readings (`puellā` is only the ablative).
 */
import type { Entry } from './lexicon';
import { LEXICON } from './lexicon';
import type { Form, Tag } from './forms';
import { formsOf } from './forms';
import { fold, macronCompatible } from './normalize';

export interface Reading {
  /** The form with macrons, as the lexicon spells it. */
  form: string;
  /** The entry's id (its lemma). */
  lemma: string;
  entry: Entry;
  tag: Tag;
  key: string;
  /** An accepted variant spelling rather than the taught form. */
  alt?: true;
  /** `-que`, `-ne` or `-ve` was attached and split off. */
  enclitic?: 'que' | 'ne' | 've';
}

let index: Map<string, { entry: Entry; form: Form }[]> | null = null;

function buildIndex() {
  const map = new Map<string, { entry: Entry; form: Form }[]>();
  for (const entry of LEXICON)
    for (const form of formsOf(entry)) {
      const k = fold(form.form);
      const list = map.get(k);
      if (list) list.push({ entry, form });
      else map.set(k, [{ entry, form }]);
    }
  return map;
}

function lookup(word: string): Reading[] {
  index ??= buildIndex();
  const hits = index.get(fold(word)) ?? [];
  return hits.map(({ entry, form }) => ({
    form: form.form,
    lemma: entry.id,
    entry,
    tag: form.tag,
    key: form.key,
    ...(form.alt ? { alt: true as const } : {}),
  }));
}

/** Readings of `word` whose spelling the typed macrons agree with; all readings if the macrons fit none. */
function byMacrons(word: string, readings: Reading[]): Reading[] {
  const fit = readings.filter((r) => macronCompatible(word, r.form));
  return fit.length ? fit : readings;
}

/**
 * Every reading of one word. Empty when the lexicon can't account for it. Enclitics (`-que`, `-ne`, `-ve`) are
 * split off only when the whole word has no reading of its own.
 */
export function analyse(word: string): Reading[] {
  const w = word.normalize('NFC').trim();
  if (!w) return [];
  const direct = lookup(w);
  if (direct.length) return byMacrons(w, direct);
  for (const enclitic of ['que', 'ne', 've'] as const) {
    const k = fold(w);
    if (k.length > enclitic.length + 1 && k.endsWith(enclitic === 've' ? 'ue' : enclitic)) {
      const host = w.slice(0, w.length - enclitic.length);
      const r = lookup(host);
      if (r.length) return byMacrons(host, r).map((x) => ({ ...x, enclitic }));
    }
  }
  return [];
}

/** True when the lexicon can read the word. */
export function knows(word: string): boolean {
  return analyse(word).length > 0;
}

/** Does `tag` satisfy every feature `want` sets? (`{ case: 'acc' }` matches any accusative.) */
export function tagMatches(tag: Tag, want: Tag): boolean {
  return (Object.keys(want) as (keyof Tag)[]).every((k) => want[k] === undefined || tag[k] === want[k]);
}

/** Readings narrowed to one lemma and, optionally, a tag. */
export function readingsOf(word: string, lemma: string, want: Tag = {}): Reading[] {
  return analyse(word).filter((r) => r.lemma === lemma && tagMatches(r.tag, want));
}

/** A short human label for a tag: `gen. sg. f.`, `3rd sg. pres.`, `imperative pl.`, `infinitive`. */
export function describeTag(t: Tag): string {
  const ord = (p: number) => (p === 1 ? '1st' : p === 2 ? '2nd' : '3rd');
  if (t.mood === 'inf') return 'infinitive';
  if (t.mood === 'imp') return `imperative ${t.number}.`;
  if (t.mood === 'ind') return `${ord(t.person!)} ${t.number}. present`;
  const bits = [t.case && `${t.case}.`, t.number && `${t.number}.`, t.gender && `${t.gender}.`].filter(Boolean);
  if (t.person) bits.unshift(`${ord(t.person)} person`);
  return bits.length ? bits.join(' ') : 'invariable';
}
