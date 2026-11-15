import { test } from 'node:test'
import assert from 'node:assert/strict'
import { currentExerciseIndex } from '../../src/lib/planUtils.js'

const ex= (id, ...done) => ({ id, sets: done.map((d) => ({ done: d })) })

test('with nothing touched, the first exercise with a set to do', () => {
  assert.equal(currentExerciseIndex([ex('a', true, true), ex('b', false), ex('c', false)], null), 1)
})

test('the touched exercise wins while it has a set to do', () => {
  const list= [ex('squat', false, false), ex('press', false, false)]
  assert.equal(currentExerciseIndex(list, 'press'), 1)
  assert.equal(currentExerciseIndex([ex('squat', true, false), ex('press', true, false)], 'press'), 1)
})

test('once the touched exercise is finished, the next one with a set to do', () => {
  assert.equal(currentExerciseIndex([ex('squat', false), ex('press', true, true), ex('curl', false)], 'press'), 2)
})

test('after the last exercise, wrap to the first one with a set to do', () => {
  assert.equal(currentExerciseIndex([ex('squat', false), ex('press', false), ex('curl', true)], 'curl'), 0)
})

test('follows the exercise by id when the order changes', () => {
  assert.equal(currentExerciseIndex([ex('press', false), ex('squat', false)], 'squat'), 1)
})

test('an unknown id or a finished workout', () => {
  assert.equal(currentExerciseIndex([ex('a', false)], 'gone'), 0)
  assert.equal(currentExerciseIndex([ex('a', true)], 'a'), -1)
})
