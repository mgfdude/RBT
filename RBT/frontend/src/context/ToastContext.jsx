import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((current) =>
      current.filter((toast) => toast.id !== id)
    );
  }, []);

  const showToast = useCallback(
    ({
      type = "info",
      title,
      message,
      duration = 4500,
    }) => {
      const id = ++toastId;

      setToasts((current) => [
        ...current,
        {
          id,
          type,
          title,
          message,
        },
      ]);

      if (duration > 0) {
        window.setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [removeToast]
  );

  const success = useCallback(
    (title, message) =>
      showToast({
        type: "success",
        title,
        message,
      }),
    [showToast]
  );

  const error = useCallback(
    (title, message) =>
      showToast({
        type: "error",
        title,
        message,
      }),
    [showToast]
  );

  const warning = useCallback(
    (title, message) =>
      showToast({
        type: "warning",
        title,
        message,
      }),
    [showToast]
  );

  const info = useCallback(
    (title, message) =>
      showToast({
        type: "info",
        title,
        message,
      }),
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{
        showToast,
        success,
        error,
        warning,
        info,
        removeToast,
      }}
    >
      {children}

      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onClose={() =>
              removeToast(toast.id)
            }
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onClose }) {
  const icons = {
    success: "✓",
    error: "!",
    warning: "!",
    info: "i",
  };

  return (
    <div
      className={`toast toast-${toast.type}`}
      role="status"
    >
      <div className="toast-icon">
        {icons[toast.type]}
      </div>

      <div className="toast-content">
        {toast.title && (
          <strong>{toast.title}</strong>
        )}

        {toast.message && (
          <span>{toast.message}</span>
        )}
      </div>

      <button
        type="button"
        className="toast-close"
        onClick={onClose}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error(
      "useToast must be used inside ToastProvider"
    );
  }

  return context;
}