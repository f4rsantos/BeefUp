import { resolveExercise, getBodyPartLabel, listBodyParts } from './exerciseTree'

// A plan's `days` array cycles: day index = (daysSinceStart % days.length).
export function todaysPlanEntry(plan) {
  if (!plan || !plan.days || plan.days.length === 0) return null

  const startDate = plan.startDate ? new Date(plan.startDate) : new Date()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  startDate.setHours(0, 0, 0, 0)

  const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24))
  const idx = ((diffDays % plan.days.length) + plan.days.length) % plan.days.length
  return plan.days[idx]
}

export function toLocalISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function sessionDay(session) {
  if (!session?.date) return null
  return session.date.length > 10 ? toLocalISO(new Date(session.date)) : session.date
}

export function todayISO() {
  return toLocalISO(new Date())
}

export function nowISO() {
  return new Date().toISOString()
}

export function lastCompletedSets(sessions, exerciseId) {
  let latest = null
  for (const s of sessions) {
    const entry = s.exercises?.find((e) => e.exerciseId === exerciseId)
    if (entry?.sets?.length && (!latest || s.date > latest.date)) {
      latest = { date: s.date, sets: entry.sets }
    }
  }
  return latest?.sets ?? []
}

export function formatDuration(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0)
    return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

function activeDayFlags(sessions, plans, activePlanId, dayCount) {
  const sessionDates = new Set(sessions.map(sessionDay))
  const plan = plans.find(p => p.id === activePlanId)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const flags = []
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const iso = toLocalISO(d)
    const hasSession = sessionDates.has(iso)
    const isRestDay = plan ? isPlannedRestDay(plan, d) : false
    flags.push(hasSession || isRestDay)
  }
  return flags
}

export function computeStreak(sessions, plans, activePlanId) {
  const flags = activeDayFlags(sessions, plans, activePlanId, 365)
  let streak = 0
  for (const active of flags) {
    if (!active) break
    streak++
  }
  return streak
}

export function computeBestStreak(sessions, plans, activePlanId) {
  const flags = activeDayFlags(sessions, plans, activePlanId, 365)
  let best = 0
  let current = 0
  for (const active of flags) {
    if (active) {
      current++
      if (current > best) best = current
    } else {
      current = 0
    }
  }
  return best
}

function isPlannedRestDay(plan, date) {
  if (!plan?.days?.length) return false
  const start = new Date(plan.startDate || new Date())
  start.setHours(0, 0, 0, 0)
  date = new Date(date)
  date.setHours(0, 0, 0, 0)
  const diff = Math.floor((date - start) / (1000 * 60 * 60 * 24))
  const idx = ((diff % plan.days.length) + plan.days.length) % plan.days.length
  return plan.days[idx]?.type === 'rest'
}

export function getMonthActivity(year, month, sessions, plans, activePlanId) {
  const plan = plans.find(p => p.id === activePlanId)
  const sessionDates = new Set(sessions.map(sessionDay))
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const result = {}

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    const iso = toLocalISO(date)
    const isToday = iso === todayISO()
    const future = date > new Date()

    if (!future || isToday) {
      const hasSession = sessionDates.has(iso)
      const isRest = plan ? isPlannedRestDay(plan, date) : false
      result[d] = { active: hasSession || isRest, isRest, isToday }
    } else {
      result[d] = { active: false, isRest: false, isToday: false }
    }
  }
  return result
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function sessionVolume(session) {
  return session.exercises?.reduce((acc, ex) =>
    acc + (ex.sets?.reduce((a, s) => a + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0) ?? 0), 0) ?? 0
}

function sessionReps(session) {
  return session.exercises?.reduce((acc, ex) =>
    acc + (ex.sets?.reduce((a, s) => a + (parseInt(s.reps) || 0), 0) ?? 0), 0) ?? 0
}

export function computeOverallStats(sessions) {
  const daysTrained = new Set(sessions.map(sessionDay)).size
  const totalSessions = sessions.length
  const totalVolume = sessions.reduce((acc, s) => acc + sessionVolume(s), 0)
  const totalDuration = sessions.reduce((acc, s) => acc + (s.duration ?? 0), 0)
  const totalReps = sessions.reduce((acc, s) => acc + sessionReps(s), 0)
  const totalSets = sessions.reduce(
    (acc, s) => acc + (s.exercises?.reduce((a, ex) => a + (ex.sets?.length ?? 0), 0) ?? 0),
    0,
  )
  return { daysTrained, totalSessions, totalVolume, totalDuration, totalReps, totalSets }
}

