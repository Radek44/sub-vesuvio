/**
 * What survives between sessions, versioned (ymir/core `defineSave`). When the shape changes: bump
 * `version`, add `migrate: { 2: (v1) => v2 }`, and add a test that loads a real v1 save.
 * Never rename a field without a migration: a renamed field is a wiped save.
 */
import { defineSave } from 'ymir/core';

export interface Save {
  /** Fastest win, in ms (0 = none yet). */
  bestMs: number;
  runs: number;
  /** Player-scoped funnel steps already sent (ymir/analytics `persisted`), so `first_win` fires once per player, not per session. */
  funnels: string[];
}

export const SAVE = defineSave<Save>({
  version: 1,
  initial: () => ({ bestMs: 0, runs: 0, funnels: [] }),
  normalize: (s) => ({
    bestMs: Math.max(0, Number(s.bestMs) || 0),
    runs: Math.max(0, Math.floor(Number(s.runs) || 0)),
    funnels: Array.isArray(s.funnels) ? s.funnels.filter((k) => typeof k === 'string') : [],
  }),
});
