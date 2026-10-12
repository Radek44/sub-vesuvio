/** The content lint the game's content tests run over every line. */
import { describe, expect, it } from 'vitest';
import { latinSpans, latinWords, lintLatin, lintScript, type ScriptText } from '../../src/lingua';

describe('latin in english: «guillemets»', () => {
  it('finds the spans', () => {
    const text = 'Ferox heard «Venī!» and came. Tullia said «Salvē, amīce».';
    expect(latinSpans(text).map((s) => s.text)).toEqual(['Venī!', 'Salvē, amīce']);
    const [first] = latinSpans(text);
    expect(text.slice(first.start, first.end)).toBe('Venī!');
    expect(latinWords(text)).toEqual(['Venī', 'Salvē', 'amīce']);
  });

  it('a clean line has no issues', () => {
    expect(lintLatin('The sign says «Cavē canem!» in big letters.')).toEqual([]);
    expect(lintLatin('No Latin here at all.')).toEqual([]);
  });

  it('reports unknown words', () => {
    const issues = lintLatin('He shouts «Salvē, Marce!»');
    expect(issues.map((i) => [i.code, i.word])).toEqual([['unknown_word', 'Marce']]);
    expect(lintLatin('He shouts «Salvē, Marce!»', { allow: ['Marce'] })).toEqual([]);
  });

  it('reports missing or wrong macrons in lower-case text, with the right spelling', () => {
    const [i] = lintLatin('«Salve!»');
    expect(i.code).toBe('macron');
    expect(i.suggestions).toEqual(['salvē']);
    expect(lintLatin('«puellā ambulat»')).toEqual([]);
    const [wrong] = lintLatin('«puēlla»');
    expect(wrong.code).toBe('macron');
    expect(wrong.suggestions?.sort()).toEqual(['puella', 'puellā']);
  });

  it('does not ask inscriptions in capitals for macrons, and reads their numerals', () => {
    expect(lintLatin('The wall reads «CAVE CANEM».')).toEqual([]);
    expect(lintLatin('«XVI K NOV»', { allow: ['K', 'NOV'] })).toEqual([]);
    expect(lintLatin('«XVI K NOV»').map((i) => i.word)).toEqual(['K', 'NOV']);
  });

  it('reports unpaired guillemets, which would hide Latin from the lint', () => {
    expect(lintLatin('He says «Salvē and leaves.').map((i) => i.code)).toEqual(['unbalanced']);
    expect(lintLatin('He says Salvē» and leaves.').map((i) => i.code)).toEqual(['unbalanced']);
  });

  it('a line marked notes.la is Latin in full', () => {
    expect(lintLatin('Puella rosam portat.', { whole: true })).toEqual([]);
    expect(lintLatin('Puella rosam portat.')).toEqual([]); // not marked: not checked
    expect(lintLatin('The girl rosam portat.', { whole: true }).map((i) => i.word)).toEqual(['The', 'girl']);
  });
});

describe('lintScript over dialogue texts (ymir/dialogue scriptTexts shape)', () => {
  const texts: ScriptText[] = [
    { node: 'gate', at: 0, who: 'guard', text: '«Salvē!» says the guard.' },
    { node: 'gate', at: 1, who: 'guard', text: 'Quis es?', notes: { la: true } },
    { node: 'gate', at: 2, who: 'hero', text: 'Gallus sum.', notes: { la: true } },
    { node: 'gate', at: 3, who: 'guard', text: 'Salve, puer Gallice!', notes: { la: true } },
    { node: 'dog', at: 0, who: 'hero', text: '«Ferōx, venī!» Nothing happens. «Ferōx, sedē!»' },
  ];
  it('reports issues with where they are', () => {
    const issues = lintScript(texts);
    expect(issues.map((i) => [i.node, i.line, i.code, i.word])).toEqual([['gate', 3, 'macron', 'Salve']]);
  });
});
