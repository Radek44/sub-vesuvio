/** Answer normalisation (Roma's rule plus i/j and u/v) and tokenising. */
import { describe, expect, it } from 'vitest';
import { editDistance, fold, macronCompatible, normalizeAnswer, sameAnswer, stripMarks, tokenize } from '../../src/lingua';

describe('normalisation', () => {
  it('drops macrons and other marks', () => {
    expect(stripMarks('Salvē, Rōmānī!')).toBe('Salve, Romani!');
    expect(fold('fēminā')).toBe('femina');
    expect(fold('puellă')).toBe('puella'); // a breve, too
  });

  it('treats i/j and u/v as the same letter, in any case', () => {
    expect(fold('Iūlia')).toBe(fold('Julia'));
    expect(fold('IVLIA')).toBe('iulia');
    expect(fold('vīnum')).toBe(fold('uinum'));
    expect(fold('CAVE')).toBe(fold('cavē'));
    expect(sameAnswer('Iam venit', 'jam UENIT')).toBe(true);
  });

  it('ignores case, punctuation and extra spaces (Roma’s rule)', () => {
    expect(normalizeAnswer('  Puella   rosam portat! ')).toBe('puella rosam portat');
    expect(normalizeAnswer('Salvē, Tullia!')).toBe('salue tullia');
    expect(normalizeAnswer('«Quid?» — “nihil”…')).toBe('quid nihil');
    expect(sameAnswer('Ubi est Ferox?', 'ubi est ferōx')).toBe(true);
  });

  it('keeps different words different', () => {
    expect(sameAnswer('puellam', 'puellas')).toBe(false);
    expect(sameAnswer('liber', 'līber')).toBe(true); // only the macron tells them apart; the checker uses the frame
  });

  it('tokenises words, dropping punctuation, keeping marks and offsets', () => {
    const t = tokenize('Salvē, Tullia! Ecce: «Ferōx».');
    expect(t.map((x) => x.raw)).toEqual(['Salvē', 'Tullia', 'Ecce', 'Ferōx']);
    expect(t.map((x) => x.key)).toEqual(['salue', 'tullia', 'ecce', 'ferox']);
    expect(t[1].start).toBe(7);
    expect(t.map((x) => x.index)).toEqual([0, 1, 2, 3]);
    expect(tokenize('XVI K NOV').map((x) => x.raw)).toEqual(['XVI', 'K', 'NOV']);
    expect(tokenize('   ')).toEqual([]);
  });

  it('macrons are optional, but a typed macron must be right', () => {
    expect(macronCompatible('puella', 'puellā')).toBe(true);
    expect(macronCompatible('puellā', 'puellā')).toBe(true);
    expect(macronCompatible('puellā', 'puella')).toBe(false);
    expect(macronCompatible('Venī', 'venī')).toBe(true);
    expect(macronCompatible('uenī', 'venī')).toBe(true);
  });

  it('counts a swap of two letters as one slip', () => {
    expect(editDistance('ets', 'est')).toBe(1);
    expect(editDistance('puela', 'puella')).toBe(1);
    expect(editDistance('rosam', 'rosas')).toBe(1);
    expect(editDistance('portat', 'portant')).toBe(1);
    expect(editDistance('canis', 'canis')).toBe(0);
    expect(editDistance('aqua', 'terra')).toBeGreaterThan(1);
  });
});
