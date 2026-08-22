import { db, STORES } from './db'

// Preferences live in the IndexedDB `settings` store. They used to live in
// localStorage; `migrateLegacyPrefs()` moves any leftovers over on first boot.
export const PREF_DEFAULTS = {
  theme: 'system',
  fontScale: 'medium',
  soundEnabled: true,
  accentColor: 'green',
  customAccentHex: '#109a14',
  lang: 'pt',
  onboarded: false,
  joinedAt: null,
  activePlanSince: null,
  appMode: 'solo',
  focus: 'both',
  sectionPrefs: null, // derived from `focus` at hydration when unset
  statsLayout: null,  // resolved against statsLayoutVersion at hydration
  statsLayoutVersion: 1,
  favExercises: [],
  favFoods: [],
  favWorkouts: [],
  recentFoods: [],
  nutritionGoals: { kcal: 2200, protein: 150, carbs: 220, fat: 70, waterMl: 2500 },
  mealTypes: null,    // defaults to DEFAULT_MEAL_TYPES at hydration
  pwaInstallDismissedAt: 0,
  syncLink: null,     // cached { trainerId, trainerName, status } | null
  syncScopes: [],      // areas the student shares: workouts/nutrition/measures
  syncLastSyncAt: null, // epoch ms of the last successful sync
}

export const PREF_KEYS = Object.keys(PREF_DEFAULTS)

// `activePlanId` predates this module and already lived in the settings store,
// so it is deliberately absent from PREF_DEFAULTS — it is loaded on its own.
export const MIGRATION_FLAG = 'prefsMigratedToIDB'

// Prefs the boot script in index.html replays before first paint. IndexedDB
// stays the source of truth; these are mirrored to localStorage purely so the
// page does not flash the default theme while hydration is in flight.
const PAINT_MIRRORED = ['theme', 'accentColor']

function mirrorForPaint(key, value) {
  if (!PAINT_MIRRORED.includes(key)) return
  try {
    localStorage.setItem(`paint:${key}`, JSON.stringify(value))
  } catch {
    // A full or unavailable localStorage costs us the flash-free boot, not the
    // pref itself — it is already committed to IndexedDB.
  }
}

export function getPref(key, fallback) {
  return db.getSetting(key, fallback !== undefined ? fallback : PREF_DEFAULTS[key] ?? null)
}

export async function setPref(key, value) {
  await db.setSetting(key, value)
  mirrorForPaint(key, value)
}

// Reads every pref in one pass. Returns a plain object keyed like PREF_DEFAULTS,
// with defaults filled in for anything absent.
export async function getAllPrefs() {
  const entries = await Promise.all(
    PREF_KEYS.map(async (key) => [key, await getPref(key)]),
  )
  return Object.fromEntries(entries)
}

// One-time copy of localStorage prefs into IndexedDB. Runs before the first
// read so a returning user keeps their settings. Guarded by a flag in the
// settings store rather than by "are there any keys left", because a user who
// legitimately has no prefs set would otherwise re-run this every boot.
export async function migrateLegacyPrefs() {
  if (typeof localStorage === 'undefined') return
  if (await db.getSetting(MIGRATION_FLAG, false)) return

  for (const key of PREF_KEYS) {
    const raw = localStorage.getItem(key)
    if (raw === null) continue
    try {
      await setPref(key, JSON.parse(raw))
    } catch {
      // A value that is not JSON was never written by setLS — skip it rather
      // than storing the raw string under a key the app expects to be typed.
      continue
    }
  }

  await db.setSetting(MIGRATION_FLAG, true)

  // Only clear localStorage once the flag is committed: a crash mid-migration
  // then leaves the originals intact for the next attempt. The `paint:` mirror
  // keys are seeded by the hydration pass, not cleared here.
  for (const key of PREF_KEYS) localStorage.removeItem(key)
}

export { STORES }
