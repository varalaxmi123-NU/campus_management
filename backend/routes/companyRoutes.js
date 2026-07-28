const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getMyProfile,
  updateMyProfile,
  createJob,
  getMyJobs,
  updateJob,
  deleteJob,
  getAllStudentsForCompany,
  hireStudent,
  getMyHires,
  deleteMyHire,
  getJobApplicants,
  updateApplicationStatus,
  scheduleInterview,
} = require("../controllers/companyController");

router.use(protect, authorize("company"));

router.get("/profile", getMyProfile);
router.put("/profile", updateMyProfile);

router.get("/jobs", getMyJobs);
router.post("/jobs", createJob);
router.put("/jobs/:id", updateJob);
router.delete("/jobs/:id", deleteJob);

router.get("/students", getAllStudentsForCompany);
router.post("/hire", hireStudent);
router.get("/hires", getMyHires);
router.delete("/hires/:id", deleteMyHire);

router.get("/jobs/:jobId/applicants", getJobApplicants);
router.put("/applications/:id/status", updateApplicationStatus);
router.put("/applications/:id/schedule-interview", scheduleInterview);

module.exports = router;
