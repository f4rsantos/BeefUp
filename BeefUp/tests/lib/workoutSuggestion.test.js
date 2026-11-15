import { test } from 'node:test'
import assert from 'node:assert/strict'
import { focusOptions, suggestWorkout, suggestionReadiness } from '../../src/lib/workoutSuggestion.js'

const TODAY= '2026-06-15'
const BENCH= 'bench_press|barbell|'
const BENCH_DB= 'bench_press|dumbbell|'
const FLY= 'chest_fly|dumbbell|'
const PUSH_UP= 'push_up|body_weight|'
const TRICEP= 'tricep_extension|cable|'
const SVEND= 'ex_svend_press|plate|'
const SQUAT= 'squat|barbell|'
const LUNGE= 'lunge|dumbbell|'
const LEG_PRESS= 'leg_press|machine|'
const ROW= 'row|barbell|'
const PULL_UP= 'pull_up|body_weight|'
const PULLDOWN= 'lat_pulldown|cable|'
const RUN= 'running|treadmill|'

const daysAgo= (n) => {
  const date= new Date(Date.UTC(2026, 5, 15 - n))
  return date.toISOString().slice(0, 10)
}
const entry= (ref, type= 'normal') => ({
  exerciseId: ref,
  barType: ref.includes('|barbell|') ? 'olympic' : '',
  sets: ref.startsWith('running') ? [{ reps: '3000', time: '15:00', type }] : [{ weight: '50', reps: '8', type }],
})
const session= (ago, ...refs) => ({ id: `s${ago}`, date: daysAgo(ago), exercises: refs.map((ref) => (typeof ref === 'string' ? entry(ref) : ref)) })
const refs= (suggestion) => suggestion.items.map((item) => item.ref)

test('needs ten trained sessions and says how many are missing', () => {
  const few= [session(1, BENCH), session(3, SQUAT), session(5, ROW), { id: 'empty', date: daysAgo(6), exercises: [] }]
  assert.deepEqual(suggestionReadiness(few), { ready: false, missing: 7 })
  const ten= Array.from({ length: 10 }, (_, i) => session(i + 1, BENCH))
  assert.deepEqual(suggestionReadiness(ten), { ready: true, missing: 0 })
})

test('offers body parts that were the focus three times, most overdue first', () => {
  const sessions= [
    session(1, BENCH, FLY), session(8, BENCH, FLY), session(15, BENCH, FLY),
    session(6, SQUAT, LUNGE), session(9, SQUAT, LUNGE), session(12, SQUAT, LUNGE),
    session(2, ROW), session(4, ROW),
  ]
  const options= focusOptions(sessions, TODAY)
  assert.deepEqual(options.map((o) => o.bodyPart), ['upper legs', 'chest'])
  assert.equal(options[0].daysSince, 6)
})

test('a part trained long ago is offered but never proposed first', () => {
  const sessions= [
    session(300, ROW), session(307, ROW), session(314, ROW),
    session(1, BENCH), session(3, BENCH), session(5, BENCH),
  ]
  assert.deepEqual(focusOptions(sessions, TODAY).map((o) => o.bodyPart), ['chest', 'back'])
})

test('the focus is the part with most exercises; warmup-only exercises and cardio do not count', () => {
  const sessions= [
    session(1, BENCH, FLY, TRICEP, RUN, entry(SQUAT, 'warmup'), entry(LUNGE, 'warmup'), entry(LEG_PRESS, 'warmup')),
    session(4, BENCH, FLY, TRICEP), session(7, BENCH, FLY, TRICEP),
  ]
  assert.deepEqual(focusOptions(sessions, TODAY).map((o) => o.bodyPart), ['chest'])
})

test('suggests the usual exercises in the usual order, main group first, then the companion', () => {
  const sessions= [
    session(2, BENCH, FLY, TRICEP), session(9, BENCH, FLY, TRICEP), session(16, BENCH, FLY, TRICEP), session(23, BENCH, FLY, TRICEP),
  ]
  const suggestion= suggestWorkout(sessions, 'chest', TODAY)
  assert.equal(suggestion.companion, 'upper arms')
  assert.deepEqual(refs(suggestion), [BENCH, FLY, TRICEP])
  assert.equal(suggestion.items[0].barType, 'olympic')
})

