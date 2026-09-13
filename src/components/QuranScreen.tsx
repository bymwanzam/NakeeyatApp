import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLang } from '../i18n'
import { TAJWEED_RULES, colorForRule, ruleById } from '../data/tajweed-rules'
import type { TajweedRule } from '../data/tajweed-rules'
import { parseTajweed, rulesUsed } from '../lib/tajweed'
import {
  JUZ_AMMA_START,
  RECITER_CREDIT,
  SURAHS,
  TEXT_CREDIT,
  TRANSLATION_CREDIT,
  ayahAudioUrl,
  loadSurah,
  loadTranslation,
  surahById,
} from '../lib/quran'
import type { Ayah, Surah } from '../lib/quran'
import { ScreenHead } from './common'

export default function QuranScreen({ onBack }: { onBack: () => void }) {
  const [surahId, setSurahId] = useState<number | null>(null)

  if (surahId === null) return <SurahList onPick={setSurahId} onBack={onBack} />
  return <Reader surahId={surahId} onBack={() => setSurahId(null)} onJump={setSurahId} />
}

/* ------------------------------------------------------------- surah list -- */

function SurahList({ onPick, onBack }: { onPick: (id: number) => void; onBack: () => void }) {
  const { t, lang } = useLang()
  const [query, setQuery] = useState('')

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return SURAHS.filter(
      (s) =>
        s.nameEn.toLowerCase().includes(q) ||
        s.meaning.toLowerCase().includes(q) ||
        s.nameAr.includes(query.trim()) ||
        String(s.id) === q,
    )
  }, [query])

  const juzAmma = SURAHS.filter((s) => s.id >= JUZ_AMMA_START)

  return (
    <main className="screen">
      <ScreenHead onBack={onBack} title={t('quranTitle')} subtitle={t('quranDesc')} />

      <input
        className="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('searchSurah')}
        aria-label={t('searchSurah')}
      />

      {matches ? (
        <SurahGrid surahs={matches} onPick={onPick} lang={lang} />
      ) : (
        <>
          {/* Children almost always begin with the short final surahs, so those
              get their own section instead of being buried at the bottom. */}
          <h2 className="section-title">⭐ {t('startHereSurahs')}</h2>
          <SurahGrid surahs={juzAmma} onPick={onPick} lang={lang} />

          <h2 className="section-title">{t('allSurahs')}</h2>
          <SurahGrid surahs={SURAHS} onPick={onPick} lang={lang} />
        </>
      )}

      <p className="credits">
        {TEXT_CREDIT} · {RECITER_CREDIT}
      </p>
    </main>
  )
}

function SurahGrid({
  surahs,
  onPick,
  lang,
}: {
  surahs: Surah[]
  onPick: (id: number) => void
  lang: string
}) {
  const { t } = useLang()
  return (
    <div className="surah-grid">
      {surahs.map((s) => (
        <button key={s.id} className="surah-card" onClick={() => onPick(s.id)}>
          <span className="surah-num">{s.id}</span>
          <span className="surah-names">
            <span className="surah-ar">{s.nameAr}</span>
            <span className="surah-en">{lang === 'en' ? s.nameEn : s.meaning}</span>
          </span>
          <span className="surah-meta">
            {s.ayahs} {t('ayahsLabel')}
            <br />
            {s.place === 'makkah' ? t('makkah') : t('madinah')}
          </span>
        </button>
      ))}
    </div>
  )
}

/* ----------------------------------------------------------------- reader -- */

const SIZES = [30, 38, 48, 58]

