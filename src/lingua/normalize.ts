/**
 * Answer normalisation and tokenising. PURE.
 *
 * Adopted from Roma (`latin-practice` src/progress.ts `normalizeAnswer`): NFD, drop combining marks, lower-case,
 * drop punctuation, collapse spaces. Sub Vesuvio adds the Latin folds the design asks for: i/j and u/v are the
 * same letter, so `Iulia`, `IVLIA` and `Jūlia` all fold to `iulia`.
 */

/** Long vowels with a macron, the only diacritics our Latin carries. */
export const MACRON_VOWELS = 'āēīōūȳĀĒĪŌŪȲ';

/** Strip diacritics (macrons, breves, accents) but keep case and every other character. */
export function stripMarks(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC');
}

/** True when the text carries at least one macron. */
export function hasMacron(s: string): boolean {
  return /[āēīōūȳĀĒĪŌŪȲ]/u.test(s.normalize('NFC'));
}

/**
 * Fold one Latin word to its lookup key: no marks, lower case, j→i, v→u. `Salvē` → `salue`, `IVLIA` → `iulia`.
 * Two spellings that fold to the same key are the same answer.
 */
export function fold(word: string): string {
  return stripMarks(word).toLowerCase().replace(/j/g, 'i').replace(/v/g, 'u');
}

/**
 * Normalise a whole typed answer for comparison: Roma's rule (marks off, lower case, punctuation off, spaces
 * collapsed) plus i/j and u/v. Apostrophes are dropped too (no Latin word has one).
 */
export function normalizeAnswer(text: string): string {
  return stripMarks(text)
    .toLowerCase()
    .replace(/[\p{P}\p{S}]/gu, ' ')
    .replace(/j/g, 'i')
    .replace(/v/g, 'u')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Two answers are the same when they normalise the same. */
export function sameAnswer(a: string, b: string): boolean {
  return normalizeAnswer(a) === normalizeAnswer(b);
}

export interface Token {
  /** The word as written (marks and case kept), punctuation removed. */
  raw: string;
  /** `fold(raw)`. */
  key: string;
  /** Index of the token in the text (0-based). */
  index: number;
  /** Character offset of `raw` in the original text. */
  start: number;
}

/** Split a text into word tokens. Punctuation separates and is dropped; digits are kept as their own tokens. */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const re = /[\p{L}\p{M}]+|\p{N}+/gu;
  const nfc = text.normalize('NFC');
  let m: RegExpExecArray | null;
  while ((m = re.exec(nfc))) tokens.push({ raw: m[0], key: fold(m[0]), index: tokens.length, start: m.index });
  return tokens;
}

/**
 * Is `typed` a spelling of `form` that only leaves macrons out? A macron the typist did write must be right:
 * `puellā` matches `puellā` but not `puella`; `puella` matches both. Case, i/j and u/v are ignored.
 */
export function macronCompatible(typed: string, form: string): boolean {
  const t = [...typed.normalize('NFC').toLowerCase()];
  const f = [...form.normalize('NFC').toLowerCase()];
  if (t.length !== f.length) return false;
  for (let i = 0; i < t.length; i++) {
    const a = t[i], b = f[i];
    if (fold(a) !== fold(b)) return false;
    if (hasMacron(a) && !hasMacron(b)) return false;
  }
  return true;
}

/**
 * Edit distance where one edit is an insertion, a deletion, a substitution or swapping two neighbouring letters
 * (kids swap letters: `ets` for `est` is one slip, not two). Optimal string alignment distance.
 */
export function editDistance(a: string, b: string): number {
  const A = [...a], B = [...b];
  const d: number[][] = Array.from({ length: A.length + 1 }, (_, i) => Array.from({ length: B.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= A.length; i++)
    for (let j = 1; j <= B.length; j++) {
      const cost = A[i - 1] === B[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && A[i - 1] === B[j - 2] && A[i - 2] === B[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[A.length][B.length];
}
