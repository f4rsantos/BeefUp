import { useState } from 'react'
import { useApp } from '../context/useApp'
import NumberField from './NumberField'
import { epley } from '../lib/planUtils'
import Modal from './ui/Modal'
import Field from './ui/Field'

export default function OneRMModal({ onClose }) {
  const { t } = useApp()
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')

  const rm = (() => {
    const w = parseFloat(weight)
    const r = parseInt(reps)
    if (!w || !r || r <= 0) return null
    if (r === 1) return w
    return epley(weight, reps).toFixed(1)
  })()

  return (
    <Modal title={t.oneRM} onClose={onClose} closeLabel={t.cancel} dismissOnBackdrop>
      <div className="flex gap-3">
        <Field className="flex-1" label={t.weight}>
          <NumberField
            className="field w-full"
            placeholder="kg"
            value={weight}
            onChange={e => setWeight(e.target.value)}
          />
        </Field>
        <Field className="flex-1" label={t.reps}>
          <NumberField
            className="field w-full"
            allowDecimal={false}
            placeholder="reps"
            value={reps}
            onChange={e => setReps(e.target.value)}
          />
        </Field>
      </div>

      {rm !== null && (
        <div className="text-center py-4">
          <p className="field-label">{t.oneRMResult}</p>
          <p className="text-4xl font-bold">{rm} <span className="text-xl font-normal">kg</span></p>
        </div>
      )}
    </Modal>
  )
}
