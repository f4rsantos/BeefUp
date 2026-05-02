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
      <div className="modal-sheet fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span
            className="font-semibold text-sm"
            style={{ color: "var(--text)" }}
          >
            Exercícios
          </span>
          <button
            className="btn btn-primary px-4 py-2 text-xs"
            onClick={onClose}
          >
            {t.done}
          </button>
        </div>
        <input
          className="field w-full mb-3"
          placeholder={t.searchExercises}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex flex-col gap-1 max-h-72 overflow-y-auto scrollbar-hide">
          {filtered.map((ex) => {
            const on = selected.includes(ex.id);
            return (
              <button
                key={ex.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{
                  background: on ? "var(--surface2)" : "transparent",
                  border: `1px solid ${on ? "var(--border)" : "transparent"}`,
                }}
                onClick={() => onToggle(ex.id)}
              >
                <span className="text-sm" style={{ color: "var(--text)" }}>
                  {lang === "pt" ? ex.namePt : ex.name}
                </span>
                {on && <Check size={14} style={{ color: "var(--success)" }} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
