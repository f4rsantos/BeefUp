import { useRef, useState, useEffect, useMemo } from 'react'
import { ChevronDown, Trash2 } from 'lucide-react'
import { useApp } from '../context/useApp'
import HumanBody from '../components/HumanBody'
import { bodyAreasForSessions } from '../lib/muscles'
import { sessionVolume, sessionSets } from '../lib/planUtils'
import { localizedName } from '../lib/localizedName'
import { formatSet } from '../lib/setFormat'
import NavHeader from '../components/ui/NavHeader'
import './HistoryPage.css'

function formatDate(iso) {
  const d = new Date(iso)
  const dateStr = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return iso.length > 10 ? `${dateStr} · ${timeStr}` : dateStr
}

function countExercises(session) {
  return session.exercises?.length ?? 0
}

const EXPANDED_HEIGHT = 460
const BODY_NATURAL_HEIGHT = 500
const BODY_NATURAL_WIDTH = 207
const SCALE = (EXPANDED_HEIGHT - 60) / BODY_NATURAL_HEIGHT

function SlideDots({ activeSlide, onSelect, edge }) {
  return (
    <div className={`hp-dots ${edge}`}>
      {[0, 1].map((index) => (
        <button
          key={index}
          type="button"
          onClick={() => onSelect(index)}
          className={`hp-dot${activeSlide === index ? ' on' : ''}`}
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
    <div className="card overflow-hidden hp-card">
      <div onClick={toggleExpanded} className={`hp-head${expanded ? ' open' : ''}`}>
        <div className="hp-head-text">
          <p className="text-body hp-name">
            {s.workoutName}
          </p>
          <p className="text-muted hp-date">
            {formatDate(s.date)}
          </p>
        </div>

        <div className="hp-actions">
          <button
            type="button"
            aria-label="delete"
            onClick={handleDeleteClick}
            className={`hp-delete${confirmDelete ? ' confirm' : ''}`}
          >
            <Trash2 size={16} />
            {confirmDelete && <span>{t.confirm}</span>}
          </button>

          <ChevronDown className={`text-muted hp-chevron${expanded ? ' open' : ''}`} size={20} />
        </div>
      </div>

      {expanded && (
        <div className="hp-body" style={{ height: `${EXPANDED_HEIGHT}px` }}>
          {activeSlide === 1 && (
            <button type="button" aria-label="previous" onClick={() => showSlide(0)} className="hp-edge prev" />
          )}
          {activeSlide === 0 && (
            <button type="button" aria-label="next" onClick={() => showSlide(1)} className="hp-edge next" />
          )}
          <div
            ref={sliderRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="hp-slider"
          >
            <div className="hp-slide details">
              <div className="hp-stats">
                {[
                  { label: t.volume || 'Volume', value: `${sessionVolume(s).toFixed(0)} kg` },
                  { label: t.sets, value: sessionSets(s) },
                  { label: t.exercises, value: countExercises(s) },
                ].map((stat, i) => (
                  <div key={i} className="hp-stat">
                    <p className="text-muted hp-stat-label">{stat.label}</p>
                    <p className="text-body hp-stat-value">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="hp-list">
                {s.notes && (
                  <p className="text-muted hp-notes">
                    {s.notes}
                  </p>
                )}
                {s.exercises?.map((ex, i) => (
                  <div key={i}>
                    <p className="text-body hp-ex-name">
                      {localizedName(ex, lang)}
                    </p>
                    <p className="text-muted hp-ex-sets">
                      {ex.sets?.map(set => formatSet(set, ex.exerciseId)).join('    ·    ')}
                    </p>
                  </div>
                ))}
              </div>

              <SlideDots activeSlide={activeSlide} onSelect={showSlide} edge="top" />
            </div>

            <div className="hp-slide body">
              <div className="hp-figures">
                {['front', 'back'].map((view) => (
                  <div key={view} className="hp-figure">
                    <div className="text-muted hp-figure-label">
                      {view === 'front' ? t.bodyFront : t.bodyBack}
                    </div>
                    <div
                      className="hp-figure-body"
                      style={{
                        transform: `scale(${SCALE})`,
                        width: `${BODY_NATURAL_WIDTH}px`,
                        height: `${BODY_NATURAL_HEIGHT}px`,
                      }}
                    >
                      <HumanBody view={view} highlightedMuscles={sessionBodyAreas[view]} />
                    </div>
                  </div>
                ))}
              </div>

              <SlideDots activeSlide={activeSlide} onSelect={showSlide} edge="bottom" />
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

export default function HistoryPage({ onBack }) {
  const { t, lang, sessions, deleteSession } = useApp()
  const sorted = useMemo(
    () =>
      [...sessions].sort((a, b) => {
        const da = new Date(a.date).getTime()
        const db = new Date(b.date).getTime()
        if (db !== da) return db - da
        return b.id.localeCompare(a.id)
      }),
    [sessions],
  )
  const bodyAreasBySessionId = useMemo(
    () => Object.fromEntries(sorted.map((s) => [s.id, bodyAreasForSessions([s])])),
    [sorted],
  )

  const handleDelete = (sessionId) => {
    deleteSession?.(sessionId)
  }

  return (
    <div className="flex flex-col h-full canvas-bg">
      <div
        className="flex-1 overflow-y-auto pb-4 flex flex-col gap-3 scrollbar-hide page-pad"
      >
        <NavHeader
          title={t.history}
          onBack={onBack}
          backLabel={t.back}
        />
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-20">
            <p className="font-semibold mb-1 text-body">{t.noHistory}</p>
            <p className="text-sm text-muted">{t.historyEmpty}</p>
          </div>
        ) : sorted.map(s => {
          const sessionBodyAreas = bodyAreasBySessionId[s.id]
          return (
            <SwipeableCard
              key={s.id}
              s={s}
              t={t}
              lang={lang}
              sessionBodyAreas={sessionBodyAreas}
              onDelete={handleDelete}
            />
          )
        })}
      </div>
    </div>
  )
}