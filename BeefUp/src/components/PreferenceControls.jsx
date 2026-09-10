import { Monitor, Moon, Sun } from "lucide-react";
import { useApp } from "../context/AppContext";

// Theme, accent, text size and language are the same choices wherever they
// are offered — the phone app's settings page and the trainer dashboard.
// Only the buttons live here; each surface wraps them in its own container,
// because a mobile .card and a desktop .dash-panel are not the same box.

function selectableButtonStyle(selected) {
  return {
    background: selected ? "var(--grad-accent)" : "transparent",
    color: selected ? "#fff" : "var(--muted)",
    border: selected ? "none" : "1px solid var(--border)",
    borderRadius: 12,
  };
}

export function ThemeButtons() {
  const { t, theme, setTheme } = useApp();
  const options = [
    { id: "light", Icon: Sun, label: t.themeLight },
    { id: "dark", Icon: Moon, label: t.themeDark },
    { id: "system", Icon: Monitor, label: t.themeSystem },
  ];
  return options.map(({ id, Icon, label }) => (
    <button
      key={id}
      onClick={() => setTheme(id)}
      className="btn flex-1 flex-col gap-1 py-3 text-xs"
      style={selectableButtonStyle(theme === id)}
    >
      <Icon size={16} />
      {label}
    </button>
  ));
}

export function FontScaleButtons() {
  const { t, fontScale, setFontScale } = useApp();
  const options = [
    { id: "small", size: 14, label: t.fontSizeSmall },
    { id: "medium", size: 17, label: t.fontSizeMedium },
    { id: "large", size: 20, label: t.fontSizeLarge },
    { id: "extraLarge", size: 23, label: t.fontSizeExtraLarge },
  ];
  return options.map(({ id, size, label }) => (
    <button
      key={id}
      onClick={() => setFontScale(id)}
      className="btn flex-1 flex-col gap-1 py-3 text-xs"
      style={selectableButtonStyle(fontScale === id)}
    >
      <span style={{ fontSize: size, fontWeight: 800, lineHeight: 1 }}>A</span>
      {label}
    </button>
  ));
}

export function LanguageButtons() {
  const { t, lang, setLang } = useApp();
  const options = [
    { id: "pt", label: t.langPt },
    { id: "en", label: t.langEn },
  ];
  return options.map(({ id, label }) => (
    <button
      key={id}
      onClick={() => setLang(id)}
      className="btn flex-1 py-3 text-sm"
      style={selectableButtonStyle(lang === id)}
    >
      {label}
    </button>
  ));
}
