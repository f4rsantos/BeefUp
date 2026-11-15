// The floating glass tab bar with the sliding lens. Used by the phone app's
// bottom dock and the trainer dashboard on a phone.
export default function TabBar({ tabs, active, onSelect, label }) {
  const index = Math.max(0, tabs.findIndex((tab) => tab.id === active));
  return (
    <nav className="tab-bar glass" aria-label={label} style={{ "--count": tabs.length, "--index": index }}>
      <span className="tab-bar-lens" aria-hidden="true" />
      {tabs.map(({ id, Icon, label: tabLabel }) => {
        const on = id === active;
        return (
          <button
            key={id}
            type="button"
            className={`tab-bar-item ${on ? "active" : ""}`}
            onClick={() => onSelect(id)}
            aria-current={on ? "page" : undefined}
          >
            <Icon size={22} strokeWidth={on ? 2.4 : 2} />
            <span>{tabLabel}</span>
          </button>
        );
      })}
    </nav>
  );
}
