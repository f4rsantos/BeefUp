import { useState } from "react";
import { ChevronLeft, Plus, Trash2, Dumbbell, Moon } from "lucide-react";
import { uid } from "../lib/planUtils";

export default function PlanEditor({
  plan,
  workouts,
  onSave,
  onBack,
  lang,
  t,
}) {
  const [name, setName] = useState(plan?.name ?? "");
  const [days, setDays] = useState(plan?.days ?? []);

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
      startDate: plan?.startDate ?? new Date().toISOString().slice(0, 10),
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
          {plan?.id ? t.editPlan : t.newPlan}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-4 scrollbar-hide fade-in">
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
              {lang === "pt" ? "Dias" : "Days"}
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
                aria-label="toggle day type"
              >
                {isWorkout
                  ? <Dumbbell size={15} style={{ color: "var(--accent)" }} />
                  : <Moon size={15} style={{ color: "var(--accent-2)" }} />}
              </button>

              {isWorkout && workouts.length > 0 ? (
                <select
                  className="field flex-1"
                  value={day.workoutId ?? ""}
                  onChange={(e) => updateDay(i, { workoutId: e.target.value })}
                  style={{ fontSize: 12, padding: "7px 9px" }}
                >
                  {workouts.map((w) => (
                    <option key={w.id} value={w.id}>
                      {lang === "pt" ? w.namePt || w.name : w.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm flex-1" style={{ color: "var(--muted)" }}>
                  {isWorkout ? t.selectWorkout : t.dayRest}
                </span>
              )}

              <button
                className="btn-icon p-1"
                onClick={() => removeDay(i)}
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
    </div>
  );
}
