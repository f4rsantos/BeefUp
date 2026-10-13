import { canonicalRef } from './exerciseTree.js'

// Encode/decode a workout into a URL-safe blob for sharing via link.
const FIELDS = ['name', 'exercises', 'restAfterSet']

export function encodeWorkoutShare(workout) {
  const payload = Object.fromEntries(FIELDS.map((k) => [k, workout[k]]))
  const bytes = new TextEncoder().encode(JSON.stringify(payload))
  return btoa(String.fromCharCode(...bytes))
}

export function decodeWorkoutShare(code) {
  try {
    const bytes = Uint8Array.from(atob(code), (c) => c.charCodeAt(0))
    const data = JSON.parse(new TextDecoder().decode(bytes))
    if (typeof data.name !== 'string' || !Array.isArray(data.exercises)) return null
    // Links made by an older app carry old variant ids.
    const exercises = data.exercises.map((item) => (
      typeof item === 'string' ? canonicalRef(item) : { ...item, ref: canonicalRef(item.ref) }
    ))
    return { ...data, exercises }
  } catch {
    return null
  }
}
