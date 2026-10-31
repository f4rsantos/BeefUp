import { useMemo, useState } from "react";
import { Plus, Pencil, Droplet, Trash2, Check, Lock, ChevronDown } from "lucide-react";
import { useApp } from "../context/useApp";
import { todayISO, uid, isPrescribed } from "../lib/planUtils";
import { getLS, removeLS } from "../lib/crypto";
import { macroGoalShares, MICRO_COLORS } from "../lib/nutritionCalc";
import { MICRONUTRIENTS } from "../lib/foodProvider";
import { dailyNutritionTotals, EMPTY_DAY } from "../lib/nutritionStats";
import { getMealIcon, MEAL_ICON_KEYS } from "../lib/mealIcons";
import MacroRing from "../components/MacroRing";
import ConfirmModal from "../components/ConfirmModal";
import FoodSearchModal from "../components/FoodSearchModal";
import MacroGoalModal from "../components/MacroGoalModal";
import Screen from "../components/ui/Screen";
import LargeTitle from "../components/ui/LargeTitle";
import IconButton from "../components/ui/IconButton";
import SectionHeader from "../components/ui/SectionHeader";
import Stepper from "../components/ui/Stepper";
import Meter from "../components/ui/Meter";

const GLASS_ML = 250;

function NutrientMeter({ label, value, goal, unit, color }) {
  return (
    <div className="flex flex-col" style={{ gap: 6, minWidth: 0 }}>
      <div className="flex items-baseline justify-between gap-2" style={{ fontSize: 13 }}>
        <span className="font-semibold truncate" style={{ color: "var(--text)" }}>{label}</span>
        <span style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
          {value}/{goal}{unit}
        </span>
      </div>
      <Meter value={value} max={goal} color={color} />
    </div>
  );
}

function MealCard({ icon: Icon, label, items, editing, canDelete, onAdd, onDeleteMeal, onDeleteItem, t }) {
  const mealKcal = items.reduce((a, e) => a + (e.kcal || 0), 0);
  return (
    <div className="list-group">
      <div className="list-row" style={{ minHeight: 56 }}>
        <span className="list-row-icon" style={{ "--row-icon": "var(--accent-2)" }}>
          <Icon size={17} strokeWidth={2.2} />
        </span>
        <span className="list-row-body">
          <span className="list-row-title" style={{ display: "block", fontWeight: 600 }}>{label}</span>
          <span className="list-row-subtitle" style={{ display: "block" }}>
            {items.length > 0 ? `${mealKcal} ${t.kcal}` : t.addFood}
          </span>
        </span>
        {editing ? (
          <IconButton icon={Trash2} size="sm" variant="danger" label={t.delete} disabled={!canDelete} onClick={onDeleteMeal} />
        ) : (
          <IconButton icon={Plus} size="sm" label={t.addFood} onClick={onAdd} />
        )}
      </div>
      {items.map((e) => (
        <div key={e.id} className="list-row" style={{ "--row-inset": "58px", paddingLeft: 58 }}>
          <span className="list-row-body">
            <span className="list-row-title" style={{ display: "block", fontSize: 15 }}>{e.name}</span>
            <span className="list-row-subtitle" style={{ display: "block", fontVariantNumeric: "tabular-nums" }}>
              {e.qty}g · {t.proteinShort}{Math.round(e.protein)} {t.carbsShort}{Math.round(e.carbs)} {t.fatShort}{Math.round(e.fat)}
            </span>
          </span>
          <span className="list-row-value" style={{ fontSize: 15 }}>{e.kcal}</span>
          <IconButton icon={Trash2} size="sm" variant="plain" label={t.delete} onClick={() => onDeleteItem(e)} />
        </div>
      ))}
    </div>
  );
}