export function aggregateSessionsByWeek(sessions, metric, weeks = 10) {
  const metricFn = {
    duration: (s) => s.duration ?? 0,
    volume: sessionVolume,
    reps: sessionReps,
  }[metric]

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekStart = new Date(today)
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))

  const buckets = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(weekStart)
    start.setDate(start.getDate() - i * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    buckets.push({ start, end, value: 0 })
  }

  sessions.forEach((s) => {
    const d = new Date(s.date)
    const bucket = buckets.find((b) => d >= b.start && d < b.end)
    if (bucket) bucket.value += metricFn(s)
  })

  return buckets.map((b) => ({
    weekLabel: `${b.start.getDate()}/${b.start.getMonth() + 1}`,
    value: Math.round(b.value),
  }))
}

export function measurementsForType(measurements, type) {
  return measurements
    .filter((m) => m.type === type)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m) => ({ id: m.id, dateLabel: m.date.slice(5), value: m.value }))
}

export const epley = (weight, reps) => (parseFloat(weight) || 0) * (1 + (parseInt(reps) || 0) / 30)

export function computePersonalRecords(sessions, lang) {
  const best = {}
  sessions.forEach((s) => {
    s.exercises?.forEach((e) => {
      e.sets?.forEach((set) => {
        if (set.type === 'warmup') return
        const e1rm = epley(set.weight, set.reps)
        if (!best[e.exerciseId] || e1rm > best[e.exerciseId].e1rm) {
          best[e.exerciseId] = {
            exerciseId: e.exerciseId,
            e1rm,
            weight: set.weight,
            reps: set.reps,
            date: s.date,
            name: e.name,
            namePt: e.namePt,
          }
        }
      })
    })
  })

  return Object.values(best)
    .map((r) => {
      const resolved = resolveExercise(r.exerciseId)
      const name = resolved
        ? (lang === 'pt' ? resolved.namePt : resolved.name)
        : (lang === 'pt' ? r.namePt : r.name)
      return { ...r, name }
    })
    .sort((a, b) => b.e1rm - a.e1rm)
}

function statsBodyPart(bodyPart) {
  return bodyPart === 'upper legs' || bodyPart === 'lower legs' ? 'legs' : bodyPart
}

export function computeMuscleGroupDistribution(sessions, lang) {
  const counts = {}
  sessions.forEach((s) => {
    s.exercises?.forEach((e) => {
      const resolved = resolveExercise(e.exerciseId)
      if (!resolved) return
      const nonWarmupSets = e.sets?.filter((set) => set.type !== 'warmup').length ?? 0
      if (nonWarmupSets === 0) return
      const bodyPart = statsBodyPart(resolved.bodyPart)
      counts[bodyPart] = (counts[bodyPart] || 0) + nonWarmupSets
    })
  })

  return Object.entries(counts)
    .map(([bodyPart, count]) => ({ bodyPart, label: getBodyPartLabel(bodyPart, lang), count }))
    .sort((a, b) => b.count - a.count)
}

function fatigueLevel(daysSince) {
  if (daysSince === null) return 'none'
  if (daysSince <= 1) return 'fatigued'
  if (daysSince <= 3) return 'recovering'
  return 'fresh'
}

export function computeMuscleFatigue(sessions, lang) {
  const lastTrainedDay = {}
  sessions.forEach((s) => {
    const day = sessionDay(s)
    if (!day) return
    s.exercises?.forEach((e) => {
      const hasNonWarmup = e.sets?.some((set) => set.type !== 'warmup')
      if (!hasNonWarmup) return
      const resolved = resolveExercise(e.exerciseId)
      if (!resolved) return
      const bodyPart = statsBodyPart(resolved.bodyPart)
      if (!lastTrainedDay[bodyPart] || day > lastTrainedDay[bodyPart]) {
        lastTrainedDay[bodyPart] = day
      }
    })
  })

  const today = todayISO()
  const groups = [...new Set(listBodyParts().map(statsBodyPart))]
  return groups
    .map((bodyPart) => {
      const lastDay = lastTrainedDay[bodyPart] ?? null
      const daysSince = lastDay
        ? Math.round((new Date(today) - new Date(lastDay)) / (1000 * 60 * 60 * 24))
        : null
      return { bodyPart, label: getBodyPartLabel(bodyPart, lang), daysSince, level: fatigueLevel(daysSince) }
    })
    .sort((a, b) => {
      if (a.daysSince === null) return 1
      if (b.daysSince === null) return -1
      return a.daysSince - b.daysSince
    })
}
