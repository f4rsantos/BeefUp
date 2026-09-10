import { test } from 'node:test'
import assert from 'node:assert/strict'
import { measureGoalProgress } from './planUtils.js'

function m(date, value, type = 'weight') {
  return { id: date, date, type, value }
}

test('no data yet -> no percent, no reached', () => {
  const p = measureGoalProgress([], 'weight', 65)
  assert.deepEqual(p, { hasData: false, target: 65 })
})

test('decreasing goal: partway there', () => {
  const measurements = [m('2026-01-01', 75), m('2026-02-01', 70)]
  const p = measureGoalProgress(measurements, 'weight', 65)
  assert.equal(p.hasData, true)
  assert.equal(p.baseline, 75)
  assert.equal(p.current, 70)
  assert.equal(p.percent, 50)
  assert.equal(p.reached, false)
})

test('decreasing goal: exact hit is reached', () => {
  const measurements = [m('2026-01-01', 75), m('2026-02-01', 65)]
  const p = measureGoalProgress(measurements, 'weight', 65)
  assert.equal(p.reached, true)
  assert.equal(p.percent, 100)
})

test('decreasing goal: overshooting past the target is NOT reached', () => {
  const measurements = [m('2026-01-01', 75), m('2026-02-01', 60)]
  const p = measureGoalProgress(measurements, 'weight', 65)
  assert.equal(p.reached, false)
  assert.equal(p.percent, 100)
})

test('increasing goal: overshooting way past the target is NOT reached (100kg goal, 150kg logged)', () => {
  const measurements = [m('2026-01-01', 90), m('2026-02-01', 150)]
  const p = measureGoalProgress(measurements, 'weight', 100)
  assert.equal(p.reached, false)
  assert.equal(p.percent, 100)
})

test('increasing goal: partway there', () => {
  const measurements = [m('2026-01-01', 30, 'biceps'), m('2026-02-01', 34, 'biceps')]
  const p = measureGoalProgress(measurements, 'biceps', 38)
  assert.equal(p.percent, 50)
  assert.equal(p.reached, false)
})

test('target equal to baseline: reached only on exact match', () => {
  const measurements = [m('2026-01-01', 70)]
  assert.equal(measureGoalProgress(measurements, 'weight', 70).reached, true)
  assert.equal(measureGoalProgress(measurements, 'weight', 70).percent, 100)

  const stillOff = measureGoalProgress([m('2026-01-01', 70), m('2026-02-01', 68)], 'weight', 70)
  assert.equal(stillOff.reached, false)
  assert.equal(stillOff.percent, 0)
})

test('only looks at the requested type', () => {
  const measurements = [m('2026-01-01', 75, 'weight'), m('2026-01-01', 90, 'waist')]
  const p = measureGoalProgress(measurements, 'weight', 65)
  assert.equal(p.baseline, 75)
})
