import { useState } from "react";
import {CalendarDays, CalendarRange, Clock, Dumbbell, Eye, EyeOff, Flame, GripVertical, Layers,Repeat, Ruler, SlidersHorizontal, Weight,} from "lucide-react";
import { useApp } from "../context/AppContext";
import StepsModal from "../components/StepsModal";
import StatsRangeModal from "../components/StatsRangeModal";
import { RANGE_PRESETS, useStatsRange } from "./profile/useStatsRange";
import { useProfileStats } from "./profile/useProfileStats";
import { useBlockReorder } from "./profile/useBlockReorder";
import {
  MuscleDistributionBlock,
  MuscleFatigueBlock,
  NutritionSummaryBlock,
  NutritionTrendBlock,
  PersonalRecordsBlock,
  ProgressBlock,
  StepsBlock,
  StreakCalendarBlock,
  WorkoutSummaryBlock,
} from "./profile/StatBlocks";

// Blocks hidden when the user turns nutrition off in settings.
const NUTRITION_BLOCKS = new Set(["nutritionTrend", "nutritionSummary"]);

function formatTotalTime(totalSeconds, t) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}${t.minutes}` : `${minutes}${t.minutes}`;
}

function buildSummaryTiles(overall, t) {
  return [
    { icon: CalendarDays, label: t.daysTrained, value: overall.daysTrained },
    { icon: Dumbbell, label: t.totalSessions, value: overall.totalSessions },
    { icon: Weight, label: t.totalVolume, value: Math.round(overall.totalVolume).toLocaleString(), unit: "kg" },
    { icon: Clock, label: t.totalTime, value: formatTotalTime(overall.totalDuration, t) },
    { icon: Layers, label: t.totalSets, value: overall.totalSets },
    { icon: Repeat, label: t.totalReps, value: overall.totalReps },
  ];
}

export default function ProfilePage({ onOpenMeasures }) {
  const { t, lang, statsLayout, setStatsLayout, sectionPrefs } = useApp();

  const [showSteps, setShowSteps] = useState(false);
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [recordsExpanded, setRecordsExpanded] = useState(false);
  const [metric, setMetric] = useState("volume");

  const range = useStatsRange();
  const stats = useProfileStats({
    rangeStart: range.start,
    rangeDays: range.days,
    metric,
    today: range.today,
  });
  const reorder = useBlockReorder(statsLayout, setStatsLayout);

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

  // Keys stay as they are persisted in statsLayout; only the rendering moved.
  const blocks = {
    streakCalendar: () => (
      <StreakCalendarBlock
        streak={stats.streak}
        bestStreak={stats.bestStreak}
        daysInMonth={stats.daysInMonth}
        monthActivity={stats.monthActivity}
      />
    ),
    steps: () => (
      <StepsBlock
        todaySteps={stats.todaySteps}
        weekSteps={stats.weekSteps}
        maxWeekSteps={stats.maxWeekSteps}
        onOpen={() => setShowSteps(true)}
      />
    ),
    tiles: () => <WorkoutSummaryBlock tiles={buildSummaryTiles(stats.overall, t)} />,
    weeklyProgress: () => (
      <ProgressBlock
        chartData={stats.chartData}
        hasSessions={stats.sessionsInRange.length > 0}
        metric={metric}
        onMetricChange={setMetric}
      />
    ),
    muscleDistribution: () => (
      <MuscleDistributionBlock distribution={stats.distribution} maxCount={stats.maxDistCount} />
    ),
    muscleFatigue: () => <MuscleFatigueBlock fatigue={stats.fatigue} />,
    personalRecords: () => (
      <PersonalRecordsBlock
        records={stats.records}
        expanded={recordsExpanded}
        onToggle={() => setRecordsExpanded((v) => !v)}
      />
    ),
    nutritionTrend: () => (
      <NutritionTrendBlock
        trend={stats.nutriTrend}
        kcalGoal={stats.kcalGoal}
        hasData={stats.nutriSummary.daysLogged > 0}
      />
    ),
    nutritionSummary: () => <NutritionSummaryBlock summary={stats.nutriSummary} />,
  };

  const keepAllowed = (list) =>
    sectionPrefs.nutrition ? list : list.filter((b) => !NUTRITION_BLOCKS.has(b.key));
  const visibleBlocks = keepAllowed(statsLayout).filter((b) => b.enabled);
  const editableBlocks = keepAllowed(reorder.layout);

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div className="flex items-center gap-1" style={{ padding: "38px 20px 16px" }}>
        <h1 className="display flex-1" style={{ fontSize: 30, fontWeight: 900, color: "var(--text)" }}>
          {t.profileTitle}
        </h1>
        <button
          aria-label={reorder.editing ? t.doneEditing : t.customizeStats}
          title={reorder.editing ? t.doneEditing : t.customizeStats}
          className={`btn ${reorder.editing ? "btn-primary" : "btn-ghost"} p-2`}
          onClick={() => (reorder.editing ? reorder.setEditing(false) : reorder.startEditing())}
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

        {/* Options sit in the row itself — one tap per preset*/}
        <div className="pill-toggle">
          {RANGE_PRESETS.map((days) => (
            <button
              key={days}
              className={`pill-option ${range.preset === days ? "active" : ""}`}
              onClick={() => range.setPreset(days)}
            >
              {days}d
            </button>
          ))}
          <button
            className={`pill-option ${range.preset === "custom" ? "active" : ""}`}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
            onClick={() => setShowRangeModal(true)}
            aria-label={t.custom}
          >
            <CalendarRange size={14} />
            {range.preset === "custom" && <span>{range.days}d</span>}
          </button>
        </div>

        <div className="hero">
          <div className="flex items-center justify-between" style={{ position: "relative" }}>
            <div>
              <p style={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>
                {t.currentStreak}
              </p>
              <p className="display" style={{ fontSize: 40, fontWeight: 900, marginTop: 2, lineHeight: 1 }}>
                {stats.streak}
                <span style={{ fontSize: 16, fontWeight: 700, opacity: 0.85, marginLeft: 6 }}>
                  {t.days}
                </span>
              </p>
              <p style={{ fontSize: 13, opacity: 0.88, marginTop: 6 }}>
                {lang === "pt" ? `Melhor: ${stats.bestStreak} dias` : `Best: ${stats.bestStreak} days`}
              </p>
            </div>
            <Flame size={40} style={{ opacity: 0.9 }} fill="currentColor" />
          </div>
        </div>

        {reorder.editing ? (
          editableBlocks.map((block) => (
            <div
              key={block.key}
              ref={(node) => { reorder.itemRefs.current[block.key] = node; }}
              className="card flex items-center gap-3"
              style={{ opacity: block.enabled ? 1 : 0.5 }}
            >
              <div
                onPointerDown={(e) => reorder.handlePointerDown(e, block.key)}
                onPointerMove={reorder.handlePointerMove}
                onPointerUp={reorder.handlePointerUp}
                onPointerCancel={reorder.handlePointerUp}
                style={{ touchAction: "none", cursor: "grab", display: "flex" }}
              >
                <GripVertical size={18} style={{ color: "var(--muted)" }} />
              </div>
              <span className="flex-1 text-sm font-semibold" style={{ color: "var(--text)" }}>
                {blockTitles[block.key]}
              </span>
              <button className="btn btn-ghost p-2" onClick={() => reorder.toggleEnabled(block.key)}>
                {block.enabled ? <Eye size={16} /> : <EyeOff size={16} style={{ color: "var(--muted)" }} />}
              </button>
            </div>
          ))
        ) : visibleBlocks.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: "var(--muted)" }}>{t.noStatsEnabled}</p>
        ) : (
          visibleBlocks.map((block) => <div key={block.key}>{blocks[block.key]?.() ?? null}</div>)
        )}
      </div>

      {showSteps && <StepsModal onClose={() => setShowSteps(false)} />}
      {showRangeModal && (
        <StatsRangeModal
          customStart={range.customStart}
          today={range.today}
          onApply={(date) => {
            range.setCustomStart(date);
            range.setPreset("custom");
            setShowRangeModal(false);
          }}
          onClose={() => setShowRangeModal(false)}
        />
      )}
    </div>
  );
}
