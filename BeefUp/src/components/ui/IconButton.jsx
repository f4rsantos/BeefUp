export default function IconButton({ icon: Icon, label, onClick, variant = "", size = "", iconSize, disabled, className = "", children, ...rest }) {
  const glyph = iconSize ?? (size === "sm" ? 15 : size === "lg" ? 20 : 17);
  return (
    <button
      type="button"
      className={`icon-btn ${variant} ${size} ${className}`}
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      {...rest}
    >
      {Icon ? <Icon size={glyph} strokeWidth={2.2} /> : children}
    </button>
  );
}
