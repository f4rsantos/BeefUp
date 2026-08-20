import { db, STORES } from './db'
import { getPref, setPref, PREF_KEYS, MIGRATION_FLAG } from './prefs'
import { todayISO } from './planUtils'

const BACKUP_APP = 'BeefUp'
const BACKUP_VERSION = 1

// Distinguishes "pref absent" from a stored null, which is a legitimate value
// for prefs like sectionPrefs and firebaseConfig.
const MISSING = Symbol('missing')

// Prefs live in the settings store; PREF_KEYS is owned by prefs.js so a newly
// added pref round-trips through backup/restore without a second list to edit.
const STORE_NAMES = Object.values(STORES)

// Reads straight from IndexedDB rather than from context state: `steps` and
// `water` are maps in memory but rows on disk, and only the rows round-trip.
export async function buildBackup() {
  const stores = {}
  for (const name of STORE_NAMES) {
    stores[name] = await db.getAll(name)
  }

  // Prefs are settings rows, but they round-trip through `prefs` below. Drop
  // them from the store dump so each pref has exactly one home in the file and
  // the two copies cannot disagree.
  const prefKeySet = new Set(PREF_KEYS)
  stores[STORES.settings] = stores[STORES.settings].filter(row => !prefKeySet.has(row.key))

  // Sentinel rather than the real default: getPref() coerces a missing key to
  // its fallback, which would bake defaults into the backup for prefs the user
  // never set — and a restored `sectionPrefs: null` would break the nav.
  const prefs = {}
  for (const key of PREF_KEYS) {
    const value = await getPref(key, MISSING)
    if (value === MISSING) continue
    prefs[key] = value
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

  // Written after the stores so prefs win over any stale settings rows a
  // backup from an older build may still carry.
  const prefs = backup.prefs ?? {}
  for (const key of PREF_KEYS) {
    if (key in prefs) await setPref(key, prefs[key])
  }

  // Clearing the settings store dropped the migration flag; re-set it so the
  // next boot does not re-import prefs from a stale localStorage.
  await db.setSetting(MIGRATION_FLAG, true)
}

export function backupFilename() {
  return `beefup-backup-${todayISO()}.json`
}
