import { db, STORES } from './db'
import { getLS, setLS } from './crypto'
import { todayISO } from './planUtils'

const BACKUP_APP = 'BeefUp'
const BACKUP_VERSION = 1

// localStorage keys the app persists outside IndexedDB
const PREF_KEYS = [
  'theme',
  'lang',
  'onboarded',
  'appMode',
  'focus',
  'sectionPrefs',
  'statsLayout',
  'favExercises',
  'nutritionGoals',
]

const STORE_NAMES = Object.values(STORES)

// Reads straight from IndexedDB rather than from context state: `steps` and
// `water` are maps in memory but rows on disk, and only the rows round-trip.
export async function buildBackup() {
  const stores = {}
  for (const name of STORE_NAMES) {
    stores[name] = await db.getAll(name)
  }

  // Checks localStorage directly: getLS() coerces a missing key to its
  // fallback, which would bake nulls into the backup for prefs the user
  // never set — and a restored `sectionPrefs: null` would break the nav.
  const prefs = {}
  for (const key of PREF_KEYS) {
    if (localStorage.getItem(key) === null) continue
    prefs[key] = getLS(key)
  }

  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    stores,
    prefs,
  }
}

export function parseBackup(text) {
  try {
    const data = JSON.parse(text)
    if (data?.app !== BACKUP_APP) return null
    if (!data.stores || typeof data.stores !== 'object') return null
    return data
  } catch {
    return null
  }
}

// Replaces everything
export async function restoreBackup(backup) {
  for (const name of STORE_NAMES) {
    const rows = backup.stores[name]
    if (!Array.isArray(rows)) continue
    await db.clear(name)
    for (const row of rows) await db.put(name, row)
  }

  const prefs = backup.prefs ?? {}
  for (const key of PREF_KEYS) {
    if (key in prefs) setLS(key, prefs[key])
  }
}

export function backupFilename() {
  return `beefup-backup-${todayISO()}.json`
}
