// `foodLog` is already in context, so these functions only use in-memory data — no DB.

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
