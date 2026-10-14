import { db, STORES } from './db.js'
import { canonicalRef, VARIANT_ALIASES_VERSION } from './exerciseTree.js'
import { isPrescribed } from './planUtils.js'
import { getLS, setLS } from './crypto.js'

export const REF_VERSION_SETTING = 'refAliasesVersion'

// Each returns the same object when nothing changed.
export function canonicalSession(session) {
  if (!session?.exercises) return session
  let changed = false
  const exercises = session.exercises.map((e) => {
    const next = canonicalRef(e.exerciseId)
    if (next === e.exerciseId) return e
    changed = true
    return { ...e, exerciseId: next }
  })
  return changed ? { ...session, exercises } : session
}

export function canonicalWorkout(workout) {
  if (!workout?.exercises) return workout
  let changed = false
  const exercises = workout.exercises.map((item) => {
    const ref = typeof item === 'string' ? item : item.ref
    const next = canonicalRef(ref)
    if (next === ref) return item
    changed = true
    return typeof item === 'string' ? next : { ...item, ref: next }
  })
  return changed ? { ...workout, exercises } : workout
}

export function canonicalizeList(list, canonicalize) {
  return (list ?? []).map(canonicalize)
}

// Linked students may still run the old app.
export function canonicalClientData(data) {
  if (!data) return data
  const next = { ...data }
  if (data.sessions) next.sessions = canonicalizeList(data.sessions, canonicalSession)
  if (data.workouts) next.workouts = canonicalizeList(data.workouts, canonicalWorkout)
  return next
}

// Rewrites stored refs once per aliases version; skips prescribed rows.
export async function migrateExerciseRefs(version = VARIANT_ALIASES_VERSION) {
  const done = await db.getSetting(REF_VERSION_SETTING, 0)
  if (done >= version) return 0

  let written = 0
  for (const [store, canonicalize] of [[STORES.sessions, canonicalSession], [STORES.workouts, canonicalWorkout]]) {
    for (const row of await db.getAll(store)) {
      if (isPrescribed(row)) continue
      const next = canonicalize(row)
      if (next === row) continue
      await db.put(store, next)
      written++
    }
  }

  const draft = typeof localStorage === 'undefined' ? null : getLS('activeWorkoutDraft', null)
  if (draft?.exercises) {
    const next = canonicalSession(draft)
    if (next !== draft) setLS('activeWorkoutDraft', next)
  }

  await db.setSetting(REF_VERSION_SETTING, version)
  return written
}
