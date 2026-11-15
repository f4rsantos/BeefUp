import { isCardioExercise, parseExerciseRef, resolveExercise } from './exerciseTree.js'
import { sessionDay } from './planUtils.js'

export const MIN_SESSIONS= 10
const MIN_FOCUS_SESSIONS= 3
const RECENT_DAYS= 84
const ROTATION_DAYS= 182
const FALLBACK_SESSIONS= 6
const COMPANION_SHARE= 1 / 3
const VERSION_SHARE= 0.3
const CARDIO_SHARE= 0.6
const CARDIO_SESSIONS= 10
const MAX_PER_GROUP= 5
const DAY_MS= 86400000

const median= (values) => {
  const sorted= [...values].sort((a, b) => a - b)
  return sorted[Math.floor((sorted.length - 1) / 2)]
}

const dayNumber= (day) => {
  const [y, m, d]= day.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS)
}

const groupOf= (ref) => (isCardioExercise(ref) ? 'cardio' : resolveExercise(ref)?.bodyPart ?? null)

const isWorked= (entry) => (entry.sets ?? []).some((set) => set.type !== 'warmup')

function describe(session) {
  const day= sessionDay(session)
  if (!day) return null
  const entries= (session.exercises ?? [])
    .filter(isWorked)
    .map((entry, position) => ({
      ref: entry.exerciseId,
      baseId: parseExerciseRef(entry.exerciseId).baseId,
      group: groupOf(entry.exerciseId),
      barType: entry.barType ?? '',
      position,
    }))
    .filter((entry) => entry.group)
  if (!entries.length) return null
  const counts= new Map()
  for (const entry of entries) {
    if (entry.group !== 'cardio') counts.set(entry.group, (counts.get(entry.group) ?? 0) + 1)
  }
  let focus= null
  for (const entry of entries) {
    if (entry.group === 'cardio') continue
    if (focus === null || counts.get(entry.group) > counts.get(focus)) focus= entry.group
  }
  return { date: session.date, dayNo: dayNumber(day), entries, focus }
}

