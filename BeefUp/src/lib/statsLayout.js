// Increase this version whenever the default ORDER changes. Otherwise, old saved layouts may keep the old order and never show the new one. A version mismatch resets the layout to the current default.
export const STATS_LAYOUT_VERSION = 2

export const DEFAULT_STATS_LAYOUT = [
  { key: 'nutritionSummary', enabled: true },
  { key: 'tiles', enabled: true },
  { key: 'streakCalendar', enabled: true },
  { key: 'steps', enabled: true },
  { key: 'weeklyProgress', enabled: true },
  { key: 'muscleDistribution', enabled: true },
  { key: 'muscleFatigue', enabled: true },
  { key: 'personalRecords', enabled: true },
  { key: 'nutritionTrend', enabled: true },
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

export function resolveStatsLayout(saved, savedVersion) {
  if (savedVersion !== STATS_LAYOUT_VERSION) return DEFAULT_STATS_LAYOUT
  return normalizeStatsLayout(saved)
}
