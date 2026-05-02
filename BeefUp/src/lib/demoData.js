import exercisesData from '../data/exercises.json'
import { todayISO } from './planUtils'

function shiftISO(daysBack) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - daysBack)
  return date.toISOString().slice(0, 10)
}

function makeSet(weight, reps) {
  return { weight: String(weight), reps: String(reps) }
}

function exerciseMeta(id) {
  return exercisesData.find(exercise => exercise.id === id)
}

export function buildDemoPreset() {
  const upperA = exerciseMeta('bench_press')
  const upperB = exerciseMeta('overhead_press')
  const upperC = exerciseMeta('tricep_pushdown')
  const lowerA = exerciseMeta('squat')
  const lowerB = exerciseMeta('rdl')
  const lowerC = exerciseMeta('calf_raise')

  const workouts = [
    {
      id: 'demo_upper',
      name: 'Upper Strength',
      namePt: 'Superior Força',
      exercises: [upperA?.id, upperB?.id, upperC?.id].filter(Boolean),
    },
    {
      id: 'demo_lower',
      name: 'Lower Strength',
      namePt: 'Inferior Força',
      exercises: [lowerA?.id, lowerB?.id, lowerC?.id].filter(Boolean),
    },
  ]

  const plan = {
    id: 'demo_plan',
    name: 'Demo Split',
    startDate: todayISO(),
    days: [
      { id: 'demo_day_1', type: 'workout', workoutId: 'demo_upper' },
      { id: 'demo_day_2', type: 'rest', workoutId: null },
      { id: 'demo_day_3', type: 'workout', workoutId: 'demo_lower' },
      { id: 'demo_day_4', type: 'rest', workoutId: null },
    ],
  }

  const session = {
    id: 'demo_session_1',
    date: shiftISO(1),
    workoutId: 'demo_lower',
    workoutName: 'Lower Strength',
    duration: 2760,
    exercises: [
      {
        exerciseId: 'squat',
        name: lowerA?.name ?? 'Squat',
        namePt: lowerA?.namePt ?? 'Agachamento',
        sets: [makeSet(80, 8), makeSet(85, 8), makeSet(90, 6)],
      },
      {
        exerciseId: 'rdl',
        name: lowerB?.name ?? 'Romanian Deadlift',
        namePt: lowerB?.namePt ?? 'Deadlift Romeno',
        sets: [makeSet(70, 10), makeSet(70, 10)],
      },
    ],
  }

  const steps = [
    { date: todayISO(), count: 8420 },
    { date: shiftISO(1), count: 6912 },
  ]

  return {
    workouts,
    plan,
    session,
    steps,
    pbConfig: ['steps', 'bench_press', 'squat'],
  }
}