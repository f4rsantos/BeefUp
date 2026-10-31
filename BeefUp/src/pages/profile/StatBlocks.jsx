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

const FATIGUE_COLOR = {
  fatigued: 'var(--danger)',
  recovering: 'var(--warn)',
  fresh: 'var(--success)',
  none: 'var(--muted)',
}

const CHART_HEIGHT = 180
const CALENDAR_CELL = 22
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
      <div className="grid gap-3 items-center" style={{ gridTemplateColumns: '4fr 8fr' }}>
        <div>
          <span className="stat-value" style={{ fontSize: 40, color: 'var(--accent)' }}>
            {streak}
          </span>
          <p className="card-meta" style={{ marginTop: 6 }}>
            {t.currentStreakShort}
          </p>
          <p className="card-meta" style={{ marginTop: 8 }}>
            {t.bestStreak}: <span style={{ color: 'var(--text)', fontWeight: 700 }}>{bestStreak}</span>
          </p>
        </div>

        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gridAutoRows: CALENDAR_CELL }}>
          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1
            const { active, isToday } = monthActivity[day] || {}
            return (
              <div
                key={index}
                className="flex items-center justify-center"
                style={{ opacity: isToday ? 1 : 0.6 }}
                title={`${day}`}
              >
                <Flame
                  size={13}
                  style={{
                    color: active ? 'var(--accent)' : 'var(--fill-strong)',
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
        <span className="list-row-icon" style={{ '--row-icon': 'var(--success)', width: 40, height: 40, borderRadius: 12 }}>
          <Footprints size={20} strokeWidth={2.2} />
        </span>
        <div>
          <p className="card-meta">{t.stepsToday}</p>
          <p className="stat-value" style={{ fontSize: 24, marginTop: 4 }}>
            {todaySteps !== null ? todaySteps.toLocaleString() : '–'}
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
                background: entry.value > 0 ? 'var(--success)' : 'var(--fill-strong)',
                opacity: entry.isToday ? 1 : 0.7,
              }}
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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
        <div ref={zoomRef} style={{ width: '100%', height: CHART_HEIGHT, touchAction: 'pan-y' }}>
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
      <div style={{ marginTop: 14 }}>
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
              <span className="text-xs" style={{ color: 'var(--label-2)', width: 72, flexShrink: 0 }}>
                {entry.label}
              </span>
              <div className="flex-1" style={{ background: 'var(--fill)', borderRadius: 6, height: 8 }}>
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
      <CardHead title={t.muscleFatigue} />
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
        className="tap flex items-center justify-between w-full"
        onClick={onToggle}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
      >
        <span className="flex items-baseline gap-2">
          <span className="card-title">{t.personalRecords}</span>
          {records.length > 0 && <span className="card-meta">{records.length}</span>}
        </span>
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
            <div className="flex flex-col mt-3">
              {records.map((record) => (
                <div
                  key={record.exerciseId}
                  className="flex items-center justify-between text-sm"
                  style={{ padding: '10px 0', borderTop: '0.5px solid var(--separator)' }}
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
              <div key={appt.id || idx} className="flex items-center justify-between text-sm" style={{ padding: '10px 12px', background: isToday ? 'var(--accent-soft)' : 'var(--fill)', borderRadius: 14 }}>
                <div className="flex items-center gap-3">
                  <div style={{ background: isToday ? 'var(--accent)' : 'var(--accent-soft)', padding: 8, borderRadius: 10, display: 'flex' }}>
                    <CalendarDays size={16} style={{ color: isToday ? '#fff' : 'var(--accent)' }} />
                  </div>
                  <div>
                    <p style={{ color: isToday ? 'var(--accent)' : 'var(--text)', fontWeight: 600 }}>{isToday ? t.dashToday : dateStr}</p>
                    <p className="text-xs" style={{ color: isToday ? 'var(--accent)' : 'var(--muted)', opacity: isToday ? 0.8 : 1 }}>{t[typeKey] || type}</p>
                  </div>
                </div>
                <span className="tabular font-bold" style={{ color: isToday ? 'var(--accent)' : 'var(--text)', fontSize: 16 }}>
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
