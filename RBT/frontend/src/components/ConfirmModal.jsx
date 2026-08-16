import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";

function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Continue",
  cancelText = "Cancel",
  type = "warning",
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const Icon =
    type === "danger"
      ? AlertTriangle
      : type === "success"
      ? CheckCircle2
      : Info;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !loading
        ) {
          onCancel();
        }
      }}
    >
      <div
        className={`confirm-modal modal-${type}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <button
          type="button"
          className="modal-close"
          onClick={onCancel}
          disabled={loading}
          aria-label="Close"
        >
          <X size={19} />
        </button>

        <div className="modal-icon">
          <Icon size={25} />
        </div>

        <h2 id="confirm-modal-title">
          {title}
        </h2>

        <p>{message}</p>

        <div className="modal-actions">
          <button
            type="button"
            className="modal-cancel"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>

          <button
            type="button"
            className="modal-confirm"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;