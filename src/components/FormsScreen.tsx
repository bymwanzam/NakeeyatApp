import { useState } from 'react'
import { useLang } from '../i18n'
import { LETTERS } from '../data/letters'
import type { Letter } from '../data/letters'
import { speakArabic } from '../lib/speech'
import { clusterInContext, letterVariants, toClusters } from '../lib/arabic'
import { LetterGrid, NavButtons, ScreenHead } from './common'
import type { StringKey } from '../i18n'

export default function FormsScreen({ onBack }: { onBack: () => void }) {
  const { t } = useLang()
  const [index, setIndex] = useState<number | null>(null)

  if (index === null) {
    return (
      <main className="screen">
        <ScreenHead onBack={onBack} title={t('formsTitle')} subtitle={t('formsDesc')} />
        <LetterGrid onPick={(_l, i) => setIndex(i)} />
      </main>
    )
  }

  return (
    <FormsDetail
      letter={LETTERS[index]}
      onBack={() => setIndex(null)}
      onNavigate={(d) => setIndex((i) => ((i ?? 0) + d + LETTERS.length) % LETTERS.length)}
    />
  )
}

const SLOTS: { key: StringKey; pick: (l: Letter) => string }[] = [
  { key: 'isolated', pick: (l) => l.char },
  { key: 'initial', pick: (l) => l.forms.initial },
  { key: 'medial', pick: (l) => l.forms.medial },
  { key: 'final', pick: (l) => l.forms.final },
]

function FormsDetail({
  letter,
  onBack,
  onNavigate,
}: {
  letter: Letter
  onBack: () => void
  onNavigate: (delta: number) => void
}) {
  const { t, lang } = useLang()

  return (
    <main className="screen">
      <ScreenHead
        onBack={onBack}
        title={lang === 'en' ? letter.nameEn : letter.nameAr}
        subtitle={letter.soundEn}
      />

      <div className="forms-grid">
        {SLOTS.map((slot) => (
          <div key={slot.key} className="form-card">
            <div className="label">{t(slot.key)}</div>
            <div className="shape">{slot.pick(letter)}</div>
          </div>
        ))}
      </div>

      <div className={`note ${letter.connects ? 'info' : ''}`}>
        {letter.connects ? `🔗 ${t('connectsNote')}` : `✂️ ${t('noConnectNote')}`}
      </div>

      <div className="word-demo">
        <div className="label" style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 700 }}>
          {t('exampleWord')}
        </div>
        <HighlightedWord word={letter.word.ar} letter={letter} />
        <div className="gloss">
          {letter.word.translit} — {letter.word.en}
        </div>
        <button
          className="btn btn-primary"
          style={{ marginTop: 14 }}
          onClick={() => speakArabic(letter.word.ar, 0.75)}
        >
          🔊 {t('listen')}
        </button>
      </div>

      <NavButtons onNavigate={onNavigate} />
    </main>
  )
}

/** The example word, with every occurrence of the letter picked out in colour. */
function HighlightedWord({ word, letter }: { word: string; letter: Letter }) {
  const clusters = toClusters(word)
  const variants = letterVariants(letter.id, letter.char)

  return (
    <div className="big-word">
      {clusters.map((cluster, i) => (
        <span key={i} className={variants.includes(cluster.base) ? 'hl' : undefined}>
          {clusterInContext(clusters, i)}
        </span>
      ))}
    </div>
  )
}
