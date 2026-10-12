/**
 * What to call someone on screen: the cast by name (and trade, where it helps), townsfolk by the Latin for
 * what they are with its meaning beside it, the way their name tags show it in the street.
 */
import { TAGS, type TagKind } from '../art/people';
import { district } from '../level';
import type { DistrictId } from '../level/types';

const ROLES: Record<string, { en: string; fr: string }> = {
  Sextus: { en: 'the toll collector', fr: 'le péager' },
  Faustus: { en: 'wine seller', fr: 'marchand de vin' },
  Modestus: { en: 'baker', fr: 'boulanger' },
  Celsus: { en: 'mason', fr: 'tailleur de pierre' },
  Vibia: { en: 'cook', fr: 'cuisinière' },
};

export interface Name { name: string; la?: boolean; role?: string }

export function nameOf(who: string, lang: 'en' | 'fr'): Name {
  if (who === 'you' || who === 'hero') return { name: '' };
  const kind = who.split(':')[0] as TagKind;
  if (who.includes(':') && TAGS[kind]) { const t = TAGS[kind]; return { name: t.la.charAt(0).toUpperCase() + t.la.slice(1), la: true, role: t[lang] }; }
  return { name: who, role: ROLES[who]?.[lang] };
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
