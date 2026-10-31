import { useState } from "react";
import { CalendarDays, Check, Clock, Dumbbell, Eye, EyeOff, GripVertical, Layers, Repeat, Ruler, SlidersHorizontal, Weight } from "lucide-react";
import { useApp } from "../context/useApp";
import StepsModal from "../components/StepsModal";
import Screen from "../components/ui/Screen";
import LargeTitle from "../components/ui/LargeTitle";
import IconButton from "../components/ui/IconButton";
import EmptyState from "../components/ui/EmptyState";
import { ListGroup, ListRow } from "../components/ui/List";
import { DEFAULT_CHART_DAYS, useProfileStats } from "./profile/useProfileStats";
import { useBlockReorder } from "./profile/useBlockReorder";
import {
  MuscleDistributionBlock,
  MuscleFatigueBlock,
  PersonalRecordsBlock,
  ProgressBlock,
  StepsBlock,
  StreakCalendarBlock,
  WorkoutSummaryBlock,
  NextAppointmentsBlock,
} from "./profile/StatBlocks";
import { isFutureAppt } from "../lib/planUtils";

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
  const { t, statsLayout, setStatsLayout, appointments = [] } = useApp();
  
  const upcomingAppointments = appointments
    .filter(a => isFutureAppt(a.date, a.time))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const [showSteps, setShowSteps] = useState(false);
  const [recordsExpanded, setRecordsExpanded] = useState(false);
  const [metric, setMetric] = useState("volume");
  const [chartDays, setChartDays] = useState(DEFAULT_CHART_DAYS);

  const stats = useProfileStats({ metric, chartDays });
  const reorder = useBlockReorder(statsLayout, setStatsLayout);

  const blockTitles = {
    streakCalendar: t.statsBlock_streakCalendar,
    steps: t.statsBlock_steps,
    tiles: t.statsBlock_tiles,
    weeklyProgress: t.progress,
    muscleDistribution: t.muscleDistribution,
    muscleFatigue: t.muscleFatigue,
    personalRecords: t.personalRecords,
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
        hasSessions={stats.hasSessions}
        metric={metric}
        onMetricChange={setMetric}
        days={stats.chartDays}
        minDays={stats.minChartDays}
        maxDays={stats.maxChartDays}
        onDaysChange={setChartDays}
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
  };

  const visibleBlocks = statsLayout.filter((b) => b.enabled);
  const editableBlocks = reorder.layout;

  return (
    <Screen gap={20} after={showSteps && <StepsModal onClose={() => setShowSteps(false)} />}>
      <LargeTitle
        title={t.profileTitle}
        actions={
          <IconButton
            icon={reorder.editing ? Check : SlidersHorizontal}
            variant={reorder.editing ? "filled" : ""}
            label={reorder.editing ? t.doneEditing : t.customizeStats}
            onClick={() => (reorder.editing ? reorder.setEditing(false) : reorder.startEditing())}
          />
        }
      />

      <ListGroup icons>
        <ListRow icon={Ruler} iconColor="var(--fat)" title={t.measures} chevron onClick={onOpenMeasures} />
      </ListGroup>

      {upcomingAppointments.length > 0 && (
        <NextAppointmentsBlock appointments={upcomingAppointments} />
      )}

      {reorder.editing ? (
        <ListGroup header={t.customizeStats}>
          {editableBlocks.map((block) => (
            <div
              key={block.key}
              ref={(node) => { reorder.itemRefs.current[block.key] = node; }}
              className="list-row"
              style={{ opacity: block.enabled ? 1 : 0.45 }}
            >
              <span
                onPointerDown={(e) => reorder.handlePointerDown(e, block.key)}
                onPointerMove={reorder.handlePointerMove}
                onPointerUp={reorder.handlePointerUp}
                onPointerCancel={reorder.handlePointerUp}
                style={{ touchAction: "none", cursor: "grab", display: "flex", padding: 6, margin: -6 }}
              >
                <GripVertical size={18} style={{ color: "var(--muted)" }} />
              </span>
              <span className="list-row-body list-row-title">{blockTitles[block.key]}</span>
              <IconButton
                icon={block.enabled ? Eye : EyeOff}
                size="sm"
                variant="plain"
                label={blockTitles[block.key]}
                onClick={() => reorder.toggleEnabled(block.key)}
              />
            </div>
          ))}
        </ListGroup>
      ) : visibleBlocks.length === 0 ? (
        <EmptyState icon={SlidersHorizontal} text={t.noStatsEnabled} />
      ) : (
        visibleBlocks.map((block) => <div key={block.key}>{blocks[block.key]?.() ?? null}</div>)
      )}
    </Screen>
  );
}
