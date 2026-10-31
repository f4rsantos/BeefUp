export default function Meter({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="meter" role="presentation">
      <div className="meter-fill" style={{ width: `${pct}%`, "--meter-color": color }} />
    </div>
  );
}
