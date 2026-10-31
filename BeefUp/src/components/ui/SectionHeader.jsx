export default function SectionHeader({ title, meta, actions }) {
  return (
    <div className="section-header">
      <div className="flex items-baseline gap-2" style={{ minWidth: 0 }}>
        <h2 className="section-header-title">{title}</h2>
        {meta != null && <span className="card-meta">{meta}</span>}
      </div>
      {actions && <div className="section-header-actions">{actions}</div>}
    </div>
  );
}
