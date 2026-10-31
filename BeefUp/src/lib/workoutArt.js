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

const MESH_SPOTS = ['0% 0%', '100% 10%', '90% 100%', '5% 95%', '55% 50%']
const NEUTRAL_MESH = ['#a1a1aa', '#71717a', '#52525b']

const shade = (color, toward, amount) => `color-mix(in srgb, ${color} ${amount}%, ${toward})`

function meshPalette(colors) {
  if (colors.length === 0) return NEUTRAL_MESH
  if (colors.length === 1) return [shade(colors[0], 'white', 62), colors[0], shade(colors[0], 'black', 70)]
  return colors
}

// The card background: a mesh of the group colours, blended like a spending card.
export function workoutTint(colors) {
  const palette = meshPalette(colors)
  const blobs = palette.map((color, i) => `radial-gradient(circle at ${MESH_SPOTS[i % MESH_SPOTS.length]} in oklch, ${color}, transparent 66%)`)
  return [...blobs, `linear-gradient(135deg in oklch, ${palette.join(', ')})`].join(', ')
}
