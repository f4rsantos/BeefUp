import { db } from '../db.js'
import { SCOPES, keyFieldOf, storesForScopes } from './stores.js'
import { stampSynced, stampFromRemote, isDeleted, stripMeta } from './meta.js'
import { mergeStore, pendingPush, purgeableKeys } from './merge.js'

// Backend contract, so Supabase can drop in without touching this file:
//
//   pull(store, sinceMs) -> { items: [{ key, row, serverAt, deleted }], serverNow }
//   push(store, items)   -> { acked: [{ key, serverAt }], serverNow }
//     items: [{ key, row, deleted }]

const CURSOR_PREFIX = 'sync:cursor:'

export function cursorKey(store) {
  return CURSOR_PREFIX + store
}

async function readCursor(store) {
  return db.getSetting(cursorKey(store), 0)
}

async function writeCursor(store, serverNow) {
  if (serverNow) await db.setSetting(cursorKey(store), serverNow)
}

function toPushItem(row, keyField) {
  const key = row[keyField]
  if (isDeleted(row)) return { key, row: null, deleted: true }
  return { key, row: stripMeta(row), deleted: false }
}

// Remote deletions arrive as tombstones so a later pull cannot resurrect them.
// The key comes from item.key, never the payload: a deletion carries no row.
function toLocalRow(item, keyField) {
  const base = item.deleted ? { _deletedAt: item.serverAt } : { ...item.row }
  return stampFromRemote({ ...base, [keyField]: item.key }, item.serverAt)
}

export async function syncStore(backend, store) {
  const keyField = keyFieldOf(store)
  let serverNow = 0

  const local = await db.rawAll(store)
  const outgoing = pendingPush(local).map((r) => toPushItem(r, keyField))

  if (outgoing.length) {
    const res = await backend.push(store, outgoing)
    serverNow = res.serverNow || serverNow
    const byKey = new Map(local.map((r) => [r[keyField], r]))
    for (const ack of res.acked || []) {
      const row = byKey.get(ack.key)
      if (row) await db.rawPut(store, stampSynced(row, ack.serverAt))
    }
  }

  const since = await readCursor(store)
  const res = await backend.pull(store, since)
  serverNow = res.serverNow || serverNow

  const remote = (res.items || []).map((item) => ({ row: toLocalRow(item, keyField), serverAt: item.serverAt }))
  const fresh = await db.rawAll(store)
  const { writes, kept } = mergeStore(fresh, remote, keyField)
  for (const row of writes) await db.rawPut(store, row)

  await writeCursor(store, serverNow)
  return { pushed: outgoing.length, pulled: writes.length, kept }
}

export async function purgeStore(store, { linked, now = Date.now() } = {}) {
  const keyField = keyFieldOf(store)
  const rows = await db.rawAll(store)
  const keys = purgeableKeys(rows, keyField, { linked, now })
  for (const key of keys) await db.rawDelete(store, key)
  return keys.length
}

export async function syncAll(backend, { scopes = [] } = {}) {
  const stores = storesForScopes(scopes)
  const report = {}
  for (const store of stores) {
    report[store] = await syncStore(backend, store)
    await purgeStore(store, { linked: true })
  }
  return report
}

// Nothing was ever uploaded, so a deletion made while unlinked is local-only.
export async function purgeAllUnlinked() {
  const stores = storesForScopes(Object.values(SCOPES))
  let total = 0
  for (const store of stores) total += await purgeStore(store, { linked: false })
  return total
}
