import test from 'node:test'
import assert from 'node:assert/strict'

import { STORES } from '../../stores.js'
import { SCOPES } from '../stores.js'
import { createMemoryBackend } from './memory.js'
import { rowToItem, itemToRow, chunkForPush, createSupabaseBackend } from './supabase.js'

test('rowToItem maps a live row and converts updated_at to epoch ms', () => {
  const row = {
    row_key: 's1',
    data: { id: 's1', duration: 60 },
    updated_at: '2026-01-01T00:00:00.000Z',
    deleted_at: null,
  }
  assert.deepEqual(rowToItem(row), {
    key: 's1',
    row: { id: 's1', duration: 60 },
    serverAt: Date.parse('2026-01-01T00:00:00.000Z'),
    deleted: false,
  })
})

test('rowToItem maps a tombstone as deleted', () => {
  const row = {
    row_key: 's1',
    data: null,
    updated_at: '2026-01-02T00:00:00.000Z',
    deleted_at: '2026-01-02T00:00:00.000Z',
  }
  const item = rowToItem(row)
  assert.equal(item.deleted, true)
  assert.equal(item.row, null)
  assert.equal(item.serverAt, Date.parse('2026-01-02T00:00:00.000Z'))
})

test('itemToRow derives scope from the store and never sends updated_at', () => {
  const item = { key: 's1', row: { id: 's1', duration: 60 }, deleted: false }
  const row = itemToRow(item, STORES.sessions, 'user-1')

  assert.equal(row.user_id, 'user-1')
  assert.equal(row.row_key, 's1')
  assert.equal(row.scope, SCOPES.workouts)
  assert.deepEqual(row.data, { id: 's1', duration: 60 })
  assert.equal(row.deleted_at, null)
  assert.ok(!('updated_at' in row), 'the server stamps updated_at, the client never sends it')
})

test('itemToRow derives scope per store, e.g. water is nutrition', () => {
  const row = itemToRow({ key: '2026-01-01', row: { ml: 500 }, deleted: false }, STORES.water, 'user-1')
  assert.equal(row.scope, SCOPES.nutrition)
})

test('itemToRow marks a deletion and drops the payload', () => {
  const item = { key: 's1', row: null, deleted: true }
  const row = itemToRow(item, STORES.sessions, 'user-1')

  assert.equal(row.data, null)
  assert.ok(row.deleted_at, 'a deletion must set deleted_at')
})

test('chunkForPush splits large batches, keeping the remainder', () => {
  const items = Array.from({ length: 5 }, (_, i) => i)
  assert.deepEqual(chunkForPush(items, 2), [[0, 1], [2, 3], [4]])
})

test('chunkForPush is a no-op under the batch size', () => {
  assert.deepEqual(chunkForPush([1, 2], 500), [[1, 2]])
})

test('the supabase backend exposes the same method shape as the memory backend', () => {
  const memory = createMemoryBackend()
  const supabase = createSupabaseBackend()

  for (const key of ['push', 'pull']) {
    assert.equal(typeof memory[key], 'function', `memory backend is missing ${key}`)
    assert.equal(typeof supabase[key], 'function', `supabase backend is missing ${key}`)
  }
})