function NewMealForm({ name, icon, onName, onIcon, onCancel, onSubmit, t }) {
  return (
    <div className="card flex flex-col gap-3">
      <input className="field" placeholder={t.mealName} value={name} autoFocus onChange={(e) => onName(e.target.value)} />
      <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
        {MEAL_ICON_KEYS.map((key) => {
          const IconOpt = getMealIcon(key);
          return (
            <IconButton
              key={key}
              icon={IconOpt}
              label={key}
              variant={icon === key ? "filled" : ""}
              onClick={() => onIcon(key)}
            />
          );
        })}
      </div>
      <div className="flex gap-2">
        <button className="btn flex-1" onClick={onCancel}>{t.cancel}</button>
        <button className="btn btn-primary flex-1" onClick={onSubmit}>{t.add}</button>
      </div>
    </div>
  );
}

export default function NutritionPage() {
  const { t, foodLog, deleteFoodLog, effectiveNutritionGoals: nutritionGoals, prescribedGoals, waterMap, setWaterToday, mealTypes, setMealTypes } = useApp();
  const today = todayISO();
  const [foodDraft] = useState(() => getLS("foodEntryDraft", null));
  const [addMeal, setAddMeal] = useState(() => foodDraft?.meal ?? null);
  const [showGoals, setShowGoals] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [editingMeals, setEditingMeals] = useState(false);
  const [creatingMeal, setCreatingMeal] = useState(false);
  const [newMealName, setNewMealName] = useState("");
  const [newMealIcon, setNewMealIcon] = useState(MEAL_ICON_KEYS[0]);
  const [pendingDeleteMeal, setPendingDeleteMeal] = useState(null);
  const [showMicros, setShowMicros] = useState(false);

  const todayLog = useMemo(() => foodLog.filter((e) => e.date === today), [foodLog, today]);

  const totals = useMemo(
    () => dailyNutritionTotals(foodLog).get(today) ?? EMPTY_DAY,
    [foodLog, today],
  );

  const water = waterMap[today] || 0;
  const waterGoalMl = nutritionGoals.waterMl || 2500;
  const waterGlasses = Math.round(water / GLASS_ML);
  const goalGlasses = Math.max(1, Math.round(waterGoalMl / GLASS_ML));

  const kcalGoal = nutritionGoals.kcal || 0;
  const kcal = Math.round(totals.kcal);
  const isOver = totals.kcal > kcalGoal;
  const locked = isPrescribed(prescribedGoals);

  const macros = [
    { key: "protein", label: t.proteinShort, value: Math.round(totals.protein), goal: nutritionGoals.protein, unit: "g", color: "var(--protein)" },
    { key: "carbs", label: t.carbsShort, value: Math.round(totals.carbs), goal: nutritionGoals.carbs, unit: "g", color: "var(--carbs)" },
    { key: "fat", label: t.fatShort, value: Math.round(totals.fat), goal: nutritionGoals.fat, unit: "g", color: "var(--fat)" },
  ];

  const micros = MICRONUTRIENTS.map((m) => ({
    key: m.key,
    label: t[m.key],
    value: Math.round(totals[m.key] ?? 0),
    goal: nutritionGoals[m.key] ?? m.rda,
    unit: m.unit,
    color: MICRO_COLORS[m.key] ?? "var(--muted)",
  }));

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

  const mealLabel = (meal) => meal.label || t[meal.id] || meal.id;

  const modals = (
    <>
      {addMeal && (
        <FoodSearchModal
          meal={addMeal}
          initialDraft={foodDraft?.meal === addMeal ? foodDraft : null}
          onClose={() => {
            removeLS("foodEntryDraft");
            setAddMeal(null);
          }}
        />
      )}
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
          message={t.deleteMealConfirm.replace("{name}", mealLabel(pendingDeleteMeal))}
          cancelLabel={t.cancel}
          confirmLabel={t.delete}
          onCancel={() => setPendingDeleteMeal(null)}
          onConfirm={confirmDeleteMeal}
        />
      )}
    </>
  );

  return (
    <Screen gap={24} after={modals}>
      <LargeTitle
        title={t.nutrition}
        actions={
          <IconButton
            icon={locked ? Lock : Pencil}
            label={locked ? t.prescribedLocked : t.editGoals}
            onClick={() => setShowGoals(true)}
          />
        }
      />

      <section className="card flex flex-col" style={{ gap: 20, padding: 20 }}>
        <div className="flex items-center" style={{ gap: 20 }}>
          <MacroRing
            value={totals.kcal}
            max={kcalGoal || 1}
            shares={macroGoalShares(totals, nutritionGoals)}
            size={132}
            stroke={12}
            track="var(--ring-track)"
          >
            <span className="stat-value" style={{ fontSize: 28, color: isOver ? "var(--danger)" : "var(--text)" }}>
              {kcal}
            </span>
            <span className="card-meta" style={{ marginTop: 2 }}>/ {kcalGoal} {t.kcal}</span>
          </MacroRing>
          <div className="flex flex-col flex-1" style={{ gap: 14, minWidth: 0 }}>
            {macros.map((m) => (
              <NutrientMeter key={m.key} label={m.label} value={m.value} goal={m.goal} unit={m.unit} color={m.color} />
            ))}
          </div>
        </div>

        {showMicros && (
          <div className="grid fade-in" style={{ gridTemplateColumns: "1fr 1fr", gap: "14px 20px" }}>
            {micros.map((m) => (
              <NutrientMeter key={m.key} label={m.label} value={m.value} goal={m.goal} unit={m.unit} color={m.color} />
            ))}
          </div>
        )}

        <button
          className="text-button"
          style={{ alignSelf: "center", marginBlock: -8 }}
          onClick={() => setShowMicros((v) => !v)}
          aria-expanded={showMicros}
        >
          {t.moreDetails}
          <ChevronDown size={16} style={{ transform: showMicros ? "rotate(180deg)" : "none", transition: "transform 0.3s var(--ease-spring)" }} />
        </button>
      </section>

      <section className="card flex items-center" style={{ gap: 14 }}>
        <span className="feature-card-orb" style={{ width: 46, height: 46, "--accent": "var(--fat)" }}>
          <Droplet size={20} fill="currentColor" strokeWidth={0} />
        </span>
        <div className="flex-1" style={{ minWidth: 0 }}>
          <p className="card-meta">{t.water} · {waterGlasses}/{goalGlasses} {t.glasses}</p>
          <p className="stat-value" style={{ fontSize: 22, marginTop: 4 }}>
            {(water / 1000).toFixed(2)}
            <span className="card-meta" style={{ fontSize: 15, fontWeight: 500 }}> / {(waterGoalMl / 1000).toFixed(1)} L</span>
          </p>
        </div>
        <Stepper
          onDecrement={() => setWaterToday(today, Math.max(0, water - GLASS_ML))}
          onIncrement={() => setWaterToday(today, water + GLASS_ML)}
          decrementLabel={`-1 ${t.glasses}`}
          incrementLabel={t.addWater}
          canDecrement={water > 0}
          color="var(--fat)"
        />
      </section>

      <section className="flex flex-col" style={{ gap: 12 }}>
        <SectionHeader
          title={t.meals}
          actions={
            <IconButton
              icon={editingMeals ? Check : Pencil}
              size="sm"
              variant={editingMeals ? "filled" : ""}
              label={editingMeals ? t.done : t.editMealsList}
              onClick={() => { setEditingMeals(!editingMeals); setCreatingMeal(false); }}
            />
          }
        />

        {mealTypes.map((meal) => (
          <MealCard
            key={meal.id}
            icon={getMealIcon(meal.icon)}
            label={mealLabel(meal)}
            items={todayLog.filter((e) => e.meal === meal.id)}
            editing={editingMeals}
            canDelete={mealTypes.length > 1}
            onAdd={() => setAddMeal(meal.id)}
            onDeleteMeal={() => setPendingDeleteMeal(meal)}
            onDeleteItem={setPendingDelete}
            t={t}
          />
        ))}

        {editingMeals && (
          creatingMeal ? (
            <NewMealForm
              name={newMealName}
              icon={newMealIcon}
              onName={setNewMealName}
              onIcon={setNewMealIcon}
              onCancel={() => setCreatingMeal(false)}
              onSubmit={addMealType}
              t={t}
            />
          ) : (
            <button className="btn btn-ghost w-full" style={{ minHeight: 48 }} onClick={() => setCreatingMeal(true)}>
              <Plus size={17} /> {t.newMeal}
            </button>
          )
        )}
      </section>
    </Screen>
  );
}
