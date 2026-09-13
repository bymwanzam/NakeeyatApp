/**
 * Downloads the Qur'an once, into files the app ships with.
 *
 *   node scripts/fetch-quran.mjs
 *
 * Two outputs, split deliberately:
 *
 *   src/data/surahs.json       114 surah headers (~12 KB) - bundled, always loaded
 *   public/quran/surah-N.json  one file per surah        - fetched on open, then cached
 *
 * The whole tajweed text is 4.5 MB, which is far too much to put in the main
 * bundle, but a single surah is small. Splitting per surah means the app opens
 * instantly and still works with no connection once a surah has been read.
 *
 * Source: quran.com API v4 (Uthmani script with tajweed annotation).
 * The text is reproduced unmodified; the tajweed rule boundaries come from the
 * API and are not recomputed here, because deriving tajweed ourselves would
 * risk teaching children incorrect rules.
 */
import { mkdirSync, writeFileSync } from 'node:fs'

const API = 'https://api.quran.com/api/v4'

const get = async (path) => {
  const res = await fetch(`${API}${path}`)
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`)
  return res.json()
}

console.log('Fetching surah metadata...')
const { chapters } = await get('/chapters?language=en')

console.log('Fetching tajweed text for all 6236 ayahs...')
const { verses } = await get('/quran/verses/uthmani_tajweed')

// Group verses by surah. verse_key is "surah:ayah".
const bySurah = new Map()
for (const verse of verses) {
  const [surah, ayah] = verse.verse_key.split(':').map(Number)
  if (!bySurah.has(surah)) bySurah.set(surah, [])
  bySurah.get(surah).push({ n: ayah, t: verse.text_uthmani_tajweed })
}

mkdirSync('public/quran', { recursive: true })

let total = 0
for (const [id, ayahs] of [...bySurah.entries()].sort((a, b) => a[0] - b[0])) {
  ayahs.sort((a, b) => a.n - b.n)
  const json = JSON.stringify({ id, ayahs })
  writeFileSync(`public/quran/surah-${id}.json`, json, 'utf8')
  total += json.length
}

const meta = chapters.map((c) => ({
  id: c.id,
  nameAr: c.name_arabic,
  nameEn: c.name_simple,
  meaning: c.translated_name.name,
  ayahs: c.verses_count,
  place: c.revelation_place, // "makkah" | "madinah"
  // False only for At-Tawbah, and for Al-Fatihah where the basmala is ayah 1.
  bismillahPre: c.bismillah_pre,
}))

writeFileSync('src/data/surahs.json', JSON.stringify(meta, null, 2) + '\n', 'utf8')

console.log(`\n${meta.length} surahs, ${verses.length} ayahs`)
console.log(`public/quran/       ${(total / 1024 / 1024).toFixed(2)} MB across ${bySurah.size} files`)
console.log(`src/data/surahs.json ${(JSON.stringify(meta).length / 1024).toFixed(1)} KB`)
const noBismillah = meta.filter((m) => !m.bismillahPre).map((m) => `${m.id} ${m.nameEn}`)
console.log(`surahs without a preceding basmala: ${noBismillah.join(', ')}`)
