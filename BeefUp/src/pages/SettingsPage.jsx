import { useEffect, useState } from "react";
import { Apple, Database, Dumbbell, Monitor, Moon, RefreshCw, Sparkles, Sun, UserCheck, Volume2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { buildDemoPreset } from "../lib/demoData";
import { PRESET_ACCENTS } from "../lib/colorTheme";
import { isConfigured } from "../lib/auth";
import { getLink, setScopes as applyScopes, unlink } from "../lib/sync/link";
import { useSync } from "../lib/sync/useSync";
import AccentColorModal from "../components/AccentColorModal";
import BackupSection from "../components/BackupSection";
import ConfirmModal from "../components/ConfirmModal";
import PageHeader from "../components/PageHeader";
import TrainerLinkModal from "../components/TrainerLinkModal";

const SUPABASE_CONFIGURED = isConfigured();
const SCOPE_IDS = ["workouts", "nutrition", "measures"];

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
    fontScale,
    setFontScale,
    soundEnabled,
    setSoundEnabled,
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
  const [showTrainerLink, setShowTrainerLink] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [trainerLink, setTrainerLink] = useState(null);
  const [scopeSaving, setScopeSaving] = useState(false);
  const [scopeError, setScopeError] = useState(false);
  const [unlinkError, setUnlinkError] = useState(false);
  const { status: syncStatus, lastSyncAt, syncNow } = useSync();

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;
    getLink().then(setTrainerLink).catch(() => setTrainerLink(null));
  }, []);

  async function toggleTrainerScope(id) {
    if (!trainerLink) return;
    const next = trainerLink.scopes.includes(id)
      ? trainerLink.scopes.filter((s) => s !== id)
      : [...trainerLink.scopes, id];
    setScopeSaving(true);
    setScopeError(false);
    try {
      setTrainerLink(await applyScopes(next));
    } catch {
      setScopeError(true);
    } finally {
      setScopeSaving(false);
    }
  }

  async function handleUnlink() {
    setUnlinkError(false);
    try {
      await unlink();
      setTrainerLink(null);
      setShowUnlinkConfirm(false);
    } catch {
      setUnlinkError(true);
    }
  }

  const syncStatusLabel = {
    off: t.trainerSyncStatusOff,
    idle: t.trainerSyncStatusIdle,
    syncing: t.trainerSyncStatusSyncing,
    offline: t.trainerSyncStatusOffline,
    error: t.trainerSyncStatusError,
  }[syncStatus] ?? t.trainerSyncStatusOff;

  const lastSyncedLabel = lastSyncAt
    ? t.trainerLastSyncedAt.replace("{time}", new Date(lastSyncAt).toLocaleString(lang === "pt" ? "pt-PT" : undefined))
    : t.trainerNeverSynced;

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

  const fontScaleOptions = [
    { id: "small", size: 14, label: t.fontSizeSmall },
    { id: "medium", size: 17, label: t.fontSizeMedium },
    { id: "large", size: 20, label: t.fontSizeLarge },
    { id: "extraLarge", size: 23, label: t.fontSizeExtraLarge },
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
      <div
        className="flex-1 overflow-y-auto pb-6 flex flex-col gap-6 scrollbar-hide fade-in"
        style={{ paddingTop: "var(--page-py-top)", paddingLeft: "var(--page-px)", paddingRight: "var(--page-px)" }}
      >
        <PageHeader title={t.settingsTitle} />

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

        {/* Font scale */}
        <section>
          <p className="section-title" style={{ marginBottom: 6 }}>{t.fontSize}</p>
          <div className="card flex gap-2 p-2">
            {fontScaleOptions.map(({ id, size, label }) => (
              <button
                key={id}
                onClick={() => setFontScale(id)}
                className="btn flex-1 flex-col gap-1 py-3 text-xs"
                style={selectableButtonStyle(fontScale === id)}
              >
                <span style={{ fontSize: size, fontWeight: 800, lineHeight: 1 }}>A</span>
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Sound */}
        <section>
          <p className="section-title" style={{ marginBottom: 6 }}>{t.sound}</p>
          <div className="card flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div style={SETTINGS_ICON_WRAPPER_STYLE}>
                <Volume2 size={16} style={{ color: "var(--text)" }} />
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{t.soundToggle}</p>
            </div>
            <button
              role="switch"
              aria-checked={soundEnabled}
              aria-label={t.soundToggle}
              className={`switch ${soundEnabled ? "on" : ""}`}
              onClick={() => setSoundEnabled(!soundEnabled)}
            />
          </div>
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

        {/* Personal trainer link */}
        <section>
          <p className="section-title" style={{ marginBottom: 6 }}>{t.trainerSectionTitle}</p>
          {!SUPABASE_CONFIGURED ? (
            <div className="card">
              <p className="text-sm" style={{ color: "var(--muted)" }}>{t.trainerUnavailable}</p>
            </div>
          ) : !trainerLink ? (
            <div className="card flex flex-col gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div style={SETTINGS_ICON_WRAPPER_STYLE}>
                  <UserCheck size={16} style={{ color: "var(--text)" }} />
                </div>
                <p className="text-sm" style={{ color: "var(--text)" }}>{t.trainerLinkExplain}</p>
              </div>
              <button className="btn btn-primary w-full" onClick={() => setShowTrainerLink(true)}>
                {t.trainerLinkButton}
              </button>
            </div>
          ) : (
            <div className="card flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div style={SETTINGS_ICON_WRAPPER_STYLE}>
                    <UserCheck size={16} style={{ color: "var(--text)" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
                      {trainerLink.trainerName}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--muted)" }}>{syncStatusLabel}</p>
                  </div>
                </div>
                <button
                  className="btn btn-ghost p-2"
                  onClick={() => syncNow?.()}
                  disabled={syncStatus === "syncing"}
                  aria-label={t.trainerSyncNowLabel}
                >
                  <RefreshCw size={14} />
                </button>
              </div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>{lastSyncedLabel}</p>

              <div className="divider" />

              <p className="section-title" style={{ fontSize: 12 }}>{t.trainerShareSectionTitle}</p>
              {SCOPE_IDS.map((id) => (
                <div key={id} className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{t[id]}</p>
                  <button
                    role="switch"
                    aria-checked={trainerLink.scopes.includes(id)}
                    aria-label={t[id]}
                    className={`switch ${trainerLink.scopes.includes(id) ? "on" : ""}`}
                    disabled={scopeSaving}
                    onClick={() => toggleTrainerScope(id)}
                  />
                </div>
              ))}
              <p className="text-xs" style={{ color: "var(--muted)" }}>{t.trainerScopesNote}</p>
              {scopeError && (
                <p className="text-xs" style={{ color: "var(--danger)" }}>{t.trainerScopeUpdateFailed}</p>
              )}

              <div className="divider" />

              <button
                className="btn btn-ghost w-full"
                style={{ color: "var(--danger)" }}
                onClick={() => setShowUnlinkConfirm(true)}
              >
                {t.trainerUnlinkButton}
              </button>
              {unlinkError && (
                <p className="text-xs" style={{ color: "var(--danger)" }}>{t.trainerUnlinkFailed}</p>
              )}
            </div>
          )}
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

      {showTrainerLink && (
        <TrainerLinkModal
          onClose={() => setShowTrainerLink(false)}
          onLinked={(link) => setTrainerLink(link)}
        />
      )}

      {showUnlinkConfirm && (
        <ConfirmModal
          title={t.trainerUnlinkTitle}
          message={t.trainerUnlinkMessage}
          cancelLabel={t.cancel}
          confirmLabel={t.trainerUnlinkButton}
          onCancel={() => setShowUnlinkConfirm(false)}
          onConfirm={handleUnlink}
        />
      )}
    </div>
  );
}
