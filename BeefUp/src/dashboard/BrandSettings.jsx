import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { useApp } from "../context/useApp";
import { useBrand } from "../lib/useBrand";
import { saveOwnBrand, removeOwnBrand, refreshOwnBrand, BRAND_NAME_MAX } from "../lib/brand";
import { fileToLogoDataUrl } from "../lib/brandLogo";
import { deriveAccentTokens, PRESET_ACCENTS } from "../lib/colorTheme";
import { friendlyError } from "../lib/friendlyError";
import ConfirmModal from "../components/ConfirmModal";
import { PanelHead } from "./parts";

const EMPTY = { name: "", color: PRESET_ACCENTS[0].hex, logo: "" };

function toForm(brand) {
  return brand ? { name: brand.name || "", color: brand.color || EMPTY.color, logo: brand.logo || "" } : EMPTY;
}

export default function BrandSettings() {
  const { t, resetAccentToBrand } = useApp();
  const saved = useBrand();
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [justSaved, setJustSaved] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    refreshOwnBrand().catch(() => {});
  }, []);

  const base = toForm(saved);
  const form = draft ?? base;
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(base);
  const canSave = dirty && form.name.trim() !== "" && !busy;
  const tokens = deriveAccentTokens(form.color).light;

  function edit(patch) {
    setDraft({ ...form, ...patch });
    setJustSaved(false);
    setError("");
  }

  async function pickLogo(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      edit({ logo: await fileToLogoDataUrl(file) });
    } catch (err) {
      setError(err.message === "size" ? t.brandLogoTooLarge : t.brandLogoInvalid);
    }
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      await saveOwnBrand(form);
      resetAccentToBrand();
      setDraft(null);
      setJustSaved(true);
    } catch (e) {
      setError(friendlyError(e, t));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError("");
    try {
      await removeOwnBrand();
      setDraft(null);
      setJustSaved(false);
      setConfirmRemove(false);
    } catch (e) {
      setError(friendlyError(e, t));
      setConfirmRemove(false);
    } finally {
      setBusy(false);
    }
  }

  const status = dirty ? t.brandUnsaved : justSaved ? t.brandSaved : "";

  return (
    <section className="dash-panel">
      <PanelHead
        title={t.brandTitle}
        desc={t.brandDesc}
        actions={
          <>
            <span className={`dash-savebar-status ${dirty ? "unsaved" : ""}`} role="status">
              {dirty && <span className="dash-dot warn" />}
              {status}
            </span>
            {dirty && (
              <button className="btn btn-ghost" onClick={() => { setDraft(null); setError(""); }} disabled={busy}>
                {t.brandDiscard}
              </button>
            )}
            <button className="btn btn-primary" onClick={save} disabled={!canSave}>{t.brandSave}</button>
          </>
        }
      />
      {error && <p className="text-sm mb-3" style={{ color: "var(--danger)" }}>{error}</p>}

      <div className="dash-brand-grid">
        <div>
          <div className="dash-field">
            <label className="section-title" htmlFor="brand-name">{t.brandName}</label>
            <input
              id="brand-name"
              className="field"
              value={form.name}
              maxLength={BRAND_NAME_MAX}
              placeholder={t.brandNamePlaceholder}
              onChange={(e) => edit({ name: e.target.value })}
            />
            {dirty && form.name.trim() === "" && <p className="dash-empty">{t.brandNameRequired}</p>}
          </div>

          <div className="dash-field">
            <span className="section-title">{t.brandColor}</span>
            <div className="dash-swatches">
              <input
                type="color"
                className="dash-color-input"
                value={form.color}
                aria-label={t.brandColor}
                onChange={(e) => edit({ color: e.target.value })}
              />
              <span className="tabular dash-color-hex">{form.color}</span>
              {PRESET_ACCENTS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`dash-swatch ${form.color.toLowerCase() === p.hex ? "on" : ""}`}
                  style={{ background: p.hex }}
                  aria-label={t[p.label]}
                  aria-pressed={form.color.toLowerCase() === p.hex}
                  onClick={() => edit({ color: p.hex })}
                />
              ))}
            </div>
          </div>

          <div className="dash-field">
            <span className="section-title">{t.brandLogo}</span>
            <div className="flex items-center gap-3">
              {form.logo && <img src={form.logo} alt="" width={56} height={56} className="brand-logo" />}
              <button className="btn btn-ghost flex items-center gap-2" onClick={() => fileRef.current?.click()}>
                <ImagePlus size={15} /> {form.logo ? t.brandLogoChange : t.brandLogoChoose}
              </button>
              {form.logo && (
                <button className="btn-icon" onClick={() => edit({ logo: "" })} aria-label={t.brandLogoRemove} title={t.brandLogoRemove}>
                  <Trash2 size={15} style={{ color: "var(--muted)" }} />
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pickLogo} />
          </div>
        </div>

        <div className="dash-brand-preview" aria-label={t.brandPreview}>
          <div className="dash-brand-preview-bar">
            {form.logo && <img src={form.logo} alt="" width={28} height={28} className="brand-logo" />}
            <span className="brand-mark-name">{form.name.trim() || t.brandNamePlaceholder}</span>
          </div>
          <div className="dash-brand-preview-body">
            <span className="dash-brand-preview-btn" style={{ background: tokens.gradAccent }}>{t.workoutDay}</span>
          </div>
        </div>
      </div>

      {saved && (
        <button className="btn btn-ghost mt-4" onClick={() => setConfirmRemove(true)} disabled={busy}>
          {t.brandRemove}
        </button>
      )}

      {confirmRemove && (
        <ConfirmModal
          title={t.brandRemoveTitle}
          message={t.brandRemoveMessage}
          confirmLabel={t.brandRemove}
          cancelLabel={t.cancel}
          onCancel={() => setConfirmRemove(false)}
          onConfirm={remove}
        />
      )}
    </section>
  );
}
