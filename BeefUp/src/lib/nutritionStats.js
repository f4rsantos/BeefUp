// `foodLog` is already in context, so these functions only use in-memory data — no DB.

export const EMPTY_DAY = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, saturatedFat: 0, sodium: 0 }

// -> Map<dateISO, { kcal, protein, carbs, fat, fiber, sugar, saturatedFat, sodium }>, only days that have entries.

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
      fiber: prev.fiber + (entry.fiber || 0),
      sugar: prev.sugar + (entry.sugar || 0),
      saturatedFat: prev.saturatedFat + (entry.saturatedFat || 0),
      sodium: prev.sodium + (entry.sodium || 0),
    })
  }
  return byDay
}
