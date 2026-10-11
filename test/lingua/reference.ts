/**
 * The independent reference: paradigms entered BY HAND from the standard tables (Allen & Greenough's New Latin
 * Grammar, the declension and conjugation chapters), then checked cell by cell against the tables on
 * en.wiktionary.org (October 2026). Nothing here is produced by `lingua`'s generator: that is the point. If the
 * generator and this file disagree, the build fails and names the word and the cell.
 *
 * Variants Wiktionary lists that the game deliberately leaves out (archaic, poetic or late): potesse, volt/voltis,
 * danunt, dīce/dūce/face, fāre, fēminābus, agricolum, fīlie, fīlibus, dee, virum (gen. pl.), urbīs (nom. pl.),
 * mēmē/tētē, and the plural and vocative of ūnus.
 *
 * Cells read `taught/variant/…`: the first form is the one the game teaches, the rest are accepted variants.
 * Case order: nominative, genitive, dative, accusative, ablative, vocative.
 * Verb order: 1st sg., 2nd sg., 3rd sg., 1st pl., 2nd pl., 3rd pl.
 */

export interface RefNoun {
  gender: 'm' | 'f' | 'n';
  sg?: readonly [string, string, string, string, string, string];
  pl?: readonly [string, string, string, string, string, string];
  loc?: string;
}

