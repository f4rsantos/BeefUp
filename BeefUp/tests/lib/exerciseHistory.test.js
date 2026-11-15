import { test } from 'node:test'
import assert from 'node:assert/strict'
import { exerciseHistory, pickTicks, valueScale, yearStarts } from '../../src/lib/exerciseHistory.js'

const set= (weight, reps= '8', type= 'normal') => ({ weight, reps, type })
const entry= (exerciseId, ...sets) => ({ exerciseId, sets })
const session= (date, ...exercises) => ({ id: date, date, exercises })

test('one point per day with the heaviest set, across variants and equipment', () => {
  const { kind, points }= exerciseHistory([
    session('2026-03-01', entry('bench_press|barbell|', set('60'), set('70'))),
    session('2026-03-01T18:00:00.000Z', entry('bench_press|dumbbell|incline', set('30'))),
    session('2026-03-05', entry('bench_press|barbell|', set('72.5'))),
  ], 'bench_press')
  assert.equal(kind, 'weight')
  assert.deepEqual(points.map((p) => [p.day, p.value]), [['2026-03-01', 70], ['2026-03-05', 72.5]])
  assert.deepEqual(points.map((p) => p.i), [0, 1])
})

test('keeps the set and the ref of the heaviest set for the tooltip', () => {
  const { points }= exerciseHistory([
    session('2026-03-01', entry('bench_press|barbell|', set('60', '10')), entry('bench_press|dumbbell|incline', set('80', '5'))),
  ], 'bench_press')
  assert.equal(points[0].ref, 'bench_press|dumbbell|incline')
  assert.equal(points[0].set.reps, '5')
})

test('ignores warmups, empty or zero weights and other exercises', () => {
  const { points }= exerciseHistory([
    session('2026-03-01', entry('bench_press|barbell|', set('100', '5', 'warmup'), set('', '10'), set('0', '10'))),
    session('2026-03-02', entry('squat|barbell|', set('120'))),
  ], 'bench_press')
  assert.deepEqual(points, [])
})

test('sorts days ascending whatever the session order', () => {
  const { points }= exerciseHistory([
    session('2026-04-01', entry('squat|barbell|', set('100'))),
    session('2026-01-01', entry('squat|barbell|', set('80'))),
    session('2026-02-01', entry('squat|barbell|', set('90'))),
  ], 'squat')
  assert.deepEqual(points.map((p) => p.value), [80, 90, 100])
})

test('cardio plots the longest distance in metres and skips sets without one', () => {
  const { kind, points }= exerciseHistory([
    session('2026-03-01',
      entry('running|treadmill|', { reps: '3000', time: '15:00' }, { reps: '5000', time: '25:00' }, { reps: '', time: '10:00' })),
  ], 'running')
  assert.equal(kind, 'distance')
  assert.deepEqual(points.map((p) => p.value), [5000])
})

test('a loaded carry still plots weight', () => {
  const { kind, points }= exerciseHistory([
    session('2026-03-01', entry('farmers_carry|dumbbell|', { weight: '40', reps: '50' })),
  ], 'farmers_carry')
  assert.equal(kind, 'weight')
  assert.equal(points[0].value, 40)
})

test('no history gives an empty list', () => {
  assert.deepEqual(exerciseHistory([], 'bench_press').points, [])
})

test('finds the years a history crosses', () => {
  const points= ['2025-11-01', '2025-12-01', '2026-01-10', '2026-02-01', '2027-01-01'].map((day, i) => ({ day, i }))
  assert.deepEqual(yearStarts(points), [2, 4])
  assert.deepEqual(yearStarts(points.slice(0, 2)), [])
})

test('picks few ticks but always the ends and the year changes', () => {
  const points= Array.from({ length: 40 }, (_, i) => ({ day: `${i < 25 ? 2025 : 2026}-01-01`, i }))
  const ticks= pickTicks(points)
  assert.ok(ticks.includes(0) && ticks.includes(39) && ticks.includes(25))
  assert.ok(ticks.length <= 7)
  assert.deepEqual(pickTicks(points.slice(0, 3)), [0, 1, 2])
})

test('value scale gives even round ticks that contain every point', () => {
  for (const values of [[60], [50, 80], [2000, 5000], [0.5, 1.5], [1000]]) {
    const { domain, ticks }= valueScale(values.map((value) => ({ value })))
    assert.ok(domain[0] <= Math.min(...values) && domain[1] >= Math.max(...values))
    assert.ok(ticks.length >= 3 && ticks.length <= 8)
    assert.equal(ticks[0], domain[0])
    assert.equal(ticks.at(-1), domain[1])
    const steps= new Set(ticks.slice(1).map((t, i) => Math.round((t - ticks[i]) * 100)))
    assert.equal(steps.size, 1)
  }
})
