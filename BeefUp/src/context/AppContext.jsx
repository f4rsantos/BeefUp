import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { db, STORES } from '../lib/db'
import { getLS, setLS } from '../lib/crypto'
import strings from '../strings'

const AppContext = createContext(null)

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
  const [pbConfig, setPbConfig] = useState(() => getLS('pbConfig', ['steps', null, null]))
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
      setMeasurements(allMeasurements)
      setFoodLog(log)
      setCustomFoods(foods)
      const wmap = {}
      water.forEach(e => { wmap[e.date] = e.ml })
      setWaterMap(wmap)
      setClients(cli)
    }
    load()
  }, [])

  // Plans CRUD
  const savePlan = useCallback(async (plan) => {
    await db.put(STORES.plans, plan)
    setPlans(prev => {
      const idx = prev.findIndex(p => p.id === plan.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = plan; return n }
      return [...prev, plan]
    })
  }, [])

  const deletePlan = useCallback(async (id) => {
    await db.remove(STORES.plans, id)
    setPlans(prev => prev.filter(p => p.id !== id))
  }, [])

  const setActivePlan = useCallback(async (id) => {
    await db.setSetting('activePlanId', id)
    setActivePlanId(id)
  }, [])

  // Workouts CRUD
  const saveWorkout = useCallback(async (workout) => {
    await db.put(STORES.workouts, workout)
    setWorkouts(prev => {
      const idx = prev.findIndex(w => w.id === workout.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = workout; return n }
      return [...prev, workout]
    })
  }, [])

  const deleteWorkout = useCallback(async (id) => {
    await db.remove(STORES.workouts, id)
    setWorkouts(prev => prev.filter(w => w.id !== id))
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

  // PBs
  const savePbConfig = useCallback((config) => {
    setPbConfig(config)
    setLS('pbConfig', config)
  }, [])

  // Nutrition: food log
  const addFoodLog = useCallback(async (entry) => {
    await db.addFoodLog(entry)
    setFoodLog(prev => [...prev, entry])
  }, [])

  const deleteFoodLog = useCallback(async (id) => {
    await db.removeFoodLog(id)
    setFoodLog(prev => prev.filter(e => e.id !== id))
  }, [])

  const saveCustomFood = useCallback(async (food) => {
    await db.saveFood(food)
    setCustomFoods(prev => {
      const idx = prev.findIndex(f => f.id === food.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = food; return n }
      return [...prev, food]
    })
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
    setClients(prev => {
      const idx = prev.findIndex(c => c.id === client.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = client; return n }
      return [...prev, client]
    })
  }, [])

  const deleteClient = useCallback(async (id) => {
    await db.removeClient(id)
    setClients(prev => prev.filter(c => c.id !== id))
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
    setSessions(prev => prev.filter(s => s.id !== sessionId))
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
    measurements, addMeasurement,
    pbConfig, savePbConfig,
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
