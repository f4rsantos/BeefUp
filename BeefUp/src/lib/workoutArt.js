import {
  Dumbbell, Weight, Flame, Zap, Trophy, Target, Timer, Activity, HeartPulse, Footprints, Bike, Mountain,
  BicepsFlexed, Swords, Shield, Crown, Medal, Rocket, Gauge, Waves, Flag, Sun, Moon, Snowflake, Skull, Hammer, Crosshair, Sparkles,
} from 'lucide-react'
import { normalizeWorkoutExercises, resolveExercise, BODY_PART_ACCENT } from './exerciseTree'

// Symbols a person can pick for a workout card.
export const WORKOUT_ICONS = {
  dumbbell: Dumbbell,
  weight: Weight,
  flame: Flame,
  zap: Zap,
  trophy: Trophy,
  target: Target,
  timer: Timer,
  activity: Activity,
  heart: HeartPulse,
  footprints: Footprints,
  bike: Bike,
  mountain: Mountain,
  biceps: BicepsFlexed,
  swords: Swords,
  shield: Shield,
  crown: Crown,
  medal: Medal,
  rocket: Rocket,
  gauge: Gauge,
  waves: Waves,
  flag: Flag,
  sun: Sun,
  moon: Moon,
  snowflake: Snowflake,
  skull: Skull,
  hammer: Hammer,
  crosshair: Crosshair,
  sparkles: Sparkles,
}

// The chosen symbol, else a dumbbell (a heart for cardio).
export function workoutIconFor(bodyParts, chosenKey) {
  const key = WORKOUT_ICONS[chosenKey] ? chosenKey : bodyParts[0] === 'cardio' ? 'heart' : 'dumbbell'
  return { key, Icon: WORKOUT_ICONS[key] }
}

// Body parts a workout trains, most exercises first.
export function workoutBodyParts(workout) {
  const counts = {}
  normalizeWorkoutExercises(workout.exercises).forEach((item) => {
    const bodyPart = resolveExercise(item.ref)?.bodyPart
    if (bodyPart) counts[bodyPart] = (counts[bodyPart] || 0) + 1
  })
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([part]) => part)
}

// One colour per group, upper and lower legs sharing theirs.
export function workoutColors(bodyParts) {
  const colors = []
  bodyParts.forEach((part) => {
    const color = BODY_PART_ACCENT[part]
    if (color && !colors.includes(color)) colors.push(color)
  })
  return colors
}

const tint = (color) => `color-mix(in srgb, ${color} 16%, var(--surface))`

// The card background: the group colour, a gradient when groups are mixed.
export function workoutTint(colors) {
  if (colors.length === 0) return 'var(--surface)'
  if (colors.length === 1) return tint(colors[0])
  return `linear-gradient(135deg, ${colors.map(tint).join(', ')})`
}
