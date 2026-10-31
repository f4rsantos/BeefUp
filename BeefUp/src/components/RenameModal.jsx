import { useState } from "react";
import { useEscapeKey } from "../lib/useEscapeKey";

export default function RenameModal({
  title,
  label,
  initialValue = "",
  onSave,
  onCancel,
  cancelLabel = "Cancel",
  saveLabel = "Save",
}) {
  const [value, setValue] = useState(initialValue);
  useEscapeKey(onCancel);
  const trimmed = value.trim();

  const submit = (e) => {
    e.preventDefault();
    if (trimmed) onSave(trimmed);
  };

  return (
    <div role="dialog" aria-modal="true" className="modal-overlay">
      <form
        className="modal-center fade-in"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <p className="font-semibold mb-1" style={{ color: "var(--text)" }}>
          {title}
        </p>
        <input
          className="field"
          style={{ marginBottom: 12 }}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={(e) => e.target.select()}
          aria-label={label}
          placeholder={label}
          autoFocus
        />
        <div className="flex gap-3">
          <button type="button" className="btn btn-ghost flex-1" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="submit" className="btn btn-primary flex-1" disabled={!trimmed}>
            {saveLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
