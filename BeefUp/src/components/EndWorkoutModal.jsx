import { useEffect, useRef } from 'react'
import { useEscapeKey } from '../lib/useEscapeKey'
import { Trophy, Flame } from 'lucide-react'
import { useApp } from '../context/useApp'
import './EndWorkoutModal.css'

function formatSessionLength(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

export default function EndWorkoutModal({ stats, onClose }) {
  const { t, lang } = useApp()
  const fired = useRef(false)
  const prs = stats.prs || []
  useEscapeKey(onClose)

  useEffect(() => {
    if (fired.current) return
    fired.current = true
    
    import('canvas-confetti').then(({ default: confetti }) => {
      confetti({ particleCount: 130, spread: 80, origin: { y: 0.5 } })
      if (prs.length) {
        setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 65, origin: { x: 0 } }), 200)
        setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 65, origin: { x: 1 } }), 350)
      }
    })
  }, [prs.length])

  return (
    <div role="dialog" aria-modal="true" className="modal-overlay">
      <div className="modal-center" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col items-center mb-5">
          <div
            className="pop ew-trophy"
          >
            <Trophy className="ew-trophy-icon" size={32} />
          </div>
          <h2 className="display text-body ew-title">{t.workoutDone}</h2>
          <p className="text-sm text-muted">{t.great}</p>
        </div>

        {prs.length > 0 && (
          <div
            className="fade-in ew-prs"
          >
            <div className="flex items-center gap-2 ew-prs-head">
              <Flame size={16} fill="currentColor" />
              {prs.length === 1
                ? (t.newPersonalRecord)
                : (lang === 'pt' ? `${prs.length} novos recordes!` : `${prs.length} new records!`)}
            </div>
            <p className="ew-prs-list">
              {prs.join(' · ')}
            </p>
          </div>
        )}

        <div className="flex gap-3 ew-stats">
          <StatBox label={t.totalTime} value={formatSessionLength(stats.duration)} />
          <StatBox label={t.totalSets} value={stats.totalSets} />
          <StatBox label={t.totalVolume} value={`${stats.totalVolume.toFixed(0)}kg`} />
        </div>

        <button className="btn btn-primary w-full" onClick={onClose}>{t.close}</button>
      </div>
    </div>
  )
}

function StatBox({ label, value }) {
  return (
    <div className="flex-1 flex flex-col items-center py-3 rounded-2xl ew-stat">
      <span className="display text-body ew-stat-value">{value}</span>
      <span className="text-xs mt-0.5 text-muted">{label}</span>
    </div>
  )
}
