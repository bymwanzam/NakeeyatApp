/**
 * Scoring for the letter-tracing lesson.
 *
 * Rather than hand-authoring stroke paths for 28 letters, the target shape is
 * taken from the font itself: the glyph is rasterised to an offscreen canvas
 * and compared pixel-by-pixel with what the child drew. That means any letter,
 * any font size, no per-letter data to maintain.
 *
 * Two numbers come out of the comparison, and a child needs both to score well:
 *
 *   accuracy — of the ink the child laid down, how much landed on the letter?
 *              Catches scribbling outside the shape.
 *   coverage — of the letter, how much did the child actually go over?
 *              Catches a single lazy dash through the middle.
 *
 * Comparison runs on a downscaled bitmap (ANALYSIS_SCALE) because a 4x smaller
 * grid is ~16x less work and the extra precision buys nothing at this size.
 */

const ANALYSIS_SCALE = 0.25
/** How far outside the glyph a child may stray and still be "on the letter", in CSS px. */
const TOLERANCE_PX = 16

export type LetterMask = {
  /** Analysis-grid dimensions. */
  w: number
  h: number
  /** The glyph itself — what must be covered. */
  core: Uint8Array
  coreCount: number
  /** The glyph grown by TOLERANCE_PX — the region that counts as "on the letter". */
  tolerant: Uint8Array
  /** Suggested first-pen-down point, in CSS px relative to the canvas. */
  start: { x: number; y: number } | null
}

export type TraceScore = {
  accuracy: number
  coverage: number
  /** Combined 0-1 score. */
  overall: number
  stars: 0 | 1 | 2 | 3
  /** True when the child barely drew anything — worth a different message. */
  tooLittleInk: boolean
}

export const TRACE_FONT = "'Noto Naskh Arabic', 'Traditional Arabic', serif"

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

/** Read a canvas's alpha channel into a flat 0/1 array. */
function alphaMask(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const { data } = ctx.getImageData(0, 0, w, h)
  const mask = new Uint8Array(w * h)
  let count = 0
  for (let i = 0; i < mask.length; i++) {
    // Alpha above ~30% counts as ink; below that is antialiasing fringe.
    if (data[i * 4 + 3] > 76) {
      mask[i] = 1
      count++
    }
  }
  return { mask, count }
}

/**
 * Pick where the child should put their pen down.
 *
 * Arabic is written right to left and nearly every letter starts at the top
 * right of its body, so the heuristic is "rightmost, then highest". The search
 * is restricted to the rows holding the bulk of the ink so that the dots on
 * letters like ت or ث — which sit above the body — don't capture the point.
 */
function findStartPoint(mask: Uint8Array, w: number, h: number) {
  const rowInk = new Array<number>(h).fill(0)
  let total = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x]) {
        rowInk[y]++
        total++
      }
    }
  }
  if (total === 0) return null

  // Widen a window around the densest row until it holds most of the ink.
  let densest = 0
  for (let y = 1; y < h; y++) if (rowInk[y] > rowInk[densest]) densest = y
  let top = densest
  let bottom = densest
  let inBand = rowInk[densest]
  while (inBand < total * 0.7 && (top > 0 || bottom < h - 1)) {
    const takeAbove = top > 0 && (bottom >= h - 1 || rowInk[top - 1] >= rowInk[bottom + 1])
    if (takeAbove) inBand += rowInk[--top]
    else inBand += rowInk[++bottom]
  }

  let best: { x: number; y: number } | null = null
  let bestScore = -Infinity
  for (let y = top; y <= bottom; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue
      // Favour right edge, break ties towards the top of the band.
      const score = x / w + (1 - (y - top) / Math.max(1, bottom - top)) * 0.55
      if (score > bestScore) {
        bestScore = score
        best = { x, y }
      }
    }
  }
  return best
}

/**
 * Rasterise one letter at the given CSS size and derive its masks.
 * Call only after `document.fonts.ready`, or the glyph falls back to a
 * different font and the mask won't match what the child sees.
 */
