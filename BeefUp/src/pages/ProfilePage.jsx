import { useMemo, useRef, useState } from "react";
import { Footprints, Flame,  Plus,  Ruler,  CalendarDays,  Dumbbell,  Weight,  Clock,  Layers,  Repeat,  SlidersHorizontal,GripVertical,Eye,EyeOff,ChevronDown,Utensils,Target,Beef,CalendarCheck,CalendarRange,} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { useApp } from "../context/AppContext";
import {  computeStreak,  computeBestStreak,  getMonthActivity,  aggregateSessionsByDay,  computeOverallStats,  computePersonalRecords,  computeMuscleGroupDistribution,  computeMuscleFatigue,  sessionDay,  todayISO,  toLocalISO,} from "../lib/planUtils";
import { nutritionTrend, nutritionSummary } from "../lib/nutritionStats";
import StepsModal from "../components/StepsModal";
import StatsRangeModal from "../components/StatsRangeModal";
import StatTile from "../components/StatTile";
import { BODY_PART_ACCENT } from "../lib/exerciseTree";

function dayOffsetISO(daysBack) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysBack);
  return toLocalISO(date);
}

function formatTotalTime(totalSeconds, t) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}${t.minutes}` : `${minutes}${t.minutes}`;
}

const FATIGUE_COLOR = {
  fatigued: "var(--danger)",
  recovering: "var(--warn)",
  fresh: "var(--success)",
  none: "var(--muted)",
};

const NUTRITION_BLOCKS = new Set(["nutritionTrend", "nutritionSummary"]);
const RANGE_PRESETS = [7, 14, 30];

export default function ProfilePage({ onOpenMeasures }) {
  const { t, lang, plans, activePlanId, sessions, stepsMap, statsLayout, setStatsLayout, foodLog, nutritionGoals, sectionPrefs } = useApp();

  const [showSteps, setShowSteps] = useState(false);
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [prExpanded, setPrExpanded] = useState(false);

  const today = todayISO();

// Global date-range control — not persisted, like the chart metric toggle.
// Streaks, Personal Records, and Muscle Fatigue are excluded because filtering
// them by date would make these lifetime/recent concepts misleading.
  const [rangePreset, setRangePreset] = useState(30); // 7 | 14 | 30 | 'custom'
  const [customStart, setCustomStart] = useState(today);

  const rangeStart = useMemo(() => {
    if (rangePreset === "custom") return customStart;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (rangePreset - 1));
    return toLocalISO(d);
  }, [rangePreset, customStart]);

  const rangeDays = useMemo(() => {
    const start = new Date(rangeStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    return Math.max(1, Math.round((end - start) / 86400000) + 1);
  }, [rangeStart]);

  const sessionsInRange = useMemo(
    () => sessions.filter((s) => sessionDay(s) >= rangeStart),
    [sessions, rangeStart],
  );
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

  const stats = useMemo(() => computeOverallStats(sessionsInRange), [sessionsInRange]);
  const records = useMemo(() => computePersonalRecords(sessions, lang), [sessions, lang]);
  const distribution = useMemo(
    () => computeMuscleGroupDistribution(sessionsInRange, lang),
    [sessionsInRange, lang],
  );
  const maxDistCount = Math.max(1, ...distribution.map((d) => d.count));
  // Não filtrado de propósito: "dias desde o último treino" só é verdade se
  // olhar para o histórico completo, senão um grupo treinado mesmo antes do
  // início da janela lia-se como "nunca treinado" em vez de "fresco".
  const fatigue = useMemo(() => computeMuscleFatigue(sessions, lang), [sessions, lang]);

  const [metric, setMetric] = useState("volume");
  const chartData = useMemo(
    () => aggregateSessionsByDay(sessionsInRange, metric, rangeDays),
    [sessionsInRange, metric, rangeDays],
  );

  const nutriTrend = useMemo(() => nutritionTrend(foodLog, rangeDays), [foodLog, rangeDays]);
  const nutriSummary = useMemo(
    () => nutritionSummary(foodLog, nutritionGoals, rangeDays),
    [foodLog, nutritionGoals, rangeDays],
  );

  const [editMode, setEditMode] = useState(false);
  const [layout, setLayout] = useState(statsLayout);
  const itemRefs = useRef({});
  const dragKey = useRef(null);

  const items = [
    { icon: CalendarDays, label: t.daysTrained, value: stats.daysTrained },
    { icon: Dumbbell, label: t.totalSessions, value: stats.totalSessions },
    { icon: Weight, label: t.totalVolume, value: Math.round(stats.totalVolume).toLocaleString(), unit: "kg" },
    { icon: Clock, label: t.totalTime, value: formatTotalTime(stats.totalDuration, t) },
    { icon: Layers, label: t.totalSets, value: stats.totalSets },
    { icon: Repeat, label: t.totalReps, value: stats.totalReps },
  ];

  const blockTitles = {
    streakCalendar: t.statsBlock_streakCalendar,
    steps: t.statsBlock_steps,
    tiles: t.statsBlock_tiles,
    weeklyProgress: t.progress,
    muscleDistribution: t.muscleDistribution,
    muscleFatigue: t.muscleFatigue,
    personalRecords: t.personalRecords,
    nutritionTrend: t.nutritionTrend,
    nutritionSummary: t.nutritionSummary,
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

  function renderStreakCalendarBlock() {
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
  }

  function renderStepsBlock() {
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
  }

  function renderTilesBlock() {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {items.map((item, i) => (
          <StatTile key={i} icon={item.icon} label={item.label} value={item.value} unit={item.unit} />
        ))}
      </div>
    );
  }

  function renderProgressBlock() {
    const hasData = sessionsInRange.length > 0;
    return (
      <div className="card">
        <p className="section-title mb-3">{t.progress}</p>
        {!hasData ? (
          <p className="text-sm text-center py-4" style={{ color: "var(--muted)" }}>
            {t.noSessionsInRange}
          </p>
        ) : (
          <div style={{ width: "100%", height: 180 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: "var(--muted)" }} interval="preserveStartEnd" />
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
  }

  function renderMuscleDistributionBlock() {
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
  }

  function renderMuscleFatigueBlock() {
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
                    background: FATIGUE_COLOR[f.level],
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
  }

  function renderPersonalRecordsBlock() {
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
  }

  function renderNutritionTrendBlock() {
    const kcalGoal = nutritionGoals.kcal || 0;
    const hasData = nutriSummary.daysLogged > 0;
    return (
      <div className="card">
        <p className="section-title mb-3">{t.nutritionTrend}</p>
        {!hasData ? (
          <p className="text-sm text-center py-4" style={{ color: "var(--muted)" }}>
            {t.noNutritionData}
          </p>
        ) : (
          /* Dias sem registo entram como null: a linha abre falha em vez de mergulhar a zero, que seria dizer que não comeste nada. */
          <div style={{ width: "100%", height: 180 }}>
            <ResponsiveContainer>
              <LineChart data={nutriTrend}>
                <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: "var(--muted)" }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} width={38} />
                <Tooltip />
                {kcalGoal > 0 && (
                  <ReferenceLine
                    y={kcalGoal}
                    stroke="var(--muted)"
                    strokeDasharray="4 4"
                    label={{ value: t.goal, fontSize: 10, fill: "var(--muted)", position: "insideTopRight" }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="kcal"
                  stroke="var(--accent-2)"
                  strokeWidth={2}
                  connectNulls={false}
                  dot={{ r: 3, fill: "var(--accent-2)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  function renderNutritionSummaryBlock() {
    const hasData = nutriSummary.daysLogged > 0;
    const nutriTiles = [
      { icon: Utensils, label: t.avgKcal, value: nutriSummary.avgKcal.toLocaleString(), unit: t.kcal },
      { icon: Target, label: t.onTarget, value: `${nutriSummary.daysOnTarget}/${nutriSummary.daysLogged}` },
      { icon: Beef, label: t.avgProtein, value: nutriSummary.avgProtein, unit: "g" },
      { icon: CalendarCheck, label: t.daysLogged, value: nutriSummary.daysLogged },
    ];
    return (
      <div>
        {!hasData ? (
          <div className="card">
            <p className="text-sm text-center py-2" style={{ color: "var(--muted)" }}>
              {t.noNutritionData}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {nutriTiles.map((item, i) => (
              <StatTile
                key={i}
                icon={item.icon}
                label={item.label}
                value={item.value}
                unit={item.unit}
                accent="var(--accent-2)"
                accentSoft="var(--accent-2-soft)"
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const blockRenderers = {
    streakCalendar: renderStreakCalendarBlock,
    steps: renderStepsBlock,
    tiles: renderTilesBlock,
    weeklyProgress: renderProgressBlock,
    muscleDistribution: renderMuscleDistributionBlock,
    muscleFatigue: renderMuscleFatigueBlock,
    personalRecords: renderPersonalRecordsBlock,
    nutritionTrend: renderNutritionTrendBlock,
    nutritionSummary: renderNutritionSummaryBlock,
  };

  function renderBlockContent(key) {
    return blockRenderers[key]?.() ?? null;
  }

  const showNutrition = sectionPrefs.nutrition;
  const availableBlocks = showNutrition
    ? statsLayout
    : statsLayout.filter((b) => !NUTRITION_BLOCKS.has(b.key));
  const editableBlocks = showNutrition
    ? layout
    : layout.filter((b) => !NUTRITION_BLOCKS.has(b.key));
  const visibleBlocks = availableBlocks.filter((b) => b.enabled);

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
        <button
          className="btn btn-ghost w-full py-3 text-sm flex items-center justify-center gap-2"
          onClick={onOpenMeasures}
        >
          <Ruler size={15} />
          {t.measures}
        </button>

        {/* Options are shown directly in the row, with no hidden modal or gesture */}
        <div className="pill-toggle">
          {RANGE_PRESETS.map((d) => (
            <button
              key={d}
              className={`pill-option ${rangePreset === d ? "active" : ""}`}
              onClick={() => setRangePreset(d)}
            >
              {d}d
            </button>
          ))}
          <button
            className={`pill-option ${rangePreset === "custom" ? "active" : ""}`}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
            onClick={() => setShowRangeModal(true)}
            aria-label={t.custom}
          >
            <CalendarRange size={14} />
            {rangePreset === "custom" && <span>{rangeDays}d</span>}
          </button>
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
          editableBlocks.map((b) => (
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
      {showRangeModal && (
        <StatsRangeModal
          customStart={customStart}
          today={today}
          onApply={(date) => {
            setCustomStart(date);
            setRangePreset("custom");
            setShowRangeModal(false);
          }}
          onClose={() => setShowRangeModal(false)}
        />
      )}
    </div>
  );
}
