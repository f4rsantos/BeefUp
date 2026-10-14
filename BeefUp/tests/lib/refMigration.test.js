import 'fake-indexeddb/auto'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { db, STORES } from '../../src/lib/db.js'
import { migrateExerciseRefs, canonicalClientData, REF_VERSION_SETTING } from '../../src/lib/refMigration.js'
import { isDirty } from '../../src/lib/sync/meta.js'

// Unknown variant ids are dropped even without aliases.
const OLD = 'bench_press|barbell|variante_apagada'
const NEW = 'bench_press|barbell|'

async function reset() {
  for (const store of Object.values(STORES)) await db.clear(store)
}

async function rawRow(store, key) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('beefup')
    open.onsuccess = () => {
      const req = open.result.transaction(store).objectStore(store).get(key)
      req.onsuccess = () => resolve(req.result)
      req.onerror = reject
    }
    open.onerror = reject
  })
}

test('rewrites sessions and workouts once, skipping prescribed rows', async () => {
  await reset()
  await db.put(STORES.sessions, { id: 's1', date: '2026-01-01', exercises: [{ id: 'e', exerciseId: OLD, sets: [] }] })
  await db.put(STORES.workouts, { id: 'w1', name: 'A', exercises: [{ ref: OLD }, 'squat|barbell|'] })
  await db.put(STORES.workouts, { id: 'w2', name: 'B', prescribedBy: 'trainer', exercises: [{ ref: OLD }] })

  assert.equal(await migrateExerciseRefs(1), 2)

  assert.equal((await db.get(STORES.sessions, 's1')).exercises[0].exerciseId, NEW)
  assert.deepEqual((await db.get(STORES.workouts, 'w1')).exercises, [{ ref: NEW }, 'squat|barbell|'])
  assert.equal((await db.get(STORES.workouts, 'w2')).exercises[0].ref, OLD)
  assert.ok(isDirty(await rawRow(STORES.sessions, 's1')), 'rewritten rows go up on the next sync')
  assert.equal(await db.getSetting(REF_VERSION_SETTING, 0), 1)

  await db.put(STORES.sessions, { id: 's2', date: '2026-01-02', exercises: [{ id: 'e', exerciseId: OLD, sets: [] }] })
  assert.equal(await migrateExerciseRefs(1), 0, 'same version does not run again')
  assert.equal((await db.get(STORES.sessions, 's2')).exercises[0].exerciseId, OLD)
})

test('linked student data is canonical in memory, untouched when nothing changes', () => {
  const data = { sessions: [{ id: 's', exercises: [{ exerciseId: OLD }] }], workouts: [{ id: 'w', exercises: [OLD] }], foodLog: [1] }
  const next = canonicalClientData(data)
  assert.equal(next.sessions[0].exercises[0].exerciseId, NEW)
  assert.deepEqual(next.workouts[0].exercises, [NEW])
  assert.equal(next.foodLog, data.foodLog)

  const clean = { sessions: [{ id: 's', exercises: [{ exerciseId: NEW }] }] }
  assert.equal(canonicalClientData(clean).sessions[0], clean.sessions[0])
})
