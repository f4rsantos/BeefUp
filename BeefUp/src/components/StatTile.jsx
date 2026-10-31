export default function StatTile({ icon: Icon, label, value, unit, accent = "var(--accent)", onClick }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className="card flex flex-col"
      style={{ flex: 1, minWidth: 0, textAlign: "left", padding: 14, gap: 10, cursor: onClick ? "pointer" : "default" }}
    >
      <span className="flex items-center gap-1.5 card-meta" style={{ color: accent, fontWeight: 600 }}>
        {Icon && <Icon size={14} strokeWidth={2.4} />}
        <span className="truncate" style={{ color: "var(--muted)", fontWeight: 500 }}>{label}</span>
      </span>
      <span className="stat-value" style={{ fontSize: 24, color: "var(--text)" }}>
        {value}
        {unit && <span className="card-meta" style={{ fontSize: 14, fontWeight: 500, marginLeft: 3 }}>{unit}</span>}
      </span>
    </Comp>
  );
}
