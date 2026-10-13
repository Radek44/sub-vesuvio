/** The save survives updates: real v1 (the starter's), v2 (the Prologue's) and v3 (the open city's) saves load as v4. */
import { describe, expect, it } from 'vitest';
import { SAVE } from '../src/save';

describe('save', () => {
  it('migrates a version-1 save', () => {
    const v1 = { $v: 1, data: { bestMs: 21000, runs: 3, funnels: ['ftue:first_run'] } };
    const r = SAVE.load(JSON.stringify(v1));
    expect(r.status).toBe('migrated');
    expect(r.state).toEqual({ name: '', story: null, lang: 'en', glosses: false, funnels: ['ftue:first_run'] });
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
    const r = SAVE.load({ $v: 4, data: { name: 'Lana', lang: 'en', glosses: true, funnels: [], story } });
    expect(r.status).toBe('current');
    expect(r.state.glosses).toBe(true);
    expect(r.state.story).toMatchObject({ district: 'forum', feroxDistrict: 'forum', coins: 7, items: { bread: 2, hat: 1, talus: 4 }, quests: { tali: 'back' }, visited: ['portaMarina', 'forum'] });
  });

  it('migrates a real version-3 save (the open city) to Latin-first labels, keeping everything else', () => {
    // as written by the game at f5ae7eb: Lana in the Forum with Ferox, a quest under way, hints in French
    const v3 = '{"$v":3,"data":{"name":"Lana","story":{"flags":["passedGate","feroxFollows","foundTablet"],"objective":"forum","answers":[{"id":"quis-es","grade":"right"},{"id":"ferox-sede","grade":"wrong"},{"id":"ferox-sede","grade":"right"}],"seen":["arrival","portitor","ferox"],"at":{"x":320.5,"y":41,"z":300.25,"facing":3.14},"ferox":"follow","district":"forum","feroxDistrict":"forum","coins":7,"items":{"bread":1,"talus":2},"quests":{"tali":"search"},"visited":["portaMarina","forum"]},"lang":"fr","funnels":["ftue:named","ftue:first_talk"]}}';
    const r = SAVE.load(v3);
    expect(r.status).toBe('migrated');
    expect(r.state.glosses).toBe(false);
    expect(r.state.lang).toBe('fr');
    expect(r.state.story).toMatchObject({ district: 'forum', objective: 'forum', coins: 7, items: { bread: 1, talus: 2 }, quests: { tali: 'search' }, ferox: 'follow' });
  });

  it('has a migration for every version', () => {
    expect(SAVE.check()).toEqual([]);
  });
});
