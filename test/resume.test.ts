/** Continue works wherever the hero was saved: every district, Ferox following or left behind. */
import { describe, expect, it } from 'vitest';
import { resume } from '../src/resume';
import { district } from '../src/level';
import { step, IDLE } from '../src/sim/sim';
import type { Story } from '../src/save';
import type { DistrictId } from '../src/level/types';

const story = (d: DistrictId, ferox: Story['ferox'], feroxDistrict: DistrictId = d): Story => {
  const sp = Object.values(district(d).spawns)[0];
  return {
    flags: ['passedGate', 'feroxFollows'], objective: 'forum', answers: [], seen: ['arrival'],
    at: { x: sp.x, y: district(d).groundAt(sp.x, sp.z), z: sp.z, facing: sp.facing }, ferox,
    district: d, feroxDistrict, coins: 7, items: { bread: 2 }, quests: { tali: 'done' }, visited: ['portaMarina', d],
  };
};

describe('resume', () => {
  for (const d of ['portaMarina', 'forum', 'abbondanza'] as DistrictId[]) {
    it(`continues a game saved in ${d}, Ferox at heel, and plays on`, () => {
      const s = resume('Milo', story(d, 'follow'));
      expect(s.district).toBe(d);
      expect(s.talk).toBeNull();
      expect(s.ferox.district).toBe(d);
      expect(Math.hypot(s.ferox.body.x - s.hero.x, s.ferox.body.z - s.hero.z)).toBeLessThan(14);
      expect(s.coins).toBe(7);
      expect(s.items).toEqual({ bread: 2 });
      // and the sim runs on from there
      let t = s;
      for (let i = 0; i < 30; i++) t = step(t, IDLE);
      expect(t.district).toBe(d);
    });
  }

  it('Ferox left sitting in the Forum waits there while the hero is at the harbour', () => {
    const s = resume('Lana', story('portaMarina', 'sit', 'forum'));
    expect(s.ferox.district).toBe('forum');
    expect(s.ferox.mode).toBe('sit');
  });

  it('no story is a new journey at the quay, in the arrival conversation', () => {
    const s = resume('Lana', null);
    expect(s.district).toBe('portaMarina');
    expect(s.talk?.script).toBe('arrival');
  });
});
