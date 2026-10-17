import { useState } from "react";
import { useApp } from "../context/useApp";
import { useEscapeKey } from "../lib/useEscapeKey";

// A nickname kept in the trainer's local annotation, never synced.
export default function RenameStudentModal({ client, alias, onSave, onClose }) {
  const { t } = useApp();
  useEscapeKey(onClose);
  const realName = client.realName || client.name;
  const [value, setValue] = useState(alias);
  const [saving, setSaving] = useState(false);

  async function save(next) {
    setSaving(true);
    try {
      await onSave(next.trim());
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" className="modal-overlay" style={{ alignItems: "center" }} onClick={onClose}>
      <div className="modal-center" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => { e.preventDefault(); save(value); }}
        >
          <h3 className="dash-card-title">{t.dashRenameTitle}</h3>
          <input
            className="field"
            value={value}
            maxLength={60}
            placeholder={realName}
            onChange={(e) => setValue(e.target.value)}
            aria-label={t.dashRenameTitle}
            autoFocus
          />
          <p className="dash-empty">{t.dashRenameHint}</p>
          <p className="dash-empty">{t.dashRenameOriginal.replace("{name}", realName)}</p>
          <div className="flex gap-3">
            <button type="button" className="btn btn-ghost flex-1" onClick={onClose}>{t.cancel}</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={saving}>{t.save}</button>
          </div>
          {alias && (
            <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => save("")}>
              {t.dashRenameReset}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
