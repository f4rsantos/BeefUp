import Modal from "./ui/Modal";
import ActionRow from "./ui/ActionRow";

export default function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  confirmDisabled = false,
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="modal-text">{message}</p>
      <ActionRow>
        <button className="btn btn-ghost" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button className="btn btn-primary" onClick={onConfirm} disabled={confirmDisabled}>
          {confirmLabel}
        </button>
      </ActionRow>
    </Modal>
  );
}