function Reader({
  surahId,
  onBack,
  onJump,
}: {
  surahId: number
  onBack: () => void
  onJump: (id: number) => void
}) {
  const { t, lang, dir } = useLang()
  const surah = surahById(surahId)!
  const previous = surahById(surahId - 1)
  const next = surahById(surahId + 1)
  // In an RTL layout "previous" sits to the right, so the arrows swap.
  const backArrow = dir === 'rtl' ? '→' : '←'
  const fwdArrow = dir === 'rtl' ? '←' : '→'

  const [ayahs, setAyahs] = useState<Ayah[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [translation, setTranslation] = useState<Record<number, string> | null>(null)
  const [showTranslation, setShowTranslation] = useState(false)
  const [translationFailed, setTranslationFailed] = useState(false)
  const [sizeIndex, setSizeIndex] = useState(1)
  const [legendRule, setLegendRule] = useState<TajweedRule | null>(null)
  const [showLegend, setShowLegend] = useState(false)
  const [playing, setPlaying] = useState<number | null>(null)
  const [audioFailed, setAudioFailed] = useState(false)

  // One audio element for the whole reader, created once.
  const [audio] = useState<HTMLAudioElement | null>(() =>
    typeof Audio === 'undefined' ? null : new Audio(),
  )
  // Continuous play walks to the next ayah on 'ended'; a single tap does not.
  const continuousRef = useRef(false)
  // Mirrors `playing` so the 'ended' handler never reads a stale value.
  const playingRef = useRef<number | null>(null)

  const stop = useCallback(() => {
    continuousRef.current = false
    playingRef.current = null
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
    }
    setPlaying(null)
  }, [audio])

  const play = useCallback(
    (ayahNumber: number, continuous: boolean) => {
      if (!audio) return
      setAudioFailed(false)
      continuousRef.current = continuous
      playingRef.current = ayahNumber
      setPlaying(ayahNumber)
      audio.src = ayahAudioUrl(surahId, ayahNumber)
      audio.play().catch(() => {
        // Offline, or the file is missing for this ayah.
        playingRef.current = null
        setPlaying(null)
        setAudioFailed(true)
      })
    },
    [audio, surahId],
  )

  useEffect(() => {
    setAyahs(null)
    setFailed(false)
    // Jumping to the next surah should start at its first ayah, not halfway
    // down where the previous surah was being read.
    window.scrollTo({ top: 0 })
    loadSurah(surahId).then(setAyahs, () => setFailed(true))
  }, [surahId])

  useEffect(() => {
    if (!showTranslation || translation) return
    setTranslationFailed(false)
    loadTranslation(surahId).then(setTranslation, () => setTranslationFailed(true))
  }, [showTranslation, translation, surahId])

  // Switching surah must drop the previous surah's translation and stop its audio.
  useEffect(() => {
    setTranslation(null)
    stop()
  }, [surahId, stop])

  const total = ayahs?.length ?? 0
  useEffect(() => {
    if (!audio) return
    const onEnded = () => {
      const current = playingRef.current
      if (!continuousRef.current || current === null || current >= total) {
        stop()
        return
      }
      play(current + 1, true)
    }
    audio.addEventListener('ended', onEnded)
    return () => audio.removeEventListener('ended', onEnded)
  }, [audio, total, play, stop])

  // Leaving the reader must not leave recitation playing behind it.
  useEffect(() => () => audio?.pause(), [audio])

  const fontSize = SIZES[sizeIndex]

  return (
    <main className="screen">
      <ScreenHead
        onBack={onBack}
        title={lang === 'en' ? surah.nameEn : surah.nameAr}
        subtitle={`${surah.meaning} · ${surah.ayahs} ${t('ayahsLabel')} · ${
          surah.place === 'makkah' ? t('makkah') : t('madinah')
        }`}
      />

      <div className="reader-toolbar">
        <button
          className={`pill ${playing !== null ? 'on' : ''}`}
          onClick={() => (playing !== null ? stop() : play(1, true))}
        >
          {playing !== null ? `⏹ ${t('stopAudio')}` : `▶ ${t('playSurah')}`}
        </button>
        <button
          className={`pill ${showTranslation ? 'on' : ''}`}
          onClick={() => setShowTranslation((v) => !v)}
        >
          🌍 {t('showTranslationBtn')}
        </button>
        <button className={`pill ${showLegend ? 'on' : ''}`} onClick={() => setShowLegend((v) => !v)}>
          🎨 {t('tajweedColours')}
        </button>
        <span className="pill size-pill">
          {t('textSize')}
          <button
            onClick={() => setSizeIndex((i) => Math.max(0, i - 1))}
            disabled={sizeIndex === 0}
            aria-label="Smaller"
          >
            −
          </button>
          <button
            onClick={() => setSizeIndex((i) => Math.min(SIZES.length - 1, i + 1))}
            disabled={sizeIndex === SIZES.length - 1}
            aria-label="Larger"
          >
            +
          </button>
        </span>
      </div>

      {showLegend && <Legend />}
      {audioFailed && <div className="banner">🔈 {t('audioOffline')}</div>}
      {translationFailed && showTranslation && <div className="banner">🌍 {t('translationOffline')}</div>}

      {failed && <p className="note">{t('loadFailed')}</p>}
      {!ayahs && !failed && <p className="note info">{t('loading')}</p>}

      {ayahs && (
        <div className="ayah-list">
          {surah.bismillahPre && (
            <p className="bismillah-line" style={{ fontSize: fontSize + 4 }}>
              بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
            </p>
          )}

          {ayahs.map((ayah) => (
            <article
              key={ayah.n}
              className={`ayah ${playing === ayah.n ? 'playing' : ''}`}
              id={`ayah-${ayah.n}`}
            >
              <div className="ayah-controls">
                <button
                  className="ayah-play"
                  onClick={() => (playing === ayah.n ? stop() : play(ayah.n, false))}
                  aria-label={`Play ayah ${ayah.n}`}
                >
                  {playing === ayah.n ? '⏹' : '▶'}
                </button>
                <span className="ayah-index">{ayah.n}</span>
              </div>

              <p className="ayah-text" style={{ fontSize }}>
                <TajweedText markup={ayah.t} onRuleTap={setLegendRule} />
              </p>

              {showTranslation && translation?.[ayah.n] && (
                <p className="ayah-translation">{translation[ayah.n]}</p>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Al-Fatihah has no previous surah and An-Nas no next, so the missing
          neighbour is omitted rather than rendered as an empty dead button. */}
      <div className="trace-actions" style={{ marginTop: 24 }}>
        {previous && (
          <button className="btn" onClick={() => onJump(previous.id)}>
            {backArrow} {previous.nameEn}
          </button>
        )}
        {next && (
          <button className="btn btn-gold" onClick={() => onJump(next.id)}>
            {next.nameEn} {fwdArrow}
          </button>
        )}
      </div>

      <p className="credits">
        {TEXT_CREDIT} · {RECITER_CREDIT}
        {showTranslation && ` · ${TRANSLATION_CREDIT}`}
      </p>

      {legendRule && <RuleSheet rule={legendRule} onClose={() => setLegendRule(null)} />}
    </main>
  )
}

/**
 * Renders one ayah, colouring each tajweed span.
 *
 * Important: these spans carry a colour and nothing else — no padding, margin,
 * border or display change. Arabic letters must keep joining across the span
 * boundaries (the word ٱلنَّاسِ arrives split across five spans), and browsers
 * only shape across inline boundaries while those boundaries stay "empty" in
 * the box sense. Adding padding here would visibly break words apart.
 */
function TajweedText({
  markup,
  onRuleTap,
}: {
  markup: string
  onRuleTap: (rule: TajweedRule) => void
}) {
  const tokens = useMemo(() => parseTajweed(markup), [markup])

  return (
    <>
      {tokens.map((token, i) => {
        if (token.kind === 'end') {
          return (
            <span key={i} className="ayah-end">
              {token.number}
            </span>
          )
        }
        if (!token.rule) return <span key={i}>{token.text}</span>
        const rule = ruleById.get(token.rule)
        return (
          <span
            key={i}
            className="tj"
            style={{ color: colorForRule(token.rule) }}
            title={rule?.nameEn}
            onClick={() => rule && onRuleTap(rule)}
          >
            {token.text}
          </span>
        )
      })}
    </>
  )
}

function Legend() {
  const { t, lang } = useLang()
  return (
    <div className="legend">
      <p className="legend-hint">{t('tajweedHint')}</p>
      <div className="legend-grid">
        {TAJWEED_RULES.map((rule) => (
          <div key={rule.id} className="legend-item">
            <span className="swatch" style={{ background: rule.color }} />
            <span>
              <strong style={{ color: rule.color }}>
                {lang === 'en' ? rule.nameEn : rule.nameAr}
              </strong>
              <br />
              <span className="legend-how">{rule.howEn}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Tapping a coloured letter explains that rule, so colours are discoverable. */
function RuleSheet({ rule, onClose }: { rule: TajweedRule; onClose: () => void }) {
  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <span className="swatch big" style={{ background: rule.color }} />
        <h3 style={{ color: rule.color }}>{rule.nameEn}</h3>
        <p className="sheet-ar">{rule.nameAr}</p>
        <p className="sheet-how">{rule.howEn}</p>
        <button className="btn btn-primary" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  )
}

/** Only the rules actually present in an ayah — exported for future per-ayah hints. */
export { rulesUsed }
