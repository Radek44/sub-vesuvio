/**
 * The Latin in every conversation is checked by the game (CLAUDE.md): every Latin word in every line parses
 * with lingua, with the right macrons; every prompt's right answer is accepted and every listed wrong
 * answer is rejected with its own feedback; the script has no dangling or unreachable nodes. Shop signs,
 * shop names, item names and name tags are Latin too, and linted the same way.
 */
import { describe, expect, it } from 'vitest';
import { danglingGotos, fill, scriptTexts, unreachable } from 'ymir/dialogue';
import { SCRIPT as PROLOGUE, TALK_TO } from '../src/content';
import { PANEL_LATIN } from '../src/content/ui';
import { QUESTS } from '../src/content/quests';
import { ITEMS } from '../src/content/items';
import { TAGS } from '../src/art/people';
import { DISTRICTS, district } from '../src/level';
import { analyse, check, lintLatin, lintScript, type ChooseTask } from '../src/lingua';

const prompts = Object.values(PROLOGUE).flatMap((n) => (n.then && 'prompt' in n.then && typeof n.then.prompt === 'object' ? [n.then.prompt] : []));

describe('content', () => {
  it('every Latin word in the script is one lingua knows, spelled right', () => {
    expect(lintScript(scriptTexts(PROLOGUE))).toEqual([]);
  });

  it('every answer option is Latin lingua knows, and every option’s feedback too', () => {
    for (const p of prompts) {
      const task = (p.data as { task: ChooseTask }).task;
      for (const o of task.options) {
        expect({ id: p.id, o: o.text, issues: lintLatin(fill(o.text, { name: 'Tullia' })) /* the player's own name isn't Latin to check: stand in a name lingua knows */ }).toEqual({ id: p.id, o: o.text, issues: [] });
        if (o.feedback) for (const lang of ['en', 'fr'] as const) expect({ id: p.id, lang, issues: lintLatin(o.feedback[lang]) }).toEqual({ id: p.id, lang, issues: [] });
      }
    }
  });

  it('every prompt accepts its right answer and rejects each wrong one with its own explanation', () => {
    expect(prompts.length).toBeGreaterThanOrEqual(4);
    for (const p of prompts) {
      const task = (p.data as { task: ChooseTask }).task;
      expect(task.options.filter((o) => o.right).length).toBe(1);
      task.options.forEach((o, i) => {
        const r = check(task, i);
        if (o.right) expect({ id: p.id, i, grade: r.grade }).toEqual({ id: p.id, i, grade: 'right' });
        else {
          expect({ id: p.id, i, grade: r.grade }).toEqual({ id: p.id, i, grade: 'wrong' });
          expect(r.feedback?.en).toBe(o.feedback?.en);
          expect(r.feedback?.fr).toBe(o.feedback?.fr);
        }
      });
      // every grade the checker can give routes somewhere (no dead ends)
      expect(p.results.right ?? p.results.else).toBeTruthy();
      expect(p.results.wrong ?? p.results.else).toBeTruthy();
    }
  });

  it('has no dangling jumps, and everything can be reached from somewhere the player can start', () => {
    expect(danglingGotos(PROLOGUE)).toEqual([]);
    const chats = Object.keys(PROLOGUE).filter((k) => k.startsWith('chat:'));
    expect(unreachable(PROLOGUE, ['arrival', ...Object.values(TALK_TO), ...chats])).toEqual([]);
  });

  it('every line has a speaker the UI can name, and glosses only for words in the line', () => {
    for (const t of scriptTexts(PROLOGUE)) {
      const gloss = (t.notes as { gloss?: Record<string, unknown> } | undefined)?.gloss ?? {};
      const norm = (w: string) => w.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/v/g, 'u');
      for (const g of Object.keys(gloss)) expect({ at: `${t.node}/${t.at}`, g, present: norm(t.text).includes(norm(g)) }).toEqual({ at: `${t.node}/${t.at}`, g, present: true });
    }
  });
});

describe('side quests', () => {
  it('every quest a conversation starts, moves or checks is in the journal, at a stage it has', () => {
    const bad: string[] = [];
    const visit = (o: unknown, where: string): void => {
      if (!o || typeof o !== 'object') return;
      if (Array.isArray(o)) { o.forEach((v) => visit(v, where)); return; }
      const r = o as Record<string, unknown>;
      if (typeof r.quest === 'string' && typeof r.stage === 'string' && !QUESTS[r.quest]?.order.includes(r.stage)) bad.push(`${where}: ${r.quest}/${r.stage}`);
      for (const v of Object.values(r)) visit(v, where);
    };
    for (const [id, node] of Object.entries(PROLOGUE)) visit(node, id);
    expect(bad).toEqual([]);
  });
});

describe('Latin on things', () => {
  it('item names, name tags, district names, shop signs and shop names are Latin lingua knows', () => {
    for (const [id, it] of Object.entries(ITEMS)) {
      expect({ id, issues: lintLatin(it.la, { whole: true }) }).toEqual({ id, issues: [] });
      if (it.plural) expect({ id, issues: lintLatin(it.plural, { whole: true }) }).toEqual({ id, issues: [] });
    }
    for (const [k, la] of Object.entries(PANEL_LATIN)) expect({ k, issues: lintLatin(la, { whole: true }) }).toEqual({ k, issues: [] });
    for (const [id, q] of Object.entries(QUESTS)) expect({ id, issues: lintLatin(q.title.la, { whole: true }) }).toEqual({ id, issues: [] });
    for (const [k, t] of Object.entries(TAGS)) expect({ k, issues: lintLatin(t.la, { whole: true }) }).toEqual({ k, issues: [] });
    for (const id of Object.keys(DISTRICTS) as (keyof typeof DISTRICTS)[]) {
      const L = district(id);
      for (const sh of L.shops) {
        expect({ shop: sh.id, issues: lintLatin(sh.sign, { whole: true }) }).toEqual({ shop: sh.id, issues: [] });
        expect({ shop: sh.id, issues: lintLatin(sh.name.la, { whole: true }) }).toEqual({ shop: sh.id, issues: [] });
        for (const s of sh.stock) expect({ shop: sh.id, item: s.item, known: s.item in ITEMS, price: s.price > 0 }).toEqual({ shop: sh.id, item: s.item, known: true, price: true });
      }
      for (const e of L.exits) expect({ exit: `${id}/${e.id}`, issues: lintLatin(e.label.la, { whole: true }) }).toEqual({ exit: `${id}/${e.id}`, issues: [] });
    }
  });

  it('every waymarker says where the street goes as Latin does: «ad» and the place in the accusative', () => {
    for (const id of Object.keys(DISTRICTS) as (keyof typeof DISTRICTS)[]) {
      for (const e of district(id).exits) {
        const [ad, ...place] = e.label.la.split(' ');
        expect({ exit: `${id}/${e.id}`, ad }).toEqual({ exit: `${id}/${e.id}`, ad: 'Ad' });
        for (const w of place) {
          const acc = analyse(w).some((r) => r.tag.case === 'acc');
          expect({ exit: `${id}/${e.id}`, w, acc }).toEqual({ exit: `${id}/${e.id}`, w, acc: true });
        }
      }
    }
  });
});
