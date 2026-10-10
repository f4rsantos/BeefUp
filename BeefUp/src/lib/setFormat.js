import { isCardioExercise, repUnitFor } from './exerciseTree.js'
import { normalizeTime } from './timeFormat.js'

const DASH = '–'

// One line per set, shaped by exercise type.
export function formatSet(set, ref) {
  const amount = set.reps === '' || set.reps == null ? null : set.reps
  if (isCardioExercise(ref)) {
    const parts = []
    if (amount !== null) parts.push(`${amount} m`)
    const time = normalizeTime(set.time)
    if (time) parts.push(time)
    return parts.join(' · ') || DASH
  }
  const weight = set.weight ? `${set.weight} kg` : DASH
  const unit = repUnitFor(ref) === 'reps' ? '' : ` ${repUnitFor(ref)}`
  return `${weight} × ${amount ?? DASH}${unit}`
}
