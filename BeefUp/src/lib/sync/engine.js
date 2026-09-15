import { STORES } from '../stores.js'
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
//   identity()           -> { projectRef, userId }, checked against sync:owner below

export { cursorKey }

// Lives here (not stores.js) because it needs db.rawDelete, and stores.js
// must stay importable from db.js without pulling the engine back in.
export async function clearAllCursors() {
  const stores = storesForScopes(Object.values(SCOPES))
  for (const store of stores) await db.rawDelete(STORES.settings, cursorKey(store))
}

// Local-only guard: a device's rows belong to one Supabase project/user at a
// time. Without this, a stale cursor or a missed reset could push one
// trainer's data straight into another's project, silently.
const OWNER_KEY = 'sync:owner'

async function assertOwnerMatches(identity) {
  const owner = await db.getSetting(OWNER_KEY, null)
  if (!owner) return
  if (owner.projectRef !== identity.projectRef || owner.userId !== identity.userId) {
    throw new Error(
      `sync: refusing to sync — local data belongs to ${owner.projectRef}/${owner.userId}, ` +
      `backend identity is ${identity.projectRef}/${identity.userId}. Call switchSupabaseProject() first.`
    )
  }
}

async function recordOwnerOnce(identity) {
  const owner = await db.getSetting(OWNER_KEY, null)
  if (!owner) await db.setSetting(OWNER_KEY, identity)
}

export async function clearSyncOwner() {
  await db.setSetting(OWNER_KEY, null)
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

  // Pull before push — trainer deletion must win over concurrent local edit.
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

  // Cursor from pull-time only: prevents losing rows committed during our push.
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
  const identity = await backend.identity()
  await assertOwnerMatches(identity)

  const report = {}
  for (const store of stores) {
    report[store] = await syncStore(backend, store)
    await purgeStore(store, { linked: true })
  }

  // Only after a clean pass — a thrown error must not stamp a new owner.
  await recordOwnerOnce(identity)
  return report
}

// Nothing was ever uploaded, so a deletion made while unlinked is local-only.
export async function purgeAllUnlinked() {
  const stores = storesForScopes(Object.values(SCOPES))
  let total = 0
  for (const store of stores) total += await purgeStore(store, { linked: false })
  return total
}
