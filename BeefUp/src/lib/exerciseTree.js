import exercisesBase from '../data/exercisesBase.json'
import exerciseEquipment from '../data/exerciseEquipment.json'

const BASE_BY_ID = Object.fromEntries(exercisesBase.map((b) => [b.id, b]))
const EQUIPMENT_BY_ID = Object.fromEntries(exerciseEquipment.map((e) => [e.id, e]))

const REF_SEP = '|'

// Builds the composite reference string stored in workout/session data:
// "<baseId>|<equipmentId>|<variantId>" (equipment/variant segments may be empty).
export function buildExerciseRef(baseId, equipmentId = '', variantId = '') {
  return [baseId, equipmentId ?? '', variantId ?? ''].join(REF_SEP)
}

export function parseExerciseRef(ref) {
  const [baseId = '', equipmentId = '', variantId = ''] = String(ref ?? '').split(REF_SEP)
  return { baseId, equipmentId, variantId }
}

function lowerFirst(str) {
  return str ? str[0].toLowerCase() + str.slice(1) : str
}

// PT labels for body_part / muscleGroup (broad regions).
const BODY_PART_LABELS = {
  back: 'Costas',
  cardio: 'Cardio',
  chest: 'Peito',
  legs: 'Pernas',
  'lower legs': 'Pernas inferiores',
  shoulders: 'Ombros',
  'upper arms': 'Braços',
  'upper legs': 'Pernas',
  waist: 'Abdómen',
}

// PT labels for target / secondaryMuscles (specific muscles).
const MUSCLE_LABELS = {
  abs: 'Abdominais',
  back: 'Costas',
  biceps: 'Bíceps',
  calves: 'Gémeos',
  cardio: 'Cardio',
  chest: 'Peito',
  delts: 'Deltoides',
  forearms: 'Antebraços',
  glutes: 'Glúteos',
  hamstrings: 'Isquiotibiais',
  lats: 'Dorsais',
  pectorals: 'Peitorais',
  quads: 'Quadríceps',
  shoulders: 'Ombros',
  traps: 'Trapézios',
  triceps: 'Tríceps',
}

export function getBodyPartLabel(bodyPart, lang) {
  if (lang !== 'pt') return bodyPart
  return BODY_PART_LABELS[bodyPart] ?? bodyPart
}

// One accent color per catalog body part
export const BODY_PART_ACCENT = {
  chest: '#16a34a',
  back: '#0ea5e9',
  shoulders: '#a855f7',
  'upper arms': '#f97316',
  legs: '#14b8a6',
  'upper legs': '#14b8a6',
  'lower legs': '#14b8a6',
  waist: '#eab308',
  cardio: '#ec4899',
}

export function getMuscleLabel(muscle, lang) {
  if (lang !== 'pt') return muscle
  return MUSCLE_LABELS[muscle] ?? muscle
}

// Given a base exercise + chosen equipment/variant, composes the display name.
// Mirrors the "(equipment)" suffix convention used across the app: the equipment
// is only shown when it's a meaningful choice (not bodyweight, not the only option).
function composeName(base, equipment, variant, key) {
  let name = base[key]
  if (variant) name += ` ${lowerFirst(variant[key])}`
  const showEquipment = equipment && equipment.id !== 'bodyweight' && base.equipment.length > 1
  if (showEquipment) name += ` (${lowerFirst(equipment[key])})`
  return name
}

// Resolves a composite ref into a full exercise object, ready for display or
// for building a live workout entry (name/namePt/defaultSets/defaultReps/defaultWeight).
export function resolveExercise(ref) {
  const { baseId, equipmentId, variantId } = parseExerciseRef(ref)
  const base = BASE_BY_ID[baseId]
  if (!base) return null

  const equipment = EQUIPMENT_BY_ID[equipmentId] ?? EQUIPMENT_BY_ID[base.equipment[0]]
  const variant = base.variants.find((v) => v.id === variantId) ?? null

  return {
    id: ref,
    baseId: base.id,
    name: composeName(base, equipment, variant, 'name'),
    namePt: composeName(base, equipment, variant, 'namePt'),
    bodyPart: base.bodyPart,
    target: base.target,
    muscleGroup: base.muscleGroup,
    secondaryMuscles: base.secondaryMuscles,
    tags: [base.bodyPart, base.target],
    description: base.description,
    descriptionPt: base.descriptionPt,
    instructions: base.instructions,
    instructionsPt: base.instructionsPt,
    equipment: equipment?.id ?? null,
    variant: variant?.id ?? null,
    defaultSets: base.defaultSets,
    defaultReps: base.defaultReps,
    defaultWeight: base.defaultWeight,
  }
}

export function listBaseExercises() {
  return exercisesBase
}

export function getBaseExercise(baseId) {
  return BASE_BY_ID[baseId] ?? null
}

export function getEquipmentOptions(baseId) {
  const base = BASE_BY_ID[baseId]
  if (!base) return []
  return base.equipment.map((id) => EQUIPMENT_BY_ID[id]).filter(Boolean)
}

export function getVariantOptions(baseId) {
  return BASE_BY_ID[baseId]?.variants ?? []
}

export function listBodyParts() {
  return [...new Set(exercisesBase.map((b) => b.bodyPart))]
}

export function listEquipmentUsed() {
  const used = new Set(exercisesBase.flatMap((b) => b.equipment))
  return exerciseEquipment.filter((e) => used.has(e.id))
}

export function getEquipmentLabel(id, lang) {
  const eq = EQUIPMENT_BY_ID[id]
  if (!eq) return id
  return lang === 'pt' ? eq.namePt : eq.name
}
