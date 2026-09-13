import { useEffect, useRef, useState } from 'react'
import { useLang } from '../i18n'
import type { StringKey } from '../i18n'
import { LETTERS } from '../data/letters'
import type { Letter } from '../data/letters'
import {
  BLEND_MARKS,
  BLEND_VOWEL_SOUND,
  HARAKAT,
  QURAN_WORDS,
  SIMPLE_WORDS,
} from '../data/reading'
import type { ReadingWord } from '../data/reading'
import { useProgress } from '../lib/progress'
import { speakArabic } from '../lib/speech'
import { LetterGrid, ScreenHead } from './common'

type Stage = 'harakat' | 'blend' | 'words' | 'quran'

const TABS: { id: Stage; label: StringKey }[] = [
  { id: 'harakat', label: 'stageHarakat' },
  { id: 'blend', label: 'stageBlend' },
  { id: 'words', label: 'stageWords' },
  { id: 'quran', label: 'stageQuran' },
]

/** Baa is the conventional carrier letter for demonstrating a haraka. */
const CARRIER = 'ب'

/**
 * The letter's bare consonant sound, for labelling blends as "ba / bi / bu".
 * `soundEn` is written as "<sound> — <plain-English hint>", so the part before
 * the dash is exactly the transliteration wanted here.
 */
const consonantOf = (letter: Letter) => letter.soundEn.split(' ')[0]

export default function ReadingScreen({ onBack }: { onBack: () => void }) {
  const { t } = useLang()
  const [stage, setStage] = useState<Stage>('harakat')

  return (
    <main className="screen">
      <ScreenHead onBack={onBack} title={t('readingTitle')} subtitle={t('tapToHear')} />

      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${stage === tab.id ? 'on' : ''}`}
            onClick={() => setStage(tab.id)}
          >
            {t(tab.label)}
          </button>
        ))}
      </div>

      {stage === 'harakat' && <HarakatStage />}
      {stage === 'blend' && <BlendStage />}
      {stage === 'words' && <WordStage words={SIMPLE_WORDS} />}
      {stage === 'quran' && <WordStage words={QURAN_WORDS} />}
    </main>
  )
}

function HarakatStage() {
  const { lang } = useLang()
  return (
    <div className="card-grid">
      {HARAKAT.map((haraka) => (
        <button
          key={haraka.id}
          className="read-card"
          onClick={() => speakArabic(CARRIER + haraka.mark, 0.7)}
        >
          <div className="big">{CARRIER + haraka.mark}</div>
          <div className="translit">{lang === 'en' ? haraka.nameEn : haraka.nameAr}</div>
          <div className="gloss">{haraka.soundEn}</div>
          <div className="gloss" style={{ marginTop: 4, opacity: 0.8 }}>
            {haraka.positionEn}
          </div>
        </button>
      ))}
    </div>
  )
}

/**
 * The blending drill: one consonant against each of the three short vowels,
 * which is the moment reading actually starts to click for a child.
 */
function BlendStage() {
  const { t, lang } = useLang()
  const [letter, setLetter] = useState<Letter>(LETTERS[1]) // start on baa

  return (
    <>
      <div className="word-demo" style={{ marginTop: 0 }}>
        <div className="gloss">{lang === 'en' ? letter.nameEn : letter.nameAr}</div>
        <div className="card-grid" style={{ marginTop: 14 }}>
          {BLEND_MARKS.map((mark) => {
            const syllable = letter.char + mark.mark
            return (
              <button
                key={mark.id}
                className="read-card"
                onClick={() => speakArabic(syllable, 0.65)}
              >
                <div className="big">{syllable}</div>
                <div className="translit">
                  {consonantOf(letter)}
                  {BLEND_VOWEL_SOUND[mark.id]}
                </div>
                <div className="gloss">{lang === 'en' ? mark.nameEn : mark.nameAr}</div>
              </button>
            )
          })}
        </div>
      </div>

      <p style={{ color: 'var(--ink-soft)', fontWeight: 600, margin: '24px 0 12px' }}>
        {t('chooseLetter')}
      </p>
      <LetterGrid onPick={(l) => setLetter(l)} />
    </>
  )
}

function WordStage({ words }: { words: ReadingWord[] }) {
  const { t } = useLang()
  const { recordRead } = useProgress()
  const [selected, setSelected] = useState<ReadingWord>(words[0])

  // Restarting the list (switching tabs) should land on that list's first word.
  useEffect(() => setSelected(words[0]), [words])

  return (
    <>
      <WordDetail word={selected} />
      <p style={{ color: 'var(--ink-soft)', fontWeight: 600, margin: '24px 0 12px' }}>
        {t('tapToHear')}
      </p>
      <div className="card-grid">
        {words.map((word) => (
          <button
            key={word.ar}
            className="read-card"
            onClick={() => {
              setSelected(word)
              recordRead(word.ar)
              speakArabic(word.ar, 0.7)
            }}
          >
            <div className="big">{word.ar}</div>
            <div className="translit">{word.translit}</div>
            <div className="gloss">{word.en}</div>
          </button>
        ))}
      </div>
    </>
  )
}

/** Plays a word syllable by syllable, lighting each chunk as it is spoken. */
function WordDetail({ word }: { word: ReadingWord }) {
  const { t } = useLang()
  const [lit, setLit] = useState(-1)
  const timersRef = useRef<number[]>([])

  const cancel = () => {
    timersRef.current.forEach(window.clearTimeout)
    timersRef.current = []
  }

  useEffect(() => {
    cancel()
    setLit(-1)
  }, [word])

  useEffect(() => cancel, [])

  const soundOut = () => {
    cancel()
    const GAP = 950
    word.syllables.forEach((syllable, i) => {
      timersRef.current.push(
        window.setTimeout(() => {
          setLit(i)
          speakArabic(syllable, 0.6)
        }, i * GAP),
      )
    })
    // Finish by hearing the whole word joined up.
    timersRef.current.push(
      window.setTimeout(() => {
        setLit(-1)
        speakArabic(word.ar, 0.7)
      }, word.syllables.length * GAP),
    )
  }

  return (
    <div className="word-demo" style={{ marginTop: 0 }}>
      <div className="big-word">{word.ar}</div>
      <div className="gloss">
        {word.translit} — {t('meaning')}: {word.en}
      </div>

      <div className="syllables">
        {word.syllables.map((syllable, i) => (
          <button
            key={i}
            className={`syllable ${lit === i ? 'lit' : ''}`}
            onClick={() => speakArabic(syllable, 0.6)}
          >
            {syllable}
          </button>
        ))}
      </div>

      <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={soundOut}>
        🔊 {t('soundItOut')}
      </button>
    </div>
  )
}
