/**
 * The Latin on the game's own screens, kept here as data so the content test lints it like everything else.
 * The panels: the satchel (pēra), the tasks people give you (negōtia), the map (forma, as in the Forma Urbis,
 * Rome's great marble plan of the city), and the words (verba): their meanings under the Latin labels in town.
 */
export const PANEL_LATIN = { bag: 'Pēra', journal: 'Negōtia', map: 'Forma', gloss: 'Verba' } as const;

type Meaning = { en: string; fr: string };
/**
 * The action prompt over the hero, in Latin: what "act" would do, as an order to yourself (the imperative,
 * the grammar Ferox's commands teach). Its meaning shows beside it with translations on.
 */
export const VERB_LATIN: Record<string, Meaning & { la: string }> = {
  speak: { la: 'Salūtā', en: 'Greet', fr: 'Saluer' },
  read: { la: 'Lege', en: 'Read', fr: 'Lire' },
  look: { la: 'Spectā', en: 'Look', fr: 'Regarder' },
  drink: { la: 'Bibe', en: 'Drink', fr: 'Boire' },
  enter: { la: 'Intrā', en: 'Enter', fr: 'Entrer' },
  command: { la: 'Iubē Ferōcem', en: 'Command Ferox', fr: 'Commander Ferox' },
  knock: { la: 'Pulsā', en: 'Knock', fr: 'Frapper' },
  shop: { la: 'Eme', en: 'Buy', fr: 'Acheter' },
  take: { la: 'Cape', en: 'Pick up', fr: 'Ramasser' },
  go: { la: 'Ī', en: 'Go', fr: 'Aller' },
};

/** What the cast do, in Latin, on their name plates (the meaning beside it with translations on). */
export const ROLES: Record<string, Meaning & { la: string }> = {
  Sextus: { la: 'portitor', en: 'the toll collector', fr: 'le péager' },
  Faustus: { la: 'vīnārius', en: 'wine seller', fr: 'marchand de vin' },
  Modestus: { la: 'pistor', en: 'baker', fr: 'boulanger' },
  Celsus: { la: 'faber', en: 'mason', fr: 'tailleur de pierre' },
  Vibia: { la: 'coqua', en: 'cook', fr: 'cuisinière' },
  Secundus: { la: 'scrība', en: 'the banker’s clerk', fr: 'le secrétaire du banquier' },
};
