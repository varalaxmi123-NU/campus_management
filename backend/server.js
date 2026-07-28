require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const studentRoutes = require("./routes/studentRoutes");
const authRoutes = require("./routes/authRoutes");
const jobRoutes = require("./routes/jobRoutes");
const companyRoutes = require("./routes/companyRoutes");
const adminRoutes = require("./routes/adminRoutes");
const placementRoutes = require("./routes/placementRoutes");

const path = require("path");
const fs = require("fs");

const app = express();
connectDB();

// Make sure the uploads folder (and resumes subfolder) always exists so
// static serving below never 404s just because the directory is missing.
const uploadsDir = path.join(__dirname, "uploads");
fs.mkdirSync(path.join(uploadsDir, "resumes"), { recursive: true });
console.log(`📁 Serving uploaded files from: ${uploadsDir}`);
console.log(`   (if a resume 404s, check the exact file exists inside ${path.join(uploadsDir, "resumes")})`);

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// If a request for an uploaded file falls through (i.e. the file wasn't
// found by express.static above), log it clearly instead of a silent
// generic 404 - makes it obvious in the terminal exactly which file was
// requested and where the server looked for it.
app.use('/uploads', (req, res) => {
  console.log(`⚠️  Requested file not found on disk: ${path.join(uploadsDir, req.path)}`);
  res.status(404).json({ message: `File not found: ${req.path}` });
});

app.use("/api/student", studentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/placements", placementRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
