const Student = require("../models/Student");
const Company = require("../models/Company");
const Job = require("../models/Job");
const Application = require("../models/Application");

// Get Profile
exports.getProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select("-password");
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const { branch, cgpa, resumeLink, skills } = req.body;
    const update = { branch, cgpa, resumeLink };
    // Skills may arrive as an array already, or as a comma-separated string
    // from a plain text input - normalize either way into a clean array.
    if (skills !== undefined) {
      update.skills = Array.isArray(skills)
        ? skills.map((s) => s.trim()).filter(Boolean)
        : String(skills).split(",").map((s) => s.trim()).filter(Boolean);
    }
    const student = await Student.findByIdAndUpdate(
      req.user.id,
      update,
      { new: true }
    ).select("-password");
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Upload Resume
exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const resumeUrl = `/uploads/resumes/${req.file.filename}`;

    // Sanity check: confirm the file actually landed on disk where we expect
    // before saving the link - catches silent multer/disk issues immediately
    // instead of only finding out later when someone tries to open it.
    const fs = require("fs");
    if (!fs.existsSync(req.file.path)) {
      console.error(`❌ Resume upload reported success but file is missing at: ${req.file.path}`);
      return res.status(500).json({ message: "Upload failed - file was not saved. Please try again." });
    }
    console.log(`✅ Resume saved to: ${req.file.path}`);

    const student = await Student.findByIdAndUpdate(req.user.id, { resumeLink: resumeUrl }, { new: true }).select("-password");
    res.json({ message: "Resume uploaded successfully", student });
  } catch (error) {
    res.status(500).json({ message: "Server error during upload" });
  }
};

// Get Companies
exports.getCompanies = async (req, res) => {
  try {
    const companies = await Company.find().select("-password");
    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Apply for Job
exports.applyForJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });

    // Check if already applied
    const existing = await Application.findOne({ job: jobId, student: req.user.id });
    if (existing) return res.status(400).json({ message: "Already applied" });

    // Fetch the student to check eligibility
    const student = await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    // Eligibility Check: CGPA
    if (student.cgpa < job.minCgpa) {
      return res.status(400).json({ message: `Eligibility failed: Minimum CGPA of ${job.minCgpa} is required.` });
    }

    // Eligibility Check: Branch
    if (job.allowedBranches && job.allowedBranches.length > 0) {
      if (!job.allowedBranches.includes(student.branch)) {
        return res.status(400).json({ message: `Eligibility failed: Your branch (${student.branch}) is not eligible for this job.` });
      }
    }

    const application = await Application.create({
      job: jobId,
      student: req.user.id,
      company: job.company,
      status: "Applied"
    });
    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get Applications
exports.getApplications = async (req, res) => {
  try {
    const applications = await Application.find({ student: req.user.id })
      .populate("job")
      .populate({ path: "company", select: "name" })
      .sort("-createdAt");
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
