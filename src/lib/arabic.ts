/**
 * Helpers for pulling Arabic text apart without breaking how it looks.
 *
 * Arabic letters change shape depending on their neighbours, and that shaping
 * is decided per run of text. So the obvious way to colour one letter inside a
 * word — wrap it in its own <span> — silently rewrites the word: every span
 * becomes its own run, so ـسـ renders as a standalone س and  مَسْجِد  falls
 * apart into disconnected pieces.
 *
 * The fix is the zero-width joiner (U+200D). Adding one at the edge of a span
 * tells the shaper "a joining letter continues here", so each fragment keeps
 * the form it had in the whole word.
 */

const ZWJ = '‍'
/** Combining marks: harakat, shadda, sukoon, superscript alif. */
const MARK = /[ً-ٰٟ]/
const ARABIC_LETTER = /[ء-يٱ-ۓ]/

/** Letters that never join to the letter after them. */
const NON_CONNECTING = new Set('اأإآدذرزوؤةى')

const joinsForward = (ch: string) => ARABIC_LETTER.test(ch) && !NON_CONNECTING.has(ch)

export type Cluster = {
  /** The base letter, without its vowel marks. */
  base: string
  /** Base letter plus any marks sitting on it, ready to render. */
  text: string
}

/** Split a word into base-letter-plus-its-marks clusters. */
export function toClusters(word: string): Cluster[] {
  const out: Cluster[] = []
  for (const ch of word) {
    if (MARK.test(ch) && out.length > 0) {
      out[out.length - 1].text += ch
      continue
    }
    out.push({ base: ch, text: ch })
  }
  return out
}

/**
 * Render one cluster standalone while keeping the shape it has in the word:
 * a joiner goes on whichever side had a connecting neighbour.
 */
export function clusterInContext(clusters: Cluster[], i: number): string {
  const prev = clusters[i - 1]?.base
  const next = clusters[i + 1]?.base
  const joinedBefore = prev !== undefined && joinsForward(prev)
  const joinedAfter = next !== undefined && ARABIC_LETTER.test(next) && joinsForward(clusters[i].base)
  return (joinedBefore ? ZWJ : '') + clusters[i].text + (joinedAfter ? ZWJ : '')
}

/** Spellings of a letter that should count as the same letter when highlighting. */
export function letterVariants(letterId: string, char: string): string {
  if (letterId === 'alif') return 'اأإآ'
  if (letterId === 'yaa') return 'يى'
  return char
}
