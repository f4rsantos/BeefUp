import { resolveExercise } from './exerciseTree'

// Maps an exercise muscle tag to body-area ids on the HumanBody SVG (front/back).
// Keys are body_part / target values from the exercises dataset schema.
export const muscleTagToBodyAreas = {
  // body_part values
  chest: { front: ['chest'], back: [] },
  back: { front: [], back: ['left-trap', 'right-trap', 'left-lat', 'right-lat', 'lumbar', 'upper-back', 'lower-back'] },
  shoulders: { front: ['left-shoulder-front', 'right-shoulder-front'], back: ['left-shoulder-back', 'right-shoulder-back'] },
  waist: { front: ['stomach', 'upper-abs', 'lower-abs'], back: [] },
  'upper arms': { front: ['left-biceps', 'right-biceps'], back: ['left-triceps', 'right-triceps'] },
  'lower arms': {
    front: ['left-forearm-front', 'right-forearm-front'],
    back: ['left-forearm-back', 'right-forearm-back'],
  },
  'upper legs': {
    front: ['left-quad', 'right-quad', 'left-adductor', 'right-adductor'],
    back: ['left-hamstring', 'right-hamstring', 'glutes'],
  },
  'lower legs': { front: [], back: ['left-calf', 'right-calf'] },
  neck: { front: [], back: ['left-trap', 'right-trap'] },
  cardio: { front: [], back: [] },

  // target values (more specific, take precedence when present)
  abs: { front: ['stomach', 'upper-abs', 'lower-abs'], back: [] },
  abductors: { front: [], back: ['glutes'] },
  adductors: { front: ['left-adductor', 'right-adductor'], back: [] },
  biceps: { front: ['left-biceps', 'right-biceps'], back: [] },
  calves: { front: [], back: ['left-calf', 'right-calf'] },
  'cardiovascular system': { front: [], back: [] },
  delts: { front: ['left-shoulder-front', 'right-shoulder-front'], back: ['left-shoulder-back', 'right-shoulder-back'] },
  forearms: {
    front: ['left-forearm-front', 'right-forearm-front'],
    back: ['left-forearm-back', 'right-forearm-back'],
  },
  glutes: { front: [], back: ['glutes'] },
  hamstrings: { front: [], back: ['left-hamstring', 'right-hamstring'] },
  lats: { front: [], back: ['left-lat', 'right-lat', 'lumbar', 'upper-back', 'lower-back'] },
  'levator scapulae': { front: [], back: ['left-trap', 'right-trap'] },
  pectorals: { front: ['chest'], back: [] },
  quads: { front: ['left-quad', 'right-quad'], back: [] },
  'serratus anterior': { front: ['chest'], back: [] },
  spine: { front: [], back: ['lumbar', 'upper-back', 'lower-back'] },
  traps: { front: [], back: ['left-trap', 'right-trap'] },
  triceps: { front: [], back: ['left-triceps', 'right-triceps'] },
  'upper back': { front: [], back: ['left-lat', 'right-lat', 'upper-back'] },
}

// Given a list of sessions, return the unique front/back body areas worked.
export function bodyAreasForSessions(sessions) {
  const front = new Set()
  const back = new Set()
  sessions.forEach((session) => {
    session.exercises?.forEach((exercise) => {
      const meta = resolveExercise(exercise.exerciseId)
      meta?.tags?.forEach((tag) => {
        const mapping = muscleTagToBodyAreas[tag]
        mapping?.front?.forEach((area) => front.add(area))
        mapping?.back?.forEach((area) => back.add(area))
      })
    })
  })
  return { front: [...front], back: [...back] }
}

// Sessions in the last `days` days (default 7), based on the session date.
export function recentSessions(sessions, days = 7) {
  const cutoff = new Date()
  cutoff.setHours(0, 0, 0, 0)
  cutoff.setDate(cutoff.getDate() - (days - 1))
  return sessions.filter((s) => new Date(s.date) >= cutoff)
}
