import { listBaseExercises, parseExerciseRef, canonicalRef, buildExerciseRef, getEquipmentOptions, BAR_TYPES } from './exerciseTree.js'
import { lastUsedChoice, isPrescribed } from './planUtils.js'
import { recentSessions } from './muscles.js'

// Rule-based "what should I do next?" for the active workout. No ML: every
// candidate base exercise gets a score from a few weighted signals and the
// best one wins. Weights live here so they're easy to tune in one place.
export const WEIGHTS = {
  sameGroup: 10,     // × share of the session already in this muscle group
  related: 3,        // its target is a secondary muscle of something in the session
  repeatTarget: -0.75, // per session exercise already hitting the same target (variety)
  trainer: 4,        // appears in a trainer-prescribed workout
  familiar: 1.5,     // logged before at least once
  pairsPerHit: 0.5,  // per past session where it was done alongside a current exercise
  pairsMax: 3,
  rejectedTarget: -3, // per removed suggestion with the same target
  rejectedGroup: -1.5, // per removed suggestion with the same muscle group
  untrainedGroup: 5, // empty session: group not trained in the last 7 days
  similar: 4,        // × best muscle-overlap (Jaccard) with a session exercise
  staple: 1.5,       // curated library entry rather than a bulk-imported `ex_*` one
}

// When the user never logged an exercise, prefer the common gym setup over
// whatever sorts first alphabetically ("band").
const EQUIPMENT_PREFERENCE = ['dumbbell', 'barbell', 'machine', 'cable', 'bodyweight', 'smith_machine', 'kettlebell']

const CARDIO = 'cardio'
const norm = (s) => String(s ?? '').toLowerCase()

// Cardio machines are tagged with odd muscle groups (ski erg = "upper arms"),
// so treat anything that only runs on one as cardio too.
function isCardioBase(base) {
  return norm(base.muscleGroup) === CARDIO || (base.equipment?.length > 0 && base.equipment.every((e) => e === 'cardio_machine'))
}

function baseOf(ref) {
  return parseExerciseRef(canonicalRef(ref)).baseId
}

function muscleSet(base) {
  return new Set([base.target, base.muscleGroup, ...(base.secondaryMuscles ?? [])].map(norm).filter(Boolean))
}

function jaccard(a, b) {
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  const union = a.size + b.size - inter
  return union ? inter / union : 0
}

function countBy(items, key) {
  const out = {}
  for (const it of items) {
    const k = key(it)
    if (k) out[k] = (out[k] ?? 0) + 1
  }
  return out
}

// Trainer refs keyed by base id: first prescribed ref wins, so we can add the
// exact equipment/variant the trainer chose.
function trainerRefs(workouts) {
  const out = {}
  for (const w of workouts ?? []) {
    if (!isPrescribed(w)) continue
    for (const item of w.exercises ?? []) {
      const ref = typeof item === 'string' ? item : item?.ref
      if (!ref) continue
      const id = baseOf(ref)
      if (id && !out[id]) out[id] = { ref: canonicalRef(ref), barType: item?.barType ?? '' }
    }
  }
  return out
}

// How often each base was logged in the same session as any of `currentIds`.
function pairCounts(sessions, currentIds) {
  const out = {}
  if (currentIds.size === 0) return out
  for (const s of sessions ?? []) {
    const ids = new Set((s.exercises ?? []).map((e) => baseOf(e.exerciseId)))
    if (![...ids].some((id) => currentIds.has(id))) continue
    for (const id of ids) if (!currentIds.has(id)) out[id] = (out[id] ?? 0) + 1
  }
  return out
}

function equipmentUsage(sessions) {
  const out = {}
  for (const s of sessions ?? []) {
    for (const e of s.exercises ?? []) {
      const { equipmentId } = parseExerciseRef(canonicalRef(e.exerciseId))
      if (equipmentId) out[equipmentId] = (out[equipmentId] ?? 0) + 1
    }
  }
  return out
}

// Trainer's exact ref > the user's last combination > the equipment the user
// logs most > a sensible default order.
function pickRef(base, sessions, trainer, usage) {
  if (trainer[base.id]) return trainer[base.id]
  const last = lastUsedChoice(sessions ?? [], base.id)
  if (last) return { ref: canonicalRef(buildExerciseRef(base.id, last.equipmentId, last.variantId)), barType: last.barType ?? '' }
  const options = getEquipmentOptions(base.id).map((eq) => eq.id)
  const rank = (id) => {
    const i = EQUIPMENT_PREFERENCE.indexOf(id)
    return i === -1 ? EQUIPMENT_PREFERENCE.length : i
  }
  // A "weighted" option means the movement is bodyweight at heart (push-up, dip).
  const equipmentId = options.includes('bodyweight') && options.includes('weighted')
    ? 'bodyweight'
    : [...options].sort((a, b) => (usage[b] ?? 0) - (usage[a] ?? 0) || rank(a) - rank(b))[0] ?? base.equipment?.[0] ?? ''
  return { ref: canonicalRef(buildExerciseRef(base.id, equipmentId, '')), barType: equipmentId === 'barbell' ? BAR_TYPES[0].id : '' }
}

