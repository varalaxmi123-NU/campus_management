import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API, { resolveFileUrl } from "../../api/axios";
import UserMenu from "../../components/UserMenu";
import Toast from "../../components/Toast";
import "../Dashboard.css";

function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("jobs");
  const [jobs, setJobs] = useState([]);
  const [feed, setFeed] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  // Profile form state
  const [profileForm, setProfileForm] = useState({ branch: "", cgpa: "", resumeLink: "", skills: "" });
  const [resumeFileName, setResumeFileName] = useState("");

  const loadJobs = () => API.get("/jobs").then((res) => setJobs(res.data)).catch(() => setJobs([]));
  const loadPlacements = () => API.get("/placements").then((res) => setFeed(res.data)).catch(() => setFeed([]));
  const loadCompanies = () => API.get("/student/companies").then((res) => setCompanies(res.data)).catch(() => setCompanies([]));
  const loadApplications = () => API.get("/student/applications").then((res) => setApplications(res.data)).catch(() => setApplications([]));
  
  const loadProfile = () => {
    API.get("/student/profile").then((res) => {
      setUser(res.data);
      setProfileForm({
        branch: res.data.branch || "",
        cgpa: res.data.cgpa || "",
        resumeLink: res.data.resumeLink || "",
        skills: (res.data.skills || []).join(", ")
      });
    }).catch(() => {});
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "student") { navigate("/login"); return; }
    
    loadProfile();
    loadJobs();
    loadPlacements();
    loadCompanies();
    loadApplications();
  }, [navigate]);

  const handleLogout = () => { localStorage.clear(); navigate("/login"); };

  // Re-fetch the data for whichever tab the student opens, so anything a
  // company or admin just did (e.g. scheduling an interview) shows up
  // immediately instead of needing a full page refresh.
  const handleTabClick = (key) => {
    setTab(key);
    if (key === "jobs") loadJobs();
    else if (key === "applications") loadApplications();
    else if (key === "placements") loadPlacements();
    else if (key === "companies") loadCompanies();
    else if (key === "profile") loadProfile();
  };

  const handleApply = async (jobId) => {
    setError(""); setSuccess("");
    try {
      await API.post(`/student/jobs/${jobId}/apply`);
      setSuccess("Successfully applied for the job!");
      loadApplications();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to apply");
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    try {
      await API.put("/student/profile", profileForm);
      setSuccess("Profile updated successfully!");
      loadProfile();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setResumeFileName(file.name);
    const formData = new FormData();
    formData.append("resume", file);
    try {
      setError(""); setSuccess("Uploading resume...");
      const res = await API.post("/student/upload-resume", formData, { headers: { "Content-Type": "multipart/form-data" }});
      setSuccess(res.data.message);
      loadProfile();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload resume");
    }
  };

  const navItems = [
    { key: "jobs",         icon: "Jo", label: "Job Board" },
    { key: "applications", icon: "Ap", label: "My Applications" },
    { key: "placements",   icon: "Pl", label: "Placement Feed" },
    { key: "companies",    icon: "Co", label: "Company Directory" },
    { key: "profile",      icon: "Pr", label: "My Profile" },
  ];

  const pageTitle = {
    jobs:         "Open Job Listings",
    applications: "My Applications",
    placements:   "Recent Placements",
    companies:    "Company Directory",
    profile:      "My Student Profile",
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "S";
  
  // Create a Set of job IDs the user has applied to for easy checking.
  // Guard against orphaned applications (their job/company was deleted by
  // an admin) so a missing app.job doesn't crash the whole dashboard.
  const appliedJobIds = new Set(
    applications.filter(app => app.job).map(app => app.job._id || app.job)
  );
  const visibleApplications = applications.filter(app => app.job && app.company);

  return (
    <div className="dash-container">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2>CampusHire</h2>
          <span className="sidebar-tagline">Student Portal</span>
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
              <span className="user-name">{user?.name || "Student"}</span>
              <span className="user-role">Student</span>
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
              name={user?.name || "Student"}
              role="Student"
              email={user?.email}
              onDashboard={() => handleTabClick("jobs")}
              onProfile={() => handleTabClick("profile")}
              onSettings={() => handleTabClick("profile")}
              onSignOut={handleLogout}
            />
          </div>
        </header>

        <div className="toast-stack">
          <Toast message={error} type="error" onClose={() => setError("")} />
          <Toast message={success} type="success" onClose={() => setSuccess("")} />
        </div>

        <div className="content-body">
          {tab === "jobs" && (
            <div className="dash-section">
              <div className="dash-section-header">
                <h3>Open Opportunities <span className="dash-section-count">{jobs.length}</span></h3>
              </div>
              {(!user?.skills || user.skills.length === 0) && (
                <div className="skills-nudge">
                  <div className="skills-nudge-text">
                    <strong>Add your skills to unlock ATS match scores.</strong>
                    <p>You haven't listed any skills yet, so jobs can't show how well you match. Add them to your profile — it only takes a minute.</p>
                  </div>
                  <button className="btn-secondary-sm" onClick={() => handleTabClick("profile")}>Add Skills</button>
                </div>
              )}
              <div className="job-list">
                {jobs.length === 0 && (
                  <div className="empty-state">
                    <p>No open opportunities available.</p>
                  </div>
                )}
                {jobs.map((job) => {
                  const isApplied = appliedJobIds.has(job._id);
                  const jobSkills = (job.skills || []).map((s) => s.trim().toLowerCase()).filter(Boolean);
                  const mySkills = new Set((user?.skills || []).map((s) => s.trim().toLowerCase()).filter(Boolean));
                  const matched = jobSkills.filter((s) => mySkills.has(s));
                  const missing = jobSkills.filter((s) => !mySkills.has(s));
                  const matchScore = jobSkills.length > 0 ? Math.round((matched.length / jobSkills.length) * 100) : null;
                  return (
                    <div className="job-card" key={job._id}>
                      <div className="card-info">
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                          <h4 style={{ margin: 0 }}>{job.title}{job.company?.name ? ` — ${job.company.name}` : ""}</h4>
                          <span className="badge badge-open">Open</span>
                          {matchScore !== null && (
                            <span
                              className={`match-badge ${matchScore >= 70 ? "match-high" : matchScore >= 40 ? "match-mid" : "match-low"}`}
                              title={missing.length ? `Missing: ${missing.join(", ")}` : "You match every required skill"}
                            >
                              {matchScore}% Match
                            </span>
                          )}
                        </div>
                        <p>{job.description}</p>
                        <div className="job-meta">
                          {job.package && <span className="meta-tag">Package: {job.package}</span>}
                          {job.location && <span className="meta-tag">Location: {job.location}</span>}
                          {job.eligibility && <span className="meta-tag">Req: {job.eligibility}</span>}
                          {job.minCgpa > 0 && <span className="meta-tag">Min CGPA: {job.minCgpa}</span>}
                          {job.allowedBranches?.length > 0 && <span className="meta-tag">Branches: {job.allowedBranches.join(", ")}</span>}
                          {jobSkills.length > 0 && <span className="meta-tag">Skills: {job.skills.join(", ")}</span>}
                        </div>
                        {matchScore !== null && missing.length > 0 && (
                          <p className="match-missing-note">Add these skills to your profile to improve your match: {missing.join(", ")}</p>
                        )}
                      </div>
                      <div className="card-actions">
                        {isApplied ? (
                          <button className="btn-secondary" disabled>Applied</button>
                        ) : (
                          <button className="btn-primary-sm" onClick={() => handleApply(job._id)}>Apply Now</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "applications" && (
            <div className="dash-section">
              <div className="dash-section-header">
                <h3>Jobs You've Applied To <span className="dash-section-count">{visibleApplications.length}</span></h3>
              </div>
              <div className="list">
                {visibleApplications.length === 0 && (
                  <div className="empty-state">
                    <p>You haven't applied to any jobs yet.</p>
                  </div>
                )}
                {visibleApplications.map((app) => (
                  <div className="row-card" key={app._id}>
                    <div className="card-info">
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                        <h4 style={{ margin: 0 }}>{app.job?.title} — {app.company?.name}</h4>
                      </div>
                      <p>Applied on {new Date(app.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="card-actions" style={{ textAlign: "right" }}>
                      <span className={`badge ${app.status === 'Hired' ? 'badge-placed' : (app.status === 'Rejected' ? 'badge-closed' : 'badge-open')}`}>
                        Status: {app.status}
                      </span>
                      {(app.status === "Interview Scheduled" || app.status === "Hired") && app.interviewDate && (
                        <div style={{ marginTop: "10px", fontSize: "0.85rem", color: "var(--color-primary)" }}>
                          <strong>📅 {new Date(app.interviewDate).toLocaleString()}</strong>
                          <br />
                          {app.interviewLink ? (
                            /^https?:\/\//i.test(app.interviewLink) ? (
                              <button
                                type="button"
                                style={{ background: "none", border: "none", padding: 0, color: "var(--color-primary)", cursor: "pointer", font: "inherit", textDecoration: "underline" }}
                                onClick={() => {
                                  const now = new Date();
                                  const interviewTime = new Date(app.interviewDate);
                                  // Give a 15 minute head start before the scheduled time,
                                  // and treat anything more than 2 hours past it as over —
                                  // so a stale/offline link doesn't just open to a dead page.
                                  const opensAt = new Date(interviewTime.getTime() - 15 * 60 * 1000);
                                  const closesAt = new Date(interviewTime.getTime() + 2 * 60 * 60 * 1000);
                                  if (now < opensAt) {
                                    setError(`This interview isn't open yet. It will be available at ${interviewTime.toLocaleString()}.`);
                                  } else if (now > closesAt) {
                                    setError("This interview session has ended and the link is no longer active.");
                                  } else {
                                    window.open(app.interviewLink, "_blank", "noopener,noreferrer");
                                  }
                                }}
                              >
                                Join Interview ↗
                              </button>
                            ) : (
                              <span style={{ color: "var(--color-text-muted)" }}>📍 In-person / offline: {app.interviewLink}</span>
                            )
                          ) : (
                            <span style={{ color: "var(--color-text-muted)" }}>Interview link will appear here closer to the scheduled time.</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "placements" && (
            <div className="dash-section">
              <div className="dash-section-header">
                <h3>Placement Feed <span className="dash-section-count">{feed.length}</span></h3>
              </div>
              <div className="list">
                {feed.length === 0 && (
                  <div className="empty-state">
                    <p>No placement updates yet.</p>
                  </div>
                )}
                {feed.map((item) => (
                  <div className="row-card" key={item._id}>
                    <div className="card-info">
                      <h4 style={{ marginBottom: "6px" }}>
                        <span style={{ color: "#4f46e5", fontWeight: 800 }}>{item.studentName}</span>
                        {" "}→ {item.companyName}
                      </h4>
                      <div className="job-meta">
                        {item.jobTitle && <span className="meta-tag">Role: {item.jobTitle}</span>}
                        {item.studentBranch && <span className="meta-tag">Branch: {item.studentBranch}</span>}
                        {item.studentCgpa != null && <span className="meta-tag">CGPA: {item.studentCgpa}</span>}
                      </div>
                    </div>
                    {item.package && (
                      <div className="card-actions">
                        <span className="badge badge-placed">{item.package}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "companies" && (
            <div className="dash-section">
              <div className="dash-section-header">
                <h3>Company Directory <span className="dash-section-count">{companies.length}</span></h3>
              </div>
              <div className="list">
                {companies.length === 0 && (
                  <div className="empty-state">
                    <p>No companies registered yet.</p>
                  </div>
                )}
                {companies.map((c) => (
                  <div className="row-card" style={{ display: "block" }} key={c._id}>
                    <div className="card-info">
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "8px" }}>
                        {c.logoUrl && (
                          <img
                            src={c.logoUrl}
                            alt={`${c.name} logo`}
                            style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 6, border: "1px solid var(--color-border)" }}
                            onError={(e) => { e.target.style.display = "none"; }}
                          />
                        )}
                        <h4 style={{ margin: 0 }}>{c.name}</h4>
                      </div>
                      {c.description && <p style={{ marginBottom: "12px", color: "var(--color-text)" }}>{c.description}</p>}
                      <div className="job-meta">
                        {c.headquarters && <span className="meta-tag">HQ: {c.headquarters}</span>}
                        {c.eligibility && <span className="meta-tag">Req: {c.eligibility}</span>}
                        {c.skillsTested && <span className="meta-tag">Skills: {c.skillsTested}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "profile" && (
            <div className="dash-section">
              <div className="dash-section-header">
                <h3>Update Your Profile</h3>
              </div>
              
              <div style={{ marginBottom: "30px", padding: "16px", background: "var(--color-bg-hover)", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
                <h4 style={{ marginBottom: "12px", color: "var(--color-primary)" }}>Basic Details</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div><strong style={{ display: "block", fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "4px" }}>Name</strong>{user?.name || "N/A"}</div>
                  <div><strong style={{ display: "block", fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "4px" }}>Email</strong>{user?.email || "N/A"}</div>
                  <div><strong style={{ display: "block", fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "4px" }}>Roll Number</strong>{user?.rollNo || "N/A"}</div>
                </div>
              </div>

              <p style={{ color: "var(--color-text-muted)", marginBottom: 20, fontSize: "0.9rem" }}>
                Make sure your CGPA, Skills, and Resume are up to date — companies can't see your ATS match score until you add your skills below!
              </p>
              <form className="dash-form" onSubmit={handleProfileSave}>
                <label>Branch
                  <select value={profileForm.branch} onChange={(e) => setProfileForm({ ...profileForm, branch: e.target.value })}>
                    <option value="">Select Branch</option>
                    <option value="CSE">CSE</option>
                    <option value="ISE">ISE</option>
                    <option value="ECE">ECE</option>
                    <option value="EEE">EEE</option>
                    <option value="MECH">MECH</option>
                    <option value="CIVIL">CIVIL</option>
                  </select>
                </label>
                <label>CGPA
                  <input type="number" step="0.01" placeholder="e.g. 8.5" value={profileForm.cgpa} onChange={(e) => setProfileForm({ ...profileForm, cgpa: e.target.value })} />
                </label>
                <label className="full-span">
                  Skills (comma-separated) — required for ATS match scoring
                  <input placeholder="e.g. React, Node.js, SQL, Python" value={profileForm.skills} onChange={(e) => setProfileForm({ ...profileForm, skills: e.target.value })} />
                </label>
                <p className="full-span" style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "-6px" }}>
                  This is what companies match against their job's required skills — without this, you won't get a match score.
                </p>
                <label>Resume Link (Optional - if no file uploaded)
                  <input placeholder="e.g. https://drive.google.com/..." value={profileForm.resumeLink} onChange={(e) => setProfileForm({ ...profileForm, resumeLink: e.target.value })} />
                </label>
                <button type="submit" className="btn-primary" style={{ marginTop: "10px" }}>Save Profile</button>
              </form>

              <div className="resume-upload-card">
                <h4 className="resume-upload-title">Upload PDF Resume</h4>
                <p className="resume-upload-desc">Upload your latest resume to apply for jobs directly.</p>
                <label htmlFor="resume-upload-input" className="file-upload-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Choose File
                </label>
                <input
                  id="resume-upload-input"
                  type="file"
                  accept="application/pdf"
                  onChange={handleResumeUpload}
                  style={{ display: "none" }}
                />
                {resumeFileName && <span className="file-upload-name">{resumeFileName}</span>}
                <div className="resume-upload-footer">
                {user?.resumeLink && user.resumeLink.startsWith("/uploads") && (
                  <a href={resolveFileUrl(user.resumeLink)} target="_blank" rel="noreferrer" className="resume-view-link">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    View Current Uploaded Resume
                  </a>
                )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default StudentDashboard;
