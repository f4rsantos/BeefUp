export default function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
}) {
  return (
    <div className="modal-overlay">
      <div
        className="modal-center fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-semibold mb-1" style={{ color: "var(--text)" }}>
          {title}
        </p>
        <p className="text-sm" style={{ color: "var(--muted)", marginBottom: 10 }}>
          {message}
        </p>
        <div className="flex gap-3">
          <button className="btn btn-ghost flex-1" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="btn btn-primary flex-1" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
