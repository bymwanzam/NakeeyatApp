import { useCallback, useEffect, useRef, useState } from 'react'
import { useLang } from '../i18n'
import { LETTERS } from '../data/letters'
import type { Letter } from '../data/letters'
import { useProgress } from '../lib/progress'
import { playChime, speakArabic } from '../lib/speech'
import { ScreenHead } from './common'

const CHOICES = 4

function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

type Round = { answer: Letter; options: Letter[] }

function makeRound(previous?: Letter): Round {
  // Never ask the same letter twice in a row — it reads as a glitch to a child.
  const pool = previous ? LETTERS.filter((l) => l.id !== previous.id) : LETTERS
  const answer = pool[Math.floor(Math.random() * pool.length)]
  const distractors = shuffle(LETTERS.filter((l) => l.id !== answer.id)).slice(0, CHOICES - 1)
  return { answer, options: shuffle([answer, ...distractors]) }
}

export default function SoundsScreen({ onBack }: { onBack: () => void }) {
  const { t, lang } = useLang()
  const { recordSound } = useProgress()

  const [round, setRound] = useState<Round>(() => makeRound())
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState({ right: 0, total: 0 })
  const timerRef = useRef<number>()

  const say = useCallback((letter: Letter) => speakArabic(letter.nameAr, 0.75), [])

  // Read the new letter out as soon as it appears, so the child hears the
  // question without having to find the speaker button first.
  useEffect(() => {
    const id = window.setTimeout(() => say(round.answer), 350)
    return () => window.clearTimeout(id)
  }, [round, say])

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  const choose = (letter: Letter) => {
    if (picked) return // already answered; ignore double taps
    setPicked(letter.id)
    const correct = letter.id === round.answer.id
    setScore((s) => ({ right: s.right + (correct ? 1 : 0), total: s.total + 1 }))
    if (correct) recordSound(letter.id)
    playChime(correct ? 'success' : 'nudge')

    // Give a wrong answer longer on screen so the child can take in the right one.
    timerRef.current = window.setTimeout(
      () => {
        setPicked(null)
        setRound((r) => makeRound(r.answer))
      },
      correct ? 1100 : 2100,
    )
  }

  const verdict = (() => {
    if (!picked) return null
    if (picked === round.answer.id) return { cls: 'ok', text: t('correct') }
    return {
      cls: 'no',
      text: `${t('notQuite')} ${lang === 'en' ? round.answer.nameEn : round.answer.nameAr}`,
    }
  })()

  return (
    <main className="screen">
      <ScreenHead onBack={onBack} title={t('soundsTitle')} subtitle={t('whichLetter')} />

      <div className="quiz-stage">
        <button className="speaker-btn" onClick={() => say(round.answer)} aria-label={t('playAgain')}>
          🔊
        </button>

        <div className="choices">
          {round.options.map((option) => {
            let cls = 'choice'
            if (picked) {
              if (option.id === round.answer.id) cls += ' right'
              else if (option.id === picked) cls += ' wrong'
            }
            return (
              <button key={option.id} className={cls} onClick={() => choose(option)}>
                {option.char}
              </button>
            )
          })}
        </div>

        <div className={`verdict ${verdict?.cls ?? ''}`}>{verdict?.text ?? ''}</div>

        <span className="pill star-count">
          {t('score')}: {score.right} / {score.total}
        </span>
      </div>
    </main>
  )
}
