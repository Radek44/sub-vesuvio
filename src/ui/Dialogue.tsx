/**
 * A conversation: who speaks (portrait and name plate), what they say (Latin set apart, glosses on tap),
 * and when the script waits for an answer, the answers as tablets. A wrong answer is explained, kindly,
 * and the player tries again: never a dead end, never a timer.
 */
import { useEffect, useState } from 'react';
import { useStore } from 'ymir/ui';
import { beatAt } from 'ymir/dialogue';
import { PROLOGUE } from '../content/prologue';
import { ctxOf } from '../sim/sim';
import { queue, store } from '../game';
import { fill } from 'ymir/dialogue';
import { Text, type Gloss } from './Latin';
import { portraits } from './portraits';
import type { ChooseTask } from '../lingua';

const NAMES: Record<string, string> = { you: '', Sextus: 'Sextus, the toll collector', Vibia: 'Vibia', Faustus: 'Faustus, wine seller', Modestus: 'Modestus, baker', Prima: 'Prima', Lucius: 'Lucius', Celsus: 'Celsus, mason', Ferox: 'Ferox', Tullia: 'Tullia' };
const NAMES_FR: Record<string, string> = { ...NAMES, Sextus: 'Sextus, le péager', Faustus: 'Faustus, marchand de vin', Modestus: 'Modestus, boulanger', Celsus: 'Celsus, tailleur de pierre' };
const UI = { en: { next: 'Next', tap: 'Tap a word in red to see what it means', try: 'Try again' }, fr: { next: 'Suite', tap: 'Touche un mot en rouge pour voir son sens', try: 'Essaie encore' } };

export function Dialogue() {
  const sim = useStore(store, (v) => v.sim);
  const lang = useStore(store, (v) => v.save.lang);
  const [faces] = useState(portraits);
  const talk = sim.talk;
  // keyboard: number keys pick an answer
  const beat = talk ? beatAt(PROLOGUE, talk.cursor, {}, ctxOf(sim)) : null;
  useEffect(() => {
    if (!beat || beat.kind !== 'prompt') return;
    const onKey = (e: KeyboardEvent) => { const n = Number(e.key); if (n >= 1 && n <= 9) queue({ answer: n - 1 }); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [beat?.kind, talk?.cursor.node]);
  if (!talk || !beat || beat.kind === 'end') return null;
  const vars = { name: sim.name };
  const who = beat.kind === 'line' ? beat.who : beat.kind === 'prompt' ? beat.who ?? 'you' : 'you';
  const notes = (beat.kind === 'line' || beat.kind === 'prompt' ? beat.notes : undefined) as { la?: boolean; gloss?: Gloss } | undefined;
  const face = faces[who];
  const name = (lang === 'fr' ? NAMES_FR : NAMES)[who] ?? who;
  const t = UI[lang];
  return (
    <div className={`dialogue${who === 'you' ? ' self' : ''}`} data-ui="dialogue" onClick={() => beat.kind === 'line' && queue({ act: true })}>
      {face && <img className="face" src={face} alt="" />}
      <div className="panel">
        {name && <div className="who">{name}</div>}
        {beat.kind === 'line' && (
          <p className="line"><Text text={beat.text} la={notes?.la} gloss={notes?.gloss} lang={lang} /></p>
        )}
        {beat.kind === 'prompt' && (
          <>
            <p className="ask">{beat.prompt}</p>
            {talk.result && talk.result !== 'right' && talk.feedback && (
              <p className="feedback" data-ui="feedback"><Text text={talk.feedback[lang]} lang={lang} /> <b>{t.try}</b></p>
            )}
            <div className="answers">
              {((beat.data as { task: ChooseTask }).task.options).map((o, i) => (
                <button key={i} type="button" className="tablet" data-ui={`answer-${i}`} onClick={(e) => { e.stopPropagation(); queue({ answer: i }); }}>
                  <span className="n">{i + 1}</span>
                  <Text text={fill(o.text, vars)} lang={lang} />
                </button>
              ))}
            </div>
          </>
        )}
        {beat.kind === 'line' && <div className="next">{notes?.gloss ? <span className="hint">{t.tap}</span> : <span />}<span>{t.next} ▸</span></div>}
      </div>
    </div>
  );
}
