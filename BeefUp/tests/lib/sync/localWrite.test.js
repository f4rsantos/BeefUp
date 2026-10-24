import 'fake-indexeddb/auto'
import test from 'node:test'
import assert from 'node:assert/strict'

import { db, STORES, LOCAL_WRITE_EVENT } from '../../../src/lib/db.js'

function listen() {
  let count = 0
  const target = new EventTarget()
  globalThis.window = target
  target.addEventListener(LOCAL_WRITE_EVENT, () => { count++ })
  return () => count
}

test('editing and deleting a synced row announce a local write', async () => {
  const count = listen()
  await db.put(STORES.workouts, { id: 'w1', name: 'A' })
  assert.equal(count(), 1)
  await db.remove(STORES.workouts, 'w1')
  assert.equal(count(), 2)
})

test('rows that never leave the device stay quiet', async () => {
  const count = listen()
  await db.put(STORES.clients, { id: 'c1' })
  await db.remove(STORES.clients, 'c1')
  await db.setSetting('theme', 'dark')
  assert.equal(count(), 0)
})

test('a missing window (node, workers) is not an error', async () => {
  delete globalThis.window
  await db.put(STORES.workouts, { id: 'w2', name: 'B' })
  await db.remove(STORES.workouts, 'w2')
})
