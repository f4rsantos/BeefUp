import { useState } from "react";
import { Sun, Moon, Monitor, Activity, Database, Sparkles, RotateCcw, Dumbbell, Apple } from "lucide-react";
import { useApp } from "../context/AppContext";
import { buildDemoPreset } from "../lib/demoData";
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
    savePlan,
    saveWorkout,
    addSession,
    saveSteps,
    setActivePlan,
    resetOnboarding,
    sectionPrefs,
    setSectionPrefs,
  } = useApp();
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [demoLoaded, setDemoLoaded] = useState(false);

  const sections = [
    { id: "gym", Icon: Dumbbell, label: t.sectionGym },
    { id: "nutrition", Icon: Apple, label: t.nutrition },
  ];

  function toggleSection(id) {
    const next = { ...sectionPrefs, [id]: !sectionPrefs[id] };
    if (!next.gym && !next.nutrition) return; // pelo menos uma secção fica sempre visível
    setSectionPrefs(next);
  }

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
    await Promise.all(
      demo.steps.map((step) => saveSteps(step.date, step.count)),
    );
    await addSession(demo.session);
    await setActivePlan(demo.plan.id);

    setLoadingDemo(false);
    setDemoLoaded(true);
  }

  const loadDemoLabel = loadingDemo
    ? (lang === "pt" ? "A carregar" : "Loading")
    : (lang === "pt" ? "Carregar" : "Load");

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <PageHeader title={t.settingsTitle} />

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-5 scrollbar-hide fade-in">
        {/* Theme */}
        <section>
          <p className="section-title mb-2">{t.theme}</p>
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

        {/* Language */}
        <section>
          <p className="section-title mb-2">{t.language}</p>
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
          <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>{t.settingsSectionsDesc}</p>
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
          <p className="section-title mb-2">
            {lang === "pt" ? "Teste" : "Testing"}
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
                  {lang === "pt"
                    ? "Carregar preset de teste"
                    : "Load demo preset"}
                </p>
                <p
                  className="text-xs truncate"
                  style={{ color: "var(--muted)" }}
                >
                  {lang === "pt"
                    ? "Planos, treinos, passos e histórico de exemplo"
                    : "Sample plans, workouts, steps and history"}
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
              {lang === "pt" ? "Preset carregado." : "Demo preset loaded."}
            </p>
          )}

          <div className="card flex items-center justify-between gap-4 mt-3">
            <div className="flex items-center gap-3 min-w-0">
              <div style={SETTINGS_ICON_WRAPPER_STYLE}>
                <RotateCcw size={16} style={{ color: "var(--text)" }} />
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                {t.resetOnboarding}
              </p>
            </div>
            <button className="btn btn-ghost px-3 py-2 text-xs" onClick={resetOnboarding}>
              {lang === "pt" ? "Recomeçar" : "Restart"}
            </button>
          </div>
        </section>

        {/* Health Connect */}
        <section>
          <p className="section-title mb-2">{t.healthConnect}</p>
          <div className="card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div style={SETTINGS_ICON_WRAPPER_STYLE}>
                <Activity size={16} style={{ color: "var(--muted)" }} />
              </div>
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--text)" }}
                >
                  {t.healthConnect}
                </p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  {t.healthConnectDesc}
                </p>
              </div>
            </div>
            <button className="btn btn-ghost text-xs px-3 py-2">
              {t.connect}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
