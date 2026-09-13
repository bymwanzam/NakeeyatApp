import { useEffect, useState } from 'react'

const COLORS = ['#F2A93B', '#16A37C', '#7B6BD6', '#E4574F', '#3B8FD4', '#FFD166']

type Piece = {
  id: number
  left: number
  delay: number
  duration: number
  color: string
  rotate: number
  round: boolean
}

/**
 * A short burst of falling colour, shown when a child earns three stars.
 *
 * Pieces are plain absolutely-positioned spans animated by CSS keyframes rather
 * than a canvas loop, so this costs nothing while idle and stops completely
 * once the burst ends. It respects prefers-reduced-motion through the global
 * rule in styles.css.
 */
export default function Confetti({ fire }: { fire: number }) {
  const [pieces, setPieces] = useState<Piece[]>([])

  useEffect(() => {
    if (!fire) return
    const batch: Piece[] = Array.from({ length: 42 }, (_, i) => ({
      id: fire * 1000 + i,
      left: Math.random() * 100,
      delay: Math.random() * 0.35,
      duration: 1.6 + Math.random() * 1.1,
      color: COLORS[i % COLORS.length],
      rotate: Math.random() * 360,
      round: Math.random() > 0.6,
    }))
    setPieces(batch)
    // Clear once the longest piece has landed, so nothing keeps animating.
    const timer = window.setTimeout(() => setPieces([]), 3200)
    return () => window.clearTimeout(timer)
  }, [fire])

  if (pieces.length === 0) return null

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
            borderRadius: p.round ? '50%' : '3px',
          }}
        />
      ))}
    </div>
  )
}
