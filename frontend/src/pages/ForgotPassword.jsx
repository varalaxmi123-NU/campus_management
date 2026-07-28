import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API from "../api/axios";
import "./Login.css";

function ForgotPassword() {
  const { role } = useParams(); // gets 'student', 'company', or 'admin'
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!email) {
      setError("Please enter your email");
      return;
    }
    try {
      setLoading(true);
      const res = await API.post("/auth/forgot-password", { email, role });
      setMessage(res.data.message);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!otp || !password || !confirmPassword) {
      setError("Please fill all fields");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      await API.post("/auth/reset-password", { email, otp, password, role });
      alert("Password reset successfully! Please login with your new password.");
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* ===== LEFT PANEL ===== */}
      <div className="login-left">
        <div className="login-left-grid"></div>
        <div className="login-left-orb-center"></div>
        <div className="login-brand">
          <span className="login-brand-logo">CampusHire</span>
          <h1>Reset Password.</h1>
          <p>Securely recover your {role} account access to continue using the platform.</p>
        </div>
      </div>

      {/* ===== RIGHT PANEL ===== */}
      <div className="login-right">
        <div className="login-card" style={{ maxWidth: "450px" }}>
          <div className="login-header">
            <h2>Account Recovery</h2>
            <p>Enter your details to reset your password.</p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="login-form">
              <div className="form-group">
                <label>Email Address</label>
                <div className="input-wrapper">
                  <input
                    type="email"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <span className="input-line"></span>
                </div>
              </div>

              {error && <div className="error-box" role="alert">{error}</div>}
              {message && <div style={{ color: "#10b981", fontSize: "0.85rem", marginBottom: "16px", background: "rgba(16, 185, 129, 0.1)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>{message}</div>}

              <button type="submit" className="btn-login" disabled={loading}>
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="login-form">
              <div className="form-group">
                <label>Verification OTP</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                  <span className="input-line"></span>
                </div>
              </div>
              <div className="form-group">
                <label>New Password</label>
                <div className="input-wrapper">
                  <input
                    type="password"
                    placeholder="Create a new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <span className="input-line"></span>
                </div>
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <div className="input-wrapper">
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <span className="input-line"></span>
                </div>
              </div>

              {error && <div className="error-box" role="alert">{error}</div>}

              <button type="submit" className="btn-login" disabled={loading} style={{ marginTop: "10px" }}>
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}

          <p className="back-home" style={{ marginTop: "24px" }}>
            <Link to="/login">← Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
