const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    rollNo: { type: String },
    
    // Academic Details
    branch: { type: String, default: "Computer Science" },
    cgpa: { type: Number, default: 0 },
    // Skills the student lists on their profile, used for ATS-style
    // resume screening against a job's required skills.
    skills: { type: [String], default: [] },
    resumeLink: { type: String, default: "" },
    resetOtp: { type: String },
    resetOtpExpires: { type: Date },

    // Placement status
    placementStatus: { type: String, enum: ["Not Placed", "Placed"], default: "Not Placed" },
    placedCompany: { type: String, default: null },
    placedJobTitle: { type: String, default: null },
    placedPackage: { type: String, default: null },
    placedEligibility: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", studentSchema);
