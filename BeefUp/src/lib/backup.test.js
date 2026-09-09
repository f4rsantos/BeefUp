import 'fake-indexeddb/auto'
import test from 'node:test'
import assert from 'node:assert/strict'

import { db, STORES } from './db.js'
import { setPref, getPref } from './prefs.js'
import { buildBackup, parseBackup, restoreBackup } from './backup.js'

async function reset() {
  for (const store of Object.values(STORES)) await db.clear(store)
}

const SAMPLE_CONFIG = { url: 'https://abc123.supabase.co', anonKey: 'fake-anon-key-xyz' }
const EVIL_CONFIG = { url: 'https://evil-project.supabase.co', anonKey: 'stolen-key' }

test('exported backup never carries the trainer project config', async () => {
  await reset()
  await db.setSetting('supabase:config', SAMPLE_CONFIG)

  const backup = await buildBackup()
  const serialized = JSON.stringify(backup)

  assert.ok(!serialized.includes('supabase:config'), 'key must not appear anywhere')
  assert.ok(!serialized.includes('abc123.supabase.co'), 'url must not appear anywhere')
})

test('exported backup drops sync cursors and owner tag', async () => {
  await reset()
  await db.setSetting('sync:cursor:sessions', 12345)
  await db.setSetting('sync:owner', 'trainer-1')

  const backup = await buildBackup()
  const keys = backup.stores[STORES.settings].map(row => row.key)

  assert.ok(!keys.some(k => k.startsWith('sync:cursor:')))
  assert.ok(!keys.includes('sync:owner'))
})

test('exported backup drops non-portable sync prefs', async () => {
  await reset()
  await setPref('syncLink', { trainerId: 't1', trainerName: 'Ana', status: 'accepted' })
  await setPref('syncScopes', ['workouts'])
  await setPref('syncLastSyncAt', 1700000000000)

  const backup = await buildBackup()

  assert.ok(!('syncLink' in backup.prefs))
  assert.ok(!('syncScopes' in backup.prefs))
  assert.ok(!('syncLastSyncAt' in backup.prefs))
})

test('restoring a backup preserves the local project config', async () => {
  await reset()
  await db.setSetting('supabase:config', SAMPLE_CONFIG)

  const backup = await buildBackup()
  await restoreBackup(backup)

  assert.deepEqual(await db.getSetting('supabase:config'), SAMPLE_CONFIG)
})

test('restoring a hostile backup cannot overwrite the local project config', async () => {
  await reset()
  await db.setSetting('supabase:config', SAMPLE_CONFIG)

  const hostile = {
    app: 'BeefUp',
    version: 1,
    exportedAt: new Date().toISOString(),
    stores: {
      [STORES.settings]: [{ key: 'supabase:config', value: EVIL_CONFIG }],
    },
    prefs: {},
  }
  const parsed = parseBackup(JSON.stringify(hostile))
  assert.ok(parsed)

  await restoreBackup(parsed)

  assert.deepEqual(await db.getSetting('supabase:config'), SAMPLE_CONFIG)
})

test('restoring resets sync cursors even if the backup carries one', async () => {
  await reset()
  await db.setSetting('sync:cursor:sessions', 999)

  const hostile = {
    app: 'BeefUp',
    version: 1,
    exportedAt: new Date().toISOString(),
    stores: {
      [STORES.settings]: [{ key: 'sync:cursor:sessions', value: 1 }],
    },
    prefs: {},
  }
  await restoreBackup(parseBackup(JSON.stringify(hostile)))

  assert.equal(await db.getSetting('sync:cursor:sessions', 0), 0)
})

test('a normal backup of workouts, sessions and theme round-trips', async () => {
  await reset()
  await db.put(STORES.workouts, { id: 'w1', name: 'Push Day' })
  await db.addSession({ id: 's1', date: '2026-01-01', duration: 60 })
  await setPref('theme', 'dark')

  const backup = await buildBackup()
  await reset()
  await restoreBackup(backup)

  assert.deepEqual(await db.getAll(STORES.workouts), [{ id: 'w1', name: 'Push Day' }])
  const [session] = await db.getAllSessions()
  assert.equal(session.id, 's1')
  assert.equal(await getPref('theme'), 'dark')
})
