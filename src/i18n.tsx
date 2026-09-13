import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type Lang = 'en' | 'ar'

const STRINGS = {
  appName: { en: 'Nakeeyat', ar: 'نَقِيَّة' },
  tagline: { en: 'Learn to write and read Arabic', ar: 'تَعَلَّمْ كِتَابَةَ وَقِرَاءَةَ العَرَبِيَّة' },
  back: { en: 'Back', ar: 'رُجُوع' },
  next: { en: 'Next', ar: 'التَّالِي' },
  previous: { en: 'Previous', ar: 'السَّابِق' },
  listen: { en: 'Listen', ar: 'اِسْتَمِعْ' },
  check: { en: 'Check my writing', ar: 'تَحَقَّقْ مِنْ كِتَابَتِي' },
  clear: { en: 'Clear', ar: 'مَسْح' },
  tryAgain: { en: 'Try again', ar: 'حَاوِلْ مَرَّةً أُخْرَى' },
  showGuide: { en: 'Show guide', ar: 'أَظْهِرِ النَّمُوذَج' },
  hideGuide: { en: 'Hide guide', ar: 'أَخْفِ النَّمُوذَج' },
  stars: { en: 'Stars', ar: 'نُجُوم' },
  progress: { en: 'Your progress', ar: 'تَقَدُّمُك' },
  reset: { en: 'Reset progress', ar: 'إِعَادَةُ التَّعْيِين' },

  // Onboarding
  welcomeTitle: { en: 'Assalamu alaikum!', ar: 'السَّلَامُ عَلَيْكُم' },
  welcomeBody: {
    en: 'Let’s learn to read and write Arabic together',
    ar: 'لِنَتَعَلَّمْ قِرَاءَةَ وَكِتَابَةَ العَرَبِيَّةِ مَعًا',
  },
  letsBegin: { en: 'Let’s begin', ar: 'لِنَبْدَأ' },
  askName: { en: 'What is your name?', ar: 'مَا اسْمُك؟' },
  namePlaceholder: { en: 'Type your name', ar: 'اُكْتُبِ اسْمَك' },
  askAge: { en: 'How old are you?', ar: 'كَمْ عُمْرُك؟' },
  askAvatar: { en: 'Pick your character', ar: 'اِخْتَرْ شَخْصِيَّتَك' },
  boy: { en: 'Boy', ar: 'وَلَد' },
  girl: { en: 'Girl', ar: 'بِنْت' },
  continueBtn: { en: 'Next', ar: 'التَّالِي' },
  finishBtn: { en: 'Let’s go!', ar: 'هَيَّا بِنَا' },
  privacyNote: {
    en: 'This stays on this device only. Nothing is sent anywhere.',
    ar: 'تَبْقَى هٰذِهِ المَعْلُومَاتُ عَلَى هٰذَا الجِهَازِ فَقَط',
  },
  greetingBack: { en: 'Assalamu alaikum', ar: 'السَّلَامُ عَلَيْكُم' },
  dayLabel: { en: 'Day', ar: 'اليَوْم' },
  editProfile: { en: 'Change my name or age', ar: 'غَيِّرِ الاسْمَ أَوِ العُمْر' },

  // Lesson hub
  chooseLesson: { en: 'Choose a lesson', ar: 'اِخْتَرْ دَرْسًا' },
  chooseLetter: { en: 'Choose a letter', ar: 'اِخْتَرْ حَرْفًا' },
  traceTitle: { en: 'Write the Letters', ar: 'اُكْتُبِ الحُرُوف' },
  traceDesc: { en: 'Trace each letter with your finger', ar: 'اِرْسُمْ كُلَّ حَرْفٍ بِإِصْبَعِك' },
  soundsTitle: { en: 'Letter Sounds', ar: 'أَصْوَاتُ الحُرُوف' },
  soundsDesc: { en: 'Listen, then find the right letter', ar: 'اِسْتَمِعْ ثُمَّ اخْتَرِ الحَرْفَ الصَّحِيح' },
  formsTitle: { en: 'Letters in Words', ar: 'الحُرُوفُ فِي الكَلِمَات' },
  formsDesc: { en: 'How letters change shape', ar: 'كَيْفَ تَتَغَيَّرُ أَشْكَالُ الحُرُوف' },
  readingTitle: { en: 'Read Words', ar: 'اِقْرَأِ الكَلِمَات' },
  readingDesc: { en: 'Harakat, then sound out words', ar: 'الحَرَكَاتُ ثُمَّ قِرَاءَةُ الكَلِمَات' },

  // Tracing
  traceThis: { en: 'Trace this letter', ar: 'اِرْسُمْ هٰذَا الحَرْف' },
  startHere: { en: 'Start at the green dot', ar: 'اِبْدَأْ مِنَ النُّقْطَةِ الخَضْرَاء' },
  drawSomething: { en: 'Trace the letter first!', ar: 'اِرْسُمِ الحَرْفَ أَوَّلًا' },
  excellent: { en: 'Excellent! Mashaa Allah!', ar: 'مُمْتَاز! مَا شَاءَ اللّٰه' },
  goodJob: { en: 'Good job! Keep going.', ar: 'أَحْسَنْت! وَاصِلْ' },
  almost: { en: 'Almost — stay on the grey letter.', ar: 'اِقْتَرَبْت — اِلْزَمِ الحَرْفَ الرَّمَادِيّ' },
  accuracy: { en: 'Accuracy', ar: 'الدِّقَّة' },

  // Sounds quiz
  whichLetter: { en: 'Which letter did you hear?', ar: 'أَيُّ حَرْفٍ سَمِعْت؟' },
  playAgain: { en: 'Play again', ar: 'أَعِدِ التَّشْغِيل' },
  correct: { en: 'Correct!', ar: 'صَحِيح' },
  notQuite: { en: 'Not quite — this one is', ar: 'لَيْسَ تَمَامًا — هٰذَا هُوَ' },
  score: { en: 'Score', ar: 'النَّتِيجَة' },

  // Forms
  isolated: { en: 'Alone', ar: 'مُنْفَرِد' },
  initial: { en: 'Beginning', ar: 'أَوَّل' },
  medial: { en: 'Middle', ar: 'وَسَط' },
  final: { en: 'End', ar: 'آخِر' },
  connectsNote: { en: 'This letter joins to the next one.', ar: 'هٰذَا الحَرْفُ يَتَّصِلُ بِمَا بَعْدَه' },
  noConnectNote: {
    en: 'This letter never joins to the next one.',
    ar: 'هٰذَا الحَرْفُ لَا يَتَّصِلُ بِمَا بَعْدَه',
  },
  exampleWord: { en: 'Example word', ar: 'كَلِمَةٌ مِثَال' },

  // Reading
  stageHarakat: { en: 'The Harakat', ar: 'الحَرَكَات' },
  stageBlend: { en: 'Blending', ar: 'الدَّمْج' },
  stageWords: { en: 'Simple Words', ar: 'كَلِمَاتٌ سَهْلَة' },
  stageQuran: { en: "Qur'an Words", ar: 'كَلِمَاتٌ قُرْآنِيَّة' },
  tapToHear: { en: 'Tap a card to hear it', ar: 'اِضْغَطْ عَلَى بِطَاقَةٍ لِتَسْمَعَهَا' },
  soundItOut: { en: 'Sound it out', ar: 'اِقْرَأْهَا حَرْفًا حَرْفًا' },
  meaning: { en: 'Meaning', ar: 'المَعْنَى' },

  // Qur'an
  quranTitle: { en: 'The Qur’an', ar: 'القُرْآن' },
  quranDesc: { en: 'Read with tajweed colours', ar: 'اِقْرَأْ بِأَلْوَانِ التَّجْوِيد' },
  startHereSurahs: { en: 'Start here — short surahs', ar: 'اِبْدَأْ هُنَا — السُّوَرُ القَصِيرَة' },
  allSurahs: { en: 'All 114 surahs', ar: 'كُلُّ السُّوَرِ ١١٤' },
  searchSurah: { en: 'Search a surah…', ar: 'اِبْحَثْ عَنْ سُورَة…' },
  makkah: { en: 'Makkah', ar: 'مَكِّيَّة' },
  madinah: { en: 'Madinah', ar: 'مَدَنِيَّة' },
  ayahsLabel: { en: 'ayahs', ar: 'آيَة' },
  tajweedColours: { en: 'Tajweed colours', ar: 'أَلْوَانُ التَّجْوِيد' },
  showTranslationBtn: { en: 'Translation', ar: 'التَّرْجَمَة' },
  textSize: { en: 'Text size', ar: 'حَجْمُ الخَطّ' },
  playSurah: { en: 'Play surah', ar: 'شَغِّلِ السُّورَة' },
  stopAudio: { en: 'Stop', ar: 'إِيقَاف' },
  loading: { en: 'Loading…', ar: 'جَارِي التَّحْمِيل…' },
  loadFailed: { en: 'Could not load this surah.', ar: 'تَعَذَّرَ تَحْمِيلُ السُّورَة' },
  translationOffline: {
    en: 'Translation needs an internet connection.',
    ar: 'التَّرْجَمَةُ تَحْتَاجُ إِلَى اتِّصَالٍ بِالإِنْتَرْنِت',
  },
  audioOffline: {
    en: 'Recitation needs an internet connection.',
    ar: 'التِّلَاوَةُ تَحْتَاجُ إِلَى اتِّصَالٍ بِالإِنْتَرْنِت',
  },
  tajweedHint: {
    en: 'Tap any colour to learn what it means',
    ar: 'اِضْغَطْ عَلَى أَيِّ لَوْنٍ لِتَعْرِفَ مَعْنَاه',
  },

  noVoiceTitle: { en: 'No Arabic voice found', ar: 'لَا يُوجَدُ صَوْتٌ عَرَبِيّ' },
  noVoiceBody: {
    en: 'Your device has no Arabic text-to-speech voice installed, so audio is off. Everything else works.',
    ar: 'لَا يُوجَدُ صَوْتٌ عَرَبِيٌّ فِي جِهَازِك، فَالصَّوْتُ مُعَطَّل. بَقِيَّةُ الدُّرُوسِ تَعْمَل.',
  },
} as const

export type StringKey = keyof typeof STRINGS

type Ctx = { lang: Lang; dir: 'ltr' | 'rtl'; t: (k: StringKey) => string; toggle: () => void }

const LangContext = createContext<Ctx | null>(null)

const STORAGE_KEY = 'nakeeyat.lang'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'ar' || saved === 'en' ? saved : 'en'
  })

  const dir: 'ltr' | 'rtl' = lang === 'ar' ? 'rtl' : 'ltr'

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang)
    document.documentElement.lang = lang
    document.documentElement.dir = dir
  }, [lang, dir])

  const toggle = useCallback(() => setLang((l) => (l === 'en' ? 'ar' : 'en')), [])
  const t = useCallback((k: StringKey) => STRINGS[k][lang], [lang])

  const value = useMemo(() => ({ lang, dir, t, toggle }), [lang, dir, t, toggle])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used inside LanguageProvider')
  return ctx
}
