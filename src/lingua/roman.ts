/**
 * Roman numerals ↔ integers, 1–3999. PURE.
 *
 * Writing always uses the standard subtractive form (IV, IX, XL, XC, CD, CM). Reading is strict but knows what
 * Pompeii actually wrote: the additive forms IIII, VIIII, XXXX, LXXXX, CCCC and DCCCC are real (inscriptions and
 * the banker's tablets use them), so they are accepted and flagged `additive`. Malformed numerals (IC, VV, IIIII,
 * XM, IIX…) are rejected.
 */

const UNITS: readonly [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

export const ROMAN_MIN = 1;
export const ROMAN_MAX = 3999;

/** 1–3999 → standard Roman numeral (upper case). Throws outside that range or for non-integers. */
export function toRoman(n: number): string {
  if (!Number.isInteger(n) || n < ROMAN_MIN || n > ROMAN_MAX) throw new RangeError(`toRoman: ${n} is not an integer from 1 to 3999`);
  let out = '';
  for (const [v, s] of UNITS) while (n >= v) { out += s; n -= v; }
  return out;
}

export interface RomanReading {
  value: number;
  /** Written with an additive form (IIII for 4, VIIII for 9, …) rather than the standard subtractive one. */
  additive: boolean;
  /** The standard way to write the same number. */
  standard: string;
}

// One group per decimal place: standard subtractive forms first, then the additive ones Pompeii used.
const PLACE = (one: string, five: string, ten: string) => [
  ['', 0, false], [one, 1, false], [one + one, 2, false], [one + one + one, 3, false], [one + five, 4, false],
  [five, 5, false], [five + one, 6, false], [five + one + one, 7, false], [five + one + one + one, 8, false],
  [one + ten, 9, false], [one + one + one + one, 4, true], [five + one + one + one + one, 9, true],
] as const;

const PLACES = [
  { mul: 1000, forms: [['', 0, false], ['M', 1, false], ['MM', 2, false], ['MMM', 3, false]] as const },
  { mul: 100, forms: PLACE('C', 'D', 'M') },
  { mul: 10, forms: PLACE('X', 'L', 'C') },
  { mul: 1, forms: PLACE('I', 'V', 'X') },
];

/**
 * Read a Roman numeral (any case, surrounding spaces ignored). Returns null for anything that isn't a well-formed
 * numeral from 1 to 3999.
 */
export function fromRoman(text: string): RomanReading | null {
  const s = text.trim().toUpperCase();
  if (!/^[MDCLXVI]+$/.test(s)) return null;
  // Each place must be written by exactly one of its forms, places in descending order; try every split.
  const walk = (pos: number, place: number): { value: number; additive: boolean } | null => {
    if (place === PLACES.length) return pos === s.length ? { value: 0, additive: false } : null;
    const { mul, forms } = PLACES[place];
    // Longest forms first, so `VIII` isn't read as `V` + leftover.
    const sorted = [...forms].sort((a, b) => b[0].length - a[0].length);
    for (const [str, digit, additive] of sorted) {
      if (!s.startsWith(str, pos)) continue;
      const rest = walk(pos + str.length, place + 1);
      if (rest) return { value: rest.value + digit * mul, additive: rest.additive || additive };
    }
    return null;
  };
  const r = walk(0, 0);
  if (!r || r.value < ROMAN_MIN) return null;
  return { value: r.value, additive: r.additive, standard: toRoman(r.value) };
}

/** Is this text a well-formed Roman numeral (standard or additive)? */
export function isRoman(text: string): boolean {
  return fromRoman(text) !== null;
}
