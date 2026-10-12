/**
 * The Prologue, played headless: a bot walks from the harbour to the gate, answers the toll collector,
 * finds the house of the dog, commands Ferox and finds the tablet. Then: wrong answers never block,
 * the gate holds until answered, and one seed and one stream of inputs always play the same game.
 */
import { describe, expect, it } from 'vitest';
import { determinism } from 'ymir/testkit';
import { create, interactables, sim, step, type Input, type State } from '../src/sim/sim';
import { GATE, portaMarina } from '../src/level/portaMarina';

const level = portaMarina();
const run = (s: State, input: Input, steps = 1) => { for (let i = 0; i < steps; i++) s = step(s, input, level); return s; };
/** Click through lines until a prompt or the end of the conversation. */
function talkThrough(s: State, answers: number[] = []): State {
  for (let guard = 0; s.talk && guard < 200; guard++) {
    const before = s;
    s = run(s, { x: 0, z: 0, act: true });
    if (s.talk && before.talk && s.talk.cursor === before.talk.cursor) {
      // a prompt: answer it
      const a = answers.shift();
      if (a === undefined) return s;
      s = run(s, { x: 0, z: 0, answer: a });
    }
  }
  return s;
}
/** Walk toward a point (voxels) until within `r`, steering around nothing (the street is straight). */
function walkTo(s: State, x: number, z: number, r = 8, max = 60 * 60): State {
  for (let i = 0; i < max && !s.talk; i++) {
    const dx = x - s.hero.x, dz = z - s.hero.z, d = Math.hypot(dx, dz);
    if (d < r) break;
    s = run(s, { x: dx / d, z: dz / d, run: true });
  }
  return s;
}

describe('the Prologue', () => {
  it('can be played from the harbour to the tablet', () => {
    let s = create('Milo', level);
    expect(s.talk?.script).toBe('arrival');
    s = talkThrough(s);
    expect(s.talk).toBeNull();
    expect(s.objective).toBe('gate');
    // up the road: the toll collector stops us by himself
    s = walkTo(s, GATE.x0 + 20, 216);
    expect(s.talk?.script).toBe('portitor');
    expect(s.hero.x).toBeLessThan(GATE.x0);
    // «Salvē! Milo sum.» then «Epistulam portō.»
    s = talkThrough(s, [0, 0]);
    expect(s.flags).toContain('passedGate');
    expect(s.objective).toBe('house');
    expect(s.answers.map((a) => a.grade)).toEqual(['right', 'right']);
    // through the gate and up Via Marina to the dog
    const dog = level.npcs.find((n) => n.who === 'Ferox')!;
    s = walkTo(s, GATE.x1 + 10, 216, 6);
    expect(s.talk).toBeNull();
    s = walkTo(s, dog.x, 194, 6);
    expect(Math.hypot(s.hero.x - dog.x, s.hero.z - dog.z)).toBeLessThan(20);
    // face the dog and act
    s = run(s, { x: 0, z: -1 }, 2);
    s = run(s, { x: 0, z: 0, act: true });
    expect(s.talk?.script).toBe('ferox');
    s = talkThrough(s, [0, 0]);
    expect(s.ferox.mode).toBe('follow');
    expect(s.objective).toBe('door');
    // into the doorway: Ferox no longer blocks it; knock
    const door = interactables(level).find((i) => i.id === 'door')!;
    s = walkTo(s, door.x, door.z + 4, 4);
    s = run(s, { x: 0, z: -1 }, 2);
    s = run(s, { x: 0, z: 0, act: true });
    expect(s.talk?.script).toBe('door');
    s = talkThrough(s);
    expect(s.flags).toContain('foundTablet');
    expect(s.objective).toBe('forum');
    expect(sim.over?.(s)).toBe(true);
  });

  it('a wrong answer is explained and retried, never a dead end', () => {
    let s = talkThrough(create('Lana', level));
    s = walkTo(s, GATE.x0 + 20, 216);
    // first a wrong answer («Valē!»), then the right one
    s = talkThrough(s, [1]);
    // back at the question, the explanation of the wrong answer is waiting above the options
    expect(s.talk?.cursor.node).toBe('portitor-ask');
    expect(s.talk?.result).toBe('wrong');
    expect(s.talk?.feedback?.code).toBe('wrong_choice');
    expect(s.talk?.feedback?.en).toMatch(/goodbye/);
    s = talkThrough(s, [0, 1, 0]);
    expect(s.flags).toContain('passedGate');
    expect(s.answers.map((a) => a.grade)).toEqual(['wrong', 'right', 'wrong', 'right']);
  });

  it('the gate holds until the toll collector is answered', () => {
    let s = talkThrough(create('Lana', level));
    s = walkTo(s, GATE.x0 + 20, 216);
    // walk away from the conversation without answering: the hero can't get through
    s = run(s, { x: 1, z: 0, run: true }, 600);
    expect(s.hero.x).toBeLessThan(GATE.x0);
  });

  it('is deterministic', () => {
    const policy = (_s: State, i: number): Input => (i % 120 < 5 ? { x: 0, z: 0, act: true, answer: i % 3 } : { x: Math.sin(i / 50), z: Math.cos(i / 70) * 0.3, run: i % 300 > 150 });
    expect(determinism(sim, 7, 1500, policy)).toBeNull();
  });
});
