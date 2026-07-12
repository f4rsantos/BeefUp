import { useState } from "react";
import { Check } from "lucide-react";
import exercisesData from "../data/exercises.json";

export default function ExercisePickerSimple({
  lang,
  t,
  selected,
  onToggle,
  onClose,
}) {
  const [query, setQuery] = useState("");
  const filtered = exercisesData.filter((e) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) || e.namePt.toLowerCase().includes(q)
    );
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="flex items-center justify-between mb-3">
          <h3 className="display" style={{ fontSize: 20, fontWeight: 900, color: "var(--text)" }}>
            {t.exercises}
          </h3>
          <button className="btn btn-primary px-4 py-2 text-xs" onClick={onClose}>
            {t.done}
          </button>
        </div>
        <input
          className="field mb-3"
          placeholder={t.searchExercises}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex flex-col gap-1.5" style={{ maxHeight: "54vh", overflowY: "auto" }}>
          {filtered.map((ex) => {
            const on = selected.includes(ex.id);
            return (
              <button
                key={ex.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{
                  background: on ? "var(--accent-soft)" : "var(--surface2)",
                  border: `1px solid ${on ? "var(--accent)" : "transparent"}`,
                }}
                onClick={() => onToggle(ex.id)}
              >
                <span
                  className="flex items-center justify-center rounded-lg"
                  style={{
                    width: 22, height: 22, flexShrink: 0,
                    background: on ? "var(--grad-accent)" : "transparent",
                    border: on ? "none" : "1.5px solid var(--border)",
                  }}
                >
                  {on && <Check size={14} strokeWidth={3} style={{ color: "#fff" }} />}
                </span>
                <span className="text-sm flex-1 text-left truncate" style={{ color: "var(--text)", fontWeight: on ? 700 : 400 }}>
                  {lang === "pt" ? ex.namePt : ex.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
