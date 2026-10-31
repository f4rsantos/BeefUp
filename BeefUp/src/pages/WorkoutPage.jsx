import BrandStrip from "../components/BrandStrip";
import { useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, History, Dumbbell, MoreHorizontal, Pencil, Copy, Trash2, FilePenLine, Share2, Shapes, CalendarRange, Activity, ChevronRight } from "lucide-react";
import { useApp } from "../context/useApp";
import { isPrescribed } from "../lib/planUtils";
import { bodyAreasForSessions, recentSessions } from "../lib/muscles";
import { encodeWorkoutShare } from "../lib/workoutShare";
import HumanBody from "../components/HumanBody";
import WorkoutIconModal from "../components/WorkoutIconModal";
import { workoutBodyParts, workoutColors, workoutIconFor, workoutTint } from "../lib/workoutArt";
import ConfirmModal from "../components/ConfirmModal";
import RenameModal from "../components/RenameModal";
import Screen from "../components/ui/Screen";
import LargeTitle from "../components/ui/LargeTitle";
import IconButton from "../components/ui/IconButton";
import SectionHeader from "../components/ui/SectionHeader";
import EmptyState from "../components/ui/EmptyState";

const MENU_WIDTH = 220;
const MENU_ITEM_HEIGHT = 44;
const MENU_DIVIDER = 6;

const MENU_ITEM_STYLE = {
  width: "100%",
  minHeight: MENU_ITEM_HEIGHT,
  padding: "0 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  border: "none",
  cursor: "pointer",
  fontSize: 16,
  textAlign: "left",
};

