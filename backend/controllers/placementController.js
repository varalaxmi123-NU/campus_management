const PlacementUpdate = require("../models/PlacementUpdate");

// GET /api/placements  (public feed - landing page + every student dashboard shows this)
exports.getFeed = async (req, res) => {
  try {
    const updates = await PlacementUpdate.find().sort({ createdAt: -1 }).limit(50);
    res.status(200).json(updates);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
