/**
 * Pictures drawn from the same voxel models the world uses, so what's on a screen always matches what's in
 * the street: dialogue portraits (ymir/three `renderPortraits`), rendered in batches as people are met,
 * and item icons for the shop and the satchel (`renderModels`), rendered once.
 */
import { renderModels, renderPortraits } from 'ymir/three';
import { CAST, PEOPLE_VOX, buildOf, kitOf, personFor } from '../art/people';
import { dogHead } from '../art/dog';
import { ITEM_IDS, itemModel } from '../art/items';

const faces: Record<string, string> = {};

/** Portraits for these speakers (cast names or `kind:variant`), rendering the ones not drawn yet in one batch. */
export function portraits(whos: readonly string[] = Object.keys(CAST)): Record<string, string> {
  const missing = [...new Set(whos)].filter((w) => !(w in faces) && w !== 'you' && w !== 'Ferox' && personFor(w));
  if (missing.length) {
    const out = renderPortraits(missing.map((id) => { const p = personFor(id)!; return { id, build: buildOf(p), kit: kitOf(p), key: `portrait:${id}`, voxel: PEOPLE_VOX }; }), { size: 192, yaw: 0.3 });
    for (const id of missing) faces[id] = out[id] ?? '';
  }
  if (!('Ferox' in faces)) faces.Ferox = renderModels([{ id: 'Ferox', model: dogHead(), key: 'portrait:ferox' }], { size: 192, yaw: 0.5, pitch: 0.15 }).Ferox ?? '';
  if (!('hero' in faces)) Object.assign(faces, portraits(['hero']));
  faces.you = faces.hero;
  return faces;
}

let icons: Record<string, string> | null = null;
/** Every item's icon, drawn once. */
export function itemIcons(): Record<string, string> {
  icons ??= renderModels(ITEM_IDS.map((id) => ({ id, model: itemModel(id), key: `icon:${id}` })), { size: 112, yaw: 0.62, pitch: 0.55, pad: 0.12 });
  return icons;
}
