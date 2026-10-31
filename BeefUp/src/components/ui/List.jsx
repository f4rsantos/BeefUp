import { ChevronRight } from "lucide-react";

export function ListGroup({ header, footer, icons = false, children, className = "" }) {
  return (
    <section className={`list ${className}`}>
      {header && <p className="list-header">{header}</p>}
      <div className={`list-group ${icons ? "has-icons" : ""}`}>{children}</div>
      {footer && <div className="list-footer">{footer}</div>}
    </section>
  );
}

export function ListSlot({ children, className = "" }) {
  return <div className={`list-slot ${className}`}>{children}</div>;
}

export function ListRow({
  icon: Icon,
  iconColor,
  leading,
  title,
  subtitle,
  value,
  accessory,
  chevron = false,
  tone,
  onClick,
  disabled,
  label,
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      className={`list-row ${tone ?? ""}`}
      onClick={onClick}
      disabled={onClick ? disabled : undefined}
      aria-label={label}
    >
      {Icon && (
        <span className="list-row-icon" style={iconColor ? { "--row-icon": iconColor } : undefined}>
          <Icon size={17} strokeWidth={2.2} />
        </span>
      )}
      {leading}
      <span className="list-row-body">
        <span className="list-row-title" style={{ display: "block" }}>{title}</span>
        {subtitle && <span className="list-row-subtitle" style={{ display: "block" }}>{subtitle}</span>}
      </span>
      {value != null && <span className="list-row-value">{value}</span>}
      {accessory}
      {chevron && <ChevronRight size={18} strokeWidth={2.4} className="list-row-chevron" />}
    </Tag>
  );
}
