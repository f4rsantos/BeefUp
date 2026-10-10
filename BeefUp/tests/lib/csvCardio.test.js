import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildWorkoutCsv, parseWorkoutCsv } from '../../src/lib/csvData.js'

const sessions = [{
  id: 's1', date: '2026-10-01T10:00:00.000Z', workoutName: 'Cardio', duration: 1800, notes: '',
  exercises: [
    { exerciseId: 'running|machine|', name: 'Running', namePt: 'Corrida', note: '', sets: [{ reps: '5000', time: '25:30', type: 'normal' }] },
    { exerciseId: 'bench_press|barbell|flat', name: 'Bench press', namePt: 'Supino', note: '', sets: [{ weight: '60', reps: '8', type: 'normal' }] },
  ],
}]

test('cardio time survives a BeefUp CSV round trip', () => {
  const csv = buildWorkoutCsv(sessions, 'en')
  const back = parseWorkoutCsv(csv, 'beefup')
  assert.equal(back.error, null)
  const [run, bench] = back.sessions[0].exercises
  assert.equal(run.sets[0].reps, '5000')
  assert.equal(run.sets[0].time, '25:30')
  assert.equal(bench.sets[0].time, undefined)
  assert.equal(bench.sets[0].weight, '60')
})

test('a generic CSV with a Time column does not leak into sets', () => {
  const csv = 'Date,Exercise,Weight,Reps,Time\n2026-10-01,Bench press,60,8,10:30'
  const out = parseWorkoutCsv(csv, 'generic')
  assert.equal(out.error, null)
  assert.equal(out.sessions[0].exercises[0].sets[0].time, undefined)
})
