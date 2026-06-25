import { useState } from "react";
import { Sun, Moon, Monitor, Activity, Database, Sparkles, RotateCcw } from "lucide-react";
import { useApp } from "../context/AppContext";
import { buildDemoPreset } from "../lib/demoData";

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
    savePbConfig,
    resetOnboarding,
  } = useApp();
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [demoLoaded, setDemoLoaded] = useState(false);

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
    savePbConfig(demo.pbConfig);

    setLoadingDemo(false);
    setDemoLoaded(true);
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div style={{ padding: "38px 20px 16px" }}>
        <h1 className="display" style={{ fontSize: 30, fontWeight: 900, color: "var(--text)" }}>
          {t.settingsTitle}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-5 scrollbar-hide">
        {/* Theme */}
        <section>
          <p className="section-title mb-2">{t.theme}</p>
          <div className="card flex gap-2 p-2">
            {themeOptions.map(({ id, Icon, label }) => (
              <button
                key={id}
                onClick={() => setTheme(id)}
                className="btn flex-1 flex-col gap-1 py-3 text-xs"
                style={{
                  background: theme === id ? "var(--grad-accent)" : "transparent",
                  color: theme === id ? "#fff" : "var(--muted)",
                  border: theme === id ? "none" : "1px solid var(--border)",
                  borderRadius: 12,
                }}
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
                style={{
                  background: lang === id ? "var(--grad-accent)" : "transparent",
                  color: lang === id ? "#fff" : "var(--muted)",
                  border: lang === id ? "none" : "1px solid var(--border)",
                  borderRadius: 12,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="section-title mb-2">
            {lang === "pt" ? "Teste" : "Testing"}
          </p>
          <div className="card flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                style={{
                  padding: 8,
                  borderRadius: 10,
                  background: "var(--surface2)",
                  display: "flex",
                }}
              >
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
              {loadingDemo
                ? lang === "pt"
                  ? "A carregar"
                  : "Loading"
                : lang === "pt"
                  ? "Carregar"
                  : "Load"}
            </button>
          </div>
          {demoLoaded && (
            <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
              {lang === "pt" ? "Preset carregado." : "Demo preset loaded."}
            </p>
          )}

          <div className="card flex items-center justify-between gap-4 mt-3">
            <div className="flex items-center gap-3 min-w-0">
              <div style={{ padding: 8, borderRadius: 10, background: "var(--surface2)", display: "flex" }}>
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
              <div
                style={{
                  padding: 8,
                  borderRadius: 10,
                  background: "var(--surface2)",
                  display: "flex",
                }}
              >
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
