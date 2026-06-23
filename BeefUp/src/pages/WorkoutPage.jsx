import { useMemo, useState } from "react";
import { Play, Plus, ListPlus, History, Flame, ChevronRight, Pencil } from "lucide-react";
import { useApp } from "../context/AppContext";
import { todaysPlanEntry } from "../lib/planUtils";
import exercisesData from "../data/exercises.json";
import PBEditModal from "../components/PBEditModal";

export default function WorkoutPage({
  onStartWorkout,
  onPickWorkout,
  onManageWorkouts,
  onViewHistory,
}) {
  const { t, lang, plans, activePlanId, workouts, sessions, stepsMap, pbConfig } = useApp();
  const [showPBEdit, setShowPBEdit] = useState(false);

  const activePlan = plans.find((p) => p.id === activePlanId) ?? null;
  const todayEntry = useMemo(
    () => todaysPlanEntry(activePlan, sessions),
    [activePlan, sessions],
  );
  const todayWorkout =
    todayEntry?.type === "workout"
      ? (workouts.find((w) => w.id === todayEntry.workoutId) ?? null)
      : null;

  const pbItems = useMemo(
    () =>
      pbConfig.map((slot) => {
        if (!slot) return null;
        if (slot === "steps") {
          const vals = Object.values(stepsMap);
          const best = vals.length ? Math.max(...vals) : 0;
          return { label: t.pbSteps, value: best > 0 ? best.toLocaleString() : "—", unit: "" };
        }
        const ex = exercisesData.find((e) => e.id === slot);
        if (!ex) return null;
        let best = 0;
        sessions.forEach((s) =>
          s.exercises?.forEach((e) => {
            if (e.exerciseId === slot)
              e.sets?.forEach((set) => {
                const rm = (parseFloat(set.weight) || 0) * (1 + (parseInt(set.reps) || 0) / 30);
                if (rm > best) best = rm;
              });
          }),
        );
        return {
          label: lang === "pt" ? ex.namePt : ex.name,
          value: best > 0 ? best.toFixed(1) : "—",
          unit: best > 0 ? "kg" : "",
        };
      }),
    [pbConfig, stepsMap, sessions, lang, t],
  );

  const workoutLabel = todayWorkout
    ? lang === "pt"
      ? todayWorkout.namePt || todayWorkout.name
      : todayWorkout.name
    : null;

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="px-5 pt-10 pb-6">
        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
          {t.homeTitle}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-4 scrollbar-hide">
        {/* Today's workout hero card */}
        <div className="card" style={{ background: "var(--surface)" }}>
          {!activePlan ? (
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                {t.noPlan}
              </p>
            </div>
          ) : todayEntry?.type === "rest" ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs mb-0.5" style={{ color: "var(--muted)" }}>
                  {activePlan.name}
                </p>
                <p
                  className="text-base font-semibold"
                  style={{ color: "var(--text)" }}
                >
                  {t.restDay}
                </p>
              </div>
              <Flame
                size={22}
                style={{ color: "var(--text)", fill: "var(--text)" }}
              />
            </div>
          ) : todayWorkout ? (
            <div className="flex items-center justify-between gap-4">
              <div style={{ minWidth: 0 }}>
                <p
                  className="text-xs mb-0.5 truncate"
                  style={{ color: "var(--muted)" }}
                >
                  {activePlan.name}
                </p>
                <p
                  className="text-base font-bold truncate"
                  style={{ color: "var(--text)" }}
                >
                  {workoutLabel}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                  {todayWorkout.exercises?.length ?? 0}{" "}
                  {lang === "pt" ? "exercícios" : "exercises"}
                </p>
              </div>
              <button
                className="btn btn-primary flex-shrink-0 px-6 py-3.5 flex items-center gap-2 text-base"
                onClick={() =>
                  onStartWorkout({
                    workoutId: todayWorkout.id,
                    workoutName: workoutLabel,
                  })
                }
              >
                <Play size={20} fill="currentColor" />
                {t.startWorkout}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-xs mb-0.5" style={{ color: "var(--muted)" }}>
                {activePlan.name}
              </p>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                {t.noWorkoutScheduled}
              </p>
            </div>
          )}
        </div>

        {/* Quick action row */}
        <div className="flex gap-3">
          <button
            className="btn btn-ghost flex-1 py-3 text-sm flex items-center gap-2"
            onClick={onPickWorkout}
          >
            <Plus size={15} />
            {t.startAnother}
          </button>
          <button
            className="btn btn-ghost flex-1 py-3 text-sm flex items-center gap-2"
            onClick={onManageWorkouts}
          >
            <ListPlus size={15} />
            {t.manageWorkouts}
          </button>
        </div>

        {/* Previous workouts */}
        <button
          className="btn btn-ghost w-full py-3 text-sm flex items-center justify-between"
          onClick={onViewHistory}
        >
          <span className="flex items-center gap-2">
            <History size={15} />
            {t.previousWorkouts}
          </span>
          <ChevronRight size={15} style={{ color: "var(--muted)" }} />
        </button>

        {/* Personal bests */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="section-title" style={{ marginBottom: 0 }}>
              {t.personalBests}
            </p>
            <button className="btn-icon" onClick={() => setShowPBEdit(true)}>
              <Pencil size={15} style={{ color: "var(--muted)" }} />
            </button>
          </div>
          <div className="flex justify-around gap-2">
            {pbItems.map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5" style={{ flex: 1 }}>
                <div className="stat-circle" style={{ width: 76, height: 76 }}>
                  {item ? (
                    <>
                      <span className="text-sm font-bold leading-none" style={{ color: "var(--text)" }}>
                        {item.value}
                      </span>
                      {item.unit && (
                        <span className="text-xs" style={{ color: "var(--muted)" }}>
                          {item.unit}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-lg" style={{ color: "var(--border)" }}>—</span>
                  )}
                </div>
                <p className="text-xs text-center leading-tight" style={{ color: "var(--muted)", maxWidth: 72 }}>
                  {item ? item.label : "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showPBEdit && <PBEditModal onClose={() => setShowPBEdit(false)} />}
    </div>
  );
}