/**
 * @param {object} opts
 * @param {string[]} opts.currentRefs   exercise refs already in the active workout
 * @param {string[]} [opts.rejectedRefs] suggestions the user removed this workout
 * @param {object[]} [opts.sessions]     completed session history
 * @param {object[]} [opts.workouts]     workout definitions (prescribed ones get a boost)
 * @param {object[]} [opts.catalog]      base exercises, defaults to the full library
 * @param {number}   [opts.limit]
 * @returns {{ ref: string, barType: string, baseId: string, score: number, reason: { type: string, muscle?: string } }[]}
 */
export function recommendExercises({
  currentRefs = [],
  rejectedRefs = [],
  sessions = [],
  workouts = [],
  catalog = listBaseExercises(),
  limit = 3,
} = {}) {
  const byId = Object.fromEntries(catalog.map((b) => [b.id, b]))
  const current = currentRefs.map(baseOf).map((id) => byId[id]).filter(Boolean)
  const currentIds = new Set(current.map((b) => b.id))
  const rejected = rejectedRefs.map(baseOf).map((id) => byId[id]).filter(Boolean)
  const rejectedIds = new Set(rejected.map((b) => b.id))

  const groupCount = countBy(current, (b) => norm(b.muscleGroup))
  const targetCount = countBy(current, (b) => norm(b.target))
  const related = new Set(current.flatMap((b) => (b.secondaryMuscles ?? []).map(norm)))
  const currentMuscles = current.map(muscleSet)
  const rejTarget = countBy(rejected, (b) => norm(b.target))
  const rejGroup = countBy(rejected, (b) => norm(b.muscleGroup))
  const focusIsCardio = current.length > 0 && current.every(isCardioBase)

  const trainer = trainerRefs(workouts)
  const pairs = pairCounts(sessions, currentIds)
  const usage = equipmentUsage(sessions)
  const everLogged = new Set((sessions ?? []).flatMap((s) => (s.exercises ?? []).map((e) => baseOf(e.exerciseId))))

  // Empty workout: lean toward muscle groups that haven't had work this week.
  const recentGroups = new Set()
  if (current.length === 0) {
    for (const s of recentSessions(sessions ?? [], 7)) {
      for (const e of s.exercises ?? []) {
        const b = byId[baseOf(e.exerciseId)]
        if (b) recentGroups.add(norm(b.muscleGroup))
      }
    }
  }

  const scored = []
  for (const base of catalog) {
    if (currentIds.has(base.id) || rejectedIds.has(base.id)) continue
    const group = norm(base.muscleGroup)
    const target = norm(base.target)
    if (isCardioBase(base) !== focusIsCardio) continue

    const parts = []
    const add = (type, value, muscle) => {
      if (value) parts.push({ type, value, muscle })
    }

    if (current.length > 0) {
      add('focus', WEIGHTS.sameGroup * ((groupCount[group] ?? 0) / current.length), base.muscleGroup)
      if (related.has(target) || related.has(group)) add('related', WEIGHTS.related, base.target)
      const sim = Math.max(...currentMuscles.map((m) => jaccard(m, muscleSet(base))))
      add('similar', WEIGHTS.similar * sim, base.target)
      add('variety', WEIGHTS.repeatTarget * (targetCount[target] ?? 0))
    } else if (!recentGroups.has(group)) {
      add('fresh', WEIGHTS.untrainedGroup, base.muscleGroup)
    }
    if (trainer[base.id]) add('trainer', WEIGHTS.trainer)
    if (!base.id.startsWith('ex_')) add('staple', WEIGHTS.staple)
    if (everLogged.has(base.id)) add('familiar', WEIGHTS.familiar)
    add('pairs', Math.min(WEIGHTS.pairsMax, (pairs[base.id] ?? 0) * WEIGHTS.pairsPerHit))
    add('rejected', WEIGHTS.rejectedTarget * (rejTarget[target] ?? 0) + WEIGHTS.rejectedGroup * (rejGroup[group] ?? 0))

    const score = parts.reduce((sum, p) => sum + p.value, 0)
    // The reason shown is the strongest positive signal, except a trainer
    // prescription always wins: that's the one the user cares to see.
    const best = parts.find((p) => p.type === 'trainer')
      ?? parts.filter((p) => p.value > 0 && p.type !== 'staple' && p.type !== 'variety').sort((a, b) => b.value - a.value)[0]
    scored.push({ base, score, reason: best ? { type: best.type, muscle: best.muscle } : { type: 'any' } })
  }

  scored.sort((a, b) => b.score - a.score || a.base.id.localeCompare(b.base.id))
  return scored.slice(0, limit).map(({ base, score, reason }) => ({
    ...pickRef(base, sessions, trainer, usage),
    baseId: base.id,
    score,
    reason,
  }))
}
