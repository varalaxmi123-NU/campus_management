import { useEffect, useState } from "react";

/**
 * Floating, auto-dismissing toast notification.
 * Renders nothing when `message` is empty.
 */
function Toast({ message, type = "success", onClose, duration = 3500 }) {
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!message) return;
    setClosing(false);
    const closeTimer = setTimeout(() => setClosing(true), duration - 250);
    const removeTimer = setTimeout(() => onClose?.(), duration);
    return () => {
      clearTimeout(closeTimer);
      clearTimeout(removeTimer);
    };
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className={`toast toast-${type} ${closing ? "toast-out" : "toast-in"}`}>
      <span className="toast-icon">{type === "success" ? "✓" : "!"}</span>
      <span className="toast-text">{message}</span>
      <button
        type="button"
        className="toast-close"
        aria-label="Dismiss"
        onClick={() => { setClosing(true); setTimeout(() => onClose?.(), 200); }}
      >
        ×
      </button>
    </div>
  );
}

export default Toast;
