import 'fake-indexeddb/auto'
import test from 'node:test'
import assert from 'node:assert/strict'

import { db, STORES } from '../db.js'
import { SCOPES, storesForScopes, keyFieldOf } from './stores.js'
import { isDeleted, isDirty, stripMeta } from './meta.js'
import { resolveRow, mergeStore, pendingPush, purgeableKeys, TOMBSTONE_GRACE_MS } from './merge.js'
import { syncStore, syncAll, purgeStore, cursorKey } from './engine.js'
import { createMemoryBackend } from './backends/memory.js'
import { unlink } from './link.js'
import { switchSupabaseProject } from './project.js'

async function reset() {
  for (const store of Object.values(STORES)) await db.clear(store)
}

test('resolveRow keeps local edits and takes remote otherwise', () => {
  assert.equal(resolveRow(undefined), 'take-remote')
  assert.equal(resolveRow({ id: 'a', _dirty: false }), 'take-remote')
  assert.equal(resolveRow({ id: 'a', _dirty: true }), 'keep-local')
})

test('resolveRow: a remote tombstone beats a dirty local edit', () => {
  const remoteTombstone = { id: 'a', _deletedAt: 5000 }
  assert.equal(resolveRow({ id: 'a', _dirty: true }, remoteTombstone), 'take-remote')
  assert.equal(resolveRow({ id: 'a', _dirty: false }, remoteTombstone), 'take-remote')
  assert.equal(resolveRow(undefined, remoteTombstone), 'take-remote')
})

