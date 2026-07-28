const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { register, login } = require("../controllers/studentAuthController");
const { getProfile, updateProfile, getCompanies, applyForJob, getApplications, uploadResume } = require("../controllers/studentController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Resolve the uploads folder relative to this file (not process.cwd()),
// so resumes always land in backend/uploads/resumes no matter where the
// server was started from - this is what server.js serves as static files.
const resumesDir = path.join(__dirname, "..", "uploads", "resumes");
fs.mkdirSync(resumesDir, { recursive: true });

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, resumesDir);
  },
  filename: function (req, file, cb) {
    cb(null, req.user.id + "-" + Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

router.post("/register", register);
router.post("/login", login);

// Protected student routes
router.use(protect, authorize("student"));

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.post("/upload-resume", upload.single("resume"), uploadResume);
router.get("/companies", getCompanies);
router.post("/jobs/:jobId/apply", applyForJob);
router.get("/applications", getApplications);

module.exports = router;