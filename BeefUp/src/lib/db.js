const DB_NAME = 'beefup'
const DB_VERSION = 4

const STORES = {
  workouts: 'workouts',       // custom workout definitions
  plans: 'plans',             // training plans
  sessions: 'sessions',       // completed workout sessions
  steps: 'steps',             // daily step entries { date, count }
  settings: 'settings',       // key/value app settings
  measurements: 'measurements', // body measurement entries { id, date, weight }
}

export { STORES }

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = e => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORES.workouts)) {
        db.createObjectStore(STORES.workouts, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORES.plans)) {
        db.createObjectStore(STORES.plans, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORES.sessions)) {
        const s = db.createObjectStore(STORES.sessions, { keyPath: 'id' })
        s.createIndex('date', 'date', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORES.steps)) {
        const s = db.createObjectStore(STORES.steps, { keyPath: 'date' })
        s.createIndex('date', 'date', { unique: true })
      }
      if (!db.objectStoreNames.contains(STORES.settings)) {
        db.createObjectStore(STORES.settings, { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains(STORES.measurements)) {
        const m = db.createObjectStore(STORES.measurements, { keyPath: 'id' })
        m.createIndex('date', 'date', { unique: false })
      }
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
}
