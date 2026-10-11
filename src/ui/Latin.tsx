/**
 * Text with Latin in it: «guillemets» mark Latin inside English or French (lingua's content convention),
 * and a line with `notes.la` is Latin throughout. Latin is set apart (the inscription colour, a little
 * larger) and every glossed word can be tapped for its meaning, in the player's hint language.
 */
import { useState, type ReactNode } from 'react';
import { fold } from '../lingua';

export type Gloss = Record<string, { en: string; fr: string }>;

/** Split «…» spans out of text. */
function spans(text: string): { la: boolean; text: string }[] {
  const out: { la: boolean; text: string }[] = [];
  const re = /«([^»]*)»/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ la: false, text: text.slice(last, m.index) });
    out.push({ la: true, text: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ la: false, text: text.slice(last) });
  return out;
}

function LatinWords({ text, gloss, lang }: { text: string; gloss?: Gloss; lang: 'en' | 'fr' }) {
  const [open, setOpen] = useState<string | null>(null);
  const keys = new Map(Object.keys(gloss ?? {}).map((k) => [fold(k), k]));
  const parts = text.split(/(\s+|[.,!?;:])/);
  return (
    <span className="la">
      {parts.map((w, i) => {
        const k = keys.get(fold(w));
        if (!k) return <span key={i}>{w}</span>;
        const g = gloss![k];
        return (
          <button key={i} type="button" className={`gloss${open === k ? ' open' : ''}`} onClick={(e) => { e.stopPropagation(); setOpen(open === k ? null : k); }}>
            {w}
            {open === k && <span className="tip">{g[lang]}</span>}
          </button>
        );
      })}
    </span>
  );
}

/** Render a line: plain text with Latin spans, or all Latin. */
export function Text({ text, la, gloss, lang }: { text: string; la?: boolean; gloss?: Gloss; lang: 'en' | 'fr' }): ReactNode {
  if (la) return <LatinWords text={text} gloss={gloss} lang={lang} />;
  return <>{spans(text).map((s, i) => (s.la ? <LatinWords key={i} text={s.text} gloss={gloss} lang={lang} /> : <span key={i}>{s.text}</span>))}</>;
}
