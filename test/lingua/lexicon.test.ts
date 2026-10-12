/** The lexicon is complete and its generated forms are clean. */
import { describe, expect, it } from 'vitest';
import { LEXICON, analyse, entry, find, formsOf, hasMacron, lemmas } from '../../src/lingua';

describe('lexicon', () => {
  it('has the size the slice needs', () => {
    expect(LEXICON.length).toBeGreaterThanOrEqual(150);
  });

  it('every entry has an English and a French meaning and a grammar point', () => {
    for (const e of LEXICON) {
      expect({ id: e.id, en: e.en.trim().length > 0 }).toEqual({ id: e.id, en: true });
      expect({ id: e.id, fr: e.fr.trim().length > 0 }).toEqual({ id: e.id, fr: true });
      expect({ id: e.id, point: typeof e.point }).toEqual({ id: e.id, point: 'string' });
    }
  });

  it('ids are unique and found by lemma', () => {
    expect(new Set(LEXICON.map((e) => e.id)).size).toBe(LEXICON.length);
    for (const e of LEXICON) expect(entry(e.id)).toBe(e);
    expect(find('fīlius')?.pos).toBe('noun');
    expect(find('dūcō')?.pos).toBe('verb');
    expect(find('ducō')?.id).toBe('dūcō'); // macrons optional when unambiguous
    expect(find('liber')?.id).toBe('liber'); // the exact id wins
    expect(lemmas('liber').map((e) => e.id).sort()).toEqual(['liber', 'līber']);
  });

  it('every entry generates at least one form, and every form is unique per tag', () => {
    for (const e of LEXICON) {
      const forms = formsOf(e);
      expect({ id: e.id, n: forms.length > 0 }).toEqual({ id: e.id, n: true });
      const seen = new Set<string>();
      for (const f of forms) {
        const k = `${f.key}|${f.form}`;
        expect({ id: e.id, dup: seen.has(k) ? k : null }).toEqual({ id: e.id, dup: null });
        seen.add(k);
      }
      // Each tag has exactly one taught form; the rest are marked variants.
      const taught = new Map<string, number>();
      for (const f of forms) if (!f.alt) taught.set(f.key, (taught.get(f.key) ?? 0) + 1);
      for (const [key, n] of taught) {
        // Words that never change list their spelling variants (ex/ē, ab/ā) under one key.
        if (key === '-') continue;
        expect({ id: e.id, key, n }).toEqual({ id: e.id, key, n: 1 });
      }
    }
  });

  it('every generated form is read back by the analyser with its own tag', () => {
    for (const e of LEXICON)
      for (const f of formsOf(e)) {
        const back = analyse(f.form).some((r) => r.lemma === e.id && r.key === f.key);
        expect({ id: e.id, form: f.form, key: f.key, back }).toEqual({ id: e.id, form: f.form, key: f.key, back: true });
      }
  });

  it('spelling is Classical: no j, consonantal v, NFC macrons', () => {
    for (const e of LEXICON)
      for (const f of formsOf(e)) {
        expect({ form: f.form, j: /j/i.test(f.form) }).toEqual({ form: f.form, j: false });
        expect({ form: f.form, nfc: f.form === f.form.normalize('NFC') }).toEqual({ form: f.form, nfc: true });
        expect({ form: f.form, chars: /^[A-Za-zāēīōūȳĀĒĪŌŪ]+$/.test(f.form) }).toEqual({ form: f.form, chars: true });
      }
  });

  it('carries the macrons a beginner must see', () => {
    for (const w of ['salvē', 'fēmina', 'vīlla', 'Rōma', 'amīcus', 'nāvis', 'mōns', 'rēx', 'ūnus', 'trēs', 'audiō', 'dūcō', 'nōn', 'hīc', 'minimē'])
      expect({ w, macron: hasMacron(find(w)?.lemma ?? '') }).toEqual({ w, macron: true });
  });

  it('covers the slice’s words', () => {
    const required = [
      'salvē', 'valē', 'avē', 'sum', 'possum', 'eō', 'porta', 'aqua', 'via', 'puella', 'fēmina', 'epistula', 'taberna',
      'vīlla', 'fāma', 'terra', 'unda', 'nauta', 'agricola', 'incola', 'Pompeiī', 'Tullia', 'Rōma', 'servus', 'amīcus',
      'dominus', 'avunculus', 'fīlius', 'deus', 'puer', 'ager', 'liber', 'forum', 'templum', 'oppidum', 'vīnum', 'mūrus',
      'hortus', 'equus', 'cibus', 'Gallus', 'canis', 'pater', 'māter', 'frāter', 'nāvis', 'mare', 'urbs', 'mōns', 'rēx',
      'magnus', 'parvus', 'bonus', 'malus', 'novus', 'multus', 'laetus', 'īrātus', 'Rōmānus', 'Gallicus', 'ūnus', 'duo',
      'trēs', 'quattuor', 'quīnque', 'sex', 'septem', 'octō', 'novem', 'decem', 'amō', 'portō', 'ambulō', 'habitō',
      'labōrō', 'intrō', 'spectō', 'clāmō', 'nāvigō', 'videō', 'sedeō', 'habeō', 'teneō', 'timeō', 'dīcō', 'dūcō',
      'mittō', 'quaerō', 'currō', 'veniō', 'audiō', 'dormiō', 'et', 'sed', 'nōn', 'in', 'ad', 'cum', 'ex', 'ab', 'ubi',
      'quis', 'ecce', 'ita', 'minimē', 'hīc', 'nunc', 'caveō',
    ];
    for (const w of required) expect({ w, found: entry(w) !== undefined }).toEqual({ w, found: true });
    expect(analyse('ē')[0]?.lemma).toBe('ex');
    expect(analyse('ā')[0]?.lemma).toBe('ab');
    expect(analyse('quid')[0]?.lemma).toBe('quis');
  });
});
