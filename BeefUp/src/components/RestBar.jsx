function clock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// Rest after a set: pinned to the bottom, the one thing to watch between sets.
export default function RestBar({ remaining, total, onAdjust, onSkip, t }) {
  const progress = total > 0 ? Math.min(1, (total - remaining) / total) : 0;
  const pillStyle = {
    background: "var(--surface2)",
    border: "none",
    borderRadius: 12,
    padding: "0 12px",
    fontSize: 14,
    fontWeight: 700,
    color: "var(--text)",
    cursor: "pointer",
  };

  return (
    <div
      role="timer"
      aria-label={t.rest}
      style={{
        position: "sticky",
        bottom: 0,
        marginTop: "auto",
        padding: "12px var(--page-px) max(12px, env(safe-area-inset-bottom))",
        background: "var(--surface)",
        borderTop: "1px solid var(--border)",
        boxShadow: "var(--shadow-md)",
        zIndex: 5,
      }}
    >
      <div className="flex items-center" style={{ gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="text-xs" style={{ color: "var(--muted)", fontWeight: 600 }}>{t.rest}</p>
          <p
            className="display tabular-nums"
            aria-live="off"
            style={{ fontSize: 34, fontWeight: 900, lineHeight: 1, color: "var(--text)" }}
          >
            {clock(remaining)}
          </p>
        </div>
        <button className="tap" style={pillStyle} onClick={() => onAdjust(-15)} aria-label={t.restLess}>−15</button>
        <button className="tap" style={pillStyle} onClick={() => onAdjust(15)} aria-label={t.restMore}>+15</button>
        <button className="btn btn-primary" style={{ padding: "0 16px", fontSize: 14 }} onClick={onSkip}>
          {t.skipRest}
        </button>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: "var(--surface2)", marginTop: 10, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${progress * 100}%`,
            background: "var(--grad-accent)",
            borderRadius: 999,
            transition: "width 1s linear",
          }}
        />
      </div>
    </div>
  );
}
