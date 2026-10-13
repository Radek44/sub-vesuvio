/**
 * What's on screen while playing: the objective (a painted label, top left), Vesuvius and its plume (top
 * right: how much time the city has), the action prompt over the hero, and on touch screens the stick
 * and an action button. Kept small: the town is the picture.
 */
import { useMemo } from 'react';
import { Joystick, useStore } from 'ymir/ui';
import { OBJECTIVES } from '../content/prologue';
import { PANEL_LATIN, VERB_LATIN } from '../content/ui';
import { dismissToast, input, openPanel, queue, setGlosses, store } from '../game';
import { DISTRICTS } from '../level';
import { itemIcons } from './portraits';
import { Purse } from './Purse';

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
  const talking = useStore(store, (v) => !!v.sim.talk || !!v.sim.shop);
  const coins = useStore(store, (v) => v.sim.coins);
  const at = useStore(store, (v) => v.sim.district);
  const open = useStore(store, (v) => v.sim.quests);
  const tasks = Object.values(open).filter((s) => s !== 'done').length;
  const prompt = useStore(store, (v) => v.prompt);
  const lang = useStore(store, (v) => v.save.lang);
  const touch = useStore(store, (v) => v.touch);
  const glosses = useStore(store, (v) => v.save.glosses);
  return (
    <>
      <div className={`objective${talking ? ' dim' : ''}`} data-ui="objective">
        <span className="kicker">{lang === 'fr' ? 'Objectif' : 'Objective'}</span>
        <span>{OBJECTIVES[objective][lang]}</span>
        <span className="where" data-ui="district">{DISTRICTS[at].name[lang]}</span>
      </div>
      <div className="vesuvius" title="Vesuvius"><Plume size={0.05} /></div>
      <div className={`hud-right${talking ? ' dim' : ''}`}>
        <Purse coins={coins} lang={lang} />
        <div className="hud-buttons">
          {(['bag', 'journal', 'map'] as const).map((p) => (
            <button key={p} type="button" className="hud-btn" data-ui={`open-${p}`} onClick={() => openPanel(p)} disabled={talking}>
              <PanelIcon panel={p} />
              <span className="la" lang="la">{PANEL_LATIN[p]}</span>
              {!touch && <kbd>{p === 'bag' ? 'I' : p === 'journal' ? 'J' : 'M'}</kbd>}
              {p === 'journal' && tasks > 0 && <i className="badge">{tasks}</i>}
            </button>
          ))}
          <button type="button" className={`hud-btn gloss${glosses ? ' on' : ''}`} data-ui="glosses" aria-pressed={glosses} onClick={() => setGlosses(!glosses)}
            title={lang === 'fr' ? 'Le sens sous le latin, en ville' : 'Meanings under the Latin in town'}>
            <GlossIcon />
            <span className="la" lang="la">{PANEL_LATIN.gloss}</span>
            <i className="tr">{lang.toUpperCase()}</i>
            {!touch && <kbd>T</kbd>}
          </button>
        </div>
      </div>
      <Toasts />
      {prompt && !talking && (
        <div className="act" data-ui="prompt" style={{ transform: `translate(${prompt.x}px, ${prompt.y}px)` }}>
          <kbd>{touch ? '●' : 'E'}</kbd><span lang="la">{VERB_LATIN[prompt.verb]?.la ?? prompt.verb}</span>
          {glosses && VERB_LATIN[prompt.verb] && <small>{VERB_LATIN[prompt.verb]![lang]}</small>}
        </div>
      )}
      {!talking && (
        <Joystick onMove={(x, y) => input.touchMove(x, y)}>{null}</Joystick>
      )}
      {touch && !talking && <button type="button" className="act-btn" onClick={() => queue({ act: true })} aria-label="Act">●</button>}
    </>
  );
}

/** A Latin word and its meaning under it. */
function GlossIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="9" rx="2" fill="#e9dbbd" stroke="#3a2414" /><path d="M7 8.5 H17" stroke="#a3322a" strokeWidth="2" /><path d="M7 17 H17 M9 20 H15" stroke="#6a5440" strokeWidth="1.4" /></svg>;
}

function PanelIcon({ panel }: { panel: 'bag' | 'journal' | 'map' }) {
  if (panel === 'bag') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9 Q5 6 8 6 H16 Q19 6 19 9 V18 Q19 20 17 20 H7 Q5 20 5 18 Z" fill="#8a5a32" stroke="#3a2414" /><path d="M5 10 H19 L17 14 H7 Z" fill="#a8743e" stroke="#3a2414" /><path d="M9 6 Q12 1 15 6" fill="none" stroke="#3a2414" strokeWidth="1.6" /></svg>;
  if (panel === 'journal') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="1.5" fill="#8a6a3a" stroke="#3a2414" /><rect x="6" y="7" width="12" height="10" fill="#3a2a1c" /><path d="M8 10 H15 M8 13 H13" stroke="#c9b48a" strokeWidth="1.2" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6 L9 4 L15 6 L21 4 V18 L15 20 L9 18 L3 20 Z" fill="#e9dbbd" stroke="#3a2414" /><path d="M9 4 V18 M15 6 V20" stroke="#3a2414" strokeWidth="0.8" /><circle cx="12" cy="11" r="2" fill="#a3322a" /></svg>;
}

/** What just happened: a thing gained, coins, a task moving on, a new part of town. Never under a thumb: they take no taps. */
function Toasts() {
  const toasts = useStore(store, (v) => v.toasts);
  const lang = useStore(store, (v) => v.save.lang);
  const icons = useMemo(itemIcons, []);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`} data-ui={`toast-${t.kind}`} onAnimationEnd={(e) => e.animationName === 'toast-out' && dismissToast(t.id)}>
          {t.item && <img src={icons[t.item]} alt="" />}
          {t.kind === 'coins' && <span className="coin-dot" />}
          <span>{t.la && <b className="la" lang="la">{t.la} </b>}{t.text[lang]}</span>
        </div>
      ))}
    </div>
  );
}

export function Loading() {
  const p = useStore(store, (v) => v.loading);
  const lang = useStore(store, (v) => v.save.lang);
  const at = useStore(store, (v) => v.sim.district);
  const started = useStore(store, (v) => v.sim.t > 0);
  return (
    <div className="loading" data-ui="loading">
      <span>{started ? DISTRICTS[at].name[lang] : lang === 'fr' ? 'On bâtit Pompéi…' : 'Building Pompeii…'}</span>
      <div className="bar"><i style={{ width: `${Math.round(p * 100)}%` }} /></div>
    </div>
  );
}
