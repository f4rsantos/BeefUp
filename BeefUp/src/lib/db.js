const DB_NAME = 'beefup'
const DB_VERSION = 5

const STORES = {
  workouts: 'workouts',       // custom workout definitions
  plans: 'plans',             // training plans
  sessions: 'sessions',       // completed workout sessions
  steps: 'steps',             // daily step entries { date, count }
  settings: 'settings',       // key/value app settings
  measurements: 'measurements', // body measurement entries { id, date, weight }
  foods: 'foods',             // custom/cached food items { id, name, namePt, kcal, protein, carbs, fat, serving }
  foodLog: 'foodLog',         // diary entries { id, date, meal, name, qty, kcal, protein, carbs, fat }
  water: 'water',             // daily water { date, ml }
  clients: 'clients',
  customExercises: 'customExercises'
}

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

export const db = {
  // Generic get all
  getAll: (store) => tx(store, 'readonly', s => s.getAll()),

  // Generic get by key
  get: (store, key) => tx(store, 'readonly', s => s.get(key)),

  // Generic put
  put: (store, value) => tx(store, 'readwrite', s => s.put(value)),

  // Generic delete
  remove: (store, key) => tx(store, 'readwrite', s => s.delete(key)),

  // When restoring a backup replaces the current data 
  clear: (store) => tx(store, 'readwrite', s => s.clear()),

  // Settings helpers
  getSetting: async (key, fallback = null) => {
    const row = await tx(STORES.settings, 'readonly', s => s.get(key))
    return row ? row.value : fallback
  },
  setSetting: (key, value) => tx(STORES.settings, 'readwrite', s => s.put({ key, value })),

  // Steps helpers
  getSteps: (date) => tx(STORES.steps, 'readonly', s => s.get(date)),
  setSteps: (date, count) => tx(STORES.steps, 'readwrite', s => s.put({ date, count })),
  getAllSteps: () => tx(STORES.steps, 'readonly', s => s.getAll()),

  // Sessions helpers
  addSession: (session) => tx(STORES.sessions, 'readwrite', s => s.put(session)),
  getAllSessions: () => tx(STORES.sessions, 'readonly', s => s.getAll()),
  getSessionsByMonth: async (year, month) => {
    const all = await tx(STORES.sessions, 'readonly', s => s.getAll())
    return all.filter(s => {
      const d = new Date(s.date)
      return d.getFullYear() === year && d.getMonth() === month
    })
  },

  // Measurements helpers
  addMeasurement: (entry) => tx(STORES.measurements, 'readwrite', s => s.put(entry)),
  getAllMeasurements: () => tx(STORES.measurements, 'readonly', s => s.getAll()),
  deleteMeasurement: (id) => tx(STORES.measurements, 'readwrite', s => s.delete(id)),

  // Custom foods helpers
  saveFood: (food) => tx(STORES.foods, 'readwrite', s => s.put(food)),
  getAllFoods: () => tx(STORES.foods, 'readonly', s => s.getAll()),
  removeFood: (id) => tx(STORES.foods, 'readwrite', s => s.delete(id)),

  // Food log (diary) helpers
  addFoodLog: (entry) => tx(STORES.foodLog, 'readwrite', s => s.put(entry)),
  removeFoodLog: (id) => tx(STORES.foodLog, 'readwrite', s => s.delete(id)),
  getAllFoodLog: () => tx(STORES.foodLog, 'readonly', s => s.getAll()),

  // Water helpers
  setWater: (date, ml) => tx(STORES.water, 'readwrite', s => s.put({ date, ml })),
  getAllWater: () => tx(STORES.water, 'readonly', s => s.getAll()),

  getAllClients: () => tx(STORES.clients, 'readonly', s => s.getAll()),
  saveClient: (client) => tx(STORES.clients, 'readwrite', s => s.put(client)),
  removeClient: (id) => tx(STORES.clients, 'readwrite', s => s.delete(id)),

  // Custom exercises helpers
  saveCustomExercise: (exercise) => tx(STORES.customExercises, 'readwrite', s => s.put(exercise)),
  getAllCustomExercises: () => tx(STORES.customExercises, 'readonly', s => s.getAll()),
  removeCustomExercise: (id) => tx(STORES.customExercises, 'readwrite', s => s.delete(id)),
}
