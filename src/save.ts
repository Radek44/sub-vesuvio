/**
 * What survives between sessions, versioned (ymir/core `defineSave`). When the shape changes: bump
 * `version`, add a migration, and add a test that loads a real save of the old version (test/save.test.ts).
 * Never rename a field without a migration: a renamed field is a wiped save.
 *
 * - v1 (the starter's coin game): bestMs, runs, funnels.
 * - v2: the hero's name, the story so far (flags, objective, answers), where the hero stands, Ferox's mood,
 *   and settings (hint language).
 */
import { defineSave } from 'ymir/core';
import type { Grade } from './lingua';
import type { Objective } from './content/prologue';

export interface Story {
  flags: string[];
  objective: Objective;
  answers: { id: string; grade: Grade }[];
  seen: string[];
  at: { x: number; y: number; z: number; facing: number };
  ferox: 'guard' | 'sit' | 'follow';
}
export interface Save {
  /** The hero's name (chosen on the title screen). Empty = a new game. */
  name: string;
  story: Story | null;
  /** Hints and feedback in English or French. */
  lang: 'en' | 'fr';
  /** Player-scoped funnel steps already sent (ymir/analytics `persisted`). */
  funnels: string[];
}

const OBJECTIVES = new Set(['gate', 'house', 'ferox', 'door', 'forum']);
const strings = (a: unknown): string[] => (Array.isArray(a) ? a.filter((k): k is string => typeof k === 'string') : []);
const num = (n: unknown, d = 0) => (typeof n === 'number' && Number.isFinite(n) ? n : d);

function story(s: unknown): Story | null {
  if (!s || typeof s !== 'object') return null;
  const o = s as Partial<Story>;
  const at = (o.at ?? {}) as Partial<Story['at']>;
  return {
    flags: strings(o.flags),
    objective: OBJECTIVES.has(o.objective as string) ? (o.objective as Objective) : 'gate',
    answers: Array.isArray(o.answers) ? o.answers.filter((a) => a && typeof a.id === 'string' && ['right', 'close', 'wrong'].includes(a.grade)) : [],
    seen: strings(o.seen),
    at: { x: num(at.x, 24), y: num(at.y, 12), z: num(at.z, 216), facing: num(at.facing, Math.PI / 2) },
    ferox: o.ferox === 'follow' || o.ferox === 'sit' ? o.ferox : 'guard',
  };
}

export const SAVE = defineSave<Save>({
  version: 2,
  initial: () => ({ name: '', story: null, lang: 'en', funnels: [] }),
  migrate: {
    // From the starter: nothing of the coin game carries over but the funnel steps already sent.
    2: (v1: { funnels?: unknown }) => ({ name: '', story: null, lang: 'en', funnels: strings(v1?.funnels) }),
  },
  normalize: (s) => ({
    name: typeof s.name === 'string' ? s.name.slice(0, 20) : '',
    story: story(s.story),
    lang: s.lang === 'fr' ? 'fr' : 'en',
    funnels: strings(s.funnels),
  }),
});
