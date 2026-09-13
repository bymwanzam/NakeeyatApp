/**
 * The 17 tajweed rules the Qur'an text is annotated with, with the colour each
 * is drawn in and a child-level explanation.
 *
 * The colours follow the convention used by quran.com and by printed colour-
 * coded tajweed mushafs, rather than anything invented here. That matters: a
 * child who learns "red means bounce it" in this app should find the same red
 * meaning the same thing when they pick up a paper mushaf. Some hues are
 * darkened slightly from the web original purely for legibility.
 *
 * The rule names and boundaries come from the source data and are not
 * recalculated — this file only describes and colours them.
 */

export type TajweedRule = {
  /** Class name as it appears in the source markup. */
  id: string
  nameAr: string
  nameEn: string
  color: string
  /** What the child should actually do with their voice. */
  howEn: string
}

export const TAJWEED_RULES: TajweedRule[] = [
  {
    id: 'ghunnah',
    nameAr: 'غُنَّة',
    nameEn: 'Ghunnah',
    color: '#E06C00',
    howEn: 'Hum through your nose and hold it for two beats.',
  },
  {
    id: 'idgham_ghunnah',
    nameAr: 'إِدْغَام بِغُنَّة',
    nameEn: 'Idgham with ghunnah',
    color: '#169777',
    howEn: 'Merge this letter into the next one, humming as you do.',
  },
  {
    id: 'idgham_wo_ghunnah',
    nameAr: 'إِدْغَام بِلَا غُنَّة',
    nameEn: 'Idgham without ghunnah',
    color: '#169200',
    howEn: 'Merge this letter into the next one, with no humming.',
  },
  {
    id: 'idgham_shafawi',
    nameAr: 'إِدْغَام شَفَوِي',
    nameEn: 'Lip idgham',
    color: '#479500',
    howEn: 'A meem merges into the meem after it, made with the lips.',
  },
  {
    id: 'idgham_mutajanisayn',
    nameAr: 'إِدْغَام مُتَجَانِسَيْن',
    nameEn: 'Idgham mutajanisayn',
    color: '#8A8A8A',
    howEn: 'Two letters made in the same place join into one.',
  },
  {
    id: 'idgham_mutaqaribayn',
    nameAr: 'إِدْغَام مُتَقَارِبَيْن',
    nameEn: 'Idgham mutaqaribayn',
    color: '#8A8A8A',
    howEn: 'Two letters made in close places join into one.',
  },
  {
    id: 'ikhafa',
    nameAr: 'إِخْفَاء',
    nameEn: 'Ikhfa',
    color: '#9400A8',
    howEn: 'Hide the noon sound softly and hum for two beats.',
  },
  {
    id: 'ikhafa_shafawi',
    nameAr: 'إِخْفَاء شَفَوِي',
    nameEn: 'Lip ikhfa',
    color: '#B8009C',
    howEn: 'Hide the meem gently with your lips lightly together.',
  },
  {
    id: 'iqlab',
    nameAr: 'إِقْلَاب',
    nameEn: 'Iqlab',
    color: '#0E9BD6',
    howEn: 'The noon turns into a meem sound before a baa.',
  },
  {
    id: 'qalaqah',
    nameAr: 'قَلْقَلَة',
    nameEn: 'Qalqalah',
    color: '#DD0008',
    howEn: 'Give the letter a little bounce, like a small echo.',
  },
  {
    id: 'madda_normal',
    nameAr: 'مَدّ طَبِيعِي',
    nameEn: 'Natural madd',
    color: '#3B6BE8',
    howEn: 'Stretch the sound for two beats.',
  },
  {
    id: 'madda_permissible',
    nameAr: 'مَدّ جَائِز',
    nameEn: 'Permissible madd',
    color: '#3A46E0',
    howEn: 'You may stretch this for two, four or six beats.',
  },
  {
    id: 'madda_obligatory',
    nameAr: 'مَدّ وَاجِب',
    nameEn: 'Obligatory madd',
    color: '#2144C1',
    howEn: 'You must stretch this for four or five beats.',
  },
  {
    id: 'madda_necessary',
    nameAr: 'مَدّ لَازِم',
    nameEn: 'Necessary madd',
    color: '#000EBC',
    howEn: 'Stretch this the longest — a full six beats.',
  },
  {
    id: 'ham_wasl',
    nameAr: 'هَمْزَة وَصْل',
    nameEn: 'Connecting hamza',
    color: '#8A8A8A',
    howEn: 'Skip this when you join it to the word before.',
  },
  {
    id: 'laam_shamsiyah',
    nameAr: 'لَام شَمْسِيَّة',
    nameEn: 'Sun laam',
    color: '#9A9A9A',
    howEn: 'Do not say this laam — go straight to the next letter.',
  },
  {
    id: 'slnt',
    nameAr: 'حَرْف غَيْر مَلْفُوظ',
    nameEn: 'Silent letter',
    color: '#9A9A9A',
    howEn: 'This letter is written but not pronounced.',
  },
]

export const ruleById = new Map(TAJWEED_RULES.map((r) => [r.id, r]))

/** Colour for any rule id, falling back to the normal text colour. */
export const colorForRule = (id: string) => ruleById.get(id)?.color ?? 'inherit'
