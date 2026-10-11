/**
 * The answer checker for the answer ladder (design §4). PURE; answers are graded by rules, never by a model.
 *
 *   1 choose   pick one of a few answers
 *   2 build    arrange word tiles (any grammatical order)
 *   3 endings  pick or fix an ending
 *   4 write    type the phrase
 *
 * Steps 2–4 are graded against a **frame**, not a string: a list of slots (`puella` nom. sg., `rosa` acc. sg.,
 * `portō` 3rd sg. present). The answer is tokenised, normalised and analysed, each word is matched to a slot in any
 * order, and the result names the actual error so the feedback can explain it kindly.
 *
 * Feedback text marks Latin with guillemets («rosam») in both languages, the same convention as content (lint.ts).
 */
import type { Case, Entry, Gender, Mood, Num, Person } from './lexicon';
import { find } from './lexicon';
import type { Tag } from './forms';
import { formsOf } from './forms';
import type { Reading } from './analyse';
import { analyse, tagMatches } from './analyse';
import { editDistance, fold, tokenize } from './normalize';

export type Grade = 'right' | 'close' | 'wrong';

export type FeedbackCode =
  | 'empty'
  | 'wrong_choice'
  | 'wrong_case'
  | 'wrong_number'
  | 'wrong_gender'
  | 'wrong_person'
  | 'wrong_mood'
  | 'wrong_word'
  | 'unknown_word'
  | 'missing_word'
  | 'extra_word'
  | 'word_order'
  | 'misspelling'
  | 'not_a_form';

/** Every code the checker can emit, for content tests and analytics catalogs. */
export const FEEDBACK_CODES: readonly FeedbackCode[] = [
  'empty', 'wrong_choice', 'wrong_case', 'wrong_number', 'wrong_gender', 'wrong_person', 'wrong_mood',
  'wrong_word', 'unknown_word', 'missing_word', 'extra_word', 'word_order', 'misspelling', 'not_a_form',
];

export interface Text {
  en: string;
  fr: string;
}

export interface Feedback extends Text {
  code: FeedbackCode;
}

/** One thing wrong with an answer. `slot` is the frame slot it concerns, `word` the word the player wrote. */
export interface Issue {
  code: FeedbackCode;
  slot?: string;
  word?: string;
  /** The form the slot wanted (taught form). */
  expected?: string;
}

export interface CheckResult {
  grade: Grade;
  /** The one thing to say (the most useful issue); absent when right. */
  feedback?: Feedback;
  /** Everything found, most important first (for mastery and reports). */
  issues: Issue[];
}

/** One word the answer must contain. */
export interface Slot {
  id: string;
  /** Lexicon id(s) that may fill it (`puella`, `portō`); several for synonyms. */
  lemma: string | readonly string[];
  case?: Case;
  number?: Num;
  gender?: Gender;
  person?: Person;
  mood?: Mood;
  /** Agrees with another slot: takes its case, number and gender (adjectives). */
  agrees?: string;
  /** This slot is a preposition: the slot it governs must come after it. */
  governs?: string;
  /** May be left out (a subject pronoun, a greeting's name). */
  optional?: boolean;
  /** Why the slot takes its form, for feedback: "is what the girl carries". */
  why?: Text;
}

export interface Frame {
  slots: readonly Slot[];
}

export interface ChooseTask {
  step: 'choose';
  options: readonly { text: string; right?: boolean; feedback?: Text }[];
}
export interface BuildTask {
  step: 'build';
  frame: Frame | readonly Frame[];
  /** The tiles on offer (may include distractors). */
  tiles: readonly string[];
}
export interface EndingsTask {
  step: 'endings';
  /** The part of the word that stays (`aqu`); the answer supplies the ending. */
  stem: string;
  slot: Slot;
}
export interface WriteTask {
  step: 'write';
  frame: Frame | readonly Frame[];
}
export type Task = ChooseTask | BuildTask | EndingsTask | WriteTask;

