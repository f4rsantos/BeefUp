import { useThemeOptions, useFontScaleOptions, useLanguageOptions } from "../lib/usePreferenceOptions";

// Theme, accent, text size and language are the same choices wherever they
// are offered — the phone app's settings page and the trainer dashboard.

function selectableButtonStyle(selected) {
  return {
    background: selected ? "var(--grad-accent)" : "transparent",
    color: selected ? "#fff" : "var(--muted)",
    border: selected ? "none" : "1px solid var(--border)",
    borderRadius: 12,
    // Lets four options share a 360px row.
    minWidth: 0,
    paddingInline: 6,
  };
}

function OptionButtons({ value, onChange, options, stacked = true, renderGlyph }) {
  return options.map((option) => (
    <button
      key={option.id}
      onClick={() => onChange(option.id)}
      className={`btn flex-1 py-3 ${stacked ? "flex-col gap-1 text-xs" : "text-sm"}`}
      style={selectableButtonStyle(value === option.id)}
    >
      {renderGlyph?.(option)}
      {option.label}
    </button>
  ));
}

export function ThemeButtons() {
  return <OptionButtons {...useThemeOptions()} renderGlyph={({ icon: Icon }) => <Icon size={16} />} />;
}

export function FontScaleButtons() {
  return (
    <OptionButtons
      {...useFontScaleOptions()}
      renderGlyph={({ size }) => <span style={{ fontSize: size, fontWeight: 800, lineHeight: 1 }}>A</span>}
    />
  );
}

export function LanguageButtons() {
  return <OptionButtons {...useLanguageOptions()} stacked={false} />;
}
