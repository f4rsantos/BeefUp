import { useState } from "react";
import { Plus, Pencil, Trash2, ChevronDown } from "lucide-react";
import ConfirmModal from "../components/ConfirmModal";
import NumberField from "../components/NumberField";
import { prescribeRow, unprescribeRow } from "../lib/trainerData";
import { STORES } from "../lib/stores";
import { MICRONUTRIENTS, MICRONUTRIENT_KEYS } from "../lib/foodProvider";
import { pickMicronutrientGoals } from "../lib/nutritionCalc";

const DEFAULTS = { kcal: 2200, protein: 150, carbs: 220, fat: 70, waterMl: 2500 };

// The one nutrition-goals row this trainer prescribes for a linked client,
// mirroring LinkedPlan (LinkedClientGym.jsx) -- a single object per client,
// not a list. Manual entry only, no BMR/TDEE calculator (that needs the
// client's own age/height/activity, which this screen doesn't have).
export default function LinkedNutritionGoals({ client, goals: initialGoals, t }) {
  const [goals, setGoals] = useState(initialGoals);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pendingUnprescribe, setPendingUnprescribe] = useState(false);

  async function persist(next) {
    setBusy(true);
    setError("");
    try {
      const saved = await prescribeRow(client.linkedUserId, STORES.nutritionGoals, {
        id: "default",
        kcal: parseInt(next.kcal) || 0,
        protein: parseInt(next.protein) || 0,
        carbs: parseInt(next.carbs) || 0,
        fat: parseInt(next.fat) || 0,
        waterMl: parseInt(next.waterMl) || 2500,
        ...pickMicronutrientGoals(next, MICRONUTRIENT_KEYS),
      });
      setGoals(saved);
      setEditing(false);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError("");
    try {
      await unprescribeRow(client.linkedUserId, STORES.nutritionGoals, "default");
      setGoals(null);
      setPendingUnprescribe(false);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="dash-panel">
      <div className="flex items-center justify-between mb-3">
        <h3 className="dash-card-title">{t.nutritionGoals}</h3>
        {goals && !editing && (
          <div className="flex items-center gap-2">
            <button className="btn-icon" onClick={() => setEditing(true)} aria-label={t.edit} disabled={busy}>
              <Pencil size={15} style={{ color: "var(--muted)" }} />
            </button>
            <button className="btn-icon" onClick={() => setPendingUnprescribe(true)} aria-label={t.delete} disabled={busy}>
              <Trash2 size={15} style={{ color: "var(--muted)" }} />
            </button>
          </div>
        )}
      </div>
      <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>{t.dashPrescribeGoalsDesc}</p>
      {error && <p className="text-sm mb-3" style={{ color: "var(--danger)" }}>{error}</p>}

      {!goals && !editing && (
        <>
          <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>{t.dashNoGoals}</p>
          <button className="btn btn-ghost w-full py-3" style={{ borderStyle: "dashed" }} onClick={() => setEditing(true)} disabled={busy}>
            <Plus size={15} /> {t.dashPrescribeGoals}
          </button>
        </>
      )}

      {editing && (
        <GoalsForm
          initial={goals || DEFAULTS}
          onSave={persist}
          onCancel={() => setEditing(false)}
          busy={busy}
          t={t}
        />
      )}

      {goals && !editing && <GoalsSummary goals={goals} t={t} />}

      {pendingUnprescribe && (
        <ConfirmModal
          title={t.dashUnprescribeGoalsTitle}
          message={t.dashUnprescribeGoalsMessage}
          confirmLabel={t.delete}
          cancelLabel={t.cancel}
          onConfirm={remove}
          onCancel={() => setPendingUnprescribe(false)}
        />
      )}
    </section>
  );
}

function GoalsForm({ initial, onSave, onCancel, busy, t }) {
  const [g, setG] = useState(initial);
  const [showMicros, setShowMicros] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <NumField label={`${t.calories} (${t.kcal})`} value={g.kcal} onChange={(v) => setG({ ...g, kcal: v })} />
      <div className="grid grid-cols-3 gap-3">
        <NumField label={`${t.protein} (g)`} value={g.protein} onChange={(v) => setG({ ...g, protein: v })} />
        <NumField label={`${t.carbs} (g)`} value={g.carbs} onChange={(v) => setG({ ...g, carbs: v })} />
        <NumField label={`${t.fat} (g)`} value={g.fat} onChange={(v) => setG({ ...g, fat: v })} />
      </div>
      <NumField label={`${t.water} (ml)`} value={g.waterMl} onChange={(v) => setG({ ...g, waterMl: v })} />

      <button
        className="flex items-center justify-center gap-1 w-full"
        style={{ color: "var(--muted)", fontSize: 13, fontWeight: 600 }}
        onClick={() => setShowMicros((v) => !v)}
      >
        {t.moreDetails}
        <ChevronDown size={15} style={{ transform: showMicros ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {showMicros && (
        <div className="grid grid-cols-2 gap-4 fade-in">
          {MICRONUTRIENTS.map(({ key, unit }) => (
            <NumField key={key} label={`${t[key]} (${unit})`} value={g[key] ?? ""} onChange={(v) => setG({ ...g, [key]: v })} />
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button className="btn btn-ghost flex-1" onClick={onCancel} disabled={busy}>{t.cancel}</button>
        <button className="btn btn-primary flex-1" onClick={() => onSave(g)} disabled={busy}>{t.save}</button>
      </div>
    </div>
  );
}

function GoalsSummary({ goals, t }) {
  const definedMicros = MICRONUTRIENTS.filter((m) => goals[m.key] != null);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
        <span style={{ color: "var(--muted)" }}>{t.calories}</span>
        <span style={{ color: "var(--text)", fontWeight: 700 }}>{goals.kcal} {t.kcal}</span>
      </div>
      <div className="flex items-center justify-between text-sm" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
        <span style={{ color: "var(--muted)" }}>{t.protein}/{t.carbs}/{t.fat}</span>
        <span style={{ color: "var(--text)", fontWeight: 700 }}>{goals.protein}g / {goals.carbs}g / {goals.fat}g</span>
      </div>
      <div className="flex items-center justify-between text-sm" style={{ padding: "8px 0", borderBottom: definedMicros.length > 0 ? "1px solid var(--border)" : "none" }}>
        <span style={{ color: "var(--muted)" }}>{t.water}</span>
        <span style={{ color: "var(--text)", fontWeight: 700 }}>{goals.waterMl} ml</span>
      </div>
      {definedMicros.map((m) => (
        <div key={m.key} className="flex items-center justify-between text-sm" style={{ padding: "8px 0" }}>
          <span style={{ color: "var(--muted)" }}>{t[m.key]}</span>
          <span style={{ color: "var(--text)", fontWeight: 700 }}>{goals[m.key]} {m.unit}</span>
        </div>
      ))}
    </div>
  );
}

function NumField({ label, value, onChange }) {
  return (
    <div>
      <label className="section-title" style={{ fontSize: 13 }}>{label}</label>
      <NumberField
        className="field mt-2"
        allowDecimal={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
