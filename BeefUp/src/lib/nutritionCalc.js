export const ACTIVITY = [
  { id: 'actSedentary', f: 1.2 },
  { id: 'actLight', f: 1.375 },
  { id: 'actModerate', f: 1.55 },
  { id: 'actActive', f: 1.725 },
  { id: 'actVeryActive', f: 1.9 },
]

export const OBJECTIVE = [
  { id: 'objCut', d: -0.18 },
  { id: 'objMaintain', d: 0 },
  { id: 'objBulk', d: 0.12 },
]

export function activityFromSessions(sessions) {
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000
  const count = sessions.filter((s) => new Date(s.date).getTime() >= since).length
  if (count >= 7) return 1.9
  if (count >= 6) return 1.725
  if (count >= 4) return 1.55
  if (count >= 2) return 1.375
  return 1.2
}

export function latestWeight(measurements) {
  const w = measurements
    .filter((m) => m.type === 'weight')
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  return w ? w.value : ''
}

export function calcGoals(c, waterMl = 2500) {
  const bmr = 10 * c.weight + 6.25 * c.height - 5 * c.age + (c.sex === 'male' ? 5 : -161)
  const tdee = bmr * c.activity
  const kcal = Math.round(tdee * (1 + c.obj))
  const protein = Math.round(c.weight * 2)
  const fat = Math.round((kcal * 0.25) / 9)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { kcal, protein, carbs, fat, waterMl: parseInt(waterMl) || 2500 }
}
