import {Beef, CalendarCheck, ChevronDown, Flame, Footprints, Plus, Target, Utensils,} from 'lucide-react'
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApp } from '../../context/AppContext'
import { BODY_PART_ACCENT } from '../../lib/exerciseTree'
import StatTile from '../../components/StatTile'

const FATIGUE_COLOR = {
  fatigued: 'var(--danger)',
  recovering: 'var(--warn)',
  fresh: 'var(--success)',
  none: 'var(--muted)',
}

const CHART_HEIGHT = 180
const AXIS_TICK = { fontSize: 10, fill: 'var(--muted)' }

function EmptyNote({ children }) {
  return (
    <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>
      {children}
    </p>
  )
}

export function StreakCalendarBlock({ streak, bestStreak, daysInMonth, monthActivity }) {
  const { t, lang } = useApp()
  return (
    <div className="card" style={{ height: 184 }}>
      <div className="grid gap-3 items-center" style={{ gridTemplateColumns: '4fr 8fr', height: '100%' }}>
        <div>
          <span className="text-4xl font-black" style={{ color: 'var(--accent)', lineHeight: 1 }}>
            {streak}
          </span>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            {lang === 'pt' ? 'Série atual' : 'Current streak'}
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
            {t.bestStreak}: <span style={{ color: 'var(--text)', fontWeight: 700 }}>{bestStreak}</span>
          </p>
        </div>

        <div className="grid gap-1 justify-items-end" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1
            const { active, isToday } = monthActivity[day] || {}
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
                    color: active ? 'var(--accent)' : 'var(--border)',
                    fill: active ? 'var(--accent)' : 'none',
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function StepsBlock({ todaySteps, weekSteps, maxWeekSteps, onOpen }) {
  const { t } = useApp()
  return (
    <button
      className="card text-left w-full flex items-center justify-between"
      onClick={onOpen}
      style={{ cursor: 'pointer', height: 84 }}
    >
      <div className="flex items-center gap-3">
        <div style={{ padding: 10, borderRadius: 12, background: 'var(--accent-soft)', display: 'flex' }}>
          <Footprints size={17} style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>{t.stepsToday}</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text)', lineHeight: 1.05 }}>
            {todaySteps !== null ? todaySteps.toLocaleString() : '—'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-end gap-1 min-w-[72px] justify-end" aria-hidden="true">
          {weekSteps.map((entry, index) => (
            <div
              key={index}
              className="rounded-full"
              title={`${entry.value.toLocaleString()} ${t.steps}`}
              style={{
                width: 6,
                height: 10 + Math.round((entry.value / maxWeekSteps) * 26),
                background: entry.value > 0 ? 'var(--accent)' : 'var(--border)',
                opacity: entry.isToday ? 1 : 0.7,
              }}
            />
          ))}
        </div>
        <Plus size={16} style={{ color: 'var(--text)' }} />
      </div>
    </button>
  )
}

export function WorkoutSummaryBlock({ tiles }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {tiles.map((tile, i) => (
        <StatTile key={i} icon={tile.icon} label={tile.label} value={tile.value} unit={tile.unit} />
      ))}
    </div>
  )
}

export function ProgressBlock({ chartData, hasSessions, metric, onMetricChange }) {
  const { t } = useApp()
  const metricLabels = { duration: t.duration, volume: t.volume, reps: t.reps }
  return (
    <div className="card">
      <p className="section-title mb-3">{t.progress}</p>
      {!hasSessions ? (
        <EmptyNote>{t.noSessionsInRange}</EmptyNote>
      ) : (
        <div style={{ width: '100%', height: CHART_HEIGHT }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <XAxis dataKey="dateLabel" tick={AXIS_TICK} interval="preserveStartEnd" />
              <YAxis tick={AXIS_TICK} width={32} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--accent)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="flex gap-2 mt-3">
        {Object.keys(metricLabels).map((key) => (
          <button
            key={key}
            className={`btn ${metric === key ? 'btn-primary' : 'btn-ghost'} flex-1 py-1.5 text-xs`}
            onClick={() => onMetricChange(key)}
          >
            {metricLabels[key]}
          </button>
        ))}
      </div>
    </div>
  )
}

export function MuscleDistributionBlock({ distribution, maxCount }) {
  const { t } = useApp()
  return (
    <div className="card">
      <p className="section-title mb-3">{t.muscleDistribution}</p>
      {distribution.length === 0 ? (
        <EmptyNote>{t.noMeasures}</EmptyNote>
      ) : (
        <div className="flex flex-col gap-2">
          {distribution.map((entry) => (
            <div key={entry.bodyPart} className="flex items-center gap-3">
              <span className="text-xs" style={{ color: 'var(--muted)', width: 72, flexShrink: 0 }}>
                {entry.label}
              </span>
              <div className="flex-1" style={{ background: 'var(--border)', borderRadius: 6, height: 8 }}>
                <div
                  style={{
                    width: `${(entry.count / maxCount) * 100}%`,
                    background: BODY_PART_ACCENT[entry.bodyPart] ?? 'var(--accent)',
                    borderRadius: 6,
                    height: 8,
                  }}
                />
              </div>
              <span
                className="text-xs font-semibold"
                style={{ color: 'var(--text)', width: 24, textAlign: 'right' }}
              >
                {entry.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function MuscleFatigueBlock({ fatigue }) {
  const { t } = useApp()
  return (
    <div className="card">
      <p className="section-title mb-3">{t.muscleFatigue}</p>
      <div className="flex flex-col gap-2">
        {fatigue.map((group) => (
          <div key={group.bodyPart} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: FATIGUE_COLOR[group.level],
                  flexShrink: 0,
                }}
              />
              <span style={{ color: 'var(--text)' }}>{group.label}</span>
            </div>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              {t[`fatigueLevel_${group.level}`]}
              {group.daysSince !== null ? ` · ${t.daysAgo.replace('{n}', group.daysSince)}` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PersonalRecordsBlock({ records, expanded, onToggle }) {
  const { t } = useApp()
  return (
    <div className="card">
      <button
        className="flex items-center justify-between w-full"
        onClick={onToggle}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
      >
        <p className="section-title" style={{ margin: 0 }}>
          {t.personalRecords}
          {records.length > 0 && (
            <span style={{ color: 'var(--muted)', fontWeight: 500 }}> ({records.length})</span>
          )}
        </p>
        <ChevronDown
          size={18}
          style={{
            color: 'var(--muted)',
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s',
          }}
        />
      </button>

      {expanded && (
        <>
          <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>
            {t.personalRecordsLegend}
          </p>
          {records.length === 0 ? (
            <EmptyNote>{t.noPRs}</EmptyNote>
          ) : (
            <div className="flex flex-col mt-3" style={{ borderTop: '1px solid var(--border)' }}>
              {records.map((record) => (
                <div
                  key={record.exerciseId}
                  className="flex items-center justify-between text-sm"
                  style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}
                >
                  <div>
                    <p style={{ color: 'var(--text)', fontWeight: 600 }}>{record.name}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {record.weight}kg × {record.reps} · {record.date.slice(0, 10)}
                    </p>
                  </div>
                  <span className="font-bold" style={{ color: 'var(--accent)' }}>
                    {Math.round(record.e1rm)}kg
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function NutritionTrendBlock({ trend, kcalGoal, hasData }) {
  const { t } = useApp()
  return (
    <div className="card">
      <p className="section-title mb-3">{t.nutritionTrend}</p>
      {!hasData ? (
        <EmptyNote>{t.noNutritionData}</EmptyNote>
      ) : (
        // Unlogged days arrive as null so the line breaks instead of diving to zero, which would claim you ate nothing.
        <div style={{ width: '100%', height: CHART_HEIGHT }}>
          <ResponsiveContainer>
            <LineChart data={trend}>
              <XAxis dataKey="dateLabel" tick={AXIS_TICK} interval="preserveStartEnd" />
              <YAxis tick={AXIS_TICK} width={38} />
              <Tooltip />
              {kcalGoal > 0 && (
                <ReferenceLine
                  y={kcalGoal}
                  stroke="var(--muted)"
                  strokeDasharray="4 4"
                  label={{ value: t.goal, fontSize: 10, fill: 'var(--muted)', position: 'insideTopRight' }}
                />
              )}
              <Line
                type="monotone"
                dataKey="kcal"
                stroke="var(--accent-2)"
                strokeWidth={2}
                connectNulls={false}
                dot={{ r: 3, fill: 'var(--accent-2)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export function NutritionSummaryBlock({ summary }) {
  const { t } = useApp()

  if (summary.daysLogged === 0) {
    return (
      <div className="card">
        <p className="text-sm text-center py-2" style={{ color: 'var(--muted)' }}>
          {t.noNutritionData}
        </p>
      </div>
    )
  }

  const tiles = [
    { icon: Utensils, label: t.avgKcal, value: summary.avgKcal.toLocaleString(), unit: t.kcal },
    { icon: Target, label: t.onTarget, value: `${summary.daysOnTarget}/${summary.daysLogged}` },
    { icon: Beef, label: t.avgProtein, value: summary.avgProtein, unit: 'g' },
    { icon: CalendarCheck, label: t.daysLogged, value: summary.daysLogged },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {tiles.map((tile, i) => (
        <StatTile
          key={i}
          icon={tile.icon}
          label={tile.label}
          value={tile.value}
          unit={tile.unit}
          accent="var(--accent-2)"
          accentSoft="var(--accent-2-soft)"
        />
      ))}
    </div>
  )
}
