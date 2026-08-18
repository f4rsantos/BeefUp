import { useState } from "react";
import { ChevronLeft, Plus, Trash2, Pencil, GripVertical } from "lucide-react";
import { uid } from "../lib/planUtils";
import { resolveExercise, normalizeWorkoutExercises } from "../lib/exerciseTree";
import ExercisePicker from "./ExercisePicker";
import NumberField from "./NumberField";
import { localizedName } from "../lib/localizedName"

function ExercisePresetModal({ item, exerciseLabel, onSave, onClose, t }) {
  const [note, setNote] = useState(item.note ?? "");
  const [weight, setWeight] = useState(item.weight ?? "");
  const [reps, setReps] = useState(item.reps ?? "");

  return (
    <div className="modal-overlay" style={{ alignItems: "center" }} onClick={onClose}>
      <div className="modal-center" onClick={(e) => e.stopPropagation()}>
        <p className="font-semibold mb-3" style={{ color: "var(--text)" }}>{exerciseLabel}</p>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--muted)" }}>{t.exerciseNote}</label>
            <textarea
              className="field w-full"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs mb-1 block" style={{ color: "var(--muted)" }}>{t.weight}</label>
              <NumberField
                className="field w-full"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs mb-1 block" style={{ color: "var(--muted)" }}>{t.reps}</label>
              <NumberField
                className="field w-full"
                allowDecimal={false}
                value={reps}
                onChange={(e) => setReps(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button className="btn btn-ghost flex-1 py-3 text-sm" onClick={onClose}>
            {t.cancel}
          </button>
          <button
            className="btn btn-primary flex-1 py-3 text-sm"
            onClick={() => onSave({ note, weight, reps })}
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WorkoutEditor({ workout, onSave, onBack, lang, t }) {
  const [name, setName] = useState(workout?.name ?? "");
  const [exItems, setExItems] = useState(() => normalizeWorkoutExercises(workout?.exercises));
  const [restAfterSet, setRestAfterSet] = useState(workout?.restAfterSet ?? 120);
  const [showPicker, setShowPicker] = useState(false);
  const [editingExIdx, setEditingExIdx] = useState(null);

  function save() {
    if (!name.trim()) return;
    onSave({
      ...workout,
      id: workout?.id ?? uid(),
      name: name.trim(),
      exercises: exItems,
      restAfterSet: Math.max(0, parseInt(restAfterSet) || 120),
    });
    onBack();
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div
        className="flex-1 overflow-y-auto pb-6 flex flex-col gap-4 scrollbar-hide fade-in"
        style={{ paddingTop: "var(--page-py-top)", paddingLeft: "var(--page-px)", paddingRight: "var(--page-px)" }}
      >
        <div className="flex items-center gap-1">
          <button className="btn-back" onClick={onBack} aria-label={t.back}>
            <ChevronLeft size={24} style={{ color: "var(--text)" }} />
          </button>
          <h1 className="display" style={{ fontSize: 24, fontWeight: 900, color: "var(--text)" }}>
            {workout?.id ? t.editWorkout : t.newWorkout}
          </h1>
        </div>
        <div className="card flex flex-col gap-3">
          <div>
            <label className="section-title" style={{ marginBottom: 6, display: "block" }}>
              {t.workoutName}
            </label>
            <input
              className="field"
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
              Tempo entre sets (s)
            </label>
            <NumberField
              className="field w-full"
              allowDecimal={false}
              value={restAfterSet}
              onChange={(e) => setRestAfterSet(e.target.value)}
              placeholder="120"
            />
          </div>
        </div>

        <div className="card flex flex-col gap-2">
          <div className="section-header">
            <p className="section-title" style={{ marginBottom: 0 }}>{t.exercises}</p>
            <span className="chip active" style={{ pointerEvents: "none" }}>{exItems.length}</span>
          </div>
          {exItems.map((item, i) => {
            const ex = resolveExercise(item.ref);
            if (!ex) return null;
            return (
              <div
                key={`${item.ref}-${i}`}
                className="flex items-center gap-2 py-2.5 px-3 rounded-xl"
                style={{ background: "var(--surface2)" }}
              >
                <GripVertical size={15} style={{ color: "var(--border)", flexShrink: 0 }} />
                <span className="text-sm flex-1 truncate" style={{ color: "var(--text)" }}>
                  {localizedName(ex, lang)}
                </span>
                <button className="btn-icon p-1" onClick={() => setEditingExIdx(i)} aria-label={t.edit}>
                  <Pencil size={14} style={{ color: "var(--muted)" }} />
                </button>
                <button
                  className="btn-icon p-1"
                  onClick={() => setExItems((prev) => prev.filter((_, j) => j !== i))}
                  aria-label={t.delete}
                >
                  <Trash2 size={14} style={{ color: "var(--muted)" }} />
                </button>
              </div>
            );
          })}
          {exItems.length === 0 && (
            <p className="text-xs" style={{ color: "var(--muted)", padding: "4px 2px" }}>
              {t.noExercisesYet}
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
        <ExercisePicker
          onConfirm={(refs) => {
            setExItems((prev) => [...prev, ...refs.map((ref) => ({ ref }))]);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {editingExIdx !== null && (() => {
        const item = exItems[editingExIdx];
        const ex = resolveExercise(item.ref);
        return (
          <ExercisePresetModal
            item={item}
            exerciseLabel={ex ? (localizedName(ex, lang)) : ""}
            t={t}
            onClose={() => setEditingExIdx(null)}
            onSave={(patch) => {
              setExItems((prev) => prev.map((it, j) => (j === editingExIdx ? { ...it, ...patch } : it)));
              setEditingExIdx(null);
            }}
          />
        );
      })()}
    </div>
  );
}
