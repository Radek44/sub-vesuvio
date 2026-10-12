/**
 * Things to buy, carry and give, with their Latin names. Every `la` is a lexicon lemma (nominative
 * singular) and the content test lints it; `plural` is the Latin for more than one where the shop says it.
 * Prices are in asses (bronze coins). Pompeian graffiti give a feel for prices: bread and a cup of
 * wine for an as or two, a tunic laundered for fifteen. Ours are rounded for play.
 */
export type ItemId = 'bread' | 'cheese' | 'grapes' | 'apple' | 'oil' | 'flask' | 'sandals' | 'hat' | 'lamp' | 'tablet' | 'stylus' | 'treat' | 'talus';

export interface Item {
  la: string;
  /** How the shop names several (when it differs from the lemma's plural the player is learning). */
  plural?: string;
  en: string;
  fr: string;
  kind: 'food' | 'gear' | 'gift' | 'quest';
  /** What it does, if anything (shown in the inventory). */
  use?: { en: string; fr: string };
  /** Most you can carry. */
  max: number;
}

export const ITEMS: Record<ItemId, Item> = {
  bread: { la: 'pānis', plural: 'pānēs', en: 'a loaf of bread', fr: 'un pain', kind: 'food', max: 9 },
  cheese: { la: 'caseus', en: 'cheese', fr: 'du fromage', kind: 'food', max: 9 },
  grapes: { la: 'ūva', plural: 'ūvae', en: 'grapes', fr: 'du raisin', kind: 'food', max: 9 },
  apple: { la: 'mālum', plural: 'māla', en: 'an apple', fr: 'une pomme', kind: 'food', max: 9 },
  oil: { la: 'oleum', en: 'olive oil', fr: 'de l’huile d’olive', kind: 'gift', max: 3 },
  flask: { la: 'ampulla', en: 'a flask', fr: 'un flacon', kind: 'gear', max: 1, use: { en: 'Carry water from a fountain.', fr: 'Emporter de l’eau d’une fontaine.' } },
  sandals: { la: 'solea', plural: 'soleae', en: 'sandals', fr: 'des sandales', kind: 'gear', max: 1, use: { en: 'You run faster.', fr: 'Tu cours plus vite.' } },
  hat: { la: 'petasus', en: 'a sun hat', fr: 'un chapeau de soleil', kind: 'gear', max: 1, use: { en: 'Shade from the October sun. You wear it.', fr: 'De l’ombre sous le soleil d’octobre. Tu le portes.' } },
  lamp: { la: 'lucerna', en: 'an oil lamp', fr: 'une lampe à huile', kind: 'gear', max: 1, use: { en: 'Light in dark places.', fr: 'De la lumière dans les endroits sombres.' } },
  tablet: { la: 'tabula', en: 'a wax tablet', fr: 'une tablette de cire', kind: 'gear', max: 1, use: { en: 'Take notes: your notebook of words.', fr: 'Prendre des notes : ton carnet de mots.' } },
  stylus: { la: 'stilus', en: 'a stylus', fr: 'un stylet', kind: 'gear', max: 1, use: { en: 'Write on the tablet.', fr: 'Écrire sur la tablette.' } },
  treat: { la: 'offa', plural: 'offae', en: 'a treat for a dog', fr: 'une friandise pour chien', kind: 'gift', max: 9, use: { en: 'Ferox will do anything for one.', fr: 'Ferox ferait tout pour en avoir une.' } },
  talus: { la: 'tālus', plural: 'tālī', en: 'a knucklebone', fr: 'un osselet', kind: 'quest', max: 4 },
};

/** What the hero starts with: the coins in uncle's letter. */
export const START_COINS = 10;
