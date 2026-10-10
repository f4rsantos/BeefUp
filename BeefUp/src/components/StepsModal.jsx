import { useState } from 'react'
import { useEscapeKey } from '../lib/useEscapeKey'
import { X } from 'lucide-react'
import { useApp } from '../context/useApp'
import { todayISO } from '../lib/planUtils'
import NumberField from './NumberField'

export default function StepsModal({ onClose }) {
  useEscapeKey(onClose)
  const { t, stepsMap, saveSteps } = useApp()
  const today = todayISO()
  const [val, setVal] = useState(stepsMap[today] ?? '')

  async function handleSave() {
    const n = parseInt(val)
    if (!isNaN(n) && n >= 0) {
      await saveSteps(today, n)
    }
    onClose()
  }

  return (
    <div role="dialog" aria-modal="true" className="modal-overlay" onClick={onClose}>
      <div className="modal-center fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold text-base" style={{ color: 'var(--text)' }}>{t.stepsToday}</span>
          <button className="btn btn-ghost p-2" onClick={onClose} aria-label={t.cancel}><X size={18} /></button>
        </div>
        <NumberField
          className="field w-full mb-4"
          allowDecimal={false}
          placeholder={t.stepsPlaceholder}
          value={val}
          onChange={e => setVal(e.target.value)}
          autoFocus
        />
        <button className="btn btn-primary w-full" onClick={handleSave}>{t.saveSteps}</button>
      </div>
    </div>
  )
}
