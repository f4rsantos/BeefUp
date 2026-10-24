import { useState } from "react";
import { useApp } from "../context/useApp";
import { useEscapeKey } from "../lib/useEscapeKey";

export default function SaveFreeWorkoutModal({ onSave, onSkip }) {
  const { t } = useApp();
  const [name, setName] = useState("");
  const trimmed = name.trim();
  useEscapeKey(onSkip);

  return (
    <div role="dialog" aria-modal="true" className="modal-overlay">
      <div className="modal-center fade-in" onClick={(e) => e.stopPropagation()}>
        <p className="font-semibold mb-1" style={{ color: "var(--text)" }}>{t.saveFreeTitle}</p>
        <p className="text-sm" style={{ color: "var(--muted)", marginBottom: 12 }}>{t.saveFreeMessage}</p>
        <label className="section-title" htmlFor="free-workout-name">{t.workoutName}</label>
        <input
          id="free-workout-name"
          className="field mt-1"
          style={{ marginBottom: 14 }}
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && trimmed) onSave(trimmed); }}
        />
        <div className="flex gap-3">
          <button className="btn btn-ghost flex-1" onClick={onSkip}>{t.discardChanges}</button>
          <button
            className="btn btn-primary flex-1"
            disabled={!trimmed}
            style={{ opacity: trimmed ? 1 : 0.5 }}
            onClick={() => onSave(trimmed)}
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
