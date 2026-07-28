// One-time script to create test Company and Admin accounts.
// Run this once with: node seed.js
// Then you can delete this file or keep it for future resets.

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Company = require("./models/Company");
const Admin = require("./models/Admin");

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected for seeding");

    // ---------- Create test Company ----------
    const companyEmail = "company@test.com";
    const companyPassword = "company123";

    const existingCompany = await Company.findOne({ email: companyEmail });
    if (!existingCompany) {
      const hashedPassword = await bcrypt.hash(companyPassword, 10);
      await Company.create({
        name: "Demo Company (delete me)",
        email: companyEmail,
        password: hashedPassword,
      });
      console.log(`Company created -> email: ${companyEmail} | password: ${companyPassword}`);
    } else {
      console.log("Company already exists, skipped");
    }

    // ---------- Create Super Admin ----------
    const adminEmail = "admin@test.com";
    const adminPassword = "admin123";

    const existingAdmin = await Admin.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await Admin.create({
        name: "Super Admin",
        email: adminEmail,
        password: hashedPassword,
      });
      console.log(`Admin created -> email: ${adminEmail} | password: ${adminPassword}`);
    } else {
      console.log("Admin already exists, skipped");
    }

    console.log("Seeding done.");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err.message);
    process.exit(1);
  }
};

seed();