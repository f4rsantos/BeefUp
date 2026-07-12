import { useMemo, useState, useRef, useEffect } from "react";
import { Plus, Clock, History, ChevronRight, Dumbbell, MoreHorizontal, Pencil, Copy, Trash2, Play, FilePenLine, Moon } from "lucide-react";
import { useApp } from "../context/AppContext";
import { todaysPlanEntry } from "../lib/planUtils";
import { bodyAreasForSessions, recentSessions } from "../lib/muscles";
import HumanBody from "../components/HumanBody";

function formatLastDate(iso, lang) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString(lang === "pt" ? "pt-PT" : undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}


function WorkoutCardMenu({ workout, lang, onRename, onDuplicate, onDelete, onEdit }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const toggleMenu = (e) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        left: rect.right - 160,
      });
    }
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const handleScroll = () => setOpen(false);
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        aria-label="options"
        onClick={toggleMenu}
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", flexShrink: 0 }}
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            minWidth: 160,
            zIndex: 1000,
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => {
              setOpen(false);
              onEdit(workout);}}
            style={{
              width: "100%",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text)",
              fontSize: 13,
              textAlign: "left",
            }}
          >
            <Pencil size={14} />
            {lang === "pt" ? "Editar" : "Edit"}
          </button>

          <button
            onClick={() => {
              setOpen(false);
              onRename(workout);
            }}
            style={{
              width: "100%",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text)",
              fontSize: 13,
              textAlign: "left",
            }}
          >
            <FilePenLine size={14} />
            {lang === "pt" ? "Renomear" : "Rename"}
          </button>

          <button
            onClick={() => {
              setOpen(false);
              onDuplicate(workout);
            }}
            style={{
              width: "100%",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text)",
              fontSize: 13,
              textAlign: "left",
            }}
          >
            <Copy size={14} />
            {lang === "pt" ? "Duplicar" : "Duplicate"}
          </button>

          <button
            onClick={() => {
              setOpen(false);
              onDelete(workout);
            }}
            style={{
              width: "100%",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#ef4444",
              fontSize: 13,
              textAlign: "left",
              borderTop: "1px solid var(--border)",
            }}
          >
            <Trash2 size={14} />
            {lang === "pt" ? "Excluir" : "Delete"}
          </button>
        </div>
      )}
    </>
  );
}

const MINI_SCALE = 0.34;

