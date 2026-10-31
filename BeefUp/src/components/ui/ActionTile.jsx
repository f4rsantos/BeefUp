export default function ActionTile({ icon: Icon, label, onClick, disabled, color }) {
  return (
    <button
      type="button"
      className="action-tile"
      onClick={onClick}
      disabled={disabled}
      style={color ? { "--tile-color": color } : undefined}
    >
      <Icon size={22} strokeWidth={2.2} className="action-tile-glyph" />
      <span>{label}</span>
    </button>
  );
}
