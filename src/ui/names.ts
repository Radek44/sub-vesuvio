/**
 * What to call someone on screen: the cast by name and, where it helps, their trade in Latin; townsfolk by the
 * Latin for what they are, the way their name tags show it in the street. Latin first: the meaning comes
 * too only with translations on (save `glosses`).
 */
import { TAGS, type TagKind } from '../art/people';
import { ROLES } from '../content/ui';
import { district } from '../level';
import type { DistrictId } from '../level/types';

export interface Name {
  name: string;
  /** The name itself is Latin (a townsperson's tag). */
  la?: boolean;
  /** The trade, in Latin. */
  role?: string;
  /** What the Latin means, in the hint language (only with translations on). */
  gloss?: string;
}

export function nameOf(who: string, lang: 'en' | 'fr', glosses = false): Name {
  if (who === 'you' || who === 'hero') return { name: '' };
  const kind = who.split(':')[0] as TagKind;
  if (who.includes(':') && TAGS[kind]) {
    const t = TAGS[kind];
    return { name: t.la.charAt(0).toUpperCase() + t.la.slice(1), la: true, gloss: glosses ? t[lang] : undefined };
  }
  const r = ROLES[who];
  return { name: who, role: r?.la, gloss: r && glosses ? r[lang] : undefined };
}

/**
 * Who is really speaking: a townsperson's lines are written for their kind (`puella:0`); the one the hero
 * is talking to (`with`, an npc or walker id) has their own variant, so their own face.
 */
export function speakerOf(who: string, withId: string | undefined, at: DistrictId): string {
  if (!withId || !who.includes(':')) return who;
  const L = district(at);
  const p = L.npcs.find((n) => n.id === withId) ?? L.walkers.find((w) => w.id === withId);
  return p && p.who.split(':')[0] === who.split(':')[0] ? p.who : who;
}
