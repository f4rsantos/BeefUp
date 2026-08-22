// Sync bookkeeping lives on `_`-prefixed fields so it never collides with
// app data and can be stripped in one pass before leaving the device.
//
//   _updatedAt  local write time, orders local edits only
//   _dirty      written locally, not yet pushed
//   _deletedAt  tombstone; row stays until purged
//   _serverAt   server's updated_at at last pull, the trusted clock

export const META_FIELDS = ['_updatedAt', '_dirty', '_deletedAt', '_serverAt']

export function stampLocal(row, now = Date.now()) {
  return { ...row, _updatedAt: now, _dirty: true, _deletedAt: undefined }
}

export function stampDeleted(row, now = Date.now()) {
  return { ...row, _updatedAt: now, _dirty: true, _deletedAt: now }
}

export function stampFromRemote(row, serverAt) {
  return { ...row, _updatedAt: serverAt, _dirty: false, _serverAt: serverAt }
}

export function stampSynced(row, serverAt) {
  return { ...row, _dirty: false, _serverAt: serverAt }
}

export function isDeleted(row) {
  return !!row?._deletedAt
}

export function isDirty(row) {
  return !!row?._dirty
}

// Strip metadata before sending upstream or handing rows to the UI.
export function stripMeta(row) {
  if (!row) return row
  const out = { ...row }
  for (const f of META_FIELDS) delete out[f]
  return out
}
