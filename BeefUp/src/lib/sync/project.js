// Moving a student from one trainer's Supabase project to another. This is
// the dangerous path (see engine.js's sync:owner guard): every step here
// exists to stop the old project's identity, cursors or prescribed content
// from leaking into the new one.
import { db } from '../db.js'
import { setPref } from '../prefs.js'
import { isPrescribed } from '../planUtils.js'
import { resetSupabase } from '../supabaseClient.js'
import { setSupabaseConfig, validateConfig } from '../supabaseConfig.js'
import { unlink } from './link.js'
import { clearAllCursors, clearSyncOwner } from './engine.js'
import { SCOPES, storesForScopes, keyFieldOf } from './stores.js'

async function scanRows() {
  const removed = []
  const rebaselined = []
  for (const store of storesForScopes(Object.values(SCOPES))) {
    for (const row of await db.rawAll(store)) {
      if (isPrescribed(row)) removed.push({ store, row })
      else rebaselined.push({ store, row })
    }
  }
  return { removed, rebaselined }
}

// Strips the old project's server timestamp so the row looks unsynced.
function rebaseline(row) {
  const rest = { ...row }
  delete rest._serverAt
  return { ...rest, _dirty: true }
}

// Read-only: lets the UI build a confirm dialog before anything is touched.
export async function previewProjectSwitch() {
  const { removed, rebaselined } = await scanRows()
  return { removedCount: removed.length, rebaselinedCount: rebaselined.length }
}

// Order matters:
// 1. unlink from the OLD project while its client/session is still live.
// 2. sign out before the new config is written, or the storage key is wrong.
// 3. drop cursors — they hold the old project's clock, not the new one's.
// 4. prescribed rows are the old trainer's; everything else re-baselines.
// 5. write the new config last, clearing link state and the owner guard.
export async function switchSupabaseProject(newConfig) {
  // Before anything destructive: a config that fails validation must not cost
  // the student their prescribed rows and cursors on the way to throwing.
  validateConfig(newConfig)

  await unlink()
  await resetSupabase({ signOut: true })
  await clearAllCursors()

  const { removed, rebaselined } = await scanRows()
  for (const { store, row } of removed) {
    await db.rawDelete(store, row[keyFieldOf(store)])
  }
  for (const { store, row } of rebaselined) {
    await db.rawPut(store, rebaseline(row))
  }

  await setSupabaseConfig(newConfig)
  await setPref('syncLink', null)
  await setPref('syncScopes', [])
  await setPref('syncLastSyncAt', null)
  await clearSyncOwner()

  return { removedPrescribed: removed.length, rebaselined: rebaselined.length }
}
