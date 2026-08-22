// Store names live here so db.js and the sync layer can both import them
// without forming a cycle. db.js re-exports STORES for existing callers.
export const STORES = {
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
