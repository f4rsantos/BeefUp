import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useApp } from "../context/AppContext";
import { uid, todayISO, measurementsForType } from "../lib/planUtils";
import { MEASURE_GROUPS } from "../lib/measureTypes";

function MeasureTypeCard({ type, label, placeholder, saveLabel, noDataLabel, measurements, onSave }) {
  const [val, setVal] = useState("");
  const chartData = measurementsForType(measurements, type);

  function handleSave() {
    const n = parseFloat(val);
    if (isNaN(n) || n <= 0) return;
    onSave(type, n);
    setVal("");
  }

  return (
    <div className="card flex flex-col gap-3">
      <p className="section-title" style={{ margin: 0 }}>{label}</p>
      <div className="flex gap-3 items-center">
        <input
          className="field flex-1"
          type="number"
          placeholder={placeholder}
          value={val}
          onChange={(e) => setVal(e.target.value)}
        />
        <button className="btn btn-primary px-5 py-2.5" onClick={handleSave}>
          {saveLabel}
        </button>
      </div>

      {chartData.length === 0 ? (
        <p className="text-sm text-center py-4" style={{ color: "var(--muted)" }}>
          {noDataLabel}
        </p>
      ) : (
        <div style={{ width: "100%", height: 140 }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: "var(--muted)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} width={32} />
              <Tooltip />
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
    </div>
  );
}

export default function MeasuresPage({ onBack }) {
  const { t, measurements, addMeasurement } = useApp();
  const [activeGroup, setActiveGroup] = useState("general");

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

        {MEASURE_GROUPS.find((g) => g.key === activeGroup).types.map((m) => (
          <MeasureTypeCard
            key={m}
            type={m}
            label={t[`measureType_${m}`]}
            placeholder={t.measureValuePlaceholder}
            saveLabel={t.saveMeasure}
            noDataLabel={t.noMeasures}
            measurements={measurements}
            onSave={handleSave}
          />
        ))}
      </div>
    </div>
  );
}
