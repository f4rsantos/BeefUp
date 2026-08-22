import 'fake-indexeddb/auto'
import test from 'node:test'
import assert from 'node:assert/strict'

import { db, STORES } from '../db.js'
import { SCOPES, storesForScopes, keyFieldOf } from './stores.js'
import { isDeleted, isDirty, stripMeta } from './meta.js'
import { resolveRow, pendingPush, purgeableKeys, TOMBSTONE_GRACE_MS } from './merge.js'
import { syncStore, syncAll, purgeStore, cursorKey } from './engine.js'
import { createMemoryBackend } from './backends/memory.js'

async function reset() {
  for (const store of Object.values(STORES)) await db.clear(store)
}

test('resolveRow keeps local edits and takes remote otherwise', () => {
  assert.equal(resolveRow(undefined), 'take-remote')
  assert.equal(resolveRow({ id: 'a', _dirty: false }), 'take-remote')
  assert.equal(resolveRow({ id: 'a', _dirty: true }), 'keep-local')
})

test('pendingPush selects only dirty rows', () => {
  const rows = [{ id: 'a', _dirty: true }, { id: 'b', _dirty: false }, { id: 'c', _dirty: true }]
  assert.deepEqual(pendingPush(rows).map((r) => r.id), ['a', 'c'])
})

test('purgeableKeys drops tombstones now when unlinked, after grace when linked', () => {
  const now = 10_000_000_000
  const rows = [
    { id: 'live' },
    { id: 'fresh', _deletedAt: now - 1000, _dirty: true },
    { id: 'old', _deletedAt: now - TOMBSTONE_GRACE_MS - 1, _dirty: false },
  ]
  assert.deepEqual(purgeableKeys(rows, 'id', { linked: false, now }), ['fresh', 'old'])
  assert.deepEqual(purgeableKeys(rows, 'id', { linked: true, now }), ['old'])
})

test('scopes map to the right stores', () => {
  const nutrition = storesForScopes([SCOPES.nutrition])
  assert.deepEqual(nutrition.sort(), [STORES.foodLog, STORES.foods, STORES.water].sort())
  assert.ok(!nutrition.includes(STORES.sessions))
  assert.equal(keyFieldOf(STORES.water), 'date')
  assert.equal(keyFieldOf(STORES.sessions), 'id')
})

test('writes are stamped dirty and reads hide the metadata', async () => {
  await reset()
  await db.addSession({ id: 's1', date: '2026-01-01', duration: 60 })

  const [visible] = await db.getAllSessions()
  assert.deepEqual(visible, { id: 's1', date: '2026-01-01', duration: 60 })

  const [raw] = await db.rawAll(STORES.sessions)
  assert.ok(isDirty(raw))
  assert.equal(typeof raw._updatedAt, 'number')
})

test('delete hides the row but leaves a tombstone behind', async () => {
  await reset()
  await db.addSession({ id: 's1', date: '2026-01-01' })
  await db.remove(STORES.sessions, 's1')

  assert.deepEqual(await db.getAllSessions(), [])
  assert.equal(await db.get(STORES.sessions, 's1'), undefined)

  const raw = await db.rawAll(STORES.sessions)
  assert.equal(raw.length, 1)
  assert.ok(isDeleted(raw[0]))
  assert.ok(isDirty(raw[0]))
})

test('unsynced stores keep hard deletes and carry no metadata', async () => {
  await reset()
  await db.saveClient({ id: 'c1', name: 'Ana' })
  const [client] = await db.getAllClients()
  assert.equal(client._dirty, undefined)

  await db.removeClient('c1')
  assert.equal((await db.rawAll(STORES.clients)).length, 0)
})

