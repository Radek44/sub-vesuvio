/**
 * What's on screen while playing: the objective (a painted label, top left), Vesuvius and its plume (top
 * right: how much time the city has), the action prompt over the hero, and on touch screens the stick
 * and an action button. Kept small: the town is the picture.
 */
import { Joystick, useStore } from 'ymir/ui';
import { OBJECTIVES } from '../content/prologue';
import { input, queue, store } from '../game';

const VERBS = {
  en: { speak: 'Speak', read: 'Read', look: 'Look', drink: 'Drink', enter: 'Enter', command: 'Command Ferox', knock: 'Knock' },
  fr: { speak: 'Parler', read: 'Lire', look: 'Regarder', drink: 'Boire', enter: 'Entrer', command: 'Commander Ferox', knock: 'Frapper' },
} as const;

/** Vesuvius as a little emblem, its plume as tall as this chapter's (0–1). */
function Plume({ size }: { size: number }) {
  const h = 6 + size * 26;
  return (
    <svg className="plume" viewBox="0 0 64 48" aria-label="Vesuvius" role="img">
      <path d={`M30 ${30 - h * 0.2} C 26 ${26 - h * 0.6}, 36 ${24 - h * 0.8}, 32 ${22 - h}`} fill="none" stroke="#efe9df" strokeWidth={3 + size * 6} strokeLinecap="round" opacity="0.9" />
      <path d="M2 46 L22 26 Q 30 20 38 26 L 62 46 Z" fill="#6f8a6a" />
      <path d="M22 26 Q 30 20 38 26 L 34 30 Q 30 27 26 30 Z" fill="#8a8a86" />
    </svg>
  );
}

export function Hud() {
  const objective = useStore(store, (v) => v.sim.objective);
  const talking = useStore(store, (v) => !!v.sim.talk);
  const prompt = useStore(store, (v) => v.prompt);
  const lang = useStore(store, (v) => v.save.lang);
  const touch = useStore(store, (v) => v.touch);
  return (
    <>
      <div className={`objective${talking ? ' dim' : ''}`} data-ui="objective">
        <span className="kicker">{lang === 'fr' ? 'Objectif' : 'Objective'}</span>
        <span>{OBJECTIVES[objective][lang]}</span>
      </div>
      <div className="vesuvius" title="Vesuvius"><Plume size={0.05} /></div>
      {prompt && !talking && (
        <div className="act" data-ui="prompt" style={{ transform: `translate(${prompt.x}px, ${prompt.y}px)` }}>
          <kbd>{touch ? '●' : 'E'}</kbd>{VERBS[lang][prompt.verb as keyof (typeof VERBS)['en']] ?? prompt.verb}
        </div>
      )}
      {!talking && (
        <Joystick onMove={(x, y) => input.touchMove(x, y)}>{null}</Joystick>
      )}
      {touch && !talking && <button type="button" className="act-btn" onClick={() => queue({ act: true })} aria-label="Act">●</button>}
    </>
  );
}

export function Loading() {
  const p = useStore(store, (v) => v.loading);
  const lang = useStore(store, (v) => v.save.lang);
  return (
    <div className="loading" data-ui="loading">
      <span>{lang === 'fr' ? 'On bâtit Pompéi…' : 'Building Pompeii…'}</span>
      <div className="bar"><i style={{ width: `${Math.round(p * 100)}%` }} /></div>
    </div>
  );
}
