import { isDirty, isDeleted, stampFromRemote } from './meta.js'

// Pure decisions, no IndexedDB. Everything here is unit-testable in node.

export const TOMBSTONE_GRACE_MS = 30 * 24 * 60 * 60 * 1000

// Push runs before pull, so a dirty row has already won on the server by the
// time we pull. Keeping it locally just avoids clobbering it mid-flight.
// A row we have never seen is not dirty, so it takes the remote copy.
export function resolveRow(local) {
  return isDirty(local) ? 'keep-local' : 'take-remote'
}

export function mergeStore(localRows, remoteRows, keyField) {
  const localByKey = new Map(localRows.map((r) => [r[keyField], r]))
  const writes = []
  let kept = 0

  for (const { row, serverAt } of remoteRows) {
    const key = row[keyField]
    const decision = resolveRow(localByKey.get(key))
    if (decision === 'take-remote') writes.push(stampFromRemote(row, serverAt))
    else kept++
  }

  return { writes, kept }
}

export function pendingPush(rows) {
  return rows.filter(isDirty)
}

// Unlinked devices have no server to tell, so tombstones go right away.
// Linked ones keep them until the deletion has been pushed and aged out.
export function purgeableKeys(rows, keyField, { linked, now = Date.now(), graceMs = TOMBSTONE_GRACE_MS } = {}) {
  return rows
    .filter((r) => {
      if (!isDeleted(r)) return false
      if (!linked) return true
      return !isDirty(r) && now - r._deletedAt > graceMs
    })
    .map((r) => r[keyField])
}
