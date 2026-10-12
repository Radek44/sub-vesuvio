/**
 * All the game's conversations in one script, and who starts which. Conversation ids are global (unique
 * across districts); content tests lint every line and check every jump.
 */
import type { Script } from 'ymir/dialogue';
import { PROLOGUE, TALK_TO as PROLOGUE_TALK } from './prologue';
import { TOWNSFOLK, chatFor } from './townsfolk';
import { FORUM, FORUM_TALK } from './forum';
import { ABBONDANZA, ABBONDANZA_TALK } from './abbondanza';
import { QUESTS_TALK, QUEST_SCRIPT } from './quests';
import { TAGS, type TagKind } from '../art/people';
import type { Cond, Effect } from './types';

export const SCRIPT: Script<Cond, Effect> = { ...PROLOGUE, ...TOWNSFOLK, ...FORUM, ...ABBONDANZA, ...QUEST_SCRIPT };
export const TALK_TO: Record<string, string> = { ...PROLOGUE_TALK, ...FORUM_TALK, ...ABBONDANZA_TALK, ...QUESTS_TALK };

/** The conversation that starts when you act on `id` (a spot or a person), or null. Townsfolk chat by kind. */
export function talkFor(id: string, who?: string): string | null {
  if (TALK_TO[id]) return TALK_TO[id];
  const kind = who?.split(':')[0];
  return kind && kind in TAGS ? chatFor(kind as TagKind) : null;
}

export type { Cond, Effect, Objective } from './types';
