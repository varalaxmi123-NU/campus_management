import { useEffect, useRef, useState } from "react";

/**
 * Top-right user profile dropdown.
 * name/role/email are shown in the header; onDashboard/onProfile/onSettings/onSignOut
 * are called when the matching menu item is clicked (any can be omitted).
 */
function UserMenu({ name, role, email, onDashboard, onProfile, onSettings, onSignOut }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleEsc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const initial = name ? name.trim().charAt(0).toUpperCase() : "U";

  const item = (label, icon, handler) => (
    <button
      type="button"
      className="user-menu-item"
      onClick={() => { setOpen(false); handler?.(); }}
    >
      <span className="user-menu-item-icon" aria-hidden="true">{icon}</span>
      {label}
    </button>
  );

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className={`user-menu-trigger ${open ? "user-menu-trigger-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="user-menu-avatar">{initial}</span>
        <span className="user-menu-trigger-text">
          <span className="user-menu-trigger-name">{name || "User"}</span>
          <span className="user-menu-trigger-role">{role}</span>
        </span>
        <span className={`user-menu-chevron ${open ? "user-menu-chevron-open" : ""}`}>⌄</span>
      </button>

      <div className={`user-menu-panel ${open ? "user-menu-panel-open" : ""}`}>
        <div className="user-menu-panel-header">
          <span className="user-menu-avatar user-menu-avatar-lg">{initial}</span>
          <div className="user-menu-panel-identity">
            <span className="user-menu-panel-name">{name || "User"}</span>
            <span className="user-menu-panel-role">{role}</span>
            {email && <span className="user-menu-panel-email">{email}</span>}
          </div>
        </div>

        <div className="user-menu-divider" />

        <div className="user-menu-items">
          {item("Dashboard", "⌂", onDashboard)}
          {item("Profile", "◐", onProfile)}
          {item("Settings", "⚙", onSettings)}
        </div>

        <div className="user-menu-divider" />

        <button type="button" className="user-menu-item user-menu-item-danger" onClick={() => { setOpen(false); onSignOut?.(); }}>
          <span className="user-menu-item-icon" aria-hidden="true">⎋</span>
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default UserMenu;
