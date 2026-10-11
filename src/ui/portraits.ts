/**
 * Dialogue portraits drawn from the same voxel characters the world uses (ymir/three `renderPortraits`),
 * so a face in a conversation always matches the person standing in the street. Rendered once, at boot.
 */
import { renderModels, renderPortraits } from 'ymir/three';
import { CAST, PEOPLE_VOX, buildOf, kitOf } from '../art/people';
import { dogHead } from '../art/dog';

let cache: Record<string, string> | null = null;

export function portraits(): Record<string, string> {
  if (cache) return cache;
  const people = renderPortraits(Object.entries(CAST).map(([id, p]) => ({ id, build: buildOf(p), kit: kitOf(p), key: `portrait:${id}`, voxel: PEOPLE_VOX })), { size: 192, yaw: 0.3 });
  const dog = renderModels([{ id: 'Ferox', model: dogHead(), key: 'portrait:ferox' }], { size: 192, yaw: 0.5, pitch: 0.15 });
  cache = { ...people, ...dog, you: people.hero };
  return cache;
}
