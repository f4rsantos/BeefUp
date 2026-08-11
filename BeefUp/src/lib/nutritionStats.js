// Aggregations for the Progress page.
//
// `foodLog` is already in context, so these functions only use in-memory data — no DB.
//
// Key rule: days without logs are gaps, NOT 0 kcal days. They are excluded from averages to avoid showing false data or misleading adherence.

import { toLocalISO } from './planUtils'

// A day counts as "on target" within this much of the calorie goal.
export const TARGET_TOLERANCE = 0.1

export const EMPTY_DAY = { kcal: 0, protein: 0, carbs: 0, fat: 0 }

// -> Map<dateISO, { kcal, protein, carbs, fat }>, only days that have entries.
export function dailyNutritionTotals(foodLog) {
  const byDay = new Map()
  for (const entry of foodLog ?? []) {
    if (!entry?.date) continue
    const prev = byDay.get(entry.date) ?? EMPTY_DAY
    byDay.set(entry.date, {
      kcal: prev.kcal + (entry.kcal || 0),
      protein: prev.protein + (entry.protein || 0),
      carbs: prev.carbs + (entry.carbs || 0),
      fat: prev.fat + (entry.fat || 0),
    })
  }
  return byDay
}

function lastNDates(days) {
  const out = []
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  cursor.setDate(cursor.getDate() - (days - 1))
  for (let i = 0; i < days; i++) {
    out.push(toLocalISO(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

export function nutritionTrend(foodLog, days = 30) {
  const byDay = dailyNutritionTotals(foodLog)
  return lastNDates(days).map((date) => {
    const totals = byDay.get(date)
    return {
      date,
      dateLabel: `${parseInt(date.slice(8, 10), 10)}/${parseInt(date.slice(5, 7), 10)}`,
      kcal: totals ? Math.round(totals.kcal) : null,
      protein: totals ? Math.round(totals.protein) : null,
    }
  })
}

export function nutritionSummary(foodLog, goals, days = 30) {
  const byDay = dailyNutritionTotals(foodLog)
  const logged = lastNDates(days)
    .map((date) => byDay.get(date))
    .filter(Boolean)

  const daysLogged = logged.length
  if (daysLogged === 0) {
    return { avgKcal: 0, avgProtein: 0, daysLogged: 0, daysOnTarget: 0, adherencePct: 0 }
  }

  const totalKcal = logged.reduce((acc, d) => acc + d.kcal, 0)
  const totalProtein = logged.reduce((acc, d) => acc + d.protein, 0)

  const kcalGoal = goals?.kcal || 0
  const daysOnTarget = kcalGoal > 0
    ? logged.filter((d) => Math.abs(d.kcal - kcalGoal) <= kcalGoal * TARGET_TOLERANCE).length
    : 0

  return {
    avgKcal: Math.round(totalKcal / daysLogged),
    avgProtein: Math.round(totalProtein / daysLogged),
    daysLogged,
    daysOnTarget,
    adherencePct: Math.round((daysOnTarget / daysLogged) * 100),
  }
}
