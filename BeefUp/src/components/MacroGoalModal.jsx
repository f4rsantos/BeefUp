import { useState } from "react";
import { useEscapeKey } from "../lib/useEscapeKey";
import { X, Sparkles, Lock, ChevronDown } from "lucide-react";
import { useApp } from "../context/useApp";
import { ACTIVITY, OBJECTIVE, calcGoals, activityFromSessions, latestWeight, pickMicronutrientGoals } from "../lib/nutritionCalc";
import { MICRONUTRIENTS, MICRONUTRIENT_KEYS } from "../lib/foodProvider";
import { isPrescribed } from "../lib/planUtils";
import NumberField from "./NumberField";
import "./MacroGoalModal.css";

export default function MacroGoalModal({ onClose }) {
  useEscapeKey(onClose);
  const { t, nutritionGoals, setNutritionGoals, prescribedGoals, sessions, measurements } = useApp();
  const locked = isPrescribed(prescribedGoals);
  const [tab, setTab] = useState("manual"); // 'manual' | 'calculator'
  const [g, setG] = useState(locked ? prescribedGoals : nutritionGoals);
  const [showMicros, setShowMicros] = useState(false);
  const definedMicros = MICRONUTRIENTS.filter((m) => g[m.key] != null);

  // Seeded from what the app already knows about you: weight from Measures, activity from the sessions you actually logged this week.
  const [calc, setCalc] = useState(() => ({
    sex: "male",
    age: 28,
    height: 175,
    weight: latestWeight(measurements) || 75,
    activity: activityFromSessions(sessions),
    obj: 0,
  }));

  function saveGoals(next) {
    setNutritionGoals({
      kcal: parseInt(next.kcal) || 0,
      protein: parseInt(next.protein) || 0,
      carbs: parseInt(next.carbs) || 0,
      fat: parseInt(next.fat) || 0,
      waterMl: parseInt(next.waterMl) || 2500,
      ...pickMicronutrientGoals(next, MICRONUTRIENT_KEYS),
    });
    onClose();
  }

  function applyCalculated() {
    saveGoals({
      ...pickMicronutrientGoals(g, MICRONUTRIENT_KEYS),
      ...calcGoals(
        {
          ...calc,
          age: +calc.age || 28,
          height: +calc.height || 175,
          weight: +calc.weight || 75,
        },
        g.waterMl,
      ),
    });
  }

  const macroKcal =
    (parseInt(g.protein) || 0) * 4 + (parseInt(g.carbs) || 0) * 4 + (parseInt(g.fat) || 0) * 9;
  const kcalTarget = parseInt(g.kcal) || 0;
  const macrosOff = kcalTarget > 0 && Math.abs(macroKcal - kcalTarget) > kcalTarget * 0.05;

  return (
    <div role="dialog" aria-modal="true" className="modal-overlay" onClick={onClose}>
      <div className="modal-center fade-in mg-modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-body mg-title">
            {t.nutritionGoals}
          </span>
          <button className="btn btn-ghost p-2" onClick={onClose} aria-label={t.cancel}>
            <X size={18} />
          </button>
        </div>

        {locked && (
          <p className="text-xs flex items-center gap-1.5 text-muted mg-locked">
            <Lock size={13} /> {t.prescribedLocked}
          </p>
        )}

        {locked ? (
          <div className="flex flex-col gap-4">
            <ReadOnlyField label={`${t.calories} (${t.kcal})`} value={g.kcal} />
            <div className="grid grid-cols-3 gap-3">
              <ReadOnlyField label={`${t.protein} (g)`} value={g.protein} />
              <ReadOnlyField label={`${t.carbs} (g)`} value={g.carbs} />
              <ReadOnlyField label={`${t.fat} (g)`} value={g.fat} />
            </div>
            <ReadOnlyField label={`${t.water} (ml)`} value={g.waterMl} />
            {definedMicros.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {definedMicros.map(({ key, unit }) => (
                  <ReadOnlyField key={key} label={`${t[key]} (${unit})`} value={g[key]} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
        <div className="pill-toggle mg-tabs">
          <button
            className={`pill-option mg-tab ${tab === "manual" ? "active" : ""}`}
            onClick={() => setTab("manual")}
          >
            {t.manual}
          </button>
          <button
            className={`pill-option mg-tab ${tab === "calculator" ? "active" : ""}`}
            onClick={() => setTab("calculator")}
          >
            {t.calculator}
          </button>
        </div>

        {tab === "manual" ? (
          <div className="flex flex-col gap-4">
            <Field label={`${t.calories} (${t.kcal})`} value={g.kcal} onChange={(v) => setG({ ...g, kcal: v })} />
            <div className="grid grid-cols-3 gap-3">
              <Field label={`${t.protein} (g)`} value={g.protein} onChange={(v) => setG({ ...g, protein: v })} />
              <Field label={`${t.carbs} (g)`} value={g.carbs} onChange={(v) => setG({ ...g, carbs: v })} />
              <Field label={`${t.fat} (g)`} value={g.fat} onChange={(v) => setG({ ...g, fat: v })} />
            </div>
            <p className="mg-hint" style={{ color: macrosOff ? "var(--warn)" : "var(--muted)" }}>
              {t.macrosFromGoal.replace("{kcal}", macroKcal)}
            </p>
            <Field label={`${t.water} (ml)`} value={g.waterMl} onChange={(v) => setG({ ...g, waterMl: v })} />

            <button
              className="flex items-center justify-center gap-1 w-full text-muted mg-more"
              onClick={() => setShowMicros((v) => !v)}
            >
              {t.moreDetails}
              <ChevronDown size={15} style={{ transform: showMicros ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
            </button>

            {showMicros && (
              <div className="grid grid-cols-2 gap-4 fade-in">
                {MICRONUTRIENTS.map(({ key, unit }) => (
                  <Field key={key} label={`${t[key]} (${unit})`} value={g[key] ?? ""} onChange={(v) => setG({ ...g, [key]: v })} />
                ))}
              </div>
            )}

            <button className="btn btn-primary w-full mt-1 py-3.5 mg-btn-text" onClick={() => saveGoals(g)}>
              {t.save}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-3 gap-3">
              <Field label={t.age} allowDecimal={false} value={calc.age} onChange={(v) => setCalc({ ...calc, age: v })} />
              <Field label={t.height} value={calc.height} onChange={(v) => setCalc({ ...calc, height: v })} />
              <Field label={t.bodyWeight} value={calc.weight} onChange={(v) => setCalc({ ...calc, weight: v })} />
            </div>

            <div>
              <label className="section-title mg-label">{t.sex}</label>
              <div className="flex gap-2 mt-2">
                {["male", "female"].map((s) => (
                  <button
                    key={s}
                    className={`chip mg-choice ${calc.sex === s ? "active" : ""}`}
                    onClick={() => setCalc({ ...calc, sex: s })}
                  >
                    {t[s]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="section-title mg-label">{t.activity}</label>
                <button
                  className="flex items-center gap-1 mg-from-workout"
                  onClick={() => setCalc({ ...calc, activity: activityFromSessions(sessions) })}
                >
                  <Sparkles size={13} /> {t.actFromWorkout}
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {ACTIVITY.map((a) => (
                  <button
                    key={a.id}
                    className={`chip mg-activity ${calc.activity === a.f ? "active" : ""}`}
                    onClick={() => setCalc({ ...calc, activity: a.f })}
                  >
                    {t[a.id]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="section-title mg-label">{t.goal}</label>
              <div className="flex gap-2 mt-2">
                {OBJECTIVE.map((o) => (
                  <button
                    key={o.id}
                    className={`chip mg-choice ${calc.obj === o.d ? "active" : ""}`}
                    onClick={() => setCalc({ ...calc, obj: o.d })}
                  >
                    {t[o.id]}
                  </button>
                ))}
              </div>
            </div>

            <button className="btn btn-primary w-full py-3.5 mg-btn-text" onClick={applyCalculated}>
              {t.calculate}
            </button>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <label className="section-title mg-label">{label}</label>
      <p className="field mt-2 text-body mg-ro">
        {value}
      </p>
    </div>
  );
}

function Field({ label, value, onChange, allowDecimal }) {
  return (
    <div>
      <label className="section-title mg-label">{label}</label>
      <NumberField
        className="field mt-2 mg-input"
        allowDecimal={allowDecimal}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
