import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API, { resolveFileUrl } from "../../api/axios";
import UserMenu from "../../components/UserMenu";
import Toast from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmDialog";
import "../Dashboard.css";

function CompanyDashboard() {
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [students, setStudents] = useState([]);
  const [hires, setHires] = useState([]);
  const [tab, setTab] = useState("jobs");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const confirm = useConfirm();

  const BRANCH_OPTIONS = ["CSE", "ISE", "ECE", "EEE", "MECH", "CIVIL"];
  const [jobForm, setJobForm] = useState({ title: "", description: "", eligibility: "", package: "", location: "", minCgpa: "", allowedBranches: [], skills: "" });
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [hireSelections, setHireSelections] = useState({});
  const [applicantsData, setApplicantsData] = useState({});
  const [showApplicantsFor, setShowApplicantsFor] = useState(null);
  const [sortStudentsBy, setSortStudentsBy] = useState("cgpa"); // "cgpa" (highest marks first) or "recent"

  const loadJobs = () => API.get("/company/jobs").then((res) => setJobs(res.data)).catch(() => setJobs([]));
  const loadProfile = () => {
    setProfileLoading(true);
    setProfileError("");
    API.get("/company/profile")
      .then((res) => setProfile(res.data))
      .catch((err) => setProfileError(err.response?.data?.message || "Couldn't load your company profile. Check your connection and try again."))
      .finally(() => setProfileLoading(false));
  };
  const loadStudents = () => API.get("/company/students").then((res) => setStudents(res.data)).catch(() => setStudents([]));
  const loadHires = () => API.get("/company/hires").then((res) => setHires(res.data)).catch(() => setHires([]));

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const info = localStorage.getItem("userInfo");

    if (!token || role !== "company") { navigate("/login"); return; }
    if (info) setUser(JSON.parse(info));
    loadJobs();
    loadProfile();
    loadStudents();
    loadHires();
  }, [navigate]);

  const handleLogout = () => { localStorage.clear(); navigate("/login"); };

  // Re-fetch data for whichever tab is opened, so newly hired students,
  // new applicants, etc. show up without a full page refresh.
  const handleTabClick = (key) => {
    setTab(key);
    if (key === "jobs") loadJobs();
    else if (key === "profile") loadProfile();
    else if (key === "students") loadStudents();
    else if (key === "hires") loadHires();
  };

  const handlePostJob = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!jobForm.title) { setError("Job title is required"); return; }
    try {
      await API.post("/company/jobs", jobForm);
      setSuccess("Job posted successfully!");
      setJobForm({ title: "", description: "", eligibility: "", package: "", location: "", minCgpa: "", allowedBranches: [], skills: "" });
      loadJobs();
      setTab("jobs");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to post job");
    }
  };

  const handleDeleteJob = async (id) => {
    const ok = await confirm({
      title: "Delete this job posting?",
      message: "Students will no longer be able to see or apply to this job. This can't be undone.",
      confirmLabel: "Delete Job",
    });
    if (!ok) return;
    await API.delete(`/company/jobs/${id}`);
    loadJobs();
  };

  const handleViewApplicants = async (jobId) => {
    if (showApplicantsFor === jobId) {
      setShowApplicantsFor(null);
      return;
    }
    try {
      const res = await API.get(`/company/jobs/${jobId}/applicants`);
      setApplicantsData(prev => ({ ...prev, [jobId]: res.data }));
      setShowApplicantsFor(jobId);
    } catch (err) {
      console.error(err);
    }
  };

  const [scheduleModal, setScheduleModal] = useState(null); // { appId, jobId, date, link } | null

  const openScheduleModal = (appId, jobId) => {
    setScheduleModal({ appId, jobId, date: "", link: "" });
  };

  const closeScheduleModal = () => setScheduleModal(null);

  const submitScheduleInterview = async () => {
    if (!scheduleModal) return;
    const { appId, jobId, date, link } = scheduleModal;
    if (!date) { setError("Pick an interview date and time"); return; }
    if (!link) { setError("Add an interview link (Zoom/Meet/venue note)"); return; }
    try {
      // date comes from a <input type="datetime-local"> as "YYYY-MM-DDTHH:mm" (local time),
      // which the Date constructor parses correctly - converting straight to ISO for storage.
      const interviewDate = new Date(date).toISOString();
      await API.put(`/company/applications/${appId}/schedule-interview`, { interviewDate, interviewLink: link });
      const res = await API.get(`/company/jobs/${jobId}/applicants`);
      setApplicantsData(prev => ({ ...prev, [jobId]: res.data }));
      setSuccess("Interview scheduled successfully!");
      closeScheduleModal();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to schedule interview.");
    }
  };

  const handleToggleStatus = async (job) => {
    await API.put(`/company/jobs/${job._id}`, { status: job.status === "Open" ? "Closed" : "Open" });
    loadJobs();
  };

  const [savingProfile, setSavingProfile] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    setSavingProfile(true);
    try {
      const res = await API.put("/company/profile", profile);
      // Trust what the server actually persisted, not just our local draft
      if (res.data?.company) setProfile(res.data.company);
      setSuccess("Profile saved — students will see these changes immediately.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  // Case-insensitive check of whether a student clears a job's CGPA and
  // skill requirements - mirrors the backend's ATS logic (utils/atsMatch.js)
  // so the "All Students" hire flow can warn before hiring too, not just
  // the per-job Applicants panel.
  const getMatchWarning = (student, jobId) => {
    const job = jobs.find((j) => j._id === jobId);
    if (!job) return null;

    const cgpaOk = (student.cgpa ?? 0) >= (job.minCgpa || 0);
    const requiredSkills = (job.skills || []).map((s) => String(s).trim().toLowerCase()).filter(Boolean);
    const haveSkills = new Set((student.skills || []).map((s) => String(s).trim().toLowerCase()));
    const missing = requiredSkills.filter((s) => !haveSkills.has(s));

    if (cgpaOk && missing.length === 0) return null;

    const parts = [];
    if (!cgpaOk) parts.push(`CGPA ${student.cgpa ?? "N/A"} is below required ${job.minCgpa}`);
    if (missing.length) parts.push(`missing skills: ${missing.join(", ")}`);
    return `⚠️ Does not meet "${job.title}" requirements — ${parts.join("; ")}`;
  };

  const updateSelection = (studentId, field, value) => {
    setHireSelections((prev) => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }));
  };

  const handleHire = async (studentId) => {
    setError(""); setSuccess("");
    const sel = hireSelections[studentId];
    if (!sel?.jobId) { setError("Pick which job you're hiring this student for first"); return; }
    try {
      await API.post("/company/hire", { studentId, jobId: sel.jobId, eligibility: sel.eligibility || "" });
      setSuccess("Student hired! This is now visible to every student.");
      loadStudents();
      loadHires();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to hire student");
    }
  };

  const handleUndoHire = async (hireId) => {
    const ok = await confirm({
      title: "Remove this hire?",
      message: "The student will go back to Not Placed status.",
      confirmLabel: "Remove Hire",
    });
    if (!ok) return;
    await API.delete(`/company/hires/${hireId}`);
    loadStudents();
    loadHires();
  };

  const navItems = [
    { key: "jobs",     icon: "Jo", label: "My Job Postings" },
    { key: "post",     icon: "+",  label: "Post a Job" },
    { key: "students", icon: "St", label: "All Students" },
    { key: "hires",    icon: "Hi", label: "My Hires" },
    { key: "profile",  icon: "Pr", label: "Company Profile" },
  ];

  const pageTitle = {
    jobs:     "Your Job Postings",
    post:     "Post a New Job",
    students: "Registered Students",
    hires:    "Students You've Hired",
    profile:  "Company Profile",
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "C";

  return (
    <div className="dash-container">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2>CampusHire</h2>
          <span className="sidebar-tagline">Company Portal</span>
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
              <span className="user-name">{user?.name || "Company"}</span>
              <span className="user-role">Company</span>
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
              name={user?.name || "Company"}
              role="Company HR"
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
                <h3>Your Job Postings <span className="dash-section-count">{jobs.length}</span></h3>
              </div>
              <div className="job-list">
                {jobs.length === 0 && (
                  <div className="empty-state"><p>No job postings yet. Use "Post a Job" to add one.</p></div>
                )}
                {jobs.map((job) => (
                  <div className="job-card" key={job._id}>
                    <div className="card-info">
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                        <h4 style={{ margin: 0 }}>{job.title}</h4>
                        <span className={`badge ${job.status === "Open" ? "badge-open" : "badge-closed"}`}>{job.status}</span>
                      </div>
                      <p>{job.description}</p>
                      <div className="job-meta">
                        {job.package && <span className="meta-tag">Package: {job.package}</span>}
                        {job.location && <span className="meta-tag">Location: {job.location}</span>}
                        {job.eligibility && <span className="meta-tag">Req: {job.eligibility}</span>}
                        {job.minCgpa > 0 && <span className="meta-tag">Min CGPA: {job.minCgpa}</span>}
                        {job.allowedBranches?.length > 0
                          ? <span className="meta-tag">Branches: {job.allowedBranches.join(", ")}</span>
                          : <span className="meta-tag">Branches: All</span>}
                      </div>
                    </div>
                    <div className="card-actions">
                      <button className="btn-secondary-sm" onClick={() => handleViewApplicants(job._id)}>
                        {showApplicantsFor === job._id ? "Hide Applicants" : "View Applicants"}
                      </button>
                      <button className="btn-primary-sm" onClick={() => handleToggleStatus(job)}>
                        {job.status === "Open" ? "Close Job" : "Reopen Job"}
                      </button>
                      <button className="btn-danger" onClick={() => handleDeleteJob(job._id)}>Delete</button>
                    </div>
                    
                    {showApplicantsFor === job._id && (
                      <div className="applicants-panel" style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px dashed var(--color-border)" }}>
                        <h5 style={{ marginBottom: "4px", color: "var(--color-primary)" }}>Applicants</h5>
                        {job.skills?.length > 0 && (
                          <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginBottom: "12px" }}>
                            Sorted by ATS resume match against: {job.skills.join(", ")}
                          </p>
                        )}
                        {(!applicantsData[job._id] || applicantsData[job._id].length === 0) ? (
                          <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>No applicants yet.</p>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {applicantsData[job._id].map(app => (
                              <div key={app._id} style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "10px", background: "var(--color-bg-hover)", borderRadius: "6px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                    <strong style={{ fontSize: "0.9rem", color: "var(--color-text)" }}>{app.student?.name}</strong>
                                    {app.match && app.match.score !== null && (
                                      <span
                                        className={`match-badge ${app.match.score >= 70 ? "match-high" : app.match.score >= 40 ? "match-mid" : "match-low"}`}
                                        title={app.match.missing.length ? `Missing: ${app.match.missing.join(", ")}` : "Matches every required skill"}
                                      >
                                        {app.match.score}% ATS Match
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                    {app.student?.resumeLink ? (
                                      <a
                                        href={resolveFileUrl(app.student.resumeLink)}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{ fontSize: "0.78rem", fontWeight: 700, textDecoration: "none", color: "#4338ca", background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: "6px", padding: "5px 10px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                                      >
                                        View Resume
                                      </a>
                                    ) : (
                                      <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "6px", padding: "5px 10px" }}>
                                        Resume not uploaded
                                      </span>
                                    )}
                                    <span className={`badge ${app.status === 'Hired' ? 'badge-placed' : (app.status === 'Rejected' ? 'badge-closed' : 'badge-open')}`} style={{ fontSize: "0.7rem", padding: "2px 6px" }}>{app.status}</span>
                                    {app.status === "Applied" && (
                                      <button onClick={() => openScheduleModal(app._id, job._id)} style={{ fontSize: "0.7rem", padding: "4px 8px", background: "var(--color-primary)", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Schedule Interview</button>
                                    )}
                                    {app.status === "Interview Scheduled" && (
                                      <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>{new Date(app.interviewDate).toLocaleDateString()}</span>
                                    )}
                                  </div>
                                </div>
                                <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                                  {app.student?.branch || "N/A"} · CGPA: {app.student?.cgpa ?? "N/A"}
                                  {job.minCgpa > 0 && !app.cgpaOk && (
                                    <span style={{ color: "#dc2626", fontWeight: 600 }}> (below required {job.minCgpa})</span>
                                  )}
                                  {app.student?.skills?.length > 0 && ` · Skills: ${app.student.skills.join(", ")}`}
                                </span>
                                {app.match && app.match.missing?.length > 0 && (
                                  <span style={{ fontSize: "0.75rem", color: "#dc2626" }}>Missing skills: {app.match.missing.join(", ")}</span>
                                )}
                                {app.meetsRequirements === false ? (
                                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "4px 8px", width: "fit-content" }}>
                                    ⚠️ Does not meet job requirements — candidate can still apply, but review before hiring
                                  </span>
                                ) : app.meetsRequirements === true ? (
                                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#15803d", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "4px 8px", width: "fit-content" }}>
                                    Meets all requirements for this job
                                  </span>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "post" && (
            <div className="dash-section">
              <div className="dash-section-header">
                <h3>Post a New Job Opening</h3>
              </div>
              <form className="dash-form" onSubmit={handlePostJob}>
                <label>Job Title
                  <input value={jobForm.title} onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })} placeholder="e.g. Software Engineer" />
                </label>
                <label>Description
                  <textarea rows="4" value={jobForm.description} onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })} placeholder="Role responsibilities, expectations..." />
                </label>
                <label>Eligibility Criteria (shown to students as text)
                  <input value={jobForm.eligibility} onChange={(e) => setJobForm({ ...jobForm, eligibility: e.target.value })} placeholder="e.g. CSE/ISE, CGPA 7+" />
                </label>
                <label>Minimum CGPA (optional)
                  <input type="number" step="0.1" min="0" max="10" value={jobForm.minCgpa} onChange={(e) => setJobForm({ ...jobForm, minCgpa: e.target.value })} placeholder="Leave blank for no minimum" />
                </label>
                <label className="full-span">
                  Eligible Branches (optional — leave all unchecked to allow every branch)
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "8px" }}>
                    {BRANCH_OPTIONS.map((b) => {
                      const checked = jobForm.allowedBranches.includes(b);
                      return (
                        <label
                          key={b}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: "6px",
                            padding: "6px 12px", borderRadius: "999px",
                            border: `1.5px solid ${checked ? "var(--color-primary)" : "var(--color-border)"}`,
                            background: checked ? "var(--color-primary)" : "var(--color-bg-subtle)",
                            color: checked ? "#fff" : "var(--color-text)",
                            fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setJobForm((prev) => ({
                                ...prev,
                                allowedBranches: checked
                                  ? prev.allowedBranches.filter((x) => x !== b)
                                  : [...prev.allowedBranches, b],
                              }));
                            }}
                            style={{ display: "none" }}
                          />
                          {b}
                        </label>
                      );
                    })}
                  </div>
                </label>
                <label>Package
                  <input value={jobForm.package} onChange={(e) => setJobForm({ ...jobForm, package: e.target.value })} placeholder="e.g. 6 LPA" />
                </label>
                <label>Location
                  <input value={jobForm.location} onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })} placeholder="e.g. Bengaluru, Remote" />
                </label>
                <label className="full-span">Required Skills (comma-separated — enables ATS resume screening)
                  <input value={jobForm.skills} onChange={(e) => setJobForm({ ...jobForm, skills: e.target.value })} placeholder="e.g. React, Node.js, SQL, Python" />
                </label>
                <button className="btn-primary-full" type="submit">Publish Job</button>
              </form>
            </div>
          )}

          {tab === "students" && (
            <div className="dash-section">
              <div className="dash-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <h3>All Registered Students <span className="dash-section-count">{students.length}</span></h3>
                <button
                  className="btn-secondary-sm"
                  onClick={() => setSortStudentsBy(sortStudentsBy === "cgpa" ? "recent" : "cgpa")}
                  title="Toggle sort order"
                >
                  Sorted by: {sortStudentsBy === "cgpa" ? "Highest CGPA" : "Recently Registered"}
                </button>
              </div>
              <p style={{ color: "var(--color-text-muted)", marginBottom: 20, fontSize: "0.9rem" }}>
                Select a job and click Hire to instantly post a placement update visible to all students.
              </p>
              <div className="list">
                {students.length === 0 && (
                  <div className="empty-state"><p>No students registered yet.</p></div>
                )}
                {(sortStudentsBy === "cgpa"
                  ? [...students].sort((a, b) => (b.cgpa || 0) - (a.cgpa || 0))
                  : students
                ).map((s) => (
                  <div className="row-card" key={s._id}>
                    <div className="card-info">
                      <h4>
                        {s.name}
                        {s.cgpa >= 9 && <span className="top-performer-badge" title="Top CGPA">Top Performer</span>}
                      </h4>
                      <p>{s.email}{s.branch ? ` · ${s.branch}` : ""}{s.cgpa != null ? ` · CGPA ${s.cgpa}` : ""}</p>
                      {s.skills?.length > 0 && (
                        <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>Skills: {s.skills.join(", ")}</p>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                        <span className={`badge ${s.placementStatus === "Placed" ? "badge-placed" : "badge-notplaced"}`}>
                          {s.placementStatus === "Placed" ? `Placed @ ${s.placedCompany}` : "Not Placed"}
                        </span>
                        {s.resumeLink ? (
                          <a
                            href={resolveFileUrl(s.resumeLink)}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: "0.78rem", fontWeight: 700, textDecoration: "none", color: "#4338ca", background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: "6px", padding: "3px 9px" }}
                          >
                            View Resume
                          </a>
                        ) : (
                          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "6px", padding: "3px 9px" }}>
                            Resume not uploaded
                          </span>
                        )}
                      </div>
                    </div>
                    {s.placementStatus !== "Placed" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                        <div className="card-actions" style={{ flexWrap: "wrap", gap: 8 }}>
                          <select
                            style={{ padding: "8px 12px", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", fontFamily: "var(--font-sans)", background: "var(--color-bg-subtle)", color: "var(--color-text)", cursor: "pointer" }}
                            value={hireSelections[s._id]?.jobId || ""}
                            onChange={(e) => updateSelection(s._id, "jobId", e.target.value)}
                          >
                            <option value="">Select job</option>
                            {jobs.filter((j) => j.status === "Open").map((j) => (
                              <option key={j._id} value={j._id}>{j.title}</option>
                            ))}
                          </select>
                          <input
                            style={{ width: 160, padding: "8px 12px", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", fontFamily: "var(--font-sans)", background: "var(--color-bg-subtle)", color: "var(--color-text)" }}
                            placeholder="Criteria (optional)"
                            value={hireSelections[s._id]?.eligibility || ""}
                            onChange={(e) => updateSelection(s._id, "eligibility", e.target.value)}
                          />
                          <button className="btn-primary-sm" onClick={() => handleHire(s._id)}>Hire</button>
                        </div>
                        {hireSelections[s._id]?.jobId && (
                          getMatchWarning(s, hireSelections[s._id].jobId) ? (
                            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "4px 8px", maxWidth: 320, textAlign: "right" }}>
                              {getMatchWarning(s, hireSelections[s._id].jobId)}
                            </span>
                          ) : (
                            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#15803d", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "4px 8px" }}>
                              Meets all requirements for this job
                            </span>
                          )
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "hires" && (
            <div className="dash-section">
              <div className="dash-section-header">
                <h3>Students You've Hired <span className="dash-section-count">{hires.length}</span></h3>
              </div>
              <div className="list">
                {hires.length === 0 && (
                  <div className="empty-state"><p>No hires recorded yet.</p></div>
                )}
                {hires.map((h) => (
                  <div className="row-card" key={h._id}>
                    <div className="card-info">
                      <h4>{h.studentName}</h4>
                      <p>{[h.jobTitle, h.package].filter(Boolean).join(" · ")}</p>
                      {h.eligibility && <p>Criteria: {h.eligibility}</p>}
                    </div>
                    <div className="card-actions">
                      <button className="btn-danger" onClick={() => handleUndoHire(h._id)}>Undo</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "profile" && (
            <div className="dash-section">
              <div className="dash-section-header">
                <h3>Update Company Profile</h3>
              </div>

              {profileLoading && (
                <div className="empty-state"><p>Loading your profile...</p></div>
              )}

              {!profileLoading && profileError && (
                <div className="empty-state">
                  <p>{profileError}</p>
                  <button className="btn-primary-sm" style={{ marginTop: 10 }} onClick={loadProfile}>Retry</button>
                </div>
              )}

              {!profileLoading && !profileError && profile && (
                <>
                  <form className="dash-form" onSubmit={handleProfileSave}>
                    <label>Headquarters
                      <input value={profile.headquarters || ""} onChange={(e) => setProfile({ ...profile, headquarters: e.target.value })} placeholder="e.g. Bangalore, Karnataka" />
                    </label>
                    <label>Description
                      <textarea rows="4" value={profile.description || ""} onChange={(e) => setProfile({ ...profile, description: e.target.value })} placeholder="About your company..." />
                    </label>
                    <label>Eligibility Criteria
                      <input value={profile.eligibility || ""} onChange={(e) => setProfile({ ...profile, eligibility: e.target.value })} placeholder="e.g. CSE/ISE, CGPA 7+" />
                    </label>
                    <label>Recruitment Process
                      <input value={profile.recruitmentProcess || ""} onChange={(e) => setProfile({ ...profile, recruitmentProcess: e.target.value })} placeholder="e.g. Online Test → Technical Interview → HR" />
                    </label>
                    <label>Skills Tested
                      <input value={profile.skillsTested || ""} onChange={(e) => setProfile({ ...profile, skillsTested: e.target.value })} placeholder="e.g. DSA, System Design, SQL" />
                    </label>
                    <label>Logo URL
                      <input value={profile.logoUrl || ""} onChange={(e) => setProfile({ ...profile, logoUrl: e.target.value })} placeholder="e.g. https://yourcompany.com/logo.png" />
                    </label>
                    <button className="btn-primary-full" type="submit" disabled={savingProfile}>
                      {savingProfile ? "Saving..." : "Save Profile"}
                    </button>
                  </form>

                  <div style={{ marginTop: 30, padding: 16, background: "var(--color-bg-hover)", borderRadius: 8, border: "1px solid var(--color-border)" }}>
                    <h4 style={{ marginBottom: 12, color: "var(--color-primary)" }}>How students see you</h4>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                      {profile.logoUrl && (
                        <img
                          src={profile.logoUrl}
                          alt={`${user?.name || "Company"} logo`}
                          style={{ width: 44, height: 44, objectFit: "contain", borderRadius: 6, border: "1px solid var(--color-border)" }}
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                      )}
                      <strong style={{ fontSize: "1rem" }}>{user?.name}</strong>
                    </div>
                    {profile.description && <p style={{ marginBottom: 12, color: "var(--color-text)" }}>{profile.description}</p>}
                    <div className="job-meta">
                      {profile.headquarters && <span className="meta-tag">HQ: {profile.headquarters}</span>}
                      {profile.eligibility && <span className="meta-tag">Req: {profile.eligibility}</span>}
                      {profile.skillsTested && <span className="meta-tag">Skills: {profile.skillsTested}</span>}
                    </div>
                    {!profile.description && !profile.headquarters && !profile.eligibility && !profile.skillsTested && (
                      <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                        Nothing filled in yet — students will only see your company name until you save some details above.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {scheduleModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}
          onClick={closeScheduleModal}
        >
          <div
            style={{ background: "var(--color-bg-subtle, #fff)", borderRadius: 12, border: "1px solid var(--color-border)", padding: 24, width: "100%", maxWidth: 380, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: 16, color: "var(--color-text)" }}>Schedule Interview</h3>

            <label style={{ display: "block", marginBottom: 14 }}>
              <span style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 6 }}>Date &amp; Time</span>
              <input
                type="datetime-local"
                value={scheduleModal.date}
                onChange={(e) => setScheduleModal({ ...scheduleModal, date: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "0.9rem", fontFamily: "var(--font-sans)", background: "var(--color-bg-subtle)", color: "var(--color-text)", boxSizing: "border-box" }}
              />
            </label>

            <label style={{ display: "block", marginBottom: 20 }}>
              <span style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 6 }}>Interview Link / Venue</span>
              <input
                type="text"
                placeholder="e.g. Zoom/Meet URL or room number"
                value={scheduleModal.link}
                onChange={(e) => setScheduleModal({ ...scheduleModal, link: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "0.9rem", fontFamily: "var(--font-sans)", background: "var(--color-bg-subtle)", color: "var(--color-text)", boxSizing: "border-box" }}
              />
            </label>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn-secondary-sm" onClick={closeScheduleModal}>Cancel</button>
              <button className="btn-primary-sm" onClick={submitScheduleInterview}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanyDashboard;
