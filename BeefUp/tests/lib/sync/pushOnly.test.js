import 'fake-indexeddb/auto'
import test from 'node:test'
import assert from 'node:assert/strict'

import { db, STORES } from '../../../src/lib/db.js'
import { isDirty, isDeleted } from '../../../src/lib/sync/meta.js'
import { syncAll, pushAll, cursorKey } from '../../../src/lib/sync/engine.js'
import { createMemoryBackend } from '../../../src/lib/sync/backends/memory.js'

const SCOPES = ['workouts']

async function reset() {
  for (const store of Object.values(STORES)) await db.clear(store)
}

test('a push sends local changes and reads nothing back', async () => {
  await reset()
  const backend = createMemoryBackend()
  await backend.push(STORES.workouts, [{ key: 'remote', row: { id: 'remote', name: 'From elsewhere' } }])

  await db.put(STORES.workouts, { id: 'w1', name: 'Mine' })
  await pushAll(backend, { scopes: SCOPES })

  const mine = backend._dump(STORES.workouts).find((r) => r.key === 'w1')
  assert.equal(mine.row.name, 'Mine')
  assert.ok(!(await db.getAll(STORES.workouts)).some((w) => w.id === 'remote'), 'remote rows wait for the pull')
  assert.equal(await db.getSetting(cursorKey(STORES.workouts), 0), 0, 'the cursor does not move')

  await syncAll(backend, { scopes: SCOPES })
  assert.ok((await db.getAll(STORES.workouts)).some((w) => w.id === 'remote'))
})

test('a delete reaches the server as a tombstone without waiting for a pull', async () => {
  await reset()
  const backend = createMemoryBackend()
  await db.put(STORES.workouts, { id: 'w1', name: 'A' })
  await pushAll(backend, { scopes: SCOPES })

  await db.remove(STORES.workouts, 'w1')
  await pushAll(backend, { scopes: SCOPES })

  assert.equal(backend._dump(STORES.workouts).find((r) => r.key === 'w1').deleted, true)
})

test('an edit made while a push is in flight stays dirty', async () => {
  await reset()
  const memory = createMemoryBackend()
  const backend = {
    ...memory,
    async push(store, items) {
      const res = await memory.push(store, items)
      await db.put(STORES.workouts, { id: 'w1', name: 'Edited during the push' })
      return res
    },
  }
  await db.put(STORES.workouts, { id: 'w1', name: 'First' })
  await pushAll(backend, { scopes: SCOPES })

  const rows = await db.getAll(STORES.workouts)
  assert.equal(rows[0].name, 'Edited during the push', 'the newer edit survives the ack')
  const raw = await new Promise((resolve) => {
    const open = indexedDB.open('beefup')
    open.onsuccess = () => {
      const req = open.result.transaction(STORES.workouts).objectStore(STORES.workouts).get('w1')
      req.onsuccess = () => resolve(req.result)
    }
  })
  assert.ok(isDirty(raw), 'and is still waiting to be pushed')

  await pushAll(memory, { scopes: SCOPES })
  assert.equal(memory._dump(STORES.workouts)[0].row.name, 'Edited during the push')
})

test('pushing without a pull cannot undo a deletion made elsewhere', async () => {
  await reset()
  // Real epoch times, or the purge treats the tombstone as ancient.
  const backend = createMemoryBackend({ startAt: Date.now() })
  await db.put(STORES.workouts, { id: 'w1', name: 'A' })
  await syncAll(backend, { scopes: SCOPES })

  // Another device deletes it; this one has not pulled yet and edits it.
  await backend.push(STORES.workouts, [{ key: 'w1', row: null, deleted: true }])
  await db.put(STORES.workouts, { id: 'w1', name: 'Edited here' })
  await pushAll(backend, { scopes: SCOPES })

  assert.equal(backend._dump(STORES.workouts)[0].deleted, true, 'the server keeps the deletion')

  await syncAll(backend, { scopes: SCOPES })
  const raw = await new Promise((resolve) => {
    const open = indexedDB.open('beefup')
    open.onsuccess = () => {
      const req = open.result.transaction(STORES.workouts).objectStore(STORES.workouts).get('w1')
      req.onsuccess = () => resolve(req.result)
    }
  })
  assert.ok(isDeleted(raw), 'the next pull settles it: deletion wins')
})