test('the companion needs to be in a third of those workouts, otherwise the main group goes alone', () => {
  const alone= [session(2, BENCH, FLY), session(9, BENCH, FLY), session(16, BENCH, FLY), session(23, BENCH, FLY, TRICEP)]
  assert.equal(suggestWorkout(alone, 'chest', TODAY).companion, null)
  assert.deepEqual(refs(suggestWorkout(alone, 'chest', TODAY)), [BENCH, FLY])
  const third= [session(2, BENCH, FLY), session(9, BENCH, FLY), session(16, BENCH, FLY, TRICEP)]
  assert.equal(suggestWorkout(third, 'chest', TODAY).companion, 'upper arms')
})

test('counts the exact exercise, and keeps one version per base', () => {
  const sessions= [
    session(2, BENCH_DB, FLY), session(9, BENCH_DB, FLY), session(16, BENCH_DB, FLY), session(23, BENCH_DB, FLY), session(30, BENCH, FLY),
  ]
  const list= refs(suggestWorkout(sessions, 'chest', TODAY))
  assert.deepEqual(list, [BENCH_DB, FLY])
})

test('rotates the last slot to an exercise that was not in the last workout', () => {
  const sessions= [
    session(2, BENCH, FLY, SVEND), session(9, BENCH, FLY, PUSH_UP), session(16, BENCH, FLY, SVEND),
    session(23, BENCH, FLY, PUSH_UP), session(30, BENCH, FLY, SVEND),
  ]
  const list= refs(suggestWorkout(sessions, 'chest', TODAY))
  assert.equal(list.length, 3)
  assert.deepEqual(list.slice(0, 2), [BENCH, FLY])
  assert.equal(list[2], PUSH_UP)
  const after= [session(0, ...list), ...sessions]
  assert.equal(refs(suggestWorkout(after, 'chest', TODAY))[2], SVEND)
})

test('with no other candidate the list simply repeats', () => {
  const sessions= [session(2, BENCH, FLY), session(9, BENCH, FLY), session(16, BENCH, FLY)]
  assert.deepEqual(refs(suggestWorkout(sessions, 'chest', TODAY)), [BENCH, FLY])
})

test('alternates between two regular versions of an exercise, but never on the first one', () => {
  const sessions= [
    session(2, BENCH, 'chest_fly|cable|'), session(9, BENCH_DB, FLY), session(16, BENCH, 'chest_fly|cable|'), session(23, BENCH_DB, FLY),
  ]
  const list= refs(suggestWorkout(sessions, 'chest', TODAY))
  assert.equal(list[0], BENCH)
  assert.equal(list[1], FLY)
})

test('adds the usual cardio at the end when it is in most recent workouts', () => {
  const withCardio= Array.from({ length: 10 }, (_, i) => (i < 7 ? session(i * 2 + 1, BENCH, FLY, RUN) : session(i * 2 + 1, BENCH, FLY)))
  assert.equal(refs(suggestWorkout(withCardio, 'chest', TODAY)).at(-1), RUN)
  const rare= Array.from({ length: 10 }, (_, i) => (i < 3 ? session(i * 2 + 1, BENCH, FLY, RUN) : session(i * 2 + 1, BENCH, FLY)))
  assert.ok(!refs(suggestWorkout(rare, 'chest', TODAY)).includes(RUN))
})

test('the same history always gives the same suggestion', () => {
  const sessions= [
    session(2, ROW, PULL_UP, PULLDOWN), session(9, ROW, PULLDOWN, PULL_UP), session(16, ROW, PULL_UP), session(23, PULLDOWN, ROW),
  ]
  const a= suggestWorkout(sessions, 'back', TODAY)
  const b= suggestWorkout([...sessions].reverse(), 'back', TODAY)
  assert.deepEqual(a, b)
})

test('a body part with no history gives nothing', () => {
  assert.equal(suggestWorkout([session(1, BENCH)], 'back', TODAY), null)
})
