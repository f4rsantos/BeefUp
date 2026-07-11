import { useMemo, useState, useRef, useEffect } from "react";
import {
  Plus,
  Clock,
  History,
  ChevronRight,
  Dumbbell,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Play,
  FilePenLine,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { todaysPlanEntry } from "../lib/planUtils";
import { bodyAreasForSessions, recentSessions } from "../lib/muscles";
import exercisesData from "../data/exercises.json";
import HumanBody from "../components/HumanBody";
import PageHeader from "../components/PageHeader";

const MINI_SCALE = 0.34;

function getGreeting(lang) {
  const hour = new Date().getHours();
  if (lang === "pt") {
    if (hour < 12) return "Bom dia";
    if (hour < 19) return "Boa tarde";
    return "Boa noite";
  }
  if (hour < 12) return "Good morning";
  if (hour < 19) return "Good afternoon";
  return "Good evening";
}

function formatLastDate(iso, lang) {
  if (!iso) return lang === "pt" ? "Nunca treinado" : "Never trained";
  const date = new Date(iso);
  return date.toLocaleDateString(lang === "pt" ? "pt-PT" : "en-US", {
    day: "numeric",
    month: "short",
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
      setCoords({ top: rect.bottom + 4, left: rect.right - 160 });
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

  const itemStyle = {
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
  };

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
            borderRadius: 12,
            minWidth: 160,
            zIndex: 1000,
            boxShadow: "var(--shadow-lg)",
            overflow: "hidden",
          }}
        >
          <button style={itemStyle} onClick={() => { setOpen(false); onEdit(workout); }}>
            <Pencil size={14} />
            {lang === "pt" ? "Editar" : "Edit"}
          </button>
          <button style={itemStyle} onClick={() => { setOpen(false); onRename(workout); }}>
            <FilePenLine size={14} />
            {lang === "pt" ? "Renomear" : "Rename"}
          </button>
          <button style={itemStyle} onClick={() => { setOpen(false); onDuplicate(workout); }}>
            <Copy size={14} />
            {lang === "pt" ? "Duplicar" : "Duplicate"}
          </button>
          <button
            style={{ ...itemStyle, color: "var(--danger)", borderTop: "1px solid var(--border)" }}
            onClick={() => { setOpen(false); onDelete(workout); }}
          >
            <Trash2 size={14} />
            {lang === "pt" ? "Excluir" : "Delete"}
          </button>
        </div>
      )}
    </>
  );
}

