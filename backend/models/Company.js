const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    resetOtp: { type: String },
    resetOtpExpires: { type: Date },

    // Company profile (shown on the college placement/company page)
    headquarters: { type: String, default: "" },
    description: { type: String, default: "" },
    eligibility: { type: String, default: "" },
    recruitmentProcess: { type: String, default: "" },
    skillsTested: { type: String, default: "" },
    logoUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Company", companySchema);
