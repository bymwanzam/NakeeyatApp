import { useState } from 'react'
import { useLang } from '../i18n'
import { MAX_AGE, MIN_AGE } from '../lib/profile'
import type { Gender, Profile } from '../lib/profile'
import { Avatar, FloatingSky, Star } from './Mascot'

type Step = 'welcome' | 'name' | 'age' | 'avatar'
const ORDER: Step[] = ['welcome', 'name', 'age', 'avatar']

/**
 * First-run setup: name, age and character.
 *
 * Split into one question per screen rather than a single form. A four-year-old
 * cannot work through a form, but they can answer one big question with big
 * buttons, and the progress dots show how close they are to finishing.
 */
export default function Onboarding({
  initial,
  onDone,
  onCancel,
}: {
  initial?: Profile | null
  onDone: (p: Omit<Profile, 'startedAt'>) => void
  onCancel?: () => void
}) {
  const { t } = useLang()
  // Editing an existing profile skips the welcome screen.
  const [step, setStep] = useState<Step>(initial ? 'name' : 'welcome')
  const [name, setName] = useState(initial?.name ?? '')
  const [age, setAge] = useState<number | null>(initial?.age ?? null)
  const [gender, setGender] = useState<Gender | null>(initial?.gender ?? null)

  const index = ORDER.indexOf(step)
  const go = (delta: number) => setStep(ORDER[Math.max(0, Math.min(ORDER.length - 1, index + delta))])

  const finish = (chosen: Gender) => {
    setGender(chosen)
    if (name.trim() && age) onDone({ name: name.trim(), age, gender: chosen })
  }

  return (
    <div className="onboarding">
      <FloatingSky />

      <div className="onboard-card">
        {step === 'welcome' && (
          <>
            <div className="onboard-mascots">
              <Avatar gender="boy" size={104} className="bob" />
              <Avatar gender="girl" size={104} className="bob delay" />
            </div>
            <p className="bismillah">بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيم</p>
            <h1>{t('welcomeTitle')}</h1>
            <p className="onboard-sub">{t('welcomeBody')}</p>
            <button className="btn btn-primary big" onClick={() => go(1)}>
              {t('letsBegin')} ✨
            </button>
          </>
        )}

        {step === 'name' && (
          <>
            <Avatar gender={gender ?? 'boy'} size={92} className="bob" />
            <h1>{t('askName')}</h1>
            <input
              className="name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
              autoFocus
              maxLength={24}
              onKeyDown={(e) => e.key === 'Enter' && name.trim() && go(1)}
            />
            <button className="btn btn-primary big" disabled={!name.trim()} onClick={() => go(1)}>
              {t('continueBtn')} →
            </button>
          </>
        )}

        {step === 'age' && (
          <>
            <h1>
              {t('askAge')}
              {name && <span className="who"> {name}</span>}
            </h1>
            <div className="age-grid">
              {Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => MIN_AGE + i).map((n) => (
                <button
                  key={n}
                  className={`age-chip ${age === n ? 'on' : ''}`}
                  onClick={() => {
                    setAge(n)
                    setTimeout(() => go(1), 220)
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'avatar' && (
          <>
            <h1>{t('askAvatar')}</h1>
            <div className="avatar-choices">
              {(['boy', 'girl'] as Gender[]).map((g) => (
                <button
                  key={g}
                  className={`avatar-choice ${gender === g ? 'on' : ''}`}
                  onClick={() => finish(g)}
                >
                  <Avatar gender={g} size={120} />
                  <span>{t(g)}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step !== 'welcome' && (
          <div className="onboard-foot">
            <button className="link-btn" onClick={() => (index === 1 && onCancel ? onCancel() : go(-1))}>
              ← {t('back')}
            </button>
            <div className="dots">
              {ORDER.slice(1).map((s, i) => (
                <span key={s} className={`dot ${i <= index - 1 ? 'on' : ''}`} />
              ))}
            </div>
          </div>
        )}

        <p className="privacy">
          <Star size={13} color="#9FB0C2" /> {t('privacyNote')}
        </p>
      </div>
    </div>
  )
}
