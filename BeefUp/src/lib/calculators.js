export const BACK_OFF_PERCENTS= [10, 15, 20]
export const REP_TARGETS= [3, 5, 8, 10, 12]
const STEP= 2.5
export const MAX_DROPS= 6
export const MAX_PERCENT= 50

const number= (value) => {
  const n= parseFloat(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export const roundTo= (value, step= STEP) => Math.round(value / step) * step

export function oneRepMax(weight, reps) {
  const w= number(weight)
  const r= Math.floor(number(reps))
  if (!w || !r) return null
  return r === 1 ? w : w * (1 + r / 30)
}

export function weightForReps(oneRm, reps) {
  const max= number(oneRm)
  const r= Math.floor(number(reps))
  if (!max || !r) return null
  return r === 1 ? max : max / (1 + r / 30)
}

export function backOffWeight(weight, percent) {
  const w= number(weight)
  if (!w) return null
  return roundTo(w * (1 - percent / 100))
}

export function targetRepsWeight(weight, reps, targetReps) {
  const max= oneRepMax(weight, reps)
  if (max === null) return null
  return weightForReps(max, targetReps)
}

export function dropSetWeights(weight, drops, percent) {
  const w= number(weight)
  const count= Math.min(Math.floor(number(drops)), MAX_DROPS)
  const cut= Math.min(number(percent), MAX_PERCENT)
  if (!w || !count || !cut) return null
  return Array.from({ length: count + 1 }, (_, i) => roundTo(w * (1 - cut / 100) ** i, 1))
}

export function formatKg(value) {
  return String(Math.round(value * 100) / 100)
}
