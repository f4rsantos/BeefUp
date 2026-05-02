import { useEffect, useRef } from 'react'
import { X, Trophy } from 'lucide-react'
import confetti from 'canvas-confetti'
import { useApp } from '../context/AppContext'

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

export default function EndWorkoutModal({ stats, onClose }) {
  const { t } = useApp()
  const fired = useRef(false)

  useEffect(() => {
    if (!fired.current) {
      fired.current = true
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } })
    }
  }, [])

  return (
    <div className="modal-overlay">
      <div className="modal-center fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col items-center mb-5">
          <Trophy size={36} style={{ color: 'var(--accent)' }} className="mb-2" />
          <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{t.workoutDone}</h2>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{t.great}</p>
        </div>

        <div className="flex gap-3 mb-5">
          <StatBox label={t.totalTime} value={formatDuration(stats.duration)} />
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
    <div className="flex-1 flex flex-col items-center py-3 rounded-xl" style={{ background: 'var(--surface2)' }}>
      <span className="text-lg font-bold" style={{ color: 'var(--text)' }}>{value}</span>
      <span className="text-xs" style={{ color: 'var(--muted)' }}>{label}</span>
    </div>
  )
}
