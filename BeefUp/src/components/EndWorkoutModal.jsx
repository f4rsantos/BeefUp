import { useEffect, useRef } from 'react'
import { Trophy, Flame } from 'lucide-react'
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
  const { t, lang } = useApp()
  const fired = useRef(false)
  const prs = stats.prs || []

  useEffect(() => {
    if (!fired.current) {
      fired.current = true
      confetti({ particleCount: 130, spread: 80, origin: { y: 0.5 } })
      if (prs.length) {
        setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 65, origin: { x: 0 } }), 200)
        setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 65, origin: { x: 1 } }), 350)
      }
    }
  }, [prs.length])

  return (
    <div className="modal-overlay">
      <div className="modal-center" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col items-center mb-5">
          <div
            className="pop"
            style={{
              width: 64, height: 64, borderRadius: 20, marginBottom: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--grad-accent)', boxShadow: 'var(--shadow-glow)',
            }}
          >
            <Trophy size={32} style={{ color: '#fff' }} />
          </div>
          <h2 className="display" style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)' }}>{t.workoutDone}</h2>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{t.great}</p>
        </div>

        {prs.length > 0 && (
          <div
            className="fade-in"
            style={{
              borderRadius: 16, padding: '12px 14px', marginBottom: 16,
              background: 'var(--grad-energy)', color: '#fff',
            }}
          >
            <div className="flex items-center gap-2" style={{ fontWeight: 800, fontSize: 13 }}>
              <Flame size={16} fill="currentColor" />
              {prs.length === 1
                ? (lang === 'pt' ? 'Novo recorde pessoal!' : 'New personal record!')
                : (lang === 'pt' ? `${prs.length} novos recordes!` : `${prs.length} new records!`)}
            </div>
            <p style={{ fontSize: 12, opacity: 0.92, marginTop: 4, lineHeight: 1.4 }}>
              {prs.join(' · ')}
            </p>
          </div>
        )}

        <div className="flex gap-3" style={{ marginBottom: 10 }}>
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
    <div className="flex-1 flex flex-col items-center py-3 rounded-2xl" style={{ background: 'var(--surface2)' }}>
      <span className="display" style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>{value}</span>
      <span className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{label}</span>
    </div>
  )
}
