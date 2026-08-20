import { useState } from "react";
import { ChevronLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import WorkoutEditor from "../components/WorkoutEditor";
import ConfirmModal from "../components/ConfirmModal";

export default function WorkoutSettings({ onBack, initialView = "main", initialWorkout = null }) {
  const {
    t,
    lang,
    workouts,
    saveWorkout,
    deleteWorkout,
    activeWorkout,
  } = useApp();

  const [view, setView] = useState(initialView); // 'main' | 'editWorkout'
  const [editingWorkout, setEditingWorkout] = useState(initialWorkout);
  const [pendingDelete, setPendingDelete] = useState(null);

  if (view === "editWorkout") {
    return (
      <WorkoutEditor
        workout={editingWorkout}
        onSave={saveWorkout}
        onBack={() => (initialView === "editWorkout" ? onBack() : setView("main"))}
        lang={lang}
        t={t}
        isActiveWorkout={!!editingWorkout && editingWorkout.id === activeWorkout?.workoutId}
      />
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div
        className="flex-1 overflow-y-auto pb-6 flex flex-col gap-3 scrollbar-hide"
        style={{ paddingTop: "var(--page-py-top)", paddingLeft: "var(--page-px)", paddingRight: "var(--page-px)" }}
      >
        <div className="flex items-center gap-1">
          <button className="btn-back" onClick={onBack} aria-label={t.back}>
            <ChevronLeft size={24} style={{ color: "var(--text)" }} />
          </button>
          <h1 className="display" style={{ fontSize: 28, fontWeight: 900, color: "var(--text)" }}>
            {t.settingsTitle}
          </h1>
        </div>
        {workouts.map((w) => (
          <div key={w.id} className="card flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>
                {w.name}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                {w.exercises?.length ?? 0} {t.exercises}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-ghost p-1.5"
                onClick={() => {
                  setEditingWorkout(w);
                  setView("editWorkout");
                }}
                aria-label={t.edit}
              >
                <Pencil size={14} style={{ color: "var(--muted)" }} />
              </button>
              <button className="btn btn-ghost p-1.5" onClick={() => setPendingDelete(w)} aria-label={t.delete}>
                <Trash2 size={14} style={{ color: "var(--muted)" }} />
              </button>
            </div>
          </div>
        ))}
        <button
          className="btn btn-ghost w-full py-3.5 text-sm flex items-center justify-center gap-2"
          onClick={() => {
            setEditingWorkout(null);
            setView("editWorkout");
          }}
        >
          <Plus size={14} /> {t.newWorkout}
        </button>
      </div>

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
