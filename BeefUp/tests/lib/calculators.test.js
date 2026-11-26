import { test } from 'node:test'
import assert from 'node:assert/strict'
import { backOffWeight, dropSetWeights, formatKg, oneRepMax, roundTo, targetRepsWeight, weightForReps } from '../../src/lib/calculators.js'
import { epley } from '../../src/lib/planUtils.js'

test('1RM uses Epley and one rep is the weight itself', () => {
  assert.equal(oneRepMax('100', '1'), 100)
  assert.equal(oneRepMax('100', '5'), 100 * (1 + 5 / 30))
  assert.equal(oneRepMax('100', '5'), epley('100', '5'))
})

test('1RM needs a weight and at least one rep', () => {
  assert.equal(oneRepMax('', '5'), null)
  assert.equal(oneRepMax('100', ''), null)
  assert.equal(oneRepMax('100', '0'), null)
  assert.equal(oneRepMax('-5', '3'), null)
})

test('weight for reps is the inverse of the 1RM', () => {
  const max= oneRepMax('80', '8')
  assert.ok(Math.abs(weightForReps(max, 8) - 80) < 1e-9)
  assert.equal(weightForReps(120, 1), 120)
  assert.equal(weightForReps('', 5), null)
})

test('back-off takes a percentage off and rounds to 2.5 kg', () => {
  assert.equal(backOffWeight('100', 10), 90)
  assert.equal(backOffWeight('82.5', 15), 70)
  assert.equal(backOffWeight('60', 20), 47.5)
  assert.equal(backOffWeight('', 10), null)
})

test('rounds to the nearest step', () => {
  assert.equal(roundTo(71.2), 70)
  assert.equal(roundTo(71.3), 72.5)
  assert.equal(roundTo(7, 5), 5)
})

test('drop set cuts the same percentage from the previous step', () => {
  assert.deepEqual(dropSetWeights('80', '3', '20'), [80, 64, 51, 41])
  assert.deepEqual(dropSetWeights('100', '1', '10'), [100, 90])
})

test('drop set needs a weight, drops and a percentage within the limits', () => {
  assert.equal(dropSetWeights('', '3', '20'), null)
  assert.equal(dropSetWeights('80', '0', '20'), null)
  assert.equal(dropSetWeights('80', '3', ''), null)
  assert.equal(dropSetWeights('80', '99', '20').length, 7)
  assert.equal(dropSetWeights('80', '1', '99')[1], 40)
})

test('target reps inverts the 1RM: same lift, more reps, less weight', () => {
  const max= oneRepMax('100', '5')
  assert.equal(targetRepsWeight('100', '5', '8'), max / (1 + 8 / 30))
  assert.ok(targetRepsWeight('100', '5', '8') < 100)
  assert.ok(targetRepsWeight('100', '5', '3') > 100)
  assert.equal(targetRepsWeight('100', '5', '5'), 100)
  assert.equal(targetRepsWeight('', '5', '8'), null)
  assert.equal(targetRepsWeight('100', '5', ''), null)
})

test('formats kilos without trailing zeros', () => {
  assert.equal(formatKg(72.5), '72.5')
  assert.equal(formatKg(116.66666), '116.67')
  assert.equal(formatKg(90), '90')
})
