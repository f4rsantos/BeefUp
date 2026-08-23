import { isDirty, isDeleted, stampFromRemote } from './meta.js'

// Pure decisions, no IndexedDB. Everything here is unit-testable in node.

export const TOMBSTONE_GRACE_MS = 30 * 24 * 60 * 60 * 1000

// Pull runs before push (engine.js), so a remote change always gets a
// chance to land before this device's own dirty row could push over it.
//
// A deletion always wins over a concurrent local edit, full stop: even a
// dirty local row loses to a remote tombstone. Resurrecting a row the other
// side deleted is worse than losing one local edit, and for prescribed rows
// (a trainer un-prescribing a workout) the trainer is the authority anyway.
// Short of that, a dirty local row keeps priority — it has not been pushed
// yet, so nothing has "won" on the server. A row we have never touched just
// takes the remote copy.
export function resolveRow(local, remoteRow) {
  if (isDeleted(remoteRow)) return 'take-remote'
  return isDirty(local) ? 'keep-local' : 'take-remote'
}

export function mergeStore(localRows, remoteRows, keyField) {
  const localByKey = new Map(localRows.map((r) => [r[keyField], r]))
  const writes = []
  let kept = 0

  for (const { row, serverAt } of remoteRows) {
    const key = row[keyField]
    const decision = resolveRow(localByKey.get(key), row)
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
