import { useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
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
      <div className="flex items-center gap-3 px-5 pt-7 pb-4">
        <button className="btn btn-ghost p-2" onClick={onBack}>
          <ArrowLeft size={18} />
        </button>
        <span
          className="font-semibold text-base"
          style={{ color: "var(--text)" }}
        >
          {plan?.id ? t.editPlan : t.newPlan}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-5 scrollbar-hide">
        <div className="card">
          <label
            className="text-xs mb-1 block"
            style={{ color: "var(--muted)" }}
          >
            {t.planName}
          </label>
          <input
            className="field w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. PPL"
          />
        </div>

        <div className="card flex flex-col gap-3">
          <p
            className="text-sm font-medium mb-1"
            style={{ color: "var(--text)" }}
          >
            Dias
          </p>

          {days.map((day, i) => (
            <div
              key={day.id}
              className="flex items-center gap-3 py-3 px-3 rounded-xl"
              style={{ background: "var(--surface2)" }}
            >
              <span
                className="text-xs font-medium w-5 text-center"
                style={{ color: "var(--muted)" }}
              >
                {i + 1}
              </span>

              <div className="flex gap-1.5">
                {["workout", "rest"].map((type) => (
                  <button
                    key={type}
                    className="btn text-xs py-1 px-2"
                    style={{
                      background:
                        day.type === type ? "var(--text)" : "var(--surface)",
                      color: day.type === type ? "var(--bg)" : "var(--muted)",
                    }}
                    onClick={() =>
                      updateDay(i, {
                        type,
                        workoutId:
                          type === "workout" ? (workouts[0]?.id ?? null) : null,
                      })
                    }
                  >
                    {type === "workout" ? t.workoutDay : t.dayRest}
                  </button>
                ))}
              </div>

              {day.type === "workout" && workouts.length > 0 && (
                <select
                  className="flex-1 text-xs field"
                  value={day.workoutId ?? ""}
                  onChange={(e) => updateDay(i, { workoutId: e.target.value })}
                  style={{
                    background: "var(--surface)",
                    color: "var(--text)",
                    fontSize: 12,
                  }}
                >
                  {workouts.map((w) => (
                    <option key={w.id} value={w.id}>
                      {lang === "pt" ? w.namePt || w.name : w.name}
                    </option>
                  ))}
                </select>
              )}

              <button
                className="btn btn-ghost p-1 ml-auto"
                onClick={() => removeDay(i)}
              >
                <Trash2 size={13} style={{ color: "var(--muted)" }} />
              </button>
            </div>
          ))}

          <div className="flex gap-2 mt-2">
            <button
              className="btn btn-ghost flex-1 py-3 text-xs"
              onClick={() => addDay("workout")}
            >
              <Plus size={12} /> {t.workoutDay}
            </button>
            <button
              className="btn btn-ghost flex-1 py-3 text-xs"
              onClick={() => addDay("rest")}
            >
              <Plus size={12} /> {t.dayRest}
            </button>
          </div>
        </div>

        <button className="btn btn-primary w-full py-3" onClick={save}>
          {t.save}
        </button>
      </div>
    </div>
  );
}
