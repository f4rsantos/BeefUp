import { useMemo, useState } from 'react'
import { todayISO, toLocalISO } from '../../lib/planUtils'

export const RANGE_PRESETS = [7, 14, 30]

export function useStatsRange(defaultPreset = 30) {
  const today = todayISO()
  const [preset, setPreset] = useState(defaultPreset) // 7 | 14 | 30 | 'custom'
  const [customStart, setCustomStart] = useState(today)

  const start = useMemo(() => {
    if (preset === 'custom') return customStart
    const from = new Date()
    from.setHours(0, 0, 0, 0)
    from.setDate(from.getDate() - (preset - 1))
    return toLocalISO(from)
  }, [preset, customStart])

  const days = useMemo(() => {
    const from = new Date(start)
    from.setHours(0, 0, 0, 0)
    const to = new Date()
    to.setHours(0, 0, 0, 0)
    return Math.max(1, Math.round((to - from) / 86400000) + 1)
  }, [start])

  return { today, preset, setPreset, customStart, setCustomStart, start, days }
}
