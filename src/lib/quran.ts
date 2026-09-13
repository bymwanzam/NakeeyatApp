/**
 * Loading the Qur'an text, the recitation audio, and translations.
 *
 * Text is served from our own origin as one file per surah, so opening a surah
 * costs one small request instead of the 3 MB the whole book would. Surahs the
 * child has already opened are kept in localStorage, so going back to them
 * works with no connection at all.
 *
 * Audio and translations are the two things that do need the network, and both
 * fail softly: no connection means no sound and no translation, never a broken
 * page. The Arabic always renders.
 */
import surahsJson from '../data/surahs.json'

export type Surah = {
  id: number
  nameAr: string
  nameEn: string
  meaning: string
  ayahs: number
  place: string
  bismillahPre: boolean
}

export type Ayah = { n: number; t: string }

export const SURAHS = surahsJson as Surah[]

/** Juz Amma — the short final surahs children normally learn first. */
export const JUZ_AMMA_START = 78

export const surahById = (id: number) => SURAHS.find((s) => s.id === id)

/* ------------------------------------------------------------------ text -- */

const memory = new Map<number, Ayah[]>()
const CACHE_PREFIX = 'nakeeyat.surah.'
const MAX_CACHED = 25

function readCache(id: number): Ayah[] | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + id)
    return raw ? (JSON.parse(raw) as Ayah[]) : null
  } catch {
    return null
  }
}

function writeCache(id: number, ayahs: Ayah[]) {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX))
    // Keep the cache bounded; the whole Qur'an would not fit in localStorage.
    while (keys.length >= MAX_CACHED) localStorage.removeItem(keys.shift()!)
    localStorage.setItem(CACHE_PREFIX + id, JSON.stringify(ayahs))
  } catch {
    // Quota or private browsing — caching is an optimisation, not a requirement.
  }
}

export async function loadSurah(id: number): Promise<Ayah[]> {
  const cached = memory.get(id) ?? readCache(id)
  if (cached) {
    memory.set(id, cached)
    return cached
  }
  const res = await fetch(`${import.meta.env.BASE_URL}quran/surah-${id}.json`)
  if (!res.ok) throw new Error(`Could not load surah ${id} (${res.status})`)
  const { ayahs } = (await res.json()) as { ayahs: Ayah[] }
  memory.set(id, ayahs)
  writeCache(id, ayahs)
  return ayahs
}

/* ----------------------------------------------------------------- audio -- */

/**
 * Al-Husary's muallim (teaching) recitation: slow and precise, recorded for
 * learners, so every tajweed rule is audible.
 */
const RECITER = 'Husary_Muallim_128kbps'
const pad3 = (n: number) => String(n).padStart(3, '0')

export const ayahAudioUrl = (surah: number, ayah: number) =>
  `https://everyayah.com/data/${RECITER}/${pad3(surah)}${pad3(ayah)}.mp3`

/* ---------------------------------------------------------- translation -- */

/**
 * M.A.S. Abdel Haleem — plain modern English, the most readable of the options
 * for a child. (Pickthall and Yusuf Ali are archaic: "thee", "thou".)
 *
 * Fetched from quran.com at runtime and never written into this repo. Modern
 * translations are copyrighted works; requesting them from a source licensed to
 * serve them avoids redistributing text the project has no rights to.
 */
const TRANSLATION_ID = 85

const translationCache = new Map<number, Record<number, string>>()

/** Footnote markers arrive as HTML; the app renders text, so strip them. */
const stripMarkup = (s: string) =>
  s
    .replace(/<sup[^>]*>.*?<\/sup>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()

export async function loadTranslation(surahId: number): Promise<Record<number, string>> {
  const cached = translationCache.get(surahId)
  if (cached) return cached

  const res = await fetch(
    `https://api.quran.com/api/v4/quran/translations/${TRANSLATION_ID}?chapter_number=${surahId}`,
  )
  if (!res.ok) throw new Error(`Translation unavailable (${res.status})`)
  const { translations } = (await res.json()) as { translations: { text: string }[] }

  // The API returns one entry per ayah, in order, without ayah numbers.
  const byAyah: Record<number, string> = {}
  translations.forEach((t, i) => {
    byAyah[i + 1] = stripMarkup(t.text)
  })
  translationCache.set(surahId, byAyah)
  return byAyah
}

export const TRANSLATION_CREDIT = 'Translation: M.A.S. Abdel Haleem (via quran.com)'
export const TEXT_CREDIT = 'Uthmani text with tajweed, via quran.com'
export const RECITER_CREDIT = 'Recitation: Mahmoud Khalil Al-Husary (muallim)'
