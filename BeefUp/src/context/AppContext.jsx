import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { db, STORES } from '../lib/db'
import { todayISO } from '../lib/planUtils'
import { getAllPrefs, migrateLegacyPrefs, setPref, PREF_DEFAULTS } from '../lib/prefs'
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

function pruneOrphanFoodIds(prev, knownIds, prefKey) {
  const kept = prev.filter((id) => knownIds.has(id))
  if (kept.length !== prev.length) setPref(prefKey, kept)
  return kept
}

// `focus` picks which sections exist; sectionPrefs is the user's later
// per-section toggle, seeded from focus the first time it is needed.
function sectionPrefsFor(focus) {
  return { gym: focus !== 'nutrition', nutrition: focus !== 'gym' }
}

const DEFAULT_MEAL_TYPES = [
  { id: 'breakfast', icon: 'coffee' },
  { id: 'morningSnack', icon: 'cookie' },
  { id: 'lunch', icon: 'sun' },
  { id: 'afternoonSnack', icon: 'apple' },
  { id: 'dinner', icon: 'moon' },
]

export function AppProvider({ children }) {
  // Prefs live in IndexedDB, which cannot be read synchronously, so they start
  // at their defaults and `hydrated` gates render until the real values land.
  const [hydrated, setHydrated] = useState(false)
  const [theme, setThemeState] = useState(PREF_DEFAULTS.theme)
  const [fontScale, setFontScaleState] = useState(PREF_DEFAULTS.fontScale)
  const [soundEnabled, setSoundEnabledState] = useState(PREF_DEFAULTS.soundEnabled)
  const [accentColor, setAccentColorState] = useState(PREF_DEFAULTS.accentColor)
  const [customAccentHex, setCustomAccentHexState] = useState(PREF_DEFAULTS.customAccentHex)
  const [lang, setLangState] = useState(PREF_DEFAULTS.lang)
  const [onboarded, setOnboardedState] = useState(PREF_DEFAULTS.onboarded)
  const [joinedAt, setJoinedAtState] = useState(PREF_DEFAULTS.joinedAt)
  const [activePlanSince, setActivePlanSinceState] = useState(PREF_DEFAULTS.activePlanSince)
  const [appMode, setAppModeState] = useState(PREF_DEFAULTS.appMode)
  const [focus, setFocusState] = useState(PREF_DEFAULTS.focus)
  const [sectionPrefs, setSectionPrefsState] = useState(() => sectionPrefsFor(PREF_DEFAULTS.focus))
  const [plans, setPlans] = useState([])
  const [workouts, setWorkouts] = useState([])
  const [sessions, setSessions] = useState([])
  const [stepsMap, setStepsMap] = useState({})
  const [measurements, setMeasurements] = useState([])
  const [activePlanId, setActivePlanId] = useState(null)
  const [statsLayout, setStatsLayoutState] = useState(DEFAULT_STATS_LAYOUT)
  const [favouriteExercises, setFavouriteExercises] = useState([])
  const [favouriteFoods, setFavouriteFoods] = useState([])
  const [recentFoodIds, setRecentFoodIds] = useState(PREF_DEFAULTS.recentFoods)
  const [activeWorkout, setActiveWorkoutState] = useState(null)
  const [clients, setClients] = useState([])

  // Nutrition
  const [foodLog, setFoodLog] = useState([])
  const [customFoods, setCustomFoods] = useState([])
  const [customExercises, setCustomExercises] = useState([])
  const customExercisesRef = useRef([])
  const [waterMap, setWaterMap] = useState({}) // { date: ml }
  const [nutritionGoals, setNutritionGoalsState] = useState(PREF_DEFAULTS.nutritionGoals)
  const [mealTypes, setMealTypesState] = useState(DEFAULT_MEAL_TYPES)

  const t = strings[lang] || strings.pt

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    // Before hydration `theme` is still the default, so persisting it would
    // overwrite the stored value with a placeholder.
    if (hydrated) setPref('theme', theme)
  }, [theme, hydrated])

  const setTheme = useCallback((v) => setThemeState(v), [])

  useEffect(() => {
    document.documentElement.setAttribute('data-font-scale', fontScale)
    if (hydrated) setPref('fontScale', fontScale)
  }, [fontScale, hydrated])

  const setFontScale = useCallback((v) => setFontScaleState(v), [])

  const setSoundEnabled = useCallback((v) => {
    setSoundEnabledState(v)
    setPref('soundEnabled', v)
  }, [])

  useEffect(() => {
    if (accentColor === 'custom') applyCustomAccent(customAccentHex)
    else if (accentColor === 'green') document.documentElement.removeAttribute('data-accent')
    else document.documentElement.setAttribute('data-accent', accentColor)
    if (hydrated) setPref('accentColor', accentColor)
  }, [accentColor, customAccentHex, hydrated])

  const setAccentColor = useCallback((v) => setAccentColorState(v), [])

  const setActiveWorkout = useCallback((v) => {
    setActiveWorkoutState(v)
    db.setSetting('activeWorkout', v)
  }, [])

  const setCustomAccentColor = useCallback((hex) => {
    setPref('customAccentHex', hex)
    setCustomAccentHexState(hex)
    setAccentColorState('custom')
  }, [])

  const completeOnboarding = useCallback(({ mode, focus }) => {
    setPref('appMode', mode); setAppModeState(mode)
    if (focus) {
      setPref('focus', focus); setFocusState(focus)
      // Keep sectionPrefs consistent with the focus just chosen; hydration
      // only derives it for users who never made an explicit choice.
      const next = sectionPrefsFor(focus)
      setPref('sectionPrefs', next); setSectionPrefsState(next)
    }
    setPref('onboarded', true); setOnboardedState(true)
    const joined = todayISO()
    setPref('joinedAt', joined); setJoinedAtState(joined)
  }, [])

  const setSectionPrefs = useCallback((next) => {
    setSectionPrefsState(next)
    setPref('sectionPrefs', next)
  }, [])

  const setMealTypes = useCallback((next) => {
    setMealTypesState(next)
    setPref('mealTypes', next)
  }, [])

  // Lang
  const setLang = useCallback((v) => {
    setLangState(v)
    setPref('lang', v)
  }, [])

  // Hydrate prefs before anything renders. Runs the one-time localStorage ->
  // IndexedDB migration first so a returning user's settings survive.
  useEffect(() => {
    async function hydrate() {
      try {
        await migrateLegacyPrefs()
      } catch (err) {
        console.error('pref migration failed', err)
      }

      let prefs
      try {
        prefs = await getAllPrefs()
      } catch (err) {
        // Falling through with defaults keeps the app usable when IndexedDB is
        // unavailable (private mode, blocked storage) instead of hanging on the
        // splash forever.
        console.error('pref hydration failed', err)
        setHydrated(true)
        return
      }

      setThemeState(prefs.theme)
      setFontScaleState(prefs.fontScale)
      setSoundEnabledState(prefs.soundEnabled)
      setAccentColorState(prefs.accentColor)
      setCustomAccentHexState(prefs.customAccentHex)
      setLangState(prefs.lang)
      setOnboardedState(prefs.onboarded)
      setJoinedAtState(prefs.joinedAt)
      setActivePlanSinceState(prefs.activePlanSince)
      setAppModeState(prefs.appMode)
      setFocusState(prefs.focus)
      setSectionPrefsState(prefs.sectionPrefs ?? sectionPrefsFor(prefs.focus))
      setStatsLayoutState(resolveStatsLayout(prefs.statsLayout ?? DEFAULT_STATS_LAYOUT, prefs.statsLayoutVersion))
      setFavouriteExercises(prefs.favExercises)
      setFavouriteFoods(prefs.favFoods)
      setRecentFoodIds(prefs.recentFoods)
      setNutritionGoalsState(prefs.nutritionGoals)
      setMealTypesState(prefs.mealTypes ?? DEFAULT_MEAL_TYPES)
      setHydrated(true)
    }
    hydrate()
  }, [])

  // Load from DB
  useEffect(() => {
    async function load() {
      const [p, w, s, allSteps, apid, activeWo, allMeasurements, log, foods, water, cli, customEx] = await Promise.all([
        db.getAll(STORES.plans),
        db.getAll(STORES.workouts),
        db.getAllSessions(),
        db.getAllSteps(),
        db.getSetting('activePlanId', null),
        db.getSetting('activeWorkout', null),
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
      setActiveWorkoutState(activeWo)
      const map = {}
      allSteps.forEach(e => { map[e.date] = e.count })
      setStepsMap(map)
      setFoodLog(log)
      setCustomFoods(foods)

      const knownFoodIds = new Set(foods.map(f => f.id))
      setFavouriteFoods(prev => pruneOrphanFoodIds(prev, knownFoodIds, 'favFoods'))
      setRecentFoodIds(prev => pruneOrphanFoodIds(prev, knownFoodIds, 'recentFoods'))
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
    setPref('activePlanSince', since)
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
    setPref('statsLayout', layout)
    // Stamp the version so this order survives the next boot.
    setPref('statsLayoutVersion', STATS_LAYOUT_VERSION)
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

  const deleteCustomFood = useCallback(async (id) => {
    await db.removeFood(id)
    setCustomFoods(prev => removeById(prev, id))
    setFavouriteFoods(prev => {
      if (!prev.includes(id)) return prev
      const next = prev.filter(x => x !== id)
      setPref('favFoods', next)
      return next
    })
  }, [])

  const saveCustomExercise = useCallback(async (exercise) => {
    await db.saveCustomExercise(exercise)
    const next = upsertById(customExercisesRef.current, exercise)
    customExercisesRef.current = next
    registerCustomExercises(next)
    setCustomExercises(next)
  }, [])

  const deleteCustomExercise = useCallback(async (id) => {
    await db.removeCustomExercise(id)
    const next = removeById(customExercisesRef.current, id)
    customExercisesRef.current = next
    registerCustomExercises(next)
    setCustomExercises(next)
    setFavouriteExercises(prev => {
      if (!prev.includes(id)) return prev
      const next = prev.filter(x => x !== id)
      setPref('favExercises', next)
      return next
    })
  }, [])

  const setWaterToday = useCallback(async (date, ml) => {
    await db.setWater(date, ml)
    setWaterMap(prev => ({ ...prev, [date]: ml }))
  }, [])

  const setNutritionGoals = useCallback((goals) => {
    setNutritionGoalsState(goals)
    setPref('nutritionGoals', goals)
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
      setPref('favExercises', next)
      return next
    })
  }, [])

  const toggleFavouriteFood = useCallback((id) => {
    setFavouriteFoods(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      setPref('favFoods', next)
      return next
    })
  }, [])

  const RECENT_FOODS_LIMIT = 10

  const addRecentFood = useCallback((id) => {
    setRecentFoodIds(prev => {
      const next = [id, ...prev.filter(x => x !== id)].slice(0, RECENT_FOODS_LIMIT)
      setPref('recentFoods', next)
      return next
    })
  }, [])

  const deleteSession = useCallback(async (sessionId) => {
    await db.remove(STORES.sessions, sessionId)
    setSessions(prev => removeById(prev, sessionId))
  }, [])

  const value = {
    hydrated,
    theme, setTheme,
    fontScale, setFontScale,
    soundEnabled, setSoundEnabled,
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
    customFoods, saveCustomFood, deleteCustomFood,
    customExercises, saveCustomExercise, deleteCustomExercise,
    favouriteFoods, toggleFavouriteFood,
    recentFoodIds, addRecentFood,
    waterMap, setWaterToday,
    nutritionGoals, setNutritionGoals,
    clients, saveClient, deleteClient,
  }

  // Holding render until prefs land avoids a flash of the wrong language and a
  // spurious onboarding screen for users who have already completed it.
  if (!hydrated) return null

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
