const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Company = require("../models/Company");
const Student = require("../models/Student");
const nodemailer = require("nodemailer");
const INSTITUTIONS = require("../constants/institutions");

const getTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

const getModelByRole = (role) => {
  if (role === "admin") return Admin;
  if (role === "company") return Company;
  return Student;
};
exports.registerAdmin = async (req, res) => {
  try {
    const { institution, name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    // Institution must be one of the whitelisted colleges, and the email domain must
    // match that institution's assigned domain - stops a random person registering
    // as the admin of a college they have no real affiliation with.
    const match = INSTITUTIONS.find((i) => i.name === institution);
    if (!match) return res.status(400).json({ message: "Please select a valid institution from the list." });

    const emailDomain = (email.split("@")[1] || "").toLowerCase().trim();
    if (emailDomain !== match.domain) {
      return res.status(400).json({ message: `Please use your official institution email (e.g. admin@${match.domain})` });
    }

    const existing = await Admin.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await Admin.create({ name: name || "College Admin", institution: match.name, email, password: hashedPassword });
    
    res.status(201).json({ message: "Admin registered successfully", adminId: admin._id });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.registerCompany = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "All fields are required" });

    const existing = await Company.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const company = await Company.create({ name, email, password: hashedPassword });
    
    res.status(201).json({ message: "Company registered successfully", companyId: company._id });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const roleModels = { admin: Admin, company: Company, student: Student };
    const Model = roleModels[role];
    if (!Model) {
      return res.status(400).json({ message: "Please select a valid role (Student, Company, or Admin)." });
    }

    const account = await Model.findOne({ email });
    if (!account) {
      return res.status(404).json({ message: `No ${role} account found with this email. Double-check your email or try a different role tab.` });
    }

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    if (role === "admin") {
      const token = jwt.sign({ id: account._id, role: "admin", subRole: account.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
      return res.status(200).json({ message: "Login successful", token, role: "admin", user: { id: account._id, name: account.name, email: account.email, subRole: account.role } });
    }

    const token = jwt.sign({ id: account._id, role }, process.env.JWT_SECRET, { expiresIn: "1d" });
    return res.status(200).json({ message: "Login successful", token, role, user: { id: account._id, name: account.name, email: account.email } });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email || !role) return res.status(400).json({ message: "Email and role are required" });

    const Model = getModelByRole(role);
    const user = await Model.findOne({ email });
    if (!user) return res.status(404).json({ message: "No account with that email" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOtp = otp;
    user.resetOtpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Your Password Reset OTP",
      html: `<p>Hi ${user.name},</p><p>Your OTP to reset your password is:</p><h2 style="letter-spacing:4px;">${otp}</h2><p>This OTP is valid for 10 minutes. If you didn't request this, ignore this email.</p>`,
    });
    res.status(200).json({ message: "OTP sent to your email" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp, role } = req.body;
    if (!email || !otp || !role) return res.status(400).json({ message: "Email, OTP, and role are required" });

    const Model = getModelByRole(role);
    const user = await Model.findOne({ email, resetOtp: otp, resetOtpExpires: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: "Invalid or expired OTP" });

    res.status(200).json({ message: "OTP verified" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, password, role } = req.body;
    if (!email || !otp || !password || !role) return res.status(400).json({ message: "All fields are required" });

    const Model = getModelByRole(role);
    const user = await Model.findOne({ email, resetOtp: otp, resetOtpExpires: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: "Invalid or expired OTP" });

    user.password = await bcrypt.hash(password, 10);
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};