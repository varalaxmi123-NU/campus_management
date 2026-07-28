const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    eligibility: { type: String, default: "" }, // e.g. "CSE/ISE, CGPA 7+"
    minCgpa: { type: Number, default: 0 },
    // Empty array = open to every branch. Only restrict when the company
    // explicitly picks branches when posting the job.
    allowedBranches: { type: [String], default: [] },
    package: { type: String, default: "" },     // e.g. "6 LPA"
    location: { type: String, default: "" },
    // Skills the company is screening for (ATS-style matching against a
    // candidate's profile skills). Empty = no automated screening for this job.
    skills: { type: [String], default: [] },
    status: { type: String, enum: ["Open", "Closed"], default: "Open" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", jobSchema);
