import "./StatTile.css";

export default function StatTile({ icon: Icon, label, value, unit, accent = "var(--accent)", onClick }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className="card flex flex-col st-tile"
    >
      <span className="flex items-center gap-1.5 card-meta st-head" style={{ color: accent }}>
        {Icon && <Icon size={14} strokeWidth={2.4} />}
        <span className="truncate text-muted st-label">{label}</span>
      </span>
      <span className="stat-value text-body st-value">
        {value}
        {unit && <span className="card-meta st-unit">{unit}</span>}
      </span>
    </Comp>
  );
}
