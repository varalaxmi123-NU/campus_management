import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../api/axios";
import { INSTITUTIONS } from "../../constants/institutions";
import "../Login.css"; 

function AdminRegister() {
  const [formData, setFormData] = useState({
    institution: "",
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const selected = INSTITUTIONS.find((i) => i.name === formData.institution);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.institution || !formData.name || !formData.email || !formData.password) {
      setError("Please fill all required fields");
      return;
    }

    if (selected) {
      const emailDomain = formData.email.split("@")[1]?.toLowerCase().trim();
      if (emailDomain !== selected.domain) {
        setError(`Please use your official institution email (e.g. admin@${selected.domain})`);
        return;
      }
    }

    try {
      setLoading(true);
      await API.post("/auth/register/admin", formData);
      alert("Institution registered successfully! Please login.");
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
          <h1>Manage your campus.</h1>
          <p>Register your institution to oversee placements, approve companies, and track real-time analytics.</p>
        </div>
      </div>

      {/* ===== RIGHT PANEL ===== */}
      <div className="login-right">
        <div className="login-card" style={{ maxWidth: "500px" }}>
          <div className="login-header">
            <h2>Institution Register</h2>
            <p>Create your admin account to get started.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>Institution Name</label>
              <div className="input-wrapper">
                <select
                  name="institution"
                  value={formData.institution}
                  onChange={handleChange}
                  required
                  style={{ width: "100%", padding: "12px 0", background: "transparent", border: "none", outline: "none", color: "inherit", fontSize: "0.95rem", fontFamily: "inherit" }}
                >
                  <option value="">Select Institution</option>
                  {INSTITUTIONS.map((i) => (
                    <option key={i.name} value={i.name}>{i.name}</option>
                  ))}
                </select>
                <span className="input-line"></span>
              </div>
            </div>

            <div className="form-group">
              <label>Admin Name</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Varalaxmi N U"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                <span className="input-line"></span>
              </div>
            </div>

            <div className="form-group">
              <label>Official Institution Email</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  name="email"
                  placeholder={selected ? `admin@${selected.domain}` : "admin@youcollege.edu"}
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <span className="input-line"></span>
              </div>
              {selected && (
                <p style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "6px" }}>
                  Must end in <strong>@{selected.domain}</strong> for {selected.name}
                </p>
              )}
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-wrapper">
                <input
                  type="password"
                  name="password"
                  placeholder="Create a secure password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <span className="input-line"></span>
              </div>
            </div>

            {error && <div className="error-box" role="alert">{error}</div>}

            <button type="submit" className="btn-login" disabled={loading} style={{ marginTop: "20px" }}>
              {loading ? "Registering..." : "Create Admin Account"}
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

export default AdminRegister;
