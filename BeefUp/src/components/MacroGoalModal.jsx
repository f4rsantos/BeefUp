import { useState } from "react";
import { useApp } from "../context/AppContext";

const ACTIVITY = [
  { id: "actSedentary", f: 1.2 },
  { id: "actLight", f: 1.375 },
  { id: "actModerate", f: 1.55 },
  { id: "actActive", f: 1.725 },
  { id: "actVeryActive", f: 1.9 },
];
const OBJECTIVE = [
  { id: "objCut", d: -0.18 },
  { id: "objMaintain", d: 0 },
  { id: "objBulk", d: 0.12 },
];

function latestWeight(measurements) {
  const w = measurements
    .filter((m) => m.type === "weight")
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return w ? w.value : "";
}

export default function MacroGoalModal({ onClose }) {
  const { t, nutritionGoals, setNutritionGoals, measurements } = useApp();
  const [mode, setMode] = useState("manual");

  // manual
  const [g, setG] = useState(nutritionGoals);

  // calculator
  const [c, setC] = useState({
    sex: "male",
    age: 28,
    height: 175,
    weight: latestWeight(measurements) || 75,
    activity: 1.55,
    obj: 0,
  });

  function saveManual() {
    setNutritionGoals({
      kcal: parseInt(g.kcal) || 0,
      protein: parseInt(g.protein) || 0,
      carbs: parseInt(g.carbs) || 0,
      fat: parseInt(g.fat) || 0,
      waterMl: parseInt(g.waterMl) || 2500,
    });
    onClose();
  }

  function calcAndSave() {
    // Mifflin-St Jeor BMR
    const bmr =
      10 * c.weight + 6.25 * c.height - 5 * c.age + (c.sex === "male" ? 5 : -161);
    const tdee = bmr * c.activity;
    const kcal = Math.round(tdee * (1 + c.obj));
    // macro split: protein 2g/kg, fat 25% kcal, rest carbs
    const protein = Math.round(c.weight * 2);
    const fat = Math.round((kcal * 0.25) / 9);
    const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
    setNutritionGoals({ kcal, protein, carbs, fat, waterMl: g.waterMl || 2500 });
    onClose();
  }

  return (
    <div className="modal-overlay" style={{ alignItems: "center" }} onClick={onClose}>
      <div className="modal-center" onClick={(e) => e.stopPropagation()}>
        <h3 className="display" style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", marginBottom: 16 }}>
          {t.nutritionGoals}
        </h3>

        <div className="flex gap-2 mb-4">
          {[["manual", t.manual], ["calc", t.calculator]].map(([id, label]) => (
            <button
              key={id}
              className={`chip ${mode === id ? "active" : ""}`}
              style={{ flex: 1, justifyContent: "center", padding: "9px" }}
              onClick={() => setMode(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "manual" ? (
          <div className="fade-in flex flex-col gap-3">
            <Field label={`${t.calories} (${t.kcal})`} value={g.kcal} onChange={(v) => setG({ ...g, kcal: v })} />
            <div className="grid grid-cols-3 gap-2">
              <Field label={`${t.protein} (g)`} value={g.protein} onChange={(v) => setG({ ...g, protein: v })} />
              <Field label={`${t.carbs} (g)`} value={g.carbs} onChange={(v) => setG({ ...g, carbs: v })} />
              <Field label={`${t.fat} (g)`} value={g.fat} onChange={(v) => setG({ ...g, fat: v })} />
            </div>
            <Field label={`${t.water} (ml)`} value={g.waterMl} onChange={(v) => setG({ ...g, waterMl: v })} />
            <button className="btn btn-primary w-full mt-1" onClick={saveManual}>{t.save}</button>
          </div>
        ) : (
          <div className="fade-in flex flex-col gap-3">
            <div className="flex gap-2">
              {[["male", t.male], ["female", t.female]].map(([id, label]) => (
                <button key={id} className={`chip ${c.sex === id ? "active" : ""}`} style={{ flex: 1, justifyContent: "center", padding: 9 }} onClick={() => setC({ ...c, sex: id })}>
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label={t.age} value={c.age} onChange={(v) => setC({ ...c, age: +v })} />
              <Field label={t.height} value={c.height} onChange={(v) => setC({ ...c, height: +v })} />
              <Field label={t.bodyWeight} value={c.weight} onChange={(v) => setC({ ...c, weight: +v })} />
            </div>
            <div>
              <label className="section-title">{t.activity}</label>
              <select className="field mt-1" value={c.activity} onChange={(e) => setC({ ...c, activity: +e.target.value })}>
                {ACTIVITY.map((a) => <option key={a.id} value={a.f}>{t[a.id]}</option>)}
              </select>
            </div>
            <div>
              <label className="section-title">{t.objective}</label>
              <div className="flex gap-2 mt-1">
                {OBJECTIVE.map((o) => (
                  <button key={o.id} className={`chip ${c.obj === o.d ? "active" : ""}`} style={{ flex: 1, justifyContent: "center", padding: 9 }} onClick={() => setC({ ...c, obj: o.d })}>
                    {t[o.id]}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn btn-primary w-full mt-1" onClick={calcAndSave}>{t.calculate}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="section-title">{label}</label>
      <input className="field mt-1" type="number" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
