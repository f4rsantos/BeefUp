import { useState } from "react";
import { Plus, Trash2, Dumbbell, Moon, Pencil, Play, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { uid, todayISO } from "../lib/planUtils";
import { resolveExercise } from "../lib/exerciseTree";
import ExercisePicker from "../components/ExercisePicker";
import WorkoutPreview from "./WorkoutPreview";
import ConfirmModal from "../components/ConfirmModal";
import NumberField from "../components/NumberField";
import { localizedName } from "../lib/localizedName"

function exName(id, lang) {
  const ex = resolveExercise(id);
  return ex ? (localizedName(ex, lang)) : id;
}

function normalizeExercises(list) {
  return (list || []).map((e) => (typeof e === "string" ? { exerciseId: e, sets: 3, reps: 10, rest: 90, weight: "" } : e));
}

export default function ClientGym({ client }) {
  const { t, lang, saveClient } = useApp();
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [previewing, setPreviewing] = useState(null);
  const [pendingRemoveDay, setPendingRemoveDay] = useState(null);
  const [pendingDeleteWorkout, setPendingDeleteWorkout] = useState(null);

  const plan = client.plan || { id: uid(), name: "", startDate: todayISO(), days: [] };
  const workouts = client.workouts || [];

  async function patchClient(patch) {
    await saveClient({ ...client, ...patch });
  }

  function setPlan(next) {
    patchClient({ plan: next });
  }

  function addDay(type) {
    setPlan({ ...plan, days: [...plan.days, { id: uid(), type, workoutId: type === "workout" ? (workouts[0]?.id ?? null) : null }] });
  }

  function updateDay(i, dpatch) {
    setPlan({ ...plan, days: plan.days.map((d, j) => (j === i ? { ...d, ...dpatch } : d)) });
  }

  function removeDay(i) {
    setPlan({ ...plan, days: plan.days.filter((_, j) => j !== i) });
  }

  async function createWorkout() {
    const w = { id: uid(), name: "New workout", exercises: [] };
    await patchClient({ workouts: [...workouts, w] });
    setEditingWorkout(w.id);
  }

  async function saveWorkoutDef(next) {
    await patchClient({ workouts: workouts.map((w) => (w.id === next.id ? next : w)) });
  }

  async function deleteWorkoutDef(id) {
    await patchClient({
      workouts: workouts.filter((w) => w.id !== id),
      plan: { ...plan, days: plan.days.map((d) => (d.workoutId === id ? { ...d, workoutId: null } : d)) },
    });
  }

  const editing = workouts.find((w) => w.id === editingWorkout) || null;
  const preview = workouts.find((w) => w.id === previewing) || null;

  return (
    <div className="dash-two">
      <section className="card">
        <h3 className="dash-card-title">{t.editPlan}</h3>
        <label className="section-title">{t.planName}</label>
        <input className="field mt-2 mb-5" value={plan.name} onChange={(e) => setPlan({ ...plan, name: e.target.value })} placeholder="PPL" />

        <div className="flex flex-col gap-3">
          {plan.days.map((day, i) => {
            const isWorkout = day.type === "workout";
            return (
              <div key={day.id} className="dash-day">
                <span className="dash-day-num">{i + 1}</span>
                <button
                  className="btn-icon"
                  onClick={() => updateDay(i, { type: isWorkout ? "rest" : "workout", workoutId: !isWorkout ? (workouts[0]?.id ?? null) : null })}
                  aria-label={t.toggleDayType}
                >
                  {isWorkout ? <Dumbbell size={16} style={{ color: "var(--accent)" }} /> : <Moon size={16} style={{ color: "var(--accent-2)" }} />}
                </button>
                {isWorkout ? (
                  workouts.length > 0 ? (
                    <select className="field flex-1" value={day.workoutId ?? ""} onChange={(e) => updateDay(i, { workoutId: e.target.value })}>
                      {workouts.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  ) : (
                    <span className="text-sm flex-1" style={{ color: "var(--muted)" }}>{t.newWorkout} →</span>
                  )
                ) : (
                  <span className="text-sm flex-1" style={{ color: "var(--muted)" }}>{t.dayRest}</span>
                )}
                <button className="btn-icon" onClick={() => setPendingRemoveDay(i)} aria-label={t.delete}><Trash2 size={15} style={{ color: "var(--muted)" }} /></button>
              </div>
            );
          })}
          {plan.days.length === 0 && <p className="text-sm" style={{ color: "var(--muted)" }}>{t.dashUnassigned}</p>}
        </div>

        <div className="flex gap-3 mt-4">
          <button className="btn btn-ghost flex-1 py-3" style={{ borderStyle: "dashed" }} onClick={() => addDay("workout")}><Plus size={15} /> {t.workoutDay}</button>
          <button className="btn btn-ghost flex-1 py-3" style={{ borderStyle: "dashed" }} onClick={() => addDay("rest")}><Plus size={15} /> {t.dayRest}</button>
        </div>
      </section>

      <section className="card">
        <div className="flex items-center justify-between mb-5">
          <h3 className="dash-card-title" style={{ margin: 0 }}>{t.workouts}</h3>
          <button className="btn btn-primary px-4 py-2 text-sm flex items-center gap-2" onClick={createWorkout}><Plus size={15} /> {t.newWorkout}</button>
        </div>
        <div className="flex flex-col gap-3">
          {workouts.map((w) => (
            <div key={w.id} className="dash-day">
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate" style={{ color: "var(--text)", fontWeight: 600 }}>{w.name}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>{w.exercises.length} {t.exercises}</div>
              </div>
              <button className="btn-icon" onClick={() => setPreviewing(w.id)} title={t.startWorkout} aria-label={t.startWorkout}><Play size={15} style={{ color: "var(--accent)" }} /></button>
              <button className="btn-icon" onClick={() => setEditingWorkout(w.id)} aria-label={t.edit}><Pencil size={15} style={{ color: "var(--muted)" }} /></button>
              <button className="btn-icon" onClick={() => setPendingDeleteWorkout(w)} aria-label={t.delete}><Trash2 size={15} style={{ color: "var(--muted)" }} /></button>
            </div>
          ))}
          {workouts.length === 0 && <p className="text-sm" style={{ color: "var(--muted)" }}>—</p>}
        </div>
      </section>

      {editing && <WorkoutDefEditor workout={editing} lang={lang} t={t} onSave={saveWorkoutDef} onClose={() => setEditingWorkout(null)} />}
      {preview && <WorkoutPreview workout={preview} lang={lang} t={t} onClose={() => setPreviewing(null)} />}

      {pendingRemoveDay !== null && (
        <ConfirmModal
          title={t.deletePlanDayTitle}
          message={t.cannotUndo}
          cancelLabel={t.cancel}
          confirmLabel={t.delete}
          onCancel={() => setPendingRemoveDay(null)}
          onConfirm={() => {
            removeDay(pendingRemoveDay);
            setPendingRemoveDay(null);
          }}
        />
      )}

      {pendingDeleteWorkout && (
        <ConfirmModal
          title={t.deleteWorkoutTitle.replace("{name}", pendingDeleteWorkout.name)}
          message={t.cannotUndo}
          cancelLabel={t.cancel}
          confirmLabel={t.delete}
          onCancel={() => setPendingDeleteWorkout(null)}
          onConfirm={() => {
            deleteWorkoutDef(pendingDeleteWorkout.id);
            setPendingDeleteWorkout(null);
          }}
        />
      )}
    </div>
  );
}

function WorkoutDefEditor({ workout, lang, t, onSave, onClose }) {
  const [name, setName] = useState(workout.name);
  const [items, setItems] = useState(normalizeExercises(workout.exercises));
  const [picking, setPicking] = useState(false);

  function commit(nextItems) {
    onSave({ ...workout, name: name.trim() || "Workout", exercises: nextItems ?? items });
  }

  function updateItem(idx, patch) {
    setItems((prev) => prev.map((it, j) => (j === idx ? { ...it, ...patch } : it)));
  }

  function addPicks(refs) {
    setItems((prev) => [
      ...prev,
      ...refs.map((ref) => ({ exerciseId: ref, sets: 3, reps: 10, rest: 90, weight: "" })),
    ]);
    setPicking(false);
  }

  return (
    <div className="modal-overlay" style={{ alignItems: "center" }} onClick={onClose}>
      <div className="modal-center" style={{ maxWidth: 560, maxHeight: "85vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="display" style={{ fontSize: 20, fontWeight: 900, color: "var(--text)" }}>{t.editWorkout}</h3>
          <button className="btn btn-ghost p-2" onClick={onClose} aria-label={t.cancel}><X size={18} /></button>
        </div>
        <div className="mb-4">
          <label className="section-title">{t.workoutName}</label>
          <input className="field mt-1 w-full" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="flex flex-col gap-3" style={{ overflowY: "auto", flex: 1 }}>
          {items.map((it, idx) => (
            <div key={idx} className="dash-ex-row">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm" style={{ color: "var(--text)", fontWeight: 600 }}>{exName(it.exerciseId, lang)}</span>
                <button className="btn-icon" onClick={() => setItems((p) => p.filter((_, j) => j !== idx))}><Trash2 size={14} style={{ color: "var(--muted)" }} /></button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <NumField label={t.sets} allowDecimal={false} value={it.sets} onChange={(v) => updateItem(idx, { sets: v })} />
                <NumField label={t.reps} allowDecimal={false} value={it.reps} onChange={(v) => updateItem(idx, { reps: v })} />
                <NumField label={`${t.weight}`} value={it.weight} onChange={(v) => updateItem(idx, { weight: v })} />
                <NumField label={`${t.rest} (${t.seconds})`} allowDecimal={false} value={it.rest} onChange={(v) => updateItem(idx, { rest: v })} />
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-xs" style={{ color: "var(--muted)" }}>{t.noExercises}</p>}
        </div>

        <button className="btn btn-ghost w-full py-3 mt-3" style={{ borderStyle: "dashed" }} onClick={() => setPicking(true)}><Plus size={15} /> {t.addExercise}</button>
        <button className="btn btn-primary w-full mt-3 py-3" onClick={() => { commit(); onClose(); }}>{t.save}</button>
      </div>

      {picking && (
        <ExercisePicker onConfirm={addPicks} onClose={() => setPicking(false)} />
      )}
    </div>
  );
}

function NumField({ label, value, onChange, allowDecimal }) {
  return (
    <div>
      <label className="text-xs" style={{ color: "var(--muted)" }}>{label}</label>
      <NumberField className="field mt-1" style={{ padding: "8px 10px", fontSize: 14 }} allowDecimal={allowDecimal} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
