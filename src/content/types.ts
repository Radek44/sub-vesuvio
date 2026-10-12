/**
 * The vocabulary every piece of content shares: what a conversation can test (`Cond`) and what it can
 * do (`Effect`). The sim decides both; ymir/dialogue only carries them.
 */
import type { ChooseTask } from '../lingua';
import type { ItemId } from './items';

/** Conditions the sim tests. */
export type Cond =
  | { flag: string }
  | { not: string }
  /** Carrying at least `n` (default 1) of an item. */
  | { has: ItemId; n?: number }
  /** A side quest at this stage (or past it, with `past`). */
  | { quest: string; stage: string; past?: boolean };

/** Effects the sim applies. */
export type Effect =
  | { set: string }
  | { objective: Objective }
  | { ferox: 'sit' | 'follow' }
  | { give: ItemId; n?: number }
  | { take: ItemId; n?: number }
  | { coins: number }
  /** Move a side quest to a stage (the first stage starts it; `done` finishes it). */
  | { quest: string; stage: string };

export type Objective = 'gate' | 'house' | 'ferox' | 'door' | 'forum';

export const la = { la: true };
/** A step-1 answer task (choose one): the prompt's `data`. */
export const choose = (options: ChooseTask['options']): { task: ChooseTask } => ({ task: { step: 'choose', options } });
