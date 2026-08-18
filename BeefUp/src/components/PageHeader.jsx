export default function PageHeader({ title, eyebrow, action }) {
  return (
    <div className="flex items-end justify-between">
      <div style={{ minWidth: 0 }}>
        {eyebrow && (
          <p
            className="section-title"
            style={{ marginBottom: 4, color: "var(--accent)" }}
          >
            {eyebrow}
          </p>
        )}
        <h1
          className="display"
          style={{ fontSize: 30, fontWeight: 900, color: "var(--text)", lineHeight: 1.05 }}
        >
          {title}
        </h1>
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}
