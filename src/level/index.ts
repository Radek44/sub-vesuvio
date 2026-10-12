/**
 * Every district of the city, built on demand and kept while in use. Building one takes about a second,
 * so the game keeps the current district and the last one (walking back is instant). Pure. (Spawns are read from the built level: this module is imported by the districts themselves.)
 */
import type { DistrictId, Level } from './types';
import { buildPortaMarina } from './portaMarina';
import { buildForum } from './forum';
import { buildAbbondanza } from './abbondanza';

export const DISTRICTS: Record<DistrictId, { build: () => Level; name: { la: string; en: string; fr: string } }> = {
  portaMarina: { build: buildPortaMarina, name: { la: 'Porta Marina', en: 'The Sea Gate', fr: 'La porte de la Mer' } },
  forum: { build: buildForum, name: { la: 'Forum', en: 'The Forum', fr: 'Le Forum' } },
  abbondanza: { build: buildAbbondanza, name: { la: 'Via dell’Abbondanza', en: 'Via dell’Abbondanza', fr: 'La Via dell’Abbondanza' } },
};

const built = new Map<DistrictId, Level>();
/** The district, built once and kept (at most two at a time). */
export function district(id: DistrictId): Level {
  let l = built.get(id);
  if (!l) {
    l = DISTRICTS[id].build();
    built.set(id, l);
    while (built.size > 2) built.delete(built.keys().next().value!);
  } else { built.delete(id); built.set(id, l); } // most recent last
  return l;
}

export type { DistrictId, Level, Spawn } from './types';
