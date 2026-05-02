import { useState } from 'react'
import { X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import exercisesData from '../data/exercises.json'

export default function PBEditModal({ onClose }) {
  const { t, lang, pbConfig, savePbConfig } = useApp()
  const [config, setConfig] = useState([...pbConfig])

  const slots = [0, 1, 2]

  function setSlot(i, val) {
    const next = [...config]
    next[i] = val === '' ? null : val
    setConfig(next)
  }

  function handleSave() {
    savePbConfig(config)
    onClose()
  }

  const exerciseOptions = exercisesData.map(e => ({
    id: e.id,
    label: lang === 'pt' ? e.namePt : e.name,
  }))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-center fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold text-base" style={{ color: 'var(--text)' }}>{t.choosePBs}</span>
          <button className="btn btn-ghost p-2" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="flex flex-col gap-3">
          {slots.map(i => (
            <div key={i}>
              <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Slot {i + 1}</label>
              <select
                className="field w-full"
                value={config[i] ?? ''}
                onChange={e => setSlot(i, e.target.value)}
                style={{ background: 'var(--surface)', color: 'var(--text)' }}
              >
                <option value="">—</option>
                <option value="steps">{t.pbSteps}</option>
                {exerciseOptions.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <button className="btn btn-primary w-full mt-5" onClick={handleSave}>{t.save}</button>
      </div>
    </div>
  )
}
