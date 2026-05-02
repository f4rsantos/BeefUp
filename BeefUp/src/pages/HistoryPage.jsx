import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useApp } from '../context/AppContext'

function formatDuration(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

function calcVolume(session) {
  return session.exercises?.reduce((acc, ex) =>
    acc + (ex.sets?.reduce((a, s) => a + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0) ?? 0), 0) ?? 0
}

function countSets(session) {
  return session.exercises?.reduce((acc, ex) => acc + (ex.sets?.length ?? 0), 0) ?? 0
}

export default function HistoryPage() {
  const { t, lang, sessions } = useApp()
  const [expanded, setExpanded] = useState(null)
  const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      <div className="px-5 pt-6 pb-3">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{t.history}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-3 scrollbar-hide">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-20">
            <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>{t.noHistory}</p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{t.historyEmpty}</p>
          </div>
        ) : sorted.map(s => {
          const isOpen = expanded === s.id
          return (
            <div key={s.id} className="card">
              <button className="w-full text-left" onClick={() => setExpanded(isOpen ? null : s.id)}>
                <div className="flex items-start justify-between gap-2">
                  <div style={{ minWidth: 0 }}>
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{s.workoutName}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                      {formatDate(s.date)} · {formatDuration(s.duration)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>{calcVolume(s).toFixed(0)} kg</p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>{countSets(s)} {t.sets}</p>
                    </div>
                    {isOpen
                      ? <ChevronUp  size={15} style={{ color: 'var(--muted)' }} />
                      : <ChevronDown size={15} style={{ color: 'var(--muted)' }} />}
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="mt-3 pt-3 flex flex-col gap-3" style={{ borderTop: '1px solid var(--border)' }}>
                  {s.exercises?.map((ex, i) => (
                    <div key={i}>
                      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>
                        {lang === 'pt' ? ex.namePt : ex.name}
                      </p>
                      <div className="flex flex-col gap-0.5">
                        {ex.sets?.map((set, j) => (
                          <p key={j} className="text-xs" style={{ color: 'var(--muted)' }}>
                            {j + 1}. {set.weight || '—'} kg × {set.reps || '—'}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
