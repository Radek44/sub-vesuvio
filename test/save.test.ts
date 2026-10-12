/** The save survives updates: a real v1 save (the starter's) and a real v2 save (the Prologue's) load as v3. */
import { describe, expect, it } from 'vitest';
import { SAVE } from '../src/save';

describe('save', () => {
  it('migrates a version-1 save', () => {
    const v1 = { $v: 1, data: { bestMs: 21000, runs: 3, funnels: ['ftue:first_run'] } };
    const r = SAVE.load(JSON.stringify(v1));
    expect(r.status).toBe('migrated');
    expect(r.state).toEqual({ name: '', story: null, lang: 'en', funnels: ['ftue:first_run'] });
  });

  it('migrates a version-2 story (the Prologue) into the open city, and repairs junk in it', () => {
    const r = SAVE.load({ $v: 2, data: { name: 'Milo', lang: 'fr', funnels: [], story: { flags: ['passedGate', 3], objective: 'nowhere', answers: [{ id: 'quis-es', grade: 'right' }, { id: 1 }], seen: [], at: { x: 300, y: 44, z: 210, facing: 1 }, ferox: 'follow' } } });
    expect(r.status).toBe('migrated');
    expect(r.state.story).toEqual({
      flags: ['passedGate'], objective: 'gate', answers: [{ id: 'quis-es', grade: 'right' }], seen: [], at: { x: 300, y: 44, z: 210, facing: 1 }, ferox: 'follow',
      district: 'portaMarina', feroxDistrict: 'portaMarina', coins: 10, items: {}, quests: {}, visited: ['portaMarina'],
    });
    expect(r.state.lang).toBe('fr');
  });

  it('keeps the city: district, purse, satchel, quests; drops what no longer exists', () => {
    const story = { flags: [], objective: 'house', answers: [], seen: [], at: { x: 20, y: 41, z: 128, facing: 1 }, ferox: 'follow', district: 'forum', feroxDistrict: 'forum',
      coins: 7.4, items: { bread: 2, hat: 1, sword: 1, talus: 99 }, quests: { tali: 'back', panis: 'nowhere', ghost: 'done' }, visited: ['forum', 'atlantis'] };
    const r = SAVE.load({ $v: 3, data: { name: 'Lana', lang: 'en', funnels: [], story } });
    expect(r.status).toBe('current');
    expect(r.state.story).toMatchObject({ district: 'forum', feroxDistrict: 'forum', coins: 7, items: { bread: 2, hat: 1, talus: 4 }, quests: { tali: 'back' }, visited: ['portaMarina', 'forum'] });
  });

  it('has a migration for every version', () => {
    expect(SAVE.check()).toEqual([]);
  });
});
