import { useState } from "react";
import { ChevronLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import WorkoutEditor from "../components/WorkoutEditor";

export default function WorkoutSettings({ onBack, initialView = "main", initialWorkout = null }) {
  const { t, lang, workouts, saveWorkout, deleteWorkout } = useApp();

  const [view, setView] = useState(initialView); // 'main' | 'editWorkout'
  const [editingWorkout, setEditingWorkout] = useState(initialWorkout);

  if (view === "editWorkout") {
    return (
      <WorkoutEditor
        workout={editingWorkout}
        onSave={saveWorkout}
        onBack={() => (initialView === "editWorkout" ? onBack() : setView("main"))}
        lang={lang}
        t={t}
      />
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div className="flex items-center gap-3" style={{ padding: "34px 16px 14px" }}>
        <button className="btn-back" aria-label="back" onClick={onBack}>
          <ChevronLeft size={20} />
        </button>
        <h1 className="display" style={{ fontSize: 30, fontWeight: 900, color: "var(--text)", lineHeight: 1.05 }}>
          {t.manageWorkouts}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-3 scrollbar-hide fade-in">
        {workouts.map((w) => (
          <div key={w.id} className="card flex items-center justify-between gap-3">
            <div style={{ minWidth: 0 }}>
              <p className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>
                {lang === "pt" ? w.namePt || w.name : w.name}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                {w.exercises?.length ?? 0} {t.exercises}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                className="btn btn-ghost p-1.5"
                onClick={() => {
                  setEditingWorkout(w);
                  setView("editWorkout");
                }}
              >
                <Pencil size={14} style={{ color: "var(--muted)" }} />
              </button>
              <button className="btn btn-ghost p-1.5" onClick={() => deleteWorkout(w.id)}>
                <Trash2 size={14} style={{ color: "var(--muted)" }} />
              </button>
            </div>
          </div>
        ))}
        <button
          className="btn btn-ghost w-full py-3.5 text-sm flex items-center justify-center gap-2"
          style={{ borderStyle: "dashed" }}
          onClick={() => {
            setEditingWorkout(null);
            setView("editWorkout");
          }}
        >
          <Plus size={14} /> {t.newWorkout}
        </button>
      </div>
    </div>
  );
}
