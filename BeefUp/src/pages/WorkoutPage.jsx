import BrandStrip from "../components/BrandStrip";
import { useMemo, useState, useRef, useEffect } from "react";
import { Plus, History, ChevronRight, Dumbbell, MoreHorizontal, Pencil, Copy, Trash2, FilePenLine, Share2, Shapes } from "lucide-react";
import { useApp } from "../context/useApp";
import { isPrescribed } from "../lib/planUtils";
import { bodyAreasForSessions, recentSessions } from "../lib/muscles";
import { encodeWorkoutShare } from "../lib/workoutShare";
import HumanBody from "../components/HumanBody";
import WorkoutIconModal from "../components/WorkoutIconModal";
import { workoutBodyParts, workoutColors, workoutIconFor, workoutTint } from "../lib/workoutArt";
import ConfirmModal from "../components/ConfirmModal";

const SPACE = { sm: 8, md: 16, lg: 32 };

const ICON_BUTTON_STYLE = { background: "none", border: "none", cursor: "pointer", color: "var(--text)" };

const MENU_ITEM_STYLE = {
  width: "100%",
  padding: "10px 14px",
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: 13,
  textAlign: "left",
};

function WorkoutCardMenu({ workout, t, onRename, onDuplicate, onShare, onDelete, onEdit, onIcon }) {
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

  const locked = isPrescribed(workout);

  const menuItems = [
    ...(locked ? [] : [
      { Icon: Pencil, label: t.edit, onSelect: () => onEdit(workout) },
      { Icon: FilePenLine, label: t.rename, onSelect: () => onRename(workout) },
    ]),
    { Icon: Copy, label: t.duplicate, onSelect: () => onDuplicate(workout) },
    { Icon: Shapes, label: t.workoutIconAction, onSelect: () => onIcon(workout) },
    { Icon: Share2, label: t.share, onSelect: () => onShare(workout) },
    ...(locked ? [] : [
      { Icon: Trash2, label: t.deleteWorkoutAction, onSelect: () => onDelete(workout), danger: true },
    ]),
  ];

  return (
    <>
      <button
        ref={btnRef}
        className="tap"
        aria-label={t.workoutOptions}
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
          {menuItems.map(({ Icon, label, onSelect, danger }) => (
            <button
              key={label}
              onClick={() => {
                setOpen(false);
                onSelect();
              }}
              style={{
                ...MENU_ITEM_STYLE,
                color: danger ? "#ef4444" : "var(--text)",
                borderTop: danger ? "1px solid var(--border)" : "none",
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
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
  const { t, plans, activePlanId, workouts, sessions, saveWorkout, deleteWorkout, workoutIcons, setWorkoutIcon } = useApp()
  const [pendingDelete, setPendingDelete] = useState(null);
  const [iconFor, setIconFor] = useState(null);
  const activePlan = plans.find((p) => p.id === activePlanId) ?? null;

  // Muscles trained in the last 7 days, for the home heatmap figure.
  const weekAreas = useMemo(
    () => bodyAreasForSessions(recentSessions(sessions, 7)),
    [sessions],
  );
  const weekSessionCount = useMemo(() => recentSessions(sessions, 7).length, [sessions]);

  const handleRename = (workout) => {
    const newName = window.prompt(
      t.renameWorkoutPrompt,
      workout.name,
    );
    if (!newName || !newName.trim()) return;
    saveWorkout({ ...workout, name: newName.trim() });
  };

  const handleDuplicate = (workout) => {
    const copy = {
      ...workout,
      id: crypto.randomUUID(),
      name: `${workout.name} (${t.copySuffix})`,
    };
    saveWorkout(copy);
  };

  const handleShare = (workout) => {
    const code = encodeWorkoutShare(workout);
    const url = `${window.location.origin}${window.location.pathname}?w=${code}`;
    if (navigator.share) {
      navigator.share({ title: workout.name, url });
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  const handleDelete = (workout) => {
    setPendingDelete(workout);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ padding: "var(--page-py-top) var(--page-px) 16px" }}>
        <BrandStrip />
        {/* Header com ícones à direita */}
        <div className="flex items-center justify-between" style={{ marginBottom: SPACE.lg }}>
          <h1 className="display" style={{ fontSize: 30, fontWeight: 900, color: "var(--text)" }}>
            {t.homeTitle}
          </h1>
          <div className="flex items-center" style={{ gap: 8 }}>
            <button
              aria-label={t.history}
              title={t.history}
              onClick={onViewHistory}
              className="btn btn-ghost p-2"
            >
              <History size={16} />
            </button>
            <button
              aria-label={t.exercisesTitle}
              title={t.exercisesTitle}
              onClick={onViewExercises}
              className="btn btn-ghost p-2"
            >
              <Dumbbell size={16} />
            </button>
          </div>
        </div>

        {/* ── Weekly muscle heatmap (signature figure) ── */}
        <div className="card card-elevated" style={{ marginBottom: SPACE.md }}>
          <div className="section-header">
            <p className="section-title" style={{ marginBottom: 0 }}>
              {t.weekMuscles}
            </p>
            <span className="chip active" style={{ pointerEvents: "none" }}>
              <Dumbbell size={12} /> {weekSessionCount}
            </span>
          </div>
          {weekSessionCount === 0 ? (
            <p className="text-sm text-center" style={{ color: "var(--muted)", padding: "20px 0" }}>
              {t.noWorkoutsThisWeek}
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
                    {view === "front" ? (t.bodyFront) : (t.bodyBack)}
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
            {t.currentPlan}
          </p>
          <div className="flex items-center" style={{ gap: 12 }}>
            <button className="tap" aria-label={t.managePlans} onClick={onManagePlans} style={ICON_BUTTON_STYLE}>
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
                {activePlan.days?.length ?? 0} {t.days}
              </p>
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              {t.noActivePlanTap}
            </p>
          )}
          <ChevronRight size={16} style={{ color: "var(--muted)", flexShrink: 0 }} />
        </button>

        {/* Outros Treinos */}
        <div className="flex items-center justify-between" style={{ marginBottom: SPACE.sm }}>
          <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
          {t.myWorkouts} ({workouts.length})
          </p>
          <div className="flex items-center" style={{ gap: 12 }}>
            <button className="tap" aria-label={t.newWorkout} onClick={onCreateWorkout} style={ICON_BUTTON_STYLE}>
              <Plus size={18} />
            </button>
            <button className="tap" aria-label={t.manageWorkouts} onClick={onManageWorkouts} style={ICON_BUTTON_STYLE}>
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>

        <div
          className="grid"
          style={{ gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: SPACE.lg }}
        >
          {workouts.map((w) => {
            const parts = workoutBodyParts(w);
            const colors = workoutColors(parts);
            const { Icon } = workoutIconFor(parts, workoutIcons[w.id]);
            return (
              <div
                key={w.id}
                className="card workout-card"
                style={{ background: workoutTint(colors), "--art-color": colors[0] ?? "var(--muted)" }}
                onClick={() =>
                  onStartWorkout({
                    workoutId: w.id,
                    workoutName: w.name,
                  })
                }
              >
                <Icon className="workout-card-icon" size={92} strokeWidth={1.5} aria-hidden="true" />
                <div className="workout-card-menu">
                  <WorkoutCardMenu
                    workout={w}
                    t={t}
                    onEdit={onEditWorkout}
                    onRename={handleRename}
                    onDuplicate={handleDuplicate}
                    onShare={handleShare}
                    onDelete={handleDelete}
                    onIcon={setIconFor}
                  />
                </div>
                <p className="workout-card-title">{w.name}</p>
              </div>
            );
          })}
        </div>
      </div>

      {iconFor && (
        <WorkoutIconModal
          workout={iconFor}
          current={workoutIconFor(workoutBodyParts(iconFor), workoutIcons[iconFor.id]).key}
          color={workoutColors(workoutBodyParts(iconFor))[0] ?? "var(--muted)"}
          onPick={(key) => setWorkoutIcon(iconFor.id, key)}
          onClose={() => setIconFor(null)}
        />
      )}

      {pendingDelete && (
        <ConfirmModal
          title={t.deleteWorkoutTitle.replace("{name}", pendingDelete.name)}
          message={t.cannotUndo}
          cancelLabel={t.cancel}
          confirmLabel={t.delete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            deleteWorkout(pendingDelete.id);
            setPendingDelete(null);
          }}
        />
      )}
    </div>
  );
}
