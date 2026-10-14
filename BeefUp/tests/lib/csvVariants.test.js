import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildWorkoutCsv, parseWorkoutCsv } from '../../src/lib/csvData.js'

const exerciseIds = (csv, mode) => parseWorkoutCsv(csv, mode).sessions[0].exercises.map((e) => e.exerciseId)

test('a backup CSV with old variant ids comes back canonical', () => {
  const sessions = [{
    id: 's1', date: '2026-10-01T10:00:00.000Z', workoutName: 'Peito', duration: 1, notes: '',
    exercises: [
      { exerciseId: 'chest_fly|dumbbell|unilateral_inclinado', name: 'Fly', namePt: 'Crucifixo', note: '', sets: [{ weight: '14', reps: '12', type: 'normal' }] },
      { exerciseId: 'crunch|band|bicycle', name: 'Bicycle', namePt: 'Bicicleta', note: '', sets: [{ reps: '20', type: 'normal' }] },
    ],
  }]
  assert.deepEqual(exerciseIds(buildWorkoutCsv(sessions, 'en'), 'beefup'), [
    'chest_fly|dumbbell|incline+unilateral',
    'bicycle_crunch|bodyweight|',
  ])
})

test('generic names pick one variant per group and never a default', () => {
  const csv = [
    'Date,Exercise,Weight,Reps',
    '2026-10-01,Dumbbell bench press incline neutral grip,30,10',
    '2026-10-01,Barbell bench press flat,60,8',
  ].join('\n')
  const [neutral, flat] = exerciseIds(csv, 'generic')
  assert.equal(neutral, 'bench_press|dumbbell|inclinado+neutra')
  assert.equal(flat, 'bench_press|barbell|')
})
