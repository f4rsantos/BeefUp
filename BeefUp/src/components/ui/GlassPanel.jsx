export default function GlassPanel({ title, meta, actions, footer, children, className = "", style }) {
  return (
    <section className={`card ${className}`} style={style}>
      {(title || actions) && (
        <div className="card-head">
          <div className="flex items-baseline gap-2" style={{ minWidth: 0 }}>
            {title && <h2 className="card-title">{title}</h2>}
            {meta != null && <span className="card-meta">{meta}</span>}
          </div>
          {actions}
        </div>
      )}
      {children}
      {footer && <p className="card-meta" style={{ marginTop: 12, lineHeight: 1.45 }}>{footer}</p>}
    </section>
  );
}
