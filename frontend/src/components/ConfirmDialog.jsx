import { createContext, useCallback, useContext, useRef, useState } from "react";
import "./ConfirmDialog.css";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);
  const [closing, setClosing] = useState(false);

  const confirm = useCallback((options) => {
    const opts = typeof options === "string" ? { message: options } : (options || {});
    setClosing(false);
    setDialog({
      title: opts.title || "Are you sure?",
      message: opts.message || "This action cannot be undone.",
      confirmLabel: opts.confirmLabel || "Delete",
      cancelLabel: opts.cancelLabel || "Cancel",
      danger: opts.danger !== false,
    });
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = (result) => {
    setClosing(true);
    setTimeout(() => {
      setDialog(null);
      setClosing(false);
      if (resolverRef.current) {
        resolverRef.current(result);
        resolverRef.current = null;
      }
    }, 160);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div
          className={`confirm-overlay ${closing ? "confirm-closing" : ""}`}
          onClick={() => settle(false)}
          role="presentation"
        >
          <div
            className={`confirm-modal ${dialog.danger ? "is-danger" : ""} ${closing ? "confirm-closing" : ""}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`confirm-icon ${dialog.danger ? "is-danger" : ""}`}>
              {dialog.danger ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.5 12.5 11 14l4-4.5" />
                </svg>
              )}
            </div>

            <h3 id="confirm-dialog-title">{dialog.title}</h3>
            <p>{dialog.message}</p>

            <div className="confirm-actions">
              <button className="confirm-btn confirm-btn-cancel" onClick={() => settle(false)}>
                {dialog.cancelLabel}
              </button>
              <button
                className={`confirm-btn confirm-btn-ok ${dialog.danger ? "is-danger" : ""}`}
                onClick={() => settle(true)}
                autoFocus
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm() must be used inside a <ConfirmProvider>");
  }
  return ctx;
}
