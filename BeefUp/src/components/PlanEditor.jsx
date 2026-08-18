import { useState } from "react";
import { ChevronLeft, Plus, Trash2, Dumbbell, Moon } from "lucide-react";
import { uid, todayISO } from "../lib/planUtils";
import WorkoutEditor from "./WorkoutEditor";
import ConfirmModal from "./ConfirmModal";

export default function PlanEditor({
  plan,
  workouts,
  onSave,
  saveWorkout,
  onBack,
  lang,
  t,
}) {
  const [name, setName] = useState(plan?.name ?? "");
  const [days, setDays] = useState(plan?.days ?? []);
  const [creatingWorkoutForDay, setCreatingWorkoutForDay] = useState(null);
  const [pendingRemoveDay, setPendingRemoveDay] = useState(null);

  function addDay(type) {
    setDays((prev) => [
      ...prev,
      {
        id: uid(),
        type,
        workoutId: type === "workout" ? (workouts[0]?.id ?? null) : null,
      },
    ]);
  }

  function updateDay(i, patch) {
    setDays((prev) => prev.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  }

  function removeDay(i) {
    setDays((prev) => prev.filter((_, j) => j !== i));
  }

  function save() {
    if (!name.trim()) return;
    onSave({
      ...plan,
      id: plan?.id ?? uid(),
      name: name.trim(),
      days,
      startDate: plan?.startDate ?? todayISO(),
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
            {plan?.id ? t.editPlan : t.newPlan}
          </h1>
        </div>
        <div className="card">
          <label className="section-title" style={{ marginBottom: 6, display: "block" }}>
            {t.planName}
          </label>
          <input
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. PPL"
          />
        </div>

        <div className="card flex flex-col gap-2">
          <div className="section-header">
            <p className="section-title" style={{ marginBottom: 0 }}>
              {t.daysTitle}
            </p>
            <span className="chip active" style={{ pointerEvents: "none" }}>{days.length}</span>
          </div>

          {days.map((day, i) => {
            const isWorkout = day.type === "workout";
            return (
            <div
              key={day.id}
              className="flex items-center gap-2 py-2.5 px-2.5 rounded-xl"
              style={{ background: "var(--surface2)" }}
            >
              <span
                className="display text-xs w-6 text-center"
                style={{ color: "var(--muted)", fontWeight: 900 }}
              >
                {i + 1}
              </span>

              <button
                className="btn-icon"
                style={{
                  background: isWorkout ? "var(--accent-soft)" : "var(--accent-2-soft)",
                  flexShrink: 0,
                }}
                onClick={() =>
                  updateDay(i, {
                    type: isWorkout ? "rest" : "workout",
                    workoutId: !isWorkout ? (workouts[0]?.id ?? null) : null,
                  })
                }
                aria-label={t.toggleDayType}
              >
                {isWorkout
                  ? <Dumbbell size={15} style={{ color: "var(--accent)" }} />
                  : <Moon size={15} style={{ color: "var(--accent-2)" }} />}
              </button>

              {isWorkout ? (
                <select
                  className="field flex-1"
                  value={day.workoutId ?? ""}
                  onChange={(e) => {
                    if (e.target.value === "__new__") setCreatingWorkoutForDay(i);
                    else updateDay(i, { workoutId: e.target.value });
                  }}
                  style={{ fontSize: 12, padding: "7px 9px" }}
                >
                  {workouts.length === 0 && <option value="">{t.selectWorkout}</option>}
                  {workouts.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                  <option value="__new__">
                    {t.createNewWorkout}
                  </option>
                </select>
              ) : (
                <span className="text-sm flex-1" style={{ color: "var(--muted)" }}>
                  {t.dayRest}
                </span>
              )}

              <button
                className="btn-icon p-1"
                onClick={() => setPendingRemoveDay(i)}
                aria-label={t.delete}
              >
                <Trash2 size={14} style={{ color: "var(--muted)" }} />
              </button>
            </div>
            );
          })}

          <div className="flex gap-2 mt-1">
            <button
              className="btn btn-ghost flex-1 py-2.5 text-xs"
              style={{ borderStyle: "dashed" }}
              onClick={() => addDay("workout")}
            >
              <Plus size={13} /> {t.workoutDay}
            </button>
            <button
              className="btn btn-ghost flex-1 py-2.5 text-xs"
              style={{ borderStyle: "dashed" }}
              onClick={() => addDay("rest")}
            >
              <Plus size={13} /> {t.dayRest}
            </button>
          </div>
        </div>

        <button className="btn btn-primary w-full py-3.5" onClick={save}>
          {t.save}
        </button>
      </div>

      {creatingWorkoutForDay !== null && (
        <div style={{ position: "absolute", inset: 0, zIndex: 200, background: "var(--bg)" }}>
          <WorkoutEditor
            workout={null}
            lang={lang}
            t={t}
            onBack={() => setCreatingWorkoutForDay(null)}
            onSave={async (newWorkout) => {
              await saveWorkout(newWorkout);
              updateDay(creatingWorkoutForDay, { workoutId: newWorkout.id });
              setCreatingWorkoutForDay(null);
            }}
          />
        </div>
      )}

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
    </div>
  );
}
