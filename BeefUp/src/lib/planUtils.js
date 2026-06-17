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

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function nowISO() {
  return new Date().toISOString()
}

// Build streak: count consecutive days (going backwards from today)
// that have either a completed session OR are marked rest days in the active plan.
export function computeStreak(sessions, plans, activePlanId) {
  const sessionDates = new Set(sessions.map(s => s.date?.slice(0, 10)))
  const plan = plans.find(p => p.id === activePlanId)

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)

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
  const sessionDates = new Set(sessions.map(s => s.date?.slice(0, 10)))
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const result = {}

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    const iso = date.toISOString().slice(0, 10)
    const isToday = iso === new Date().toISOString().slice(0, 10)
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
