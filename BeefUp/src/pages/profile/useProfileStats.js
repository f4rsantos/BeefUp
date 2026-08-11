import { useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import {aggregateSessionsByDay, computeBestStreak, computeMuscleFatigue, computeMuscleGroupDistribution, computeOverallStats, computePersonalRecords, computeStreak, getMonthActivity, sessionDay, toLocalISO,} from '../../lib/planUtils'
import { nutritionSummary, nutritionTrend } from '../../lib/nutritionStats'

function dayOffsetISO(daysBack) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - daysBack)
  return toLocalISO(date)
}

// Streak, personal records and muscle fatigue read the FULL history on purpose
export function useProfileStats({ rangeStart, rangeDays, metric, today }) {
  const { lang, plans, activePlanId, sessions, stepsMap, foodLog, nutritionGoals } = useApp()

  const sessionsInRange = useMemo(
    () => sessions.filter((s) => sessionDay(s) >= rangeStart),
    [sessions, rangeStart],
  )

  const streak = useMemo(
    () => computeStreak(sessions, plans, activePlanId),
    [sessions, plans, activePlanId],
  )
  const bestStreak = useMemo(
    () => computeBestStreak(sessions, plans, activePlanId),
    [sessions, plans, activePlanId],
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

  const overall = useMemo(() => computeOverallStats(sessionsInRange), [sessionsInRange])
  const records = useMemo(() => computePersonalRecords(sessions, lang), [sessions, lang])
  const distribution = useMemo(
    () => computeMuscleGroupDistribution(sessionsInRange, lang),
    [sessionsInRange, lang],
  )
  const maxDistCount = Math.max(1, ...distribution.map((d) => d.count))
  const fatigue = useMemo(() => computeMuscleFatigue(sessions, lang), [sessions, lang])

  const chartData = useMemo(
    () => aggregateSessionsByDay(sessionsInRange, metric, rangeDays),
    [sessionsInRange, metric, rangeDays],
  )

  const nutriTrend = useMemo(() => nutritionTrend(foodLog, rangeDays), [foodLog, rangeDays])
  const nutriSummary = useMemo(
    () => nutritionSummary(foodLog, nutritionGoals, rangeDays),
    [foodLog, nutritionGoals, rangeDays],
  )

  return {
    sessionsInRange,
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
    nutriTrend,
    nutriSummary,
    kcalGoal: nutritionGoals.kcal || 0,
  }
}
