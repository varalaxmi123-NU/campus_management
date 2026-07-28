import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api/axios";
import UserMenu from "../../components/UserMenu";
import Toast from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmDialog";
import "../Dashboard.css";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("companies");
  const [companies, setCompanies] = useState([]);
  const [students, setStudents] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [officers, setOfficers] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const confirm = useConfirm();

  const isSuperAdmin = user?.subRole !== "placement_officer"; // covers old accounts with no subRole too

  const [companyForm, setCompanyForm] = useState({
    name: "", email: "", password: "", headquarters: "", description: "", eligibility: "", recruitmentProcess: "", skillsTested: "",
  });
  const [hireForm, setHireForm] = useState({ studentId: "", companyId: "", jobTitle: "", package: "", eligibility: "" });
  const [officerForm, setOfficerForm] = useState({ name: "", email: "", password: "" });

  const loadCompanies = () => API.get("/admin/companies").then((res) => setCompanies(res.data)).catch(() => setCompanies([]));
  const loadStudents = () => API.get("/admin/students").then((res) => setStudents(res.data)).catch(() => setStudents([]));
  const loadPlacements = () => API.get("/admin/placements").then((res) => setPlacements(res.data)).catch(() => setPlacements([]));
  const loadAnalytics = () => API.get("/admin/analytics").then((res) => setAnalytics(res.data)).catch(() => setAnalytics(null));
  const loadOfficers = () => API.get("/admin/officers").then((res) => setOfficers(res.data)).catch(() => setOfficers([]));

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const info = localStorage.getItem("userInfo");

    if (!token || role !== "admin") { navigate("/login"); return; }
    if (info) setUser(JSON.parse(info));
    loadCompanies();
    loadStudents();
    loadPlacements();
    loadAnalytics();
    loadOfficers();
  }, [navigate]);

  const handleLogout = () => { localStorage.clear(); navigate("/login"); };

  // Re-fetch data for whichever tab is opened, so newly added companies/
  // students/placements show up without a full page refresh.
  const handleTabClick = (key) => {
    setTab(key);
    if (key === "analytics") loadAnalytics();
    else if (key === "companies") loadCompanies();
    else if (key === "students") loadStudents();
    else if (key === "markHired") { loadStudents(); loadCompanies(); }
    else if (key === "records") loadPlacements();
    else if (key === "officers" && isSuperAdmin) loadOfficers();
  };

  const handleAddCompany = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!companyForm.name || !companyForm.email || !companyForm.password) {
      setError("Name, email and password are required"); return;
    }
    try {
      await API.post("/admin/companies", companyForm);
      setSuccess("Company added! They can now log in.");
      setCompanyForm({ name: "", email: "", password: "", headquarters: "", description: "", eligibility: "", recruitmentProcess: "", skillsTested: "" });
      loadCompanies();
      setTab("companies");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add company");
    }
  };

  const handleDeleteCompany = async (id) => {
    const ok = await confirm({
      title: "Delete this company?",
      message: "Are you sure you want to delete this company? All of its job postings will be removed too. This can't be undone.",
      confirmLabel: "Delete Company",
    });
    if (!ok) return;
    await API.delete(`/admin/companies/${id}`);
    loadCompanies();
  };

  const handleDeleteStudent = async (id) => {
    const ok = await confirm({
      title: "Delete this student?",
      message: "This will permanently delete the student's account and all related data. This can't be undone.",
      confirmLabel: "Delete Student",
    });
    if (!ok) return;
    await API.delete(`/admin/students/${id}`);
    loadStudents();
    loadPlacements();
  };

  const handleMarkHired = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!hireForm.studentId || !hireForm.companyId) {
      setError("Select a student and a company"); return;
    }
    try {
      await API.post("/admin/mark-hired", hireForm);
      setSuccess("Placement recorded. It's now visible in the Placement Feed.");
      setHireForm({ studentId: "", companyId: "", jobTitle: "", package: "", eligibility: "" });
      loadStudents();
      loadPlacements();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to mark student as hired");
    }
  };

  const handleUndoPlacement = async (id) => {
    const ok = await confirm({
      title: "Undo this placement?",
      message: "The student will go back to Not Placed status.",
      confirmLabel: "Undo Placement",
    });
    if (!ok) return;
    await API.delete(`/admin/placements/${id}`);
    loadStudents();
    loadPlacements();
  };

  const handleAddOfficer = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!officerForm.name || !officerForm.email || !officerForm.password) {
      setError("Name, email and password are required"); return;
    }
    try {
      await API.post("/admin/officers", officerForm);
      setSuccess("Placement officer added! They can now log in as Admin.");
      setOfficerForm({ name: "", email: "", password: "" });
      loadOfficers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add placement officer");
    }
  };

  const handleDeleteOfficer = async (id) => {
    const ok = await confirm({
      title: "Remove this officer?",
      message: "This placement officer will lose access to the admin dashboard immediately.",
      confirmLabel: "Remove Officer",
    });
    if (!ok) return;
    await API.delete(`/admin/officers/${id}`);
    loadOfficers();
  };

  const navItems = [
    { key: "analytics",  icon: "📊", label: "Analytics" },
    { key: "companies",  icon: "Co", label: "Companies" },
    { key: "addCompany", icon: "+",  label: "Add Company" },
    { key: "students",   icon: "St", label: "Students" },
    { key: "markHired",  icon: "H",  label: "Mark Hired" },
    { key: "records",    icon: "Re", label: "Records" },
    ...(isSuperAdmin ? [{ key: "officers", icon: "Of", label: "Placement Officers" }] : []),
  ];

  const pageTitle = {
    companies:  "All Companies",
    addCompany: "Add New Company",
    students:   "All Students",
    markHired:  "Mark Student Hired",
    records:    "Placement Records",
    officers:   "Placement Officers",
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "A";

  return (
    <div className="dash-container">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2>CampusHire</h2>
          <span className="sidebar-tagline">Admin Portal</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ key, label }) => (
            <button
              key={key}
              className={`nav-item ${tab === key ? "active" : ""}`}
              onClick={() => handleTabClick(key)}
            >
              <span className="nav-item-text">{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{userInitial}</div>
            <div className="sidebar-user-info">
              <span className="user-name">{user?.name || "Admin"}</span>
              <span className="user-role">{isSuperAdmin ? "Super Admin" : "Placement Officer"}</span>
            </div>
          </div>
          <button className="btn-logout-sidebar" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <h2>{pageTitle[tab]}</h2>
          <div className="header-meta">
            <UserMenu
              name={user?.name || (isSuperAdmin ? "Super Admin" : "Placement Officer")}
              role={isSuperAdmin ? "Super Admin" : "Placement Officer"}
              email={user?.email}
              onDashboard={() => handleTabClick("analytics")}
              onSignOut={handleLogout}
            />
          </div>
        </header>

        <div className="toast-stack">
          <Toast message={error} type="error" onClose={() => setError("")} />
          <Toast message={success} type="success" onClose={() => setSuccess("")} />
        </div>

        <div className="content-body">
          {tab === "analytics" && (
            <div className="dash-section">
              <div className="dash-section-header">
                <h3>Placement Analytics Dashboard</h3>
              </div>
              
              {analytics ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "30px" }}>
                    <div style={{ padding: "20px", background: "var(--color-bg-hover)", borderRadius: "8px", border: "1px solid var(--color-border)", textAlign: "center" }}>
                      <h4 style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", marginBottom: "8px" }}>Total Students</h4>
                      <p style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--color-primary)" }}>{analytics.metrics.totalStudents}</p>
                    </div>
                    <div style={{ padding: "20px", background: "var(--color-bg-hover)", borderRadius: "8px", border: "1px solid var(--color-border)", textAlign: "center" }}>
                      <h4 style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", marginBottom: "8px" }}>Total Companies</h4>
                      <p style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--color-primary)" }}>{analytics.metrics.totalCompanies}</p>
                    </div>
                    <div style={{ padding: "20px", background: "var(--color-bg-hover)", borderRadius: "8px", border: "1px solid var(--color-border)", textAlign: "center" }}>
                      <h4 style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", marginBottom: "8px" }}>Total Jobs</h4>
                      <p style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--color-primary)" }}>{analytics.metrics.totalJobs}</p>
                    </div>
                    <div style={{ padding: "20px", background: "var(--color-bg-hover)", borderRadius: "8px", border: "1px solid var(--color-border)", textAlign: "center" }}>
                      <h4 style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", marginBottom: "8px" }}>Students Placed</h4>
                      <p style={{ fontSize: "2rem", fontWeight: "bold", color: "#10b981" }}>{analytics.metrics.totalPlacements}</p>
                    </div>
                  </div>

                  <div style={{ background: "var(--color-bg-hover)", padding: "20px", borderRadius: "8px", border: "1px solid var(--color-border)", marginBottom: "30px" }}>
                    <h4 style={{ marginBottom: "16px" }}>Top Performers by CGPA</h4>
                    {analytics.topStudents && analytics.topStudents.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {analytics.topStudents.map((s, idx) => (
                          <div key={s._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "var(--color-bg-subtle)", borderRadius: "6px", border: "1px solid var(--color-border)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span style={{ fontWeight: "bold", color: "var(--color-primary)" }}>#{idx + 1}</span>
                              <div>
                                <strong style={{ display: "block" }}>{s.name}</strong>
                                <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>{s.branch || "N/A"}</span>
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span className={`badge ${s.placementStatus === "Placed" ? "badge-placed" : "badge-notplaced"}`}>{s.placementStatus}</span>
                              <strong style={{ color: "#10b981" }}>{s.cgpa ?? "N/A"}</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: "var(--color-text-muted)" }}>No student CGPA data available yet.</p>
                    )}
                  </div>

                  <div style={{ background: "var(--color-bg-hover)", padding: "20px", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
                    <h4 style={{ marginBottom: "20px" }}>Placements by Branch</h4>
                    {analytics.branchData && analytics.branchData.length > 0 ? (
                      <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analytics.branchData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="name" stroke="var(--color-text-muted)" />
                            <YAxis stroke="var(--color-text-muted)" allowDecimals={false} />
                            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'var(--color-bg-hover)', border: '1px solid var(--color-border)', borderRadius: '8px' }} />
                            <Bar dataKey="placed" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p style={{ color: "var(--color-text-muted)" }}>No placement data available for chart yet.</p>
                    )}
                  </div>
                </>
              ) : (
                <p>Loading analytics data...</p>
              )}
            </div>
          )}

          {tab === "companies" && (
            <>
              <div className="dash-grid">
                <div className="stat-card">
                  <div className="stat-card-accent"></div>
                  <div className="stat-card-label">Companies</div>
                  <strong>{companies.length}</strong>
                  <span>Registered</span>
                </div>
                <div className="stat-card">
                  <div className="stat-card-accent"></div>
                  <div className="stat-card-label">Students</div>
                  <strong>{students.length}</strong>
                  <span>Enrolled</span>
                </div>
                <div className="stat-card">
                  <div className="stat-card-accent"></div>
                  <div className="stat-card-label">Placed</div>
                  <strong>{students.filter((s) => s.placementStatus === "Placed").length}</strong>
                  <span>Students</span>
                </div>
              </div>

              <div className="dash-section">
              <div className="dash-section-header">
                <h3>All Companies <span className="dash-section-count">{companies.length}</span></h3>
              </div>
              <div className="list">
                {companies.length === 0 && (
                  <div className="empty-state">
                    <p>No companies registered yet. Add one to get started.</p>
                  </div>
                )}
                {companies.map((c) => (
                  <div className="row-card" key={c._id}>
                    <div className="card-info">
                      <h4>{c.name}</h4>
                      <p>{c.email}{c.headquarters ? ` · ${c.headquarters}` : ""}</p>
                    </div>
                    <div className="card-actions">
                      <button className="btn-danger" onClick={() => handleDeleteCompany(c._id)}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </>
          )}

          {tab === "addCompany" && (
            <div className="dash-section">
              <div className="dash-section-header">
                <h3>Add a New Company Account</h3>
              </div>
              <form className="dash-form" onSubmit={handleAddCompany}>
                <label>Company Name
                  <input placeholder="e.g. Infosys" value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} />
                </label>
                <label>Login Email
                  <input type="email" placeholder="company@example.com" value={companyForm.email} onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} />
                </label>
                <label>Login Password
                  <input type="password" placeholder="Set a secure password" value={companyForm.password} onChange={(e) => setCompanyForm({ ...companyForm, password: e.target.value })} />
                </label>
                <label>Headquarters
                  <input placeholder="e.g. Bangalore, Karnataka" value={companyForm.headquarters} onChange={(e) => setCompanyForm({ ...companyForm, headquarters: e.target.value })} />
                </label>
                <label>Description
                  <textarea rows="3" placeholder="Brief description of the company..." value={companyForm.description} onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })} />
                </label>
                <label>Eligibility Criteria
                  <input placeholder="e.g. CSE/ISE, CGPA 7+" value={companyForm.eligibility} onChange={(e) => setCompanyForm({ ...companyForm, eligibility: e.target.value })} />
                </label>
                <label>Recruitment Process
                  <input placeholder="e.g. Online Test → Technical Interview → HR" value={companyForm.recruitmentProcess} onChange={(e) => setCompanyForm({ ...companyForm, recruitmentProcess: e.target.value })} />
                </label>
                <label>Skills Tested
                  <input placeholder="e.g. DSA, SQL, Problem Solving" value={companyForm.skillsTested} onChange={(e) => setCompanyForm({ ...companyForm, skillsTested: e.target.value })} />
                </label>
                <button className="btn-primary-full" type="submit">Add Company</button>
              </form>
            </div>
          )}

          {tab === "students" && (
            <div className="dash-section">
              <div className="dash-section-header">
                <h3>All Students <span className="dash-section-count">{students.length}</span></h3>
              </div>
              <div className="list">
                {students.length === 0 && (
                  <div className="empty-state"><p>No students registered yet.</p></div>
                )}
                {students.map((s) => (
                  <div className="row-card" key={s._id}>
                    <div className="card-info">
                      <h4>{s.name}</h4>
                      <p>{s.email}{s.branch ? ` · ${s.branch}` : ""}{s.cgpa != null ? ` · CGPA ${s.cgpa}` : ""}</p>
                    </div>
                    <div className="card-actions">
                      <span className={`badge ${s.placementStatus === "Placed" ? "badge-placed" : "badge-notplaced"}`}>
                        {s.placementStatus === "Placed" ? `Placed @ ${s.placedCompany}` : "Not Placed"}
                      </span>
                      <button className="btn-danger" onClick={() => handleDeleteStudent(s._id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "markHired" && (
            <div className="dash-section">
              <div className="dash-section-header">
                <h3>Mark a Student as Hired</h3>
              </div>
              <p style={{ color: "var(--color-text-muted)", marginBottom: 24, fontSize: "0.9rem" }}>
                Record an offer a student has accepted. It will appear in the Placement Feed for every student.
              </p>
              <form className="dash-form" onSubmit={handleMarkHired}>
                <label>Student
                  <select value={hireForm.studentId} onChange={(e) => setHireForm({ ...hireForm, studentId: e.target.value })}>
                    <option value="">Select student</option>
                    {students.filter((s) => s.placementStatus !== "Placed").map((s) => (
                      <option key={s._id} value={s._id}>{s.name} ({s.email})</option>
                    ))}
                  </select>
                </label>
                <label>Company
                  <select value={hireForm.companyId} onChange={(e) => setHireForm({ ...hireForm, companyId: e.target.value })}>
                    <option value="">Select company</option>
                    {companies.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </label>
                <label>Job Title
                  <input value={hireForm.jobTitle} onChange={(e) => setHireForm({ ...hireForm, jobTitle: e.target.value })} placeholder="e.g. Software Engineer" />
                </label>
                <label>Package
                  <input value={hireForm.package} onChange={(e) => setHireForm({ ...hireForm, package: e.target.value })} placeholder="e.g. 6 LPA" />
                </label>
                <label>Eligibility Criteria Used
                  <input value={hireForm.eligibility} onChange={(e) => setHireForm({ ...hireForm, eligibility: e.target.value })} placeholder="e.g. CSE/ISE, CGPA 7+" />
                </label>
                <button className="btn-primary-full" type="submit">✓ Confirm Placement</button>
              </form>
            </div>
          )}

          {tab === "records" && (
            <div className="dash-section">
              <div className="dash-section-header">
                <h3>Full Placement Records <span className="dash-section-count">{placements.length}</span></h3>
              </div>
              <p style={{ color: "var(--color-text-muted)", marginBottom: 20, fontSize: "0.9rem" }}>
                Every hire, by whoever made it (admin or company), with the criteria used.
              </p>
              <div className="list">
                {placements.length === 0 && (
                  <div className="empty-state"><p>No placements recorded yet.</p></div>
                )}
                {placements.map((p) => (
                  <div className="row-card" key={p._id}>
                    <div className="card-info">
                      <h4>{p.studentName} → {p.companyName}</h4>
                      <p>
                        {[p.jobTitle, p.package, p.studentBranch, p.studentCgpa != null && `CGPA ${p.studentCgpa}`].filter(Boolean).join(" · ")}
                      </p>
                      {p.eligibility && <p>Criteria: {p.eligibility}</p>}
                      <p style={{ marginTop: 4 }}>Hired by: {p.hiredBy === "company" ? "Company" : "Admin"}</p>
                    </div>
                    <div className="card-actions">
                      <button className="btn-danger" onClick={() => handleUndoPlacement(p._id)}>Undo</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "officers" && isSuperAdmin && (
            <div className="dash-section">
              <div className="dash-section-header">
                <h3>Placement Officer Accounts <span className="dash-section-count">{officers.length}</span></h3>
              </div>
              <p style={{ color: "var(--color-text-muted)", marginBottom: 24, fontSize: "0.9rem" }}>
                Create logins for your placement department staff. They can add/edit students and add companies, but can't create other officer accounts.
              </p>

              <form className="dash-form" onSubmit={handleAddOfficer} style={{ marginBottom: 32 }}>
                <label>Full Name
                  <input value={officerForm.name} onChange={(e) => setOfficerForm({ ...officerForm, name: e.target.value })} placeholder="e.g. Priya Sharma" />
                </label>
                <label>Login Email
                  <input type="email" value={officerForm.email} onChange={(e) => setOfficerForm({ ...officerForm, email: e.target.value })} placeholder="officer@example.com" />
                </label>
                <label>Login Password
                  <input type="password" value={officerForm.password} onChange={(e) => setOfficerForm({ ...officerForm, password: e.target.value })} placeholder="Set a secure password" />
                </label>
                <button className="btn-primary-full" type="submit">+ Add Placement Officer</button>
              </form>

              <div className="list">
                {officers.length === 0 && (
                  <div className="empty-state"><p>No placement officers added yet.</p></div>
                )}
                {officers.map((o) => (
                  <div className="row-card" key={o._id}>
                    <div className="card-info">
                      <h4>{o.name}</h4>
                      <p>{o.email}</p>
                    </div>
                    <div className="card-actions">
                      <button className="btn-danger" onClick={() => handleDeleteOfficer(o._id)}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
