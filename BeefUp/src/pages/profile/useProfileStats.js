import { useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import {aggregateSessionsByDay, computeBestStreak, computeMuscleFatigue, computeMuscleGroupDistribution, computeOverallStats, computePersonalRecords, computeStreak, daysBetween, getMonthActivity, sessionDay, todayISO, toLocalISO,} from '../../lib/planUtils'

function dayOffsetISO(daysBack) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - daysBack)
  return toLocalISO(date)
}

export const MIN_CHART_DAYS = 7
export const DEFAULT_CHART_DAYS = 30

export function useProfileStats({ metric, chartDays }) {
  const { lang, plans, activePlanId, sessions, stepsMap, joinedAt, activePlanSince } = useApp()

  const today = todayISO()

  const streak = useMemo(
    () => computeStreak(sessions, plans, activePlanId, joinedAt, activePlanSince),
    [sessions, plans, activePlanId, joinedAt, activePlanSince],
  )
  const bestStreak = useMemo(
    () => computeBestStreak(sessions, plans, activePlanId, joinedAt, activePlanSince),
    [sessions, plans, activePlanId, joinedAt, activePlanSince],
  )

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const monthActivity = useMemo(
    () => getMonthActivity(year, month, sessions, plans, activePlanId),
    [year, month, sessions, plans, activePlanId],
  )
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const todaySteps = stepsMap[today] ?? null
  const weekSteps = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const iso = dayOffsetISO(6 - index)
        return { iso, value: stepsMap[iso] ?? 0, isToday: iso === today }
      }),
    [stepsMap, today],
  )
  const maxWeekSteps = Math.max(1, ...weekSteps.map((entry) => entry.value))

  const overall = useMemo(() => computeOverallStats(sessions), [sessions])
  const records = useMemo(() => computePersonalRecords(sessions, lang), [sessions, lang])
  const distribution = useMemo(
    () => computeMuscleGroupDistribution(sessions, lang),
    [sessions, lang],
  )
  const maxDistCount = Math.max(1, ...distribution.map((d) => d.count))
  const fatigue = useMemo(() => computeMuscleFatigue(sessions, lang), [sessions, lang])

  const maxChartDays = useMemo(() => {
    if (sessions.length === 0) return DEFAULT_CHART_DAYS
    const earliest = sessions.reduce((min, s) => {
      const day = sessionDay(s)
      return day && (!min || day < min) ? day : min
    }, null)
    if (!earliest) return DEFAULT_CHART_DAYS
    return Math.max(MIN_CHART_DAYS, daysBetween(earliest, today))
  }, [sessions, today])
  const minChartDays = Math.min(MIN_CHART_DAYS, maxChartDays)
  const effectiveChartDays = Math.min(Math.max(chartDays, minChartDays), maxChartDays)

  const chartData = useMemo(
    () => aggregateSessionsByDay(sessions, metric, effectiveChartDays),
    [sessions, metric, effectiveChartDays],
  )

  return {
    hasSessions: sessions.length > 0,
    streak,
    bestStreak,
    monthActivity,
    daysInMonth,
    todaySteps,
    weekSteps,
    maxWeekSteps,
    overall,
    records,
    distribution,
    maxDistCount,
    fatigue,
    chartData,
    chartDays: effectiveChartDays,
    minChartDays,
    maxChartDays,
  }
}
