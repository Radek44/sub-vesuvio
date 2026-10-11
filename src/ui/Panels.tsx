/**
 * The three panels over the town (the world pauses under them): the satchel (what you carry, by its Latin
 * name), the journal (the story's next step and the side tasks people gave you), and the map of the city
 * (the districts you have walked, where you are, where someone is waiting on you).
 */
import { useMemo } from 'react';
import { useStore } from 'ymir/ui';
import { openPanel, store } from '../game';
import { ITEMS, type ItemId } from '../content/items';
import { QUESTS } from '../content/quests';
import { OBJECTIVES } from '../content/prologue';
import { DISTRICTS } from '../level';
import type { DistrictId } from '../level/types';
import { itemIcons } from './portraits';
import { PANEL_LATIN } from '../content/ui';
import { Purse } from './Purse';

const UI = {
  en: { bag: 'Satchel', journal: 'Journal', map: 'Pompeii', empty: 'Nothing yet. Shops sell things; people give them; some lie in the street.', story: 'The story', tasks: 'Tasks', none: 'No one has asked you for anything yet. Talk to people!', done: 'Done', reward: 'Reward', here: 'You are here', unknown: 'Not yet explored', task: 'Someone here needs you', close: 'Close' },
  fr: { bag: 'Besace', journal: 'Journal', map: 'Pompéi', empty: 'Rien pour l’instant. Les boutiques vendent, les gens donnent, et certaines choses traînent dans la rue.', story: 'L’histoire', tasks: 'Tâches', none: 'Personne ne t’a encore rien demandé. Parle aux gens !', done: 'Fait', reward: 'Récompense', here: 'Tu es ici', unknown: 'Pas encore exploré', task: 'Quelqu’un ici a besoin de toi', close: 'Fermer' },
};

export function Panels() {
  const panel = useStore(store, (v) => v.panel);
  const lang = useStore(store, (v) => v.save.lang);
  if (!panel) return null;
  const t = UI[lang];
  return (
    <div className="veil" onClick={() => openPanel(null)}>
      <div className={`sheet panel-${panel}`} data-ui={`panel-${panel}`} role="dialog" aria-label={t[panel]} onClick={(e) => e.stopPropagation()}>
        <nav className="tabs">
          {(['bag', 'journal', 'map'] as const).map((p) => (
            <button key={p} type="button" className={p === panel ? 'on' : ''} data-ui={`tab-${p}`} onClick={() => openPanel(p)}>
              <span className="la" lang="la">{PANEL_LATIN[p]}</span><small>{t[p]}</small>
            </button>
          ))}
          <button type="button" className="x" aria-label={t.close} onClick={() => openPanel(null)}>×</button>
        </nav>
        {panel === 'bag' && <Bag />}
        {panel === 'journal' && <Journal />}
        {panel === 'map' && <CityMap />}
      </div>
    </div>
  );
}

