import { useState } from "react";
import { Apple, Database, Dumbbell, Monitor, Moon, Sparkles, Sun } from "lucide-react";
import { useApp } from "../context/AppContext";
import { buildDemoPreset } from "../lib/demoData";
import { PRESET_ACCENTS } from "../lib/colorTheme";
import AccentColorModal from "../components/AccentColorModal";
import BackupSection from "../components/BackupSection";
import PageHeader from "../components/PageHeader";

const SETTINGS_ICON_WRAPPER_STYLE = { padding: 8, borderRadius: 10, background: "var(--surface2)", display: "flex" };

function selectableButtonStyle(selected) {
  return {
    background: selected ? "var(--grad-accent)" : "transparent",
    color: selected ? "#fff" : "var(--muted)",
    border: selected ? "none" : "1px solid var(--border)",
    borderRadius: 12,
  };
}

export default function SettingsPage() {
  const {
    t,
    lang,
    setLang,
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    customAccentHex,
    setCustomAccentColor,
    savePlan,
    saveWorkout,
    setActivePlan,
    sectionPrefs,
    setSectionPrefs,
  } = useApp();
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const sections = [
    { id: "gym", Icon: Dumbbell, label: t.sectionGym },
    { id: "nutrition", Icon: Apple, label: t.nutrition },
  ];

  function toggleSection(id) {
    const next = { ...sectionPrefs, [id]: !sectionPrefs[id] };
    if (!next.gym && !next.nutrition) return; // pelo menos uma secção fica sempre visível
    setSectionPrefs(next);
  }

  const currentAccentHex = accentColor === "custom"
    ? customAccentHex
    : PRESET_ACCENTS.find((p) => p.id === accentColor)?.hex ?? PRESET_ACCENTS[0].hex;

  const themeOptions = [
    { id: "light", Icon: Sun, label: t.themeLight },
    { id: "dark", Icon: Moon, label: t.themeDark },
    { id: "system", Icon: Monitor, label: t.themeSystem },
  ];

  async function loadDemoPreset() {
    setLoadingDemo(true);
    setDemoLoaded(false);
    const demo = buildDemoPreset();

    await Promise.all(demo.workouts.map((workout) => saveWorkout(workout)));
    await savePlan(demo.plan);
    await setActivePlan(demo.plan.id);

    setLoadingDemo(false);
    setDemoLoaded(true);
  }

  const loadDemoLabel = loadingDemo
    ? (t.loading)
    : (t.load);

  const chooseLabel = t.choose;

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <PageHeader title={t.settingsTitle} />

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-6 scrollbar-hide fade-in">
        {/* Theme */}
        <section>
          <p className="section-title" style={{ marginBottom: 6 }}>{t.theme}</p>
          <div className="card flex gap-2 p-2">
            {themeOptions.map(({ id, Icon, label }) => (
              <button
                key={id}
                onClick={() => setTheme(id)}
                className="btn flex-1 flex-col gap-1 py-3 text-xs"
                style={selectableButtonStyle(theme === id)}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Accent color */}
        <section>
          <button
            className="card flex items-center justify-between"
            style={{ width: "100%", textAlign: "left" }}
            onClick={() => setShowColorPicker(true)}
          >
            <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{t.accentColor}</span>
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: currentAccentHex,
                border: "1px solid var(--border)",
                flexShrink: 0,
              }}
            />
          </button>
        </section>

        {/* Language */}
        <section>
          <p className="section-title" style={{ marginBottom: 6 }}>{t.language}</p>
          <div className="card flex gap-2 p-2">
            {[
              { id: "pt", label: t.langPt },
              { id: "en", label: t.langEn },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setLang(id)}
                className="btn flex-1 py-3 text-sm"
                style={selectableButtonStyle(lang === id)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Sections visibility */}
        <section>
          <p className="section-title mb-1">{t.settingsSections}</p>
          <p className="text-xs" style={{ color: "var(--muted)", marginBottom: 6 }}>{t.settingsSectionsDesc}</p>
          <div className="card flex flex-col gap-3">
            {sections.map(({ id, Icon, label }) => (
              <div key={id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div style={SETTINGS_ICON_WRAPPER_STYLE}>
                    <Icon size={16} style={{ color: "var(--text)" }} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{label}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={sectionPrefs[id]}
                  aria-label={label}
                  className={`switch ${sectionPrefs[id] ? "on" : ""}`}
                  disabled={sectionPrefs[id] && !sectionPrefs[id === "gym" ? "nutrition" : "gym"]}
                  onClick={() => toggleSection(id)}
                />
              </div>
            ))}
          </div>
        </section>

        <section>
          <p className="section-title" style={{ marginBottom: 6 }}>
            {t.advanced}
          </p>
          <div className="card flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div style={SETTINGS_ICON_WRAPPER_STYLE}>
                <Database size={16} style={{ color: "var(--text)" }} />
              </div>
              <div className="min-w-0">
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--text)" }}
                >
                  {t.demoPresetTitle}
                </p>
                <p
                  className="text-xs truncate"
                  style={{ color: "var(--muted)" }}
                >
                  {t.demoPresetDesc}
                </p>
              </div>
            </div>
            <button
              className="btn btn-primary px-3 py-2 text-xs"
              onClick={loadDemoPreset}
              disabled={loadingDemo}
            >
              <Sparkles size={14} />
              {loadDemoLabel}
            </button>
          </div>
          {demoLoaded && (
            <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
              {t.demoPresetLoaded}
            </p>
          )}
        </section>

        <BackupSection chooseLabel={chooseLabel} />
      </div>

      {showColorPicker && (
        <AccentColorModal
          value={currentAccentHex}
          t={t}
          onSelectPreset={(id) => { setAccentColor(id); setShowColorPicker(false); }}
          onPickCustom={setCustomAccentColor}
          onClose={() => setShowColorPicker(false)}
        />
      )}
    </div>
  );
}