export default function WorkoutPage({
  onStartWorkout,
  onCreateWorkout,
  onManageWorkouts,
  onEditWorkout,
  onViewHistory,
  onViewExercises,
  onManagePlans,
  onViewPlanDetails,
}) {
  const { t, lang, plans, activePlanId, workouts, sessions, saveWorkout, deleteWorkout } = useApp()
  const activePlan = plans.find((p) => p.id === activePlanId) ?? null;
  const todayEntry = useMemo(
    () => todaysPlanEntry(activePlan, sessions),
    [activePlan, sessions],
  );
  const todayWorkout =
    todayEntry?.type === "workout"
      ? (workouts.find((w) => w.id === todayEntry.workoutId) ?? null)
      : null;

  // Muscles trained in the last 7 days, for the home heatmap figure.
  const weekAreas = useMemo(
    () => bodyAreasForSessions(recentSessions(sessions, 7)),
    [sessions],
  );
  const weekSessionCount = useMemo(() => recentSessions(sessions, 7).length, [sessions]);

  const workoutLabel = todayWorkout
    ? lang === "pt"
      ? todayWorkout.namePt || todayWorkout.name
      : todayWorkout.name
    : null;

  const lastSessionByWorkout = useMemo(() => {
    const map = {};
    sessions.forEach((s) => {
      if (!s.workoutId) return;
      if (!map[s.workoutId] || new Date(s.date) > new Date(map[s.workoutId])) {
        map[s.workoutId] = s.date;
      }
    });
    return map;
  }, [sessions]);

  const handleRename = (workout) => {
    const currentName = lang === "pt" ? workout.namePt || workout.name : workout.name;
    const newName = window.prompt(
      lang === "pt" ? "Novo nome do treino:" : "New workout name:",
      currentName,
    );
    if (!newName || !newName.trim()) return;
    const trimmed = newName.trim();
    const updated = {
      ...workout,
      name: lang === "pt" ? workout.name : trimmed,
      namePt: lang === "pt" ? trimmed : workout.namePt,
    };
    saveWorkout(updated);
  };

  const handleDuplicate = (workout) => {
    const copy = {
      ...workout,
      id: crypto.randomUUID(),
      name: `${workout.name} (${lang === "pt" ? "cópia" : "copy"})`,
      namePt: workout.namePt
        ? `${workout.namePt} (${lang === "pt" ? "cópia" : "copy"})`
        : undefined,
    };
    saveWorkout(copy);
  };

  const handleDelete = (workout) => {
    const name = lang === "pt" ? workout.namePt || workout.name : workout.name;
    const confirmMsg = lang === "pt"
      ? `Eliminar "${name}"? Esta ação não pode ser desfeita.`
      : `Delete "${name}"? This action cannot be undone.`;
    if (window.confirm(confirmMsg)) {
      deleteWorkout(workout.id);
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ padding: "40px 20px 16px" }}>
        {/* Header com ícones à direita */}
        <div className="flex items-center justify-between" style={{ marginBottom: 40 }}>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            {t.homeTitle}
          </h1>
          <div className="flex items-center" style={{ gap: 16 }}>
            <button
              aria-label="history"
              onClick={onViewHistory}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)" }}
            >
              <History size={20} />
            </button>
            <button
              aria-label="exercises"
              onClick={onViewExercises}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)" }}
            >
              <Dumbbell size={20} />
            </button>
          </div>
        </div>

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
        
        {/* Plano ativo */}
        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
          <p className="text-sm font-semibold" style={{ color: "var(--muted)", marginBottom: 16 }}>
            {lang === "pt" ? "Plano Atual" : "Current Plan"}
          </p>
          <div className="flex items-center" style={{ gap: 12 }}>
              <button
                aria-label="more"
                onClick={onManagePlans}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)" }}
              >
                <MoreHorizontal size={18} />
              </button>
            </div>
        </div>
        <button
          className="card w-full flex items-center justify-between text-left"
          style={{ cursor: "pointer", marginBottom: 40 }}
          onClick={activePlan ? onViewPlanDetails : onManagePlans}
        >
          {activePlan ? (
            <div style={{ minWidth: 0 }}>
              <p className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>
                {activePlan.name}
              </p>
              <p className="text-xs" style={{ color: "var(--muted)", marginTop: 4 }}>
                {activePlan.days?.length ?? 0} {lang === "pt" ? "dias" : "days"}
              </p>
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              {lang === "pt" ? "Nenhum plano ativo — toca para criar" : "No active plan — tap to create"}
            </p>
          )}
          <ChevronRight size={16} style={{ color: "var(--muted)", flexShrink: 0 }} />
        </button>

        {/* Outros Treinos */}
        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
          <p className="text-sm font-bold" style={{ color: "var(--text)", marginBottom: 20 }}>
          {lang === "pt" ? "Os meus Treinos" : "My Workouts"} ({workouts.length})
          </p>
          <div className="flex items-center" style={{ gap: 12 }}>
            <button
              aria-label="create workout"
              onClick={onCreateWorkout}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)" }}
            >
              <Plus size={18} />
            </button>
            <button
              aria-label="more"
              onClick={onManageWorkouts}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)" }}
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>

        <div
          className="grid"
          style={{ gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}
        >
          {workouts.map((w) => {
            const name = lang === "pt" ? w.namePt || w.name : w.name;
            const exerciseNames = w.exercises
              ?.map((ex) => `${ex.sets?.length ?? 3} x ${lang === "pt" ? ex.namePt || ex.name : ex.name}`)
              .join(", ");
            return (
              <div
                key={w.id}
                className="card"
                style={{ cursor: "pointer", position: "relative" }}
                onClick={() =>
                  onStartWorkout({
                    workoutId: w.id,
                    workoutName: lang === "pt" ? w.namePt || w.name : w.name,
                  })
                }
              >
                <div className="flex items-start justify-between" style={{ marginBottom: 8 }}>
                  <p className="text-base font-bold truncate" style={{ color: "var(--text)", minWidth: 0 }}>
                    {name}
                  </p>
                  <WorkoutCardMenu
                    workout={w}
                    lang={lang}
                    onEdit={onEditWorkout}
                    onRename={handleRename}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDelete}
                  />
                </div>
                <p
                  className="text-xs"
                  style={{
                    color: "var(--muted)",
                    marginBottom: 12,
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {exerciseNames || "-"}
                </p>
                <div className="flex items-center" style={{ gap: 6 }}>
                  <Clock size={12} style={{ color: "var(--muted)" }} />
                  <span className="text-xs" style={{ color: "var(--muted)" }}>
                    {formatLastDate(lastSessionByWorkout[w.id], lang)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