test('mergeStore lets a remote deletion overwrite a dirty local edit', () => {
  const local = [{ id: 'a', name: 'unpushed edit', _dirty: true }]
  const remoteTombstone = { id: 'a', _deletedAt: 5000 }
  const { writes, kept } = mergeStore(local, [{ row: remoteTombstone, serverAt: 5000 }], 'id')

  assert.equal(kept, 0)
  assert.equal(writes.length, 1)
  assert.ok(isDeleted(writes[0]), 'the local edit is discarded in favor of the tombstone')
  assert.ok(!isDirty(writes[0]), 'the tombstone lands clean, so it is never re-pushed')
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

test('a trainer un-prescribing a workout is not lost to a concurrent dirty edit', async () => {
  await reset()
  const backend = createMemoryBackend()

  await db.addSession({ id: 's1', date: '2026-01-01', duration: 60 })
  await syncStore(backend, STORES.sessions)

  // The trainer deletes the row server-side (a tombstone) while this device
  // has an unpushed edit sitting on top of the old copy, unaware of it.
  await backend.push(STORES.sessions, [{ key: 's1', row: { id: 's1' }, deleted: true }])
  await db.addSession({ id: 's1', date: '2026-01-01', duration: 90 })

  await syncStore(backend, STORES.sessions)

  assert.deepEqual(await db.getAllSessions(), [], 'the remote deletion wins, not the dirty edit')
  const [remote] = backend._dump(STORES.sessions).filter((r) => r.key === 's1')
  assert.equal(remote.deleted, true, 'the local edit must not resurrect the row on the server')

  // A later sync must not bring it back either.
  await syncStore(backend, STORES.sessions)
  assert.deepEqual(await db.getAllSessions(), [], 'stays deleted across a subsequent sync')
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

test('the cursor advances so sync eventually stops seeing its own pushed rows', async () => {
  await reset()
  const backend = createMemoryBackend()

  await db.addSession({ id: 's1', date: '2026-01-01' })
  await syncStore(backend, STORES.sessions)

  // The cursor deliberately lags one round behind its own push (see the
  // "gap" regression test below for why), so an immediate second sync may
  // still see the row it just pushed once more -- harmless, it merges back
  // to identical data.
  const second = await syncStore(backend, STORES.sessions)
  assert.equal(second.pushed, 0, 'nothing new to push')
  assert.equal(second.pulled, 1, 'sees its own just-pushed row once more, by design')

  const third = await syncStore(backend, STORES.sessions)
  assert.equal(third.pulled, 0, 'the cursor has since caught up')
})

test('a row committed on the server during our own push is not skipped by the cursor', async () => {
  await reset()
  const backend = createMemoryBackend()

  await db.addSession({ id: 's1', date: '2026-01-01' })
  await syncStore(backend, STORES.sessions)

  // The cursor must sit at this round's PULL time, strictly before this
  // round's own push landed -- otherwise a row another device commits in
  // that gap (updated_at between the two) falls behind the cursor and is
  // never pulled again. Advancing to the push ack instead is the actual
  // bug this guards: try it and this assertion (and the one below) fails.
  const cursor = await db.getSetting(cursorKey(STORES.sessions))
  const [pushedRow] = backend._dump(STORES.sessions)
  assert.ok(cursor < pushedRow.serverAt, 'cursor lags behind this round\'s own push, on purpose')

  // A write landing at that in-between server time -- here, our own just-
  // pushed row stands in for a genuinely different device's write -- must
  // still be picked up by the next sync, not skipped forever.
  const second = await syncStore(backend, STORES.sessions)
  assert.equal(second.pulled, 1, 'the row from the gap must still be pulled, not skipped')
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

test('a restore re-uploads its rows without destroying what the server held', async () => {
  await reset()
  const backend = createMemoryBackend()

  await db.addSession({ id: 's1', date: '2026-01-01' })
  await syncStore(backend, STORES.sessions)
  await syncStore(backend, STORES.sessions)

  // A backup restore: wipe the store, then put the backup's rows back.
  await db.clear(STORES.sessions)
  assert.deepEqual(await db.getAllSessions(), [])
  await db.addSession({ id: 's2', date: '2026-03-01' })

  const report = await syncStore(backend, STORES.sessions)
  assert.equal(report.pushed, 1, 'the restored row is uploaded')

  // s1 comes back because clearing a synced store drops its cursor, so the
  // next pull starts from scratch. The union of backup and server is the
  // conservative outcome: a restore must never silently delete rows the
  // server still holds just because this device's backup predates them.
  assert.deepEqual((await db.getAllSessions()).map((s) => s.id).sort(), ['s1', 's2'])
})

test('clearing a synced store resets its cursor, an unsynced one has none', async () => {
  await reset()
  const backend = createMemoryBackend()

  await db.addSession({ id: 's1', date: '2026-01-01' })
  await syncStore(backend, STORES.sessions)
  assert.ok(await db.getSetting(cursorKey(STORES.sessions), 0) > 0, 'cursor advanced')

  await db.clear(STORES.sessions)
  assert.equal(await db.getSetting(cursorKey(STORES.sessions), 0), 0, 'cursor was dropped')

  // clients is not a synced store, so clearing it touches no cursor.
  await db.saveClient({ id: 'c1', name: 'Ana' })
  await db.clear(STORES.clients)
  assert.equal(await db.getSetting(cursorKey(STORES.clients), 0), 0)
})

test('stripMeta leaves plain rows untouched', () => {
  assert.deepEqual(stripMeta({ id: 'a', n: 1, _dirty: true, _updatedAt: 5 }), { id: 'a', n: 1 })
  assert.deepEqual(stripMeta({ id: 'a' }), { id: 'a' })
})

test('unlink clears sync cursors, not just link state', async () => {
  await reset()
  const backend = createMemoryBackend()

  await db.addSession({ id: 's1', date: '2026-01-01' })
  await syncStore(backend, STORES.sessions)
  assert.ok(await db.getSetting(cursorKey(STORES.sessions), 0) > 0, 'cursor advanced')

  await unlink()

  assert.equal(await db.getSetting(cursorKey(STORES.sessions), 0), 0, 'cursor must not survive an unlink')
})

test('syncAll refuses to push when the backend identity does not match the recorded owner', async () => {
  await reset()
  const backendA = createMemoryBackend({ identity: { projectRef: 'proj-a', userId: 'user-a' } })

  await db.addSession({ id: 's1', date: '2026-01-01' })
  await syncAll(backendA, { scopes: [SCOPES.workouts] })
  assert.deepEqual(await db.getSetting('sync:owner', null), { projectRef: 'proj-a', userId: 'user-a' })

  // Same identity again: the guard lets it through.
  await db.addSession({ id: 's2', date: '2026-01-02' })
  await syncAll(backendA, { scopes: [SCOPES.workouts] })

  // A different backend identity, with the owner still pointing at A, must
  // be refused -- this is what makes a cross-project push impossible even
  // if some future code path forgets to reset first.
  const backendB = createMemoryBackend({ identity: { projectRef: 'proj-b', userId: 'user-b' } })
  await assert.rejects(() => syncAll(backendB, { scopes: [SCOPES.workouts] }), /refusing to sync/)
})

test('switching Supabase projects drops the cursor, so project B is not blind to rows it already had', async () => {
  await reset()
  const backendA = createMemoryBackend({ identity: { projectRef: 'switch-a1', userId: 'user-a1' } })

  await db.addSession({ id: 's1', date: '2026-01-01' })
  await syncAll(backendA, { scopes: [SCOPES.workouts] })
  assert.ok(await db.getSetting(cursorKey(STORES.sessions), 0) > 0, 'cursor advanced against A')

  await switchSupabaseProject({ url: 'https://switch-b1.supabase.co', anonKey: 'sb_publishable_test0000000000000001' })

  // A stale cursor here would mean project B's own pre-existing rows older
  // than A's "now" are never pulled again -- the silent data-loss bug (b).
  assert.equal(await db.getSetting(cursorKey(STORES.sessions), 0), 0, 'cursor must not carry over to project B')
})

test('switching Supabase projects drops prescribed rows and re-baselines the rest as dirty', async () => {
  await reset()
  const backendA = createMemoryBackend({ identity: { projectRef: 'switch-a2', userId: 'user-a2' } })

  await db.addSession({ id: 'own', date: '2026-01-01' })
  await db.put(STORES.plans, { id: 'plan-1', name: 'Trainer plan', prescribedBy: 'trainer-a' })
  await syncAll(backendA, { scopes: [SCOPES.workouts] })

  const result = await switchSupabaseProject({ url: 'https://switch-b2.supabase.co', anonKey: 'sb_publishable_test0000000000000002' })

  assert.equal(result.removedPrescribed, 1)
  assert.deepEqual(await db.rawAll(STORES.plans), [], "the old trainer's prescribed plan is gone")

  const [session] = await db.rawAll(STORES.sessions)
  assert.ok(isDirty(session), 'own data re-baselines as dirty so it re-uploads to the new project')
  assert.equal(session._serverAt, undefined, 'no stale server timestamp carried over from the old project')

  assert.equal(await db.getSetting('sync:owner', null), null, 'owner guard is cleared for the new project')
})

test('an invalid new config is rejected before anything local is destroyed', async () => {
  await reset()
  const backendA = createMemoryBackend({ identity: { projectRef: 'switch-a3', userId: 'user-a3' } })

  await db.addSession({ id: 'own', date: '2026-01-01' })
  await db.put(STORES.plans, { id: 'plan-1', name: 'Trainer plan', prescribedBy: 'trainer-a' })
  await syncAll(backendA, { scopes: [SCOPES.workouts] })
  const cursorBefore = await db.getSetting(cursorKey(STORES.sessions), 0)

  await assert.rejects(
    () => switchSupabaseProject({ url: 'https://evil.example.com', anonKey: 'sb_publishable_x' }),
    /bad-host/,
  )

  // Everything must survive a rejected switch: losing the old trainer's plans
  // on the way to throwing would be worse than the bad config itself.
  assert.equal((await db.rawAll(STORES.plans)).length, 1, 'prescribed rows untouched')
  assert.equal(await db.getSetting(cursorKey(STORES.sessions), 0), cursorBefore, 'cursor untouched')
  assert.ok(await db.getSetting('sync:owner', null), 'owner guard untouched')
})
