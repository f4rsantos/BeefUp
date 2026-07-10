import { useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
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
      <div className="flex items-center gap-3 px-5 pt-10 pb-6">
        <button className="btn-back" onClick={onBack}>
          <ArrowLeft size={18} style={{ color: "var(--text)" }} />
        </button>
        <span
          className="font-semibold text-base"
          style={{ color: "var(--text)" }}
        >
          {workout?.id ? t.editWorkout : t.newWorkout}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-5 scrollbar-hide">
        <div className="card flex flex-col gap-4">
          <div>
            <label
              className="text-xs mb-1 block"
              style={{ color: "var(--muted)" }}
            >
              Nome (EN)
            </label>
            <input
              className="field w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Leg Day"
            />
          </div>
          <div>
            <label
              className="text-xs mb-1 block"
              style={{ color: "var(--muted)" }}
            >
              Nome (PT)
            </label>
            <input
              className="field w-full"
              value={namePt}
              onChange={(e) => setNamePt(e.target.value)}
              placeholder="e.g. Dia de Pernas"
            />
          </div>
          <div>
            <label
              className="text-xs mb-1 block"
              style={{ color: "var(--muted)" }}
            >
              Tempo entre sets (s)
            </label>
            <input
              className="field w-full"
              type="number"
              min="0"
              step="1"
              value={restAfterSet}
              onChange={(e) => setRestAfterSet(e.target.value)}
              placeholder="120"
            />
          </div>
        </div>

        <div className="card flex flex-col gap-3">
          <p
            className="text-sm font-medium mb-1"
            style={{ color: "var(--text)" }}
          >
            Exercícios
          </p>
          {exIds.map((id, i) => {
            const ex = exercisesData.find((e) => e.id === id);
            if (!ex) return null;
            return (
              <div
                key={id}
                className="flex items-center justify-between py-3 px-3 rounded-lg"
                style={{ background: "var(--surface2)" }}
              >
                <span className="text-sm" style={{ color: "var(--text)" }}>
                  {lang === "pt" ? ex.namePt : ex.name}
                </span>
                <button
                  className="btn btn-ghost p-1"
                  onClick={() =>
                    setExIds((prev) => prev.filter((_, j) => j !== i))
                  }
                >
                  <Trash2 size={14} style={{ color: "var(--muted)" }} />
                </button>
              </div>
            );
          })}
          <button
            className="btn btn-ghost w-full py-3 text-sm mt-2"
            onClick={() => setShowPicker(true)}
          >
            <Plus size={14} /> {t.addExercise}
          </button>
        </div>

        <button className="btn btn-primary w-full py-3" onClick={save}>
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
