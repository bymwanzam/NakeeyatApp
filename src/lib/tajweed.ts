/**
 * Turns the annotated Qur'an markup into plain tokens the app renders itself.
 *
 * The source text arrives looking like:
 *
 *   بِرَبِّ <tajweed class=ham_wasl>ٱ</tajweed><tajweed class=ghunnah>نّ</tajweed>سِ <span class=end>١</span>
 *
 * The obvious shortcut is to hand that straight to dangerouslySetInnerHTML.
 * This parses it into tokens instead, for two reasons: nothing from a network
 * response is ever injected as HTML, and the ayah-end marker becomes a piece of
 * data we can style as a proper numbered medallion rather than a bare glyph.
 */

export type TajweedToken =
  | { kind: 'text'; text: string; rule?: string }
  | { kind: 'end'; number: string }

// Matches either a tajweed span or the end-of-ayah marker. The class value is
// unquoted in the source, but quotes are tolerated in case that ever changes.
const TOKEN = /<tajweed class=["']?([a-z_]+)["']?>([\s\S]*?)<\/tajweed>|<span class=["']?end["']?>([\s\S]*?)<\/span>/g

export function parseTajweed(markup: string): TajweedToken[] {
  const tokens: TajweedToken[] = []
  let cursor = 0

  // Plain text between two annotations still has to be emitted.
  const pushPlain = (upTo: number) => {
    const text = markup.slice(cursor, upTo)
    if (text) tokens.push({ kind: 'text', text })
  }

  TOKEN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = TOKEN.exec(markup)) !== null) {
    pushPlain(match.index)
    const [, rule, ruled, endNumber] = match
    if (rule !== undefined) {
      if (ruled) tokens.push({ kind: 'text', text: ruled, rule })
    } else {
      tokens.push({ kind: 'end', number: (endNumber ?? '').trim() })
    }
    cursor = match.index + match[0].length
  }
  pushPlain(markup.length)

  return tokens
}

/** The ayah as readable text, with all annotation stripped. Used for search. */
export function plainText(markup: string): string {
  return parseTajweed(markup)
    .filter((t): t is Extract<TajweedToken, { kind: 'text' }> => t.kind === 'text')
    .map((t) => t.text)
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Which rules actually occur in an ayah, so the legend can show only those. */
export function rulesUsed(markup: string): string[] {
  const seen = new Set<string>()
  for (const token of parseTajweed(markup)) {
    if (token.kind === 'text' && token.rule) seen.add(token.rule)
  }
  return [...seen]
}
