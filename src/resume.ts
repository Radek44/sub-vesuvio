/**
 * From a save back to a game: a fresh start at the quay, then the story laid over it in whichever
 * district the hero was in. Pure (no DOM, no Three), so it is tested on every district.
 */
import { district } from './level';
import { create, type State } from './sim/sim';
import type { Story } from './save';

export function resume(name: string, st: Story | null): State {
  // Always made at Porta Marina: the quay spawn, Ferox's threshold and the arrival live there.
  const sim = create(name || 'Marcus', district('portaMarina'));
  if (!st) return sim;
  const L = district(st.district);
  let ferox = { ...sim.ferox, mode: st.ferox, district: st.feroxDistrict };
  if (st.ferox === 'follow') {
    // at the hero's heel, wherever the hero is
    const fx = st.at.x - 10;
    ferox = { ...ferox, district: st.district, body: { x: fx, y: L.groundAt(fx, st.at.z), z: st.at.z, vy: 0, grounded: true } };
  } else if (st.feroxDistrict !== 'portaMarina') {
    // left sitting in another district: he waits where that district is entered (the save keeps no spot)
    const F = district(st.feroxDistrict);
    const sp = Object.values(F.spawns)[0];
    ferox = { ...ferox, body: { x: sp.x, y: F.groundAt(sp.x, sp.z), z: sp.z, vy: 0, grounded: true } };
  }
  return {
    ...sim, district: st.district, flags: st.flags, objective: st.objective, answers: st.answers, seen: st.seen, talk: null,
    coins: st.coins, items: st.items, quests: st.quests, visited: st.visited,
    hero: { x: st.at.x, y: st.at.y, z: st.at.z, vy: 0, grounded: true }, facing: st.at.facing, ferox,
  };
}