/** choose: option index or text; build: tiles in order; endings: the ending (`-am`) or whole word; write: text. */
export type Answer = number | string | readonly string[];

// ---------------------------------------------------------------------------------------------------------------
// Words for feedback

/** Case names; `fr` carries its article (le génitif, l’accusatif), `frAu` the form after "à" (au génitif, à l’accusatif). */
const CASE_NAME: Record<Case, Text & { frAu: string }> = {
  nom: { en: 'nominative', fr: 'le nominatif', frAu: 'au nominatif' },
  gen: { en: 'genitive', fr: 'le génitif', frAu: 'au génitif' },
  dat: { en: 'dative', fr: 'le datif', frAu: 'au datif' },
  acc: { en: 'accusative', fr: 'l’accusatif', frAu: 'à l’accusatif' },
  abl: { en: 'ablative', fr: 'l’ablatif', frAu: 'à l’ablatif' },
  voc: { en: 'vocative', fr: 'le vocatif', frAu: 'au vocatif' },
  loc: { en: 'locative', fr: 'le locatif', frAu: 'au locatif' },
};
const CASE_WHY: Partial<Record<Case, Text>> = {
  nom: { en: 'is the subject (who or what does it)', fr: 'est le sujet (qui fait l’action)' },
  acc: { en: 'is the object (who or what it is done to)', fr: 'est le complément d’objet (ce qui subit l’action)' },
  gen: { en: 'shows whose it is', fr: 'montre à qui c’est' },
  dat: { en: 'is the one it is given or said to', fr: 'est celui à qui on donne ou on parle' },
  abl: { en: 'says by, with or from what', fr: 'dit par quoi, avec quoi ou d’où' },
  voc: { en: 'is the one being spoken to', fr: 'est celui à qui l’on parle' },
};
const NUMBER_NAME: Record<Num, Text> = {
  sg: { en: 'singular (just one)', fr: 'singulier (un seul)' },
  pl: { en: 'plural (more than one)', fr: 'pluriel (plusieurs)' },
};
const GENDER_NAME: Record<Gender, Text> = {
  m: { en: 'masculine', fr: 'masculin' },
  f: { en: 'feminine', fr: 'féminin' },
  n: { en: 'neuter', fr: 'neutre' },
};
const PERSON_NAME: Record<string, Text> = {
  '1.sg': { en: '“I”', fr: '“je”' },
  '2.sg': { en: '“you” (one person)', fr: '“tu”' },
  '3.sg': { en: '“he”, “she” or “it”', fr: '“il” ou “elle”' },
  '1.pl': { en: '“we”', fr: '“nous”' },
  '2.pl': { en: '“you” (several people)', fr: '“vous”' },
  '3.pl': { en: '“they”', fr: '“ils” ou “elles”' },
};
const MOOD_NAME: Record<Mood, Text> = {
  ind: { en: 'the ordinary present (it is happening)', fr: 'le présent ordinaire (cela se passe)' },
  imp: { en: 'a command', fr: 'un ordre (impératif)' },
  inf: { en: 'the infinitive (“to …”)', fr: 'l’infinitif' },
};

