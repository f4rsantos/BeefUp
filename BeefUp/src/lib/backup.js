import { db, STORES } from './db.js'
import { getPref, setPref, PREF_KEYS, MIGRATION_FLAG, isLocalOnlySetting, NON_PORTABLE_PREFS } from './prefs.js'
import { todayISO } from './planUtils.js'

const BACKUP_APP = 'BeefUp'
const BACKUP_VERSION = 1

// Sentinel: null is a valid pref value.
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
  stores[STORES.settings] = stores[STORES.settings].filter(
    row => !prefKeySet.has(row.key) && !isLocalOnlySetting(row.key)
  )

  // Sentinel rather than the real default: getPref() coerces a missing key to
  // its fallback, which would bake defaults into the backup for prefs the user
  // never set — and a restored `sectionPrefs: null` would break the nav.
  const prefs = {}
  for (const key of PREF_KEYS) {
    if (NON_PORTABLE_PREFS.includes(key)) continue
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

const PRESERVED_ON_RESTORE = ['supabase:config', 'sync:owner']

// Replaces everything
export async function restoreBackup(backup) {
  const preserved = (await db.getAll(STORES.settings))
    .filter(row => PRESERVED_ON_RESTORE.includes(row.key))

  for (const name of STORE_NAMES) {
    const rows = backup.stores[name]
    if (!Array.isArray(rows)) continue
    await db.clear(name)
    const toWrite = name === STORES.settings
      ? rows.filter(row => !isLocalOnlySetting(row.key))
      : rows
    for (const row of toWrite) await db.put(name, row)
  }

  for (const row of preserved) await db.put(STORES.settings, row)

  // Written after the stores so prefs win over any stale settings rows a
  // backup from an older build may still carry.
  const prefs = backup.prefs ?? {}
  for (const key of PREF_KEYS) {
    if (NON_PORTABLE_PREFS.includes(key)) continue
    if (key in prefs) await setPref(key, prefs[key])
  }

  // Clearing the settings store dropped the migration flag; re-set it so the
  // next boot does not re-import prefs from a stale localStorage.
  await db.setSetting(MIGRATION_FLAG, true)
}

export function backupFilename() {
  return `beefup-backup-${todayISO()}.json`
}
