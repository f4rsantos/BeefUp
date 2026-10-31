import { useBrand } from "../lib/useBrand";
import { useEffect, useState } from "react";
import { Apple, Check, Dumbbell, Plus, RefreshCw, Smartphone, Sparkles, UserCheck, Volume2 } from "lucide-react";
import { useApp } from "../context/useApp";
import { buildDemoPreset } from "../lib/demoData";
import { accentHexOf, PRESET_ACCENTS } from "../lib/colorTheme";
import { useSupabaseConfigured } from "../lib/useSupabaseConfig";
import { getLink, setScopes as applyScopes, unlink } from "../lib/sync/link";
import { useSync } from "../lib/sync/useSync";
import AccentColorModal from "../components/AccentColorModal";
import { useThemeOptions, useFontScaleOptions, useLanguageOptions } from "../lib/usePreferenceOptions";
import BackupSection from "../components/BackupSection";
import ConfirmModal from "../components/ConfirmModal";
import TrainerLinkModal from "../components/TrainerLinkModal";
import Screen from "../components/ui/Screen";
import LargeTitle from "../components/ui/LargeTitle";
import Segmented from "../components/ui/Segmented";
import ChoiceTiles from "../components/ui/ChoiceTiles";
import ToggleTile from "../components/ui/ToggleTile";
import GlassPanel from "../components/ui/GlassPanel";
import SectionHeader from "../components/ui/SectionHeader";
import IconButton from "../components/ui/IconButton";

const SCOPE_IDS = ["workouts", "nutrition", "measures", "calendar"];

const TILE_COLORS = {
  sound: "#ff375f",
  awake: "#0a84ff",
  gym: "var(--accent)",
  nutrition: "#30c25a",
};

function FieldLabel({ children }) {
  return <p className="card-meta" style={{ margin: "18px 2px 10px", fontWeight: 600 }}>{children}</p>;
}

function AccentSwatches({ current, isCustom, customHex, onPreset, onCustom, t }) {
  return (
    <div className="swatches" role="radiogroup" aria-label={t.accentColor}>
      {PRESET_ACCENTS.map(({ id, hex, label }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={current === id}
          aria-label={t[label]}
          title={t[label]}
          className={`swatch ${current === id ? "on" : ""}`}
          style={{ "--swatch": hex }}
          onClick={() => onPreset(id)}
        >
          {current === id && <Check size={18} strokeWidth={3} color="#fff" />}
        </button>
      ))}
      <button
        type="button"
        aria-label={t.accentColor}
        title={t.accentColor}
        className={`swatch more ${isCustom ? "on" : ""}`}
        style={{ "--swatch": isCustom ? customHex : "transparent" }}
        onClick={onCustom}
      >
        {isCustom ? <Check size={18} strokeWidth={3} /> : <Plus size={18} strokeWidth={3} />}
      </button>
    </div>
  );
}

function FontScaleSegmented({ label }) {
  const { options, ...rest } = useFontScaleOptions();
  return (
    <Segmented
      {...rest}
      label={label}
      options={options.map((o) => ({ ...o, content: <span style={{ fontSize: o.size - 2, fontWeight: 700, lineHeight: 1 }}>A</span> }))}
    />
  );
}

