/**
 * The answer checker's fixed suite (design §8, "Answer checker"): word orders, missing macrons, wrong case,
 * wrong number, misspellings, extra and missing words. It must keep passing.
 */
import { describe, expect, it } from 'vitest';
import { FEEDBACK_CODES, check, checkBuild, checkChoose, checkEndings, checkWrite, lintLatin, resolveFrame, type Frame } from '../../src/lingua';

/** "The girl carries the rose." */
const GIRL_ROSE: Frame = {
  slots: [
    { id: 'subject', lemma: 'puella', case: 'nom', number: 'sg' },
    { id: 'object', lemma: 'rosa', case: 'acc', number: 'sg', why: { en: 'is what the girl carries', fr: 'est ce que la fille porte' } },
    { id: 'verb', lemma: 'portō', mood: 'ind', person: 3, number: 'sg' },
  ],
};

/** "The slave is in the big forum." */
const SLAVE_FORUM: Frame = {
  slots: [
    { id: 'subject', lemma: 'servus', case: 'nom', number: 'sg' },
    { id: 'in', lemma: 'in', governs: 'place' },
    { id: 'place', lemma: 'forum', case: 'abl', number: 'sg' },
    { id: 'big', lemma: 'magnus', agrees: 'place' },
    { id: 'verb', lemma: 'sum', mood: 'ind', person: 3, number: 'sg' },
  ],
};

const code = (frame: Frame, text: string) => {
  const r = checkWrite(frame, text);
  return [r.grade, r.feedback?.code ?? null];
};

