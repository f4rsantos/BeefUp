// Compact stat tile. Optional icon, accent color, and gradient surface.
export default function StatTile({
  icon: Icon,
  label,
  value,
  unit,
  accent = "var(--accent)",
  gradient = false,
  onClick,
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className="card"
      style={{
        flex: 1,
        minWidth: 0,
        textAlign: "left",
        padding: 14,
        cursor: onClick ? "pointer" : "default",
        ...(gradient
          ? { background: "var(--grad-accent)", border: "none", color: "#fff" }
          : {}),
      }}
    >
      {Icon && (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 8,
            background: gradient ? "rgba(255,255,255,0.22)" : "var(--accent-soft)",
          }}
        >
          <Icon size={17} style={{ color: gradient ? "#fff" : accent }} />
        </div>
      )}
      <div className="display" style={{ fontSize: 22, fontWeight: 900, lineHeight: 1, color: gradient ? "#fff" : "var(--text)" }}>
        {value}
        {unit && (
          <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 3, opacity: 0.7 }}>{unit}</span>
        )}
      </div>
      <div style={{ fontSize: 11, marginTop: 5, fontWeight: 600, color: gradient ? "rgba(255,255,255,0.85)" : "var(--muted)" }}>
        {label}
      </div>
    </Comp>
  );
}
