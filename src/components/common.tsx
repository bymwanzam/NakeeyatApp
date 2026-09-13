import { useLang } from '../i18n'
import { LETTERS } from '../data/letters'
import type { Letter } from '../data/letters'

export function ScreenHead({
  onBack,
  title,
  subtitle,
}: {
  onBack: () => void
  title: string
  subtitle?: string
}) {
  const { t } = useLang()
  return (
    <div className="screen-head">
      <button className="icon-btn back-arrow" onClick={onBack} aria-label={t('back')}>
        ←
      </button>
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </div>
  )
}

/**
 * The alphabet board. Laid out RTL so the letters run in the order a child
 * reads them, with earned stars shown on each tile.
 */
export function LetterGrid({
  onPick,
  starsFor,
}: {
  onPick: (letter: Letter, index: number) => void
  starsFor?: (letter: Letter) => number
}) {
  const { lang } = useLang()
  return (
    <div className="letters">
      {LETTERS.map((letter, i) => {
        const stars = starsFor?.(letter) ?? 0
        return (
          <button key={letter.id} className="letter-tile" onClick={() => onPick(letter, i)}>
            {stars > 0 && <span className="tile-stars">{'⭐'.repeat(stars)}</span>}
            <span className="glyph">{letter.char}</span>
            <span className="tile-name">{lang === 'en' ? letter.nameEn : letter.nameAr}</span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Previous/next pair. The arrows are direction-aware: in an RTL layout
 * "previous" is to the right, so a hard-coded ← would point a child backwards.
 */
export function NavButtons({ onNavigate }: { onNavigate: (delta: number) => void }) {
  const { t, dir } = useLang()
  const backArrow = dir === 'rtl' ? '→' : '←'
  const fwdArrow = dir === 'rtl' ? '←' : '→'
  return (
    <div className="trace-actions" style={{ marginTop: 22 }}>
      <button className="btn" onClick={() => onNavigate(-1)}>
        {backArrow} {t('previous')}
      </button>
      <button className="btn btn-gold" onClick={() => onNavigate(1)}>
        {t('next')} {fwdArrow}
      </button>
    </div>
  )
}

export function Stars({ count }: { count: number }) {
  return (
    <div className="stars-row" aria-label={`${count} stars`}>
      {[0, 1, 2].map((i) =>
        i < count ? (
          <span key={i} className="earned">
            ⭐
          </span>
        ) : (
          <span key={i} style={{ opacity: 0.25 }}>
            ☆
          </span>
        ),
      )}
    </div>
  )
}
