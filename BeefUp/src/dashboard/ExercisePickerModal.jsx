import { useState } from "react";
import { Check, X } from "lucide-react";
import exercisesData from "../data/exercises.json";

export default function ExercisePickerModal({ lang, t, selected, onToggle, onClose }) {
  const [query, setQuery] = useState("");
  const filtered = exercisesData.filter((e) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return e.name.toLowerCase().includes(q) || e.namePt.toLowerCase().includes(q);
  });

  return (
    <div className="modal-overlay" style={{ alignItems: "center" }} onClick={onClose}>
      <div className="modal-center" style={{ maxWidth: 460, maxHeight: "80vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="display" style={{ fontSize: 20, fontWeight: 900, color: "var(--text)" }}>{t.exercises}</h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <input className="field mb-3" placeholder={t.searchExercises} value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
        <div className="flex flex-col gap-1" style={{ overflowY: "auto" }}>
          {filtered.map((e) => {
            const on = selected.includes(e.id);
            return (
              <button key={e.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl" style={{ background: on ? "var(--accent-soft)" : "var(--surface2)", textAlign: "left" }} onClick={() => onToggle(e.id)}>
                <span className="text-sm flex-1" style={{ color: "var(--text)" }}>{lang === "pt" ? e.namePt : e.name}</span>
                {on && <Check size={16} style={{ color: "var(--accent)" }} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
