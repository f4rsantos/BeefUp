import { useState } from "react";
import { X, Sparkles } from "lucide-react";
import { useApp } from "../context/AppContext";
import { ACTIVITY, OBJECTIVE, calcGoals, activityFromSessions, latestWeight } from "../lib/nutritionCalc";
import NumberField from "./NumberField";

export default function MacroGoalModal({ onClose }) {
  const { t, nutritionGoals, setNutritionGoals, sessions, measurements } = useApp();
  const [tab, setTab] = useState("manual"); // 'manual' | 'calculator'
  const [g, setG] = useState(nutritionGoals);

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
    });
    onClose();
  }

  function applyCalculated() {
    saveGoals(
      calcGoals(
        {
          ...calc,
          age: +calc.age || 28,
          height: +calc.height || 175,
          weight: +calc.weight || 75,
        },
        g.waterMl,
      ),
    );
  }

  const macroKcal =
    (parseInt(g.protein) || 0) * 4 + (parseInt(g.carbs) || 0) * 4 + (parseInt(g.fat) || 0) * 9;
  const kcalTarget = parseInt(g.kcal) || 0;
  const macrosOff = kcalTarget > 0 && Math.abs(macroKcal - kcalTarget) > kcalTarget * 0.05;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-center fade-in" style={{ padding: 26 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <span className="font-semibold" style={{ color: "var(--text)", fontSize: 19 }}>
            {t.nutritionGoals}
          </span>
          <button className="btn btn-ghost p-2" onClick={onClose} aria-label={t.cancel}>
            <X size={18} />
          </button>
        </div>

        <div className="pill-toggle" style={{ marginBottom: 26 }}>
          <button
            className={`pill-option ${tab === "manual" ? "active" : ""}`}
            style={{ fontSize: 14, padding: "10px 0" }}
            onClick={() => setTab("manual")}
          >
            {t.manual}
          </button>
          <button
            className={`pill-option ${tab === "calculator" ? "active" : ""}`}
            style={{ fontSize: 14, padding: "10px 0" }}
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
            <p
              style={{ color: macrosOff ? "var(--warn)" : "var(--muted)", marginTop: -4, fontSize: 13 }}
            >
              {t.macrosFromGoal.replace("{kcal}", macroKcal)}
            </p>
            <Field label={`${t.water} (ml)`} value={g.waterMl} onChange={(v) => setG({ ...g, waterMl: v })} />
            <button className="btn btn-primary w-full mt-3 py-3.5" style={{ fontSize: 15 }} onClick={() => saveGoals(g)}>
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
              <label className="section-title" style={{ fontSize: 13 }}>{t.sex}</label>
              <div className="flex gap-2 mt-2">
                {["male", "female"].map((s) => (
                  <button
                    key={s}
                    className={`chip ${calc.sex === s ? "active" : ""}`}
                    style={{ flex: 1, justifyContent: "center", padding: 11, fontSize: 14 }}
                    onClick={() => setCalc({ ...calc, sex: s })}
                  >
                    {t[s]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="section-title" style={{ fontSize: 13 }}>{t.activity}</label>
                <button
                  className="flex items-center gap-1"
                  style={{ background: "none", border: "none", color: "var(--accent-2)", cursor: "pointer", fontWeight: 600, fontSize: 13 }}
                  onClick={() => setCalc({ ...calc, activity: activityFromSessions(sessions) })}
                >
                  <Sparkles size={13} /> {t.actFromWorkout}
                </button>
              </div>
              <div className="flex gap-2 mt-2" style={{ flexWrap: "wrap" }}>
                {ACTIVITY.map((a) => (
                  <button
                    key={a.id}
                    className={`chip ${calc.activity === a.f ? "active" : ""}`}
                    style={{ fontSize: 13, padding: "7px 13px" }}
                    onClick={() => setCalc({ ...calc, activity: a.f })}
                  >
                    {t[a.id]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="section-title" style={{ fontSize: 13 }}>{t.goal}</label>
              <div className="flex gap-2 mt-2">
                {OBJECTIVE.map((o) => (
                  <button
                    key={o.id}
                    className={`chip ${calc.obj === o.d ? "active" : ""}`}
                    style={{ flex: 1, justifyContent: "center", padding: 11, fontSize: 14 }}
                    onClick={() => setCalc({ ...calc, obj: o.d })}
                  >
                    {t[o.id]}
                  </button>
                ))}
              </div>
            </div>

            <button className="btn btn-primary w-full py-3.5" style={{ fontSize: 15 }} onClick={applyCalculated}>
              {t.calculate}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, allowDecimal }) {
  return (
    <div>
      <label className="section-title" style={{ fontSize: 13 }}>{label}</label>
      <NumberField
        className="field mt-2"
        style={{ fontSize: 16, padding: "13px 14px" }}
        allowDecimal={allowDecimal}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
