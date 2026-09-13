import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLang } from '../i18n'
import { LETTERS } from '../data/letters'
import { useProgress } from '../lib/progress'
import { playChime, speakArabic } from '../lib/speech'
import { TRACE_FONT, buildLetterMask, scoreTrace } from '../lib/tracing'
import type { LetterMask, Stroke, TraceScore } from '../lib/tracing'
import { LetterGrid, NavButtons, ScreenHead, Stars } from './common'
import Confetti from './Confetti'
import { useProfile } from '../lib/profile'

const BRUSH = 22
/** Glyph size as a fraction of the square canvas. */
const FONT_RATIO = 0.6

export default function TraceScreen({ onBack }: { onBack: () => void }) {
  const { t } = useLang()
  const { progress } = useProgress()
  const [index, setIndex] = useState<number | null>(null)

  if (index === null) {
    return (
      <main className="screen">
        <ScreenHead onBack={onBack} title={t('traceTitle')} subtitle={t('traceDesc')} />
        <LetterGrid
          onPick={(_l, i) => setIndex(i)}
          starsFor={(l) => progress.traceStars[l.id] ?? 0}
        />
      </main>
    )
  }

  return (
    <TracePad
      index={index}
      onBack={() => setIndex(null)}
      onNavigate={(delta) =>
        setIndex((i) => (i === null ? 0 : (i + delta + LETTERS.length) % LETTERS.length))
      }
    />
  )
}

