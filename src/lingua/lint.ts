/**
 * Content lint: every Latin word in the game's text must be one `lingua` can read, spelled with the right
 * macrons. PURE; content tests call it over every dialogue line, sign and puzzle.
 *
 * The convention for Latin inside English (or French) text: **guillemets**. `Ferox heard «Venī!» and came.`
 * Everything between « and » is Latin; everything outside is not. In French text, use “…” for ordinary
 * quotations so « » stays Latin-only. A dialogue line that is Latin in full carries `notes.la === true` instead
 * and needs no guillemets.
 *
 * Inscriptions in capitals (`CAVE CANEM`, `XVI K NOV`) are checked for words but not for macrons, because the
 * Romans didn't write them; capital Roman numerals are always accepted.
 */
import { analyse } from './analyse';
import { fold, tokenize } from './normalize';
import { isRoman } from './roman';

export interface LatinSpan {
  /** The Latin text, without the guillemets. */
  text: string;
  /** Offset of the text (after «) in the original. */
  start: number;
  /** Offset just past the text (at »). */
  end: number;
}

export type LintCode = 'unknown_word' | 'macron' | 'unbalanced';

export interface LintIssue {
  code: LintCode;
  /** The word as written (absent for `unbalanced`). */
  word?: string;
  /** Offset of the word (or the stray guillemet) in the text. */
  at: number;
  /** For `macron`: the spellings the lexicon has. */
  suggestions?: string[];
  message: string;
}

export interface LintOptions {
  /** The whole text is Latin (a line with `notes.la === true`). */
  whole?: boolean;
  /** Extra words to accept as they are (abbreviations like `K`, `NOV`; names not yet in the lexicon). */
  allow?: readonly string[];
  /** Check macrons on lower-case text (default true). */
  macrons?: boolean;
}

/** The Latin spans of a text: whatever sits between « and ». Unbalanced guillemets are ignored here (see lint). */
export function latinSpans(text: string): LatinSpan[] {
  const spans: LatinSpan[] = [];
  const re = /«([^«»]*)»/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) spans.push({ text: m[1], start: m.index + 1, end: m.index + 1 + m[1].length });
  return spans;
}

const isCaps = (w: string) => w.length > 0 && w === w.toUpperCase() && w !== w.toLowerCase();

function lintWord(raw: string, at: number, opts: LintOptions, allow: Set<string>): LintIssue | null {
  if (/^\p{N}+$/u.test(raw)) return null;
  if (isCaps(raw) && isRoman(raw)) return null;
  if (allow.has(fold(raw))) return null;
  const readings = analyse(raw);
  if (!readings.length) return { code: 'unknown_word', word: raw, at, message: `«${raw}» is not in the lexicon` };
  if (opts.macrons === false || isCaps(raw)) return null;
  const spelled = readings.map((r) => (r.enclitic ? r.form + r.enclitic : r.form));
  const written = raw.normalize('NFC').toLowerCase();
  if (spelled.some((s) => s.toLowerCase() === written)) return null;
  const suggestions = [...new Set(spelled)];
  return { code: 'macron', word: raw, at, suggestions, message: `«${raw}» should be spelled ${suggestions.map((s) => `«${s}»`).join(' or ')}` };
}

/**
 * Lint one text: unbalanced guillemets, Latin words the lexicon can't read, and wrong or missing macrons.
 * Returns an empty list when the text is clean.
 */
export function lintLatin(text: string, opts: LintOptions = {}): LintIssue[] {
  const issues: LintIssue[] = [];
  const allow = new Set((opts.allow ?? []).map(fold));
  let spans: LatinSpan[];
  if (opts.whole) {
    spans = [{ text, start: 0, end: text.length }];
  } else {
    spans = latinSpans(text);
    // Any guillemet not part of a «…» pair is a typo that would hide Latin from the lint.
    const paired = new Set<number>();
    for (const s of spans) paired.add(s.start - 1).add(s.end);
    for (let i = 0; i < text.length; i++)
      if ((text[i] === '«' || text[i] === '»') && !paired.has(i))
        issues.push({ code: 'unbalanced', at: i, message: `unpaired ${text[i]} at ${i}` });
  }
  for (const s of spans)
    for (const t of tokenize(s.text)) {
      const issue = lintWord(t.raw, s.start + t.start, opts, allow);
      if (issue) issues.push(issue);
    }
  return issues;
}

/** One text of a dialogue script, as `ymir/dialogue` `scriptTexts` yields it. */
export interface ScriptText {
  node: string;
  at: number | string;
  who?: string;
  text: string;
  notes?: Readonly<Record<string, unknown>>;
}

export interface ScriptIssue extends LintIssue {
  node: string;
  line: number | string;
  text: string;
}

/**
 * Lint every text of a script. A line whose `notes.la === true` is Latin in full; any other line is checked
 * for «Latin» spans. Use it in content tests: `expect(lintScript(scriptTexts(script))).toEqual([])`.
 */
export function lintScript(texts: Iterable<ScriptText>, opts: Omit<LintOptions, 'whole'> = {}): ScriptIssue[] {
  const out: ScriptIssue[] = [];
  for (const t of texts) {
    const whole = t.notes?.la === true;
    for (const issue of lintLatin(t.text, { ...opts, whole })) out.push({ ...issue, node: t.node, line: t.at, text: t.text });
  }
  return out;
}

/** Every Latin word in a text (from «spans», or the whole text), for glossaries and the Codex. */
export function latinWords(text: string, whole = false): string[] {
  const spans = whole ? [text] : latinSpans(text).map((s) => s.text);
  return spans.flatMap((s) => tokenize(s).map((t) => t.raw));
}
