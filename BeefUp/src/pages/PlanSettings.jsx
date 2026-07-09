import { useState } from "react";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import PlanEditor from "../components/PlanEditor";

// ─── Main PlanSettings page ────────────────────────────────────────────────────

export default function PlanSettings({ onBack, initialPlanId = null }) {
  const {
    t,
    plans,
    savePlan,
    deletePlan,
    activePlanId,
    setActivePlan,
    workouts,
  } = useApp();
  const initialPlan = initialPlanId
    ? plans.find((plan) => plan.id === initialPlanId) ?? null
    : null;
  const [view, setView] = useState(initialPlan ? "editPlan" : "main"); // 'main' | 'editPlan'
  const [editingPlan, setEditingPlan] = useState(initialPlan);

  if (view === "editPlan") {
    return (
      <PlanEditor
        plan={editingPlan}
        workouts={workouts}
        onSave={savePlan}
        onBack={() => setView("main")}
        t={t}
      />
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div className="flex items-center gap-3 px-5 pt-10 pb-6">
        <button className="btn-back" onClick={onBack}>
          <ArrowLeft size={18} style={{ color: "var(--text)" }} />
        </button>
        <span className="font-semibold text-base" style={{ color: "var(--text)" }}>
          {t.settingsTitle}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-3 scrollbar-hide">
        {plans.map((plan) => (
          <div key={plan.id} className="card flex flex-col gap-3">
            <div>
              <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>
                {plan.name}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                {plan.days?.length ?? 0} dias
              </p>
            </div>
            <div className="flex items-center justify-between gap-2">
              {activePlanId === plan.id ? (
                <span
                  className="text-xs px-2.5 py-1 rounded-lg font-medium"
                  style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                >
                  {t.activePlan}
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
                <button className="btn btn-ghost p-1.5" onClick={() => deletePlan(plan.id)}>
                  <Trash2 size={14} style={{ color: "var(--muted)" }} />
                </button>
              </div>
            </div>
          </div>
        ))}
        <button
          className="btn btn-ghost w-full py-3.5 text-sm flex items-center justify-center gap-2"
          onClick={() => {
            setEditingPlan(null);
            setView("editPlan");
          }}
        >
          <Plus size={14} /> {t.newPlan}
        </button>
      </div>
    </div>
  );
}
