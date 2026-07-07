import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { db, STORES } from '../lib/db'
import { getLS, setLS } from '../lib/crypto'
import strings from '../strings'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [theme, setThemeState] = useState(() => getLS('theme', 'system'))
  const [lang, setLangState] = useState(() => getLS('lang', 'pt'))
  const [plans, setPlans] = useState([])
  const [workouts, setWorkouts] = useState([])
  const [sessions, setSessions] = useState([])
  const [stepsMap, setStepsMap] = useState({})
  const [measurements, setMeasurements] = useState([])
  const [activePlanId, setActivePlanId] = useState(null)
  const [pbConfig, setPbConfig] = useState(() => getLS('pbConfig', ['steps', null, null]))
  const [favouriteExercises, setFavouriteExercises] = useState(() => getLS('favExercises', []))
  const [activeWorkout, setActiveWorkout] = useState(null) // null = not in session

  const t = strings[lang] || strings.pt

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    setLS('theme', theme)
  }, [theme])

  const setTheme = useCallback((v) => setThemeState(v), [])

  // Lang
  const setLang = useCallback((v) => {
    setLangState(v)
    setLS('lang', v)
  }, [])

  // Load from DB
  useEffect(() => {
    async function load() {
      const [p, w, s, allSteps, apid, allMeasurements] = await Promise.all([
        db.getAll(STORES.plans),
        db.getAll(STORES.workouts),
        db.getAllSessions(),
        db.getAllSteps(),
        db.getSetting('activePlanId', null),
        db.getAllMeasurements(),
      ])
      setPlans(p)
      setWorkouts(w)
      setSessions(s)
      setActivePlanId(apid)
      const map = {}
      allSteps.forEach(e => { map[e.date] = e.count })
      setStepsMap(map)
      setMeasurements(allMeasurements)
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
    plans, savePlan, deletePlan, activePlanId, setActivePlan,
    workouts, saveWorkout, deleteWorkout,
    sessions, addSession, deleteSession,
    stepsMap, saveSteps,
    measurements, addMeasurement,
    pbConfig, savePbConfig,
    favouriteExercises, toggleFavouriteExercise,
    activeWorkout, setActiveWorkout,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
