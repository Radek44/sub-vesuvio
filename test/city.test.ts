/**
 * The open city, headless: streets go on into the next district (Ferox comes if he follows), shops sell
 * what you can afford and carry, things in the street can be picked up once, side quests move on by
 * themselves when you have what's needed, and the townsfolk walk the same loop every time.
 */
import { describe, expect, it } from 'vitest';
import { create, interactables, step, travel, walkerAt, type Input, type State } from '../src/sim/sim';
import { DISTRICTS, district } from '../src/level';
import { portaMarina } from '../src/level/portaMarina';
import { ITEMS, START_COINS } from '../src/content/items';
import { QUESTS } from '../src/content/quests';

const level = portaMarina();
const run = (s: State, input: Input, steps = 1) => { for (let i = 0; i < steps; i++) s = step(s, input); return s; };
/** Past the arrival and the gate, free to roam (flags as the Prologue leaves them). */
const roaming = (name = 'Milo'): State => ({ ...create(name, level), talk: null, flags: ['passedGate'], objective: 'house' });
const at = (s: State, x: number, z: number): State => ({ ...s, hero: { ...s.hero, x, z, y: level.groundAt(x, z) } });
const actAt = (s: State, id: string): State => {
  const t = interactables(level, s).find((i) => i.id === id)!;
  s = at(s, t.x, t.z + 3);
  s = run(s, { x: 0, z: -1 }, 1);
  return run(s, { x: 0, z: 0, act: true });
};

describe('the open city', () => {
  it('walking off the end of Via Marina arrives in the Forum, and back', () => {
    let s = roaming();
    const exit = level.exits.find((e) => e.to === 'forum')!;
    s = at(s, exit.x0 - 6, (exit.z0 + exit.z1) / 2);
    s = run(s, { x: 1, z: 0, run: true }, 60);
    expect(s.district).toBe('forum');
    expect(s.visited).toEqual(['portaMarina', 'forum']);
    const forum = district('forum');
    const back = forum.exits.find((e) => e.to === 'portaMarina')!;
    s = { ...s, hero: { ...s.hero, x: back.x1 + 6, z: (back.z0 + back.z1) / 2 } };
    s = run(s, { x: -1, z: 0, run: true }, 60);
    expect(s.district).toBe('portaMarina');
    expect(s.hero.x).toBeGreaterThan(level.width / 2);
  });

  it('Ferox comes along only when he follows', () => {
    const s = roaming();
    expect(travel(s, 'forum', 'west').ferox.district).toBe('portaMarina');
    const f = travel({ ...s, ferox: { ...s.ferox, mode: 'follow' } }, 'forum', 'west');
    expect(f.ferox.district).toBe('forum');
    expect(Math.hypot(f.ferox.body.x - f.hero.x, f.ferox.body.z - f.hero.z)).toBeLessThan(14);
  });

  it('shops sell what you can afford and carry', () => {
    let s = actAt(roaming(), 'shop:baker');
    expect(s.shop).toBe('baker');
    const price = level.shops.find((x) => x.id === 'baker')!.stock.find((x) => x.item === 'bread')!.price;
    s = run(s, { x: 0, z: 0, buy: 'bread' });
    expect(s.items.bread).toBe(1);
    expect(s.coins).toBe(START_COINS - price);
    // spend it all: the shop stops selling when the purse is empty, never goes below zero
    s = run(s, { x: 0, z: 0, buy: 'bread' }, 30);
    expect(s.coins).toBeGreaterThanOrEqual(0);
    expect(s.items.bread).toBeLessThanOrEqual(ITEMS.bread.max);
    // something the baker doesn't sell
    const before = s;
    s = run(s, { x: 0, z: 0, buy: 'sandals' });
    expect(s.items).toEqual(before.items);
    s = run(s, { x: 0, z: 0, close: true });
    expect(s.shop).toBeNull();
  });

  it('the townsfolk walk the same loop every time', () => {
    for (const w of level.walkers) {
      const a = walkerAt(w, 12_345), b = walkerAt(w, 12_345 + 16);
      expect(a).toEqual(walkerAt(w, 12_345));
      expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeLessThan(2);
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.x).toBeLessThan(level.width);
    }
  });

  it('the townsfolk walk on the ground: no step along any loop higher than a person can step', () => {
    const all: string[] = [];
    for (const id of Object.keys(DISTRICTS) as (keyof typeof DISTRICTS)[]) {
      const L = district(id);
      for (const w of L.walkers) {
        const bad: string[] = [];
        for (let i = 0; i < w.path.length; i++) {
          const [ax, az] = w.path[i], [bx, bz] = w.path[(i + 1) % w.path.length];
          const n = Math.ceil(Math.hypot(bx - ax, bz - az));
          let last = L.groundAt(ax, az);
          for (let k = 1; k <= n; k++) {
            const x = ax + ((bx - ax) * k) / n, z = az + ((bz - az) * k) / n, g = L.groundAt(x, z);
            if (Math.abs(g - last) > 3) bad.push(`${x.toFixed(0)},${z.toFixed(0)}: ${last}→${g}`);
            last = g;
          }
        }
        if (bad.length) all.push(`${id}/${w.id}: ${bad.slice(0, 3).join('; ')}`);
      }
    }
    expect(all).toEqual([]);
  });

  it('Lucius’s knucklebones: find four, count them in Latin, get paid', () => {
    let s = actAt(roaming(), 'kids');
    expect(s.talk?.script).toBe('q-tali');
    for (let i = 0; i < 20 && s.talk; i++) s = run(s, { x: 0, z: 0, act: true });
    expect(s.quests.tali).toBe('search');
    const bones = interactables(level, s).filter((i) => i.take === 'talus');
    expect(bones).toHaveLength(4);
    for (const b of bones) s = actAt(s, b.id);
    expect(s.items.talus).toBe(4);
    // picked up once: they're gone from the street
    expect(interactables(level, s).filter((i) => i.take === 'talus')).toHaveLength(0);
    expect(s.quests.tali).toBe('back');
    s = actAt(s, 'kids');
    for (let i = 0; i < 20 && s.talk; i++) {
      const before = s.talk!.cursor;
      s = run(s, { x: 0, z: 0, act: true });
      // a wrong count first («Trēs»), then the right one
      if (s.talk && s.talk.cursor === before) s = run(s, { x: 0, z: 0, answer: s.answers.length ? 0 : 1 });
    }
    expect(s.quests.tali).toBe('done');
    expect(s.items.talus).toBeUndefined();
    expect(s.coins).toBe(START_COINS + 4);
    expect(s.answers.map((a) => a.grade)).toEqual(['wrong', 'right']);
  });

  it('every quest stage the journal names exists, and every quest ends in done', () => {
    for (const q of Object.values(QUESTS)) {
      expect(q.order.at(-1)).toBe('done');
      for (const st of q.order) expect(q.stages[st]).toBeTruthy();
      for (const a of q.advance ?? []) { expect(q.order).toContain(a.from); expect(q.order).toContain(a.to); }
    }
  });
});
