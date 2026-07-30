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

function lookupLabel(labels, key, lang) {
  if (lang !== 'pt') return key
  return labels[key] ?? key
}

export function getBodyPartLabel(bodyPart, lang) {
  return lookupLabel(BODY_PART_LABELS, bodyPart, lang)
}

export function getMuscleLabel(muscle, lang) {
  return lookupLabel(MUSCLE_LABELS, muscle, lang)
}

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

function composeName(base, equipment, variant, field) {
  let name = base[field]
  if (variant) name += ` ${lowerFirst(variant[field])}`
  const showEquipment = equipment && equipment.id !== 'bodyweight' && base.equipment.length > 1
  if (showEquipment) name += ` (${lowerFirst(equipment[field])})`
  return name
}

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
