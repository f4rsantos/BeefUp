import { useState } from "react";
import { ChevronLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import PlanEditor from "../components/PlanEditor";

export default function PlanSettings({ onBack, initialPlanId = null }) {
  const {
    t,
    lang,
    plans,
    savePlan,
    deletePlan,
    activePlanId,
    setActivePlan,
    workouts,
  } = useApp();
  const [view, setView] = useState(initialPlanId ? "editPlan" : "main"); // 'main' | 'editPlan'
  const [editingPlan, setEditingPlan] = useState(
    () => plans.find((p) => p.id === initialPlanId) ?? null,
  );

  if (view === "editPlan") {
    return (
      <PlanEditor
        plan={editingPlan}
        workouts={workouts}
        onSave={savePlan}
        onBack={() => (initialPlanId ? onBack() : setView("main"))}
        lang={lang}
        t={t}
      />
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div className="flex items-center gap-1" style={{ padding: "38px 16px 16px" }}>
        <button className="btn-back" onClick={onBack} aria-label={t.back}>
          <ChevronLeft size={24} style={{ color: "var(--text)" }} />
        </button>
        <h1 className="display" style={{ fontSize: 28, fontWeight: 900, color: "var(--text)" }}>
          {t.settingsTitle}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-3 scrollbar-hide">
        {plans.map((plan) => (
          <div key={plan.id} className="card flex flex-col gap-3">
            <div>
              <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>
                {plan.name}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                {plan.days?.length ?? 0} {lang === "pt" ? "dias" : "days"}
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
