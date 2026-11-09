import { X } from "lucide-react";
import { useEscapeKey } from "../../lib/useEscapeKey";

export default function Modal({ title, onClose, closeLabel, dismissOnBackdrop= false, variant= "center", onSubmit, children }) {
  useEscapeKey(onClose);
  const Body= onSubmit ? "form" : "div";
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="modal-overlay"
      onClick={dismissOnBackdrop ? onClose : undefined}
    >
      <Body
        className={variant === "sheet" ? "modal-sheet" : "modal-center fade-in"}
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
      >
        {(title || closeLabel) && (
          <div className="modal-head">
            <h2 className="modal-title">{title}</h2>
            {closeLabel && (
              <button type="button" className="btn btn-ghost p-2" onClick={onClose} aria-label={closeLabel}>
                <X size={18} />
              </button>
            )}
          </div>
        )}
        {children}
      </Body>
    </div>
  );
}
