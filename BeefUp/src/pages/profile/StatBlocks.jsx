import { todayISO } from '../../lib/planUtils'
import {ChevronDown, Flame, Footprints, Plus, CalendarDays} from 'lucide-react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApp } from '../../context/useApp'
import { BODY_PART_ACCENT } from '../../lib/exerciseTree'
import { CHART_TOOLTIP_STYLE } from '../../lib/chartTheme'
import StatTile from '../../components/StatTile'
import Segmented from '../../components/ui/Segmented'
import EmptyState from '../../components/ui/EmptyState'
import { useChartZoom } from './useChartZoom'
import './StatBlocks.css'

const AXIS_TICK = { fontSize: 10, fill: 'var(--muted)' }

function EmptyNote({ children }) {
  return <EmptyState text={children} />
}

function CardHead({ title, meta }) {
  return (
    <div className="card-head">
      <h2 className="card-title">{title}</h2>
      {meta != null && <span className="card-meta">{meta}</span>}
    </div>
  )
}

export function StreakCalendarBlock({ streak, bestStreak, daysInMonth, monthActivity }) {
  const { t } = useApp()
  return (
    <div className="card">
      <div className="grid gap-3 items-center sb-streak-grid">
        <div>
          <span className="stat-value sb-streak-value">
            {streak}
          </span>
          <p className="card-meta sb-streak-label">
            {t.currentStreakShort}
          </p>
          <p className="card-meta sb-streak-best">
            {t.bestStreak}: <span className="text-body">{bestStreak}</span>
          </p>
        </div>

        <div className="grid gap-1 sb-calendar">
          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1
            const { active, isToday } = monthActivity[day] || {}
            return (
              <div
                key={index}
                className={`flex items-center justify-center sb-day${isToday ? ' today' : ''}${active ? ' active' : ''}`}
                title={`${day}`}
              >
                <Flame size={13} />
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
      className="card text-left w-full flex items-center justify-between sb-steps"
      onClick={onOpen}
    >
      <div className="flex items-center gap-3">
        <span className="list-row-icon sb-steps-icon">
          <Footprints size={20} strokeWidth={2.2} />
        </span>
        <div>
          <p className="card-meta">{t.stepsToday}</p>
          <p className="stat-value sb-steps-value">
            {todaySteps !== null ? todaySteps.toLocaleString() : '–'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-end gap-1 min-w-[72px] justify-end" aria-hidden="true">
          {weekSteps.map((entry, index) => (
            <div
              key={index}
              className={`rounded-full sb-step-bar${entry.value > 0 ? ' has' : ''}${entry.isToday ? ' today' : ''}`}
              title={`${entry.value.toLocaleString()} ${t.steps}`}
              style={{ height: 10 + Math.round((entry.value / maxWeekSteps) * 26) }}
            />
          ))}
        </div>
        <span className="icon-btn sm" aria-hidden="true"><Plus size={15} strokeWidth={2.4} /></span>
      </div>
    </button>
  )
}

export function WorkoutSummaryBlock({ tiles }) {
  return (
    <div className="sb-tiles">
      {tiles.map((tile, i) => (
        <StatTile key={i} icon={tile.icon} label={tile.label} value={tile.value} unit={tile.unit} />
      ))}
    </div>
  )
}

export function ProgressBlock({ chartData, hasSessions, metric, onMetricChange, days, minDays, maxDays, onDaysChange }) {
  const { t } = useApp()
  const metricLabels = { duration: t.duration, volume: t.volume, reps: t.reps }
  const zoomRef = useChartZoom({ days, minDays, maxDays, onZoom: onDaysChange })
  return (
    <div className="card">
      <CardHead title={t.progress} meta={hasSessions ? `${days}d` : null} />
      {!hasSessions ? (
        <EmptyNote>{t.noSessionsYet}</EmptyNote>
      ) : (
        <div ref={zoomRef} className="sb-chart">
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <XAxis dataKey="dateLabel" tick={AXIS_TICK} interval="preserveStartEnd" axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} width={32} axisLine={false} tickLine={false} />
              <Tooltip {...CHART_TOOLTIP_STYLE} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--accent)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: 'var(--accent)', stroke: 'var(--surface)', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="sb-metric">
        <Segmented
          label={t.progress}
          value={metric}
          onChange={onMetricChange}
          options={Object.entries(metricLabels).map(([id, label]) => ({ id, label }))}
        />
      </div>
    </div>
  )
}

export function MuscleDistributionBlock({ distribution, maxCount }) {
  const { t } = useApp()
  return (
    <div className="card">
      <CardHead title={t.muscleDistribution} />
      {distribution.length === 0 ? (
        <EmptyNote>{t.noMeasures}</EmptyNote>
      ) : (
        <div className="flex flex-col gap-2">
          {distribution.map((entry) => (
            <div key={entry.bodyPart} className="flex items-center gap-3">
              <span className="text-xs sb-dist-label">
                {entry.label}
              </span>
              <div className="flex-1 sb-dist-track">
                <div
                  className="sb-dist-bar"
                  style={{
                    width: `${(entry.count / maxCount) * 100}%`,
                    background: BODY_PART_ACCENT[entry.bodyPart] ?? 'var(--accent)',
                  }}
                />
              </div>
              <span className="text-xs font-semibold text-body sb-dist-count">
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
      <CardHead title={t.muscleFatigue} />
      <div className="flex flex-col gap-2">
        {fatigue.map((group) => (
          <div key={group.bodyPart} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className={`sb-fatigue-dot ${group.level}`} />
              <span className="text-body">{group.label}</span>
            </div>
            <span className="text-xs text-muted">
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
        className="tap flex items-center justify-between w-full sb-pr-toggle"
        onClick={onToggle}
      >
        <span className="flex items-baseline gap-2">
          <span className="card-title">{t.personalRecords}</span>
          {records.length > 0 && <span className="card-meta">{records.length}</span>}
        </span>
        <ChevronDown className={`text-muted sb-chevron${expanded ? ' open' : ''}`} size={18} />
      </button>

      {expanded && (
        <>
          <p className="text-xs mt-3 text-muted">
            {t.personalRecordsLegend}
          </p>
          {records.length === 0 ? (
            <EmptyNote>{t.noPRs}</EmptyNote>
          ) : (
            <div className="flex flex-col mt-3">
              {records.map((record) => (
                <div
                  key={record.exerciseId}
                  className="flex items-center justify-between text-sm sb-pr-row"
                >
                  <div>
                    <p className="text-body sb-pr-name">{record.name}</p>
                    <p className="text-xs text-muted">
                      {record.weight}kg × {record.reps} · {record.date.slice(0, 10)}
                    </p>
                  </div>
                  <span className="font-bold sb-pr-value">
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

export function NextAppointmentsBlock({ appointments }) {
  const { t, lang } = useApp()
  return (
    <div className="card">
      <CardHead title={t.clientNextAppointment} />
      {appointments.length === 0 ? (
        <EmptyNote>{t.clientNoUpcomingAppointments}</EmptyNote>
      ) : (
        <div className="flex flex-col gap-2">
          {appointments.map((appt, idx) => {
            const isToday = appt.date === todayISO();
            const dateParts = appt.date.split('-');
            const d = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
            const dateStr = d.toLocaleDateString(lang === 'pt' ? 'pt-PT' : undefined, { weekday: 'short', day: 'numeric', month: 'short' });
            const type = appt.type || 'consulta'
            const typeKey = 'dashAppt' + type.charAt(0).toUpperCase() + type.slice(1)
            return (
              <div key={appt.id || idx} className={`flex items-center justify-between text-sm sb-appt${isToday ? ' today' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="sb-appt-icon">
                    <CalendarDays size={16} />
                  </div>
                  <div>
                    <p className="sb-appt-date">{isToday ? t.dashToday : dateStr}</p>
                    <p className="text-xs sb-appt-type">{t[typeKey] || type}</p>
                  </div>
                </div>
                <span className="tabular font-bold sb-appt-time">
                  {appt.time}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
