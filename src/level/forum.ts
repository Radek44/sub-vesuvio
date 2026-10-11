/**
 * The Forum (placeholder until the district is built): Pompeii's civic heart, east of Porta Marina.
 * Contract: spawn `west` (arriving from Porta Marina), spawn `east` (from Via dell'Abbondanza); exits west
 * to Porta Marina (`east`) and east to Via dell'Abbondanza (`west`).
 */
import type { Level, Spawn } from './types';
import { stubDistrict } from './stub';

export const SPAWNS: Record<string, Spawn> = {
  west: { x: 14, y: 41, z: 128, facing: Math.PI / 2 },
  east: { x: 306, y: 41, z: 128, facing: -Math.PI / 2 },
};

export function buildForum(): Level {
  return stubDistrict('forum', { la: 'Forum', en: 'The Forum', fr: 'Le Forum' }, [
    { id: 'to-portaMarina', to: 'portaMarina', arrive: 'east', x0: 0, x1: 3, z0: 100, z1: 156, label: { en: 'To the sea gate', fr: 'Vers la porte de la Mer' } },
    { id: 'to-abbondanza', to: 'abbondanza', arrive: 'west', x0: 316, x1: 319, z0: 100, z1: 156, label: { en: 'To Via dell’Abbondanza', fr: 'Vers la Via dell’Abbondanza' } },
  ], SPAWNS);
}