function history(sessions) {
  return sessions
    .map(describe)
    .filter(Boolean)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function suggestionReadiness(sessions) {
  const done= history(sessions).length
  return { ready: done >= MIN_SESSIONS, missing: Math.max(0, MIN_SESSIONS - done) }
}

export function focusOptions(sessions, todayDay) {
  const today= dayNumber(todayDay)
  const byFocus= new Map()
  for (const item of history(sessions)) {
    if (!item.focus) continue
    if (!byFocus.has(item.focus)) byFocus.set(item.focus, [])
    byFocus.get(item.focus).push(item.dayNo)
  }
  const options= []
  for (const [bodyPart, days] of byFocus) {
    const unique= [...new Set(days)].sort((a, b) => b - a)
    if (unique.length < MIN_FOCUS_SESSIONS) continue
    const gaps= unique.slice(0, -1).map((day, i) => day - unique[i + 1])
    const daysSince= Math.max(0, today - unique[0])
    options.push({
      bodyPart,
      sessions: unique.length,
      daysSince,
      overdue: daysSince / Math.max(1, median(gaps)),
      recent: daysSince <= RECENT_DAYS,
    })
  }
  return options.sort((a, b) =>
    Number(b.recent) - Number(a.recent) || b.overdue - a.overdue || b.sessions - a.sessions || (a.bodyPart < b.bodyPart ? -1 : 1))
}

function rankBases(pool, group, today) {
  const bases= new Map()
  for (const item of pool) {
    const age= today - item.dayNo
    const weight= 1 + Math.max(0, 1 - age / RECENT_DAYS)
    for (const entry of item.entries) {
      if (entry.group !== group) continue
      if (!bases.has(entry.baseId)) bases.set(entry.baseId, { baseId: entry.baseId, score: 0, times: 0, positions: [], lastDay: 0, versions: new Map() })
      const base= bases.get(entry.baseId)
      base.score+= weight
      base.times+= 1
      base.positions.push(entry.position)
      base.lastDay= Math.max(base.lastDay, item.dayNo)
      if (!base.versions.has(entry.ref)) base.versions.set(entry.ref, { ref: entry.ref, score: 0, times: 0, lastDay: 0, barType: '' })
      const version= base.versions.get(entry.ref)
      version.score+= weight
      version.times+= 1
      if (item.dayNo >= version.lastDay) {
        version.lastDay= item.dayNo
        version.barType= entry.barType
      }
    }
  }
  return [...bases.values()].sort((a, b) => b.score - a.score || b.lastDay - a.lastDay || (a.baseId < b.baseId ? -1 : 1))
}

function pickVersion(base, keepTop) {
  const versions= [...base.versions.values()].sort((a, b) => b.score - a.score || b.lastDay - a.lastDay || (a.ref < b.ref ? -1 : 1))
  if (keepTop) return versions[0]
  const regular= versions.filter((version) => version.times / base.times >= VERSION_SHARE)
  if (regular.length < 2) return versions[0]
  const latest= [...regular].sort((a, b) => b.lastDay - a.lastDay)[0]
  return regular.find((version) => version.ref !== latest.ref) ?? versions[0]
}

function pickGroup({ recent, rotation, last, group, today, keepFirst }) {
  const perSession= recent
    .map((item) => new Set(item.entries.filter((entry) => entry.group === group).map((entry) => entry.baseId)).size)
    .filter((count) => count > 0)
  if (!perSession.length) return []
  const wanted= Math.min(MAX_PER_GROUP, Math.max(1, median(perSession)))
  const ranked= rankBases(recent, group, today)
  const wide= rankBases(rotation, group, today)
  const lastBases= new Set(last.entries.filter((entry) => entry.group === group).map((entry) => entry.baseId))
  const fixedCount= Math.max(1, Math.ceil((wanted * 2) / 3))
  const chosen= ranked.slice(0, fixedCount)
  const taken= new Set(chosen.map((base) => base.baseId))
  const fresh= wide.filter((base) => !taken.has(base.baseId) && !lastBases.has(base.baseId) && base.times >= 2)
  for (const base of [...fresh, ...ranked, ...wide]) {
    if (chosen.length >= wanted) break
    if (taken.has(base.baseId)) continue
    taken.add(base.baseId)
    chosen.push(base)
  }
  const first= chosen[0]
  const mean= (base) => base.positions.reduce((sum, p) => sum + p, 0) / base.positions.length
  return [...chosen]
    .sort((a, b) => mean(a) - mean(b) || b.score - a.score)
    .map((base) => {
      const version= pickVersion(base, keepFirst && base === first)
      return { ref: version.ref, barType: version.barType, group }
    })
}

function pickCardio(all) {
  const latest= all.slice(0, CARDIO_SESSIONS)
  const withCardio= latest.filter((item) => item.entries.some((entry) => entry.group === 'cardio'))
  if (!latest.length || withCardio.length / latest.length < CARDIO_SHARE) return null
  const refs= new Map()
  for (const item of withCardio) {
    for (const entry of item.entries) {
      if (entry.group !== 'cardio') continue
      const seen= refs.get(entry.ref) ?? { ref: entry.ref, times: 0, lastDay: 0 }
      seen.times+= 1
      seen.lastDay= Math.max(seen.lastDay, item.dayNo)
      refs.set(entry.ref, seen)
    }
  }
  const best= [...refs.values()].sort((a, b) => b.times - a.times || b.lastDay - a.lastDay || (a.ref < b.ref ? -1 : 1))[0]
  return { ref: best.ref, barType: '', group: 'cardio' }
}

export function suggestWorkout(sessions, bodyPart, todayDay) {
  const today= dayNumber(todayDay)
  const all= history(sessions)
  const focused= all.filter((item) => item.focus === bodyPart)
  if (!focused.length) return null
  const inWindow= focused.filter((item) => today - item.dayNo <= RECENT_DAYS)
  const recent= inWindow.length >= MIN_FOCUS_SESSIONS ? inWindow : focused.slice(0, FALLBACK_SESSIONS)
  const inRotation= focused.filter((item) => today - item.dayNo <= ROTATION_DAYS)
  const rotation= inRotation.length >= recent.length ? inRotation : recent
  const last= focused[0]

  const shares= new Map()
  for (const item of recent) {
    for (const group of new Set(item.entries.map((entry) => entry.group))) {
      if (group === bodyPart || group === 'cardio') continue
      shares.set(group, (shares.get(group) ?? 0) + 1)
    }
  }
  const companion= [...shares.entries()]
    .filter(([, count]) => count / recent.length >= COMPANION_SHARE)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0] ?? null

  const items= pickGroup({ recent, rotation, last, group: bodyPart, today, keepFirst: true })
  if (companion) items.push(...pickGroup({ recent, rotation, last, group: companion, today, keepFirst: false }))
  const cardio= pickCardio(all)
  if (cardio) items.push(cardio)
  return { bodyPart, companion, items }
}
