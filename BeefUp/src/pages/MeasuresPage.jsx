import { useMemo, useState } from "react";
import { Plus, X, Lock, Check } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { useApp } from "../context/useApp";
import { uid, todayISO, measurementsForType, measureGoalProgress, isPrescribed } from "../lib/planUtils";
import { MEASURE_GROUPS, allMeasureGroups, measureGroupLabel, measureTypeLabel, getMeasureUnit } from "../lib/measureTypes";
import { CHART_TOOLTIP_STYLE } from "../lib/chartTheme";
import ConfirmModal from "../components/ConfirmModal";
import AddMeasureTypeModal from "../components/AddMeasureTypeModal";
import NumberField from "../components/NumberField";
import NavHeader from "../components/ui/NavHeader";
import IconButton from "../components/ui/IconButton";
import "./MeasuresPage.css";

const MAX_VALUE = 1000;

function MeasureTypeCard({ t, type, customTypes, measurements, goal, onSave, onDelete }) {
  const [val, setVal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const chartData = useMemo(
    () => measurementsForType(measurements, type),
    [measurements, type],
  );
  const history = useMemo(() => [...chartData].reverse(), [chartData]);
  // Trainer-only: the coach sets this, so it's read-only here — a lock, not
  // a field, same convention as a prescribed history row below.
  const progress = goal ? measureGoalProgress(measurements, type, goal.target) : null;

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
      <p className="section-title ms-title">{measureTypeLabel(type, customTypes, t)}</p>

      {goal && (
        <div className="flex flex-col ms-goal">
          <div className="flex items-center justify-between ms-goal-head">
            <span className="flex items-center gap-1 text-muted">
              <Lock size={11} /> {t.goal}
            </span>
            {!progress.hasData ? (
              <span className="text-muted">{progress.target} {unit}</span>
            ) : progress.reached ? (
              <span className="flex items-center gap-1 font-semibold ms-goal-reached">
                <Check size={12} /> {t.dashMeasureGoalReached}
              </span>
            ) : (
              <span className="tabular text-body">{progress.current} / {progress.target} {unit}</span>
            )}
          </div>
          {progress.hasData && !progress.reached && (
            <div className="ms-goal-track">
              <div className="ms-goal-bar" style={{ width: `${progress.percent}%` }} />
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 items-center">
        <div className="flex-1 ms-input-box">
          <NumberField
            className={`field ms-input${error ? " invalid" : ""}`}
            placeholder={t.measureValuePlaceholder}
            value={val}
            onChange={(e) => { setVal(e.target.value); setError(null); }}
          />
          <span className="text-muted ms-unit">
            {unit}
          </span>
        </div>
        <button className="btn btn-primary px-5 py-2.5" onClick={handleSave} disabled={saving}>
          {t.saveMeasure}
        </button>
      </div>

      {error && (
        <p className="text-xs text-danger ms-error">
          {error}
        </p>
      )}

      {chartData.length === 0 ? (
        <p className="text-sm text-center py-4 text-muted">
          {t.noMeasures}
        </p>
      ) : (
        <div className="ms-chart">
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: "var(--muted)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} width={32} />
              <Tooltip {...CHART_TOOLTIP_STYLE} />
              {goal && (
                <ReferenceLine
                  y={goal.target}
                  stroke="var(--muted)"
                  strokeDasharray="4 4"
                  label={{ value: t.goal, position: "insideTopRight", fill: "var(--muted)", fontSize: 10 }}
                />
              )}
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
        <div className="flex flex-col ms-history">
          {history.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between text-sm ms-history-row"
            >
              <span className="text-muted">{m.dateLabel}</span>
              <div className="flex items-center gap-3">
                <span className="text-body">{m.value} {unit}</span>
                {isPrescribed(m) ? (
                  <Lock className="text-muted" size={14} aria-label={t.prescribedLocked} />
                ) : (
                  <button className="text-muted ms-delete"
                    onClick={() => setPendingDelete(m.id)}
                    aria-label={t.delete}
                    title={t.delete}
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
  const { t, measurements, measureTypes, measureGoals, addMeasurement, deleteMeasurement } = useApp();
  const [activeGroup, setActiveGroup] = useState("general");
  const [showAddType, setShowAddType] = useState(false);

  const groups = allMeasureGroups(measureTypes);
  // Fallback caso activeGroup deixe de corresponder a um grupo (evita crash no .types).
  const group = groups.find((g) => g.key === activeGroup) ?? groups[0] ?? MEASURE_GROUPS[0];

  async function handleSave(type, value) {
    await addMeasurement({ id: uid(), date: todayISO(), type, value });
  }

  return (
    <div className="flex flex-col h-full canvas-bg">
      <div
        className="flex-1 overflow-y-auto pb-6 flex flex-col gap-4 scrollbar-hide page-pad"
      >
        <NavHeader
          title={t.measures}
          onBack={onBack}
          backLabel={t.back}
          actions={<IconButton icon={Plus} label={t.measureAddTypeAria} onClick={() => setShowAddType(true)} />}
        />
        <div className="flex gap-2 flex-wrap">
          {groups.map((g) => (
            <button
              key={g.key}
              className={`chip ${activeGroup === g.key ? "active" : ""}`}
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
            goal={measureGoals.find((g) => g.id === m) || null}
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
