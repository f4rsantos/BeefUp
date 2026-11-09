import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lastSetsOfSameBase } from '../../src/lib/planUtils.js'

const entry= (exerciseId, weight) => ({ exerciseId, sets: [{ weight, reps: '8' }] })
const session= (date, ...exercises) => ({ id: date, date, exercises })

test('suggests the most recent session of another combination of the same exercise', () => {
  const sessions= [
    session('2026-01-01', entry('bench_press|dumbbell|', '20')),
    session('2026-02-01', entry('bench_press|dumbbell|incline', '24')),
  ]
  const found= lastSetsOfSameBase(sessions, 'bench_press|barbell|')
  assert.equal(found.ref, 'bench_press|dumbbell|incline')
  assert.equal(found.sets[0].weight, '24')
})

test('ignores the exact combination and other exercises', () => {
  const sessions= [
    session('2026-02-01', entry('bench_press|barbell|', '60'), entry('squat|barbell|', '100')),
  ]
  assert.equal(lastSetsOfSameBase(sessions, 'bench_press|barbell|'), null)
})

test('gives nothing for cardio or when there is no history', () => {
  assert.equal(lastSetsOfSameBase([], 'bench_press|barbell|'), null)
  const sessions= [session('2026-02-01', { exerciseId: 'running|machine|', sets: [{ reps: '5000', time: '25:00' }] })]
  assert.equal(lastSetsOfSameBase(sessions, 'running|none|'), null)
})
