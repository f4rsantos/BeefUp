import { useState } from "react";
import { useApp } from "../context/useApp";
import Modal from "./ui/Modal";
import Field from "./ui/Field";
import ActionRow from "./ui/ActionRow";

export default function SaveFreeWorkoutModal({ onSave, onSkip }) {
  const { t } = useApp();
  const [name, setName] = useState("");
  const trimmed = name.trim();

  return (
    <Modal title={t.saveFreeTitle} onClose={onSkip}>
      <p className="modal-text">{t.saveFreeMessage}</p>
      <Field label={t.workoutName} htmlFor="free-workout-name">
        <input
          id="free-workout-name"
          className="field"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && trimmed) onSave(trimmed); }}
        />
      </Field>
      <ActionRow>
        <button className="btn btn-ghost" onClick={onSkip}>{t.discardChanges}</button>
        <button className="btn btn-primary" disabled={!trimmed} onClick={() => onSave(trimmed)}>
          {t.save}
        </button>
      </ActionRow>
    </Modal>
  );
}