describe('step 4: write', () => {
  it('accepts every word order', () => {
    for (const a of [
      'Puella rosam portat.', 'puella portat rosam', 'rosam puella portat', 'rosam portat puella',
      'portat puella rosam', 'portat rosam puella',
    ])
      expect({ a, r: checkWrite(GIRL_ROSE, a) }).toEqual({ a, r: { grade: 'right', issues: [] } });
  });

  it('accepts missing macrons, any case, i/j and u/v, and punctuation', () => {
    expect(checkWrite(SLAVE_FORUM, 'Servus in magno foro est.').grade).toBe('right');
    expect(checkWrite(SLAVE_FORUM, 'SERVVS IN MAGNO FORO EST').grade).toBe('right');
    expect(checkWrite(SLAVE_FORUM, 'in forō magnō servus est!').grade).toBe('right');
    expect(checkWrite(SLAVE_FORUM, 'servus est in foro magno').grade).toBe('right');
  });

  it('a typed macron in the wrong place is not the right form', () => {
    // puellā is only the ablative, so it can't be the subject.
    expect(code(GIRL_ROSE, 'puellā rosam portat')).toEqual(['wrong', 'wrong_case']);
  });

  it('catches the wrong case and says why, kindly', () => {
    const r = checkWrite(GIRL_ROSE, 'puella rosa portat');
    expect(r.grade).toBe('wrong');
    expect(r.feedback).toEqual({
      code: 'wrong_case',
      en: '«rosa» is what the girl carries, so it takes the accusative: «rosam».',
      fr: '«rosa» est ce que la fille porte, donc il faut l’accusatif : «rosam».',
    });
    expect(r.issues).toEqual([{ code: 'wrong_case', slot: 'object', word: 'rosa', expected: 'rosam' }]);
  });

  it('names the subject when it is in the wrong case', () => {
    const r = checkWrite(GIRL_ROSE, 'puellam rosam portat');
    expect(r.feedback?.code).toBe('wrong_case');
    expect(r.feedback?.en).toBe('«puella» is the subject (who or what does it), so it takes the nominative: «puella».');
  });

  it('catches the wrong number, person and mood', () => {
    expect(checkWrite(GIRL_ROSE, 'puella rosās portat').feedback?.en).toBe('Nearly! Right word, but here it is singular (just one): «rosam».');
    expect(code(GIRL_ROSE, 'puella rosās portat')).toEqual(['wrong', 'wrong_number']);
    expect(code(GIRL_ROSE, 'puella rosam portant')).toEqual(['wrong', 'wrong_number']);
    expect(code(GIRL_ROSE, 'puella rosam portās')).toEqual(['wrong', 'wrong_person']);
    expect(code(GIRL_ROSE, 'puella rosam portāre')).toEqual(['wrong', 'wrong_mood']);
    expect(checkWrite(GIRL_ROSE, 'puella rosam portās').feedback?.en).toBe(
      'The verb has to match who is doing it, “he”, “she” or “it”: «portat».',
    );
  });

  it('a misspelling within one edit is close, not wrong', () => {
    expect(code(GIRL_ROSE, 'puela rosam portat')).toEqual(['close', 'misspelling']);
    expect(code(GIRL_ROSE, 'puella rossam portat')).toEqual(['close', 'misspelling']);
    expect(code(GIRL_ROSE, 'puella rosam protat')).toEqual(['close', 'misspelling']);
    expect(checkWrite(GIRL_ROSE, 'puela rosam portat').feedback?.en).toBe('So close! Check the spelling: «puella».');
  });

  it('an extra word is wrong, and named', () => {
    const r = checkWrite(GIRL_ROSE, 'puella rosam portat et');
    expect(r.grade).toBe('wrong');
    expect(r.feedback).toEqual({ code: 'extra_word', en: '«et» isn’t needed here. Try without it.', fr: '«et» n’est pas utile ici. Essaie sans.' });
  });

  it('a missing word is wrong, and hinted by its meaning', () => {
    const r = checkWrite(GIRL_ROSE, 'puella rosam');
    expect(r.feedback?.code).toBe('missing_word');
    expect(r.feedback?.en).toBe('One word is missing: the one for “I carry”.');
  });

  it('a known word in the wrong place says what it means', () => {
    const r = checkWrite(GIRL_ROSE, 'fēmina rosam portat');
    expect(r.feedback?.code).toBe('wrong_word');
    expect(r.feedback?.en).toBe('«fēmina» means “woman”. Here we need the word for “girl”.');
  });

  it('an unknown word is named', () => {
    expect(code(GIRL_ROSE, 'blorg rosam portat')).toEqual(['wrong', 'unknown_word']);
  });

  it('an empty answer asks for Latin', () => {
    expect(code(GIRL_ROSE, '  ')).toEqual(['wrong', 'empty']);
  });

  it('adjectives agree with their noun, and the feedback says so', () => {
    const r = checkWrite(SLAVE_FORUM, 'servus in magna foro est');
    expect(r.feedback?.code).toBe('wrong_gender');
    expect(r.feedback?.en).toBe('«magnus» goes with «forō», so it takes the same gender, neuter: «magnō».');
    expect(r.feedback?.fr).toBe('«magnus» va avec «forō», donc il prend le même genre, le neutre : «magnō».');
    // Both the noun and its adjective in the wrong case: the noun is named first.
    const r2 = checkWrite(SLAVE_FORUM, 'servus in magnum forum est');
    expect(r2.feedback?.code).toBe('wrong_case');
    expect(r2.issues.map((i) => i.slot)).toEqual(['place', 'big']);
    expect(r2.feedback?.en).toBe('«forum» comes after «in», so it takes the ablative: «forō».');
  });

  it('prepositions go before their noun', () => {
    expect(code(SLAVE_FORUM, 'servus forō in magnō est')).toEqual(['wrong', 'word_order']);
    expect(code(SLAVE_FORUM, 'servus magnō forō in est')).toEqual(['wrong', 'word_order']);
    expect(code(SLAVE_FORUM, 'servus in magnō forō est')).toEqual(['right', null]);
  });

  it('accepts any of several frames (two right answers)', () => {
    const hello: Frame[] = [
      { slots: [{ id: 'g', lemma: 'salvē', number: 'pl' }] },
      { slots: [{ id: 'g', lemma: 'avē', number: 'pl' }] },
    ];
    expect(checkWrite(hello, 'Salvēte!').grade).toBe('right');
    expect(checkWrite(hello, 'avete').grade).toBe('right');
    const r = checkWrite(hello, 'Salve!');
    expect(r.feedback?.code).toBe('wrong_number');
  });

  it('optional slots may be left out', () => {
    const iAm: Frame = {
      slots: [
        { id: 'me', lemma: 'ego', case: 'nom', number: 'sg', optional: true },
        { id: 'verb', lemma: 'sum', mood: 'ind', person: 1, number: 'sg' },
        { id: 'gaul', lemma: 'Gallus', case: 'nom', number: 'sg' },
      ],
    };
    expect(checkWrite(iAm, 'Gallus sum').grade).toBe('right');
    expect(checkWrite(iAm, 'Ego Gallus sum.').grade).toBe('right');
    expect(code(iAm, 'Gallus est')).toEqual(['wrong', 'wrong_person']);
  });

  it('Ferox’s commands: imperatives, singular', () => {
    const come: Frame = { slots: [{ id: 'v', lemma: 'veniō', mood: 'imp', number: 'sg' }] };
    expect(checkWrite(come, 'Veni!').grade).toBe('right');
    expect(code(come, 'Venite!')).toEqual(['wrong', 'wrong_number']);
    expect(code(come, 'venit')).toEqual(['wrong', 'wrong_mood']);
    const go: Frame = { slots: [{ id: 'v', lemma: 'eō', mood: 'imp', number: 'sg' }] };
    expect(checkWrite(go, 'Ī!').grade).toBe('right');
    expect(checkWrite(go, 'i').grade).toBe('right');
  });

  it('throws for frames content can’t satisfy (caught by content tests)', () => {
    expect(() => resolveFrame({ slots: [{ id: 'x', lemma: 'notaword' }] })).toThrow(/not in the lexicon/);
    expect(() => resolveFrame({ slots: [{ id: 'x', lemma: 'Tullia', number: 'pl' }] })).toThrow(/no form/);
  });
});

