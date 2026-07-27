import { useState } from "react";
import { useApp } from "../context/AppContext";

export default function MacroGoalModal({ onClose }) {
  const { t, nutritionGoals, setNutritionGoals } = useApp();
  const [g, setG] = useState(nutritionGoals);

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

  return (
    <div className="modal-overlay" style={{ alignItems: "center" }} onClick={onClose}>
      <div className="modal-center" onClick={(e) => e.stopPropagation()}>
        <h3 className="display" style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", marginBottom: 16 }}>
          {t.nutritionGoals}
        </h3>

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
