/** Roman numerals: strict, but they read what Pompeii actually wrote. */
import { describe, expect, it } from 'vitest';
import { fromRoman, isRoman, toRoman } from '../../src/lingua';

describe('roman numerals', () => {
  it('writes the standard forms', () => {
    const cases: [number, string][] = [
      [1, 'I'], [4, 'IV'], [9, 'IX'], [14, 'XIV'], [40, 'XL'], [49, 'XLIX'], [90, 'XC'], [99, 'XCIX'], [400, 'CD'],
      [444, 'CDXLIV'], [900, 'CM'], [1994, 'MCMXCIV'], [79, 'LXXIX'], [16, 'XVI'], [2026, 'MMXXVI'], [3999, 'MMMCMXCIX'],
    ];
    for (const [n, s] of cases) {
      expect(toRoman(n)).toBe(s);
      expect(fromRoman(s)).toEqual({ value: n, additive: false, standard: s });
    }
  });

  it('round-trips every number from 1 to 3999', () => {
    for (let n = 1; n <= 3999; n++) {
      const r = fromRoman(toRoman(n));
      expect(r?.value).toBe(n);
      expect(r?.additive).toBe(false);
    }
  });

  it('accepts the additive forms Pompeii used, flagged', () => {
    expect(fromRoman('IIII')).toEqual({ value: 4, additive: true, standard: 'IV' });
    expect(fromRoman('VIIII')).toEqual({ value: 9, additive: true, standard: 'IX' });
    expect(fromRoman('XXXX')).toEqual({ value: 40, additive: true, standard: 'XL' });
    expect(fromRoman('LXXXX')).toEqual({ value: 90, additive: true, standard: 'XC' });
    expect(fromRoman('CCCC')).toEqual({ value: 400, additive: true, standard: 'CD' });
    expect(fromRoman('DCCCC')).toEqual({ value: 900, additive: true, standard: 'CM' });
    expect(fromRoman('XIIII')?.value).toBe(14);
    expect(fromRoman('MDCCCCLXXXXVIIII')).toEqual({ value: 1999, additive: true, standard: 'MCMXCIX' });
  });

  it('reads lower case and ignores surrounding spaces', () => {
    expect(fromRoman(' xvi ')?.value).toBe(16);
  });

  it('rejects malformed numerals', () => {
    for (const bad of [
      '', 'IC', 'IL', 'XM', 'VX', 'VV', 'LL', 'DD', 'IIIII', 'XXXXX', 'MMMM', 'IIX', 'XIIX', 'IXI', 'IVI', 'XCX',
      'CMC', 'VIV', 'IXX', 'XLX', 'ABC', 'X I', 'IIIIII', 'IVIIII', 'J', 'U', '0', '-X',
    ])
      expect({ bad, ok: isRoman(bad) }).toEqual({ bad, ok: false });
  });

  it('refuses to write what isn’t 1–3999', () => {
    for (const n of [0, -1, 4000, 1.5, NaN]) expect(() => toRoman(n)).toThrow(RangeError);
  });
});
