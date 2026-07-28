const jwt = require("jsonwebtoken");

exports.protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    res.status(401).json({ message: "Token invalid or expired" });
  }
};

// Usage: authorize("admin"), authorize("admin", "company")
exports.authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: "You do not have permission to do this" });
  }
  next();
};

// Only the original Super Admin can create/remove other admin (Placement Officer) accounts.
// A Placement Officer's token has subRole "placement_officer" and is blocked here.
exports.requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin" || req.user.subRole !== "super_admin") {
    return res.status(403).json({ message: "Only the Super Admin can do this" });
  }
  next();
};