function WorkoutCardMenu({ workout, t, onRename, onDuplicate, onShare, onDelete, onEdit, onIcon }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [portalTarget, setPortalTarget] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

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

  const toggleMenu = (e) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const menuHeight = menuItems.length * MENU_ITEM_HEIGHT + MENU_DIVIDER;
      const fitsBelow = rect.bottom + 4 + menuHeight <= window.innerHeight - 8;
      setCoords({
        top: fitsBelow ? rect.bottom + 4 : Math.max(8, rect.top - 4 - menuHeight),
        left: Math.max(8, rect.right - MENU_WIDTH),
      });
      setPortalTarget(btnRef.current.closest(".app-shell") ?? document.body);
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
      <IconButton
        ref={btnRef}
        icon={MoreHorizontal}
        size="sm"
        label={t.workoutOptions}
        onClick={toggleMenu}
      />

      {/* Portalled out of the card: its stacking context would trap the menu under later cards. */}
      {open && portalTarget && createPortal(
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          className="glass-menu fade-in"
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            borderRadius: 16,
            width: MENU_WIDTH,
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          {menuItems.map(({ Icon, label, onSelect, danger }) => (
            <button
              key={label}
              className="glass-menu-item"
              onClick={() => {
                setOpen(false);
                onSelect();
              }}
              style={{
                ...MENU_ITEM_STYLE,
                color: danger ? "var(--danger)" : "var(--text)",
                borderTop: danger ? `${MENU_DIVIDER}px solid var(--fill)` : "none",
              }}
            >
              {label}
              <Icon size={17} />
            </button>
          ))}
        </div>,
        portalTarget
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
  const [pendingRename, setPendingRename] = useState(null);
  const activePlan = plans.find((p) => p.id === activePlanId) ?? null;

  // Muscles trained in the last 7 days, for the home heatmap figure.
  const weekAreas = useMemo(
    () => bodyAreasForSessions(recentSessions(sessions, 7)),
    [sessions],
  );
  const weekSessionCount = useMemo(() => recentSessions(sessions, 7).length, [sessions]);

  const handleRename = (workout) => setPendingRename(workout);

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

  const modals = (
    <>
      {iconFor && (
        <WorkoutIconModal
          workout={iconFor}
          current={workoutIconFor(workoutBodyParts(iconFor), workoutIcons[iconFor.id]).key}
          color={workoutColors(workoutBodyParts(iconFor))[0] ?? "var(--muted)"}
          onPick={(key) => setWorkoutIcon(iconFor.id, key)}
          onClose={() => setIconFor(null)}
        />
      )}

      {pendingRename && (
        <RenameModal
          title={t.rename}
          label={t.renameWorkoutPrompt}
          initialValue={pendingRename.name}
          cancelLabel={t.cancel}
          saveLabel={t.save}
          onCancel={() => setPendingRename(null)}
          onSave={(name) => {
            saveWorkout({ ...pendingRename, name });
            setPendingRename(null);
          }}
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
    </>
  );

  return (
    <Screen gap={28} after={modals}>
      <div>
        <BrandStrip />
        <LargeTitle
          title={t.homeTitle}
          actions={
            <>
              <IconButton icon={History} label={t.history} onClick={onViewHistory} />
              <IconButton icon={Dumbbell} label={t.exercisesTitle} onClick={onViewExercises} />
            </>
          }
        />
      </div>

      <section>
        <SectionHeader
          title={t.currentPlan}
          actions={<IconButton icon={MoreHorizontal} size="sm" label={t.managePlans} onClick={onManagePlans} />}
        />
        <button className="card feature-card" onClick={activePlan ? onViewPlanDetails : onManagePlans}>
          <span className="feature-card-orb">
            <CalendarRange size={24} strokeWidth={2.2} />
          </span>
          <span className="flex-1" style={{ minWidth: 0 }}>
            <span className="feature-card-title" style={{ display: "block" }}>
              {activePlan ? activePlan.name : t.noActivePlanTap}
            </span>
            {activePlan && (
              <span className="feature-card-meta" style={{ display: "block" }}>
                {activePlan.days?.length ?? 0} {t.days}
              </span>
            )}
          </span>
          <ChevronRight size={20} strokeWidth={2.4} style={{ color: "var(--muted)", flexShrink: 0 }} />
        </button>
      </section>

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">{t.weekMuscles}</h2>
          <span className="card-meta flex items-center gap-1">
            <Dumbbell size={13} /> {weekSessionCount}
          </span>
        </div>
        {weekSessionCount === 0 ? (
          <EmptyState icon={Activity} text={t.noWorkoutsThisWeek} />
        ) : (
          <div className="flex justify-center" style={{ gap: 28, overflow: "hidden", paddingTop: 4 }}>
            {["front", "back"].map((view) => (
              <div key={view} className="flex flex-col items-center" style={{ gap: 6 }}>
                <div style={{ width: 207 * MINI_SCALE, height: 500 * MINI_SCALE, overflow: "hidden" }}>
                  <div style={{ transform: `scale(${MINI_SCALE})`, transformOrigin: "top left", width: 207, height: 500, pointerEvents: "none" }}>
                    <HumanBody view={view} highlightedMuscles={weekAreas[view]} />
                  </div>
                </div>
                <span className="card-meta">{view === "front" ? t.bodyFront : t.bodyBack}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeader
          title={t.myWorkouts}
          meta={workouts.length}
          actions={
            <>
              <IconButton icon={Plus} size="sm" label={t.newWorkout} onClick={onCreateWorkout} />
              <IconButton icon={MoreHorizontal} size="sm" label={t.manageWorkouts} onClick={onManageWorkouts} />
            </>
          }
        />
        {workouts.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={Dumbbell}
              action={
                <button className="btn btn-primary" onClick={onCreateWorkout}>
                  <Plus size={16} /> {t.newWorkout}
                </button>
              }
            />
          </div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {workouts.map((w) => {
              const parts = workoutBodyParts(w);
              const colors = workoutColors(parts);
              const { Icon } = workoutIconFor(parts, workoutIcons[w.id]);
              const start = () => onStartWorkout({ workoutId: w.id, workoutName: w.name });
              return (
                <div
                  key={w.id}
                  role="button"
                  tabIndex={0}
                  className="card workout-card"
                  style={{
                    "--art-color": colors[0] ?? "var(--muted)",
                    "--art-wash": workoutTint(colors),
                  }}
                  onClick={start}
                  onKeyDown={(e) => {
                    if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      start();
                    }
                  }}
                >
                  <Icon className="workout-card-icon" size={22} strokeWidth={2} aria-hidden="true" />
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
                  <div>
                    <p className="workout-card-title">{w.name}</p>
                    <p className="workout-card-meta">{w.exercises?.length ?? 0} {t.exercises}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </Screen>
  );
}

