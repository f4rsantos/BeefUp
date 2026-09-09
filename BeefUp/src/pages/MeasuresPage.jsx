import { useMemo, useState } from "react";
import { ChevronLeft, Plus, X, Lock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useApp } from "../context/AppContext";
import { uid, todayISO, measurementsForType, isPrescribed } from "../lib/planUtils";
import { MEASURE_GROUPS, allMeasureGroups, measureGroupLabel, measureTypeLabel, getMeasureUnit } from "../lib/measureTypes";
import { CHART_TOOLTIP_STYLE } from "../lib/chartTheme";
import ConfirmModal from "../components/ConfirmModal";
import AddMeasureTypeModal from "../components/AddMeasureTypeModal";
import NumberField from "../components/NumberField";

const MAX_VALUE = 1000;

function MeasureTypeCard({ t, type, customTypes, measurements, onSave, onDelete }) {
  const [val, setVal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const chartData = useMemo(
    () => measurementsForType(measurements, type),
    [measurements, type],
  );
  const history = useMemo(() => [...chartData].reverse(), [chartData]);

  async function handleSave() {
    const n = parseFloat(val);
    if (!Number.isFinite(n) || n <= 0 || n > MAX_VALUE) {
      setError(t.measureInvalidValue);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave(type, n);
      setVal("");
    } catch {
      setError(t.measureSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  const unit = getMeasureUnit(type, customTypes);

  return (
    <div className="card flex flex-col gap-3">
      <p className="section-title" style={{ margin: 0 }}>{measureTypeLabel(type, customTypes, t)}</p>
      <div className="flex gap-3 items-center">
        <div className="flex-1" style={{ position: "relative" }}>
          <NumberField
            className="field"
            placeholder={t.measureValuePlaceholder}
            value={val}
            onChange={(e) => { setVal(e.target.value); setError(null); }}
            style={{ width: "100%", paddingRight: 36, ...(error ? { borderColor: "var(--danger)" } : null) }}
          />
          <span
            style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              fontSize: 13, color: "var(--muted)", pointerEvents: "none",
            }}
          >
            {unit}
          </span>
        </div>
        <button className="btn btn-primary px-5 py-2.5" onClick={handleSave} disabled={saving}>
          {t.saveMeasure}
        </button>
      </div>

      {error && (
        <p className="text-xs" style={{ color: "var(--danger)", margin: 0 }}>
          {error}
        </p>
      )}

      {chartData.length === 0 ? (
        <p className="text-sm text-center py-4" style={{ color: "var(--muted)" }}>
          {t.noMeasures}
        </p>
      ) : (
        <div style={{ width: "100%", height: 140 }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: "var(--muted)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} width={32} />
              <Tooltip {...CHART_TOOLTIP_STYLE} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--accent)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {history.length > 0 && (
        <div className="flex flex-col" style={{ borderTop: "1px solid var(--border)" }}>
          {history.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between text-sm"
              style={{ padding: "8px 0" }}
            >
              <span style={{ color: "var(--muted)" }}>{m.dateLabel}</span>
              <div className="flex items-center gap-3">
                <span style={{ color: "var(--text)" }}>{m.value} {unit}</span>
                {isPrescribed(m) ? (
                  <Lock size={14} style={{ color: "var(--muted)" }} aria-label={t.prescribedLocked} />
                ) : (
                  <button
                    onClick={() => setPendingDelete(m.id)}
                    aria-label={t.delete}
                    title={t.delete}
                    style={{ color: "var(--muted)", display: "flex" }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingDelete && (
        <ConfirmModal
          title={t.deleteMeasureTitle}
          message={t.cannotUndo}
          cancelLabel={t.cancel}
          confirmLabel={t.delete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            onDelete(pendingDelete);
            setPendingDelete(null);
          }}
        />
      )}
    </div>
  );
}

export default function MeasuresPage({ onBack }) {
  const { t, measurements, measureTypes, addMeasurement, deleteMeasurement } = useApp();
  const [activeGroup, setActiveGroup] = useState("general");
  const [showAddType, setShowAddType] = useState(false);

  const groups = allMeasureGroups(measureTypes);
  // Fallback caso activeGroup deixe de corresponder a um grupo (evita crash no .types).
  const group = groups.find((g) => g.key === activeGroup) ?? groups[0] ?? MEASURE_GROUPS[0];

  async function handleSave(type, value) {
    await addMeasurement({ id: uid(), date: todayISO(), type, value });
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div
        className="flex-1 overflow-y-auto pb-6 flex flex-col gap-4 scrollbar-hide"
        style={{ paddingTop: "var(--page-py-top)", paddingLeft: "var(--page-px)", paddingRight: "var(--page-px)" }}
      >
        <div className="flex items-center gap-1">
          <button className="btn-back" onClick={onBack}>
            <ChevronLeft size={24} style={{ color: "var(--text)" }} />
          </button>
          <h1 className="display flex-1" style={{ fontSize: 28, fontWeight: 900, color: "var(--text)" }}>
            {t.measures}
          </h1>
          <button className="btn btn-ghost p-2" onClick={() => setShowAddType(true)} aria-label={t.measureAddTypeAria}>
            <Plus size={22} style={{ color: "var(--text)" }} />
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {groups.map((g) => (
            <button
              key={g.key}
              className={`btn ${activeGroup === g.key ? "btn-primary" : "btn-ghost"} text-xs px-3 py-2`}
              onClick={() => setActiveGroup(g.key)}
            >
              {measureGroupLabel(g.key, t)}
            </button>
          ))}
        </div>

        {group.types.map((m) => (
          <MeasureTypeCard
            key={m}
            t={t}
            type={m}
            customTypes={measureTypes}
            measurements={measurements}
            onSave={handleSave}
            onDelete={deleteMeasurement}
          />
        ))}
      </div>

      {showAddType && (
        <AddMeasureTypeModal initialGroupKey={activeGroup} onClose={() => setShowAddType(false)} />
      )}
    </div>
  );
}
