// A calorie ring where the length represents calories consumed against the daily goal, while the colours show each macro's share.
//
// Deliberately NOT an extension of ProgressRing
//
// Macro shares come from macroShares() in lib/nutritionCalc.js; the arc's total length always comes from the logged `value`.
export default function MacroRing({
  value = 0,
  max = 1,
  shares = { protein: 0, carbs: 0, fat: 0 },
  size = 168,
  stroke = 14,
  track = "var(--accent-2-soft)",
  overColor = "var(--danger)",
  children,
}) {
  const filled = max > 0 ? Math.min(1, value / max) : 0;
  const isOver = max > 0 && value > max;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;

  const order = [
    { key: "protein", color: "var(--protein)" },
    { key: "carbs", color: "var(--carbs)" },
    { key: "fat", color: "var(--fat)" },
  ];

  let offsetSoFar = 0;
  const arcs = order.map(({ key, color }) => {
    const length = (shares[key] ?? 0) * filled * circ;
    const arc = { key, color, length, start: offsetSoFar };
    offsetSoFar += length;
    return arc;
  });

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        {arcs.map((a) => (
          <circle
            key={a.key}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={a.color}
            strokeWidth={stroke}
            strokeLinecap="butt"
            strokeDasharray={`${a.length} ${circ - a.length}`}
            strokeDashoffset={-a.start}
            style={{ transition: "stroke-dasharray 0.5s cubic-bezier(0.16,1,0.3,1), stroke-dashoffset 0.5s cubic-bezier(0.16,1,0.3,1)" }}
          />
        ))}
        {/* Ultrapassagem recebe um contorno externo */}
        {isOver && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r + stroke / 2 + 3}
            fill="none"
            stroke={overColor}
            strokeWidth={2}
          />
        )}
      </svg>
      {children != null && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
