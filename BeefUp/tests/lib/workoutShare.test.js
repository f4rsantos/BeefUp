import { test } from 'node:test'
import assert from 'node:assert/strict'
import { encodeWorkoutShare, decodeWorkoutShare } from '../../src/lib/workoutShare.js'

test('a shared workout made with old variant ids opens with current refs', () => {
  const code = encodeWorkoutShare({
    name: 'Peito',
    restAfterSet: 90,
    exercises: [{ ref: 'chest_fly|dumbbell|unilateral_inclinado', weight: '14' }, 'crunch|band|bicycle', { ref: 'bench_press|barbell|reto' }],
  })
  assert.deepEqual(decodeWorkoutShare(code).exercises, [
    { ref: 'chest_fly|dumbbell|incline+unilateral', weight: '14' },
    'bicycle_crunch|bodyweight|',
    { ref: 'bench_press|barbell|' },
  ])
})

test('garbage and malformed shares still decode to null', () => {
  assert.equal(decodeWorkoutShare('not base64 !!'), null)
  assert.equal(decodeWorkoutShare(btoa(JSON.stringify({ name: 'x' }))), null)
})