const la = (s: string) => `«${s}»`;
const meaning = (e: Entry): Text => ({ en: e.en.split(/[;,(]/)[0].trim(), fr: e.fr.split(/[;,(]/)[0].trim() });

// ---------------------------------------------------------------------------------------------------------------
// Frames

interface Resolved {
  slot: Slot;
  entries: Entry[];
  want: Tag;
  /** Every form that satisfies the slot (taught forms first). */
  right: string[];
  /** The taught form to show in feedback. */
  expected: string;
}

function resolveEntry(id: string): Entry {
  const e = find(id);
  if (!e) throw new Error(`lingua frame: "${id}" is not in the lexicon`);
  return e;
}

function wantOf(slot: Slot): Tag {
  const t: Tag = {};
  if (slot.case) t.case = slot.case;
  if (slot.number) t.number = slot.number;
  if (slot.gender) t.gender = slot.gender;
  if (slot.person) t.person = slot.person;
  if (slot.mood) t.mood = slot.mood;
  return t;
}

/** Turn a frame into concrete wanted tags and forms. Throws for unknown lemmas or impossible slots (content bugs). */
export function resolveFrame(frame: Frame): Resolved[] {
  const byId = new Map(frame.slots.map((s) => [s.id, s]));
  return frame.slots.map((slot) => {
    const entries = (typeof slot.lemma === 'string' ? [slot.lemma] : [...slot.lemma]).map(resolveEntry);
    const want = wantOf(slot);
    if (slot.agrees) {
      const target = byId.get(slot.agrees);
      if (!target) throw new Error(`lingua frame: slot ${slot.id} agrees with missing slot ${slot.agrees}`);
      const tw = wantOf(target);
      const te = resolveEntry(typeof target.lemma === 'string' ? target.lemma : target.lemma[0]);
      want.case ??= tw.case;
      want.number ??= tw.number;
      want.gender ??= tw.gender ?? (te.pos === 'noun' ? te.gender : undefined);
    }
    const taught: string[] = [];
    const variants: string[] = [];
    for (const e of entries)
      for (const f of formsOf(e)) if (tagMatches(f.tag, want)) (f.alt ? variants : taught).push(f.form);
    const right = [...new Set([...taught, ...variants])];
    if (!right.length) throw new Error(`lingua frame: slot ${slot.id} (${entries.map((e) => e.id).join('/')}) has no form for ${JSON.stringify(want)}`);
    return { slot, entries, want, right, expected: right[0] };
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Matching words to slots

interface Word {
  raw: string;
  key: string;
  readings: Reading[];
}

type Match =
  | { kind: 'exact'; cost: 0 }
  | { kind: 'form'; cost: number; diff: (keyof Tag)[]; reading: Reading }
  | { kind: 'spelling'; cost: number; expected: string };

const FEATURE_ORDER: (keyof Tag)[] = ['mood', 'case', 'number', 'person', 'gender'];

function diffOf(tag: Tag, want: Tag): (keyof Tag)[] {
  return FEATURE_ORDER.filter((k) => want[k] !== undefined && tag[k] !== want[k]);
}

/** Close enough to be a slip: one edit, on words of three letters or more. */
function slip(a: string, b: string): boolean {
  return b.length >= 3 && a !== b && editDistance(a, b) <= 1;
}

function matchOf(w: Word, r: Resolved): Match | null {
  const ids = new Set(r.entries.map((e) => e.id));
  const mine = w.readings.filter((x) => ids.has(x.lemma));
  if (mine.some((x) => tagMatches(x.tag, r.want))) return { kind: 'exact', cost: 0 };
  if (mine.length) {
    const best = [...mine].sort((a, b) => diffOf(a.tag, r.want).length - diffOf(b.tag, r.want).length)[0];
    return { kind: 'form', cost: 1, diff: diffOf(best.tag, r.want), reading: best };
  }
  // A slip of the keyboard on the right form: close.
  const known = w.readings.length > 0;
  const near = r.right.find((f) => slip(w.key, fold(f)));
  if (near) return { kind: 'spelling', cost: known ? 2 : 1, expected: near };
  // A slip on another form of the right word: still a form error.
  for (const e of r.entries)
    for (const f of formsOf(e))
      if (slip(w.key, fold(f.form))) {
        const reading: Reading = { form: f.form, lemma: e.id, entry: e, tag: f.tag, key: f.key };
        return { kind: 'form', cost: known ? 3 : 2, diff: diffOf(f.tag, r.want), reading };
      }
  return null;
}

const EXTRA = 3;
const MISSING = 3;

interface Assignment {
  cost: number;
  /** slot index per word, or -1 for an extra word */
  of: number[];
  matches: (Match | null)[];
}

function assign(words: Word[], slots: Resolved[]): Assignment {
  const table = words.map((w) => slots.map((s) => matchOf(w, s)));
  let best: Assignment | null = null;
  const used = new Array(slots.length).fill(false);
  const of: number[] = [];
  const matches: (Match | null)[] = [];
  const missingCost = () => slots.reduce((sum, s, i) => sum + (used[i] || s.slot.optional ? 0 : MISSING), 0);
  const go = (i: number, cost: number) => {
    if (best && cost >= best.cost) return;
    if (i === words.length) {
      const total = cost + missingCost();
      if (!best || total < best.cost) best = { cost: total, of: [...of], matches: [...matches] };
      return;
    }
    for (let s = 0; s < slots.length; s++) {
      const m = table[i][s];
      if (used[s] || !m) continue;
      used[s] = true; of.push(s); matches.push(m);
      go(i + 1, cost + m.cost);
      used[s] = false; of.pop(); matches.pop();
    }
    of.push(-1); matches.push(null);
    go(i + 1, cost + EXTRA);
    of.pop(); matches.pop();
  };
  go(0, 0);
  return best!;
}

// ---------------------------------------------------------------------------------------------------------------
// Feedback

function codeOf(diff: (keyof Tag)[]): FeedbackCode {
  switch (diff[0]) {
    case 'mood': return 'wrong_mood';
    case 'number': return 'wrong_number';
    case 'person': return 'wrong_person';
    case 'gender': return 'wrong_gender';
    default: return 'wrong_case';
  }
}

function formFeedback(r: Resolved, diff: (keyof Tag)[], slots: Resolved[]): Feedback {
  const e = r.entries[0];
  const x = r.expected;
  const top = diff[0];
  const code = codeOf(diff);
  // An adjective that agrees: whatever is off, the reason is the noun it goes with.
  const target = r.slot.agrees ? slots.find((s) => s.slot.id === r.slot.agrees) : undefined;
  if (target && (top === 'case' || top === 'number' || top === 'gender')) {
    const what: Text =
      top === 'case' ? { en: `case, the ${CASE_NAME[r.want.case!].en}`, fr: `cas, ${CASE_NAME[r.want.case!].fr}` }
      : top === 'number' ? { en: `number, ${NUMBER_NAME[r.want.number!].en}`, fr: `nombre, le ${NUMBER_NAME[r.want.number!].fr}` }
      : { en: `gender, ${GENDER_NAME[r.want.gender!].en}`, fr: `genre, le ${GENDER_NAME[r.want.gender!].fr}` };
    return {
      code,
      en: `${la(e.lemma)} goes with ${la(target.expected)}, so it takes the same ${what.en}: ${la(x)}.`,
      fr: `${la(e.lemma)} va avec ${la(target.expected)}, donc il prend le même ${what.fr} : ${la(x)}.`,
    };
  }
  const why = r.slot.why ?? governedBy(r, slots) ?? (r.want.case ? CASE_WHY[r.want.case] : undefined);
  if (top === 'case' && r.want.case) {
    const c = CASE_NAME[r.want.case];
    return why
      ? { code, en: `${la(e.lemma)} ${why.en}, so it takes the ${c.en}: ${la(x)}.`, fr: `${la(e.lemma)} ${why.fr}, donc il faut ${c.fr} : ${la(x)}.` }
      : { code, en: `Here ${la(e.lemma)} takes the ${c.en}: ${la(x)}.`, fr: `Ici, ${la(e.lemma)} se met ${c.frAu} : ${la(x)}.` };
  }
  if (top === 'number' && r.want.number) {
    const n = NUMBER_NAME[r.want.number];
    return {
      code,
      en: `Nearly! Right word, but here it is ${n.en}: ${la(x)}.`,
      fr: `Presque ! C’est le bon mot, mais ici il est au ${n.fr} : ${la(x)}.`,
    };
  }
  if (top === 'person' && r.want.person && r.want.number) {
    const p = PERSON_NAME[`${r.want.person}.${r.want.number}`];
    return {
      code,
      en: `The verb has to match who is doing it, ${p.en}: ${la(x)}.`,
      fr: `Le verbe doit s’accorder avec qui fait l’action, ${p.fr} : ${la(x)}.`,
    };
  }
  if (top === 'mood' && r.want.mood) {
    const m = MOOD_NAME[r.want.mood];
    return { code, en: `Here we need ${m.en}: ${la(x)}.`, fr: `Ici, il faut ${m.fr} : ${la(x)}.` };
  }
  if (top === 'gender' && r.want.gender) {
    const g = GENDER_NAME[r.want.gender];
    return { code, en: `Here ${la(e.lemma)} is ${g.en}: ${la(x)}.`, fr: `Ici, ${la(e.lemma)} est au ${g.fr} : ${la(x)}.` };
  }
  // Same word, a form the frame didn't ask for in some other way.
  return { code, en: `Close: the form we need is ${la(x)}.`, fr: `Pas loin : la forme qu’il faut est ${la(x)}.` };
}

function governedBy(r: Resolved, slots: Resolved[]): Text | undefined {
  const prep = slots.find((s) => s.slot.governs === r.slot.id);
  if (!prep) return undefined;
  const p = prep.entries[0].lemma;
  return { en: `comes after ${la(p)}`, fr: `vient après ${la(p)}` };
}

function feedbackFor(issue: Issue, slots: Resolved[], words: Word[], diff?: (keyof Tag)[]): Feedback {
  const r = issue.slot ? slots.find((s) => s.slot.id === issue.slot) : undefined;
  const w = issue.word;
  switch (issue.code) {
    case 'wrong_case':
    case 'wrong_number':
    case 'wrong_person':
    case 'wrong_mood':
    case 'wrong_gender':
      return formFeedback(r!, diff ?? [], slots);
    case 'misspelling':
      return { code: 'misspelling', en: `So close! Check the spelling: ${la(issue.expected!)}.`, fr: `Tout près ! Vérifie l’orthographe : ${la(issue.expected!)}.` };
    case 'wrong_word': {
      const got = words.find((x) => x.raw === w)?.readings[0]?.entry;
      const want = meaning(r!.entries[0]);
      return got
        ? {
            code: 'wrong_word',
            en: `${la(w!)} means “${meaning(got).en}”. Here we need the word for “${want.en}”.`,
            fr: `${la(w!)} veut dire “${meaning(got).fr}”. Ici, il faut le mot pour “${want.fr}”.`,
          }
        : { code: 'wrong_word', en: `Here we need the word for “${want.en}”.`, fr: `Ici, il faut le mot pour “${want.fr}”.` };
    }
    case 'unknown_word':
      return {
        code: 'unknown_word',
        en: `I don’t know ${la(w!)} yet. Check the spelling, or try a word you have met.`,
        fr: `Je ne connais pas encore ${la(w!)}. Vérifie l’orthographe, ou essaie un mot que tu as déjà vu.`,
      };
    case 'missing_word': {
      const m = meaning(r!.entries[0]);
      return { code: 'missing_word', en: `One word is missing: the one for “${m.en}”.`, fr: `Il manque un mot : celui qui veut dire “${m.fr}”.` };
    }
    case 'extra_word':
      return { code: 'extra_word', en: `${la(w!)} isn’t needed here. Try without it.`, fr: `${la(w!)} n’est pas utile ici. Essaie sans.` };
    case 'word_order': {
      const obj = slots.find((s) => s.slot.id === r!.slot.governs)!;
      return {
        code: 'word_order',
        en: `${la(r!.entries[0].lemma)} goes in front of its noun: ${la(`${r!.expected} ${obj.expected}`)}.`,
        fr: `${la(r!.entries[0].lemma)} se place devant son nom : ${la(`${r!.expected} ${obj.expected}`)}.`,
      };
    }
    case 'not_a_form':
      return {
        code: 'not_a_form',
        en: `${la(w!)} isn’t a form of ${la(r!.entries[0].lemma)}. Try another ending.`,
        fr: `${la(w!)} n’est pas une forme de ${la(r!.entries[0].lemma)}. Essaie une autre terminaison.`,
      };
    case 'empty':
      return { code: 'empty', en: 'Write your answer in Latin.', fr: 'Écris ta réponse en latin.' };
    default:
      return { code: 'wrong_choice', en: 'Not this one. Have another look.', fr: 'Pas celle-ci. Regarde encore.' };
  }
}

const PRIORITY: FeedbackCode[] = [
  'wrong_mood', 'wrong_case', 'wrong_number', 'wrong_person', 'wrong_gender', 'not_a_form', 'wrong_word',
  'unknown_word', 'missing_word', 'extra_word', 'word_order', 'misspelling',
];

/** Grade a list of words against one frame. */
function grade(words: Word[], frame: Frame): CheckResult & { cost: number } {
  const slots = resolveFrame(frame);
  if (!words.length) return { grade: 'wrong', feedback: feedbackFor({ code: 'empty' }, slots, words), issues: [{ code: 'empty' }], cost: Infinity };
  const a = assign(words, slots);
  const issues: Issue[] = [];
  const diffs = new Map<Issue, (keyof Tag)[]>();
  const filled = new Set(a.of.filter((s) => s >= 0));
  const extras: Word[] = [];
  words.forEach((w, i) => {
    const s = a.of[i];
    const m = a.matches[i];
    if (s < 0 || !m) return void extras.push(w);
    const r = slots[s];
    if (m.kind === 'form') {
      const code = codeOf(m.diff);
      const issue: Issue = { code, slot: r.slot.id, word: w.raw, expected: r.expected };
      diffs.set(issue, m.diff);
      issues.push(issue);
    } else if (m.kind === 'spelling') {
      issues.push({ code: 'misspelling', slot: r.slot.id, word: w.raw, expected: m.expected });
    }
  });
  const missing = slots.filter((s, i) => !filled.has(i) && !s.slot.optional);
  // A known word where a different word was wanted: say what each means rather than "extra" and "missing".
  for (const w of [...extras]) {
    const m = missing.find((s) => w.readings.some((r) => r.entry.pos === s.entries[0].pos));
    if (m) {
      issues.push({ code: 'wrong_word', slot: m.slot.id, word: w.raw, expected: m.expected });
      missing.splice(missing.indexOf(m), 1);
      extras.splice(extras.indexOf(w), 1);
    }
  }
  for (const w of extras) issues.push({ code: w.readings.length ? 'extra_word' : 'unknown_word', word: w.raw });
  for (const s of missing) issues.push({ code: 'missing_word', slot: s.slot.id, expected: s.expected });
  // Prepositions come before their nouns, with only that noun's own adjectives between.
  slots.forEach((r, i) => {
    if (!r.slot.governs) return;
    const objIndex = slots.findIndex((s) => s.slot.id === r.slot.governs);
    const at = a.of.indexOf(i), objAt = a.of.indexOf(objIndex);
    if (at < 0 || objAt < 0) return;
    const between = a.of.slice(at + 1, objAt);
    const ok = at < objAt && between.every((s) => s >= 0 && slots[s].slot.agrees === r.slot.governs);
    if (!ok) issues.push({ code: 'word_order', slot: r.slot.id, expected: `${r.expected} ${slots[objIndex].expected}` });
  });
  // Most important first; for the same kind of error, the noun before the adjective that agrees with it.
  const agrees = (i: Issue) => (slots.find((r) => r.slot.id === i.slot)?.slot.agrees ? 1 : 0);
  issues.sort((x, y) => PRIORITY.indexOf(x.code) - PRIORITY.indexOf(y.code) || agrees(x) - agrees(y));
  if (!issues.length) return { grade: 'right', issues, cost: 0 };
  const g: Grade = issues.every((i) => i.code === 'misspelling') ? 'close' : 'wrong';
  return { grade: g, feedback: feedbackFor(issues[0], slots, words, diffs.get(issues[0])), issues, cost: a.cost + issues.length };
}

function wordsOf(parts: readonly string[]): Word[] {
  return parts.flatMap((p) => tokenize(p)).map((t) => ({ raw: t.raw, key: t.key, readings: analyse(t.raw) }));
}

const RANK: Record<Grade, number> = { right: 0, close: 1, wrong: 2 };

function gradeFrames(words: Word[], frames: Frame | readonly Frame[]): CheckResult {
  const list = 'slots' in frames ? [frames as Frame] : (frames as readonly Frame[]);
  let best: (CheckResult & { cost: number }) | null = null;
  for (const f of list) {
    const r = grade(words, f);
    if (!best || RANK[r.grade] < RANK[best.grade] || (r.grade === best.grade && r.cost < best.cost)) best = r;
  }
  const { cost: _cost, ...result } = best!;
  return result;
}

/** Step 4: a typed answer against a frame (or any of several frames). */
export function checkWrite(frame: Frame | readonly Frame[], text: string): CheckResult {
  return gradeFrames(wordsOf([text]), frame);
}

/** Step 2: tiles in the order the player put them. Any grammatical order is right. */
export function checkBuild(task: Pick<BuildTask, 'frame' | 'tiles'>, tiles: readonly string[]): CheckResult {
  // Only tiles on offer count; anything else is a bug in the UI, treated as an unknown word.
  const pool = [...task.tiles];
  const used = tiles.map((t) => {
    const i = pool.indexOf(t);
    if (i >= 0) pool.splice(i, 1);
    return i >= 0 ? t : `${t}?`;
  });
  return gradeFrames(wordsOf(used), task.frame);
}

/**
 * Step 3: the ending the player picked or typed (`am`, `-am`) or the whole word. The ending is the whole point of
 * this step, so a word that is no form of the lemma is `not_a_form` (never a near-miss `close`).
 */
export function checkEndings(task: Pick<EndingsTask, 'stem' | 'slot'>, answer: string): CheckResult {
  const a = answer.trim().replace(/^[-–]/, '');
  const frame: Frame = { slots: [task.slot] };
  if (!a) return gradeFrames([], frame);
  const word = fold(a).startsWith(fold(task.stem)) && fold(a).length > fold(task.stem).length ? a : task.stem + a;
  const [slot] = resolveFrame(frame);
  const ids = new Set(slot.entries.map((e) => e.id));
  if (!analyse(word).some((r) => ids.has(r.lemma))) {
    const issue: Issue = { code: 'not_a_form', slot: task.slot.id, word, expected: slot.expected };
    return { grade: 'wrong', feedback: feedbackFor(issue, [slot], []), issues: [issue] };
  }
  return gradeFrames(wordsOf([word]), frame);
}

/** Step 1: the option picked (index or text). Option feedback written by content wins over the default. */
export function checkChoose(task: Pick<ChooseTask, 'options'>, picked: number | string): CheckResult {
  const i = typeof picked === 'number' ? picked : task.options.findIndex((o) => o.text === picked);
  const opt = task.options[i];
  if (opt?.right) return { grade: 'right', issues: [] };
  const issue: Issue = { code: 'wrong_choice', word: opt?.text };
  const fb = opt?.feedback ?? feedbackFor(issue, [], []);
  return { grade: 'wrong', feedback: { code: 'wrong_choice', en: fb.en, fr: fb.fr }, issues: [issue] };
}

/** One entry point for every step of the ladder. */
export function check(task: Task, answer: Answer): CheckResult {
  switch (task.step) {
    case 'choose':
      return checkChoose(task, typeof answer === 'number' || typeof answer === 'string' ? answer : answer.join(' '));
    case 'build':
      return checkBuild(task, typeof answer === 'number' ? [String(answer)] : typeof answer === 'string' ? answer.split(/\s+/) : answer);
    case 'endings':
      return checkEndings(task, String(answer));
    case 'write':
      return checkWrite(task.frame, typeof answer === 'string' ? answer : Array.isArray(answer) ? answer.join(' ') : String(answer));
  }
}
