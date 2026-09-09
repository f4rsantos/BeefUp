import { STORES } from '../stores.js'

// What the student shares, toggled per area in settings.
export const SCOPES = {
  workouts: 'workouts',
  nutrition: 'nutrition',
  measures: 'measures',
}

// Only these stores leave the device. `settings` holds local prefs and
// `clients` is the trainer's own data, synced on the other side.
export const SYNCED_STORES = {
  [STORES.plans]: { key: 'id', scope: SCOPES.workouts },
  [STORES.workouts]: { key: 'id', scope: SCOPES.workouts },
  [STORES.sessions]: { key: 'id', scope: SCOPES.workouts },
  [STORES.customExercises]: { key: 'id', scope: SCOPES.workouts },
  [STORES.foodLog]: { key: 'id', scope: SCOPES.nutrition },
  [STORES.foods]: { key: 'id', scope: SCOPES.nutrition },
  [STORES.water]: { key: 'date', scope: SCOPES.nutrition },
  [STORES.measurements]: { key: 'id', scope: SCOPES.measures },
  [STORES.steps]: { key: 'date', scope: SCOPES.measures },
  [STORES.measureTypes]: { key: 'id', scope: SCOPES.measures },
}

export function isSynced(store) {
  return Object.prototype.hasOwnProperty.call(SYNCED_STORES, store)
}

// Lives here, not in engine.js, so db.js can clear a cursor without
// importing the engine (which imports db.js back).
const CURSOR_PREFIX = 'sync:cursor:'

export function cursorKey(store) {
  return CURSOR_PREFIX + store
}

export function keyFieldOf(store) {
  return SYNCED_STORES[store]?.key ?? 'id'
}

export function scopeOf(store) {
  return SYNCED_STORES[store]?.scope ?? null
}

export function storesForScopes(scopes) {
  const allowed = new Set(scopes)
  return Object.keys(SYNCED_STORES).filter((s) => allowed.has(scopeOf(s)))
}