export const REF_NOUNS: Record<string, RefNoun> = {
  // First declension
  puella: {
    gender: 'f',
    sg: ['puella', 'puellae', 'puellae', 'puellam', 'puellā', 'puella'],
    pl: ['puellae', 'puellārum', 'puellīs', 'puellās', 'puellīs', 'puellae'],
  },
  porta: {
    gender: 'f',
    sg: ['porta', 'portae', 'portae', 'portam', 'portā', 'porta'],
    pl: ['portae', 'portārum', 'portīs', 'portās', 'portīs', 'portae'],
  },
  aqua: {
    gender: 'f',
    sg: ['aqua', 'aquae', 'aquae', 'aquam', 'aquā', 'aqua'],
    pl: ['aquae', 'aquārum', 'aquīs', 'aquās', 'aquīs', 'aquae'],
  },
  rosa: {
    gender: 'f',
    sg: ['rosa', 'rosae', 'rosae', 'rosam', 'rosā', 'rosa'],
    pl: ['rosae', 'rosārum', 'rosīs', 'rosās', 'rosīs', 'rosae'],
  },
  nauta: {
    gender: 'm',
    sg: ['nauta', 'nautae', 'nautae', 'nautam', 'nautā', 'nauta'],
    pl: ['nautae', 'nautārum', 'nautīs', 'nautās', 'nautīs', 'nautae'],
  },
  fīlia: {
    gender: 'f',
    sg: ['fīlia', 'fīliae', 'fīliae', 'fīliam', 'fīliā', 'fīlia'],
    pl: ['fīliae', 'fīliārum', 'fīliīs/fīliābus', 'fīliās', 'fīliīs/fīliābus', 'fīliae'],
  },
  Rōma: {
    gender: 'f',
    sg: ['Rōma', 'Rōmae', 'Rōmae', 'Rōmam', 'Rōmā', 'Rōma'],
    loc: 'Rōmae',
  },

  // Second declension
  servus: {
    gender: 'm',
    sg: ['servus', 'servī', 'servō', 'servum', 'servō', 'serve'],
    pl: ['servī', 'servōrum', 'servīs', 'servōs', 'servīs', 'servī'],
  },
  amīcus: {
    gender: 'm',
    sg: ['amīcus', 'amīcī', 'amīcō', 'amīcum', 'amīcō', 'amīce'],
    pl: ['amīcī', 'amīcōrum', 'amīcīs', 'amīcōs', 'amīcīs', 'amīcī'],
  },
  fīlius: {
    gender: 'm',
    sg: ['fīlius', 'fīliī/fīlī', 'fīliō', 'fīlium', 'fīliō', 'fīlī'],
    pl: ['fīliī', 'fīliōrum', 'fīliīs', 'fīliōs', 'fīliīs', 'fīliī'],
  },
  deus: {
    gender: 'm',
    sg: ['deus', 'deī', 'deō', 'deum', 'deō', 'deus'],
    pl: ['deī/diī/dī', 'deōrum/deum', 'deīs/diīs/dīs', 'deōs', 'deīs/diīs/dīs', 'deī/diī/dī'],
  },
  puer: {
    gender: 'm',
    sg: ['puer', 'puerī', 'puerō', 'puerum', 'puerō', 'puer'],
    pl: ['puerī', 'puerōrum', 'puerīs', 'puerōs', 'puerīs', 'puerī'],
  },
  // ── Forum: reference rows for its words go here ──
  statua: { gender: 'f', sg: ['statua', 'statuae', 'statuae', 'statuam', 'statuā', 'statua'], pl: ['statuae', 'statuārum', 'statuīs', 'statuās', 'statuīs', 'statuae'] },
  columna: { gender: 'f', sg: ['columna', 'columnae', 'columnae', 'columnam', 'columnā', 'columna'], pl: ['columnae', 'columnārum', 'columnīs', 'columnās', 'columnīs', 'columnae'] },
  mēnsa: { gender: 'f', sg: ['mēnsa', 'mēnsae', 'mēnsae', 'mēnsam', 'mēnsā', 'mēnsa'], pl: ['mēnsae', 'mēnsārum', 'mēnsīs', 'mēnsās', 'mēnsīs', 'mēnsae'] },
  scrība: { gender: 'm', sg: ['scrība', 'scrībae', 'scrībae', 'scrībam', 'scrībā', 'scrība'], pl: ['scrībae', 'scrībārum', 'scrībīs', 'scrībās', 'scrībīs', 'scrībae'] },
  lāna: { gender: 'f', sg: ['lāna', 'lānae', 'lānae', 'lānam', 'lānā', 'lāna'], pl: ['lānae', 'lānārum', 'lānīs', 'lānās', 'lānīs', 'lānae'] },
  Eumachia: { gender: 'f', sg: ['Eumachia', 'Eumachiae', 'Eumachiae', 'Eumachiam', 'Eumachiā', 'Eumachia'] },
  piscis: { gender: 'm', sg: ['piscis', 'piscis', 'piscī', 'piscem', 'pisce', 'piscis'], pl: ['piscēs', 'piscium', 'piscibus', 'piscēs/piscīs', 'piscibus', 'piscēs'] },
  fōns: { gender: 'm', sg: ['fōns', 'fontis', 'fontī', 'fontem', 'fonte', 'fōns'], pl: ['fontēs', 'fontium', 'fontibus', 'fontēs/fontīs', 'fontibus', 'fontēs'] },
  sōl: { gender: 'm', sg: ['sōl', 'sōlis', 'sōlī', 'sōlem', 'sōle', 'sōl'], pl: ['sōlēs', 'sōlum', 'sōlibus', 'sōlēs', 'sōlibus', 'sōlēs'] },
  Apollō: { gender: 'm', sg: ['Apollō', 'Apollinis', 'Apollinī', 'Apollinem', 'Apolline', 'Apollō'] },

  // The town's people and goods (added with the open city)
  senex: { gender: 'm', sg: ['senex', 'senis', 'senī', 'senem', 'sene', 'senex'], pl: ['senēs', 'senum', 'senibus', 'senēs', 'senibus', 'senēs'] },
  pistor: { gender: 'm', sg: ['pistor', 'pistōris', 'pistōrī', 'pistōrem', 'pistōre', 'pistor'], pl: ['pistōrēs', 'pistōrum', 'pistōribus', 'pistōrēs', 'pistōribus', 'pistōrēs'] },
  caupō: { gender: 'm', sg: ['caupō', 'caupōnis', 'caupōnī', 'caupōnem', 'caupōne', 'caupō'], pl: ['caupōnēs', 'caupōnum', 'caupōnibus', 'caupōnēs', 'caupōnibus', 'caupōnēs'] },
  pānis: { gender: 'm', sg: ['pānis', 'pānis', 'pānī', 'pānem', 'pāne', 'pānis'], pl: ['pānēs', 'pānum/pānium', 'pānibus', 'pānēs', 'pānibus', 'pānēs'] },
  fēlēs: { gender: 'f', sg: ['fēlēs', 'fēlis', 'fēlī', 'fēlem', 'fēle', 'fēlēs'], pl: ['fēlēs', 'fēlium', 'fēlibus', 'fēlēs/fēlīs', 'fēlibus', 'fēlēs'] },
  as: { gender: 'm', sg: ['as', 'assis', 'assī', 'assem', 'asse', 'as'], pl: ['assēs', 'assium', 'assibus', 'assēs/assīs', 'assibus', 'assēs'] },
  faber: { gender: 'm', sg: ['faber', 'fabrī', 'fabrō', 'fabrum', 'fabrō', 'faber'], pl: ['fabrī', 'fabrōrum', 'fabrīs', 'fabrōs', 'fabrīs', 'fabrī'] },
  tālus: { gender: 'm', sg: ['tālus', 'tālī', 'tālō', 'tālum', 'tālō', 'tāle'], pl: ['tālī', 'tālōrum', 'tālīs', 'tālōs', 'tālīs', 'tālī'] },
  mālum: { gender: 'n', sg: ['mālum', 'mālī', 'mālō', 'mālum', 'mālō', 'mālum'], pl: ['māla', 'mālōrum', 'mālīs', 'māla', 'mālīs', 'māla'] },
  solea: { gender: 'f', sg: ['solea', 'soleae', 'soleae', 'soleam', 'soleā', 'solea'], pl: ['soleae', 'soleārum', 'soleīs', 'soleās', 'soleīs', 'soleae'] },
  thermopolium: { gender: 'n', sg: ['thermopolium', 'thermopoliī', 'thermopoliō', 'thermopolium', 'thermopoliō', 'thermopolium'], pl: ['thermopolia', 'thermopoliōrum', 'thermopoliīs', 'thermopolia', 'thermopoliīs', 'thermopolia'] },
  avia: { gender: 'f', sg: ['avia', 'aviae', 'aviae', 'aviam', 'aviā', 'avia'], pl: ['aviae', 'aviārum', 'aviīs', 'aviās', 'aviīs', 'aviae'] },
  ager: {
    gender: 'm',
    sg: ['ager', 'agrī', 'agrō', 'agrum', 'agrō', 'ager'],
    pl: ['agrī', 'agrōrum', 'agrīs', 'agrōs', 'agrīs', 'agrī'],
  },
  liber: {
    gender: 'm',
    sg: ['liber', 'librī', 'librō', 'librum', 'librō', 'liber'],
    pl: ['librī', 'librōrum', 'librīs', 'librōs', 'librīs', 'librī'],
  },
  vir: {
    gender: 'm',
    sg: ['vir', 'virī', 'virō', 'virum', 'virō', 'vir'],
    pl: ['virī', 'virōrum', 'virīs', 'virōs', 'virīs', 'virī'],
  },
  templum: {
    gender: 'n',
    sg: ['templum', 'templī', 'templō', 'templum', 'templō', 'templum'],
    pl: ['templa', 'templōrum', 'templīs', 'templa', 'templīs', 'templa'],
  },
  forum: {
    gender: 'n',
    sg: ['forum', 'forī', 'forō', 'forum', 'forō', 'forum'],
    pl: ['fora', 'forōrum', 'forīs', 'fora', 'forīs', 'fora'],
  },
  aedificium: {
    gender: 'n',
    sg: ['aedificium', 'aedificiī/aedificī', 'aedificiō', 'aedificium', 'aedificiō', 'aedificium'],
    pl: ['aedificia', 'aedificiōrum', 'aedificiīs', 'aedificia', 'aedificiīs', 'aedificia'],
  },
  Pompeiī: {
    gender: 'm',
    pl: ['Pompeiī', 'Pompeiōrum', 'Pompeiīs', 'Pompeiōs', 'Pompeiīs', 'Pompeiī'],
    loc: 'Pompeiīs',
  },
  Vesuvius: {
    gender: 'm',
    sg: ['Vesuvius', 'Vesuviī/Vesuvī', 'Vesuviō', 'Vesuvium', 'Vesuviō', 'Vesuvī'],
  },

  // Third declension
  canis: {
    gender: 'm',
    sg: ['canis', 'canis', 'canī', 'canem', 'cane', 'canis'],
    pl: ['canēs', 'canum', 'canibus', 'canēs', 'canibus', 'canēs'],
  },
  pater: {
    gender: 'm',
    sg: ['pater', 'patris', 'patrī', 'patrem', 'patre', 'pater'],
    pl: ['patrēs', 'patrum', 'patribus', 'patrēs', 'patribus', 'patrēs'],
  },
  māter: {
    gender: 'f',
    sg: ['māter', 'mātris', 'mātrī', 'mātrem', 'mātre', 'māter'],
    pl: ['mātrēs', 'mātrum', 'mātribus', 'mātrēs', 'mātribus', 'mātrēs'],
  },
  rēx: {
    gender: 'm',
    sg: ['rēx', 'rēgis', 'rēgī', 'rēgem', 'rēge', 'rēx'],
    pl: ['rēgēs', 'rēgum', 'rēgibus', 'rēgēs', 'rēgibus', 'rēgēs'],
  },
  homō: {
    gender: 'm',
    sg: ['homō', 'hominis', 'hominī', 'hominem', 'homine', 'homō'],
    pl: ['hominēs', 'hominum', 'hominibus', 'hominēs', 'hominibus', 'hominēs'],
  },
  nōmen: {
    gender: 'n',
    sg: ['nōmen', 'nōminis', 'nōminī', 'nōmen', 'nōmine', 'nōmen'],
    pl: ['nōmina', 'nōminum', 'nōminibus', 'nōmina', 'nōminibus', 'nōmina'],
  },
  nāvis: {
    gender: 'f',
    sg: ['nāvis', 'nāvis', 'nāvī', 'nāvem/nāvim', 'nāve/nāvī', 'nāvis'],
    pl: ['nāvēs', 'nāvium', 'nāvibus', 'nāvēs/nāvīs', 'nāvibus', 'nāvēs'],
  },
  urbs: {
    gender: 'f',
    sg: ['urbs', 'urbis', 'urbī', 'urbem', 'urbe', 'urbs'],
    pl: ['urbēs', 'urbium', 'urbibus', 'urbēs/urbīs', 'urbibus', 'urbēs'],
  },
  mōns: {
    gender: 'm',
    sg: ['mōns', 'montis', 'montī', 'montem', 'monte', 'mōns'],
    pl: ['montēs', 'montium', 'montibus', 'montēs/montīs', 'montibus', 'montēs'],
  },
  cīvis: {
    gender: 'm',
    sg: ['cīvis', 'cīvis', 'cīvī', 'cīvem', 'cīve/cīvī', 'cīvis'],
    pl: ['cīvēs', 'cīvium', 'cīvibus', 'cīvēs/cīvīs', 'cīvibus', 'cīvēs'],
  },
  aedīlis: {
    gender: 'm',
    sg: ['aedīlis', 'aedīlis', 'aedīlī', 'aedīlem', 'aedīlī', 'aedīlis'],
    pl: ['aedīlēs', 'aedīlium', 'aedīlibus', 'aedīlēs/aedīlīs', 'aedīlibus', 'aedīlēs'],
  },
  mare: {
    gender: 'n',
    sg: ['mare', 'maris', 'marī', 'mare', 'marī/mare', 'mare'],
    pl: ['maria', 'marium/marum', 'maribus', 'maria', 'maribus', 'maria'],
  },
  Ferōx: {
    gender: 'm',
    sg: ['Ferōx', 'Ferōcis', 'Ferōcī', 'Ferōcem', 'Ferōce', 'Ferōx'],
  },
};