export default function WorkoutPage({
  onStartWorkout,
  onStartEmpty,
  onCreateWorkout,
  onManageWorkouts,
  onEditWorkout,
  onViewHistory,
  onViewExercises,
  onManagePlans,
  onViewPlanDetails,
}) {
  const { t, lang, plans, activePlanId, workouts, sessions, saveWorkout, deleteWorkout } = useApp();

  const activePlan = plans.find((p) => p.id === activePlanId) ?? null;
  const todayEntry = useMemo(
    () => todaysPlanEntry(activePlan, sessions),
    [activePlan, sessions],
  );
  const todayWorkout =
    todayEntry?.type === "workout"
      ? (workouts.find((w) => w.id === todayEntry.workoutId) ?? null)
      : null;

  const workoutLabel = todayWorkout
    ? lang === "pt"
      ? todayWorkout.namePt || todayWorkout.name
      : todayWorkout.name
    : null;

  const greeting = getGreeting(lang);

  const subtitle = !activePlan
    ? t.noPlan
    : todayEntry?.type === "rest"
      ? (lang === "pt" ? "Hoje é dia de descanso" : "Today is a rest day")
      : todayWorkout
        ? (lang === "pt" ? `Treino de hoje é ${workoutLabel}` : `Today's workout is ${workoutLabel}`)
        : (lang === "pt" ? "Sem treino agendado para hoje" : "No workout scheduled today");

  const canQuickStart = !!todayWorkout;

  // Muscles trained in the last 7 days, for the home heatmap figure.
  const weekAreas = useMemo(
    () => bodyAreasForSessions(recentSessions(sessions, 7)),
    [sessions],
  );
  const weekSessionCount = useMemo(() => recentSessions(sessions, 7).length, [sessions]);

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
    saveWorkout({
      ...workout,
      name: lang === "pt" ? workout.name : trimmed,
      namePt: lang === "pt" ? trimmed : workout.namePt,
    });
  };

  const handleDuplicate = (workout) => {
    saveWorkout({
      ...workout,
      id: crypto.randomUUID(),
      name: `${workout.name} (${lang === "pt" ? "cópia" : "copy"})`,
      namePt: workout.namePt
        ? `${workout.namePt} (${lang === "pt" ? "cópia" : "copy"})`
        : undefined,
    });
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
      <PageHeader
        title={t.homeTitle}
        action={
          <div className="flex items-center" style={{ gap: 12 }}>
            <button className="btn-icon" aria-label="history" onClick={onViewHistory}>
              <History size={18} style={{ color: "var(--text)" }} />
            </button>
            {onViewExercises && (
              <button className="btn-icon" aria-label="exercises" onClick={onViewExercises}>
                <Dumbbell size={18} style={{ color: "var(--text)" }} />
              </button>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-4 scrollbar-hide fade-in">
        {/* ── Quick start ── */}
        <div className="card">
          <p className="text-xs" style={{ color: "var(--muted)", marginBottom: 4 }}>{greeting}</p>
          <p className="text-base font-bold" style={{ color: "var(--text)", marginBottom: 12 }}>{subtitle}</p>

          {canQuickStart ? (
            <button
              className="btn btn-primary w-full py-3.5 text-base"
              style={{ fontWeight: 800 }}
              onClick={() => onStartWorkout({ workoutId: todayWorkout.id, workoutName: workoutLabel })}
            >
              <Play size={18} fill="currentColor" strokeWidth={2.5} />
              {lang === "pt" ? "Começar treino de hoje" : "Start today's workout"}
            </button>
          ) : (
            <button className="btn btn-ghost w-full py-3 text-sm" onClick={onStartEmpty}>
              <Plus size={16} /> {lang === "pt" ? "Iniciar um treino vazio" : "Start empty workout"}
            </button>
          )}
        </div>

        {/* ── Current plan ── */}
        <div>
          <div className="section-header">
            <p className="section-title" style={{ marginBottom: 0 }}>
              {lang === "pt" ? "Plano Atual" : "Current Plan"}
            </p>
            <button className="btn-icon" aria-label="more" onClick={onManagePlans}>
              <MoreHorizontal size={16} style={{ color: "var(--text)" }} />
            </button>
          </div>
          <button
            className="card w-full flex items-center justify-between text-left"
            style={{ cursor: "pointer" }}
            onClick={activePlan ? onViewPlanDetails : onManagePlans}
          >
            {activePlan ? (
              <div style={{ minWidth: 0 }}>
                <p className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>{activePlan.name}</p>
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

        {/* ── My workouts ── */}
        <div>
          <div className="section-header">
            <p className="section-title" style={{ marginBottom: 0 }}>
              {lang === "pt" ? "Os meus Treinos" : "My Workouts"} ({workouts.length})
            </p>
            <div className="flex items-center" style={{ gap: 12 }}>
              <button className="btn-icon" aria-label="create workout" onClick={onCreateWorkout}>
                <Plus size={16} style={{ color: "var(--text)" }} />
              </button>
              <button className="btn-icon" aria-label="more" onClick={onManageWorkouts}>
                <MoreHorizontal size={16} style={{ color: "var(--text)" }} />
              </button>
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {workouts.map((w) => {
              const name = lang === "pt" ? w.namePt || w.name : w.name;
              const exerciseNames = w.exercises
                ?.map((exId) => {
                  const ex = exercisesData.find((e) => e.id === exId);
                  return ex ? (lang === "pt" ? ex.namePt || ex.name : ex.name) : null;
                })
                .filter(Boolean)
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
                    <p className="text-base font-bold truncate" style={{ color: "var(--text)", minWidth: 0 }}>{name}</p>
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
    </div>
  );
}
