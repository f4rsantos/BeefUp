import { useMemo } from "react";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_TOOLTIP_STYLE } from "../lib/chartTheme";
import { pickTicks, valueScale, yearStarts } from "../lib/exerciseHistory";
import { resolvedExerciseName } from "../lib/exerciseTree";
import { formatSet } from "../lib/setFormat";

const AXIS_TICK = { fontSize: 10, fill: "var(--muted)" };

function locale(lang) {
  return lang === "pt" ? "pt-PT" : undefined;
}

function parseDay(day) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function ExerciseHistoryChart({ points, kind, lang }) {
  const starts = useMemo(() => yearStarts(points), [points]);
  const ticks = useMemo(() => pickTicks(points), [points]);
  const scale = useMemo(() => valueScale(points), [points]);
  const multiYear = starts.length > 0;
  const yearAt = useMemo(() => new Set([0, ...starts]), [starts]);

  function Tick({ x, y, payload }) {
    const point = points[payload.value];
    if (!point) return null;
    const date = parseDay(point.day).toLocaleDateString(locale(lang), { day: "numeric", month: "short" });
    return (
      <g transform={`translate(${x},${y})`}>
        <text y={12} textAnchor="middle" fontSize={10} fill="var(--muted)">{date}</text>
        {multiYear && yearAt.has(payload.value) && (
          <text y={26} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--text)">{point.day.slice(0, 4)}</text>
        )}
      </g>
    );
  }

  function Bubble({ active, payload }) {
    const point = active ? payload?.[0]?.payload : null;
    if (!point) return null;
    const date = parseDay(point.day).toLocaleDateString(locale(lang), { day: "numeric", month: "short", year: "numeric" });
    return (
      <div style={CHART_TOOLTIP_STYLE.contentStyle} className="eh-tip">
        <p style={CHART_TOOLTIP_STYLE.labelStyle}>{date}</p>
        <p>{formatSet(point.set, point.ref)}</p>
        <p style={{ color: "var(--muted)" }}>{resolvedExerciseName(point.ref, lang)}</p>
      </div>
    );
  }

  return (
    <div className="eh-chart" data-kind={kind}>
      <ResponsiveContainer>
        <LineChart data={points} margin={{ top: 14, right: 14, left: 0, bottom: multiYear ? 14 : 0 }}>
          <XAxis
            type="number"
            dataKey="i"
            domain={[-0.5, points.length - 0.5]}
            ticks={ticks}
            tick={Tick}
            height={multiYear ? 40 : 24}
            interval={0}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={AXIS_TICK} width={40} domain={scale.domain} ticks={scale.ticks} axisLine={false} tickLine={false} />
          <Tooltip content={Bubble} cursor={{ stroke: "var(--border)" }} />
          {starts.map((i) => (
            <ReferenceLine key={i} x={i - 0.5} stroke="var(--muted)" strokeOpacity={0.45} strokeWidth={1.5} />
          ))}
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--accent)"
            strokeWidth={2.5}
            dot={{ r: 3.5, fill: "var(--accent)", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }}
            label={points.length === 1 ? { position: "top", fill: "var(--text)", fontSize: 12, fontWeight: 700 } : false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
