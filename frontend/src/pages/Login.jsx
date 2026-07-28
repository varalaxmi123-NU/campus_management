import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/axios";
import "./Login.css";

function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole]         = useState("student");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    try {
      setLoading(true);
      const res = await API.post("/auth/login", { email, password, role });
      const { token, role: actualRole, user } = res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("role", actualRole);
      localStorage.setItem("userInfo", JSON.stringify(user));
      if (actualRole === "student")      navigate("/student/dashboard");
      else if (actualRole === "company") navigate("/company/dashboard");
      else if (actualRole === "admin")   navigate("/admin/dashboard");
    } catch (err) {
      if (err.response) {
        setError(err.response.data?.message || "Login failed. Please try again.");
      } else if (err.request) {
        setError("Couldn't reach the server. Please check your connection and try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* ===== LEFT PANEL ===== */}
      <div className="login-left">
        {/* Animated decorative elements */}
        <div className="login-left-orb-center"></div>
        <div className="login-particle"></div>
        <div className="login-particle"></div>
        <div className="login-particle"></div>
        <div className="login-particle"></div>
        <div className="login-particle"></div>
        <div className="login-particle"></div>
        <div className="login-particle"></div>
        <div className="login-particle"></div>

        <div className="login-brand">
          <span className="login-brand-logo">CampusHire</span>
          <h1>Your campus career<br />starts here.</h1>
          <p>The complete placement management platform for your university — connecting students and companies in real time.</p>
        </div>

        <div className="login-features">
          <div className="login-feature-item">Role-Based Secure Login</div>
          <div className="login-feature-item">Live Job Listings</div>
          <div className="login-feature-item">Real-Time Placement Feed</div>
        </div>
      </div>

      {/* ===== RIGHT PANEL ===== */}
      <div className="login-right">
        <div className="login-card">
          <div className="login-header">
            <h2>Welcome Back</h2>
            <p>Sign in to your account</p>
          </div>

          <div className="role-selector">
            {["student", "company", "admin"].map((r) => (
              <button
                key={r}
                type="button"
                className={`role-btn ${role === r ? "active" : ""}`}
                onClick={() => setRole(r)}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="error-box">{error}</div>}
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <span className="input-line"></span>
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <label htmlFor="password" style={{ marginBottom: 0 }}>Password</label>
                <Link to={`/forgot-password/${role}`} className="forgot-password-link" style={{ fontSize: "0.85rem", textDecoration: "none" }}>
                  Forgot Password?
                </Link>
              </div>
              <div className="input-wrapper" style={{ marginTop: "8px" }}>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <span className="input-line"></span>
              </div>
            </div>

            <button type="submit" className="btn-login" disabled={loading} style={{ marginTop: "12px" }}>
              {loading ? "Signing in..." : `Sign in as ${role}`}
            </button>
          </form>

          <div className="register-link-container" style={{ textAlign: "center", marginTop: "20px" }}>
            {role === "student" && (
              <p className="register-link">
                Don't have an account? <Link to="/student/register">Create one here →</Link>
              </p>
            )}
            {role === "admin" && (
              <p className="register-link">
                First time here? <Link to="/admin/register">Register your institution →</Link>
              </p>
            )}
          </div>
          <p className="back-home">
            <Link to="/">← Back to Home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