type Six = readonly [string, string, string, string, string, string];
export interface RefAdj {
  m: { sg: Six; pl: Six };
  f: { sg: Six; pl: Six };
  n: { sg: Six; pl: Six };
}

export const REF_ADJECTIVES: Record<string, RefAdj> = {
  magnus: {
    m: {
      sg: ['magnus', 'magnī', 'magnō', 'magnum', 'magnō', 'magne'],
      pl: ['magnī', 'magnōrum', 'magnīs', 'magnōs', 'magnīs', 'magnī'],
    },
    f: {
      sg: ['magna', 'magnae', 'magnae', 'magnam', 'magnā', 'magna'],
      pl: ['magnae', 'magnārum', 'magnīs', 'magnās', 'magnīs', 'magnae'],
    },
    n: {
      sg: ['magnum', 'magnī', 'magnō', 'magnum', 'magnō', 'magnum'],
      pl: ['magna', 'magnōrum', 'magnīs', 'magna', 'magnīs', 'magna'],
    },
  },
  bonus: {
    m: {
      sg: ['bonus', 'bonī', 'bonō', 'bonum', 'bonō', 'bone'],
      pl: ['bonī', 'bonōrum', 'bonīs', 'bonōs', 'bonīs', 'bonī'],
    },
    f: {
      sg: ['bona', 'bonae', 'bonae', 'bonam', 'bonā', 'bona'],
      pl: ['bonae', 'bonārum', 'bonīs', 'bonās', 'bonīs', 'bonae'],
    },
    n: {
      sg: ['bonum', 'bonī', 'bonō', 'bonum', 'bonō', 'bonum'],
      pl: ['bona', 'bonōrum', 'bonīs', 'bona', 'bonīs', 'bona'],
    },
  },
  pulcher: {
    m: {
      sg: ['pulcher', 'pulchrī', 'pulchrō', 'pulchrum', 'pulchrō', 'pulcher'],
      pl: ['pulchrī', 'pulchrōrum', 'pulchrīs', 'pulchrōs', 'pulchrīs', 'pulchrī'],
    },
    f: {
      sg: ['pulchra', 'pulchrae', 'pulchrae', 'pulchram', 'pulchrā', 'pulchra'],
      pl: ['pulchrae', 'pulchrārum', 'pulchrīs', 'pulchrās', 'pulchrīs', 'pulchrae'],
    },
    n: {
      sg: ['pulchrum', 'pulchrī', 'pulchrō', 'pulchrum', 'pulchrō', 'pulchrum'],
      pl: ['pulchra', 'pulchrōrum', 'pulchrīs', 'pulchra', 'pulchrīs', 'pulchra'],
    },
  },
  miser: {
    m: {
      sg: ['miser', 'miserī', 'miserō', 'miserum', 'miserō', 'miser'],
      pl: ['miserī', 'miserōrum', 'miserīs', 'miserōs', 'miserīs', 'miserī'],
    },
    f: {
      sg: ['misera', 'miserae', 'miserae', 'miseram', 'miserā', 'misera'],
      pl: ['miserae', 'miserārum', 'miserīs', 'miserās', 'miserīs', 'miserae'],
    },
    n: {
      sg: ['miserum', 'miserī', 'miserō', 'miserum', 'miserō', 'miserum'],
      pl: ['misera', 'miserōrum', 'miserīs', 'misera', 'miserīs', 'misera'],
    },
  },
  meus: {
    m: {
      sg: ['meus', 'meī', 'meō', 'meum', 'meō', 'mī'],
      pl: ['meī', 'meōrum', 'meīs', 'meōs', 'meīs', 'meī'],
    },
    f: {
      sg: ['mea', 'meae', 'meae', 'meam', 'meā', 'mea'],
      pl: ['meae', 'meārum', 'meīs', 'meās', 'meīs', 'meae'],
    },
    n: {
      sg: ['meum', 'meī', 'meō', 'meum', 'meō', 'meum'],
      pl: ['mea', 'meōrum', 'meīs', 'mea', 'meīs', 'mea'],
    },
  },
};

