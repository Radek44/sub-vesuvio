/**
 * The title: the live town behind, the name in Roman capitals, the hero's name, and one button. A player
 * with a game in progress sees Continue first (design best practice: one tap back into the story).
 */
import { useState } from 'react';
import { useStore } from 'ymir/ui';
import { play, setLang, store } from '../game';
import { OBJECTIVES } from '../content/prologue';

const T = {
  en: { sub: 'Pompeii · October, AD 79', name: 'What is your name, traveller?', begin: 'Begin', cont: 'Continue', newGame: 'New journey', where: 'Last time:', lang: 'Hints in' },
  fr: { sub: 'Pompéi · octobre 79 apr. J.-C.', name: 'Comment t’appelles-tu, voyageur ?', begin: 'Commencer', cont: 'Continuer', newGame: 'Nouveau voyage', where: 'La dernière fois :', lang: 'Indices en' },
};

export function Title() {
  const save = useStore(store, (v) => v.save);
  const [name, setName] = useState(save.name || '');
  const [fresh, setFresh] = useState(!save.story);
  const t = T[save.lang];
  const clean = name.replace(/[^\p{L}\p{M}' -]/gu, '').slice(0, 16).trim();
  return (
    <div className="title" data-ui="title">
      <div className="title-card">
        <div className="logo">
          <span className="logo-sub">{t.sub}</span>
          <h1>SVB VESVVIO</h1>
          <span className="logo-rule" />
        </div>
        {save.story && !fresh ? (
          <>
            <p className="where">{t.where} {OBJECTIVES[save.story.objective][save.lang]}</p>
            <button type="button" className="cta" data-ui="continue" onClick={() => play(save.name)}>{t.cont}, {save.name}</button>
            <button type="button" className="link" onClick={() => setFresh(true)}>{t.newGame}</button>
          </>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if (clean) play(clean); }}>
            <label htmlFor="hero-name">{t.name}</label>
            <input id="hero-name" data-ui="name" value={name} maxLength={16} autoComplete="off" spellCheck={false} placeholder="Marcus, Livia…" onChange={(e) => setName(e.target.value)} />
            <button type="submit" className="cta" data-ui="begin" disabled={!clean}>{t.begin}</button>
          </form>
        )}
        <div className="langs">
          <span>{t.lang}</span>
          <button type="button" className={save.lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>English</button>
          <button type="button" className={save.lang === 'fr' ? 'on' : ''} onClick={() => setLang('fr')}>Français</button>
        </div>
      </div>
    </div>
  );
}
