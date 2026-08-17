import { useMemo, useState } from "react";
import { ChevronLeft, X } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useApp } from "../context/AppContext";
import { uid, todayISO, measurementsForType } from "../lib/planUtils";
import { MEASURE_GROUPS, getMeasureUnit } from "../lib/measureTypes";
import { CHART_TOOLTIP_STYLE } from "../lib/chartTheme";
import ConfirmModal from "../components/ConfirmModal";

const MAX_VALUE = 1000;

function MeasureTypeCard({ t, type, measurements, onSave, onDelete }) {
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

  const unit = getMeasureUnit(type);

  return (
    <div className="card flex flex-col gap-3">
      <p className="section-title" style={{ margin: 0 }}>{t[`measureType_${type}`]}</p>
      <div className="flex gap-3 items-center">
        <div className="flex-1" style={{ position: "relative" }}>
          <input
            className="field"
            type="number"
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
                <button
                  onClick={() => setPendingDelete(m.id)}
                  aria-label={t.delete}
                  title={t.delete}
                  style={{ color: "var(--muted)", display: "flex" }}
                >
                  <X size={16} />
                </button>
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
  const { t, measurements, addMeasurement, deleteMeasurement } = useApp();
  const [activeGroup, setActiveGroup] = useState("general");

  // Fallback caso activeGroup deixe de corresponder a um grupo (evita crash no .types).
  const group = MEASURE_GROUPS.find((g) => g.key === activeGroup) ?? MEASURE_GROUPS[0];

  async function handleSave(type, value) {
    await addMeasurement({ id: uid(), date: todayISO(), type, value });
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div className="flex items-center gap-1" style={{ padding: "38px 16px 16px" }}>
        <button className="btn-back" onClick={onBack}>
          <ChevronLeft size={24} style={{ color: "var(--text)" }} />
        </button>
        <h1 className="display" style={{ fontSize: 28, fontWeight: 900, color: "var(--text)" }}>
          {t.measures}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-4 scrollbar-hide">
        <div className="flex gap-2 flex-wrap">
          {MEASURE_GROUPS.map((g) => (
            <button
              key={g.key}
              className={`btn ${activeGroup === g.key ? "btn-primary" : "btn-ghost"} text-xs px-3 py-2`}
              onClick={() => setActiveGroup(g.key)}
            >
              {t[`measureGroup_${g.key}`]}
            </button>
          ))}
        </div>

        {group.types.map((m) => (
          <MeasureTypeCard
            key={m}
            t={t}
            type={m}
            measurements={measurements}
            onSave={handleSave}
            onDelete={deleteMeasurement}
          />
        ))}
      </div>
    </div>
  );
}
