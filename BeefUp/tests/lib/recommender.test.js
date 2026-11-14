import { test } from 'node:test'
import assert from 'node:assert/strict'
import { recommendExercises } from '../../src/lib/recommender.js'
import { parseExerciseRef, listBaseExercises } from '../../src/lib/exerciseTree.js'

const groupOf = (ref) => listBaseExercises().find((b) => b.id === parseExerciseRef(ref).baseId)?.muscleGroup

test('suggests the same muscle group as the workout', () => {
  const [top] = recommendExercises({ currentRefs: ['bench_press|barbell|reto'] })
  assert.equal(groupOf(top.ref), 'chest')
  const [legs] = recommendExercises({ currentRefs: ['squat|barbell|', 'leg_press|machine|'] })
  assert.equal(groupOf(legs.ref), 'upper legs')
})

test('never suggests an exercise already in the workout', () => {
  const current = ['bench_press|barbell|reto', 'chest_fly|cable|', 'push_up|bodyweight|']
  const recs = recommendExercises({ currentRefs: current, limit: 20 })
  const currentBases = current.map((r) => parseExerciseRef(r).baseId)
  assert.ok(recs.every((r) => !currentBases.includes(r.baseId)))
})

test('a removed suggestion is excluded and its muscle group is penalised', () => {
  const current = ['bench_press|barbell|reto']
  const before = recommendExercises({ currentRefs: current, limit: 20 })
  const rejected = before[0]
  const after = recommendExercises({ currentRefs: current, rejectedRefs: [rejected.ref], limit: 20 })
  assert.ok(!after.some((r) => r.baseId === rejected.baseId))
  const second = before[1]
  const secondAfter = after.find((r) => r.baseId === second.baseId)
  assert.ok(secondAfter.score < second.score, 'same-group candidates lose score')
})

test('trainer-prescribed exercises get a boost and keep the trainer ref', () => {
  const current = ['bench_press|barbell|reto']
  const plain = recommendExercises({ currentRefs: current, limit: 50 }).find((r) => r.baseId === 'dip')
  const workouts = [{ id: 'w1', prescribedBy: 'trainer-1', exercises: [{ ref: 'dip|rings|' }] }]
  const boosted = recommendExercises({ currentRefs: current, workouts, limit: 50 }).find((r) => r.baseId === 'dip')
  assert.ok(boosted.score > plain.score)
  assert.equal(boosted.ref, 'dip|rings|')
  assert.equal(boosted.reason.type, 'trainer')
})

test('non-prescribed workouts give no trainer boost', () => {
  const current = ['bench_press|barbell|reto']
  const workouts = [{ id: 'w1', exercises: [{ ref: 'dip|rings|' }] }]
  const rec = recommendExercises({ currentRefs: current, workouts, limit: 50 }).find((r) => r.baseId === 'dip')
  assert.notEqual(rec.reason.type, 'trainer')
})

test('reuses the equipment the user last logged for that exercise', () => {
  const sessions = [{ date: '2026-01-01', exercises: [{ exerciseId: 'chest_fly|machine|' }] }]
  const rec = recommendExercises({ currentRefs: ['bench_press|barbell|reto'], sessions, limit: 50 }).find((r) => r.baseId === 'chest_fly')
  assert.equal(rec.ref, 'chest_fly|machine|')
})

test('exercises often done together get a boost', () => {
  const current = ['bench_press|barbell|reto']
  const sessions = Array.from({ length: 4 }, (_, i) => ({
    date: `2026-01-0${i + 1}`,
    exercises: [{ exerciseId: 'bench_press|barbell|reto' }, { exerciseId: 'tricep_extension|cable|' }],
  }))
  const plain = recommendExercises({ currentRefs: current, limit: 50 }).find((r) => r.baseId === 'tricep_extension')
  const paired = recommendExercises({ currentRefs: current, sessions, limit: 50 }).find((r) => r.baseId === 'tricep_extension')
  assert.ok(paired.score > plain.score)
})

test('cardio stays with cardio', () => {
  const recs = recommendExercises({ currentRefs: ['running'], limit: 5 })
  assert.ok(recs.length > 0)
  assert.ok(recs.every((r) => ['cardio', 'cardio'].includes(groupOf(r.ref)) || r.ref.includes('cardio_machine')))
  const strength = recommendExercises({ currentRefs: ['bench_press|barbell|reto'], limit: 50 })
  assert.ok(strength.every((r) => groupOf(r.ref) !== 'cardio'))
})

test('empty workout favours muscle groups not trained this week', () => {
  const today = new Date().toISOString()
  const sessions = [{ date: today, exercises: [{ exerciseId: 'bench_press|barbell|reto' }] }]
  const [top] = recommendExercises({ sessions })
  assert.notEqual(groupOf(top.ref), 'chest')
})
