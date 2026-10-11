/**
 * Via dell'Abbondanza (placeholder until the district is built): the long shopping street east of the
 * Forum. Contract: spawn `west` (arriving from the Forum); exit west to the Forum (`east`).
 */
import type { Level, Spawn } from './types';
import { stubDistrict } from './stub';

export const SPAWNS: Record<string, Spawn> = {
  west: { x: 14, y: 41, z: 128, facing: Math.PI / 2 },
};

export function buildAbbondanza(): Level {
  return stubDistrict('abbondanza', { la: 'Via dell’Abbondanza', en: 'Via dell’Abbondanza', fr: 'La Via dell’Abbondanza' }, [
    { id: 'to-forum', to: 'forum', arrive: 'east', x0: 0, x1: 3, z0: 100, z1: 156, label: { en: 'To the Forum', fr: 'Vers le Forum' } },
  ], SPAWNS);
}
