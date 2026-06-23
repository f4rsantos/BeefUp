import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useApp } from "../context/AppContext";
import { uid, todayISO, measurementsForType } from "../lib/planUtils";

const TYPES = ["weight", "height", "chest", "arms", "legs", "belly"];

export default function MeasuresPage({ onBack }) {
  const { t, measurements, addMeasurement } = useApp();
  const [type, setType] = useState("weight");
  const [val, setVal] = useState("");

  const chartData = useMemo(
    () => measurementsForType(measurements, type),
    [measurements, type],
  );
  const history = [...chartData].reverse();

  async function handleSave() {
    const n = parseFloat(val);
    if (isNaN(n) || n <= 0) return;
    await addMeasurement({ id: uid(), date: todayISO(), type, value: n });
    setVal("");
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div className="flex items-center gap-3 px-5 pt-10 pb-6">
        <button className="btn-back" onClick={onBack}>
          <ArrowLeft size={18} style={{ color: "var(--text)" }} />
        </button>
        <span className="font-semibold text-base" style={{ color: "var(--text)" }}>
          {t.measures}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-4 scrollbar-hide">
        <div className="flex gap-2 flex-wrap">
          {TYPES.map((m) => (
            <button
              key={m}
              className={`btn ${type === m ? "btn-primary" : "btn-ghost"} text-xs px-3 py-2`}
              onClick={() => setType(m)}
            >
              {t[`measureType_${m}`]}
            </button>
          ))}
        </div>

        <div className="card flex gap-3 items-center">
          <input
            className="field flex-1"
            type="number"
            placeholder={t.measureValuePlaceholder}
            value={val}
            onChange={(e) => setVal(e.target.value)}
          />
          <button className="btn btn-primary px-5 py-2.5" onClick={handleSave}>
            {t.saveMeasure}
          </button>
        </div>

        <div className="card">
          <p className="section-title mb-3">{t.progression}</p>
          {chartData.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--muted)" }}>
              {t.noMeasures}
            </p>
          ) : (
            <div style={{ width: "100%", height: 180 }}>
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

        {history.length > 0 && (
          <div className="card flex flex-col gap-2">
            {history.map((m, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--muted)" }}>{m.dateLabel}</span>
                <span style={{ color: "var(--text)" }}>{m.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
