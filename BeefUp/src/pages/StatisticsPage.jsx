import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { useApp } from "../context/AppContext";
import { computeOverallStats } from "../lib/planUtils";

function formatDuration(totalSeconds, t) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}${t.minutes}` : `${minutes}${t.minutes}`;
}

export default function StatisticsPage({ onBack }) {
  const { t, sessions } = useApp();
  const stats = useMemo(() => computeOverallStats(sessions), [sessions]);

  const items = [
    { label: t.daysTrained, value: stats.daysTrained },
    { label: t.totalSessions, value: stats.totalSessions },
    { label: t.totalVolume, value: `${Math.round(stats.totalVolume).toLocaleString()} kg` },
    { label: t.totalTime, value: formatDuration(stats.totalDuration, t) },
    { label: t.totalSets, value: stats.totalSets },
    { label: t.totalReps, value: stats.totalReps },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div className="flex items-center gap-3 px-5 pt-10 pb-6">
        <button className="btn-back" onClick={onBack}>
          <ArrowLeft size={18} style={{ color: "var(--text)" }} />
        </button>
        <span className="font-semibold text-base" style={{ color: "var(--text)" }}>
          {t.statistics}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-3 scrollbar-hide">
        {items.map((item, i) => (
          <div key={i} className="card flex items-center justify-between">
            <span className="text-sm" style={{ color: "var(--muted)" }}>
              {item.label}
            </span>
            <span className="text-lg font-bold" style={{ color: "var(--text)" }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