describe('step 2: build', () => {
  const tiles = ['puella', 'puellam', 'rosa', 'rosam', 'portat', 'portant'];
  it('any grammatical order of tiles is right', () => {
    expect(checkBuild({ frame: GIRL_ROSE, tiles }, ['rosam', 'puella', 'portat']).grade).toBe('right');
    expect(checkBuild({ frame: GIRL_ROSE, tiles }, ['portat', 'puella', 'rosam']).grade).toBe('right');
  });
  it('distractor tiles give the right feedback', () => {
    expect(checkBuild({ frame: GIRL_ROSE, tiles }, ['puellam', 'rosa', 'portat']).feedback?.code).toBe('wrong_case');
    expect(checkBuild({ frame: GIRL_ROSE, tiles }, ['puella', 'rosam', 'portant']).feedback?.code).toBe('wrong_number');
  });
  it('a tile not on offer is never right', () => {
    expect(checkBuild({ frame: GIRL_ROSE, tiles }, ['puella', 'rosam', 'portat', 'portat']).grade).toBe('wrong');
  });
});

describe('step 3: endings', () => {
  const door = { stem: 'aqu', slot: { id: 'x', lemma: 'aqua', case: 'gen' as const, number: 'sg' as const } };
  it('the right ending, with or without a dash, macron or the whole word', () => {
    expect(checkEndings(door, 'ae').grade).toBe('right');
    expect(checkEndings(door, '-ae').grade).toBe('right');
    expect(checkEndings(door, 'AQVAE').grade).toBe('right');
  });
  it('a real ending in the wrong case is wrong_case', () => {
    expect(checkEndings(door, 'am').feedback?.code).toBe('wrong_case');
    expect(checkEndings(door, 'ārum').feedback?.code).toBe('wrong_number');
  });
  it('an ending that makes no form is not_a_form', () => {
    const r = checkEndings(door, 'us');
    expect(r.feedback?.code).toBe('not_a_form');
    expect(r.feedback?.en).toBe('«aquus» isn’t a form of «aqua». Try another ending.');
  });
});

describe('step 1: choose', () => {
  const task = {
    step: 'choose' as const,
    options: [
      { text: 'Salvē!', right: true },
      { text: 'Valē!', feedback: { en: '«Valē!» says goodbye.', fr: '«Valē!» dit au revoir.' } },
      { text: 'Salvēte!' },
    ],
  };
  it('right by index or text', () => {
    expect(check(task, 0).grade).toBe('right');
    expect(check(task, 'Salvē!').grade).toBe('right');
  });
  it('content feedback wins; otherwise a kind default', () => {
    expect(checkChoose(task, 1).feedback).toEqual({ code: 'wrong_choice', en: '«Valē!» says goodbye.', fr: '«Valē!» dit au revoir.' });
    expect(checkChoose(task, 2).feedback?.code).toBe('wrong_choice');
  });
});

describe('feedback text', () => {
  it('every code is listed once', () => {
    expect(new Set(FEEDBACK_CODES).size).toBe(FEEDBACK_CODES.length);
  });

  it('the Latin in every message is marked with guillemets and is real Latin', () => {
    const answers = [
      'puella rosa portat', 'puella rosās portat', 'puella rosam portās', 'puella rosam portāre', 'puela rosam portat',
      'puella rosam portat et', 'puella rosam', 'fēmina rosam portat', 'puellam rosam portat',
    ];
    for (const a of answers) {
      const fb = checkWrite(GIRL_ROSE, a).feedback!;
      for (const text of [fb.en, fb.fr]) {
        // Only Latin inside « »: the lint finds every word, with the player's own spelling allowed.
        const issues = lintLatin(text, { macrons: false }).filter((i) => i.code !== 'macron');
        expect({ a, text, issues }).toEqual({ a, text, issues: [] });
      }
    }
  });
});
