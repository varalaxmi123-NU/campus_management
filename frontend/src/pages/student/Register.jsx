import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../api/axios";
import "../Login.css"; // Reuse the beautiful login styles!

function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    rollNo: "",
    branch: "",
    cgpa: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.name || !formData.email || !formData.password) {
      setError("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);
      await API.post("/student/register", formData);
      alert("Registered successfully! Please login.");
      navigate("/login");
    } catch (err) {
      const backendMsg = err.response?.data?.message;
      setError(
        backendMsg
          ? `Your account has not been registered: ${backendMsg}`
          : "Your account has not been registered. Please check your connection and try again."
      );
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
          <h1>Join the network.</h1>
          <p>Create your student account to apply for jobs and track your placements.</p>
        </div>
      </div>

      {/* ===== RIGHT PANEL ===== */}
      <div className="login-right">
        <div className="login-card" style={{ maxWidth: "500px" }}>
          <div className="login-header">
            <h2>Student Register</h2>
            <p>Create your account to get started.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  name="name"
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                <span className="input-line"></span>
              </div>
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <span className="input-line"></span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="form-group">
                <label>Roll Number</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    name="rollNo"
                    placeholder="E.g. 4NN..."
                    value={formData.rollNo}
                    onChange={handleChange}
                  />
                  <span className="input-line"></span>
                </div>
              </div>

              <div className="form-group">
                <label>Branch</label>
                <div className="input-wrapper">
                  <select name="branch" value={formData.branch} onChange={handleChange} style={{ width: "100%", padding: "12px", background: "var(--color-bg-alt)", border: "none", outline: "none", color: "var(--color-text-main)", fontSize: "0.95rem" }}>
                    <option value="">Select Branch</option>
                    <option>CSE</option>
                    <option>ISE</option>
                    <option>ECE</option>
                    <option>EEE</option>
                    <option>MECH</option>
                    <option>CIVIL</option>
                  </select>
                  <span className="input-line"></span>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-wrapper">
                <input
                  type="password"
                  name="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <span className="input-line"></span>
              </div>
            </div>

            {error && <div className="error-box" role="alert">{error}</div>}

            <button type="submit" className="btn-login" disabled={loading} style={{ marginTop: "20px" }}>
              {loading ? "Registering..." : "Create Account"}
            </button>
          </form>

          <p className="register-link" style={{ textAlign: "center", marginTop: "24px" }}>
            Already have an account? <Link to="/login">Sign in here →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;