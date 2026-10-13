import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lastUsedChoice } from '../../src/lib/planUtils.js'

const sessions = [
  { date: '2026-01-01', exercises: [{ exerciseId: 'bench_press|barbell|reto', barType: 'olympic' }] },
  { date: '2026-03-01', exercises: [{ exerciseId: 'bench_press|dumbbell|inclinado+pega_neutra' }, { exerciseId: 'squat|barbell|' }] },
  { date: '2026-02-01', exercises: [{ exerciseId: 'bench_press|machine|' }] },
]

test('picks the most recent combination for the base exercise', () => {
  assert.deepEqual(lastUsedChoice(sessions, 'bench_press'), {
    equipmentId: 'dumbbell',
    variantId: 'inclinado+pega_neutra',
    barType: '',
  })
})

test('keeps the bar type and an empty variant', () => {
  assert.deepEqual(lastUsedChoice([{ date: '2026-01-01', exercises: [{ exerciseId: 'squat|barbell|', barType: 'safety_squat' }] }], 'squat'), {
    equipmentId: 'barbell',
    variantId: '',
    barType: 'safety_squat',
  })
})

test('null when the exercise was never logged', () => {
  assert.equal(lastUsedChoice(sessions, 'deadlift'), null)
  assert.equal(lastUsedChoice([], 'squat'), null)
})
