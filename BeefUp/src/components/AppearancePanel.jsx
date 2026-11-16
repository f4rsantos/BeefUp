import { useState } from "react";
import { createPortal } from "react-dom";
import { Check, Plus } from "lucide-react";
import { useApp } from "../context/useApp";
import { useBrand } from "../lib/useBrand";
import { accentHexOf, PRESET_ACCENTS } from "../lib/colorTheme";
import { useThemeOptions, useFontScaleOptions, useLanguageOptions } from "../lib/usePreferenceOptions";
import AccentColorModal from "./AccentColorModal";
import GlassPanel from "./ui/GlassPanel";
import Segmented from "./ui/Segmented";
import ChoiceTiles from "./ui/ChoiceTiles";
import "./AppearancePanel.css";

// Theme, accent, text size and language: the same panel in the phone app's
// Settings and the trainer dashboard's settings.

function FieldLabel({ children }) {
  return <p className="card-meta ap-label">{children}</p>;
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
      options={options.map((o) => ({ ...o, content: <span className="ap-glyph" style={{ fontSize: o.size - 2 }}>A</span> }))}
    />
  );
}

export default function AppearancePanel() {
  const { t, setAccentColor, effectiveAccent, accentChosen, resetAccentToBrand, setCustomAccentColor } = useApp();
  const themeOptions = useThemeOptions();
  const languageOptions = useLanguageOptions();
  const brand = useBrand();
  // Where the colour picker mounts; null = closed.
  const [pickerHost, setPickerHost] = useState(null);
  const closePicker = () => setPickerHost(null);
  const accentHex = accentHexOf(effectiveAccent.accentColor, effectiveAccent.customAccentHex);

  return (
    <GlassPanel title={t.theme}>
      <ChoiceTiles {...themeOptions} label={t.theme} />

      <FieldLabel>{t.accentColor}</FieldLabel>
      <AccentSwatches
        current={effectiveAccent.accentColor}
        isCustom={effectiveAccent.accentColor === "custom"}
        customHex={effectiveAccent.customAccentHex}
        onPreset={setAccentColor}
        onCustom={(e) => setPickerHost(e.currentTarget.closest(".app-shell") ?? document.body)}
        t={t}
      />
      {brand?.color && accentChosen && (
        <button className="text-button ap-brand-color" onClick={resetAccentToBrand}>
          {brand.name ? t.brandUseColor.replace("{name}", brand.name) : t.brandUseColorNoName}
        </button>
      )}

      <FieldLabel>{t.fontSize}</FieldLabel>
      <FontScaleSegmented label={t.fontSize} />

      <FieldLabel>{t.language}</FieldLabel>
      <Segmented {...languageOptions} label={t.language} />

      {/* Portaled to the shell: page scrollers animate with transforms, which
          would trap a fixed overlay inside them. */}
      {pickerHost && createPortal(
        <AccentColorModal
          value={accentHex}
          t={t}
          onSelectPreset={(id) => { setAccentColor(id); closePicker(); }}
          onPickCustom={setCustomAccentColor}
          onClose={closePicker}
        />,
        pickerHost,
      )}
    </GlassPanel>
  );
}