type Five = readonly [string, string, string, string, string];
/** Numerals: no vocative here. ūnus is singular only; duo and trēs plural only. */
export const REF_NUMERALS: Record<string, { m: Five; f: Five; n: Five; number: 'sg' | 'pl' }> = {
  ūnus: {
    number: 'sg',
    m: ['ūnus', 'ūnīus', 'ūnī', 'ūnum', 'ūnō'],
    f: ['ūna', 'ūnīus', 'ūnī', 'ūnam', 'ūnā'],
    n: ['ūnum', 'ūnīus', 'ūnī', 'ūnum', 'ūnō'],
  },
  duo: {
    number: 'pl',
    m: ['duo', 'duōrum', 'duōbus', 'duōs/duo', 'duōbus'],
    f: ['duae', 'duārum', 'duābus', 'duās', 'duābus'],
    n: ['duo', 'duōrum', 'duōbus', 'duo', 'duōbus'],
  },
  trēs: {
    number: 'pl',
    m: ['trēs', 'trium', 'tribus', 'trēs/trīs', 'tribus'],
    f: ['trēs', 'trium', 'tribus', 'trēs/trīs', 'tribus'],
    n: ['tria', 'trium', 'tribus', 'tria', 'tribus'],
  },
};

export interface RefVerb {
  present: Six;
  /** Imperative singular and plural (null for verbs with none). */
  imperative: readonly [string, string] | null;
  infinitive: string;
}

