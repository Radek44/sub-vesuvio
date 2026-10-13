/**
 * A conversation: who speaks (portrait and name plate), what they say (Latin set apart, glosses on tap),
 * and when the script waits for an answer, the answers as tablets. A wrong answer is explained, kindly,
 * and the player tries again: never a dead end, never a timer.
 */
import { useEffect, useMemo } from 'react';
import { useStore } from 'ymir/ui';
import { beatAt } from 'ymir/dialogue';
import { SCRIPT } from '../content';
import { ctxOf } from '../sim/sim';
import { queue, store } from '../game';
import { fill } from 'ymir/dialogue';
import { Text, type Gloss } from './Latin';
import { portraits } from './portraits';
import { nameOf, speakerOf } from './names';
import { district } from '../level';
import type { ChooseTask } from '../lingua';

const UI = { en: { next: 'Next', tap: 'Tap a word in red to see what it means', try: 'Try again' }, fr: { next: 'Suite', tap: 'Touche un mot en rouge pour voir son sens', try: 'Essaie encore' } };

export function Dialogue() {
  const sim = useStore(store, (v) => v.sim);
  const lang = useStore(store, (v) => v.save.lang);
  const glosses = useStore(store, (v) => v.save.glosses);
  const talk = sim.talk;
  // everyone in this district gets a face, drawn once when the district is first shown
  const faces = useMemo(() => {
    const L = district(sim.district);
    return portraits([...L.npcs.map((n) => n.who), ...L.walkers.map((w) => w.who)]);
  }, [sim.district]);
  // keyboard: number keys pick an answer
  const beat = talk ? beatAt(SCRIPT, talk.cursor, {}, ctxOf(sim)) : null;
  useEffect(() => {
    if (!beat || beat.kind !== 'prompt') return;
    const onKey = (e: KeyboardEvent) => { const n = Number(e.key); if (n >= 1 && n <= 9) queue({ answer: n - 1 }); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [beat?.kind, talk?.cursor.node]);
  if (!talk || !beat || beat.kind === 'end') return null;
  const vars = { name: sim.name };
  const written = beat.kind === 'line' ? beat.who : beat.kind === 'prompt' ? beat.who ?? 'you' : 'you';
  const who = speakerOf(written ?? 'you', talk.with, sim.district);
  const notes = (beat.kind === 'line' || beat.kind === 'prompt' ? beat.notes : undefined) as { la?: boolean; gloss?: Gloss } | undefined;
  const face = faces[who];
  const name = nameOf(who, lang, glosses);
  const t = UI[lang];
  return (
    <div className={`dialogue${who === 'you' ? ' self' : ''}`} data-ui="dialogue" onClick={() => beat.kind === 'line' && queue({ act: true })}>
      {face && <img className="face" src={face} alt="" />}
      <div className="panel">
        {name.name && <div className="who">{name.la ? <span className="la" lang="la">{name.name}</span> : name.name}{name.role && <small className="role" lang="la">{name.role}</small>}{name.gloss && <small className="meaning">{name.gloss}</small>}</div>}
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
