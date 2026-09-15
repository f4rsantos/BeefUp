import { useState } from "react";
import { useApp } from "../context/AppContext";
import AccentColorModal from "../components/AccentColorModal";
import { ThemeButtons, FontScaleButtons, LanguageButtons } from "../components/PreferenceControls";
import { accentHexOf } from "../lib/colorTheme";

// The appearance preferences a trainer can actually use. Sound (there are no
// timers here), section visibility (there is no bottom nav), linking to a
// trainer (they are one) and the demo plan (it seeds a solo user's own
// workouts) all belong to the phone app, so they are deliberately absent.
export default function DashboardSettings() {
  const { t, accentColor, setAccentColor, customAccentHex, setCustomAccentColor } = useApp();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const accentHex = accentHexOf(accentColor, customAccentHex);

  return (
    <div className="dash-cal">
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <h2 className="dash-card-title" style={{ marginBottom: "var(--d-5)" }}>{t.settingsTitle}</h2>

        <section className="dash-panel">
          <p className="section-title mb-3">{t.theme}</p>
          <div className="flex gap-2"><ThemeButtons /></div>
        </section>

        <section className="dash-panel">
          <button
            className="flex items-center justify-between w-full"
            style={{ background: "none", border: "none", textAlign: "left", cursor: "pointer" }}
            onClick={() => setShowColorPicker(true)}
          >
            <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{t.accentColor}</span>
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: accentHex,
                border: "1px solid var(--border)",
                flexShrink: 0,
              }}
            />
          </button>
        </section>

        <section className="dash-panel">
          <p className="section-title mb-3">{t.fontSize}</p>
          <div className="flex gap-2"><FontScaleButtons /></div>
        </section>

        <section className="dash-panel">
          <p className="section-title mb-3">{t.language}</p>
          <div className="flex gap-2"><LanguageButtons /></div>
        </section>
      </div>

      {showColorPicker && (
        <AccentColorModal
          value={accentHex}
          t={t}
          onSelectPreset={(id) => { setAccentColor(id); setShowColorPicker(false); }}
          onPickCustom={setCustomAccentColor}
          onClose={() => setShowColorPicker(false)}
        />
      )}
    </div>
  );
}
