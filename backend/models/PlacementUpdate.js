const mongoose = require("mongoose");

// A public feed item so every student can see who got hired, where, and based on what criteria.
const placementUpdateSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    studentName: { type: String, required: true },
    studentBranch: { type: String, default: "" },
    studentCgpa: { type: Number, default: null },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    companyName: { type: String, required: true },
    jobTitle: { type: String, default: "" },
    package: { type: String, default: "" },
    eligibility: { type: String, default: "" }, // the criteria the student was selected against
    hiredBy: { type: String, enum: ["admin", "company"], default: "admin" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlacementUpdate", placementUpdateSchema);
