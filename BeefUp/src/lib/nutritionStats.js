// `foodLog` is already in context, so these functions only use in-memory data — no DB.

import { MICRONUTRIENT_KEYS } from './foodProvider'

const MACRO_KEYS = ['kcal', 'protein', 'carbs', 'fat']
const TOTAL_KEYS = [...MACRO_KEYS, ...MICRONUTRIENT_KEYS]

export const EMPTY_DAY = Object.fromEntries(TOTAL_KEYS.map((k) => [k, 0]))

// -> Map<dateISO, totals>, only days that have entries.

export function dailyNutritionTotals(foodLog) {
  const byDay = new Map()
  for (const entry of foodLog ?? []) {
    if (!entry?.date) continue
    const prev = byDay.get(entry.date) ?? EMPTY_DAY
    const next = {}
    for (const key of TOTAL_KEYS) next[key] = prev[key] + (entry[key] || 0)
    byDay.set(entry.date, next)
  }
  return byDay
}
