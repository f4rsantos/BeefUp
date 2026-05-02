import { useState } from "react";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
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
      <div className="flex items-center gap-3 px-5 pt-7 pb-4">
        <button className="btn btn-ghost p-2" onClick={onBack}>
          <ArrowLeft size={18} />
        </button>
        <span
          className="font-semibold text-base"
          style={{ color: "var(--text)" }}
        >
          {t.settingsTitle}
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 px-4 mb-4">
        {["plans", "workouts"].map((tab_) => (
          <button
            key={tab_}
            className="btn text-sm px-4 py-2"
            style={{
              background: tab === tab_ ? "var(--text)" : "var(--surface2)",
              color: tab === tab_ ? "var(--bg)" : "var(--muted)",
            }}
            onClick={() => setTab(tab_)}
          >
            {tab_ === "plans" ? t.plans : t.workouts}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-4 scrollbar-hide">
        {tab === "plans" && (
          <>
            {plans.map((plan) => (
              <div key={plan.id} className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className="font-semibold text-sm"
                      style={{ color: "var(--text)" }}
                    >
                      {plan.name}
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: "var(--muted)" }}
                    >
                      {plan.days?.length ?? 0} dias
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {activePlanId === plan.id ? (
                      <span
                        className="text-xs px-2 py-1 rounded-lg"
                        style={{
                          background: "var(--success)",
                          color: "#166534",
                        }}
                      >
                        {t.activePlan}
                      </span>
                    ) : (
                      <button
                        className="btn btn-ghost text-xs py-1 px-2"
                        onClick={() => setActivePlan(plan.id)}
                      >
                        {t.setActive}
                      </button>
                    )}
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
            ))}
            <button
              className="btn btn-ghost w-full py-3.5 text-sm"
              onClick={() => {
                setEditingPlan(null);
                setView("editPlan");
              }}
            >
              <Plus size={14} /> {t.newPlan}
            </button>
          </>
        )}

        {tab === "workouts" && (
          <>
            {workouts.map((w) => (
              <div key={w.id} className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className="font-semibold text-sm"
                      style={{ color: "var(--text)" }}
                    >
                      {lang === "pt" ? w.namePt || w.name : w.name}
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: "var(--muted)" }}
                    >
                      {w.exercises?.length ?? 0} exercícios
                    </p>
                  </div>
                  <div className="flex gap-2">
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
              </div>
            ))}
            <button
              className="btn btn-ghost w-full py-3.5 text-sm"
              onClick={() => {
                setEditingWorkout(null);
                setView("editWorkout");
              }}
            >
              <Plus size={14} /> {t.newWorkout}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