export function buildLetterMask(char: string, cssW: number, cssH: number, fontPx: number): LetterMask {
  const w = Math.max(1, Math.round(cssW * ANALYSIS_SCALE))
  const h = Math.max(1, Math.round(cssH * ANALYSIS_SCALE))

  const draw = (dilate: number) => {
    const ctx = makeCanvas(w, h).getContext('2d')!
    ctx.scale(ANALYSIS_SCALE, ANALYSIS_SCALE)
    ctx.font = `${fontPx}px ${TRACE_FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#000'
    if (dilate > 0) {
      // Stroking the outline at 2r grows the shape by r in every direction.
      ctx.strokeStyle = '#000'
      ctx.lineWidth = dilate * 2
      ctx.lineJoin = 'round'
      ctx.strokeText(char, cssW / 2, cssH / 2)
    }
    ctx.fillText(char, cssW / 2, cssH / 2)
    return ctx
  }

  const core = alphaMask(draw(0), w, h)
  const tolerant = alphaMask(draw(TOLERANCE_PX), w, h)
  const startGrid = findStartPoint(core.mask, w, h)

  return {
    w,
    h,
    core: core.mask,
    coreCount: core.count,
    tolerant: tolerant.mask,
    start: startGrid
      ? { x: startGrid.x / ANALYSIS_SCALE, y: startGrid.y / ANALYSIS_SCALE }
      : null,
  }
}

export type Stroke = { x: number; y: number }[]

/** Render the child's strokes to a mask at the analysis resolution. */
function strokesToMask(strokes: Stroke[], mask: LetterMask, cssW: number, cssH: number, lineWidth: number) {
  const ctx = makeCanvas(mask.w, mask.h).getContext('2d')!
  ctx.scale(mask.w / cssW, mask.h / cssH)
  ctx.strokeStyle = '#000'
  ctx.lineWidth = lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const stroke of strokes) {
    if (stroke.length === 0) continue
    ctx.beginPath()
    if (stroke.length === 1) {
      // A tap still leaves a dot — letters like ب need one.
      ctx.arc(stroke[0].x, stroke[0].y, lineWidth / 2, 0, Math.PI * 2)
      ctx.fillStyle = '#000'
      ctx.fill()
      continue
    }
    ctx.moveTo(stroke[0].x, stroke[0].y)
    for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y)
    ctx.stroke()
  }
  return alphaMask(ctx, mask.w, mask.h)
}

export function scoreTrace(
  strokes: Stroke[],
  mask: LetterMask,
  cssW: number,
  cssH: number,
  brushWidth: number,
): TraceScore {
  const drawn = strokesToMask(strokes, mask, cssW, cssH, brushWidth)

  const empty: TraceScore = { accuracy: 0, coverage: 0, overall: 0, stars: 0, tooLittleInk: true }
  if (drawn.count === 0 || mask.coreCount === 0) return empty
  // Under ~4% of the glyph's area is a stray tap, not an attempt.
  if (drawn.count < mask.coreCount * 0.04) return empty

  let onTarget = 0
  for (let i = 0; i < drawn.mask.length; i++) {
    if (drawn.mask[i] && mask.tolerant[i]) onTarget++
  }
  const accuracy = onTarget / drawn.count

  // Coverage uses a deliberately fatter brush: a child traces the spine of a
  // letter, and the glyph's own strokes are far thicker than their fingertip,
  // so measuring raw overlap would punish a perfectly good trace.
  const wide = strokesToMask(strokes, mask, cssW, cssH, brushWidth * 2.4)
  let covered = 0
  for (let i = 0; i < mask.core.length; i++) {
    if (mask.core[i] && wide.mask[i]) covered++
  }
  const coverage = covered / mask.coreCount

  const overall = accuracy * 0.45 + coverage * 0.55
  const stars: TraceScore['stars'] =
    overall >= 0.82 ? 3 : overall >= 0.66 ? 2 : overall >= 0.45 ? 1 : 0

  return { accuracy, coverage, overall, stars, tooLittleInk: false }
}
