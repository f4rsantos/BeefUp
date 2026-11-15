import { useState } from "react";
import { ChevronLeft, Plus, Trash2, Dumbbell, Moon, Lock } from "lucide-react";
import { uid, todayISO, addPlanDay, updatePlanDay, removePlanDay, isPrescribed } from "../lib/planUtils";
import WorkoutEditor from "./WorkoutEditor";
import ConfirmModal from "./ConfirmModal";
import "./PlanEditor.css";

export default function PlanEditor({
  plan,
  workouts,
  onSave,
  saveWorkout,
  onBack,
  lang,
  t,
}) {
  const locked = isPrescribed(plan);
  const [name, setName] = useState(plan?.name ?? "");
  const [days, setDays] = useState(plan?.days ?? []);
  const [creatingWorkoutForDay, setCreatingWorkoutForDay] = useState(null);
  const [pendingRemoveDay, setPendingRemoveDay] = useState(null);

  function addDay(type) {
    setDays((prev) => addPlanDay(prev, type, workouts));
  }

  function updateDay(i, patch) {
    setDays((prev) => updatePlanDay(prev, i, patch));
  }

  function removeDay(i) {
    setDays((prev) => removePlanDay(prev, i));
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
    <div className="flex flex-col h-full canvas-bg">
      <div
        className="flex-1 overflow-y-auto pb-6 flex flex-col gap-4 scrollbar-hide fade-in page-pad"
      >
        <div className="flex items-center gap-1">
          <button className="btn-back" onClick={onBack} aria-label={t.back}>
            <ChevronLeft className="text-body" size={24} />
          </button>
          <h1 className="display flex-1 text-body pe-title">
            {plan?.id ? t.editPlan : t.newPlan}
          </h1>
          {locked && <Lock className="text-muted" size={16} aria-label={t.prescribedLocked} />}
        </div>
        {locked && (
          <p className="text-xs text-muted pe-locked-note">{t.prescribedLocked}</p>
        )}
        <div className="card">
          <label className="section-title pe-label">
            {t.planName}
          </label>
          {locked ? (
            <p className="text-sm text-body">{name}</p>
          ) : (
            <input
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. PPL"
            />
          )}
        </div>

        <div className="card flex flex-col gap-2">
          <div className="section-header">
            <p className="section-title pe-days-title">
              {t.daysTitle}
            </p>
            <span className="chip active pe-count">{days.length}</span>
          </div>

          {days.map((day, i) => {
            const isWorkout = day.type === "workout";
            return (
            <div
              key={day.id}
              className="flex items-center gap-2 py-2.5 px-2.5 rounded-xl pe-day"
            >
              <span className="display text-xs w-6 text-center text-muted pe-day-num">
                {i + 1}
              </span>

              <button
                className={`btn-icon pe-day-type${isWorkout ? "" : " rest"}`}
                onClick={
                  locked
                    ? undefined
                    : () =>
                        updateDay(i, {
                          type: isWorkout ? "rest" : "workout",
                          workoutId: !isWorkout ? (workouts[0]?.id ?? null) : null,
                        })
                }
                disabled={locked}
                aria-label={t.toggleDayType}
              >
                {isWorkout
                  ? <Dumbbell size={15} />
                  : <Moon size={15} />}
              </button>

              {isWorkout ? (
                locked ? (
                  <span className="text-sm flex-1 text-body">
                    {workouts.find((w) => w.id === day.workoutId)?.name ?? t.selectWorkout}
                  </span>
                ) : (
                  <select
                    className="field flex-1 pe-select"
                    value={day.workoutId ?? ""}
                    onChange={(e) => {
                      if (e.target.value === "__new__") setCreatingWorkoutForDay(i);
                      else updateDay(i, { workoutId: e.target.value });
                    }}
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
                )
              ) : (
                <span className="text-sm flex-1 text-muted">
                  {t.dayRest}
                </span>
              )}

              {!locked && (
                <button
                  className="btn-icon p-1"
                  onClick={() => setPendingRemoveDay(i)}
                  aria-label={t.delete}
                >
                  <Trash2 className="text-muted" size={14} />
                </button>
              )}
            </div>
            );
          })}

          {!locked && (
            <div className="flex gap-2 mt-1">
              <button
                className="btn btn-ghost flex-1 py-2.5 text-xs pe-add"
                onClick={() => addDay("workout")}
              >
                <Plus size={13} /> {t.workoutDay}
              </button>
              <button
                className="btn btn-ghost flex-1 py-2.5 text-xs pe-add"
                onClick={() => addDay("rest")}
              >
                <Plus size={13} /> {t.dayRest}
              </button>
            </div>
          )}
        </div>

        {!locked && (
          <button className="btn btn-primary w-full py-3.5" onClick={save}>
            {t.save}
          </button>
        )}
      </div>

      {creatingWorkoutForDay !== null && (
        <div className="canvas-bg pe-layer">
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
