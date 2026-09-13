/**
 * Works out every Arabic string the app ever speaks, and writes a manifest
 * mapping each one to an audio filename.
 *
 * The list is derived from the lesson data itself rather than typed out
 * separately, so adding a letter or a word to src/data/ automatically adds it
 * to the next audio generation run -- there is no second list to forget.
 *
 * Filenames are a hash of the text, so regenerating doesn't churn names and an
 * unchanged word keeps its existing clip.
 *
 *   node scripts/audio-manifest.mjs
 */
import * as esbuild from 'esbuild'
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'

// The data files are TypeScript, so bundle them in memory and import the
// result rather than parsing them by hand.
const bundle = await esbuild.build({
  stdin: {
    contents: `export * from './src/data/letters'\nexport * from './src/data/reading'`,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  write: false,
  platform: 'neutral',
})

const source = bundle.outputFiles[0].text
const data = await import(
  'data:text/javascript;base64,' + Buffer.from(source, 'utf8').toString('base64')
)

const { LETTERS, HARAKAT, BLEND_MARKS, SIMPLE_WORDS, QURAN_WORDS } = data

/** Baa is the carrier letter used to demonstrate a haraka. Keep in sync with ReadingScreen. */
const CARRIER = 'ب'

const texts = new Set()
const add = (t) => t && texts.add(t)

for (const letter of LETTERS) {
  add(letter.nameAr) // "Alif", spoken
  add(letter.word.ar) // the example word
  for (const mark of BLEND_MARKS) add(letter.char + mark.mark) // ba / bi / bu
}

for (const haraka of HARAKAT) add(CARRIER + haraka.mark)

for (const word of [...SIMPLE_WORDS, ...QURAN_WORDS]) {
  add(word.ar)
  for (const syllable of word.syllables) add(syllable)
}

const manifest = {}
for (const text of [...texts].sort()) {
  const hash = createHash('sha1').update(text, 'utf8').digest('hex').slice(0, 16)
  manifest[text] = `${hash}.mp3`
}

writeFileSync('src/data/audio-manifest.json', JSON.stringify(manifest, null, 2) + '\n', 'utf8')
console.log(`${Object.keys(manifest).length} clips -> src/data/audio-manifest.json`)
