const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    status: { 
      type: String, 
      enum: ["Applied", "Shortlisted", "Interview Scheduled", "Hired", "Rejected"], 
      default: "Applied" 
    },
    interviewDate: { type: Date },
    interviewLink: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Application", applicationSchema);
