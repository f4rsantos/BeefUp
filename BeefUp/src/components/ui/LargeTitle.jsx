export default function LargeTitle({ title, eyebrow, actions }) {
  return (
    <header className="large-title">
      <div style={{ minWidth: 0 }}>
        {eyebrow && <p className="large-title-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
      </div>
      {actions && <div className="large-title-actions">{actions}</div>}
    </header>
  );
}
