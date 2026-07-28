const bcrypt = require("bcryptjs");
const Company = require("../models/Company");
const Student = require("../models/Student");
const Job = require("../models/Job");
const PlacementUpdate = require("../models/PlacementUpdate");
const Application = require("../models/Application");

// GET /api/admin/companies
exports.getAllCompanies = async (req, res) => {
  try {
    const companies = await Company.find().select("-password").sort({ createdAt: -1 });
    res.status(200).json(companies);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST /api/admin/companies  (admin creates a new company account)
exports.addCompany = async (req, res) => {
  try {
    const { name, email, password, headquarters, description, eligibility, recruitmentProcess, skillsTested } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    const existing = await Company.findOne({ email });
    if (existing) return res.status(400).json({ message: "A company with this email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const company = await Company.create({
      name, email, password: hashedPassword,
      headquarters, description, eligibility, recruitmentProcess, skillsTested,
    });
    res.status(201).json({ message: "Company added", company: { ...company.toObject(), password: undefined } });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE /api/admin/companies/:id
exports.deleteCompany = async (req, res) => {
  try {
    await Company.findByIdAndDelete(req.params.id);
    await Job.deleteMany({ company: req.params.id });
    // Also remove any applications students submitted to this company's jobs.
    // Leaving them behind creates "orphaned" applications whose job/company
    // no longer exist, which crashes any page that assumes they're populated.
    await Application.deleteMany({ company: req.params.id });
    res.status(200).json({ message: "Company removed" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/admin/students
exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.find().select("-password -resetOtp -resetOtpExpires").sort({ createdAt: -1 });
    res.status(200).json(students);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE /api/admin/students/:id  (admin removes a student account entirely)
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    await PlacementUpdate.deleteMany({ student: req.params.id });
    res.status(200).json({ message: "Student removed" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/admin/jobs  (admin sees every job from every company)
exports.getAllJobsAdmin = async (req, res) => {
  try {
    const jobs = await Job.find().populate("company", "name").sort({ createdAt: -1 });
    res.status(200).json(jobs);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST /api/admin/mark-hired
// Admin marks a student as hired by a company -> updates student + creates a public feed post
exports.markStudentHired = async (req, res) => {
  try {
    const { studentId, companyId, jobTitle, package: pkg, eligibility } = req.body;
    if (!studentId || !companyId) {
      return res.status(400).json({ message: "studentId and companyId are required" });
    }

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: "Company not found" });

    student.placementStatus = "Placed";
    student.placedCompany = company.name;
    student.placedJobTitle = jobTitle || "";
    student.placedPackage = pkg || "";
    student.placedEligibility = eligibility || "";
    await student.save();

    const update = await PlacementUpdate.create({
      student: student._id,
      studentName: student.name,
      studentBranch: student.branch || "",
      studentCgpa: student.cgpa ?? null,
      company: company._id,
      companyName: company.name,
      jobTitle: jobTitle || "",
      package: pkg || "",
      eligibility: eligibility || "",
      hiredBy: "admin",
    });

    res.status(200).json({ message: "Student marked as placed", update });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/admin/placements  (full placement record list, for the admin's own records tab)
exports.getAllPlacements = async (req, res) => {
  try {
    const updates = await PlacementUpdate.find().sort({ createdAt: -1 });
    res.status(200).json(updates);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE /api/admin/placements/:id  (admin can undo ANY placement, by company or by admin)
exports.deletePlacement = async (req, res) => {
  try {
    const update = await PlacementUpdate.findByIdAndDelete(req.params.id);
    if (!update) return res.status(404).json({ message: "Placement record not found" });

    // Reset the student back to Not Placed only if this was their current placement
    const student = await Student.findById(update.student);
    if (student && student.placedCompany === update.companyName && student.placedJobTitle === update.jobTitle) {
      student.placementStatus = "Not Placed";
      student.placedCompany = null;
      student.placedJobTitle = null;
      student.placedPackage = null;
      student.placedEligibility = null;
      await student.save();
    }

    res.status(200).json({ message: "Placement removed" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/admin/officers  (super_admin only - list every placement officer account)
exports.getAllOfficers = async (req, res) => {
  try {
    const officers = await Admin.find({ role: "placement_officer" }).select("-password -resetOtp -resetOtpExpires").sort({ createdAt: -1 });
    res.status(200).json(officers);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST /api/admin/officers  (super_admin only - create a new placement officer login)
exports.addPlacementOfficer = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    const existing = await Admin.findOne({ email });
    if (existing) return res.status(400).json({ message: "An account with this email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const officer = await Admin.create({ name, email, password: hashedPassword, role: "placement_officer" });
    res.status(201).json({ message: "Placement officer added", officer: { ...officer.toObject(), password: undefined } });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE /api/admin/officers/:id  (super_admin only)
exports.deletePlacementOfficer = async (req, res) => {
  try {
    const officer = await Admin.findOneAndDelete({ _id: req.params.id, role: "placement_officer" });
    if (!officer) return res.status(404).json({ message: "Officer not found" });
    res.status(200).json({ message: "Officer removed" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/admin/analytics
exports.getAnalytics = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const totalCompanies = await Company.countDocuments();
    const totalJobs = await Job.countDocuments();
    
    // Placements by branch
    const placements = await PlacementUpdate.find();
    const branchCounts = {};
    placements.forEach(p => {
      if (!p.studentBranch) return; // skip records with no branch on file - don't show an "Unknown" bar
      branchCounts[p.studentBranch] = (branchCounts[p.studentBranch] || 0) + 1;
    });

    const branchData = Object.keys(branchCounts).map(branch => ({
      name: branch,
      placed: branchCounts[branch]
    }));

    // Top performers by CGPA (highest marks first) - useful for shortlisting/highlighting toppers
    const topStudents = await Student.find()
      .select("name email branch cgpa placementStatus")
      .sort({ cgpa: -1 })
      .limit(5);

    res.json({
      metrics: { totalStudents, totalCompanies, totalJobs, totalPlacements: placements.length },
      branchData,
      topStudents
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
