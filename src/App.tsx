import { useEffect, useState } from 'react'
import { useLang } from './i18n'
import { useProgress } from './lib/progress'
import { dayNumber, useProfile } from './lib/profile'
import type { Profile } from './lib/profile'
import { LETTERS } from './data/letters'
import { hasArabicVoice, hasRecordedAudio, onVoicesChanged, stopSpeaking } from './lib/speech'
import Onboarding from './components/Onboarding'
import { Avatar, Dome, FloatingSky, Star } from './components/Mascot'
import TraceScreen from './components/TraceScreen'
import SoundsScreen from './components/SoundsScreen'
import FormsScreen from './components/FormsScreen'
import ReadingScreen from './components/ReadingScreen'
import QuranScreen from './components/QuranScreen'

export type View = 'home' | 'trace' | 'sounds' | 'forms' | 'reading' | 'quran'

export default function App() {
  const { t, lang, toggle } = useLang()
  const { totalStars, reset } = useProgress()
  const { profile, save } = useProfile()
  const [view, setView] = useState<View>('home')
  const [editing, setEditing] = useState(false)

  // A half-spoken letter from the previous screen shouldn't follow the child.
  useEffect(() => stopSpeaking, [view])

  // Nothing is reachable until we know who is using the app.
  if (!profile || editing) {
    return (
      <Onboarding
        initial={editing ? profile : null}
        onDone={(p) => {
          save(p)
          setEditing(false)
        }}
        onCancel={editing ? () => setEditing(false) : undefined}
      />
    )
  }

  const goHome = () => setView('home')

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={goHome}>
          <span className="brand-avatar">
            <Avatar gender={profile.gender} size={34} />
          </span>
          <span className="brand-text">{profile.name}</span>
        </button>
        <div className="spacer" />
        <span className="pill star-count" title={t('stars')}>
          <Star size={15} /> {totalStars}
        </span>
        <button className="pill" onClick={toggle} aria-label="Switch language">
          {lang === 'en' ? '🌙 عربي' : '🌙 English'}
        </button>
      </header>

      {view === 'home' && (
        <Home
          profile={profile}
          onPick={setView}
          totalStars={totalStars}
          onReset={reset}
          onEdit={() => setEditing(true)}
        />
      )}
      {view === 'trace' && <TraceScreen onBack={goHome} />}
      {view === 'sounds' && <SoundsScreen onBack={goHome} />}
      {view === 'forms' && <FormsScreen onBack={goHome} />}
      {view === 'reading' && <ReadingScreen onBack={goHome} />}
      {view === 'quran' && <QuranScreen onBack={goHome} />}
    </div>
  )
}

const LESSONS = [
  { view: 'trace', emoji: '✍️', title: 'traceTitle', desc: 'traceDesc', accent: '#16A37C' },
  { view: 'sounds', emoji: '🔊', title: 'soundsTitle', desc: 'soundsDesc', accent: '#3B8FD4' },
  { view: 'forms', emoji: '🧩', title: 'formsTitle', desc: 'formsDesc', accent: '#7B6BD6' },
  { view: 'reading', emoji: '📖', title: 'readingTitle', desc: 'readingDesc', accent: '#F2A93B' },
  { view: 'quran', emoji: '🕌', title: 'quranTitle', desc: 'quranDesc', accent: '#0D7A5F' },
] as const

function Home({
  profile,
  onPick,
  totalStars,
  onReset,
  onEdit,
}: {
  profile: Profile
  onPick: (v: View) => void
  totalStars: number
  onReset: () => void
  onEdit: () => void
}) {
  const { t } = useLang()
  const maxStars = LETTERS.length * 3
  const pct = Math.round((totalStars / maxStars) * 100)

  return (
    <main className="screen">
      <FloatingSky variant="edges" />
      <VoiceWarning />

      <section className="greeting-card">
        <span className="greeting-avatar">
          <Avatar gender={profile.gender} size={92} className="bob" />
        </span>
        <div>
          <p className="greeting-small">{t('greetingBack')}</p>
          <h1 className="greeting-name">{profile.name}!</h1>
          <p className="greeting-day">
            <Dome size={17} color="#0D7A5F" /> {t('dayLabel')} {dayNumber(profile.startedAt)} ·{' '}
            <Star size={14} /> {totalStars}
          </p>
        </div>
      </section>

      <h2 className="section-title">{t('chooseLesson')}</h2>
      <div className="lesson-grid">
        {LESSONS.map((l, i) => (
          <button
            key={l.view}
            className="lesson-card"
            style={{ ['--accent' as string]: l.accent, animationDelay: `${i * 60}ms` }}
            onClick={() => onPick(l.view)}
          >
            <span className="emoji" aria-hidden="true">
              {l.emoji}
            </span>
            <h2>{t(l.title)}</h2>
            <p>{t(l.desc)}</p>
          </button>
        ))}
      </div>

      <section className="progress-strip">
        <h3>{t('progress')}</h3>
        <div className="bar">
          <span style={{ width: `${pct}%` }} />
        </div>
        <footer>
          <span>
            <Star size={14} /> {totalStars} / {maxStars}
          </span>
          <span className="foot-links">
            <button className="link-btn" onClick={onEdit}>
              {t('editProfile')}
            </button>
            <button className="link-btn" onClick={onReset}>
              {t('reset')}
            </button>
          </span>
        </footer>
      </section>
    </main>
  )
}

/**
 * The app ships its own recorded clips, so this should never appear. It only
 * fires if those clips are missing (audio generation never ran) AND the device
 * has no Arabic speech voice to fall back on — the one combination that leaves
 * a child with no sound at all.
 */
function VoiceWarning() {
  const { t } = useLang()
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (hasRecordedAudio()) return
    const check = () => setMissing(!hasArabicVoice())
    // Chrome fills the voice list a beat after load, so re-check once.
    const timer = setTimeout(check, 700)
    const off = onVoicesChanged(check)
    return () => {
      clearTimeout(timer)
      off()
    }
  }, [])

  if (!missing) return null
  return (
    <div className="banner">
      <span aria-hidden="true">🔈</span>
      <span>
        <strong>{t('noVoiceTitle')}</strong>
        {t('noVoiceBody')}
      </span>
    </div>
  )
}
