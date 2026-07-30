import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { db, STORES } from '../lib/db'
import { getLS, setLS } from '../lib/crypto'
import { LEGACY_TYPE_MAP } from '../lib/measureTypes'
import { DEFAULT_STATS_LAYOUT, normalizeStatsLayout } from '../lib/statsLayout'
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

export function AppProvider({ children }) {
  const [theme, setThemeState] = useState(() => getLS('theme', 'system'))
  const [lang, setLangState] = useState(() => getLS('lang', 'pt'))
  const [onboarded, setOnboardedState] = useState(() => getLS('onboarded', false))
  const [appMode, setAppModeState] = useState(() => getLS('appMode', 'solo'))
  const [focus, setFocusState] = useState(() => getLS('focus', 'both'))
  const [plans, setPlans] = useState([])
  const [workouts, setWorkouts] = useState([])
  const [sessions, setSessions] = useState([])
  const [stepsMap, setStepsMap] = useState({})
  const [measurements, setMeasurements] = useState([])
  const [activePlanId, setActivePlanId] = useState(null)
  const [statsLayout, setStatsLayoutState] = useState(() =>
    normalizeStatsLayout(getLS('statsLayout', DEFAULT_STATS_LAYOUT)),
  )
  const [favouriteExercises, setFavouriteExercises] = useState(() => getLS('favExercises', []))
  const [activeWorkout, setActiveWorkout] = useState(null) // null = not in session
  const [clients, setClients] = useState([])

  // Nutrition
  const [foodLog, setFoodLog] = useState([])
  const [customFoods, setCustomFoods] = useState([])
  const [waterMap, setWaterMap] = useState({}) // { date: ml }
  const [nutritionGoals, setNutritionGoalsState] = useState(() =>
    getLS('nutritionGoals', { kcal: 2200, protein: 150, carbs: 220, fat: 70, waterMl: 2500 }),
  )

  const t = strings[lang] || strings.pt

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    setLS('theme', theme)
  }, [theme])

  const setTheme = useCallback((v) => setThemeState(v), [])

  const completeOnboarding = useCallback(({ mode, focus }) => {
    setLS('appMode', mode); setAppModeState(mode)
    if (focus) { setLS('focus', focus); setFocusState(focus) }
    setLS('onboarded', true); setOnboardedState(true)
  }, [])

  const resetOnboarding = useCallback(() => {
    setLS('onboarded', false); setOnboardedState(false)
    setLS('appMode', 'solo'); setAppModeState('solo')
    setLS('focus', 'both'); setFocusState('both')
  }, [])

  // Lang
  const setLang = useCallback((v) => {
    setLangState(v)
    setLS('lang', v)
  }, [])

  // Load from DB
  useEffect(() => {
    async function load() {
      const [p, w, s, allSteps, apid, allMeasurements, log, foods, water, cli] = await Promise.all([
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

  const deleteSession = useCallback(async (sessionId) => {
    await db.remove(STORES.sessions, sessionId)
    setSessions(prev => removeById(prev, sessionId))
  }, [])

  const value = {
    theme, setTheme,
    lang, setLang,
    t,
    onboarded, appMode, focus, completeOnboarding, resetOnboarding,
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
