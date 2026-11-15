import { useState } from "react";
import Modal from "./ui/Modal";
import ActionRow from "./ui/ActionRow";

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
  const trimmed = value.trim();

  const submit = (e) => {
    e.preventDefault();
    if (trimmed) onSave(trimmed);
  };

  return (
    <Modal title={title} onClose={onCancel} onSubmit={submit}>
      <input
        className="field"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={(e) => e.target.select()}
        aria-label={label}
        placeholder={label}
        autoFocus
      />
      <ActionRow>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="submit" className="btn btn-primary" disabled={!trimmed}>
          {saveLabel}
        </button>
      </ActionRow>
    </Modal>
  );
}
