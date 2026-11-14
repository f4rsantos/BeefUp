import { getBaseExercise, parseExerciseRef } from './exerciseTree.js'
import { sessionDay } from './planUtils.js'

export function exerciseHistory(sessions, baseId) {
  const cardio= getBaseExercise(baseId)?.kind === 'cardio'
  const byDay= new Map()
  for (const session of sessions) {
    const day= sessionDay(session)
    if (!day) continue
    for (const entry of session.exercises ?? []) {
      if (parseExerciseRef(entry.exerciseId).baseId !== baseId) continue
      for (const set of entry.sets ?? []) {
        if (set.type === 'warmup') continue
        const value= parseFloat(cardio ? set.reps : set.weight)
        if (!(value > 0)) continue
        if (value > (byDay.get(day)?.value ?? 0)) byDay.set(day, { day, value, set, ref: entry.exerciseId })
      }
    }
  }
  const points= [...byDay.values()]
    .sort((a, b) => (a.day < b.day ? -1 : 1))
    .map((point, i) => ({ ...point, i }))
  return { kind: cardio ? 'distance' : 'weight', points }
}

export function yearStarts(points) {
  const starts= []
  for (let i= 1; i < points.length; i++) {
    if (points[i].day.slice(0, 4) !== points[i - 1].day.slice(0, 4)) starts.push(i)
  }
  return starts
}

export function pickTicks(points, max= 5) {
  const n= points.length
  if (n <= max) return points.map((p) => p.i)
  const chosen= new Set([0, n - 1, ...yearStarts(points)])
  const gap= Math.max(1, Math.floor((n - 1) / max))
  for (let k= 1; k < max - 1; k++) {
    const idx= Math.round((k * (n - 1)) / (max - 1))
    if ([...chosen].every((c) => Math.abs(c - idx) >= gap)) chosen.add(idx)
  }
  return [...chosen].sort((a, b) => a - b)
}

export function valueScale(points) {
  const values= points.map((p) => p.value)
  const min= Math.min(...values)
  const max= Math.max(...values)
  const raw= ((max - min) || max * 0.2) / 3
  const mag= 10 ** Math.floor(Math.log10(raw))
  const step= [1, 2, 5, 10].find((m) => m * mag >= raw) * mag
  const low= Math.max(0, Math.floor((min - step * 0.3) / step) * step)
  const high= Math.ceil((max + step * 0.3) / step) * step
  const ticks= []
  for (let v= low; v <= high + step / 2; v+= step) ticks.push(Math.round(v * 100) / 100)
  return { domain: [low, high], ticks }
}
