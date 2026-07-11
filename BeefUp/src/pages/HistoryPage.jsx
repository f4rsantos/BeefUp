import { useRef, useState, useEffect } from 'react'
import { ChevronDown, ChevronLeft, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { bodyAreasForSessions } from '../lib/muscles'
import HumanBody from '../components/HumanBody'

function formatDate(iso, lang) {
  const locale = lang === 'pt' ? 'pt-PT' : 'en-US'
  const d = new Date(iso)
  const dateStr = d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
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

const EXPANDED_HEIGHT = 460
const BODY_NATURAL_HEIGHT = 500
const BODY_NATURAL_WIDTH = 207
const SCALE = (EXPANDED_HEIGHT - 60) / BODY_NATURAL_HEIGHT

function Dots({ activeSlide, showSlide }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center', flexShrink: 0 }}>
      {[0, 1].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => showSlide(i)}
          style={{
            width: 24,
            height: 4,
            borderRadius: 9999,
            border: 'none',
            background: activeSlide === i ? 'var(--accent)' : 'var(--muted)',
            opacity: activeSlide === i ? 1 : 0.35,
            cursor: 'pointer',
          }}
        />
      ))}
    </div>
  )
}

function SwipeableCard({ s, t, lang, sessionBodyAreas, onDelete }) {
  const sliderRef = useRef(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const isDragging = useRef(false)
  const lockedAxis = useRef(null) // 'x' | 'y' | null
  const [activeSlide, setActiveSlide] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.scrollTo({
        left: activeSlide * sliderRef.current.offsetWidth,
        behavior: 'smooth',
      })
    }
  }, [activeSlide, expanded])

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
    if (!lockedAxis.current && (dx > 5 || dy > 5)) {
      lockedAxis.current = dx > dy ? 'x' : 'y'
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

  const showSlide = (index) => setActiveSlide(index)

  const toggleExpanded = () => {
    setExpanded((prev) => !prev)
    setConfirmDelete(false)
  }

  const handleDeleteClick = (e) => {
    e.stopPropagation()
    if (confirmDelete) {
      onDelete(s.id)
    } else {
      setConfirmDelete(true)
    }
  }

  return (
    <div
      className="card overflow-hidden"
      style={{ padding: 0, flexShrink: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}
    >
      {/* Fixed header: name + date (clickable) */}
      <div
        onClick={toggleExpanded}
        style={{
          padding: '20px 20px 16px',
          flexShrink: 0,
          borderBottom: expanded ? '1px solid var(--border)' : 'none',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          cursor: 'pointer',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 20, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {s.workoutName}
          </p>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>{formatDate(s.date, lang)}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            aria-label="delete"
            onClick={handleDeleteClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: confirmDelete ? 'var(--danger)' : 'transparent',
              border: confirmDelete ? 'none' : '1px solid var(--border)',
              borderRadius: 8,
              padding: confirmDelete ? '6px 10px' : 6,
              cursor: 'pointer',
              color: confirmDelete ? '#fff' : 'var(--muted)',
              transition: 'background 0.15s ease',
            }}
          >
            <Trash2 size={16} />
            {confirmDelete && (
              <span style={{ fontSize: 12, fontWeight: 600 }}>
                {lang === 'pt' ? 'Confirmar' : 'Confirm'}
              </span>
            )}
          </button>

          <ChevronDown
            size={20}
            style={{
              color: 'var(--muted)',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          />
        </div>
      </div>

      {/* Swipe area (only when expanded) */}
      {expanded && (
        <div style={{ height: `${EXPANDED_HEIGHT}px`, position: 'relative', overflow: 'hidden' }}>
          {activeSlide === 1 && (
            <button
              type="button"
              aria-label="previous"
              onClick={() => showSlide(0)}
              style={{ position: 'absolute', left: 0, top: 0, bottom: 40, width: '30%', background: 'transparent', border: 'none', zIndex: 1, cursor: 'pointer' }}
            />
          )}
          {activeSlide === 0 && (
            <button
              type="button"
              aria-label="next"
              onClick={() => showSlide(1)}
              style={{ position: 'absolute', right: 0, top: 0, bottom: 40, width: '30%', background: 'transparent', border: 'none', zIndex: 1, cursor: 'pointer' }}
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
            {/* Slide 1: stats / details */}
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
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 12, flexShrink: 0 }}>
                {[
                  { label: t.volume || 'Volume', value: `${calcVolume(s).toFixed(0)} kg` },
                  { label: t.sets, value: countSets(s) },
                  { label: t.exercises, value: countExercises(s) },
                ].map((stat, i, arr) => (
                  <div
                    key={i}
                    style={{ flex: 1, textAlign: 'center', borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}
                  >
                    <p style={{ color: 'var(--muted)', fontSize: 11 }}>{stat.label}</p>
                    <p style={{ color: 'var(--text)', fontSize: 16, fontWeight: 700 }}>{stat.value}</p>
                  </div>
                ))}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, scrollbarWidth: 'none' }}>
                {s.exercises?.map((ex, i) => (
                  <div key={i}>
                    <p style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>
                      {lang === 'pt' ? ex.namePt : ex.name}
                    </p>
                    <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2, lineHeight: 1.5 }}>
                      {ex.sets?.map(set => `${set.weight || '—'}kg × ${set.reps || '—'}`).join('    ·    ')}
                    </p>
                    {ex.note && (
                      <p style={{ color: 'var(--muted)', fontSize: 12, fontStyle: 'italic', marginTop: 2 }}>{ex.note}</p>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ paddingTop: 10 }}>
                <Dots activeSlide={activeSlide} showSlide={showSlide} />
              </div>
            </div>

            {/* Slide 2: human body */}
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
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 16, overflow: 'hidden', flexWrap: 'wrap', paddingTop: 12 }}>
                {['front', 'back'].map((view) => (
                  <div key={view} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '45%' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                      {view === 'front' ? (lang === 'pt' ? 'Frente' : 'Front') : (lang === 'pt' ? 'Costas' : 'Back')}
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

              <div style={{ paddingBottom: 10 }}>
                <Dots activeSlide={activeSlide} showSlide={showSlide} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function HistoryPage({ onBack }) {
  const { t, lang, sessions, deleteSession } = useApp()
  const sorted = [...sessions].sort((a, b) => {
    const da = new Date(a.date).getTime()
    const db = new Date(b.date).getTime()
    if (db !== da) return db - da
    return b.id.localeCompare(a.id)
  })

  const handleDelete = (sessionId) => {
    deleteSession?.(sessionId)
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center gap-2" style={{ padding: '34px 16px 14px' }}>
        {onBack && (
          <button className="btn-back" aria-label="back" onClick={onBack}>
            <ChevronLeft size={20} />
          </button>
        )}
        <h1 className="display" style={{ fontSize: 30, fontWeight: 900, color: 'var(--text)', lineHeight: 1.05 }}>
          {t.history}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-3 scrollbar-hide fade-in">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-20">
            <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>{t.noHistory}</p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{t.historyEmpty}</p>
          </div>
        ) : sorted.map(s => (
          <SwipeableCard
            key={s.id}
            s={s}
            t={t}
            lang={lang}
            sessionBodyAreas={bodyAreasForSessions([s])}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  )
}
