/** Via dell'Abbondanza's conversations (placeholder until the district is written). */
import type { Script } from 'ymir/dialogue';
import type { Cond, Effect } from './types';

export const ABBONDANZA: Script<Cond, Effect> = {};
/** Spot or npc id → conversation id, for this district. */
export const ABBONDANZA_TALK: Record<string, string> = {};
