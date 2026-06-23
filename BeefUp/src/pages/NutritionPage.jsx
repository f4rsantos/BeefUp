import { useMemo, useState } from "react";
import { Plus, Minus, Pencil, Droplet, Trash2, Coffee, Sun, Moon, Cookie } from "lucide-react";
import { useApp } from "../context/AppContext";
import { todayISO } from "../lib/planUtils";
import PageHeader from "../components/PageHeader";
import ProgressRing from "../components/ProgressRing";
import FoodSearchModal from "../components/FoodSearchModal";
import MacroGoalModal from "../components/MacroGoalModal";

const MEALS = [
  { id: "breakfast", Icon: Coffee },
  { id: "lunch", Icon: Sun },
  { id: "dinner", Icon: Moon },
  { id: "snack", Icon: Cookie },
];
const GLASS_ML = 250;

export default function NutritionPage() {
  const { t, lang, foodLog, deleteFoodLog, nutritionGoals, waterMap, setWaterToday } = useApp();
  const today = todayISO();
  const [addMeal, setAddMeal] = useState(null);
  const [showGoals, setShowGoals] = useState(false);

  const todayLog = useMemo(() => foodLog.filter((e) => e.date === today), [foodLog, today]);

  const totals = useMemo(() => {
    return todayLog.reduce(
      (acc, e) => ({
        kcal: acc.kcal + (e.kcal || 0),
        protein: acc.protein + (e.protein || 0),
        carbs: acc.carbs + (e.carbs || 0),
        fat: acc.fat + (e.fat || 0),
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }, [todayLog]);

  const water = waterMap[today] || 0;
  const waterGlasses = Math.round(water / GLASS_ML);
  const goalGlasses = Math.max(1, Math.round((nutritionGoals.waterMl || 2500) / GLASS_ML));

  const kcalLeft = Math.max(0, (nutritionGoals.kcal || 0) - totals.kcal);

  const macros = [
    { key: "protein", label: t.protein, val: Math.round(totals.protein), goal: nutritionGoals.protein, color: "var(--protein)" },
    { key: "carbs", label: t.carbs, val: Math.round(totals.carbs), goal: nutritionGoals.carbs, color: "var(--carbs)" },
    { key: "fat", label: t.fat, val: Math.round(totals.fat), goal: nutritionGoals.fat, color: "var(--fat)" },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <PageHeader
        eyebrow={lang === "pt" ? "Hoje" : "Today"}
        title={t.nutrition}
        action={
          <button className="btn btn-ghost p-2.5" onClick={() => setShowGoals(true)} aria-label={t.editGoals}>
            <Pencil size={16} />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-4 scrollbar-hide fade-in">
        {/* ── Calorie hero ── */}
        <div className="card card-elevated flex items-center gap-5" style={{ padding: 20 }}>
          <ProgressRing
            value={totals.kcal}
            max={nutritionGoals.kcal || 1}
            size={128}
            stroke={12}
            gradientId="kcalRing"
            gradientFrom="#22c55e"
            gradientTo="#16a34a"
          >
            <span className="display" style={{ fontSize: 26, fontWeight: 900, color: "var(--text)", lineHeight: 1 }}>
              {kcalLeft}
            </span>
            <span className="text-xs" style={{ color: "var(--muted)" }}>{t.remaining}</span>
          </ProgressRing>
          <div style={{ flex: 1 }}>
            <Row label={t.goal} value={`${nutritionGoals.kcal} ${t.kcal}`} />
            <Row label={t.consumed} value={`${Math.round(totals.kcal)} ${t.kcal}`} accent />
            <div className="divider" style={{ margin: "8px 0" }} />
            <Row label={t.remaining} value={`${kcalLeft} ${t.kcal}`} />
          </div>
        </div>

        {/* ── Macro rings ── */}
        <div className="card flex justify-around" style={{ padding: "20px 12px" }}>
          {macros.map((m) => (
            <div key={m.key} className="flex flex-col items-center gap-2">
              <ProgressRing value={m.val} max={m.goal || 1} size={72} stroke={7} color={m.color}>
                <span className="display" style={{ fontSize: 14, fontWeight: 900, color: "var(--text)" }}>{m.val}</span>
                <span style={{ fontSize: 9, color: "var(--muted)" }}>/{m.goal}g</span>
              </ProgressRing>
              <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>{m.label}</span>
            </div>
          ))}
        </div>

        {/* ── Water ── */}
        <div className="card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{ padding: 10, borderRadius: 12, background: "var(--accent-2-soft)", display: "flex" }}>
              <Droplet size={18} style={{ color: "var(--fat)" }} fill="var(--fat)" />
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>{t.water}</p>
              <p className="display" style={{ fontSize: 20, fontWeight: 900, color: "var(--text)", lineHeight: 1.1 }}>
                {(water / 1000).toFixed(2)}<span style={{ fontSize: 12, color: "var(--muted)" }}> / {((nutritionGoals.waterMl || 2500) / 1000).toFixed(1)} L</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button className="btn btn-ghost" style={{ padding: 8 }} onClick={() => setWaterToday(today, Math.max(0, water - GLASS_ML))} aria-label="-">
              <Minus size={16} />
            </button>
            <span className="text-sm font-bold" style={{ color: "var(--text)", minWidth: 56, textAlign: "center" }}>
              {waterGlasses}/{goalGlasses}
            </span>
            <button className="btn btn-energy" style={{ padding: 8 }} onClick={() => setWaterToday(today, water + GLASS_ML)} aria-label="+">
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* ── Meals ── */}
        {MEALS.map(({ id, Icon }) => {
          const items = todayLog.filter((e) => e.meal === id);
          const mealKcal = items.reduce((a, e) => a + (e.kcal || 0), 0);
          return (
            <div key={id} className="card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon size={16} style={{ color: "var(--accent)" }} />
                  <p className="font-bold text-sm" style={{ color: "var(--text)" }}>{t[id]}</p>
                  {mealKcal > 0 && <span className="text-xs" style={{ color: "var(--muted)" }}>· {mealKcal} {t.kcal}</span>}
                </div>
                <button className="btn-icon" onClick={() => setAddMeal(id)} aria-label={t.addFood}>
                  <Plus size={18} style={{ color: "var(--accent)" }} />
                </button>
              </div>
              {items.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--muted)", padding: "4px 0" }}>{t.noFoodToday}</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {items.map((e) => (
                    <div key={e.id} className="flex items-center justify-between gap-2">
                      <div style={{ minWidth: 0 }}>
                        <p className="text-sm truncate" style={{ color: "var(--text)" }}>{e.name}</p>
                        <p className="text-xs" style={{ color: "var(--muted)" }}>
                          {e.qty}g · {e.kcal} {t.kcal} · P{Math.round(e.protein)} C{Math.round(e.carbs)} G{Math.round(e.fat)}
                        </p>
                      </div>
                      <button className="btn-icon" onClick={() => deleteFoodLog(e.id)} aria-label={t.delete}>
                        <Trash2 size={14} style={{ color: "var(--muted)" }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {addMeal && <FoodSearchModal meal={addMeal} onClose={() => setAddMeal(null)} />}
      {showGoals && <MacroGoalModal onClose={() => setShowGoals(false)} />}
    </div>
  );
}

function Row({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: "2px 0" }}>
      <span className="text-xs" style={{ color: "var(--muted)" }}>{label}</span>
      <span className="text-sm font-bold" style={{ color: accent ? "var(--accent)" : "var(--text)" }}>{value}</span>
    </div>
  );
}
