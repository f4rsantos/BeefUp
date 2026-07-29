import { useMemo, useState, useRef, useEffect } from "react";
import { Plus, Clock, History, ChevronRight, Dumbbell, MoreHorizontal, Pencil, Copy, Trash2, Play, FilePenLine, Moon, Share2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { todaysPlanEntry } from "../lib/planUtils";
import { bodyAreasForSessions, recentSessions } from "../lib/muscles";
import { resolveExercise, BODY_PART_ACCENT } from "../lib/exerciseTree";
import { encodeWorkoutShare } from "../lib/workoutShare";
import HumanBody from "../components/HumanBody";

function formatLastDate(iso, lang) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString(lang === "pt" ? "pt-PT" : undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const SPACE = { sm: 8, md: 16, lg: 32 };

function workoutAccentColors(workout) {
  const counts = {};
  workout.exercises?.forEach((ref) => {
    const ex = resolveExercise(ref);
    if (!ex?.bodyPart) return;
    counts[ex.bodyPart] = (counts[ex.bodyPart] || 0) + 1;
  });

  const colors = [];
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([bodyPart]) => {
      const color = BODY_PART_ACCENT[bodyPart];
      if (color && !colors.includes(color)) colors.push(color);
    });
  return colors;
}


function WorkoutCardMenu({ workout, lang, onRename, onDuplicate, onShare, onDelete, onEdit }) {
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
              onShare(workout);
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
            <Share2 size={14} />
            {lang === "pt" ? "Partilhar" : "Share"}
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

const MINI_SCALE = 0.5;

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
    () => todaysPlanEntry(activePlan),
    [activePlan],
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

  const handleShare = (workout) => {
    const code = encodeWorkoutShare(workout);
    const url = `${window.location.origin}${window.location.pathname}?w=${code}`;
    if (navigator.share) {
      navigator.share({ title: lang === "pt" ? workout.namePt || workout.name : workout.name, url });
    } else {
      navigator.clipboard.writeText(url);
    }
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
        <div className="flex items-center justify-between" style={{ marginBottom: SPACE.lg }}>
          <h1 className="display" style={{ fontSize: 30, fontWeight: 900, color: "var(--text)" }}>
            {t.homeTitle}
          </h1>
          <div className="flex items-center" style={{ gap: 8 }}>
            <button
              aria-label="history"
              title={t.history}
              onClick={onViewHistory}
              className="btn btn-ghost p-2"
            >
              <History size={16} />
            </button>
            <button
              aria-label="exercises"
              title={t.exercisesTitle}
              onClick={onViewExercises}
              className="btn btn-ghost p-2"
            >
              <Dumbbell size={16} />
            </button>
          </div>
        </div>

        {/* ── Today's hero ── */}
        {!activePlan ? (
          <div className="card" style={{ marginBottom: SPACE.md }}>
            <p className="text-sm" style={{ color: "var(--muted)" }}>{t.noPlan}</p>
            <button className="btn btn-ghost mt-3 w-full py-2.5 text-sm" onClick={onManageWorkouts}>
              {t.choosePlan}
            </button>
          </div>
        ) : todayEntry?.type === "rest" ? (
          <div className="hero" style={{ background: "var(--grad-energy)", marginBottom: SPACE.md }}>
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
          <div className="hero" style={{ marginBottom: SPACE.md }}>
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
          <div className="card" style={{ marginBottom: SPACE.md }}>
            <p className="text-xs mb-0.5" style={{ color: "var(--muted)" }}>{activePlan.name}</p>
            <p className="text-sm" style={{ color: "var(--muted)" }}>{t.noWorkoutScheduled}</p>
          </div>
        )}

        {/* ── Weekly muscle heatmap (signature figure) ── */}
        <div className="card card-elevated" style={{ marginBottom: SPACE.md }}>
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
            <div
              className="flex justify-center"
              style={{
                gap: 24,
                overflow: "hidden",
                padding: "12px 0 4px",
                background: "radial-gradient(60% 80% at 50% 20%, var(--accent-soft), transparent 70%)",
                borderRadius: 16,
              }}
            >
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
        <div className="flex items-center justify-between" style={{ marginBottom: SPACE.sm }}>
          <p className="text-sm font-semibold" style={{ color: "var(--muted)" }}>
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
          style={{ cursor: "pointer", marginBottom: SPACE.lg }}
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
        <div className="flex items-center justify-between" style={{ marginBottom: SPACE.sm }}>
          <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
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
          style={{ gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: SPACE.lg }}
        >
          {workouts.map((w) => {
            const name = lang === "pt" ? w.namePt || w.name : w.name;
            const exerciseCount = w.exercises?.length ?? 0;
            const exerciseNames = w.exercises
              ?.slice(0, 3)
              .map((ref) => {
                const ex = resolveExercise(ref);
                return ex ? (lang === "pt" ? ex.namePt || ex.name : ex.name) : null;
              })
              .filter(Boolean)
              .join(", ");
            const extraCount = exerciseCount - 3;
            const accentColors = workoutAccentColors(w);
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
                {accentColors.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 4,
                      background: accentColors.length === 1
                        ? accentColors[0]
                        : `linear-gradient(90deg, ${accentColors.join(", ")})`,
                    }}
                  />
                )}
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
                    onShare={handleShare}
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
                  {exerciseNames
                    ? `${exerciseNames}${extraCount > 0 ? ` +${extraCount}` : ""}`
                    : "-"}
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