test('offline writes push once online and stop being dirty', async () => {
  await reset()
  const backend = createMemoryBackend()

  await db.addSession({ id: 's1', date: '2026-01-01', duration: 60 })
  await db.addSession({ id: 's2', date: '2026-01-02', duration: 90 })

  const report = await syncStore(backend, STORES.sessions)
  assert.equal(report.pushed, 2)

  const raw = await db.rawAll(STORES.sessions)
  assert.ok(raw.every((r) => !isDirty(r)), 'everything should be clean after push')
  assert.ok(raw.every((r) => typeof r._serverAt === 'number'))

  assert.deepEqual(backend._dump(STORES.sessions).map((r) => r.key).sort(), ['s1', 's2'])
  // Server payload must not carry local bookkeeping.
  assert.deepEqual(backend._dump(STORES.sessions)[0].row, { id: 's1', date: '2026-01-01', duration: 60 })
})

test('rows written by another device arrive on pull', async () => {
  await reset()
  const backend = createMemoryBackend()

  await backend.push(STORES.sessions, [
    { key: 'other', row: { id: 'other', date: '2026-02-01', duration: 30 }, deleted: false },
  ])

  await syncStore(backend, STORES.sessions)

  const sessions = await db.getAllSessions()
  assert.deepEqual(sessions, [{ id: 'other', date: '2026-02-01', duration: 30 }])
  const [raw] = await db.rawAll(STORES.sessions)
  assert.ok(!isDirty(raw), 'pulled rows are already in sync')
})

test('a deletion on another device removes the row here', async () => {
  await reset()
  const backend = createMemoryBackend()

  await db.addSession({ id: 's1', date: '2026-01-01' })
  await syncStore(backend, STORES.sessions)
  assert.equal((await db.getAllSessions()).length, 1)

  await backend.push(STORES.sessions, [{ key: 's1', row: { id: 's1' }, deleted: true }])
  await syncStore(backend, STORES.sessions)

  assert.deepEqual(await db.getAllSessions(), [], 'remote delete should win')
})

test('a local delete made offline propagates to the server', async () => {
  await reset()
  const backend = createMemoryBackend()

  await db.addSession({ id: 's1', date: '2026-01-01' })
  await syncStore(backend, STORES.sessions)

  await db.remove(STORES.sessions, 's1')
  await syncStore(backend, STORES.sessions)

  const [remote] = backend._dump(STORES.sessions).filter((r) => r.key === 's1')
  assert.equal(remote.deleted, true)
  assert.deepEqual(await db.getAllSessions(), [])
})

test('a pull cannot resurrect a row deleted here', async () => {
  await reset()
  const backend = createMemoryBackend()

  await db.addSession({ id: 's1', date: '2026-01-01' })
  await syncStore(backend, STORES.sessions)
  await db.remove(STORES.sessions, 's1')
  await syncStore(backend, STORES.sessions)

  // Cursor rewind forces the server to replay every row it holds.
  await db.setSetting(cursorKey(STORES.sessions), 0)
  await syncStore(backend, STORES.sessions)

  assert.deepEqual(await db.getAllSessions(), [], 'tombstone must survive a full replay')
})

test('an offline edit wins over the copy already on the server', async () => {
  await reset()
  const backend = createMemoryBackend()

  await db.put(STORES.workouts, { id: 'w1', name: 'Push' })
  await syncStore(backend, STORES.workouts)

  // Another device renames it, then this device renames it while offline.
  await backend.push(STORES.workouts, [{ key: 'w1', row: { id: 'w1', name: 'Remote name' }, deleted: false }])
  await db.put(STORES.workouts, { id: 'w1', name: 'Local name' })

  await syncStore(backend, STORES.workouts)

  const [local] = await db.getAll(STORES.workouts)
  assert.equal(local.name, 'Local name', 'the dirty local row wins')
  const remote = backend._dump(STORES.workouts).find((r) => r.key === 'w1')
  assert.equal(remote.row.name, 'Local name', 'and the server ends up agreeing')
})

