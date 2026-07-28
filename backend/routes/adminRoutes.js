const express = require("express");
const router = express.Router();
const { protect, authorize, requireSuperAdmin } = require("../middleware/authMiddleware");
const {
  getAllCompanies,
  addCompany,
  deleteCompany,
  getAllStudents,
  deleteStudent,
  getAllJobsAdmin,
  markStudentHired,
  getAllPlacements,
  deletePlacement,
  getAnalytics,
  getAllOfficers,
  addPlacementOfficer,
  deletePlacementOfficer,
} = require("../controllers/adminController");

router.use(protect, authorize("admin"));

router.get("/companies", getAllCompanies);
router.post("/companies", addCompany);
router.delete("/companies/:id", deleteCompany);

router.get("/students", getAllStudents);
router.delete("/students/:id", deleteStudent);

router.get("/jobs", getAllJobsAdmin);

router.post("/mark-hired", markStudentHired);
router.get("/placements", getAllPlacements);
router.delete("/placements/:id", deletePlacement);

router.get("/analytics", getAnalytics);

// Placement Officer management - Super Admin only
router.get("/officers", requireSuperAdmin, getAllOfficers);
router.post("/officers", requireSuperAdmin, addPlacementOfficer);
router.delete("/officers/:id", requireSuperAdmin, deletePlacementOfficer);

module.exports = router;
