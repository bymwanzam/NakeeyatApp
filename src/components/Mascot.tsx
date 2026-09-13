/**
 * Original flat-illustration characters and decorations, drawn as inline SVG.
 *
 * Inline rather than image files so they recolour with the theme, scale
 * crisply on any tablet, and cost nothing extra to load.
 */
import type { Gender } from '../lib/profile'

export const SKIN = '#F2C89B'
const INK = '#2B2118'

/** Eyes and a smile, shared by both avatars so they feel like one family. */
function Face({ cy }: { cy: number }) {
  return (
    <>
      <circle cx="41" cy={cy} r="3.4" fill={INK} />
      <circle cx="59" cy={cy} r="3.4" fill={INK} />
      {/* highlight dots keep the eyes from looking flat */}
      <circle cx="42.2" cy={cy - 1.2} r="1.1" fill="#fff" />
      <circle cx="60.2" cy={cy - 1.2} r="1.1" fill="#fff" />
      <path
        d={`M42 ${cy + 10} Q50 ${cy + 17} 58 ${cy + 10}`}
        stroke={INK}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="33" cy={cy + 6} r="4" fill="#F09A9A" opacity="0.55" />
      <circle cx="67" cy={cy + 6} r="4" fill="#F09A9A" opacity="0.55" />
    </>
  )
}

export function Avatar({
  gender,
  size = 96,
  className = '',
}: {
  gender: Gender
  size?: number
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={gender === 'boy' ? 'Boy avatar' : 'Girl avatar'}
    >
      {gender === 'girl' ? (
        <>
          {/* hijab, drawn behind the face and draping past the shoulders */}
          <path
            d="M50 12c-22 0-32 16-32 34 0 16 6 26 10 34h44c4-8 10-18 10-34 0-18-10-34-32-34z"
            fill="#7B6BD6"
          />
          <path d="M50 12c-22 0-32 16-32 34h64c0-18-10-34-32-34z" fill="#8E80E0" />
          <ellipse cx="50" cy="54" rx="21" ry="24" fill={SKIN} />
          <Face cy={50} />
        </>
      ) : (
        <>
          <circle cx="27" cy="56" r="5" fill={SKIN} />
          <circle cx="73" cy="56" r="5" fill={SKIN} />
          <circle cx="50" cy="56" r="27" fill={SKIN} />
          {/* kufi cap */}
          <path d="M23 44a27 27 0 0 1 54 0z" fill="#16A37C" />
          <rect x="22" y="41" width="56" height="7" rx="3.5" fill="#0D7A5F" />
          <Face cy={54} />
        </>
      )}
    </svg>
  )
}

/* ------------------------------------------------- decorative background -- */

export function Crescent({ size = 40, color = '#F2A93B' }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <path d="M62 8a46 46 0 1 0 0 84A38 38 0 0 1 62 8z" fill={color} />
    </svg>
  )
}

export function Star({ size = 28, color = '#FFD166' }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <path
        d="M50 4l13 29 32 3-24 21 7 31-28-16-28 16 7-31L5 36l32-3z"
        fill={color}
      />
    </svg>
  )
}

/** A fanoos — the lantern hung during Ramadan. */
export function Lantern({ size = 38 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <rect x="44" y="4" width="12" height="8" rx="3" fill="#C08A2E" />
      <rect x="28" y="12" width="44" height="9" rx="4" fill="#E0A53C" />
      <path d="M32 21h36l6 46a24 24 0 0 1-48 0z" fill="#FFD98A" />
      <path d="M40 27h20l4 40a12 12 0 0 1-28 0z" fill="#FFF0C4" />
      <rect x="26" y="84" width="48" height="9" rx="4" fill="#E0A53C" />
    </svg>
  )
}

/** A simple mosque dome and minaret, used as a section marker. */
export function Dome({ size = 40, color = '#16A37C' }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <path d="M50 14c14 10 22 22 22 34H28c0-12 8-24 22-34z" fill={color} />
      <circle cx="50" cy="9" r="4" fill="#F2A93B" />
      <rect x="24" y="48" width="52" height="34" rx="4" fill={color} opacity="0.85" />
      <path d="M44 82V66a6 6 0 0 1 12 0v16z" fill="#0B3F31" opacity="0.6" />
    </svg>
  )
}

/**
 * Slowly drifting shapes in the background. Purely decorative.
 *
 * `variant` controls where they are allowed to go. On the onboarding screen the
 * card is narrow and centred, so shapes can fill the whole viewport. On the home
 * screen the content column is wide, so shapes are pushed right out to the
 * margins and hidden entirely on narrow screens — drifting a lantern across a
 * lesson card reads as a rendering glitch, not as decoration.
 */
export function FloatingSky({ variant = 'full' }: { variant?: 'full' | 'edges' }) {
  const full = [
    { el: <Crescent size={54} />, top: '8%', left: '6%', delay: '0s' },
    { el: <Star size={26} />, top: '18%', left: '86%', delay: '1.1s' },
    { el: <Star size={18} color="#8FD9BE" />, top: '52%', left: '4%', delay: '2.3s' },
    { el: <Lantern size={46} />, top: '64%', left: '90%', delay: '0.6s' },
    { el: <Star size={22} color="#C9B6F5" />, top: '82%', left: '12%', delay: '1.7s' },
    { el: <Crescent size={30} color="#8FD9BE" />, top: '36%', left: '93%', delay: '2.9s' },
  ]
  const edges = [
    { el: <Crescent size={46} />, top: '10%', left: '2.5%', delay: '0s' },
    { el: <Star size={22} />, top: '30%', left: '95.5%', delay: '1.1s' },
    { el: <Lantern size={40} />, top: '58%', left: '2%', delay: '0.6s' },
    { el: <Star size={18} color="#C9B6F5" />, top: '74%', left: '96%', delay: '2.2s' },
  ]
  const shapes = variant === 'edges' ? edges : full

  return (
    <div className={`sky ${variant}`} aria-hidden="true">
      {shapes.map((s, i) => (
        <span key={i} className="sky-shape" style={{ top: s.top, left: s.left, animationDelay: s.delay }}>
          {s.el}
        </span>
      ))}
    </div>
  )
}