test('syncAll only touches the stores the student shared', async () => {
  await reset()
  const backend = createMemoryBackend()

  await db.addSession({ id: 's1', date: '2026-01-01' })
  await db.addFoodLog({ id: 'f1', date: '2026-01-01', meal: 'lunch', kcal: 500 })

  await syncAll(backend, { scopes: [SCOPES.nutrition] })

  assert.equal(backend._dump(STORES.foodLog).length, 1, 'nutrition is shared')
  assert.equal(backend._dump(STORES.sessions).length, 0, 'workouts are not')

  const [rawSession] = await db.rawAll(STORES.sessions)
  assert.ok(isDirty(rawSession), 'unshared rows stay pending, ready if the scope is enabled later')
})

test('the cursor advances so a second sync pulls nothing new', async () => {
  await reset()
  const backend = createMemoryBackend()

  await db.addSession({ id: 's1', date: '2026-01-01' })
  await syncStore(backend, STORES.sessions)

  const second = await syncStore(backend, STORES.sessions)
  assert.equal(second.pushed, 0)
  assert.equal(second.pulled, 0)
})

test('tombstones are purged immediately while unlinked', async () => {
  await reset()
  await db.addSession({ id: 's1', date: '2026-01-01' })
  await db.remove(STORES.sessions, 's1')
  assert.equal((await db.rawAll(STORES.sessions)).length, 1)

  const purged = await purgeStore(STORES.sessions, { linked: false })
  assert.equal(purged, 1)
  assert.equal((await db.rawAll(STORES.sessions)).length, 0)
})

test('a linked device keeps an unpushed tombstone', async () => {
  await reset()
  await db.addSession({ id: 's1', date: '2026-01-01' })
  await db.remove(STORES.sessions, 's1')

  const purged = await purgeStore(STORES.sessions, { linked: true })
  assert.equal(purged, 0, 'never drop a deletion the server has not seen')
})

test('date-keyed stores sync on their own key', async () => {
  await reset()
  const backend = createMemoryBackend()

  await db.setWater('2026-01-01', 500)
  await syncStore(backend, STORES.water)

  const [remote] = backend._dump(STORES.water)
  assert.equal(remote.key, '2026-01-01')
  assert.deepEqual(remote.row, { date: '2026-01-01', ml: 500 })
})

test('rows written before this layer existed still read back', async () => {
  await reset()
  // Straight into the store, no stamping, the way older builds wrote it.
  await db.rawPut(STORES.sessions, { id: 'legacy', date: '2025-06-01', duration: 42 })

  assert.deepEqual(await db.getAllSessions(), [{ id: 'legacy', date: '2025-06-01', duration: 42 }])

  const backend = createMemoryBackend()
  const report = await syncStore(backend, STORES.sessions)
  assert.equal(report.pushed, 0, 'untouched legacy rows are not dirty yet')

  await db.addSession({ id: 'legacy', date: '2025-06-01', duration: 43 })
  const after = await syncStore(backend, STORES.sessions)
  assert.equal(after.pushed, 1, 'editing one uploads it')
})

test('a restore wipes the store and re-uploads what it puts back', async () => {
  await reset()
  const backend = createMemoryBackend()

  await db.addSession({ id: 's1', date: '2026-01-01' })
  await syncStore(backend, STORES.sessions)

  await db.clear(STORES.sessions)
  assert.deepEqual(await db.getAllSessions(), [])

  await db.addSession({ id: 's2', date: '2026-03-01' })
  const report = await syncStore(backend, STORES.sessions)
  assert.equal(report.pushed, 1)
  assert.deepEqual((await db.getAllSessions()).map((s) => s.id), ['s2'])
})

test('stripMeta leaves plain rows untouched', () => {
  assert.deepEqual(stripMeta({ id: 'a', n: 1, _dirty: true, _updatedAt: 5 }), { id: 'a', n: 1 })
  assert.deepEqual(stripMeta({ id: 'a' }), { id: 'a' })
})
