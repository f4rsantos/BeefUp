import { useMemo, useRef, useState } from "react";
import { Footprints, Flame,  Plus,  Ruler,  BarChart3,  CalendarDays,  Dumbbell,  Weight,  Clock,  Layers,  Repeat,  SlidersHorizontal,GripVertical,Eye,EyeOff,ChevronDown,} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useApp } from "../context/AppContext";
import {  computeStreak,  computeBestStreak,  getMonthActivity,  aggregateSessionsByWeek,  computeOverallStats,  computePersonalRecords,  computeMuscleGroupDistribution,  computeMuscleFatigue,  todayISO,  toLocalISO,} from "../lib/planUtils";
import StepsModal from "../components/StepsModal";
import StatTile from "../components/StatTile";
import { BODY_PART_ACCENT } from "../lib/exerciseTree";

function dayOffsetISO(daysBack) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysBack);
  return toLocalISO(date);
}

function formatDuration(totalSeconds, t) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}${t.minutes}` : `${minutes}${t.minutes}`;
}

export default function ProfilePage({ onOpenMeasures, onViewHistory }) {
  const { t, lang, plans, activePlanId, sessions, stepsMap, statsLayout, setStatsLayout } = useApp();

  const [showSteps, setShowSteps] = useState(false);
  const [prExpanded, setPrExpanded] = useState(false);

  const today = todayISO();
  const streak = useMemo(
    () => computeStreak(sessions, plans, activePlanId),
    [sessions, plans, activePlanId],
  );
  const bestStreak = useMemo(
    () => computeBestStreak(sessions, plans, activePlanId),
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

  const stats = useMemo(() => computeOverallStats(sessions), [sessions]);
  const records = useMemo(() => computePersonalRecords(sessions, lang), [sessions, lang]);
  const distribution = useMemo(() => computeMuscleGroupDistribution(sessions, lang), [sessions, lang]);
  const maxDistCount = Math.max(1, ...distribution.map((d) => d.count));
  const fatigue = useMemo(() => computeMuscleFatigue(sessions, lang), [sessions, lang]);

  const [metric, setMetric] = useState("volume");
  const chartData = useMemo(() => aggregateSessionsByWeek(sessions, metric), [sessions, metric]);

  const [editMode, setEditMode] = useState(false);
  const [layout, setLayout] = useState(statsLayout);
  const itemRefs = useRef({});
  const dragKey = useRef(null);

  const items = [
    { icon: CalendarDays, label: t.daysTrained, value: stats.daysTrained },
    { icon: Dumbbell, label: t.totalSessions, value: stats.totalSessions },
    { icon: Weight, label: t.totalVolume, value: Math.round(stats.totalVolume).toLocaleString(), unit: "kg" },
    { icon: Clock, label: t.totalTime, value: formatDuration(stats.totalDuration, t) },
    { icon: Layers, label: t.totalSets, value: stats.totalSets },
    { icon: Repeat, label: t.totalReps, value: stats.totalReps },
  ];

  const blockTitles = {
    streakCalendar: t.statsBlock_streakCalendar,
    steps: t.statsBlock_steps,
    tiles: t.statsBlock_tiles,
    weeklyProgress: t.weeklyProgress,
    muscleDistribution: t.muscleDistribution,
    muscleFatigue: t.muscleFatigue,
    personalRecords: t.personalRecords,
  };

  const fatigueColor = {
    fatigued: "var(--danger)",
    recovering: "var(--warn)",
    fresh: "var(--success)",
    none: "var(--muted)",
  };

  function toggleEnabled(key) {
    const next = layout.map((b) => (b.key === key ? { ...b, enabled: !b.enabled } : b));
    setLayout(next);
    setStatsLayout(next);
  }

  function enterEditMode() {
    setLayout(statsLayout);
    setEditMode(true);
  }

  function reorder(fromIndex, toIndex) {
    setLayout((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function handlePointerDown(e, key) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragKey.current = key;
  }

  function handlePointerMove(e) {
    const draggedKey = dragKey.current;
    if (!draggedKey) return;
    const currentIndex = layout.findIndex((b) => b.key === draggedKey);
    const y = e.clientY;

    for (const b of layout) {
      if (b.key === draggedKey) continue;
      const node = itemRefs.current[b.key];
      if (!node) continue;
      const rect = node.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const otherIndex = layout.findIndex((x) => x.key === b.key);

      if (y < mid && otherIndex < currentIndex) {
        reorder(currentIndex, otherIndex);
        break;
      }
      if (y > mid && otherIndex > currentIndex) {
        reorder(currentIndex, otherIndex);
        break;
      }
    }
  }

  function handlePointerUp() {
    if (!dragKey.current) return;
    dragKey.current = null;
    setStatsLayout(layout);
  }

  function renderBlockContent(key) {
    switch (key) {
      case "streakCalendar":
        return (
          <div className="card" style={{ height: 184 }}>
            <div className="grid gap-3 items-center" style={{ gridTemplateColumns: "4fr 8fr", height: "100%" }}>
              <div>
                <span className="text-4xl font-black" style={{ color: "var(--accent)", lineHeight: 1 }}>
                  {streak}
                </span>
                <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                  {lang === "pt" ? "Série atual" : "Current streak"}
                </p>
                <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
                  {t.bestStreak}: <span style={{ color: "var(--text)", fontWeight: 700 }}>{bestStreak}</span>
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
        );
      case "steps":
        return (
          <button
            className="card text-left w-full flex items-center justify-between"
            onClick={() => setShowSteps(true)}
            style={{ cursor: "pointer", height: 84 }}
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
        );
      case "tiles":
        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {items.map((item, i) => (
              <StatTile key={i} icon={item.icon} label={item.label} value={item.value} unit={item.unit} />
            ))}
          </div>
        );
      case "weeklyProgress":
        return (
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
        );
      case "muscleDistribution":
        return (
          <div className="card">
            <p className="section-title mb-3">{t.muscleDistribution}</p>
            {distribution.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: "var(--muted)" }}>{t.noMeasures}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {distribution.map((d) => (
                  <div key={d.bodyPart} className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: "var(--muted)", width: 72, flexShrink: 0 }}>
                      {d.label}
                    </span>
                    <div className="flex-1" style={{ background: "var(--border)", borderRadius: 6, height: 8 }}>
                      <div
                        style={{
                          width: `${(d.count / maxDistCount) * 100}%`,
                          background: BODY_PART_ACCENT[d.bodyPart] ?? "var(--accent)",
                          borderRadius: 6,
                          height: 8,
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold" style={{ color: "var(--text)", width: 24, textAlign: "right" }}>
                      {d.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case "muscleFatigue":
        return (
          <div className="card">
            <p className="section-title mb-3">{t.muscleFatigue}</p>
            <div className="flex flex-col gap-2">
              {fatigue.map((f) => (
                <div key={f.bodyPart} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: fatigueColor[f.level],
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ color: "var(--text)" }}>{f.label}</span>
                  </div>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>
                    {t[`fatigueLevel_${f.level}`]}
                    {f.daysSince !== null ? ` · ${t.daysAgo.replace("{n}", f.daysSince)}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      case "personalRecords":
        return (
          <div className="card">
            <button
              className="flex items-center justify-between w-full"
              onClick={() => setPrExpanded((v) => !v)}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
            >
              <p className="section-title" style={{ margin: 0 }}>
                {t.personalRecords}
                {records.length > 0 && (
                  <span style={{ color: "var(--muted)", fontWeight: 500 }}> ({records.length})</span>
                )}
              </p>
              <ChevronDown
                size={18}
                style={{
                  color: "var(--muted)",
                  transform: prExpanded ? "rotate(180deg)" : "none",
                  transition: "transform 0.15s",
                }}
              />
            </button>
            {prExpanded && (
              <p className="text-xs mt-3" style={{ color: "var(--muted)" }}>
                {t.personalRecordsLegend}
              </p>
            )}
            {prExpanded && (
              records.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: "var(--muted)" }}>{t.noPRs}</p>
              ) : (
                <div className="flex flex-col mt-3" style={{ borderTop: "1px solid var(--border)" }}>
                  {records.map((r) => (
                    <div
                      key={r.exerciseId}
                      className="flex items-center justify-between text-sm"
                      style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}
                    >
                      <div>
                        <p style={{ color: "var(--text)", fontWeight: 600 }}>{r.name}</p>
                        <p className="text-xs" style={{ color: "var(--muted)" }}>
                          {r.weight}kg × {r.reps} · {r.date.slice(0, 10)}
                        </p>
                      </div>
                      <span className="font-bold" style={{ color: "var(--accent)" }}>
                        {Math.round(r.e1rm)}kg
                      </span>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        );
      default:
        return null;
    }
  }

  const visibleBlocks = statsLayout.filter((b) => b.enabled);

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div className="flex items-center gap-1" style={{ padding: "38px 20px 16px" }}>
        <h1 className="display flex-1" style={{ fontSize: 30, fontWeight: 900, color: "var(--text)" }}>
          {t.profileTitle}
        </h1>
        <button
          aria-label={editMode ? t.doneEditing : t.customizeStats}
          title={editMode ? t.doneEditing : t.customizeStats}
          className={`btn ${editMode ? "btn-primary" : "btn-ghost"} p-2`}
          onClick={() => (editMode ? setEditMode(false) : enterEditMode())}
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-4 scrollbar-hide fade-in">
        <div className="flex gap-3">
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

        <div className="hero">
          <div className="flex items-center justify-between" style={{ position: "relative" }}>
            <div>
              <p style={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>
                {lang === "pt" ? "Sequência atual" : "Current streak"}
              </p>
              <p className="display" style={{ fontSize: 40, fontWeight: 900, marginTop: 2, lineHeight: 1 }}>
                {streak}
                <span style={{ fontSize: 16, fontWeight: 700, opacity: 0.85, marginLeft: 6 }}>
                  {lang === "pt" ? "dias" : "days"}
                </span>
              </p>
              <p style={{ fontSize: 13, opacity: 0.88, marginTop: 6 }}>
                {lang === "pt" ? `Melhor: ${bestStreak} dias` : `Best: ${bestStreak} days`}
              </p>
            </div>
            <Flame size={40} style={{ opacity: 0.9 }} fill="currentColor" />
          </div>
        </div>

        {editMode ? (
          layout.map((b) => (
            <div
              key={b.key}
              ref={(node) => { itemRefs.current[b.key] = node; }}
              className="card flex items-center gap-3"
              style={{ opacity: b.enabled ? 1 : 0.5 }}
            >
              <div
                onPointerDown={(e) => handlePointerDown(e, b.key)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{ touchAction: "none", cursor: "grab", display: "flex" }}
              >
                <GripVertical size={18} style={{ color: "var(--muted)" }} />
              </div>
              <span className="flex-1 text-sm font-semibold" style={{ color: "var(--text)" }}>
                {blockTitles[b.key]}
              </span>
              <button className="btn btn-ghost p-2" onClick={() => toggleEnabled(b.key)}>
                {b.enabled ? <Eye size={16} /> : <EyeOff size={16} style={{ color: "var(--muted)" }} />}
              </button>
            </div>
          ))
        ) : visibleBlocks.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: "var(--muted)" }}>{t.noStatsEnabled}</p>
        ) : (
          visibleBlocks.map((b) => <div key={b.key}>{renderBlockContent(b.key)}</div>)
        )}
      </div>

      {showSteps && <StepsModal onClose={() => setShowSteps(false)} />}
    </div>
  );
}
