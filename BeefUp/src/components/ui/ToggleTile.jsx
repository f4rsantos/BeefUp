export default function ToggleTile({ icon: Icon, label, stateLabel, checked, onChange, disabled, color }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={`toggle-tile ${checked ? "on" : ""}`}
      style={color ? { "--tile-color": color } : undefined}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-tile-glyph">
        <Icon size={20} strokeWidth={2.2} />
      </span>
      <span>
        <span className="toggle-tile-label" style={{ display: "block" }}>{label}</span>
        {stateLabel && <span className="toggle-tile-state" style={{ display: "block" }}>{stateLabel}</span>}
      </span>
    </button>
  );
}
