import { useRef, useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import exercisesData from '../data/exercises.json'
import HumanBody from '../components/HumanBody'

const muscleTagToBodyAreas = {
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

function formatDuration(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function getSessionBodyAreas(session) {
  const front = new Set()
  const back = new Set()

  session.exercises?.forEach((exercise) => {
    const meta = exercisesData.find((item) => item.id === exercise.exerciseId)
    meta?.tags?.forEach((tag) => {
      const mapping = muscleTagToBodyAreas[tag]
      mapping?.front?.forEach((area) => front.add(area))
      mapping?.back?.forEach((area) => back.add(area))
    })
  })

  return {
    front: [...front],
    back: [...back],
  }
}

function formatDate(iso) {
  const d = new Date(iso)
  const dateStr = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
  const timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  // If the ISO string has time (longer than 10 chars), show it
  return iso.length > 10 ? `${dateStr} · ${timeStr}` : dateStr
}

function calcVolume(session) {
  return session.exercises?.reduce((acc, ex) =>
    acc + (ex.sets?.reduce((a, s) => a + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0) ?? 0), 0) ?? 0
}

function countSets(session) {
  return session.exercises?.reduce((acc, ex) => acc + (ex.sets?.length ?? 0), 0) ?? 0
}

function countExercises(session) {
  return session.exercises?.length ?? 0
}

const CARD_HEIGHT = 520
const BODY_NATURAL_HEIGHT = 500
const BODY_NATURAL_WIDTH = 207
const SCALE = (CARD_HEIGHT - 60) / BODY_NATURAL_HEIGHT

function SwipeableCard({ s, t, lang, sessionBodyAreas }) {
  const sliderRef = useRef(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const isDragging = useRef(false)
  const lockedAxis = useRef(null) // 'x' | 'y' | null
  const [activeSlide, setActiveSlide] = useState(0)

  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.scrollTo({
        left: activeSlide * sliderRef.current.offsetWidth,
        behavior: 'smooth',
      })
    }
  }, [activeSlide])

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    isDragging.current = true
    lockedAxis.current = null
  }

  const onTouchMove = (e) => {
    if (!isDragging.current) return
    const dx = Math.abs(e.touches[0].clientX - startX.current)
    const dy = Math.abs(e.touches[0].clientY - startY.current)

    if (!lockedAxis.current) {
      if (dx > 5 || dy > 5) {
        lockedAxis.current = dx > dy ? 'x' : 'y'
      }
    }

    if (lockedAxis.current === 'x') {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  const onTouchEnd = () => {
    if (!sliderRef.current) {
      isDragging.current = false
      lockedAxis.current = null
      return
    }

    const width = sliderRef.current.offsetWidth
    const scrollLeft = sliderRef.current.scrollLeft

    setActiveSlide(scrollLeft >= width / 2 ? 1 : 0)

    isDragging.current = false
    lockedAxis.current = null
  }

  const showSlide = (index) => {
    setActiveSlide(index)
  }

  return (
    <div
      className="card overflow-hidden"
      style={{
        padding: 0,
        height: `${CARD_HEIGHT}px`,
        minHeight: `${CARD_HEIGHT}px`,
        maxHeight: `${CARD_HEIGHT}px`,
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {activeSlide === 1 && (
        <button
          type="button"
          aria-label="previous"
          onClick={() => showSlide(0)}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 40,
            width: '30%',
            background: 'transparent',
            border: 'none',
            zIndex: 1,
            cursor: 'pointer',
          }}
        />
      )}
      {activeSlide === 0 && (
        <button
          type="button"
          aria-label="next"
          onClick={() => showSlide(1)}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 40,
            width: '30%',
            background: 'transparent',
            border: 'none',
            zIndex: 1,
            cursor: 'pointer',
          }}
        />
      )}
      <div
        ref={sliderRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          display: 'flex',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x',
          height: '100%',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >

        {/* ── Slide 1: Human Body ── */}
        <div
          style={{
            minWidth: '100%',
            height: '100%',
            scrollSnapAlign: 'start',
            background: 'var(--card-inner)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
          }}
        >
          {/* Name + date */}
          <div style={{ padding: '16px 16px 8px', flexShrink: 0 }}>
            <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: 15, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.workoutName}
            </p>
            <p style={{ color: 'var(--muted)', fontSize: 12 }}>
              {formatDate(s.date)} · {formatDuration(s.duration)}
            </p>
          </div>

          {/* Body figure */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 16, overflow: 'hidden', flexWrap: 'wrap' }}>
            {['front', 'back'].map((view) => (
              <div key={view} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '45%' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  {view === 'front' ? 'Frente' : 'Costas'}
                </div>
                <div style={{
                  transform: `scale(${SCALE})`,
                  transformOrigin: 'top center',
                  width: `${BODY_NATURAL_WIDTH}px`,
                  height: `${BODY_NATURAL_HEIGHT}px`,
                  pointerEvents: 'none',
                  flexShrink: 0,
                }}>
                  <HumanBody view={view} highlightedMuscles={sessionBodyAreas[view]} />
                </div>
              </div>
            ))}
          </div>

          {/* Dots */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 10, gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => showSlide(0)}
              style={{
                width: 24,
                height: 4,
                borderRadius: 9999,
                border: 'none',
                background: activeSlide === 0 ? 'var(--accent)' : 'var(--muted)',
                opacity: activeSlide === 0 ? 1 : 0.35,
                cursor: 'pointer',
              }}
            />
            <button
              type="button"
              onClick={() => showSlide(1)}
              style={{
                width: 24,
                height: 4,
                borderRadius: 9999,
                border: 'none',
                background: activeSlide === 1 ? 'var(--accent)' : 'var(--muted)',
                opacity: activeSlide === 1 ? 1 : 0.35,
                cursor: 'pointer',
              }}
            />
          </div>
        </div>

        {/* ── Slide 2: Details ── */}
        <div
          style={{
            minWidth: '100%',
            height: '100%',
            scrollSnapAlign: 'start',
            display: 'flex',
            flexDirection: 'column',
            padding: 16,
            flexShrink: 0,
            boxSizing: 'border-box',
          }}
        >
          {/* Stats row */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 12, flexShrink: 0 }}>
            {[
              { label: t.volume || 'Volume', value: `${calcVolume(s).toFixed(0)} kg` },
              { label: t.sets, value: countSets(s) },
              { label: t.exercises, value: countExercises(s) },
            ].map((stat, i, arr) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <p style={{ color: 'var(--muted)', fontSize: 10 }}>{stat.label}</p>
                <p style={{ color: 'var(--text)', fontSize: 14, fontWeight: 700 }}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, scrollbarWidth: 'none' }}>
            {s.notes && (
              <p style={{ color: 'var(--muted)', fontSize: 12, fontStyle: 'italic', marginBottom: 4 }}>
                {s.notes}
              </p>
            )}
            {s.exercises?.map((ex, i) => (
              <div key={i}>
                <p style={{ color: 'var(--text)', fontSize: 12, fontWeight: 600 }}>
                  {lang === 'pt' ? ex.namePt : ex.name}
                </p>
                <p style={{ color: 'var(--muted)', fontSize: 11, marginTop: 2, lineHeight: 1.5 }}>
                  {ex.sets?.map(set => `${set.weight || '—'}kg × ${set.reps || '—'}`).join('  ·  ')}
                </p>
              </div>
            ))}
          </div>

          {/* Dots */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => showSlide(0)}
              style={{
                width: 24,
                height: 4,
                borderRadius: 9999,
                border: 'none',
                background: activeSlide === 0 ? 'var(--accent)' : 'var(--muted)',
                opacity: activeSlide === 0 ? 1 : 0.35,
                cursor: 'pointer',
              }}
            />
            <button
              type="button"
              onClick={() => showSlide(1)}
              style={{
                width: 24,
                height: 4,
                borderRadius: 9999,
                border: 'none',
                background: activeSlide === 1 ? 'var(--accent)' : 'var(--muted)',
                opacity: activeSlide === 1 ? 1 : 0.35,
                cursor: 'pointer',
              }}
            />
          </div>
        </div>

      </div>
    </div>
  )
}

export default function HistoryPage() {
  const { t, lang, sessions } = useApp()
  const sorted = [...sessions].sort((a, b) => {
    const da = new Date(a.date).getTime()
    const db = new Date(b.date).getTime()
    if (db !== da) return db - da
    return b.id.localeCompare(a.id)
  })

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      <div className="px-5 pt-10 pb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{t.history}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-3 scrollbar-hide">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-20">
            <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>{t.noHistory}</p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{t.historyEmpty}</p>
          </div>
        ) : sorted.map(s => {
          const sessionBodyAreas = getSessionBodyAreas(s)
          return (
            <SwipeableCard
              key={s.id}
              s={s}
              t={t}
              lang={lang}
              sessionBodyAreas={sessionBodyAreas}
            />
          )
        })}
      </div>
    </div>
  )
}
