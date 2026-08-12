import { buildExerciseRef, resolveExercise } from './exerciseTree'
import { todayISO } from './planUtils'

function ref(baseId, equipmentId, variantId) {
  return resolveExercise(buildExerciseRef(baseId, equipmentId, variantId))?.id
}

export function buildDemoPreset() {
  const workouts = [
    {
      id: 'demo_push',
      name: 'Push',
      exercises: [
        ref('bench_press', 'barbell', 'flat'),
        ref('overhead_press', 'barbell', 'standing'),
        ref('lateral_raise', 'dumbbell', ''),
        ref('tricep_extension', 'cable', 'rope'),
      ].filter(Boolean),
    },
    {
      id: 'demo_pull',
      name: 'Pull',
      exercises: [
        ref('lat_pulldown', 'cable', 'wide'),
        ref('row', 'barbell', 'bent_over'),
        ref('bicep_curl', 'dumbbell', 'standard'),
      ].filter(Boolean),
    },
    {
      id: 'demo_legs',
      name: 'Legs',
      exercises: [
        ref('squat', 'barbell', 'back'),
        ref('leg_extension', 'machine', ''),
        ref('leg_curl', 'machine', 'lying'),
        ref('calf_raise', 'bodyweight', 'standing'),
      ].filter(Boolean),
    },
  ]

  const plan = {
    id: 'demo_plan',
    name: 'Push Pull Legs',
    startDate: todayISO(),
    days: [
      { id: 'demo_day_1', type: 'workout', workoutId: 'demo_push' },
      { id: 'demo_day_2', type: 'rest', workoutId: null },
      { id: 'demo_day_3', type: 'workout', workoutId: 'demo_pull' },
      { id: 'demo_day_4', type: 'rest', workoutId: null },
      { id: 'demo_day_5', type: 'workout', workoutId: 'demo_legs' },
      { id: 'demo_day_6', type: 'rest', workoutId: null },
      { id: 'demo_day_7', type: 'rest', workoutId: null },
    ],
  }

  return { workouts, plan }
}
