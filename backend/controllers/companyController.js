const Job = require("../models/Job");
const Company = require("../models/Company");
const Student = require("../models/Student");
const PlacementUpdate = require("../models/PlacementUpdate");
const Application = require("../models/Application");
const { computeSkillMatch } = require("../utils/atsMatch");

// GET /api/company/profile  (logged-in company views its own profile)
exports.getMyProfile = async (req, res) => {
  try {
    const company = await Company.findById(req.user.id).select("-password");
    if (!company) return res.status(404).json({ message: "Company not found" });
    res.status(200).json(company);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// PUT /api/company/profile  (company updates its own details)
exports.updateMyProfile = async (req, res) => {
  try {
    const { headquarters, description, eligibility, recruitmentProcess, skillsTested, logoUrl } = req.body;
    const company = await Company.findByIdAndUpdate(
      req.user.id,
      { headquarters, description, eligibility, recruitmentProcess, skillsTested, logoUrl },
      { new: true }
    ).select("-password");
    res.status(200).json({ message: "Profile updated", company });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST /api/company/jobs  (company posts a new job)
exports.createJob = async (req, res) => {
  try {
    const { title, description, eligibility, package: pkg, location, minCgpa, allowedBranches, skills } = req.body;
    if (!title) return res.status(400).json({ message: "Job title is required" });

    const normalizedSkills = Array.isArray(skills)
      ? skills.map((s) => s.trim()).filter(Boolean)
      : String(skills || "").split(",").map((s) => s.trim()).filter(Boolean);

    const job = await Job.create({
      company: req.user.id,
      title,
      description,
      eligibility,
      package: pkg,
      location,
      minCgpa: minCgpa ? Number(minCgpa) : 0,
      // No branches picked = open to everyone (don't invent a restriction the company never asked for)
      allowedBranches: Array.isArray(allowedBranches) ? allowedBranches : [],
      // Skills used for automated ATS-style resume screening of applicants
      skills: normalizedSkills,
    });
    res.status(201).json({ message: "Job posted", job });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/company/jobs  (company views only its own jobs)
exports.getMyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ company: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(jobs);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// PUT /api/company/jobs/:id  (edit a job, or close it)
exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, company: req.user.id });
    if (!job) return res.status(404).json({ message: "Job not found" });

    const updates = { ...req.body };
    if (updates.skills !== undefined) {
      updates.skills = Array.isArray(updates.skills)
        ? updates.skills.map((s) => s.trim()).filter(Boolean)
        : String(updates.skills || "").split(",").map((s) => s.trim()).filter(Boolean);
    }

    Object.assign(job, updates);
    await job.save();
    res.status(200).json({ message: "Job updated", job });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE /api/company/jobs/:id
exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({ _id: req.params.id, company: req.user.id });
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.status(200).json({ message: "Job deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/company/students  (company browses every registered student, to decide who to hire)
exports.getAllStudentsForCompany = async (req, res) => {
  try {
    const students = await Student.find().select("-password -resetOtp -resetOtpExpires").sort({ createdAt: -1 });
    res.status(200).json(students);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST /api/company/hire  (company directly marks a student as hired for one of ITS OWN jobs)
exports.hireStudent = async (req, res) => {
  try {
    const { studentId, jobId, eligibility } = req.body;
    if (!studentId || !jobId) {
      return res.status(400).json({ message: "studentId and jobId are required" });
    }

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const job = await Job.findOne({ _id: jobId, company: req.user.id });
    if (!job) return res.status(404).json({ message: "Job not found for your company" });

    const company = await Company.findById(req.user.id);

    student.placementStatus = "Placed";
    student.placedCompany = company.name;
    student.placedJobTitle = job.title;
    student.placedPackage = job.package || "";
    student.placedEligibility = eligibility || job.eligibility || "";
    await student.save();

    const update = await PlacementUpdate.create({
      student: student._id,
      studentName: student.name,
      studentBranch: student.branch || "",
      studentCgpa: student.cgpa ?? null,
      company: company._id,
      companyName: company.name,
      jobTitle: job.title,
      package: job.package || "",
      eligibility: eligibility || job.eligibility || "",
      hiredBy: "company",
    });

    // Keep the Applicants list for this job in sync: if the student had
    // already applied, mark that application Hired; if they were hired
    // directly (never applied), create the application record now so
    // "View Applicants" shows every hire, not just ones who applied first.
    const existingApplication = await Application.findOne({ job: job._id, student: student._id });
    if (existingApplication) {
      existingApplication.status = "Hired";
      await existingApplication.save();
    } else {
      await Application.create({
        job: job._id,
        student: student._id,
        company: company._id,
        status: "Hired",
      });
    }

    res.status(200).json({ message: "Student hired successfully", update });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/company/hires  (list of students THIS company has hired)
exports.getMyHires = async (req, res) => {
  try {
    const hires = await PlacementUpdate.find({ company: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(hires);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE /api/company/hires/:id  (company undoes a hire IT made - resets the student too)
exports.deleteMyHire = async (req, res) => {
  try {
    const update = await PlacementUpdate.findOne({ _id: req.params.id, company: req.user.id });
    if (!update) return res.status(404).json({ message: "Hire record not found" });

    const student = await Student.findById(update.student);
    if (student && student.placedCompany === update.companyName && student.placedJobTitle === update.jobTitle) {
      student.placementStatus = "Not Placed";
      student.placedCompany = null;
      student.placedJobTitle = null;
      student.placedPackage = null;
      student.placedEligibility = null;
      await student.save();
    }

    // Revert the linked application too, so it doesn't stay stuck as "Hired"
    // with no real placement behind it.
    const job = await Job.findOne({ company: req.user.id, title: update.jobTitle });
    if (job) {
      await Application.updateMany(
        { job: job._id, student: update.student, status: "Hired" },
        { status: "Applied" }
      );
    }

    await PlacementUpdate.findByIdAndDelete(update._id);
    res.status(200).json({ message: "Hire removed, student reverted to Not Placed" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/company/jobs/:jobId/applicants
exports.getJobApplicants = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findOne({ _id: jobId, company: req.user.id });
    if (!job) return res.status(404).json({ message: "Job not found" });

    const applicants = await Application.find({ job: jobId })
      .populate("student", "-password")
      .sort("-createdAt");

    // Attach an ATS-style skill match score for each applicant so the
    // company can quickly see how well a resume lines up with what the
    // job requires, without opening every profile individually. Also flag
    // whether the candidate clears the CGPA bar - students can still apply
    // even if they don't meet requirements, but the company should see that
    // clearly instead of finding out only after scheduling an interview.
    const scored = applicants.map((app) => {
      const match = computeSkillMatch(job.skills, app.student?.skills);
      const cgpaOk = (app.student?.cgpa ?? 0) >= (job.minCgpa || 0);
      const skillsOk = match.score === null || match.score === 100;
      return {
        ...app.toObject(),
        match,
        meetsRequirements: cgpaOk && skillsOk,
        cgpaOk,
      };
    });

    // Best matches first (applicants where the job has no required skills
    // keep their original recency order, since there's nothing to rank).
    scored.sort((a, b) => (b.match.score ?? -1) - (a.match.score ?? -1));

    res.status(200).json(scored);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// PUT /api/company/applications/:id/status
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const application = await Application.findOneAndUpdate(
      { _id: req.params.id, company: req.user.id },
      { status },
      { new: true }
    );
    if (!application) return res.status(404).json({ message: "Application not found" });
    res.status(200).json({ message: "Status updated", application });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// PUT /api/company/applications/:id/schedule-interview
exports.scheduleInterview = async (req, res) => {
  try {
    const { interviewDate, interviewLink } = req.body;
    const application = await Application.findOneAndUpdate(
      { _id: req.params.id, company: req.user.id },
      { 
        status: "Interview Scheduled",
        interviewDate,
        interviewLink 
      },
      { new: true }
    );
    if (!application) return res.status(404).json({ message: "Application not found" });
    res.status(200).json({ message: "Interview scheduled", application });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
