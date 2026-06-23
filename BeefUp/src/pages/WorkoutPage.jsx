import { useMemo, useState } from "react";
import { Play, Plus, ListPlus, History, ChevronRight, Pencil, Moon, Dumbbell } from "lucide-react";
import { useApp } from "../context/AppContext";
import { todaysPlanEntry, computeStreak } from "../lib/planUtils";
import { bodyAreasForSessions, recentSessions } from "../lib/muscles";
import exercisesData from "../data/exercises.json";
import HumanBody from "../components/HumanBody";
import PageHeader from "../components/PageHeader";
import PBEditModal from "../components/PBEditModal";

const MINI_SCALE = 0.34;

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

  const streak = useMemo(
    () => computeStreak(sessions, plans, activePlanId),
    [sessions, plans, activePlanId],
  );

  // Muscles trained in the last 7 days, for the home heatmap figure.
  const weekAreas = useMemo(
    () => bodyAreasForSessions(recentSessions(sessions, 7)),
    [sessions],
  );
  const weekSessionCount = useMemo(() => recentSessions(sessions, 7).length, [sessions]);

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
      <PageHeader
        eyebrow={lang === "pt" ? "Bem-vindo de volta" : "Welcome back"}
        title={t.homeTitle}
        action={
          <div className="chip" style={{ pointerEvents: "none" }}>
            🔥 {streak} {lang === "pt" ? "dias" : "days"}
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-4 scrollbar-hide fade-in">
        {/* ── Today's hero ── */}
        {!activePlan ? (
          <div className="card">
            <p className="text-sm" style={{ color: "var(--muted)" }}>{t.noPlan}</p>
            <button className="btn btn-ghost mt-3 w-full py-2.5 text-sm" onClick={onManageWorkouts}>
              {t.choosePlan}
            </button>
          </div>
        ) : todayEntry?.type === "rest" ? (
          <div className="hero" style={{ background: "var(--grad-energy)" }}>
            <div className="flex items-center justify-between" style={{ position: "relative" }}>
              <div>
                <p style={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>{activePlan.name}</p>
                <p className="display" style={{ fontSize: 26, fontWeight: 900, marginTop: 2 }}>{t.restDay}</p>
                <p style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                  {lang === "pt" ? "Recupera e volta mais forte." : "Recover and come back stronger."}
                </p>
              </div>
              <Moon size={40} style={{ opacity: 0.9 }} />
            </div>
          </div>
        ) : todayWorkout ? (
          <div className="hero">
            <div style={{ position: "relative" }}>
              <p style={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>{activePlan.name}</p>
              <p className="display" style={{ fontSize: 28, fontWeight: 900, marginTop: 2, lineHeight: 1.1 }}>
                {workoutLabel}
              </p>
              <p style={{ fontSize: 13, opacity: 0.88, marginTop: 6 }}>
                {todayWorkout.exercises?.length ?? 0} {lang === "pt" ? "exercícios" : "exercises"}
              </p>
              <button
                className="btn w-full mt-4 py-3.5 text-base"
                style={{ background: "#fff", color: "var(--accent)", fontWeight: 800 }}
                onClick={() => onStartWorkout({ workoutId: todayWorkout.id, workoutName: workoutLabel })}
              >
                <Play size={20} fill="currentColor" /> {t.startWorkout}
              </button>
            </div>
          </div>
        ) : (
          <div className="card">
            <p className="text-xs mb-0.5" style={{ color: "var(--muted)" }}>{activePlan.name}</p>
            <p className="text-sm" style={{ color: "var(--muted)" }}>{t.noWorkoutScheduled}</p>
          </div>
        )}

        {/* ── Quick actions ── */}
        <div className="flex gap-3">
          <button className="btn btn-ghost flex-1 py-3 text-sm" onClick={onPickWorkout}>
            <Plus size={15} /> {t.startAnother}
          </button>
          <button className="btn btn-ghost flex-1 py-3 text-sm" onClick={onManageWorkouts}>
            <ListPlus size={15} /> {t.manageWorkouts}
          </button>
        </div>

        {/* ── Weekly muscle heatmap (signature figure) ── */}
        <div className="card card-elevated">
          <div className="section-header">
            <p className="section-title" style={{ marginBottom: 0 }}>
              {lang === "pt" ? "Músculos esta semana" : "This week's muscles"}
            </p>
            <span className="chip active" style={{ pointerEvents: "none" }}>
              <Dumbbell size={12} /> {weekSessionCount}
            </span>
          </div>
          {weekSessionCount === 0 ? (
            <p className="text-sm text-center" style={{ color: "var(--muted)", padding: "20px 0" }}>
              {lang === "pt" ? "Sem treinos esta semana ainda." : "No workouts logged this week yet."}
            </p>
          ) : (
            <div className="flex justify-center" style={{ gap: 8, overflow: "hidden" }}>
              {["front", "back"].map((view) => (
                <div key={view} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 700 }}>
                    {view === "front" ? (lang === "pt" ? "Frente" : "Front") : (lang === "pt" ? "Costas" : "Back")}
                  </div>
                  <div style={{ width: 207 * MINI_SCALE, height: 500 * MINI_SCALE, overflow: "hidden" }}>
                    <div style={{ transform: `scale(${MINI_SCALE})`, transformOrigin: "top left", width: 207, height: 500, pointerEvents: "none" }}>
                      <HumanBody view={view} highlightedMuscles={weekAreas[view]} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── History link ── */}
        <button className="btn btn-ghost w-full py-3 text-sm flex items-center justify-between" onClick={onViewHistory}>
          <span className="flex items-center gap-2"><History size={15} /> {t.previousWorkouts}</span>
          <ChevronRight size={15} style={{ color: "var(--muted)" }} />
        </button>

        {/* ── Personal bests ── */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="section-title" style={{ marginBottom: 0 }}>{t.personalBests}</p>
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
                      <span className="display" style={{ fontSize: 17, fontWeight: 900, lineHeight: 1, color: "var(--text)" }}>
                        {item.value}
                      </span>
                      {item.unit && <span className="text-xs" style={{ color: "var(--muted)" }}>{item.unit}</span>}
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
