import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isCardioExercise, countsAsReps, repUnitFor } from '../../src/lib/exerciseTree.js'
import { formatSet } from '../../src/lib/setFormat.js'
import { normalizeTime, timeFromDigits } from '../../src/lib/timeFormat.js'
import { sessionVolume, computeOverallStats, bestE1rmByExercise, computePersonalRecords } from '../../src/lib/planUtils.js'
import base from '../../src/data/exercisesBase.json' with { type: 'json' }
import bulk from '../../src/data/exercisesBulk.json' with { type: 'json' }

const CARDIO = ['running', 'rowing', 'jump_rope', 'stationary_bike', 'walking', 'ex_cycle_cross_trainer', 'ex_ski_ergometer']

test('every exercise declares a unit, and only cardio and carries use metres', () => {
  for (const e of [...base, ...bulk]) {
    assert.ok(e.repUnit === 'reps' || e.repUnit === 'm', `${e.id} has repUnit ${e.repUnit}`)
    if (e.kind === 'cardio') assert.equal(e.repUnit, 'm', `${e.id} cardio must use metres`)
  }
  assert.deepEqual([...base, ...bulk].filter((e) => e.kind === 'cardio').map((e) => e.id).sort(), [...CARDIO].sort())
  assert.deepEqual([...base, ...bulk].filter((e) => e.repUnit === 'm' && e.kind !== 'cardio').map((e) => e.id), ['farmers_carry'])
})

test('cardio refs are recognised through equipment and variant segments', () => {
  assert.equal(isCardioExercise('running|machine|'), true)
  assert.equal(isCardioExercise('bench_press|barbell|flat'), false)
  assert.equal(isCardioExercise('farmers_carry||'), false)
  assert.equal(repUnitFor('farmers_carry||'), 'm')
})

test('only rep-counted exercises count as reps', () => {
  assert.equal(countsAsReps('bench_press|barbell|flat'), true)
  assert.equal(countsAsReps('running|machine|'), false)
  assert.equal(countsAsReps('farmers_carry||'), false)
})

test('set lines per type', () => {
  assert.equal(formatSet({ weight: '60', reps: '8' }, 'bench_press|barbell|flat'), '60 kg × 8')
  assert.equal(formatSet({ weight: '', reps: '8' }, 'push_up|bodyweight|'), '– × 8')
  assert.equal(formatSet({ weight: '40', reps: '50' }, 'farmers_carry||'), '40 kg × 50 m')
  assert.equal(formatSet({ reps: '5000', time: '25:00' }, 'running|machine|'), '5000 m · 25:00')
  assert.equal(formatSet({ reps: '', time: '1:45' }, 'rowing||'), '1:45')
  assert.equal(formatSet({ reps: '5000', time: '25' }, 'running|machine|'), '5000 m · 25:00', 'plain minutes from before mm:ss')
  assert.equal(formatSet({ reps: '', time: '1.5' }, 'jump_rope||'), '1:30')
  assert.equal(formatSet({ reps: '5000' }, 'rowing||'), '5000 m')
  assert.equal(formatSet({}, 'running||'), '–')
})

test('stopwatch entry fills digits from the right', () => {
  assert.equal(timeFromDigits(''), '')
  assert.equal(timeFromDigits('0'), '')
  assert.equal(timeFromDigits('5'), '0:05')
  assert.equal(timeFromDigits('52'), '0:52')
  assert.equal(timeFromDigits('125'), '1:25')
  assert.equal(timeFromDigits('2500'), '25:00')
  assert.equal(timeFromDigits('9999'), '99:59')
  assert.equal(timeFromDigits('175'), '1:59', 'seconds clamp at 59')
  assert.equal(timeFromDigits('12345678'), '123:45', 'digits beyond five are dropped')
})

test('typing and backspacing in the field stays consistent', () => {
  let shown = ''
  for (const key of '1 2 5'.split(' ')) shown = timeFromDigits(shown + key)
  assert.equal(shown, '1:25')
  shown = timeFromDigits(shown.slice(0, -1))
  assert.equal(shown, '0:12')
})

test('normalizeTime accepts mm:ss, old minutes and rejects junk', () => {
  assert.equal(normalizeTime('25:00'), '25:00')
  assert.equal(normalizeTime('5:07'), '5:07')
  assert.equal(normalizeTime('25'), '25:00')
  assert.equal(normalizeTime(25), '25:00')
  assert.equal(normalizeTime('0'), '')
  assert.equal(normalizeTime(''), '')
  assert.equal(normalizeTime(undefined), '')
  assert.equal(normalizeTime('abc'), '')
  assert.equal(normalizeTime('1:75'), '')
})

const strength = { exerciseId: 'bench_press|barbell|flat', sets: [{ weight: '60', reps: '10' }] }
const run = { exerciseId: 'running|machine|', sets: [{ reps: '5000', time: '25' }, { weight: '', reps: '3000' }] }
const carry = { exerciseId: 'farmers_carry||', sets: [{ weight: '40', reps: '50' }] }
const withCardio = { id: 's1', date: '2026-10-01T10:00:00Z', duration: 3600, exercises: [strength, run, carry] }
const strengthOnly = { ...withCardio, exercises: [strength] }

test('metres never reach volume, rep totals or the 1RM maths', () => {
  assert.equal(sessionVolume(withCardio), sessionVolume(strengthOnly))
  assert.equal(sessionVolume(withCardio), 600)
  const a = computeOverallStats([withCardio])
  const b = computeOverallStats([strengthOnly])
  assert.equal(a.totalReps, 10)
  assert.equal(a.totalReps, b.totalReps)
  assert.equal(a.totalVolume, b.totalVolume)
})

test('cardio and carries produce no 1RM and no personal record', () => {
  const best = bestE1rmByExercise([withCardio])
  assert.deepEqual(Object.keys(best), ['bench_press|barbell|flat'])
  assert.deepEqual(computePersonalRecords([withCardio], 'en').map((r) => r.exerciseId), ['bench_press|barbell|flat'])
})

test('sets still count, cardio included', () => {
  assert.equal(computeOverallStats([withCardio]).totalSets, 4)
})
