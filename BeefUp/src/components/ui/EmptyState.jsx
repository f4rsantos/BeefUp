export default function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={36} strokeWidth={1.6} style={{ color: "var(--muted)", marginBottom: 6 }} />}
      {title && <p className="empty-state-title">{title}</p>}
      {text && <p className="empty-state-text">{text}</p>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}
