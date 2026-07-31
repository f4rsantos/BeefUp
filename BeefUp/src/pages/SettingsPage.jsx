import { useRef, useState } from "react";
import { Sun, Moon, Monitor, Database, Sparkles, RotateCcw, Dumbbell, Apple,Download, Upload, Check, AlertTriangle, X,} from "lucide-react";
import { useApp } from "../context/AppContext";
import { buildDemoPreset } from "../lib/demoData";
import { parseWorkoutCsv, buildWorkoutCsv, downloadFile, workoutCsvFilename } from "../lib/csvData";
import { buildBackup, parseBackup, restoreBackup, backupFilename } from "../lib/backup";
import { PRESET_ACCENTS } from "../lib/colorTheme";
import ConfirmModal from "../components/ConfirmModal";
import AccentColorModal from "../components/AccentColorModal";
import PageHeader from "../components/PageHeader";

const SETTINGS_ICON_WRAPPER_STYLE = { padding: 8, borderRadius: 10, background: "var(--surface2)", display: "flex" };

function DataRow({ Icon, label, desc, action, primary, busy, onClick }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div style={SETTINGS_ICON_WRAPPER_STYLE}>
          <Icon size={16} style={{ color: "var(--text)" }} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{label}</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>{desc}</p>
        </div>
      </div>
      <button
        className={`btn ${primary ? "btn-primary" : "btn-ghost"} px-3 py-2 text-xs`}
        onClick={onClick}
        disabled={busy}
      >
        {action}
      </button>
    </div>
  );
}

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
    addSession,
    saveSteps,
    setActivePlan,
    resetOnboarding,
    sectionPrefs,
    setSectionPrefs,
    sessions,
  } = useApp();
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [dataBusy, setDataBusy] = useState(false);
  const [dataStatus, setDataStatus] = useState("");
  const [dataError, setDataError] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showExportChoice, setShowExportChoice] = useState(false);
  const [showImportChoice, setShowImportChoice] = useState(false);
  const [pendingRestore, setPendingRestore] = useState(null);
  const importModeRef = useRef("beefup"); // which source the picked file came from
  const csvInputRef = useRef(null);
  const jsonInputRef = useRef(null);

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

  // ── Data: export / import ──
  function resetDataFeedback() {
    setDataStatus("");
    setDataError("");
  }

  async function handleExportFull() {
    resetDataFeedback();
    setShowExportChoice(false);
    setDataBusy(true);
    try {
      const backup = await buildBackup();
      downloadFile(JSON.stringify(backup), backupFilename(), "application/json");
    } catch {
      setDataError(t.importFailed);
    }
    setDataBusy(false);
  }

  function handleExportCsv() {
    resetDataFeedback();
    setShowExportChoice(false);
    downloadFile(buildWorkoutCsv(sessions, lang), workoutCsvFilename(), "text/csv");
  }

  function startImport(mode) {
    resetDataFeedback();
    importModeRef.current = mode;
    setShowImportChoice(false);
    if (mode === "json") jsonInputRef.current?.click();
    else csvInputRef.current?.click();
  }

  async function handlePickCsv(event) {
    const file = event.target.files?.[0];
    // Cleared so picking the same file twice in a row still fires onChange.
    event.target.value = "";
    if (!file) return;

    setDataBusy(true);
    const result = parseWorkoutCsv(await file.text(), importModeRef.current);
    if (result.error) {
      setDataError(result.error === "notBeefUp" ? t.csvNotBeefUp : t.csvNoColumns);
      setDataBusy(false);
      return;
    }

    for (const session of result.sessions) await addSession(session);

    const done = t.importDone
      .replace("{w}", result.sessions.length)
      .replace("{s}", result.setCount);
    const unmatched = result.unmatchedNames.length
      ? ` ${t.unmatchedExercises.replace("{n}", result.unmatchedNames.length)}`
      : "";
    setDataStatus(done + unmatched);
    setDataBusy(false);
  }

  async function handlePickJson(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const backup = parseBackup(await file.text());
    if (!backup) {
      setDataError(t.importFailed);
      return;
    }
    setPendingRestore(backup);
  }

  async function confirmRestore() {
    const backup = pendingRestore;
    setPendingRestore(null);
    setDataBusy(true);
    try {
      await restoreBackup(backup);
      window.location.reload();
    } catch {
      setDataError(t.importFailed);
      setDataBusy(false);
    }
  }

  const chooseLabel = lang === "pt" ? "Escolher" : "Choose";

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

        {/* Data: export / import */}
        <section>
          <p className="section-title mb-1">{t.dataSection}</p>
          <p className="text-xs" style={{ color: "var(--muted)", marginBottom: 6 }}>{t.dataSectionDesc}</p>
          <div className="card flex flex-col gap-4">
            <DataRow
              Icon={Download}
              label={t.exportData}
              desc={t.exportDataDesc}
              action={chooseLabel}
              primary
              busy={dataBusy}
              onClick={() => setShowExportChoice(true)}
            />
            <DataRow
              Icon={Upload}
              label={t.importCsv}
              desc={t.importCsvDesc}
              action={chooseLabel}
              busy={dataBusy}
              onClick={() => setShowImportChoice(true)}
            />
          </div>

          {dataStatus && (
            <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: "var(--success)" }}>
              <Check size={13} />
              {dataStatus}
            </p>
          )}
          {dataError && (
            <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: "var(--warn)" }}>
              <AlertTriangle size={13} />
              {dataError}
            </p>
          )}

          <input
            ref={csvInputRef}
            type="file"
            accept="text/csv,.csv"
            hidden
            onChange={handlePickCsv}
          />
          <input
            ref={jsonInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={handlePickJson}
          />
        </section>
      </div>

      {showExportChoice && (
        <div className="modal-overlay" style={{ alignItems: "center" }} onClick={() => setShowExportChoice(false)}>
          <div className="modal-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-base" style={{ color: "var(--text)" }}>
                {t.exportData}
              </span>
              <button className="btn btn-ghost p-2" onClick={() => setShowExportChoice(false)} aria-label={t.cancel}>
                <X size={18} />
              </button>
            </div>
            <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>{t.exportChoiceQuestion}</p>

            <div className="flex flex-col gap-3">
              <button
                className="card flex items-center gap-3"
                style={{ textAlign: "left" }}
                onClick={handleExportFull}
              >
                <Database size={20} style={{ color: "var(--accent)", flexShrink: 0 }} />
                <div>
                  <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{t.exportChoiceFull}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>{t.exportChoiceFullDesc}</div>
                </div>
              </button>
              <button
                className="card flex items-center gap-3"
                style={{ textAlign: "left" }}
                onClick={handleExportCsv}
              >
                <Download size={20} style={{ color: "var(--accent)", flexShrink: 0 }} />
                <div>
                  <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{t.exportCsv}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>{t.exportCsvDesc}</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportChoice && (
        <div className="modal-overlay" style={{ alignItems: "center" }} onClick={() => setShowImportChoice(false)}>
          <div className="modal-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-base" style={{ color: "var(--text)" }}>
                {t.importCsv}
              </span>
              <button className="btn btn-ghost p-2" onClick={() => setShowImportChoice(false)} aria-label={t.cancel}>
                <X size={18} />
              </button>
            </div>
            <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>{t.importChoiceQuestion}</p>

            <div className="flex flex-col gap-3">
              <button
                className="card flex items-center gap-3"
                style={{ textAlign: "left" }}
                onClick={() => startImport("json")}
              >
                <Database size={20} style={{ color: "var(--accent)", flexShrink: 0 }} />
                <div>
                  <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{t.importSourceJson}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>{t.importSourceJsonDesc}</div>
                </div>
              </button>
              <button
                className="card flex items-center gap-3"
                style={{ textAlign: "left" }}
                onClick={() => startImport("beefup")}
              >
                <Database size={20} style={{ color: "var(--accent)", flexShrink: 0 }} />
                <div>
                  <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{t.importSourceBeefUp}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>{t.importSourceBeefUpDesc}</div>
                </div>
              </button>
              <button
                className="card flex items-center gap-3"
                style={{ textAlign: "left" }}
                onClick={() => startImport("generic")}
              >
                <Upload size={20} style={{ color: "var(--accent)", flexShrink: 0 }} />
                <div>
                  <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{t.importSourceOther}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>{t.importSourceOtherDesc}</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingRestore && (
        <ConfirmModal
          title={t.importBackupTitle}
          message={t.importBackupWarn}
          cancelLabel={t.cancel}
          confirmLabel={t.restore}
          onCancel={() => setPendingRestore(null)}
          onConfirm={confirmRestore}
        />
      )}

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