function TracePad({
  index,
  onBack,
  onNavigate,
}: {
  index: number
  onBack: () => void
  onNavigate: (delta: number) => void
}) {
  const { t, lang } = useLang()
  const { recordTrace } = useProgress()
  const { profile } = useProfile()
  const letter = LETTERS[index]

  const stageRef = useRef<HTMLDivElement>(null)
  const guideRef = useRef<HTMLCanvasElement>(null)
  const inkRef = useRef<HTMLCanvasElement>(null)

  // Strokes live in a ref because they change on every pointermove; re-rendering
  // React 60 times a second to draw a line would be wasteful.
  const strokesRef = useRef<Stroke[]>([])
  const drawingRef = useRef(false)
  const maskRef = useRef<LetterMask | null>(null)

  const [size, setSize] = useState(0)
  const [showGuide, setShowGuide] = useState(true)
  const [hasInk, setHasInk] = useState(false)
  const [score, setScore] = useState<TraceScore | null>(null)
  const [startDot, setStartDot] = useState<{ x: number; y: number } | null>(null)
  // Incrementing counter, not a boolean: re-firing needs a new value each time.
  const [burst, setBurst] = useState(0)

  /* ---- keep the canvases matched to the element's real pixel size ---- */
  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setSize(entry.contentRect.width))
    ro.observe(el)
    setSize(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const clear = useCallback(() => {
    strokesRef.current = []
    setHasInk(false)
    setScore(null)
    const ctx = inkRef.current?.getContext('2d')
    if (ctx && size) ctx.clearRect(0, 0, size, size)
  }, [size])

  /* ---- (re)build the target mask and guide whenever letter or size changes ---- */
  useEffect(() => {
    if (!size) return
    let cancelled = false

    // The mask must come from the same font the child sees on screen, so wait
    // for the webfont before rasterising — otherwise the first letter is
    // measured against a fallback serif and every score is wrong.
    document.fonts.ready.then(() => {
      if (cancelled) return
      const fontPx = size * FONT_RATIO
      const mask = buildLetterMask(letter.char, size, size, fontPx)
      maskRef.current = mask
      setStartDot(mask.start)

      const dpr = window.devicePixelRatio || 1
      for (const canvas of [guideRef.current, inkRef.current]) {
        if (!canvas) continue
        canvas.width = Math.round(size * dpr)
        canvas.height = Math.round(size * dpr)
        const ctx = canvas.getContext('2d')!
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, size, size)
      }

      const g = guideRef.current?.getContext('2d')
      if (g) {
        g.font = `${fontPx}px ${TRACE_FONT}`
        g.textAlign = 'center'
        g.textBaseline = 'middle'
        g.fillStyle = 'rgba(18, 35, 59, 0.13)'
        g.fillText(letter.char, size / 2, size / 2)
      }
    })

    return () => {
      cancelled = true
    }
  }, [letter.char, size])

  // Starting a new letter wipes the old attempt.
  useEffect(() => {
    strokesRef.current = []
    setHasInk(false)
    setScore(null)
  }, [letter.id])

  // Redrawing the guide has to react to the toggle without rebuilding the mask.
  useEffect(() => {
    const canvas = guideRef.current
    if (canvas) canvas.style.opacity = showGuide ? '1' : '0'
  }, [showGuide])

  /* ---- drawing ---- */
  const pointFrom = (e: React.PointerEvent) => {
    const rect = inkRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const strokeStyle = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#12233b'
    ctx.lineWidth = BRUSH
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drawingRef.current = true
    const p = pointFrom(e)
    strokesRef.current.push([p])
    setHasInk(true)
    setScore(null)

    // Draw the pen-down dot immediately so a tap leaves a mark.
    const ctx = inkRef.current!.getContext('2d')!
    ctx.fillStyle = '#12233b'
    ctx.beginPath()
    ctx.arc(p.x, p.y, BRUSH / 2, 0, Math.PI * 2)
    ctx.fill()
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const stroke = strokesRef.current[strokesRef.current.length - 1]
    const prev = stroke[stroke.length - 1]
    const p = pointFrom(e)
    stroke.push(p)

    const ctx = inkRef.current!.getContext('2d')!
    strokeStyle(ctx)
    ctx.beginPath()
    ctx.moveTo(prev.x, prev.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }

  const endStroke = () => {
    drawingRef.current = false
  }

  const check = () => {
    const mask = maskRef.current
    if (!mask) return
    const result = scoreTrace(strokesRef.current, mask, size, size, BRUSH)
    setScore(result)
    if (result.stars > 0) {
      recordTrace(letter.id, result.stars)
      playChime(result.stars >= 2 ? 'success' : 'nudge')
      // Full marks are worth a proper celebration.
      if (result.stars === 3) setBurst((b) => b + 1)
    } else if (!result.tooLittleInk) {
      playChime('nudge')
    }
  }

  const verdict = (() => {
    if (!score) return null
    if (score.tooLittleInk) return { cls: 'low', msg: t('drawSomething') }
    // Praise lands harder with the child's own name on it.
    if (score.stars === 3)
      return { cls: 'win', msg: profile ? `${t('excellent')} ${profile.name}!` : t('excellent') }
    if (score.stars === 2) return { cls: 'win', msg: t('goodJob') }
    if (score.stars === 1) return { cls: 'mid', msg: t('almost') }
    return { cls: 'low', msg: t('almost') }
  })()

  return (
    <main className="screen">
      <Confetti fire={burst} />
      <ScreenHead onBack={onBack} title={t('traceThis')} subtitle={t('startHere')} />

      <div className="trace-wrap">
        <div className="trace-meta">
          <span className="name-ar">{letter.nameAr}</span>
          <span className="name-en">{lang === 'en' ? letter.nameEn : letter.soundEn}</span>
          <button className="pill" onClick={() => speakArabic(letter.nameAr)}>
            🔊 {t('listen')}
          </button>
        </div>

        <div className="canvas-stage" ref={stageRef}>
          <canvas className="guide-layer" ref={guideRef} />
          <canvas
            className="ink-layer"
            ref={inkRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endStroke}
            onPointerCancel={endStroke}
            onPointerLeave={endStroke}
          />
          {startDot && showGuide && !hasInk && (
            <span className="start-dot" style={{ left: startDot.x, top: startDot.y }} />
          )}
        </div>

        <div className="trace-actions">
          <button className="btn" onClick={clear}>
            🧽 {t('clear')}
          </button>
          <button className="btn" onClick={() => setShowGuide((s) => !s)}>
            {showGuide ? `🙈 ${t('hideGuide')}` : `👁️ ${t('showGuide')}`}
          </button>
          <button className="btn btn-primary" onClick={check} disabled={!hasInk}>
            ✅ {t('check')}
          </button>
        </div>

        <div className="feedback">
          {verdict && (
            <>
              {!score!.tooLittleInk && <Stars count={score!.stars} />}
              <span className={`msg ${verdict.cls}`}>{verdict.msg}</span>
              {!score!.tooLittleInk && (
                <span className="metrics">
                  {t('accuracy')}: {Math.round(score!.overall * 100)}%
                </span>
              )}
            </>
          )}
        </div>

        <NavButtons onNavigate={onNavigate} />
      </div>
    </main>
  )
}
