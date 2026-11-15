import { useState } from 'react'
import { useApp } from '../context/useApp'
import { todayISO } from '../lib/planUtils'
import NumberField from './NumberField'
import Modal from './ui/Modal'

export default function StepsModal({ onClose }) {
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
    <Modal title={t.stepsToday} onClose={onClose} closeLabel={t.cancel} dismissOnBackdrop>
      <div className="modal-stack">
        <NumberField
          className="field w-full"
          allowDecimal={false}
          placeholder={t.stepsPlaceholder}
          value={val}
          onChange={e => setVal(e.target.value)}
          autoFocus
        />
        <button className="btn btn-primary w-full" onClick={handleSave}>{t.saveSteps}</button>
      </div>
    </Modal>
  )
}
