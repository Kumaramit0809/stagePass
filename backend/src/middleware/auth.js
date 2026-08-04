const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ success: false, message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query("SELECT id,name,email,role,avatar,phone FROM users WHERE id=? AND is_active=1", [decoded.id]);
    if (!rows.length) return res.status(401).json({ success: false, message: "User not found" });

    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access required" });
  }
  next();
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const [rows] = await pool.query("SELECT id,name,email,role FROM users WHERE id=? AND is_active=1", [decoded.id]);
      if (rows.length) req.user = rows[0];
    }
  } catch {}
  next();
};

module.exports = { authenticate, requireAdmin, optionalAuth };
