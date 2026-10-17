import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Lock, Search } from "lucide-react";
import { useApp } from "../context/useApp";
import { useEscapeKey } from "../lib/useEscapeKey";
import { useIsDesktop } from "../lib/useIsDesktop";

// Groups never get the fill; only the page you're on does.
export function StudentNav({ areas, section, onSelect, sheet = false }) {
  const { t } = useApp();
  const [expanded, setExpanded] = useState({});

  function clickArea(a, hasViews, open, active) {
    if (!hasViews) return onSelect(a.id, null, true);
    if (sheet || active) return setExpanded((e) => ({ ...e, [a.id]: !open }));
    setExpanded({ [a.id]: true });
    onSelect(a.id, null, false);
  }

  return (
    <nav className={`dash-snav ${sheet ? "in-sheet" : ""}`} aria-label={t.dashSections}>
      {areas.map((a) => {
        const active = section === a.id;
        const hasViews = a.shared && !!a.views;
        const open = hasViews && (expanded[a.id] ?? (active || sheet));
        return (
          <div key={a.id} className="flex flex-col">
            <button
              type="button"
              className={`dash-snav-item ${hasViews ? "group" : "leaf"} ${active ? "active" : ""}`}
              aria-expanded={hasViews ? open : undefined}
              aria-current={!hasViews && active ? "page" : undefined}
              onClick={() => clickArea(a, hasViews, open, active)}
            >
              <a.Icon size={16} className="dash-snav-icon" />
              <span className="flex-1 truncate">{a.label}</span>
              {!a.shared && <Lock size={12} aria-label={t.dashScopeNotSharedShort} />}
              {hasViews && <ChevronDown size={15} className={`dash-snav-chev ${open ? "open" : ""}`} />}
            </button>
            {open && (
              <div className="dash-snav-sub">
                {a.views.map((v) => {
                  const here = active && a.view === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      className={`dash-snav-subitem ${here ? "active" : ""}`}
                      aria-current={here ? "page" : undefined}
                      onClick={() => onSelect(a.id, v.id, true)}
                    >
                      {v.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

// Phone: the same menu, opened from a bar under the header.
export function StudentNavBar({ areas, section, onSelect }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  useEscapeKey(() => setOpen(false), open);
  const area = areas.find((a) => a.id === section) || areas[0];
  const view = area.shared && area.views ? area.views.find((v) => v.id === area.view) : null;

  return (
    <>
      <button type="button" className="dash-snav-bar" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <area.Icon size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
        <span className="dash-snav-bar-area">{area.label}</span>
        {view && (
          <>
            <ChevronRight size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
            <span className="truncate" style={{ color: "var(--muted)" }}>{view.label}</span>
          </>
        )}
        <ChevronDown size={16} style={{ marginLeft: "auto", color: "var(--muted)", flexShrink: 0 }} />
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={t.dashSections} className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <StudentNav
              areas={areas}
              section={section}
              sheet
              onSelect={(id, viewId, final) => {
                onSelect(id, viewId);
                if (final) setOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

function SwitcherList({ students, currentId, onPick }) {
  const { t } = useApp();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? students.filter((s) => s.name.toLowerCase().includes(q)) : students;

  return (
    <div className="flex flex-col" style={{ gap: 2 }}>
      {students.length > 6 && (
        <label className="dash-search">
          <Search size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.dashSearchClients} aria-label={t.dashSearchClients} autoFocus />
        </label>
      )}
      {shown.map((s) => (
        <button
          key={s.id}
          type="button"
          className={`dash-switch-item ${s.id === currentId ? "active" : ""}`}
          aria-current={s.id === currentId ? "true" : undefined}
          onClick={() => onPick(s.id)}
        >
          <span className="flex-1 truncate">{s.name}</span>
          {s.id === currentId && <Check size={15} style={{ color: "var(--accent)" }} />}
        </button>
      ))}
      {shown.length === 0 && <p className="dash-empty" style={{ padding: 8 }}>{t.noResults}</p>}
    </div>
  );
}

export function StudentSwitcher({ current, students, onSwitch }) {
  const { t } = useApp();
  const isDesktop = useIsDesktop();
  const [open, setOpen] = useState(false);
  useEscapeKey(() => setOpen(false), open);

  if (students.length < 2) return <h2 className="dash-client-name">{current.name}</h2>;

  function pick(id) {
    setOpen(false);
    if (id !== current.id) onSwitch(id);
  }

  const list = <SwitcherList students={students} currentId={current.id} onPick={pick} />;
  return (
    <div style={{ position: "relative", minWidth: 0 }}>
      <h2 className="dash-client-name">
        <button
          type="button"
          className="dash-switch"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          title={t.dashSwitchStudent}
        >
          <span className="truncate">{current.name}</span>
          <ChevronDown size={20} className={`dash-snav-chev ${open ? "open" : ""}`} aria-label={t.dashSwitchStudent} />
        </button>
      </h2>
      {open && isDesktop && (
        <>
          <div className="dash-pop-backdrop" onClick={() => setOpen(false)} />
          <div className="dash-pop">{list}</div>
        </>
      )}
      {open && !isDesktop && (
        <div role="dialog" aria-modal="true" aria-label={t.dashSwitchStudent} className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <p className="section-title mb-3">{t.dashSwitchStudent}</p>
            {list}
          </div>
        </div>
      )}
    </div>
  );
}
