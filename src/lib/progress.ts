/**
 * Progress lives in localStorage: no account, no network, nothing leaves the
 * device. Stars are keyed per letter so a child can see which letters they
 * have already mastered.
 */
import { useCallback, useEffect, useState } from 'react'

const KEY = 'nakeeyat.progress.v1'

export type Progress = {
  /** letter id -> best star rating, 0-3 */
  traceStars: Record<string, number>
  /** letter id -> times answered correctly in the sounds quiz */
  soundsCorrect: Record<string, number>
  /** ids of reading items the child has tapped through */
  readSeen: string[]
}

const EMPTY: Progress = { traceStars: {}, soundsCorrect: {}, readSeen: [] }

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<Progress>
    return {
      traceStars: parsed.traceStars ?? {},
      soundsCorrect: parsed.soundsCorrect ?? {},
      readSeen: parsed.readSeen ?? [],
    }
  } catch {
    return EMPTY
  }
}

const subscribers = new Set<(p: Progress) => void>()
let current = typeof window === 'undefined' ? EMPTY : load()

function commit(next: Progress) {
  current = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Private-browsing quota errors shouldn't interrupt a lesson.
  }
  subscribers.forEach((fn) => fn(next))
}

export function useProgress() {
  const [progress, setProgress] = useState(current)

  useEffect(() => {
    subscribers.add(setProgress)
    return () => {
      subscribers.delete(setProgress)
    }
  }, [])

  /** Stars only ever go up, so a child can't lose a letter they've earned. */
  const recordTrace = useCallback((letterId: string, stars: number) => {
    const best = Math.max(current.traceStars[letterId] ?? 0, stars)
    commit({ ...current, traceStars: { ...current.traceStars, [letterId]: best } })
  }, [])

  const recordSound = useCallback((letterId: string) => {
    const n = (current.soundsCorrect[letterId] ?? 0) + 1
    commit({ ...current, soundsCorrect: { ...current.soundsCorrect, [letterId]: n } })
  }, [])

  const recordRead = useCallback((id: string) => {
    if (current.readSeen.includes(id)) return
    commit({ ...current, readSeen: [...current.readSeen, id] })
  }, [])

  const reset = useCallback(() => commit(EMPTY), [])

  const totalStars = Object.values(progress.traceStars).reduce((a, b) => a + b, 0)

  return { progress, totalStars, recordTrace, recordSound, recordRead, reset }
}