export const REF_VERBS: Record<string, RefVerb> = {
  amō: { present: ['amō', 'amās', 'amat', 'amāmus', 'amātis', 'amant'], imperative: ['amā', 'amāte'], infinitive: 'amāre' },
  portō: { present: ['portō', 'portās', 'portat', 'portāmus', 'portātis', 'portant'], imperative: ['portā', 'portāte'], infinitive: 'portāre' },
  dō: { present: ['dō', 'dās', 'dat', 'damus', 'datis', 'dant'], imperative: ['dā', 'date'], infinitive: 'dare' },
  videō: { present: ['videō', 'vidēs', 'videt', 'vidēmus', 'vidētis', 'vident'], imperative: ['vidē', 'vidēte'], infinitive: 'vidēre' },
  sedeō: { present: ['sedeō', 'sedēs', 'sedet', 'sedēmus', 'sedētis', 'sedent'], imperative: ['sedē', 'sedēte'], infinitive: 'sedēre' },
  dūcō: { present: ['dūcō', 'dūcis', 'dūcit', 'dūcimus', 'dūcitis', 'dūcunt'], imperative: ['dūc', 'dūcite'], infinitive: 'dūcere' },
  dīcō: { present: ['dīcō', 'dīcis', 'dīcit', 'dīcimus', 'dīcitis', 'dīcunt'], imperative: ['dīc', 'dīcite'], infinitive: 'dīcere' },
  quaerō: { present: ['quaerō', 'quaeris', 'quaerit', 'quaerimus', 'quaeritis', 'quaerunt'], imperative: ['quaere', 'quaerite'], infinitive: 'quaerere' },
  capiō: { present: ['capiō', 'capis', 'capit', 'capimus', 'capitis', 'capiunt'], imperative: ['cape', 'capite'], infinitive: 'capere' },
  faciō: { present: ['faciō', 'facis', 'facit', 'facimus', 'facitis', 'faciunt'], imperative: ['fac', 'facite'], infinitive: 'facere' },
  audiō: { present: ['audiō', 'audīs', 'audit', 'audīmus', 'audītis', 'audiunt'], imperative: ['audī', 'audīte'], infinitive: 'audīre' },
  veniō: { present: ['veniō', 'venīs', 'venit', 'venīmus', 'venītis', 'veniunt'], imperative: ['venī', 'venīte'], infinitive: 'venīre' },
  // ── Via dell'Abbondanza: reference rows for its words go here ──
  emō: { present: ['emō', 'emis', 'emit', 'emimus', 'emitis', 'emunt'], imperative: ['eme', 'emite'], infinitive: 'emere' },
  vēndō: { present: ['vēndō', 'vēndis', 'vēndit', 'vēndimus', 'vēnditis', 'vēndunt'], imperative: ['vēnde', 'vēndite'], infinitive: 'vēndere' },
  sum: { present: ['sum', 'es', 'est', 'sumus', 'estis', 'sunt'], imperative: ['es', 'este'], infinitive: 'esse' },
  possum: { present: ['possum', 'potes', 'potest', 'possumus', 'potestis', 'possunt'], imperative: null, infinitive: 'posse' },
  eō: { present: ['eō', 'īs', 'it', 'īmus', 'ītis', 'eunt'], imperative: ['ī', 'īte'], infinitive: 'īre' },
  exeō: { present: ['exeō', 'exīs', 'exit', 'exīmus', 'exītis', 'exeunt'], imperative: ['exī', 'exīte'], infinitive: 'exīre' },
  volō: { present: ['volō', 'vīs', 'vult', 'volumus', 'vultis', 'volunt'], imperative: null, infinitive: 'velle' },
};

/** Pronouns, by tag key. */
export const REF_PRONOUNS: Record<string, Record<string, string>> = {
  ego: {
    'nom.sg': 'ego', 'gen.sg': 'meī', 'dat.sg': 'mihi/mihī', 'acc.sg': 'mē', 'abl.sg': 'mē',
    'nom.pl': 'nōs', 'gen.pl': 'nostrum/nostrī', 'dat.pl': 'nōbīs', 'acc.pl': 'nōs', 'abl.pl': 'nōbīs',
  },
  tū: {
    'nom.sg': 'tū', 'gen.sg': 'tuī', 'dat.sg': 'tibi/tibī', 'acc.sg': 'tē', 'abl.sg': 'tē', 'voc.sg': 'tū',
    'nom.pl': 'vōs', 'gen.pl': 'vestrum/vestrī', 'dat.pl': 'vōbīs', 'acc.pl': 'vōs', 'abl.pl': 'vōbīs', 'voc.pl': 'vōs',
  },
};