function Bag() {
  const items = useStore(store, (v) => v.sim.items);
  const coins = useStore(store, (v) => v.sim.coins);
  const lang = useStore(store, (v) => v.save.lang);
  const icons = useMemo(itemIcons, []);
  const held = (Object.keys(ITEMS) as ItemId[]).filter((id) => (items[id] ?? 0) > 0);
  return (
    <div className="bag">
      <div className="bag-purse"><Purse coins={coins} lang={lang} /></div>
      {held.length === 0 && <p className="empty">{UI[lang].empty}</p>}
      <ul className="slots">
        {held.map((id) => {
          const it = ITEMS[id], n = items[id]!;
          return (
            <li key={id} data-ui={`item-${id}`} className={`slot ${it.kind}`}>
              <img className="icon" src={icons[id]} alt="" />
              {n > 1 && <span className="count">{n}</span>}
              <span className="la" lang="la">{n > 1 ? it.plural ?? it.la : it.la}</span>
              <span className="mean">{it[lang]}</span>
              {it.use && <span className="use">{it.use[lang]}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Journal() {
  const quests = useStore(store, (v) => v.sim.quests);
  const objective = useStore(store, (v) => v.sim.objective);
  const lang = useStore(store, (v) => v.save.lang);
  const t = UI[lang];
  const ids = Object.keys(quests).filter((id) => QUESTS[id]);
  // open tasks first, the finished ones after
  ids.sort((a, b) => Number(quests[a] === 'done') - Number(quests[b] === 'done'));
  return (
    <div className="journal">
      <h3>{t.story}</h3>
      <p className="main-quest">{OBJECTIVES[objective][lang]}</p>
      <h3>{t.tasks}</h3>
      {ids.length === 0 && <p className="empty">{t.none}</p>}
      <ul className="quests">
        {ids.map((id) => {
          const q = QUESTS[id], stage = quests[id], done = stage === 'done';
          return (
            <li key={id} className={done ? 'done' : ''} data-ui={`quest-${id}`}>
              <div className="q-title"><span className="la" lang="la">{q.title.la}</span> <span>{q.title[lang]}</span>{done && <em>{t.done}</em>}</div>
              <p>{q.stages[stage]?.[lang]}</p>
              {!done && <p className="reward">{t.reward}: {q.reward[lang]}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Pompeii from above, schematic: the walls' oval, Vesuvius to the north, the sea to the west. Porta Marina
 * at the western gate, the Forum just inside, Via dell'Abbondanza running east. Places you have not walked
 * are washed out; a star marks where someone is waiting on you.
 */
const PLACES: Record<DistrictId, { x: number; y: number; w: number; h: number; r?: number }> = {
  portaMarina: { x: 46, y: 132, w: 64, h: 40 },
  forum: { x: 116, y: 116, w: 62, h: 70 },
  abbondanza: { x: 184, y: 138, w: 150, h: 34 },
};

function CityMap() {
  const at = useStore(store, (v) => v.sim.district);
  const visited = useStore(store, (v) => v.sim.visited);
  const quests = useStore(store, (v) => v.sim.quests);
  const lang = useStore(store, (v) => v.save.lang);
  const t = UI[lang];
  const waiting = new Set(Object.entries(quests).filter(([id, s]) => QUESTS[id] && s !== 'done').map(([id]) => QUESTS[id].district));
  return (
    <div className="citymap">
      <svg viewBox="0 0 380 260" role="img" aria-label={t.map}>
        <defs>
          <pattern id="sea" width="12" height="6" patternUnits="userSpaceOnUse"><path d="M0 3 Q3 0 6 3 T12 3" fill="none" stroke="#7fb2bc" strokeWidth="1" /></pattern>
        </defs>
        <rect width="380" height="260" fill="#e9dbbd" />
        <path d="M0 0 H34 Q22 90 30 150 Q36 210 0 260 Z" fill="#a9d2d6" />
        <path d="M0 0 H34 Q22 90 30 150 Q36 210 0 260 Z" fill="url(#sea)" />
        {/* Vesuvius to the north */}
        <path d="M250 46 L282 14 Q290 8 298 14 L330 46 Z" fill="#9aae96" stroke="#5a6a52" />
        <path d="M290 12 C 286 2, 296 -2, 292 -8" stroke="#b4ada2" strokeWidth="5" fill="none" strokeLinecap="round" />
        <text x="290" y="60" className="m-label" textAnchor="middle">Vesuvius</text>
        {/* the walls */}
        <path d="M40 140 Q46 82 120 72 Q240 58 340 92 Q366 130 344 196 Q250 232 120 216 Q46 206 40 140 Z" fill="#f3e8d2" stroke="#6a5440" strokeWidth="3" strokeDasharray="10 3" />
        {(Object.keys(PLACES) as DistrictId[]).map((id) => {
          const p = PLACES[id], seen = visited.includes(id), here = id === at;
          return (
            <g key={id} className={`place${seen ? ' seen' : ''}${here ? ' here' : ''}`} data-ui={`map-${id}`}>
              <rect x={p.x} y={p.y} width={p.w} height={p.h} rx="4" />
              <text x={p.x + p.w / 2} y={p.y + p.h / 2 + 4} textAnchor="middle" className="m-name">{seen ? DISTRICTS[id].name[lang] : '?'}</text>
              {waiting.has(id) && <text x={p.x + p.w - 8} y={p.y + 14} className="m-star" textAnchor="middle">★</text>}
              {here && <circle cx={p.x + p.w / 2} cy={p.y + p.h / 2 + 16} r="5" className="m-you" />}
            </g>
          );
        })}
        <text x="20" y="250" className="m-label">N ↑</text>
      </svg>
      <ul className="legend">
        <li><i className="m-you" /> {t.here}: <b>{DISTRICTS[at].name[lang]}</b></li>
        <li><i className="m-star">★</i> {t.task}</li>
        <li><i className="m-unknown">?</i> {t.unknown}</li>
      </ul>
    </div>
  );
}
