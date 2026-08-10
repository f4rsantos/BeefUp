import { useMemo, useState } from "react";
import { Plus, Minus, Pencil, Droplet, Trash2, Check, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { todayISO, uid } from "../lib/planUtils";
import { macroShares } from "../lib/nutritionCalc";
import { getMealIcon, MEAL_ICON_KEYS } from "../lib/mealIcons";
import PageHeader from "../components/PageHeader";
import MacroRing from "../components/MacroRing";
import ConfirmModal from "../components/ConfirmModal";
import FoodSearchModal from "../components/FoodSearchModal";
import MacroGoalModal from "../components/MacroGoalModal";

const GLASS_ML = 250;

export default function NutritionPage() {
  const { t, foodLog, deleteFoodLog, nutritionGoals, waterMap, setWaterToday, mealTypes, setMealTypes } = useApp();
  const today = todayISO();
  const [addMeal, setAddMeal] = useState(null);
  const [showGoals, setShowGoals] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [editingMeals, setEditingMeals] = useState(false);
  const [creatingMeal, setCreatingMeal] = useState(false);
  const [newMealName, setNewMealName] = useState("");
  const [newMealIcon, setNewMealIcon] = useState(MEAL_ICON_KEYS[0]);
  const [pendingDeleteMeal, setPendingDeleteMeal] = useState(null);

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

  const kcalGoal = nutritionGoals.kcal || 0;
  const kcalDiff = kcalGoal - totals.kcal;
  const isOver = kcalDiff < 0;

  const macros = [
    { key: "protein", short: t.proteinShort, val: Math.round(totals.protein), goal: nutritionGoals.protein, color: "var(--protein)" },
    { key: "carbs", short: t.carbsShort, val: Math.round(totals.carbs), goal: nutritionGoals.carbs, color: "var(--carbs)" },
    { key: "fat", short: t.fatShort, val: Math.round(totals.fat), goal: nutritionGoals.fat, color: "var(--fat)" },
  ];

  function addMealType() {
    const name = newMealName.trim();
    if (!name) return;
    setMealTypes([...mealTypes, { id: uid(), label: name, icon: newMealIcon }]);
    setNewMealName("");
    setNewMealIcon(MEAL_ICON_KEYS[0]);
    setCreatingMeal(false);
  }

  function confirmDeleteMeal() {
    setMealTypes(mealTypes.filter((m) => m.id !== pendingDeleteMeal.id));
    setPendingDeleteMeal(null);
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <PageHeader
        title={t.nutrition}
        action={
          <button className="btn btn-ghost p-2.5" onClick={() => setShowGoals(true)} aria-label={t.editGoals}>
            <Pencil size={16} />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-5 scrollbar-hide fade-in">
        <div className="card card-elevated flex flex-col gap-4" style={{ padding: 20 }}>
          <div className="flex items-center justify-center">
            <MacroRing value={totals.kcal} max={kcalGoal || 1} shares={macroShares(totals)}>
              <span
                className="display"
                style={{ fontSize: 30, fontWeight: 900, color: isOver ? "var(--accent-2)" : "var(--text)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}
              >
                {isOver ? "+" : "-"}{Math.abs(Math.round(kcalDiff))}
              </span>
              <span className="text-xs" style={{ color: isOver ? "var(--accent-2)" : "var(--muted)" }}>{t.kcal}</span>
            </MacroRing>
          </div>

          {/* Apenas números, evitando repetir as proporções já mostradas no anel.*/}
          <div className="flex">
            {macros.map((m) => (
              <div key={m.key} className="flex-1 flex flex-col items-center" style={{ minWidth: 0 }}>
                <div className="flex items-center gap-1.5">
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: m.color, flexShrink: 0 }} />
                  <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>{m.short}</span>
                </div>
                <span
                  className="text-sm font-bold"
                  style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums", marginTop: 3 }}
                >
                  {m.val}
                  <span style={{ color: "var(--muted)", fontWeight: 500 }}>/{m.goal}g</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Water ── */}
        <div className="card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{ padding: 10, borderRadius: 12, background: "var(--accent-2-soft)", display: "flex" }}>
              <Droplet size={18} style={{ color: "var(--accent-2)" }} fill="var(--accent-2)" />
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>{t.water}</p>
              <p className="display" style={{ fontSize: 20, fontWeight: 900, color: "var(--text)", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
                {(water / 1000).toFixed(2)}<span style={{ fontSize: 12, color: "var(--muted)" }}> / {((nutritionGoals.waterMl || 2500) / 1000).toFixed(1)} L</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              className="btn btn-ghost"
              style={{ padding: 8 }}
              onClick={() => setWaterToday(today, Math.max(0, water - GLASS_ML))}
              aria-label={`-1 ${t.glasses}`}
            >
              <Minus size={16} />
            </button>
            <span
              className="text-sm font-bold"
              style={{ color: "var(--text)", minWidth: 56, textAlign: "center", fontVariantNumeric: "tabular-nums" }}
            >
              {waterGlasses}/{goalGlasses}
            </span>
            <button
              className="btn btn-primary"
              style={{ padding: 8 }}
              onClick={() => setWaterToday(today, water + GLASS_ML)}
              aria-label={t.addWater}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* ── Meals ── */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between" style={{ marginBottom: 2 }}>
            <p className="section-title" style={{ marginBottom: 0 }}>{t.meals}</p>
            <button
              className="btn-icon"
              onClick={() => { setEditingMeals(!editingMeals); setCreatingMeal(false); }}
              aria-label={editingMeals ? t.done : t.editGoals}
            >
              {editingMeals ? <Check size={14} style={{ color: "var(--accent-2)" }} /> : <Pencil size={14} style={{ color: "var(--muted)" }} />}
            </button>
          </div>

          {mealTypes.map((meal) => {
            const Icon = getMealIcon(meal.icon);
            const label = meal.label || t[meal.id] || meal.id;
            const items = todayLog.filter((e) => e.meal === meal.id);
            const mealKcal = items.reduce((a, e) => a + (e.kcal || 0), 0);
            const canDelete = mealTypes.length > 1;
            
            if (items.length === 0) {
              return (
                <div
                  key={meal.id}
                  className="flex items-center gap-2 w-full"
                  style={{ padding: "10px 14px", borderRadius: 14, background: "var(--surface2)" }}
                >
                  <Icon size={15} style={{ color: "var(--muted)", flexShrink: 0 }} />
                  <button
                    className="text-sm flex-1"
                    style={{ color: "var(--muted)", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    onClick={() => (editingMeals ? null : setAddMeal(meal.id))}
                  >
                    {label}
                  </button>
                  {editingMeals ? (
                    <button
                      className="btn-icon"
                      style={{ opacity: canDelete ? 1 : 0.3 }}
                      disabled={!canDelete}
                      onClick={() => canDelete && setPendingDeleteMeal(meal)}
                      aria-label={t.delete}
                    >
                      <Trash2 size={15} style={{ color: "var(--muted)" }} />
                    </button>
                  ) : (
                    <button
                      className="btn-icon"
                      onClick={() => setAddMeal(meal.id)}
                      aria-label={t.addFood}
                    >
                      <Plus size={16} style={{ color: "var(--accent-2)", flexShrink: 0 }} />
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div key={meal.id} className="card">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Icon size={16} style={{ color: "var(--accent-2)" }} />
                    <p className="font-bold text-sm" style={{ color: "var(--text)" }}>{label}</p>
                    <span className="text-xs" style={{ color: "var(--muted)" }}>· {mealKcal} {t.kcal}</span>
                  </div>
                  {editingMeals ? (
                    <button
                      className="btn-icon"
                      style={{ opacity: canDelete ? 1 : 0.3 }}
                      disabled={!canDelete}
                      onClick={() => canDelete && setPendingDeleteMeal(meal)}
                      aria-label={t.delete}
                    >
                      <Trash2 size={15} style={{ color: "var(--muted)" }} />
                    </button>
                  ) : (
                    <button className="btn-icon" onClick={() => setAddMeal(meal.id)} aria-label={t.addFood}>
                      <Plus size={18} style={{ color: "var(--accent-2)" }} />
                    </button>
                  )}
                </div>
                <div className="flex flex-col">
                  {items.map((e, i) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between gap-2"
                      style={{
                        padding: "8px 0",
                        borderTop: i === 0 ? "none" : "1px solid var(--border)",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <p className="text-sm truncate" style={{ color: "var(--text)" }}>{e.name}</p>
                        <p className="text-xs" style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                          {e.qty}g · {e.kcal} {t.kcal} · {t.proteinShort}{Math.round(e.protein)} {t.carbsShort}{Math.round(e.carbs)} {t.fatShort}{Math.round(e.fat)}
                        </p>
                      </div>
                      <button className="btn-icon" onClick={() => setPendingDelete(e)} aria-label={t.delete}>
                        <Trash2 size={14} style={{ color: "var(--muted)" }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {editingMeals && (
            creatingMeal ? (
              <div className="card flex flex-col gap-3">
                <input
                  className="field"
                  placeholder={t.mealName}
                  value={newMealName}
                  autoFocus
                  onChange={(e) => setNewMealName(e.target.value)}
                />
                <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                  {MEAL_ICON_KEYS.map((key) => {
                    const IconOpt = getMealIcon(key);
                    return (
                      <button
                        key={key}
                        className="btn-icon"
                        style={{
                          background: newMealIcon === key ? "var(--accent-2-soft)" : "var(--surface2)",
                          border: newMealIcon === key ? "1px solid var(--accent-2)" : "1px solid transparent",
                        }}
                        onClick={() => setNewMealIcon(key)}
                      >
                        <IconOpt size={16} style={{ color: newMealIcon === key ? "var(--accent-2)" : "var(--muted)" }} />
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-ghost flex-1" onClick={() => setCreatingMeal(false)}>
                    <X size={15} /> {t.cancel}
                  </button>
                  <button className="btn btn-primary flex-1" onClick={addMealType}>
                    <Check size={15} /> {t.add}
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="btn btn-ghost w-full py-2.5 text-sm"
                style={{ borderStyle: "dashed" }}
                onClick={() => setCreatingMeal(true)}
              >
                <Plus size={15} /> {t.newMeal}
              </button>
            )
          )}
        </section>
      </div>

      {addMeal && <FoodSearchModal meal={addMeal} onClose={() => setAddMeal(null)} />}
      {showGoals && <MacroGoalModal onClose={() => setShowGoals(false)} />}
      {pendingDelete && (
        <ConfirmModal
          title={t.deleteFoodTitle}
          message={t.deleteFoodConfirm.replace("{name}", pendingDelete.name)}
          cancelLabel={t.cancel}
          confirmLabel={t.delete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            deleteFoodLog(pendingDelete.id);
            setPendingDelete(null);
          }}
        />
      )}
      {pendingDeleteMeal && (
        <ConfirmModal
          title={t.deleteMealTitle}
          message={t.deleteMealConfirm.replace("{name}", pendingDeleteMeal.label || t[pendingDeleteMeal.id] || pendingDeleteMeal.id)}
          cancelLabel={t.cancel}
          confirmLabel={t.delete}
          onCancel={() => setPendingDeleteMeal(null)}
          onConfirm={confirmDeleteMeal}
        />
      )}
    </div>
  );
}
