/**
 * Arabic audio.
 *
 * Every clip the app speaks is pre-rendered to public/audio/ by
 * scripts/generate_audio.py, and src/data/audio-manifest.json maps the Arabic
 * text to its file. That means a child hears the same clear Saudi/MSA voice on
 * every device, whether or not the device has any Arabic speech support.
 *
 * The browser's own text-to-speech is kept only as a safety net, for two cases:
 * text that isn't in the manifest, and a clip that fails to load. It sounds
 * worse and many devices have no Arabic voice at all, so it should be rare.
 *
 * To re-record with a real teacher or qari, drop files named after the manifest
 * hashes into public/audio/ — no code changes needed.
 */
import manifest from '../data/audio-manifest.json'

const CLIPS = manifest as Record<string, string>
/** The pre-rendered clips were rendered at this speed; playbackRate is relative to it. */
const RENDERED_AT = 0.8

let cachedVoice: SpeechSynthesisVoice | null = null
let voicesReady = false
const listeners = new Set<() => void>()

function pickArabicVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? []
  if (voices.length === 0) return null
  return (
    voices.find((v) => /^ar[-_]?(SA|EG)/i.test(v.lang)) ??
    voices.find((v) => /^ar\b/i.test(v.lang)) ??
    null
  )
}

function refreshVoices() {
  cachedVoice = pickArabicVoice()
  voicesReady = true
  listeners.forEach((fn) => fn())
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refreshVoices()
  window.speechSynthesis.addEventListener('voiceschanged', refreshVoices)
}

export function onVoicesChanged(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function hasArabicVoice() {
  return cachedVoice !== null
}

export function voicesLoaded() {
  return voicesReady
}

/**
 * True when recorded clips are available, so the app isn't depending on the
 * device having an Arabic speech voice.
 */
export function hasRecordedAudio() {
  return Object.keys(CLIPS).length > 0
}

/** Audio elements are reused: re-fetching the same letter on every tap is wasteful. */
const elements = new Map<string, HTMLAudioElement>()
let playing: HTMLAudioElement | null = null

function clipFor(text: string): HTMLAudioElement | null {
  const file = CLIPS[text]
  if (!file) return null
  let el = elements.get(file)
  if (!el) {
    el = new Audio(`${import.meta.env.BASE_URL}audio/${file}`)
    el.preload = 'auto'
    elements.set(file, el)
  }
  return el
}

function speakSynthetic(text: string, rate: number) {
  const synth = window.speechSynthesis
  if (!synth) return
  synth.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = cachedVoice?.lang ?? 'ar-SA'
  if (cachedVoice) utter.voice = cachedVoice
  utter.rate = rate
  utter.pitch = 1.05
  synth.speak(utter)
}

/**
 * Speak Arabic text. `rate` below 1 slows it down, which the reading lessons
 * use so a child can follow one syllable at a time.
 */
export function speakArabic(text: string, rate = 0.8) {
  stopSpeaking()

  const clip = clipFor(text)
  if (!clip) {
    speakSynthetic(text, rate)
    return
  }

  // Clamped: past roughly ±30% the pitch artefacts make letters hard to hear.
  clip.playbackRate = Math.min(1.3, Math.max(0.7, rate / RENDERED_AT))
  clip.currentTime = 0
  playing = clip

  clip.play().catch(() => {
    // Either the file is missing or the browser blocked autoplay before the
    // child has tapped anything. Falling back keeps the lesson usable.
    if (playing === clip) playing = null
    speakSynthetic(text, rate)
  })
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel()
  if (playing) {
    playing.pause()
    playing.currentTime = 0
    playing = null
  }
}

/** Short reward chime, synthesised so there is no asset to ship. */
export function playChime(kind: 'success' | 'nudge' = 'success') {
  try {
    const AudioCtor = window.AudioContext ?? (window as any).webkitAudioContext
    if (!AudioCtor) return
    const ctx = new AudioCtor()
    const notes = kind === 'success' ? [523.25, 659.25, 783.99] : [392.0, 329.63]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = ctx.currentTime + i * 0.11
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.32)
    })
    setTimeout(() => ctx.close(), 900)
  } catch {
    // Audio is a nicety — never let it break a lesson.
  }
}
