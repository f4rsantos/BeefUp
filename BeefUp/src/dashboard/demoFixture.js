// Dev-only fixture so the trainer dashboard can be opened and tested without
// a real Supabase project. Enabled with ?dash-demo=1 and gated on DEV, so it
// can never reach a production build.

export function isDashDemo() {
  return import.meta.env.DEV && new URLSearchParams(window.location.search).get('dash-demo') === '1'
}

export const DEMO_STUDENTS = [
  { id: 'demo-ana', linkedUserId: 'demo-ana', name: 'Ana Silva', scopes: ['workouts', 'nutrition', 'measures'] },
  { id: 'demo-rui', linkedUserId: 'demo-rui', name: 'Rui Costa', scopes: ['workouts'] },
  { id: 'demo-marta', linkedUserId: 'demo-marta', name: 'Marta Dias', scopes: ['nutrition', 'measures'] },
]

const TRAINER = 'demo-trainer'

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const ANA = {
  plans: [{
    id: 'p1', name: 'PPL', startDate: daysAgo(30), prescribedBy: TRAINER,
    days: [
      { id: 'd1', type: 'workout', workoutId: 'w1' },
      { id: 'd2', type: 'workout', workoutId: 'w2' },
      { id: 'd3', type: 'rest' },
    ],
  }],
  workouts: [
    { id: 'w1', name: 'Push A', prescribedBy: TRAINER, exercises: [{ ref: 'bench_press|barbell|flat' }, { ref: 'overhead_press|barbell|standing' }] },
    { id: 'w2', name: 'Pull B', prescribedBy: TRAINER, exercises: [{ ref: 'lunge|dumbbell|frente' }] },
    { id: 'w3', name: 'Corrida de domingo', exercises: [{ ref: 'running||' }] },
  ],
  sessions: [
    { id: 's1', date: new Date(Date.now() - 2 * 864e5).toISOString(), exercises: [{ exerciseId: 'bench_press|barbell|flat', sets: [{ weight: 60, reps: 8 }, { weight: 60, reps: 8 }] }] },
    { id: 's2', date: new Date(Date.now() - 5 * 864e5).toISOString(), exercises: [{ exerciseId: 'lunge|dumbbell|frente', sets: [{ weight: 20, reps: 12 }] }] },
  ],
  measurements: [
    { id: 'm1', date: daysAgo(28), type: 'weight', value: 64.5 },
    { id: 'm2', date: daysAgo(14), type: 'weight', value: 63.8 },
    { id: 'm3', date: daysAgo(3), type: 'weight', value: 63.1 },
  ],
  measureTypes: [{ id: 'mt1', name: 'Gémeo esquerdo', unit: 'cm', prescribedBy: TRAINER }],
  nutritionGoals: [{ id: 'default', kcal: 2000, protein: 140, carbs: 200, fat: 65, waterMl: 2500, fiber: 35, prescribedBy: TRAINER }],
  foodLog: [
    { id: 'f1', date: daysAgo(0), meal: 'breakfast', name: 'Aveia com banana', qty: '80 g', kcal: 310, protein: 11, carbs: 55, fat: 6, fiber: 8 },
    { id: 'f2', date: daysAgo(0), meal: 'lunch', name: 'Frango grelhado', qty: '180 g', kcal: 300, protein: 56, carbs: 0, fat: 7, sodium: 320 },
    { id: 'f3', date: daysAgo(0), meal: 'lunch', name: 'Arroz cozido', qty: '150 g', kcal: 195, protein: 4, carbs: 42, fat: 1 },
    { id: 'f4', date: daysAgo(1), meal: 'dinner', name: 'Salmão no forno', qty: '150 g', kcal: 280, protein: 38, carbs: 0, fat: 14 },
  ],
}

const EMPTY = { plans: [], workouts: [], sessions: [], measurements: [], measureTypes: [], nutritionGoals: [], foodLog: [] }

export function demoClientData(clientId) {
  if (clientId === 'demo-ana') return ANA
  if (clientId === 'demo-rui') {
    return { ...EMPTY, workouts: [{ id: 'w9', name: 'Full body', exercises: [{ ref: 'squat|barbell|high_bar' }] }] }
  }
  return EMPTY
}
