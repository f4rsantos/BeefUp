import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  canonicalRef,
  resolveExercise,
  getVariantGroups,
  getBaseExercise,
  parseExerciseRef,
  registerCustomExercises,
  VARIANT_GROUPS,
} from '../../src/lib/exerciseTree.js'
import base from '../../src/data/exercisesBase.json' with { type: 'json' }
import bulk from '../../src/data/exercisesBulk.json' with { type: 'json' }
import aliases from '../../src/data/variantAliases.json' with { type: 'json' }
import before from '../fixtures/variantIds-2026-10-13.json' with { type: 'json' }

const ALL = [...base, ...bulk]

test('every variant id that existed on 2026-10-13 still resolves', () => {
  for (const [baseId, { equipment, variants }] of Object.entries(before)) {
    assert.ok(getBaseExercise(baseId), `${baseId} disappeared`)
    for (const eq of equipment) {
      for (const id of variants) {
        const ref = canonicalRef(`${baseId}|${eq}|${id}`)
        const parsed = parseExerciseRef(ref)
        const current = getBaseExercise(parsed.baseId)
        assert.ok(current, `${baseId}|${eq}|${id} -> unknown base ${parsed.baseId}`)
        assert.ok(current.equipment.includes(parsed.equipmentId), `${baseId}|${eq}|${id} -> unknown equipment ${parsed.equipmentId}`)
        for (const v of parsed.variantId ? parsed.variantId.split('+') : []) {
          assert.ok(current.variants.some((x) => x.id === v), `${baseId}|${eq}|${id} -> unknown variant ${v}`)
        }
        assert.ok(resolveExercise(ref), ref)
      }
    }
  }
})

test('canonicalRef is idempotent on every old ref', () => {
  for (const [baseId, { equipment, variants }] of Object.entries(before)) {
    for (const id of variants) {
      const once = canonicalRef(`${baseId}|${equipment[0]}|${id}`)
      assert.equal(canonicalRef(once), once)
    }
  }
})

test('catalog rules: known groups, one default per group, unique names per exercise', () => {
  for (const ex of ALL) {
    const seen = new Set()
    const defaults = {}
    for (const v of ex.variants ?? []) {
      assert.ok(VARIANT_GROUPS.includes(v.group), `${ex.id}/${v.id} group ${v.group}`)
      if (v.default) {
        assert.ok(!defaults[v.group], `${ex.id} two defaults in ${v.group}`)
        defaults[v.group] = true
      }
      assert.ok(!seen.has(v.namePt), `${ex.id} repeats "${v.namePt}"`)
      seen.add(v.namePt)
      assert.ok(!v.id.includes('+') && !v.id.includes('|'), `${ex.id}/${v.id} bad id`)
    }
  }
})

test('every alias points at real variants and equipment', () => {
  for (const [baseId, map] of Object.entries(aliases.bases ?? {})) {
    assert.ok(getBaseExercise(baseId), `alias for unknown ${baseId}`)
    for (const [oldId, { to, equipment, base: target }] of Object.entries(map)) {
      const ex = getBaseExercise(target ?? baseId)
      assert.ok(ex, `${baseId}/${oldId} -> unknown base ${target}`)
      assert.ok(Array.isArray(to), `${baseId}/${oldId} needs "to"`)
      for (const id of to) assert.ok(ex.variants.some((v) => v.id === id), `${baseId}/${oldId} -> ${id}`)
      if (equipment) assert.ok(ex.equipment.includes(equipment), `${baseId}/${oldId} -> ${equipment}`)
    }
  }
})

test('groups: one pick per group, defaults dropped, ids in group order', () => {
  registerCustomExercises([{
    id: 'custom_test_press',
    name: 'Test press',
    namePt: 'Press de teste',
    bodyPart: 'chest',
    equipment: ['barbell', 'dumbbell'],
    variants: [
      { id: 'unilateral', name: 'Single-arm', namePt: 'Unilateral', group: 'side' },
      { id: 'flat', name: 'Flat', namePt: 'Reto', group: 'angle', default: true },
      { id: 'incline', name: 'Incline', namePt: 'Inclinado', group: 'angle' },
      { id: 'decline', name: 'Decline', namePt: 'Declinado', group: 'angle' },
      { id: 'neutral', name: 'Neutral grip', namePt: 'Pega neutra', group: 'grip', equipmentOnly: ['dumbbell'] },
    ],
  }])
  try {
    assert.equal(canonicalRef('custom_test_press|dumbbell|unilateral+neutral+incline'), 'custom_test_press|dumbbell|incline+neutral+unilateral')
    assert.equal(canonicalRef('custom_test_press|barbell|flat'), 'custom_test_press|barbell|')
    assert.equal(canonicalRef('custom_test_press|barbell|incline+decline'), 'custom_test_press|barbell|incline')
    assert.equal(canonicalRef('custom_test_press|barbell|gone+incline'), 'custom_test_press|barbell|incline')
    assert.equal(resolveExercise('custom_test_press|dumbbell|unilateral+incline').namePt, 'Press de teste inclinado unilateral (halteres)')

    const groups = getVariantGroups('custom_test_press', 'barbell')
    assert.deepEqual(groups.map((g) => g.group), ['angle', 'side'])
    assert.equal(groups[0].defaultOption.id, 'flat')
    assert.deepEqual(groups[0].options.map((v) => v.id), ['incline', 'decline'])
  } finally {
    registerCustomExercises([])
  }
})

test('refs without variants or with unknown bases are left untouched', () => {
  assert.equal(canonicalRef('squat'), 'squat')
  assert.equal(canonicalRef('squat|barbell|'), 'squat|barbell|')
  assert.equal(canonicalRef('ext:remo_maquina||'), 'ext:remo_maquina||')
})

test('an alias can move a ref to another exercise and fix its equipment', () => {
  registerCustomExercises([
    { id: 'old_ex', name: 'Old', namePt: 'Antigo', bodyPart: 'waist', equipment: ['band', 'bodyweight'], variants: [
      { id: 'kept', name: 'Kept', namePt: 'Mantido', group: 'type' },
      { id: 'moved', name: 'Moved', namePt: 'Movido', group: 'type' },
    ] },
    { id: 'new_ex', name: 'New', namePt: 'Novo', bodyPart: 'waist', equipment: ['bodyweight'], variants: [] },
  ])
  try {
    // Aliases are read from the data file, so the move is exercised through the real alias map shape.
    const map = aliases.bases ?? {}
    const had = map.old_ex
    map.old_ex = { moved: { base: 'new_ex', to: [] } }
    aliases.bases = map
    assert.equal(canonicalRef('old_ex|band|moved'), 'new_ex|bodyweight|')
    assert.equal(canonicalRef('old_ex|bodyweight|moved+kept'), 'new_ex|bodyweight|')
    assert.equal(canonicalRef('old_ex|band|kept'), 'old_ex|band|kept')
    if (had) map.old_ex = had
    else delete map.old_ex
  } finally {
    registerCustomExercises([])
  }
})
