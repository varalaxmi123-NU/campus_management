const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, default: "Super Admin" },
    institution: { type: String, default: null },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    // "super_admin" = the original college admin account, can create Placement Officers.
    // "placement_officer" = created by a super_admin, can manage students & companies but not create other officers.
    role: { type: String, enum: ["super_admin", "placement_officer"], default: "super_admin" },
    resetOtp: { type: String },
    resetOtpExpires: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);