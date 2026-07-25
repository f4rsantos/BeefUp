export const DEFAULT_STATS_LAYOUT = [
  { key: 'streakCalendar', enabled: true },
  { key: 'steps', enabled: true },
  { key: 'tiles', enabled: true },
  { key: 'streak', enabled: true },
  { key: 'weeklyProgress', enabled: true },
  { key: 'muscleDistribution', enabled: true },
  { key: 'muscleFatigue', enabled: true },
  { key: 'personalRecords', enabled: true },
]

export function normalizeStatsLayout(saved) {
  if (!Array.isArray(saved)) return DEFAULT_STATS_LAYOUT

  const validKeys = new Set(DEFAULT_STATS_LAYOUT.map((b) => b.key))
  const kept = saved.filter((b) => b && validKeys.has(b.key))
  const knownKeys = new Set(kept.map((b) => b.key))
  const missing = DEFAULT_STATS_LAYOUT.filter((b) => !knownKeys.has(b.key))

  const result = [...kept, ...missing]
  return result.length > 0 ? result : DEFAULT_STATS_LAYOUT
}
