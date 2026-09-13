/**
 * Harakat (short vowels) and the reading ladder built on top of them:
 * single letter + haraka  ->  simple everyday words  ->  words from the Qur'an.
 *
 * Harakat are combining marks, so they are stored bare and always rendered
 * attached to a carrier letter. Alone they render as a dotted circle.
 */

export type Haraka = {
  id: string
  /** The bare combining mark. */
  mark: string
  nameAr: string
  nameEn: string
  /** What the mark does to the letter it sits on. */
  soundEn: string
  /** Where the mark is written relative to the letter. */
  positionEn: string
}

export const HARAKAT: Haraka[] = [
  {
    id: 'fatha',
    mark: 'َ',
    nameAr: 'فَتْحَة',
    nameEn: 'Fatha',
    soundEn: 'adds a short "a"',
    positionEn: 'a small slash above the letter',
  },
  {
    id: 'kasra',
    mark: 'ِ',
    nameAr: 'كَسْرَة',
    nameEn: 'Kasra',
    soundEn: 'adds a short "i"',
    positionEn: 'a small slash below the letter',
  },
  {
    id: 'damma',
    mark: 'ُ',
    nameAr: 'ضَمَّة',
    nameEn: 'Damma',
    soundEn: 'adds a short "u"',
    positionEn: 'a tiny waw above the letter',
  },
  {
    id: 'sukoon',
    mark: 'ْ',
    nameAr: 'سُكُون',
    nameEn: 'Sukoon',
    soundEn: 'no vowel — the letter stops',
    positionEn: 'a small circle above the letter',
  },
  {
    id: 'shadda',
    mark: 'ّ',
    nameAr: 'شَدَّة',
    nameEn: 'Shadda',
    soundEn: 'doubles the letter — hold it longer',
    positionEn: 'a small "w" shape above the letter',
  },
]

/** The three vowels a child blends first, in teaching order. */
export const BLEND_MARKS = HARAKAT.slice(0, 3)

/** Transliteration of a consonant + short vowel, for the blending drill. */
export const BLEND_VOWEL_SOUND: Record<string, string> = {
  fatha: 'a',
  kasra: 'i',
  damma: 'u',
}

export type ReadingWord = {
  ar: string
  translit: string
  en: string
  /** The word split into the chunks a child sounds out, right-to-left. */
  syllables: string[]
}

/** Stage 2 — everyday words with simple, regular vowelling. */
export const SIMPLE_WORDS: ReadingWord[] = [
  { ar: 'أَبْ', translit: 'ab', en: 'father', syllables: ['أَبْ'] },
  { ar: 'يَد', translit: 'yad', en: 'hand', syllables: ['يَ', 'د'] },
  { ar: 'قَمَر', translit: 'qa-mar', en: 'moon', syllables: ['قَ', 'مَر'] },
  { ar: 'شَمْس', translit: 'shams', en: 'sun', syllables: ['شَمْس'] },
  { ar: 'بَيْت', translit: 'bayt', en: 'house', syllables: ['بَيْت'] },
  { ar: 'كِتَاب', translit: 'ki-taab', en: 'book', syllables: ['كِ', 'تَاب'] },
  { ar: 'قَلَم', translit: 'qa-lam', en: 'pen', syllables: ['قَ', 'لَم'] },
  { ar: 'مَسْجِد', translit: 'mas-jid', en: 'mosque', syllables: ['مَسْ', 'جِد'] },
  { ar: 'سَمَك', translit: 'sa-mak', en: 'fish', syllables: ['سَ', 'مَك'] },
  { ar: 'نَجْم', translit: 'najm', en: 'star', syllables: ['نَجْم'] },
]

/**
 * Stage 3 — short words a child will meet in the Qur'an, chosen because they
 * are brief and regularly vowelled. Presented as vocabulary to sound out.
 */
export const QURAN_WORDS: ReadingWord[] = [
  { ar: 'قُلْ', translit: 'qul', en: 'say', syllables: ['قُلْ'] },
  { ar: 'هُوَ', translit: 'hu-wa', en: 'He', syllables: ['هُ', 'وَ'] },
  { ar: 'أَحَد', translit: 'a-had', en: 'One', syllables: ['أَ', 'حَد'] },
  { ar: 'رَبّ', translit: 'rabb', en: 'Lord', syllables: ['رَبّ'] },
  { ar: 'نَاس', translit: 'naas', en: 'mankind', syllables: ['نَاس'] },
  { ar: 'نُور', translit: 'noor', en: 'light', syllables: ['نُور'] },
  { ar: 'حَمْد', translit: 'hamd', en: 'praise', syllables: ['حَمْد'] },
  { ar: 'صَبْر', translit: 'sabr', en: 'patience', syllables: ['صَبْر'] },
  { ar: 'فَلَق', translit: 'fa-laq', en: 'daybreak', syllables: ['فَ', 'لَق'] },
  { ar: 'عَلِيم', translit: "'a-leem", en: 'All-Knowing', syllables: ['عَ', 'لِيم'] },
]
