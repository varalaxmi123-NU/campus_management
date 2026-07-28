const Student = require("../models/Student");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

exports.register = async (req, res) => {
  try {
    const { name, email, password, rollNo, branch, cgpa } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const existing = await Student.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const student = await Student.create({ name, email, password: hashedPassword, rollNo, branch, cgpa });
    res.status(201).json({ message: "Registered successfully", studentId: student._id });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const student = await Student.findOne({ email });
    if (!student) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    const token = jwt.sign({ id: student._id, role: "student" }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.status(200).json({ message: "Login successful", token, student: { id: student._id, name: student.name, email: student.email } });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Password reset moved to universal authController