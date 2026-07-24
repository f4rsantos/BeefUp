import { useMemo, useState } from "react";
import { Footprints, Flame, Plus, Ruler, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useApp } from "../context/AppContext";
import { computeStreak, getMonthActivity, aggregateSessionsByWeek, todayISO, toLocalISO } from "../lib/planUtils";
import StepsModal from "../components/StepsModal";

function dayOffsetISO(daysBack) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysBack);
  return toLocalISO(date);
}

export default function ProfilePage({ onOpenStatistics, onOpenMeasures, onViewHistory }) {
  const { t, lang, plans, activePlanId, sessions, stepsMap } = useApp();

  const [showSteps, setShowSteps] = useState(false);
  const [metric, setMetric] = useState("volume");

  const today = todayISO();
  const streak = useMemo(
    () => computeStreak(sessions, plans, activePlanId),
    [sessions, plans, activePlanId],
  );
  const now = new Date();
  const monthActivity = useMemo(
    () =>
      getMonthActivity(now.getFullYear(), now.getMonth(), sessions, plans, activePlanId),
    [sessions, plans, activePlanId],
  );
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const todaySteps = stepsMap[today] ?? null;
  const weekSteps = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const iso = dayOffsetISO(6 - index);
        return { iso, value: stepsMap[iso] ?? 0, isToday: iso === today };
      }),
    [stepsMap, today],
  );
  const maxWeekSteps = Math.max(1, ...weekSteps.map((entry) => entry.value));

  const chartData = useMemo(
    () => aggregateSessionsByWeek(sessions, metric),
    [sessions, metric],
  );

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div style={{ padding: "38px 20px 16px" }}>
        <h1 className="display" style={{ fontSize: 30, fontWeight: 900, color: "var(--text)" }}>
          {t.profileTitle}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-4 scrollbar-hide fade-in">
        <div className="flex gap-3">
          <button
            className="btn btn-ghost flex-1 py-3 text-sm flex items-center gap-2"
            onClick={onOpenStatistics}
          >
            <BarChart3 size={15} />
            {t.statistics}
          </button>
          <button
            className="btn btn-ghost flex-1 py-3 text-sm flex items-center gap-2"
            onClick={onOpenMeasures}
          >
            <Ruler size={15} />
            {t.measures}
          </button>
          {onViewHistory && (
            <button
              className="btn btn-ghost flex-1 py-3 text-sm flex items-center gap-2"
              onClick={onViewHistory}
            >
              <BarChart3 size={15} />
              {t.history}
            </button>
          )}
        </div>

        <div className="card">
          <div className="grid gap-3 items-center" style={{ gridTemplateColumns: "4fr 8fr" }}>
            <div>
              <span className="text-4xl font-black" style={{ color: "var(--accent)", lineHeight: 1 }}>
                {streak}
              </span>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                {lang === "pt" ? "Série atual" : "Current streak"}
              </p>
            </div>

            <div
              className="grid gap-1 justify-items-end"
              style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
            >
              {Array.from({ length: daysInMonth }, (_, index) => {
                const day = index + 1;
                const info = monthActivity[day] || {};
                const lit = info.active;
                const isToday = info.isToday;
                return (
                  <div
                    key={index}
                    className="flex items-center justify-center"
                    style={{ width: 26, height: 26, opacity: isToday ? 1 : 0.6 }}
                    title={`${day}`}
                  >
                    <Flame
                      size={13}
                      style={{
                        color: lit ? "var(--accent)" : "var(--border)",
                        fill: lit ? "var(--accent)" : "none",
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <button
          className="card text-left w-full flex items-center justify-between"
          onClick={() => setShowSteps(true)}
          style={{ cursor: "pointer" }}
        >
          <div className="flex items-center gap-3">
            <div
              style={{ padding: 10, borderRadius: 12, background: "var(--accent-soft)", display: "flex" }}
            >
              <Footprints size={17} style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {t.stepsToday}
              </p>
              <p className="text-2xl font-bold" style={{ color: "var(--text)", lineHeight: 1.05 }}>
                {todaySteps !== null ? todaySteps.toLocaleString() : "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-end gap-1 min-w-[72px] justify-end" aria-hidden="true">
              {weekSteps.map((entry, index) => {
                const height = 10 + Math.round((entry.value / maxWeekSteps) * 26);
                const active = entry.value > 0;
                return (
                  <div
                    key={index}
                    className="rounded-full"
                    title={`${entry.value.toLocaleString()} ${t.steps}`}
                    style={{
                      width: 6,
                      height,
                      background: active ? "var(--accent)" : "var(--border)",
                      opacity: entry.isToday ? 1 : 0.7,
                    }}
                  />
                );
              })}
            </div>
            <Plus size={16} style={{ color: "var(--text)" }} />
          </div>
        </button>

        <div className="card">
          <p className="section-title mb-3">{t.weeklyProgress}</p>
          <div style={{ width: "100%", height: 180 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <XAxis dataKey="weekLabel" tick={{ fontSize: 10, fill: "var(--muted)" }} />
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
          <div className="flex gap-2 mt-3">
            {["duration", "volume", "reps"].map((m) => (
              <button
                key={m}
                className={`btn ${metric === m ? "btn-primary" : "btn-ghost"} flex-1 py-1.5 text-xs`}
                onClick={() => setMetric(m)}
              >
                {m === "duration" ? t.duration : m === "volume" ? t.volume : t.reps}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showSteps && <StepsModal onClose={() => setShowSteps(false)} />}
    </div>
  );
}