export default function SettingsPage() {
  const {
    t,
    lang,
    soundEnabled,
    setSoundEnabled,
    keepAwake,
    setKeepAwake,
    setAccentColor,
    effectiveAccent,
    accentChosen,
    resetAccentToBrand,
    setCustomAccentColor,
    savePlan,
    saveWorkout,
    setActivePlan,
    sectionPrefs,
    setSectionPrefs,
  } = useApp();
  const themeOptions = useThemeOptions();
  const languageOptions = useLanguageOptions();
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
  const configured = useSupabaseConfigured();
  const brand = useBrand();

  useEffect(() => {
    if (!configured) return;
    getLink().then(setTrainerLink).catch(() => setTrainerLink(null));
  }, [configured]);

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

  const stateLabel = (on) => (on ? t.toggleOn : t.toggleOff);

  function toggleSection(id) {
    const next = { ...sectionPrefs, [id]: !sectionPrefs[id] };
    if (!next.gym && !next.nutrition) return;
    setSectionPrefs(next);
  }

  const sections = [
    { id: "gym", Icon: Dumbbell, label: t.sectionGym },
    { id: "nutrition", Icon: Apple, label: t.nutrition },
  ];

  const currentAccentHex = accentHexOf(effectiveAccent.accentColor, effectiveAccent.customAccentHex);

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

  const demoAction = {
    icon: Sparkles,
    color: "var(--warn)",
    label: loadingDemo ? t.loading : demoLoaded ? t.demoPresetLoaded : t.demoPresetTitle,
    disabled: loadingDemo,
    onClick: loadDemoPreset,
  };

  const modals = (
    <>
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
    </>
  );

  return (
    <Screen gap={28} after={modals}>
      <LargeTitle title={t.settingsTitle} />

      <GlassPanel title={t.theme}>
        <ChoiceTiles {...themeOptions} label={t.theme} />

        <FieldLabel>{t.accentColor}</FieldLabel>
        <AccentSwatches
          current={effectiveAccent.accentColor}
          isCustom={effectiveAccent.accentColor === "custom"}
          customHex={effectiveAccent.customAccentHex}
          onPreset={setAccentColor}
          onCustom={() => setShowColorPicker(true)}
          t={t}
        />
        {brand?.color && accentChosen && (
          <button className="text-button" style={{ marginTop: 10 }} onClick={resetAccentToBrand}>
            {brand.name ? t.brandUseColor.replace("{name}", brand.name) : t.brandUseColorNoName}
          </button>
        )}

        <FieldLabel>{t.fontSize}</FieldLabel>
        <FontScaleSegmented label={t.fontSize} />

        <FieldLabel>{t.language}</FieldLabel>
        <Segmented {...languageOptions} label={t.language} />
      </GlassPanel>

      <section>
        <SectionHeader title={t.sound} />
        <div className="toggle-tiles">
          <ToggleTile
            icon={Volume2}
            color={TILE_COLORS.sound}
            label={t.soundToggle}
            stateLabel={stateLabel(soundEnabled)}
            checked={soundEnabled}
            onChange={setSoundEnabled}
          />
          {"wakeLock" in navigator && (
            <ToggleTile
              icon={Smartphone}
              color={TILE_COLORS.awake}
              label={t.keepAwakeToggle}
              stateLabel={stateLabel(keepAwake)}
              checked={keepAwake}
              onChange={setKeepAwake}
            />
          )}
        </div>
        {"wakeLock" in navigator && <p className="list-footer">{t.keepAwakeDesc}</p>}
      </section>

      <section>
        <SectionHeader title={t.settingsSections} />
        <div className="toggle-tiles">
          {sections.map(({ id, Icon, label }) => (
            <ToggleTile
              key={id}
              icon={Icon}
              color={TILE_COLORS[id]}
              label={label}
              stateLabel={stateLabel(sectionPrefs[id])}
              checked={sectionPrefs[id]}
              disabled={sectionPrefs[id] && !sectionPrefs[id === "gym" ? "nutrition" : "gym"]}
              onChange={() => toggleSection(id)}
            />
          ))}
        </div>
        <p className="list-footer">{t.settingsSectionsDesc}</p>
      </section>

      <GlassPanel title={t.trainerSectionTitle}>
        {!configured ? (
          <p className="card-meta" style={{ fontSize: 15, lineHeight: 1.45 }}>{t.trainerUnavailable}</p>
        ) : !trainerLink ? (
          <div className="flex flex-col" style={{ gap: 16 }}>
            <div className="flex items-center" style={{ gap: 14 }}>
              <span className="feature-card-orb" style={{ width: 48, height: 48 }}><UserCheck size={22} /></span>
              <p className="card-meta" style={{ fontSize: 15, lineHeight: 1.45 }}>{t.trainerLinkExplain}</p>
            </div>
            <button className="btn btn-primary w-full" onClick={() => setShowTrainerLink(true)}>
              {t.trainerLinkButton}
            </button>
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 18 }}>
            <div className="flex items-center" style={{ gap: 14 }}>
              <span className="feature-card-orb" style={{ width: 48, height: 48 }}><UserCheck size={22} /></span>
              <div className="flex-1" style={{ minWidth: 0 }}>
                <p className="card-title truncate">{trainerLink.trainerName}</p>
                <p className="card-meta truncate">{syncStatusLabel} · {lastSyncedLabel}</p>
              </div>
              <IconButton
                icon={RefreshCw}
                label={t.trainerSyncNowLabel}
                disabled={syncStatus === "syncing"}
                onClick={() => syncNow?.()}
              />
            </div>

            <div>
              <p className="card-meta" style={{ fontWeight: 600, marginBottom: 10 }}>{t.trainerShareSectionTitle}</p>
              <div className="flex flex-wrap" style={{ gap: 8 }}>
                {SCOPE_IDS.map((id) => {
                  const on = trainerLink.scopes.includes(id);
                  return (
                    <button
                      key={id}
                      role="switch"
                      aria-checked={on}
                      className={`chip ${on ? "active" : ""}`}
                      disabled={scopeSaving}
                      onClick={() => toggleTrainerScope(id)}
                    >
                      {on && <Check size={14} strokeWidth={3} />}
                      {t[id]}
                    </button>
                  );
                })}
              </div>
              <p className="card-meta" style={{ marginTop: 10, lineHeight: 1.45 }}>{t.trainerScopesNote}</p>
              {scopeError && <p className="card-meta" style={{ color: "var(--danger)", marginTop: 6 }}>{t.trainerScopeUpdateFailed}</p>}
            </div>

            <button className="btn btn-danger w-full" onClick={() => setShowUnlinkConfirm(true)}>
              {t.trainerUnlinkButton}
            </button>
            {unlinkError && <p className="card-meta" style={{ color: "var(--danger)" }}>{t.trainerUnlinkFailed}</p>}
          </div>
        )}
      </GlassPanel>

      <BackupSection extraActions={[demoAction]} />

      {brand && <p className="brand-credit">{t.brandCredit}</p>}
    </Screen>
  );
}
