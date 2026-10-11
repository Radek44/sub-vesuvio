/** The save survives updates: a real v1 save (the starter's) loads as v2 with its funnel steps kept. */
import { describe, expect, it } from 'vitest';
import { SAVE } from '../src/save';

describe('save', () => {
  it('migrates a version-1 save', () => {
    const v1 = { $v: 1, data: { bestMs: 21000, runs: 3, funnels: ['ftue:first_run'] } };
    const r = SAVE.load(JSON.stringify(v1));
    expect(r.status).toBe('migrated');
    expect(r.state).toEqual({ name: '', story: null, lang: 'en', funnels: ['ftue:first_run'] });
  });

  it('keeps a story, and repairs junk in one', () => {
    const r = SAVE.load({ $v: 2, data: { name: 'Milo', lang: 'fr', funnels: [], story: { flags: ['passedGate', 3], objective: 'nowhere', answers: [{ id: 'quis-es', grade: 'right' }, { id: 1 }], seen: [], at: { x: 300, y: 44, z: 210, facing: 1 }, ferox: 'follow' } } });
    expect(r.status).toBe('current');
    expect(r.state.story).toEqual({ flags: ['passedGate'], objective: 'gate', answers: [{ id: 'quis-es', grade: 'right' }], seen: [], at: { x: 300, y: 44, z: 210, facing: 1 }, ferox: 'follow' });
    expect(r.state.lang).toBe('fr');
  });

  it('has a migration for every version', () => {
    expect(SAVE.check()).toEqual([]);
  });
});
