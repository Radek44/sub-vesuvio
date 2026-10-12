/**
 * Every generated paradigm against the hand-entered reference (test/lingua/reference.ts). Any disagreement fails
 * the build and names the word and the cell.
 */
import { describe, expect, it } from 'vitest';
import { LEXICON, cell, find, formsOf, type Entry } from '../../src/lingua';
import { REF_ADJECTIVES, REF_NOUNS, REF_NUMERALS, REF_PRONOUNS, REF_VERBS } from './reference';

const CASES = ['nom', 'gen', 'dat', 'acc', 'abl', 'voc'] as const;
const PERSONS = ['1.sg', '2.sg', '3.sg', '1.pl', '2.pl', '3.pl'] as const;

function entryOf(lemma: string): Entry {
  const e = find(lemma);
  if (!e) throw new Error(`${lemma} is not in the lexicon`);
  return e;
}

/** Compare one cell: same taught form first, same set of accepted forms. */
function expectCell(e: Entry, key: string, ref: string) {
  const want = ref.split('/');
  const got = cell(e, key);
  expect({ word: e.lemma, key, taught: got[0] }).toEqual({ word: e.lemma, key, taught: want[0] });
  expect({ word: e.lemma, key, forms: [...got].sort() }).toEqual({ word: e.lemma, key, forms: [...want].sort() });
}

function keysOf(e: Entry) {
  return [...new Set(formsOf(e).map((f) => f.key))].sort();
}

describe('paradigms match the independent reference', () => {
  for (const [lemma, ref] of Object.entries(REF_NOUNS)) {
    it(`noun ${lemma}`, () => {
      const e = entryOf(lemma);
      const keys: string[] = [];
      for (const [n, row] of [['sg', ref.sg], ['pl', ref.pl]] as const) {
        if (!row) continue;
        CASES.forEach((c, i) => {
          const key = `${c}.${n}.${ref.gender}`;
          keys.push(key);
          expectCell(e, key, row[i]);
        });
      }
      if (ref.loc) {
        const key = `loc.${ref.sg ? 'sg' : 'pl'}.${ref.gender}`;
        keys.push(key);
        expectCell(e, key, ref.loc);
      }
      expect(keysOf(e)).toEqual(keys.sort());
    });
  }

  for (const [lemma, ref] of Object.entries(REF_ADJECTIVES)) {
    it(`adjective ${lemma}, all genders`, () => {
      const e = entryOf(lemma);
      const keys: string[] = [];
      for (const g of ['m', 'f', 'n'] as const)
        for (const n of ['sg', 'pl'] as const)
          CASES.forEach((c, i) => {
            const key = `${c}.${n}.${g}`;
            keys.push(key);
            expectCell(e, key, ref[g][n][i]);
          });
      expect(keysOf(e)).toEqual(keys.sort());
    });
  }

  for (const [lemma, ref] of Object.entries(REF_NUMERALS)) {
    it(`numeral ${lemma}`, () => {
      const e = entryOf(lemma);
      const keys: string[] = [];
      for (const g of ['m', 'f', 'n'] as const)
        CASES.slice(0, 5).forEach((c, i) => {
          const key = `${c}.${ref.number}.${g}`;
          keys.push(key);
          expectCell(e, key, ref[g][i]);
        });
      expect(keysOf(e)).toEqual(keys.sort());
    });
  }

  for (const [lemma, ref] of Object.entries(REF_VERBS)) {
    it(`verb ${lemma}: present, imperative, infinitive`, () => {
      const e = entryOf(lemma);
      const keys: string[] = [];
      PERSONS.forEach((p, i) => {
        keys.push(`ind.${p}`);
        expectCell(e, `ind.${p}`, ref.present[i]);
      });
      if (ref.imperative) {
        keys.push('imp.2.sg', 'imp.2.pl');
        expectCell(e, 'imp.2.sg', ref.imperative[0]);
        expectCell(e, 'imp.2.pl', ref.imperative[1]);
      }
      keys.push('inf');
      expectCell(e, 'inf', ref.infinitive);
      expect(keysOf(e)).toEqual(keys.sort());
    });
  }

  for (const [lemma, ref] of Object.entries(REF_PRONOUNS)) {
    it(`pronoun ${lemma}`, () => {
      const e = entryOf(lemma);
      const person = lemma === 'ego' ? 1 : 2;
      const keys = Object.keys(ref).map((k) => `${person}.${k}`);
      for (const [k, forms] of Object.entries(ref)) expectCell(e, `${person}.${k}`, forms);
      expect(keysOf(e)).toEqual(keys.sort());
    });
  }

  it('the reference covers the slice’s core words', () => {
    for (const w of ['puella', 'porta', 'nauta', 'servus', 'puer', 'ager', 'templum', 'canis', 'pater', 'nāvis', 'mare'])
      expect(REF_NOUNS[w], w).toBeDefined();
    for (const w of ['magnus', 'bonus']) expect(REF_ADJECTIVES[w], w).toBeDefined();
    for (const w of ['ūnus', 'duo', 'trēs']) expect(REF_NUMERALS[w], w).toBeDefined();
    for (const w of ['amō', 'videō', 'dūcō', 'capiō', 'audiō', 'sum', 'possum', 'eō']) expect(REF_VERBS[w], w).toBeDefined();
  });
});

describe('principal parts agree with the generated forms', () => {
  it('every verb’s first two principal parts are its 1st sg. and infinitive', () => {
    for (const e of formsOfAll('verb')) {
      if (e.pos !== 'verb') continue;
      expect(cell(e, 'ind.1.sg')[0], e.lemma).toBe(e.parts[0]);
      expect(cell(e, 'inf')[0], e.lemma).toBe(e.parts[1]);
    }
  });

  it('every noun’s genitive is its generated genitive', () => {
    for (const e of formsOfAll('noun')) {
      if (e.pos !== 'noun') continue;
      const key = `gen.${e.only === 'pl' ? 'pl' : 'sg'}.${e.gender}`;
      expect(cell(e, key)[0], e.lemma).toBe(e.gen);
      const nomKey = `nom.${e.only === 'pl' ? 'pl' : 'sg'}.${e.gender}`;
      expect(cell(e, nomKey)[0], e.lemma).toBe(e.lemma);
    }
  });

  it('every adjective’s three nominatives are its principal parts', () => {
    for (const e of formsOfAll('adj')) {
      if (e.pos !== 'adj') continue;
      expect([cell(e, 'nom.sg.m')[0], cell(e, 'nom.sg.f')[0], cell(e, 'nom.sg.n')[0]], e.lemma).toEqual([...e.parts]);
    }
  });
});

function formsOfAll(pos: Entry['pos']): Entry[] {
  return LEXICON.filter((e) => e.pos === pos);
}
