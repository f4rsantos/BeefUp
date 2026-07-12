import exercisesData from '../data/exercises.json'

// Maps an exercise muscle tag to body-area ids on the HumanBody SVG (front/back).
export const muscleTagToBodyAreas = {
  chest: { front: ['chest'], back: [] },
  back: { front: [], back: ['left-trap', 'right-trap', 'left-lat', 'right-lat', 'lumbar'] },
  shoulders: { front: ['left-shoulder-front', 'right-shoulder-front'], back: ['left-shoulder-back', 'right-shoulder-back'] },
  rear_delt: { front: [], back: ['left-shoulder-back', 'right-shoulder-back'] },
  arms: {
    front: ['left-forearm-front', 'right-forearm-front'],
    back: ['left-forearm-back', 'right-forearm-back'],
  },
  biceps: { front: ['left-biceps', 'right-biceps'], back: [] },
  triceps: { front: [], back: ['left-triceps', 'right-triceps'] },
  legs: {
    front: ['left-quad', 'right-quad'],
    back: ['left-hamstring', 'right-hamstring', 'left-calf', 'right-calf'],
  },
  quads: { front: ['left-quad', 'right-quad'], back: [] },
  hamstrings: { front: [], back: ['left-hamstring', 'right-hamstring'] },
  calves: { front: [], back: ['left-calf', 'right-calf'] },
  glutes: { front: [], back: ['glutes'] },
  core: { front: ['upper-abs', 'lower-abs'], back: [] },
}

// Given a list of sessions, return the unique front/back body areas worked.
export function bodyAreasForSessions(sessions) {
  const front = new Set()
  const back = new Set()
  sessions.forEach((session) => {
    session.exercises?.forEach((exercise) => {
      const meta = exercisesData.find((item) => item.id === exercise.exerciseId)
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
