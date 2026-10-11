/** The analyser returns every reading, never just one. */
import { describe, expect, it } from 'vitest';
import { analyse, describeTag, knows, readingsOf } from '../../src/lingua';

const keys = (word: string) => analyse(word).map((r) => `${r.lemma}:${r.key}`).sort();

describe('analyse', () => {
  it('puellae has four readings', () => {
    expect(keys('puellae')).toEqual(['puella:dat.sg.f', 'puella:gen.sg.f', 'puella:nom.pl.f', 'puella:voc.pl.f']);
  });

  it('servī has three; templa has three; puellīs two', () => {
    expect(keys('servī')).toEqual(['servus:gen.sg.m', 'servus:nom.pl.m', 'servus:voc.pl.m']);
    expect(keys('templa')).toEqual(['templum:acc.pl.n', 'templum:nom.pl.n', 'templum:voc.pl.n']);
    expect(keys('puellīs')).toEqual(['puella:abl.pl.f', 'puella:dat.pl.f']);
  });

  it('lookup ignores macrons and case; a typed macron narrows', () => {
    expect(keys('puella')).toEqual(['puella:abl.sg.f', 'puella:nom.sg.f', 'puella:voc.sg.f']);
    expect(keys('puellā')).toEqual(['puella:abl.sg.f']);
    expect(keys('PVELLAM')).toEqual(['puella:acc.sg.f']);
    expect(keys('Salve')).toEqual(['salvē:imp.2.sg']);
  });

  it('finds readings across different words', () => {
    expect(keys('portās')).toEqual(['porta:acc.pl.f', 'portō:ind.2.sg']);
    expect(keys('porta')).toEqual(['porta:abl.sg.f', 'porta:nom.sg.f', 'porta:voc.sg.f', 'portō:imp.2.sg']);
    expect(keys('fīliīs')).toEqual(['fīlia:abl.pl.f', 'fīlia:dat.pl.f', 'fīlius:abl.pl.m', 'fīlius:dat.pl.m']);
    expect([...new Set(analyse('liber').map((r) => r.lemma))].sort()).toEqual(['liber', 'līber']);
    expect(new Set(analyse('līber').map((r) => r.lemma))).toEqual(new Set(['līber']));
  });

  it('reads verbs, irregulars and imperatives', () => {
    expect(keys('est')).toEqual(['sum:ind.3.sg']);
    expect(keys('es')).toEqual(['sum:imp.2.sg', 'sum:ind.2.sg']);
    expect(keys('ī')).toEqual(['eō:imp.2.sg']);
    expect(keys('Venī')).toEqual(['veniō:imp.2.sg']);
    expect(keys('sedē')).toEqual(['sedeō:imp.2.sg']);
    expect(keys('quaere')).toEqual(['quaerō:imp.2.sg']);
    expect(keys('dūc')).toEqual(['dūcō:imp.2.sg']);
    expect(keys('possunt')).toEqual(['possum:ind.3.pl']);
    expect(keys('portāre')).toEqual(['portō:inf']);
  });

  it('reads third-declension and town-name forms, with variants marked', () => {
    expect(keys('canem')).toEqual(['canis:acc.sg.m']);
    expect(keys('nāvī').sort()).toEqual(['nāvis:abl.sg.f', 'nāvis:dat.sg.f']);
    expect(analyse('nāvī').find((r) => r.key === 'abl.sg.f')?.alt).toBe(true);
    expect(keys('Rōmae')).toEqual(['Rōma:dat.sg.f', 'Rōma:gen.sg.f', 'Rōma:loc.sg.f']);
    expect(keys('Pompeiīs')).toEqual(['Pompeiī:abl.pl.m', 'Pompeiī:dat.pl.m', 'Pompeiī:loc.pl.m']);
  });

  it('reads inscriptions in capitals with V for u', () => {
    expect(keys('CAVE')).toEqual(['caveō:imp.2.sg']);
    expect(keys('CANEM')).toEqual(['canis:acc.sg.m']);
    expect(keys('AQVAE').length).toBe(4);
  });

  it('splits -que, -ne and -ve only when the word has no reading of its own', () => {
    const r = analyse('rosamque');
    expect(r.map((x) => `${x.lemma}:${x.key}:${x.enclitic}`)).toEqual(['rosa:acc.sg.f:que']);
    expect(analyse('bene').every((x) => !x.enclitic)).toBe(true);
    expect(analyse('estne')[0]?.enclitic).toBe('ne');
  });

  it('knows nothing it can’t account for', () => {
    expect(analyse('xyzzy')).toEqual([]);
    expect(analyse('')).toEqual([]);
    expect(knows('puellārum')).toBe(true);
    expect(knows('puellorum')).toBe(false);
  });

  it('narrows to a lemma and tag', () => {
    expect(readingsOf('puellae', 'puella', { number: 'pl' }).map((r) => r.key).sort()).toEqual(['nom.pl.f', 'voc.pl.f']);
    expect(describeTag(analyse('puellam')[0].tag)).toBe('acc. sg. f.');
    expect(describeTag(analyse('portat')[0].tag)).toBe('3rd sg. present');
    expect(describeTag(analyse('venīte')[0].tag)).toBe('imperative pl.');
  });
});
