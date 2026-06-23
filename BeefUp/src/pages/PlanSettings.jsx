import { useState } from "react";
import { ChevronLeft, Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import WorkoutEditor from "../components/WorkoutEditor";
import PlanEditor from "../components/PlanEditor";

// ─── Main PlanSettings page ────────────────────────────────────────────────────

export default function PlanSettings({ onBack }) {
  const {
    t,
    lang,
    plans,
    savePlan,
    deletePlan,
    activePlanId,
    setActivePlan,
    workouts,
    saveWorkout,
    deleteWorkout,
  } = useApp();
  const [view, setView] = useState("main"); // 'main' | 'editPlan' | 'editWorkout'
  const [editingPlan, setEditingPlan] = useState(null);
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [tab, setTab] = useState("plans"); // 'plans' | 'workouts'

  if (view === "editPlan") {
    return (
      <PlanEditor
        plan={editingPlan}
        workouts={workouts}
        onSave={savePlan}
        onBack={() => setView("main")}
        lang={lang}
        t={t}
      />
    );
  }

  if (view === "editWorkout") {
    return (
      <WorkoutEditor
        workout={editingWorkout}
        onSave={saveWorkout}
        onBack={() => setView("main")}
        lang={lang}
        t={t}
      />
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div className="flex items-center gap-1" style={{ padding: "34px 12px 14px" }}>
        <button className="btn-back" onClick={onBack} aria-label={t.back}>
          <ChevronLeft size={24} style={{ color: "var(--text)" }} />
        </button>
        <h1 className="display" style={{ fontSize: 26, fontWeight: 900, color: "var(--text)" }}>
          {t.manageWorkouts}
        </h1>
      </div>

      <div className="flex gap-2 px-4 mb-3">
        {["plans", "workouts"].map((tab_) => (
          <button
            key={tab_}
            className={`chip ${tab === tab_ ? "active" : ""}`}
            style={{ flex: 1, justifyContent: "center", padding: "10px" }}
            onClick={() => setTab(tab_)}
          >
            {tab_ === "plans" ? t.plans : t.workouts}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-3 scrollbar-hide">
        {tab === "plans" && (
          <>
            {plans.map((plan) => {
              const isActive = activePlanId === plan.id;
              return (
              <div key={plan.id} className="card flex flex-col gap-3" style={isActive ? { borderColor: "var(--accent)" } : undefined}>
                <div>
                  <p
                    className="font-bold text-sm"
                    style={{ color: "var(--text)" }}
                  >
                    {plan.name}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--muted)" }}
                  >
                    {plan.days?.length ?? 0} {lang === "pt" ? "dias" : "days"}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2">
                  {isActive ? (
                    <span
                      className="text-xs px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1"
                      style={{
                        background: "var(--accent-soft)",
                        color: "var(--accent)",
                      }}
                    >
                      <CheckCircle2 size={13} /> {t.activePlan}
                    </span>
                  ) : (
                    <button
                      className="btn btn-ghost text-xs py-1.5 px-2.5"
                      onClick={() => setActivePlan(plan.id)}
                    >
                      {t.setActive}
                    </button>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      className="btn btn-ghost p-1.5"
                      onClick={() => {
                        setEditingPlan(plan);
                        setView("editPlan");
                      }}
                    >
                      <Pencil size={14} style={{ color: "var(--muted)" }} />
                    </button>
                    <button
                      className="btn btn-ghost p-1.5"
                      onClick={() => deletePlan(plan.id)}
                    >
                      <Trash2 size={14} style={{ color: "var(--muted)" }} />
                    </button>
                  </div>
                </div>
              </div>
            );
            })}
            <button
              className="btn btn-ghost w-full py-3.5 text-sm flex items-center justify-center gap-2"
              style={{ borderStyle: "dashed" }}
              onClick={() => {
                setEditingPlan(null);
                setView("editPlan");
              }}
            >
              <Plus size={15} /> {t.newPlan}
            </button>
          </>
        )}

        {tab === "workouts" && (
          <>
            {workouts.map((w) => (
              <div key={w.id} className="card flex items-center justify-between gap-3">
                <div style={{ minWidth: 0 }}>
                  <p
                    className="font-bold text-sm truncate"
                    style={{ color: "var(--text)" }}
                  >
                    {lang === "pt" ? w.namePt || w.name : w.name}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--muted)" }}
                  >
                    {w.exercises?.length ?? 0} {lang === "pt" ? "exercícios" : "exercises"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="btn btn-ghost p-1.5"
                    onClick={() => {
                      setEditingWorkout(w);
                      setView("editWorkout");
                    }}
                  >
                    <Pencil size={14} style={{ color: "var(--muted)" }} />
                  </button>
                  <button
                    className="btn btn-ghost p-1.5"
                    onClick={() => deleteWorkout(w.id)}
                  >
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
              <Plus size={15} /> {t.newWorkout}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
