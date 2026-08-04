const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { pool } = require("../config/db");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

const formatUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  phone: user.phone,
  role: user.role,
});

// POST /api/auth/register
const register = async (req, res) => {
  const { name, email, password, phone } = req.body;
  try {
    const [existing] = await pool.query("SELECT id FROM users WHERE email=?", [email]);
    if (existing.length) return res.status(400).json({ success: false, message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      "INSERT INTO users (name,email,password,phone) VALUES (?,?,?,?)",
      [name, email, hashed, phone || null]
    );
    const token = generateToken(result.insertId);
    const [user] = await pool.query("SELECT id,name,email,avatar,phone,role FROM users WHERE id=?", [result.insertId]);

    res.status(201).json({ success: true, token, user: formatUser(user[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Registration failed" });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email=? AND is_active=1", [email]);
    if (!rows.length) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const user = rows[0];
    if (!user.password) return res.status(401).json({ success: false, message: "Please login with Google" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = generateToken(user.id);
    res.json({ success: true, token, user: formatUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Login failed" });
  }
};

// POST /api/auth/google
const googleAuth = async (req, res) => {
  const { credential } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { sub: googleId, name, email, picture } = ticket.getPayload();

    let [rows] = await pool.query("SELECT * FROM users WHERE google_id=? OR email=?", [googleId, email]);

    let userId;
    if (rows.length) {
      userId = rows[0].id;
      await pool.query("UPDATE users SET google_id=?,avatar=?,name=? WHERE id=?", [googleId, picture, name, userId]);
    } else {
      const [result] = await pool.query(
        "INSERT INTO users (name,email,google_id,avatar) VALUES (?,?,?,?)",
        [name, email, googleId, picture]
      );
      userId = result.insertId;
    }

    const [user] = await pool.query("SELECT id,name,email,avatar,phone,role FROM users WHERE id=?", [userId]);
    const token = generateToken(userId);
    res.json({ success: true, token, user: formatUser(user[0]) });
  } catch (err) {
    console.error(err);
    res.status(401).json({ success: false, message: "Google authentication failed" });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ success: true, user: formatUser(req.user) });
};

// PATCH /api/auth/profile
const updateProfile = async (req, res) => {
  const { name, phone } = req.body;
  try {
    await pool.query("UPDATE users SET name=?,phone=? WHERE id=?", [name, phone, req.user.id]);
    const [user] = await pool.query("SELECT id,name,email,avatar,phone,role FROM users WHERE id=?", [req.user.id]);
    res.json({ success: true, user: formatUser(user[0]) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Update failed" });
  }
};

module.exports = { register, login, googleAuth, getMe, updateProfile };
