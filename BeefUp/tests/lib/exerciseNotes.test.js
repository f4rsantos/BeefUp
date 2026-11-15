import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  lastExerciseNote,
  buildExerciseEntry,
  sessionExerciseFromEntry,
  templateItemFromEntry,
} from '../../src/lib/planUtils.js'

const REF= 'bench_press|barbell|'
const EX= { id: REF, name: 'Bench Press', namePt: 'Supino', defaultSets: 3, defaultWeight: 0, defaultReps: 10 }
const session= (date, note, extra= {}) => ({
  id: date,
  date,
  exercises: [{ exerciseId: REF, note, sets: [{ weight: '60', reps: '8' }], ...extra }],
})
const item= (note) => ({ ref: REF, ...(note ? { note } : {}) })

test('a note cleared in the last session does not come back from an older one', () => {
  const sessions= [session('2026-01-01', 'keep elbows in'), session('2026-02-01', '', { clearedNote: 'keep elbows in' })]
  assert.deepEqual(lastExerciseNote(sessions, REF), { note: '', cleared: 'keep elbows in' })
  assert.equal(buildExerciseEntry(EX, [], lastExerciseNote(sessions, REF)).note, '')
})

test('a template note cleared during a workout stays cleared next time', () => {
  const started= buildExerciseEntry(EX, [], null, item('slow tempo'))
  assert.equal(started.note, 'slow tempo')
  const saved= sessionExerciseFromEntry({ ...started, note: '', sets: [{ weight: '60', reps: '8', done: true }] })
  assert.equal(saved.clearedNote, 'slow tempo')
  const next= buildExerciseEntry(EX, [], lastExerciseNote([{ date: '2026-03-01', exercises: [saved] }], REF), item('slow tempo'))
  assert.equal(next.note, '')
})

test('a new template note shows even after an older note was cleared', () => {
  const sessions= [session('2026-02-01', '', { clearedNote: 'slow tempo' })]
  assert.equal(buildExerciseEntry(EX, [], lastExerciseNote(sessions, REF), item('pause at the chest')).note, 'pause at the chest')
})

test('the template note is used when there is no history', () => {
  assert.equal(buildExerciseEntry(EX, [], null, item('slow tempo')).note, 'slow tempo')
  assert.equal(buildExerciseEntry(EX, [], null, item()).note, '')
})

test('the last session note carries over while it is kept', () => {
  const sessions= [session('2026-02-01', 'left shoulder tight')]
  assert.equal(buildExerciseEntry(EX, [], lastExerciseNote(sessions, REF), item('slow tempo')).note, 'left shoulder tight')
})

test('a session without a note field gives no history', () => {
  const sessions= [{ date: '2026-01-01', exercises: [{ exerciseId: REF, sets: [] }] }]
  assert.equal(lastExerciseNote(sessions, REF), null)
})

test('clearing a note saves it as cleared, keeping an edited note as is', () => {
  const done= [{ weight: '60', reps: '8', done: true }]
  assert.equal(sessionExerciseFromEntry({ exerciseId: REF, note: '  ', startNote: 'a', sets: done }).clearedNote, 'a')
  const edited= sessionExerciseFromEntry({ exerciseId: REF, note: 'b', startNote: 'a', sets: done })
  assert.equal(edited.note, 'b')
  assert.equal('clearedNote' in edited, false)
})

test('updating the template with an empty note removes the note', () => {
  const updated= templateItemFromEntry({ exerciseId: REF, note: '', barType: '' }, { ref: REF, note: 'old', weight: '50' })
  assert.deepEqual(updated, { ref: REF, weight: '50' })
})

test('set types carry over by position and new sets start normal', () => {
  const last= [{ weight: '40', reps: '10', type: 'warmup' }, { weight: '60', reps: '8', type: 'normal' }]
  const sets= buildExerciseEntry({ ...EX, defaultSets: 4 }, last).sets
  assert.deepEqual(sets.map((s) => s.type), ['warmup', undefined, undefined, undefined])
  assert.deepEqual(sets.map((s) => s.weight), ['40', '60', '60', '60'])
})

test('a saved session keeps set types and the exercise note', () => {
  const entry= buildExerciseEntry(EX, [{ weight: '40', reps: '10', type: 'dropset' }], null, item('slow tempo'))
  const saved= sessionExerciseFromEntry({ ...entry, sets: entry.sets.map((s) => ({ ...s, done: true })) })
  assert.equal(saved.note, 'slow tempo')
  assert.equal(saved.sets[0].type, 'dropset')
})
