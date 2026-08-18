import { useState } from 'react'
import { X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import NumberField from './NumberField'

export default function OneRMModal({ onClose }) {
  const { t } = useApp()
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')

  const rm = (() => {
    const w = parseFloat(weight)
    const r = parseInt(reps)
    if (!w || !r || r <= 0) return null
    if (r === 1) return w
    return (w * (1 + r / 30)).toFixed(1)
  })()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-center fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <span className="font-semibold text-base" style={{ color: 'var(--text)' }}>{t.oneRM}</span>
          <button className="btn btn-ghost p-2" onClick={onClose} aria-label={t.cancel}><X size={18} /></button>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>{t.weight}</label>
            <NumberField
              className="field w-full"
              placeholder="kg"
              value={weight}
              onChange={e => setWeight(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>{t.reps}</label>
            <NumberField
              className="field w-full"
              allowDecimal={false}
              placeholder="reps"
              value={reps}
              onChange={e => setReps(e.target.value)}
            />
          </div>
        </div>

        {rm !== null && (
          <div className="text-center py-4">
            <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>{t.oneRMResult}</p>
            <p className="text-4xl font-bold" style={{ color: 'var(--text)' }}>{rm} <span className="text-xl font-normal">kg</span></p>
          </div>
        )}
      </div>
    </div>
  )
}
