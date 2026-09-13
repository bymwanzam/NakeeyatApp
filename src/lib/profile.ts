/**
 * The child's profile: name, age and avatar.
 *
 * PRIVACY: this never leaves the device. It is written to localStorage and read
 * back, and there is no account, no server and no analytics call anywhere in
 * this app. That is a deliberate choice for something children use — the only
 * copy of a child's name is the one in their own browser, and clearing site
 * data erases it completely.
 *
 * The details are collected because they are used, not just stored: the name
 * personalises every greeting, the age sets a sensible starting text size, and
 * the avatar gives the child a character of their own on the home screen.
 */
import { useCallback, useEffect, useState } from 'react'

export type Gender = 'boy' | 'girl'

export type Profile = {
  name: string
  age: number
  gender: Gender
  /** When the profile was created, so we can say "day 3 of learning". */
  startedAt: number
}

const KEY = 'nakeeyat.profile.v1'

export const MIN_AGE = 3
export const MAX_AGE = 12

function load(): Profile | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<Profile>
    if (!p.name || typeof p.age !== 'number' || !p.gender) return null
    return { name: p.name, age: p.age, gender: p.gender, startedAt: p.startedAt ?? Date.now() }
  } catch {
    return null
  }
}

const subscribers = new Set<(p: Profile | null) => void>()
let current: Profile | null = typeof window === 'undefined' ? null : load()

function commit(next: Profile | null) {
  current = next
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next))
    else localStorage.removeItem(KEY)
  } catch {
    // Private browsing: the profile simply won't persist between visits.
  }
  subscribers.forEach((fn) => fn(next))
}

export function useProfile() {
  const [profile, setProfile] = useState(current)

  useEffect(() => {
    subscribers.add(setProfile)
    return () => {
      subscribers.delete(setProfile)
    }
  }, [])

  const save = useCallback((p: Omit<Profile, 'startedAt'>) => {
    commit({ ...p, startedAt: current?.startedAt ?? Date.now() })
  }, [])

  const clear = useCallback(() => commit(null), [])

  return { profile, save, clear }
}

/** Younger children need noticeably bigger text; this sets the starting point. */
export const defaultTextSizeIndex = (age: number) => (age <= 5 ? 3 : age <= 8 ? 2 : 1)

/** Whole days since the child started, counting the first day as day 1. */
export const dayNumber = (startedAt: number) =>
  Math.floor((Date.now() - startedAt) / 86_400_000) + 1
