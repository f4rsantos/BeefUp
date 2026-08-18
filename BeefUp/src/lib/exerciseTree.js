import exercisesBase from '../data/exercisesBase.json'
import exerciseEquipment from '../data/exerciseEquipment.json'
import { localizedName } from './localizedName'

const BASE_BY_ID = Object.fromEntries(exercisesBase.map((b) => [b.id, b]))
const EQUIPMENT_BY_ID = Object.fromEntries(exerciseEquipment.map((e) => [e.id, e]))

let customBase = []
let CUSTOM_BY_ID = {}

export function registerCustomExercises(list) {
  customBase = list ?? []
  CUSTOM_BY_ID = Object.fromEntries(customBase.map((b) => [b.id, b]))
}

function findBase(id) {
  return BASE_BY_ID[id] ?? CUSTOM_BY_ID[id]
}

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

// Which MUSCLE_LABELS keys belong under each bodyPart — lets the custom-exercise
// form narrow "primary/secondary muscle" down to what's anatomically relevant
// once a bodyPart is picked, instead of showing all 16 muscles unfiltered.
const BODY_PART_MUSCLES = {
  chest: ['chest', 'pectorals'],
  back: ['back', 'lats', 'traps'],
  shoulders: ['shoulders', 'delts'],
  'upper arms': ['biceps', 'triceps', 'forearms'],
  'upper legs': ['quads', 'hamstrings', 'glutes'],
  'lower legs': ['calves'],
  waist: ['abs'],
  cardio: ['cardio'],
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
  chest: '#109a14',
  back: '#0ea5e9',
  shoulders: '#a855f7',
  'upper arms': '#f97316',
  legs: '#14b8a6',
  'upper legs': '#14b8a6',
  'lower legs': '#14b8a6',
  waist: '#eab308',
  cardio: '#ec4899',
}

export const BODY_PART_POSITIONS = {
  front: {
    shoulders: { x: 26, y: 16, side: 'left' },
    'upper arms': { x: 18, y: 28, side: 'left' },
    waist: { x: 32, y: 42, side: 'left' },
    'upper legs': { x: 32, y: 63, side: 'left' },
    chest: { x: 68, y: 21, side: 'right' },
    'lower legs': { x: 68, y: 86, side: 'right' },
  },
  back: {
    shoulders: { x: 26, y: 16, side: 'left' },
    'upper arms': { x: 18, y: 30, side: 'left' },
    'upper legs': { x: 32, y: 63, side: 'left' },
    back: { x: 68, y: 34, side: 'right' },
    'lower legs': { x: 68, y: 86, side: 'right' },
  },
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
  const base = findBase(baseId)
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
  return [...exercisesBase, ...customBase]
}

export function matchesExerciseQuery(ex, query) {
  if (!query) return true
  const q = query.toLowerCase()
  return ex.name.toLowerCase().includes(q) || ex.namePt.toLowerCase().includes(q)
}

export function getBaseExercise(baseId) {
  return findBase(baseId) ?? null
}

export function getEquipmentOptions(baseId) {
  const base = findBase(baseId)
  if (!base) return []
  return base.equipment.map((id) => EQUIPMENT_BY_ID[id]).filter(Boolean)
}

export function getVariantOptions(baseId, equipmentId) {
  const variants = findBase(baseId)?.variants ?? []
  if (!equipmentId) return variants
  return variants.filter((v) => !v.equipmentOnly || v.equipmentOnly.includes(equipmentId))
}

export function repUnitFor(ref) {
  const { baseId } = parseExerciseRef(ref)
  return findBase(baseId)?.repUnit || 'reps'
}

export function normalizeWorkoutExercises(list) {
  return (list || []).map((item) => (typeof item === 'string' ? { ref: item } : item))
}

export function listBodyParts() {
  return [...new Set(exercisesBase.map((b) => b.bodyPart))]
}

export function listEquipmentUsed() {
  const used = new Set(exercisesBase.flatMap((b) => b.equipment))
  return exerciseEquipment.filter((e) => used.has(e.id))
}

export function listAllEquipment() {
  return exerciseEquipment
}

export function listMuscles() {
  return Object.keys(MUSCLE_LABELS)
}

export function listMusclesForBodyPart(bodyPart) {
  return BODY_PART_MUSCLES[bodyPart] ?? []
}

export function getEquipmentLabel(id, lang) {
  const eq = EQUIPMENT_BY_ID[id]
  if (!eq) return id
  return localizedName(eq, lang)
}
