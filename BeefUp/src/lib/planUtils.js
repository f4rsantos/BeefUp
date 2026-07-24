// Given a plan and a reference date, determine what today's entry is.
// A plan has a `days` array: [{ type: 'workout'|'rest', workoutId? }]
// The plan cycles: day index = (daysSinceStart % days.length)
// If no plan, returns null.

export function todaysPlanEntry(plan, sessions) {
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

// Sessions store only completed sets, in order, and are set as default for the future sets
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

// Elapsed seconds as mm:ss, or h:mm:ss once past an hour.
export function formatDuration(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0)
    return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

// Build streak: count consecutive days (going backwards from today)
// that have either a completed session OR are marked rest days in the active plan.
export function computeStreak(sessions, plans, activePlanId) {
  const sessionDates = new Set(sessions.map(sessionDay))
  const plan = plans.find(p => p.id === activePlanId)

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const iso = toLocalISO(d)

    const hasSession = sessionDates.has(iso)
    const isRestDay = plan ? isPlannedRestDay(plan, d) : false

    if (hasSession || isRestDay) {
      streak++
    } else {
      break
    }
  }
  return streak
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

// Get which days of the current month are rest days or completed sessions
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

// Bucket sessions into ISO week starts, summing the given metric, for the last `weeks` weeks.
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
