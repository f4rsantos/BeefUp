import { STORES } from './stores.js'
import { isSynced, keyFieldOf } from './sync/stores.js'
import { stampLocal, stampDeleted, stripMeta, isDeleted } from './sync/meta.js'

const DB_NAME = 'beefup'
const DB_VERSION = 5

export { STORES }

function ensureStore(db, name, options, indexes = []) {
  if (db.objectStoreNames.contains(name)) return
  const store = db.createObjectStore(name, options)
  indexes.forEach(([indexName, keyPath, indexOptions]) => store.createIndex(indexName, keyPath, indexOptions))
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = e => {
      const db = e.target.result
      ensureStore(db, STORES.workouts, { keyPath: 'id' })
      ensureStore(db, STORES.plans, { keyPath: 'id' })
      ensureStore(db, STORES.sessions, { keyPath: 'id' }, [['date', 'date', { unique: false }]])
      ensureStore(db, STORES.steps, { keyPath: 'date' }, [['date', 'date', { unique: true }]])
      ensureStore(db, STORES.settings, { keyPath: 'key' })
      ensureStore(db, STORES.measurements, { keyPath: 'id' }, [['date', 'date', { unique: false }]])
      ensureStore(db, STORES.foods, { keyPath: 'id' })
      ensureStore(db, STORES.foodLog, { keyPath: 'id' }, [['date', 'date', { unique: false }]])
      ensureStore(db, STORES.water, { keyPath: 'date' })
      ensureStore(db, STORES.clients, { keyPath: 'id' })
      ensureStore(db, STORES.customExercises, { keyPath: 'id' })
    }
    req.onsuccess = e => resolve(e.target.result)
    req.onerror = e => reject(e.target.error)
  })
}

async function tx(storeName, mode, fn) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)
    const req = fn(store)
    if (req) {
      req.onsuccess = e => resolve(e.target.result)
      req.onerror = e => reject(e.target.error)
    } else {
      transaction.oncomplete = () => resolve()
      transaction.onerror = e => reject(e.target.error)
    }
  })
}

function writeRow(store, value) {
  return tx(store, 'readwrite', s => s.put(isSynced(store) ? stampLocal(value) : value))
}

async function deleteRow(store, key) {
  if (!isSynced(store)) return tx(store, 'readwrite', s => s.delete(key))
  const tombstone = stampDeleted({ [keyFieldOf(store)]: key })
  return tx(store, 'readwrite', s => s.put(tombstone))
}

async function readAll(store) {
  const rows = await tx(store, 'readonly', s => s.getAll())
  if (!isSynced(store)) return rows
  return rows.filter(r => !isDeleted(r)).map(stripMeta)
}

async function readOne(store, key) {
  const row = await tx(store, 'readonly', s => s.get(key))
  if (!isSynced(store)) return row
  return isDeleted(row) ? undefined : stripMeta(row)
}

export const db = {
  // Generic get all
  getAll: (store) => readAll(store),

  // Generic get by key
  get: (store, key) => readOne(store, key),

  // Generic put
  put: (store, value) => writeRow(store, value),

  // Generic delete
  remove: (store, key) => deleteRow(store, key),

  // When restoring a backup replaces the current data
  clear: (store) => tx(store, 'readwrite', s => s.clear()),

  // Settings helpers
  getSetting: async (key, fallback = null) => {
    const row = await tx(STORES.settings, 'readonly', s => s.get(key))
    return row ? row.value : fallback
  },
  setSetting: (key, value) => tx(STORES.settings, 'readwrite', s => s.put({ key, value })),

  // Steps helpers
  getSteps: (date) => readOne(STORES.steps, date),
  setSteps: (date, count) => writeRow(STORES.steps, { date, count }),
  getAllSteps: () => readAll(STORES.steps),

  // Sessions helpers
  addSession: (session) => writeRow(STORES.sessions, session),
  getAllSessions: () => readAll(STORES.sessions),
  getSessionsByMonth: async (year, month) => {
    const all = await readAll(STORES.sessions)
    return all.filter(s => {
      const d = new Date(s.date)
      return d.getFullYear() === year && d.getMonth() === month
    })
  },

  // Measurements helpers
  addMeasurement: (entry) => writeRow(STORES.measurements, entry),
  getAllMeasurements: () => readAll(STORES.measurements),
  deleteMeasurement: (id) => deleteRow(STORES.measurements, id),

  // Custom foods helpers
  saveFood: (food) => writeRow(STORES.foods, food),
  getAllFoods: () => readAll(STORES.foods),
  removeFood: (id) => deleteRow(STORES.foods, id),

  // Food log (diary) helpers
  addFoodLog: (entry) => writeRow(STORES.foodLog, entry),
  removeFoodLog: (id) => deleteRow(STORES.foodLog, id),
  getAllFoodLog: () => readAll(STORES.foodLog),

  // Water helpers
  setWater: (date, ml) => writeRow(STORES.water, { date, ml }),
  getAllWater: () => readAll(STORES.water),

  getAllClients: () => readAll(STORES.clients),
  saveClient: (client) => writeRow(STORES.clients, client),
  removeClient: (id) => deleteRow(STORES.clients, id),

  // Custom exercises helpers
  saveCustomExercise: (exercise) => writeRow(STORES.customExercises, exercise),
  getAllCustomExercises: () => readAll(STORES.customExercises),
  removeCustomExercise: (id) => deleteRow(STORES.customExercises, id),
  rawAll: (store) => tx(store, 'readonly', s => s.getAll()),
  rawPut: (store, value) => tx(store, 'readwrite', s => s.put(value)),
  rawDelete: (store, key) => tx(store, 'readwrite', s => s.delete(key)),
}
