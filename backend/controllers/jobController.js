const Job = require("../models/Job");

// GET /api/jobs  (public - students & landing page use this)
exports.getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ status: "Open" })
      .populate("company", "name headquarters logoUrl")
      .sort({ createdAt: -1 });
    res.status(200).json(jobs);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/jobs/:id
exports.getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate("company");
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.status(200).json(job);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
