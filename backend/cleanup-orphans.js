// One-time cleanup script for data created BEFORE this fix.
// Deletes any Application whose job or company was already removed
// (e.g. when you deleted "Test Company" earlier, its applications were
// left behind pointing at nothing, which crashed the student dashboard).
//
// Run once with: node cleanup-orphans.js
// Safe to delete afterwards.

require("dotenv").config();
const mongoose = require("mongoose");
const Application = require("./models/Application");
const Job = require("./models/Job");
const Company = require("./models/Company");

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    const applications = await Application.find();
    let removed = 0;

    for (const app of applications) {
      const [jobExists, companyExists] = await Promise.all([
        Job.exists({ _id: app.job }),
        Company.exists({ _id: app.company }),
      ]);
      if (!jobExists || !companyExists) {
        await Application.findByIdAndDelete(app._id);
        removed++;
      }
    }

    console.log(`Cleanup done. Removed ${removed} orphaned application(s).`);
    process.exit(0);
  } catch (err) {
    console.error("Cleanup failed:", err.message);
    process.exit(1);
  }
};

run();
