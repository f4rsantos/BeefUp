import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { db, STORES } from '../lib/db'
import { getLS, setLS } from '../lib/crypto'
import { todayISO } from '../lib/planUtils'
import { LEGACY_TYPE_MAP } from '../lib/measureTypes'
import { DEFAULT_STATS_LAYOUT, resolveStatsLayout, STATS_LAYOUT_VERSION } from '../lib/statsLayout'
import { applyCustomAccent } from '../lib/colorTheme'
import { registerCustomExercises } from '../lib/exerciseTree'
import strings from '../strings'

const AppContext = createContext(null)

function upsertById(list, item) {
  const idx = list.findIndex((x) => x.id === item.id)
  if (idx >= 0) {
    const next = [...list]
    next[idx] = item
    return next
  }
  return [...list, item]
}

function removeById(list, id) {
  return list.filter((item) => item.id !== id)
}

const DEFAULT_MEAL_TYPES = [
  { id: 'breakfast', icon: 'coffee' },
  { id: 'morningSnack', icon: 'cookie' },
  { id: 'lunch', icon: 'sun' },
  { id: 'afternoonSnack', icon: 'apple' },
  { id: 'dinner', icon: 'moon' },
]

export function AppProvider({ children }) {
  const [theme, setThemeState] = useState(() => getLS('theme', 'system'))
  const [fontScale, setFontScaleState] = useState(() => getLS('fontScale', 'medium'))
  const [accentColor, setAccentColorState] = useState(() => getLS('accentColor', 'green'))
  const [customAccentHex, setCustomAccentHexState] = useState(() => getLS('customAccentHex', '#109a14'))
  const [lang, setLangState] = useState(() => getLS('lang', 'pt'))
  const [onboarded, setOnboardedState] = useState(() => getLS('onboarded', false))
  const [joinedAt, setJoinedAtState] = useState(() => getLS('joinedAt', null))
  const [activePlanSince, setActivePlanSinceState] = useState(() => getLS('activePlanSince', null))
  const [appMode, setAppModeState] = useState(() => getLS('appMode', 'solo'))
  const [focus, setFocusState] = useState(() => getLS('focus', 'both'))
  const [sectionPrefs, setSectionPrefsState] = useState(() =>
    getLS('sectionPrefs', { gym: focus !== 'nutrition', nutrition: focus !== 'gym' }),
  )
  const [plans, setPlans] = useState([])
  const [workouts, setWorkouts] = useState([])
  const [sessions, setSessions] = useState([])
  const [stepsMap, setStepsMap] = useState({})
  const [measurements, setMeasurements] = useState([])
  const [activePlanId, setActivePlanId] = useState(null)
  const [statsLayout, setStatsLayoutState] = useState(() =>
    resolveStatsLayout(getLS('statsLayout', DEFAULT_STATS_LAYOUT), getLS('statsLayoutVersion', 1)),
  )
  const [favouriteExercises, setFavouriteExercises] = useState(() => getLS('favExercises', []))
  const [favouriteFoods, setFavouriteFoods] = useState(() => getLS('favFoods', []))
  const [activeWorkout, setActiveWorkout] = useState(null) // null = not in session
  const [clients, setClients] = useState([])

  // Nutrition
  const [foodLog, setFoodLog] = useState([])
  const [customFoods, setCustomFoods] = useState([])
  const [customExercises, setCustomExercises] = useState([])
  const customExercisesRef = useRef([])
  const [waterMap, setWaterMap] = useState({}) // { date: ml }
  const [nutritionGoals, setNutritionGoalsState] = useState(() =>
    getLS('nutritionGoals', { kcal: 2200, protein: 150, carbs: 220, fat: 70, waterMl: 2500 }),
  )
  const [mealTypes, setMealTypesState] = useState(() => getLS('mealTypes', DEFAULT_MEAL_TYPES))

  const t = strings[lang] || strings.pt

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    setLS('theme', theme)
  }, [theme])

  const setTheme = useCallback((v) => setThemeState(v), [])

  useEffect(() => {
    document.documentElement.setAttribute('data-font-scale', fontScale)
    setLS('fontScale', fontScale)
  }, [fontScale])

  const setFontScale = useCallback((v) => setFontScaleState(v), [])

  useEffect(() => {
    if (accentColor === 'custom') applyCustomAccent(customAccentHex)
    else if (accentColor === 'green') document.documentElement.removeAttribute('data-accent')
    else document.documentElement.setAttribute('data-accent', accentColor)
    setLS('accentColor', accentColor)
  }, [accentColor, customAccentHex])

  const setAccentColor = useCallback((v) => setAccentColorState(v), [])

  const setCustomAccentColor = useCallback((hex) => {
    setLS('customAccentHex', hex)
    setCustomAccentHexState(hex)
    setAccentColorState('custom')
  }, [])

  const completeOnboarding = useCallback(({ mode, focus }) => {
    setLS('appMode', mode); setAppModeState(mode)
    if (focus) { setLS('focus', focus); setFocusState(focus) }
    setLS('onboarded', true); setOnboardedState(true)
    const joined = todayISO()
    setLS('joinedAt', joined); setJoinedAtState(joined)
  }, [])

  const setSectionPrefs = useCallback((next) => {
    setSectionPrefsState(next)
    setLS('sectionPrefs', next)
  }, [])

  const setMealTypes = useCallback((next) => {
    setMealTypesState(next)
    setLS('mealTypes', next)
  }, [])

  // Lang
  const setLang = useCallback((v) => {
    setLangState(v)
    setLS('lang', v)
  }, [])

  // Load from DB
  useEffect(() => {
    async function load() {
      const [p, w, s, allSteps, apid, allMeasurements, log, foods, water, cli, customEx] = await Promise.all([
        db.getAll(STORES.plans),
        db.getAll(STORES.workouts),
        db.getAllSessions(),
        db.getAllSteps(),
        db.getSetting('activePlanId', null),
        db.getAllMeasurements(),
        db.getAllFoodLog(),
        db.getAllFoods(),
        db.getAllWater(),
        db.getAllClients(),
        db.getAllCustomExercises(),
      ])
      setPlans(p)
      setWorkouts(w)
      setSessions(s)
      setActivePlanId(apid)
      const map = {}
      allSteps.forEach(e => { map[e.date] = e.count })
      setStepsMap(map)
      setFoodLog(log)
      setCustomFoods(foods)
      setCustomExercises(customEx)
      customExercisesRef.current = customEx
      registerCustomExercises(customEx)
      const wmap = {}
      water.forEach(e => { wmap[e.date] = e.ml })
      setWaterMap(wmap)
      setClients(cli)

      const migrated = allMeasurements.map(m => (
        LEGACY_TYPE_MAP[m.type] ? { ...m, type: LEGACY_TYPE_MAP[m.type] } : m
      ))
      migrated.forEach((m, i) => {
        if (m.type !== allMeasurements[i].type) {
          db.addMeasurement(m).catch(err => console.error('measurement migration failed', err))
        }
      })
      setMeasurements(migrated)
    }
    load()
  }, [])

  // Plans CRUD
  const savePlan = useCallback(async (plan) => {
    await db.put(STORES.plans, plan)
    setPlans(prev => upsertById(prev, plan))
  }, [])

  const deletePlan = useCallback(async (id) => {
    await db.remove(STORES.plans, id)
    setPlans(prev => removeById(prev, id))
  }, [])

  const setActivePlan = useCallback(async (id) => {
    await db.setSetting('activePlanId', id)
    setActivePlanId(id)
    const since = todayISO()
    setLS('activePlanSince', since)
    setActivePlanSinceState(since)
  }, [])

  // Workouts CRUD
  const saveWorkout = useCallback(async (workout) => {
    await db.put(STORES.workouts, workout)
    setWorkouts(prev => upsertById(prev, workout))
  }, [])

  const deleteWorkout = useCallback(async (id) => {
    await db.remove(STORES.workouts, id)
    setWorkouts(prev => removeById(prev, id))
  }, [])

  // Sessions
  const addSession = useCallback(async (session) => {
    await db.addSession(session)
    setSessions(prev => [...prev, session])
  }, [])

  // Steps
  const saveSteps = useCallback(async (date, count) => {
    await db.setSteps(date, count)
    setStepsMap(prev => ({ ...prev, [date]: count }))
  }, [])

  const addMeasurement = useCallback(async (entry) => {
    await db.addMeasurement(entry)
    setMeasurements(prev => [...prev, entry])
  }, [])

  const deleteMeasurement = useCallback(async (id) => {
    await db.deleteMeasurement(id)
    setMeasurements(prev => removeById(prev, id))
  }, [])

  const setStatsLayout = useCallback((layout) => {
    setStatsLayoutState(layout)
    setLS('statsLayout', layout)
    // Stamp the version so this order survives the next boot.
    setLS('statsLayoutVersion', STATS_LAYOUT_VERSION)
  }, [])

  // Nutrition: food log
  const addFoodLog = useCallback(async (entry) => {
    await db.addFoodLog(entry)
    setFoodLog(prev => [...prev, entry])
  }, [])

  const deleteFoodLog = useCallback(async (id) => {
    await db.removeFoodLog(id)
    setFoodLog(prev => removeById(prev, id))
  }, [])

  const saveCustomFood = useCallback(async (food) => {
    await db.saveFood(food)
    setCustomFoods(prev => upsertById(prev, food))
  }, [])

  const saveCustomExercise = useCallback(async (exercise) => {
    await db.saveCustomExercise(exercise)
    const next = upsertById(customExercisesRef.current, exercise)
    customExercisesRef.current = next
    registerCustomExercises(next)
    setCustomExercises(next)
  }, [])

  const setWaterToday = useCallback(async (date, ml) => {
    await db.setWater(date, ml)
    setWaterMap(prev => ({ ...prev, [date]: ml }))
  }, [])

  const setNutritionGoals = useCallback((goals) => {
    setNutritionGoalsState(goals)
    setLS('nutritionGoals', goals)
  }, [])

  const saveClient = useCallback(async (client) => {
    await db.saveClient(client)
    setClients(prev => upsertById(prev, client))
  }, [])

  const deleteClient = useCallback(async (id) => {
    await db.removeClient(id)
    setClients(prev => removeById(prev, id))
  }, [])

  // Favourites
  const toggleFavouriteExercise = useCallback((id) => {
    setFavouriteExercises(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      setLS('favExercises', next)
      return next
    })
  }, [])

  const toggleFavouriteFood = useCallback((id) => {
    setFavouriteFoods(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      setLS('favFoods', next)
      return next
    })
  }, [])

  const deleteSession = useCallback(async (sessionId) => {
    await db.remove(STORES.sessions, sessionId)
    setSessions(prev => removeById(prev, sessionId))
  }, [])

  const value = {
    theme, setTheme,
    fontScale, setFontScale,
    accentColor, setAccentColor, customAccentHex, setCustomAccentColor,
    lang, setLang,
    t,
    onboarded, appMode, focus, completeOnboarding, joinedAt, activePlanSince,
    sectionPrefs, setSectionPrefs,
    mealTypes, setMealTypes,
    plans, savePlan, deletePlan, activePlanId, setActivePlan,
    workouts, saveWorkout, deleteWorkout,
    sessions, addSession, deleteSession,
    stepsMap, saveSteps,
    measurements, addMeasurement, deleteMeasurement,
    statsLayout, setStatsLayout,
    favouriteExercises, toggleFavouriteExercise,
    activeWorkout, setActiveWorkout,
    foodLog, addFoodLog, deleteFoodLog,
    customFoods, saveCustomFood,
    customExercises, saveCustomExercise,
    favouriteFoods, toggleFavouriteFood,
    waterMap, setWaterToday,
    nutritionGoals, setNutritionGoals,
    clients, saveClient, deleteClient,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
