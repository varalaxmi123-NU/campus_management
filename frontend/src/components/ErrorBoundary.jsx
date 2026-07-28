import React from "react";

// Catches rendering errors anywhere below it in the tree so the user sees a
// friendly recovery screen instead of a silent blank page. Without this,
// any unexpected null/undefined (e.g. data an admin deleted elsewhere)
// crashes the whole app with no feedback at all.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("CampusHire crashed:", error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            padding: "24px",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
            background: "#f8fafc",
          }}
        >
          <h2 style={{ margin: 0, color: "#1e293b" }}>Something went wrong.</h2>
          <p style={{ margin: 0, color: "#64748b", maxWidth: "420px" }}>
            This page hit an unexpected error, possibly because some related
            data was changed or removed. Try going back to the home page.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              background: "#6366f1",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Go to Home Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
