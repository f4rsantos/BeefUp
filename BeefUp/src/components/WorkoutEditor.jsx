import { useState } from "react";
import { ChevronLeft, Plus, Trash2, GripVertical } from "lucide-react";
import { uid } from "../lib/planUtils";
import exercisesData from "../data/exercises.json";
import ExercisePickerSimple from "./ExercisePickerSimple";

export default function WorkoutEditor({ workout, onSave, onBack, lang, t }) {
  const [name, setName] = useState(workout?.name ?? "");
  const [namePt, setNamePt] = useState(workout?.namePt ?? "");
  const [exIds, setExIds] = useState(workout?.exercises ?? []);
  const [restAfterSet, setRestAfterSet] = useState(workout?.restAfterSet ?? 120);
  const [showPicker, setShowPicker] = useState(false);

  function save() {
    if (!name.trim()) return;
    onSave({
      ...workout,
      id: workout?.id ?? uid(),
      name: name.trim(),
      namePt: namePt.trim() || name.trim(),
      exercises: exIds,
      restAfterSet: Math.max(0, parseInt(restAfterSet) || 120),
    });
    onBack();
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div className="flex items-center gap-1" style={{ padding: "34px 12px 14px" }}>
        <button className="btn-back" onClick={onBack} aria-label={t.back}>
          <ChevronLeft size={24} style={{ color: "var(--text)" }} />
        </button>
        <h1 className="display" style={{ fontSize: 24, fontWeight: 900, color: "var(--text)" }}>
          {workout?.id ? t.editWorkout : t.newWorkout}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-4 scrollbar-hide fade-in">
        <div className="card flex flex-col gap-3">
          <div>
            <label className="section-title" style={{ marginBottom: 6, display: "block" }}>
              {t.workoutName} · EN
            </label>
            <input
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Leg Day"
            />
          </div>
          <div>
            <label className="section-title" style={{ marginBottom: 6, display: "block" }}>
              {t.workoutName} · PT
            </label>
            <input
              className="field"
              value={namePt}
              onChange={(e) => setNamePt(e.target.value)}
              placeholder="e.g. Dia de Pernas"
            />
          </div>
          <div>
            <label className="section-title" style={{ marginBottom: 6, display: "block" }}>
              {lang === "pt" ? "Tempo entre sets (s)" : "Rest between sets (s)"}
            </label>
            <input
              className="field"
              type="number"
              min="0"
              step="1"
              value={restAfterSet}
              onChange={(e) => setRestAfterSet(e.target.value)}
              placeholder="120"
            />
          </div>
        </div>

        <div className="card flex flex-col gap-2">
          <div className="section-header">
            <p className="section-title" style={{ marginBottom: 0 }}>{t.exercises}</p>
            <span className="chip active" style={{ pointerEvents: "none" }}>{exIds.length}</span>
          </div>
          {exIds.map((id, i) => {
            const ex = exercisesData.find((e) => e.id === id);
            if (!ex) return null;
            return (
              <div
                key={id}
                className="flex items-center gap-2 py-2.5 px-3 rounded-xl"
                style={{ background: "var(--surface2)" }}
              >
                <GripVertical size={15} style={{ color: "var(--border)", flexShrink: 0 }} />
                <span className="text-sm flex-1 truncate" style={{ color: "var(--text)" }}>
                  {lang === "pt" ? ex.namePt : ex.name}
                </span>
                <button
                  className="btn-icon p-1"
                  onClick={() => setExIds((prev) => prev.filter((_, j) => j !== i))}
                >
                  <Trash2 size={14} style={{ color: "var(--muted)" }} />
                </button>
              </div>
            );
          })}
          {exIds.length === 0 && (
            <p className="text-xs" style={{ color: "var(--muted)", padding: "4px 2px" }}>
              {lang === "pt" ? "Sem exercícios ainda." : "No exercises yet."}
            </p>
          )}
          <button
            className="btn btn-ghost w-full py-2.5 text-sm mt-1"
            style={{ borderStyle: "dashed" }}
            onClick={() => setShowPicker(true)}
          >
            <Plus size={15} /> {t.addExercise}
          </button>
        </div>

        <button className="btn btn-primary w-full py-3.5" onClick={save}>
          {t.save}
        </button>
      </div>

      {showPicker && (
        <ExercisePickerSimple
          lang={lang}
          t={t}
          selected={exIds}
          onToggle={(id) =>
            setExIds((prev) =>
              prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
            )
          }
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
