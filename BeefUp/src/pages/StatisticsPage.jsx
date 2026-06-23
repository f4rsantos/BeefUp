import { useMemo } from "react";
import { ChevronLeft, CalendarDays, Dumbbell, Weight, Clock, Layers, Repeat } from "lucide-react";
import { useApp } from "../context/AppContext";
import { computeOverallStats } from "../lib/planUtils";
import StatTile from "../components/StatTile";

function formatDuration(totalSeconds, t) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}${t.minutes}` : `${minutes}${t.minutes}`;
}

export default function StatisticsPage({ onBack }) {
  const { t, sessions } = useApp();
  const stats = useMemo(() => computeOverallStats(sessions), [sessions]);

  const items = [
    { icon: CalendarDays, label: t.daysTrained, value: stats.daysTrained },
    { icon: Dumbbell, label: t.totalSessions, value: stats.totalSessions },
    { icon: Weight, label: t.totalVolume, value: Math.round(stats.totalVolume).toLocaleString(), unit: "kg" },
    { icon: Clock, label: t.totalTime, value: formatDuration(stats.totalDuration, t) },
    { icon: Layers, label: t.totalSets, value: stats.totalSets },
    { icon: Repeat, label: t.totalReps, value: stats.totalReps },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div className="flex items-center gap-1" style={{ padding: "38px 16px 16px" }}>
        <button className="btn-back" onClick={onBack}>
          <ChevronLeft size={24} style={{ color: "var(--text)" }} />
        </button>
        <h1 className="display" style={{ fontSize: 28, fontWeight: 900, color: "var(--text)" }}>
          {t.statistics}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 scrollbar-hide fade-in">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {items.map((item, i) => (
            <StatTile key={i} icon={item.icon} label={item.label} value={item.value} unit={item.unit} gradient={i === 0} />
          ))}
        </div>
      </div>
    </div>
  );
}
