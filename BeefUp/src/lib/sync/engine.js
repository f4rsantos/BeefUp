import { db } from '../db.js'
import { SCOPES, cursorKey, keyFieldOf, storesForScopes } from './stores.js'
import { stampSynced, stampFromRemote, isDeleted, stripMeta } from './meta.js'
import { mergeStore, pendingPush, purgeableKeys } from './merge.js'

// Backend contract, so Supabase can drop in without touching this file:
//
//   pull(store, sinceMs) -> { items: [{ key, row, serverAt, deleted }], serverNow }
//   push(store, items)   -> { acked: [{ key, serverAt }] }
//     items: [{ key, row, deleted }]
//     push needs no serverNow of its own: acks are only used to stamp rows
//     synced, the cursor advances from pull's serverNow alone (see below).

export { cursorKey }

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

  // Pull before push: a remote change (including a deletion) must land on
  // this device before a dirty local row gets a chance to push over it. The
  // other order lets an unrelated local edit resurrect a row the trainer
  // just deleted, by upserting deleted_at back to null before the tombstone
  // is ever seen.
  const since = await readCursor(store)
  const pullRes = await backend.pull(store, since)
  const remote = (pullRes.items || []).map((item) => ({ row: toLocalRow(item, keyField), serverAt: item.serverAt }))
  const beforeMerge = await db.rawAll(store)
  const { writes, kept } = mergeStore(beforeMerge, remote, keyField)
  for (const row of writes) await db.rawPut(store, row)

  const local = await db.rawAll(store)
  const outgoing = pendingPush(local).map((r) => toPushItem(r, keyField))
  let pushed = 0

  if (outgoing.length) {
    const res = await backend.push(store, outgoing)
    pushed = outgoing.length
    const byKey = new Map(local.map((r) => [r[keyField], r]))
    for (const ack of res.acked || []) {
      const row = byKey.get(ack.key)
      if (row) await db.rawPut(store, stampSynced(row, ack.serverAt))
    }
  }

  // The cursor advances to this round's PULL time only, never to a push
  // ack's later timestamp, even though that means an immediate next sync
  // may re-pull a row this round just pushed (harmless: it is not dirty
  // any more, so it merges back to identical data). The alternative is
  // unsafe: another device can commit a row between the moment pull reads
  // the clock and the moment our push lands. If the cursor jumped forward
  // to cover our own push, that row's updated_at would sit behind the new
  // cursor and never be pulled again — silent, permanent data loss. Losing
  // nothing is worth re-fetching one row once.
  await writeCursor(store, pullRes.serverNow)
  return { pushed, pulled: writes.length, kept }
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
