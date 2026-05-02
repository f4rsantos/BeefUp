import { useState, useMemo } from "react";
import {
  Flame,
  Footprints,
  Pencil,
  Play,
  Plus,
  ListPlus,
  History,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  todaysPlanEntry,
  computeStreak,
  getMonthActivity,
  todayISO,
} from "../lib/planUtils";
import exercisesData from "../data/exercises.json";
import StepsModal from "../components/StepsModal";
import PBEditModal from "../components/PBEditModal";

function dayOffsetISO(daysBack) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysBack);
  return date.toISOString().slice(0, 10);
}

export default function WorkoutPage({
  onStartWorkout,
  onPickWorkout,
  onManageWorkouts,
  onViewHistory,
}) {
  const {
    t,
    lang,
    plans,
    activePlanId,
    workouts,
    sessions,
    stepsMap,
    pbConfig,
  } = useApp();

  const [showSteps, setShowSteps] = useState(false);
  const [showPBEdit, setShowPBEdit] = useState(false);

  const today = todayISO();
  const activePlan = plans.find((p) => p.id === activePlanId) ?? null;
  const todayEntry = useMemo(
    () => todaysPlanEntry(activePlan, sessions),
    [activePlan, sessions],
  );
  const todayWorkout =
    todayEntry?.type === "workout"
      ? (workouts.find((w) => w.id === todayEntry.workoutId) ?? null)
      : null;

  const streak = useMemo(
    () => computeStreak(sessions, plans, activePlanId),
    [sessions, plans, activePlanId],
  );
  const now = new Date();
  const monthActivity = useMemo(
    () =>
      getMonthActivity(
        now.getFullYear(),
        now.getMonth(),
        sessions,
        plans,
        activePlanId,
      ),
    [sessions, plans, activePlanId],
  );
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const todaySteps = stepsMap[today] ?? null;
  const weekSteps = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const iso = dayOffsetISO(6 - index);
        return { iso, value: stepsMap[iso] ?? 0, isToday: iso === today };
      }),
    [stepsMap, today],
  );
  const maxWeekSteps = Math.max(1, ...weekSteps.map((entry) => entry.value));

  const pbItems = useMemo(
    () =>
      pbConfig.map((slot) => {
        if (!slot) return null;
        if (slot === "steps") {
          const vals = Object.values(stepsMap);
          const best = vals.length ? Math.max(...vals) : 0;
          return {
            label: t.pbSteps,
            value: best > 0 ? best.toLocaleString() : "—",
            unit: "",
          };
        }
        const ex = exercisesData.find((e) => e.id === slot);
        if (!ex) return null;
        let best = 0;
        sessions.forEach((s) =>
          s.exercises?.forEach((e) => {
            if (e.exerciseId === slot)
              e.sets?.forEach((set) => {
                const rm =
                  (parseFloat(set.weight) || 0) *
                  (1 + (parseInt(set.reps) || 0) / 30);
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
      <div className="px-5 pt-8 pb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
          {t.homeTitle}
        </h1>
        <button
          onClick={onViewHistory}
          title={t.history}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <History size={18} style={{ color: "var(--text)" }} />
        </button>
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
                className="btn btn-primary flex-shrink-0 px-5 py-2.5 flex items-center gap-2"
                onClick={() =>
                  onStartWorkout({
                    workoutId: todayWorkout.id,
                    workoutName: workoutLabel,
                  })
                }
              >
                <Play size={15} fill="currentColor" />
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

        {/* Streak card */}
        <div className="card">
          <div
            className="grid gap-3 items-center"
            style={{ gridTemplateColumns: "4fr 8fr" }}
          >
            <div>
              <span
                className="text-4xl font-black"
                style={{ color: "var(--text)", lineHeight: 1 }}
              >
                {streak}
              </span>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                {lang === "pt" ? "Série atual" : "Current streak"}
              </p>
            </div>

            <div
              className="grid gap-1 justify-items-end"
              style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
            >
              {Array.from({ length: daysInMonth }, (_, index) => {
                const day = index + 1;
                const info = monthActivity[day] || {};
                const lit = info.active;
                const isToday = info.isToday;
                return (
                  <div
                    key={index}
                    className="flex items-center justify-center"
                    style={{
                      width: 26,
                      height: 26,
                      opacity: isToday ? 1 : 0.6,
                    }}
                    title={`${day}`}
                  >
                    <Flame
                      size={13}
                      style={{
                        color: lit ? "#f97316" : "var(--border)",
                        fill: lit ? "#f97316" : "none",
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Steps row */}
        <button
          className="card text-left w-full flex items-center justify-between"
          onClick={() => setShowSteps(true)}
          style={{ cursor: "pointer" }}
        >
          <div className="flex items-center gap-3">
            <div
              style={{
                padding: 10,
                borderRadius: 10,
                background: "var(--surface2)",
                display: "flex",
              }}
            >
              <Footprints size={17} style={{ color: "#16a34a" }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {t.stepsToday}
              </p>
              <p
                className="text-2xl font-bold"
                style={{ color: "var(--text)", lineHeight: 1.05 }}
              >
                {todaySteps !== null ? todaySteps.toLocaleString() : "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex items-end gap-1 min-w-[72px] justify-end"
              aria-hidden="true"
            >
              {weekSteps.map((entry, index) => {
                const height =
                  10 + Math.round((entry.value / maxWeekSteps) * 26);
                const active = entry.value > 0;
                return (
                  <div
                    key={index}
                    className="rounded-full"
                    title={`${entry.value.toLocaleString()} ${t.steps}`}
                    style={{
                      width: 6,
                      height,
                      background: active ? "#16a34a" : "var(--border)",
                      opacity: entry.isToday ? 1 : 0.7,
                    }}
                  />
                );
              })}
            </div>
            <Plus size={16} style={{ color: "var(--text)" }} />
          </div>
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
              <div
                key={i}
                className="flex flex-col items-center gap-1.5"
                style={{ flex: 1 }}
              >
                <div
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: "50%",
                    border: "1.5px solid var(--border)",
                    background: "var(--surface2)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {item ? (
                    <>
                      <span
                        className="text-sm font-bold leading-none"
                        style={{ color: "var(--text)" }}
                      >
                        {item.value}
                      </span>
                      {item.unit && (
                        <span
                          className="text-xs"
                          style={{ color: "var(--muted)" }}
                        >
                          {item.unit}
                        </span>
                      )}
                    </>
                  ) : (
                    <span
                      className="text-lg"
                      style={{ color: "var(--border)" }}
                    >
                      —
                    </span>
                  )}
                </div>
                <p
                  className="text-xs text-center leading-tight"
                  style={{ color: "var(--muted)", maxWidth: 72 }}
                >
                  {item ? item.label : "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showSteps && <StepsModal onClose={() => setShowSteps(false)} />}
      {showPBEdit && <PBEditModal onClose={() => setShowPBEdit(false)} />}
    </div>
  );
}
