import { uid, todayISO } from './planUtils'
import { listBaseExercises, listEquipmentUsed, buildExerciseRef } from './exerciseTree'

// Reading CSV has two modes: 
// - 'beefup' trusts our own two extra columns and restores sessions exactly as they were. 
// -'generic' assumes nothing: it sniffs the delimiter, matches columns by role, and guesses exercises from their names,
// degrading instead of failing on anything it does not recognise.

const LB_TO_KG = 0.45359237

const BEEFUP_SESSION_COLUMN = 'BeefUp Session ID'
const BEEFUP_REF_COLUMN = 'BeefUp Exercise Ref'

// ── Text helpers ─────────────────────────────────────

function stripAccents(str) {
  return String(str ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normalizeText(str) {
  return stripAccents(str).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function tokenize(str) {
  return normalizeText(str).split(' ').filter(Boolean)
}

// Header keys ignore case, accents, punctuation and any "(kg)"-style unit suffix.
function normalizeHeader(header) {
  return stripAccents(header).toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]/g, '')
}

// "triceps" should match "tricep": treat a long shared prefix as the same word.
function tokensMatch(a, b) {
  if (a === b) return true
  const [short, long] = a.length <= b.length ? [a, b] : [b, a]
  return short.length >= 4 && long.startsWith(short)
}

function hasToken(tokenList, token) {
  return tokenList.some((t) => tokensMatch(t, token))
}

// ── CSV parsing ──────────────────────────────────────

function detectDelimiter(headerLine) {
  return [';', ',', '\t']
    .map((d) => ({ d, count: headerLine.split(d).length - 1 }))
    .sort((a, b) => b.count - a.count)[0].d
}

function parseRows(text, delimiter) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char !== '"') field += char
      else if (text[i + 1] === '"') { field += '"'; i++ }
      else inQuotes = false
    } else if (char === '"') {
      inQuotes = true
    } else if (char === delimiter) {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') {
      field += char
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

// ── Column roles ─────────────────────────────────────

const COLUMN_ROLES = [
  ['exercise', ['exercise', 'exercisename', 'exercicio', 'nomedoexercicio', 'movement', 'lift', 'ejercicio']],
  ['date', ['date', 'data', 'workoutdate', 'datetime', 'starttime', 'start', 'timestamp', 'dataehora']],
  ['reps', ['reps', 'rep', 'repetitions', 'repeticoes', 'count']],
  ['weight', ['weight', 'peso', 'kg', 'lb', 'lbs', 'load', 'carga']],
  ['setOrder', ['setorder', 'set', 'setnumber', 'setindex', 'setno', 'serie', 'ordem']],
  ['workoutNotes', ['workoutnotes', 'sessionnotes', 'notasdotreino']],
  ['workoutName', ['workoutname', 'routine', 'rotina', 'treino', 'session', 'sessionname', 'workouttitle']],
  ['workoutId', ['workout', 'workoutnumber', 'workoutid', 'sessionid', 'workoutno']],
  ['duration', ['duration', 'duracao', 'elapsed', 'totaltime', 'workoutduration']],
  ['notes', ['notes', 'note', 'nota', 'comment', 'comentario', 'setnote']],
]

function detectColumns(headerRow) {
  const normalized = headerRow.map(normalizeHeader)
  const columns = {}
  const taken = new Set()

  for (const [role, synonyms] of COLUMN_ROLES) {
    const index = normalized.findIndex((h, i) => !taken.has(i) && synonyms.includes(h))
    if (index >= 0) {
      columns[role] = index
      taken.add(index)
    }
  }
  return columns
}

// ── Set rows ─────────────────────────────────────────

const SET_TYPE_MARKERS = {
  d: 'dropset', drop: 'dropset', dropset: 'dropset',
  w: 'warmup', warmup: 'warmup', warmpup: 'warmup', aquecimento: 'warmup',
  f: 'failure', failure: 'failure', falha: 'failure',
}

const NOTE_MARKERS = new Set(['note', 'notes', 'nota', 'notas'])

function pad(n) {
  return String(n).padStart(2, '0')
}

function localDateTime(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function normalizeDate(raw) {
  const value = String(raw ?? '').trim()
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.replace(' ', 'T')
  const parsed = new Date(value)
  return isNaN(parsed.getTime()) ? null : localDateTime(parsed)
}

// ── Exercise matching ────────────────────────────────

function buildEquipmentLookup() {
  const lookup = {
    db: 'dumbbell', dumbbells: 'dumbbell',
    bb: 'barbell', barbells: 'barbell',
    kb: 'kettlebell',
    bw: 'bodyweight', bodyweight: 'bodyweight',
    smith: 'smith_machine', smithmachine: 'smith_machine',
    cables: 'cable',
    bands: 'band', resistanceband: 'band',
    ring: 'rings',
    medball: 'medicine_ball', medicineball: 'medicine_ball',
    plateloaded: 'machine', plate: 'machine',
  }
  for (const equipment of listEquipmentUsed()) {
    lookup[normalizeText(equipment.name).replace(/ /g, '')] = equipment.id
  }
  return lookup
}

let equipmentLookup = null

function findEquipment(tokenList) {
  if (!equipmentLookup) equipmentLookup = buildEquipmentLookup()
  const joined = tokenList.join('')
  for (const [key, id] of Object.entries(equipmentLookup).sort((a, b) => b[0].length - a[0].length)) {
    if (joined.includes(key)) return { id, key }
  }
  return null
}

function scoreVariant(variant, leftoverTokens) {
  let best = 0
  for (const name of [variant.name, variant.namePt]) {
    const variantTokens = tokenize(name)
    if (variantTokens.length === 0) continue
    const matched = variantTokens.filter((token) => hasToken(leftoverTokens, token)).length
    best = Math.max(best, matched)
  }
  return best
}

function bestVariant(base, leftoverTokens) {
  let id = ''
  let score = 0
  for (const variant of base.variants ?? []) {
    const variantScore = scoreVariant(variant, leftoverTokens)
    if (variantScore > score) {
      score = variantScore
      id = variant.id
    }
  }
  return { id, score }
}

function leftoverTokens(allTokens, baseTokens) {
  return allTokens.filter((token) => !baseTokens.some((t) => tokensMatch(t, token)))
}

// Pass 1: every word of the catalog name must be present.
// Pass 2: one missing word is forgiven when a variant of that same exercise accounts for the rest
function matchExercise(rawName) {
  const allTokens = tokenize(rawName)
  const equipment = findEquipment(allTokens)

  let best = null
  for (const base of listBaseExercises()) {
    for (const name of [base.name, base.namePt]) {
      const baseTokens = tokenize(name)
      if (baseTokens.length === 0) continue
      if (!baseTokens.every((token) => hasToken(allTokens, token))) continue
      if (!best || baseTokens.length > best.tokens.length) best = { base, tokens: baseTokens }
    }
  }

  if (!best) {
    for (const base of listBaseExercises()) {
      for (const name of [base.name, base.namePt]) {
        const baseTokens = tokenize(name)
        if (baseTokens.length < 2) continue
        const present = baseTokens.filter((token) => hasToken(allTokens, token))
        if (present.length !== baseTokens.length - 1) continue
        const variant = bestVariant(base, leftoverTokens(allTokens, present))
        if (variant.score === 0) continue
        if (!best || present.length > best.tokens.length) best = { base, tokens: present }
      }
    }
  }

  if (!best) {
    return { ref: buildExerciseRef(`ext:${normalizeText(rawName).replace(/ /g, '_')}`), matched: false }
  }

  const variant = bestVariant(best.base, leftoverTokens(allTokens, best.tokens))
  const equipmentId = equipment && best.base.equipment.includes(equipment.id)
    ? equipment.id
    : best.base.equipment[0] ?? ''

  return { ref: buildExerciseRef(best.base.id, equipmentId, variant.id), matched: true }
}

// ── Import ───────────────────────────────────────────

export function isBeefUpCsv(text) {
  const firstLine = String(text ?? '').trim().split('\n')[0] ?? ''
  return firstLine.includes(BEEFUP_REF_COLUMN)
}

export function parseWorkoutCsv(text, mode = 'generic') {
  const trimmed = String(text ?? '').trim()
  if (!trimmed) return { error: 'empty', sessions: [], setCount: 0, unmatchedNames: [] }

  const delimiter = detectDelimiter(trimmed.split('\n')[0])
  const rows = parseRows(trimmed, delimiter)
  if (rows.length < 2) return { error: 'empty', sessions: [], setCount: 0, unmatchedNames: [] }

  const columns = detectColumns(rows[0])
  if (columns.exercise === undefined) return { error: 'noExercise', sessions: [], setCount: 0, unmatchedNames: [] }
  if (columns.reps === undefined && columns.weight === undefined) {
    return { error: 'noSets', sessions: [], setCount: 0, unmatchedNames: [] }
  }
  if (columns.date === undefined) return { error: 'noDate', sessions: [], setCount: 0, unmatchedNames: [] }

  const beefUpSessionCol = rows[0].indexOf(BEEFUP_SESSION_COLUMN)
  const beefUpRefCol = rows[0].indexOf(BEEFUP_REF_COLUMN)
  const restoring = mode === 'beefup' && beefUpRefCol >= 0
  if (mode === 'beefup' && beefUpRefCol < 0) {
    return { error: 'notBeefUp', sessions: [], setCount: 0, unmatchedNames: [] }
  }

  if (columns.workoutName === undefined && columns.workoutId !== undefined) {
    const sample = rows.slice(1).map((r) => r[columns.workoutId]).find((v) => v?.trim())
    if (sample && isNaN(Number(sample))) {
      columns.workoutName = columns.workoutId
      delete columns.workoutId
    }
  }

  const inPounds = columns.weight !== undefined && /\blbs?\b/i.test(rows[0][columns.weight] ?? '')
  const cell = (row, role) => (columns[role] === undefined ? '' : String(row[columns[role]] ?? '').trim())

  const grouped = new Map()
  const unmatched = new Set()
  let setCount = 0

  for (const row of rows.slice(1)) {
    const exerciseName = cell(row, 'exercise')
    if (!exerciseName) continue

    const date = normalizeDate(cell(row, 'date'))
    if (!date) continue

    const beefUpSessionId = beefUpSessionCol >= 0 ? String(row[beefUpSessionCol] ?? '').trim() : ''
    const workoutKey = restoring && beefUpSessionId
      ? beefUpSessionId
      : columns.workoutId !== undefined ? `${cell(row, 'workoutId')}|${date}` : date

    if (!grouped.has(workoutKey)) {
      grouped.set(workoutKey, {
        id: restoring && beefUpSessionId ? beefUpSessionId : null,
        date,
        workoutName: cell(row, 'workoutName'),
        duration: parseInt(cell(row, 'duration')) || 0,
        notes: cell(row, 'workoutNotes'),
        exercises: new Map(),
      })
    }
    const session = grouped.get(workoutKey)
    if (!session.notes) session.notes = cell(row, 'workoutNotes')

    if (!session.exercises.has(exerciseName)) {
      const savedRef = restoring ? String(row[beefUpRefCol] ?? '').trim() : ''
      let ref = savedRef
      if (!ref) {
        const match = matchExercise(exerciseName)
        ref = match.ref
        if (!match.matched) unmatched.add(exerciseName)
      }
      session.exercises.set(exerciseName, {
        exerciseId: ref,
        name: exerciseName,
        namePt: exerciseName,
        note: '',
        sets: [],
      })
    }
    const exercise = session.exercises.get(exerciseName)

    const setOrder = normalizeText(cell(row, 'setOrder'))
    const weightRaw = cell(row, 'weight')
    const reps = cell(row, 'reps')

    if (NOTE_MARKERS.has(setOrder)) {
      const note = cell(row, 'notes')
      if (note) exercise.note = exercise.note ? `${exercise.note} · ${note}` : note
      continue
    }

    const hasValues = weightRaw !== '' || reps !== ''
    if (!hasValues && (setOrder === '' || isNaN(Number(setOrder)))) continue

    const weight = inPounds && weightRaw !== ''
      ? String(Math.round(parseFloat(weightRaw) * LB_TO_KG * 100) / 100)
      : weightRaw

    exercise.sets.push({
      weight,
      reps,
      type: isNaN(Number(setOrder)) ? SET_TYPE_MARKERS[setOrder] ?? 'normal' : 'normal',
    })
    setCount++

    const note = cell(row, 'notes')
    if (note && !exercise.note) exercise.note = note
  }

  const sessions = [...grouped.values()]
    .map((session) => ({
      id: session.id || uid(),
      date: session.date,
      workoutId: null,
      workoutName: session.workoutName,
      duration: session.duration,
      notes: session.notes,
      exercises: [...session.exercises.values()].filter((e) => e.sets.length > 0),
    }))
    .filter((session) => session.exercises.length > 0)
    .sort((a, b) => a.date.localeCompare(b.date))

  return { error: null, sessions, setCount, unmatchedNames: [...unmatched] }
}

// ── Export ───────────────────────────────────────────

const CSV_HEADER = [
  'Workout #', 'Date', 'Workout Name', 'Duration (sec)', 'Exercise Name',
  'Set Order', 'Weight (kg)', 'Reps', 'Set Type', 'Notes', 'Workout Notes',
  BEEFUP_SESSION_COLUMN, BEEFUP_REF_COLUMN,
]

const TYPE_TO_MARKER = { dropset: 'D', warmup: 'W', failure: 'F' }

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

export function buildWorkoutCsv(sessions, lang) {
  const rows = [CSV_HEADER]
  const ordered = [...sessions].sort((a, b) => String(a.date).localeCompare(String(b.date)))

  ordered.forEach((session, index) => {
    session.exercises?.forEach((exercise) => {
      exercise.sets?.forEach((set, setIndex) => {
        const name = lang === 'pt'
          ? exercise.namePt || exercise.name
          : exercise.name || exercise.namePt
        rows.push([
          index + 1,
          session.date,
          session.workoutName,
          session.duration,
          name,
          TYPE_TO_MARKER[set.type] ?? setIndex + 1,
          set.weight,
          set.reps,
          set.type || 'normal',
          exercise.note,
          session.notes,
          session.id,
          exercise.exerciseId,
        ])
      })
    })
  })

  return rows.map((row) => row.map(csvCell).join(',')).join('\n')
}

export function workoutCsvFilename() {
  return `beefup-${todayISO()}.csv`
}

export function downloadFile(content, filename, mime) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
