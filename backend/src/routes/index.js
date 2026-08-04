const express = require("express");
const { body } = require("express-validator");
const { authenticate, requireAdmin } = require("../middleware/auth");
const authCtrl = require("../controllers/authController");
const eventCtrl = require("../controllers/eventController");
const orderCtrl = require("../controllers/orderController");
const adminCtrl = require("../controllers/adminController");

const router = express.Router();

// ─── AUTH ────────────────────────────────────────────────
router.post("/auth/register", [
  body("name").trim().notEmpty().withMessage("Name required"),
  body("email").isEmail().withMessage("Valid email required"),
  body("password").isLength({ min: 6 }).withMessage("Password min 6 chars"),
], authCtrl.register);
router.post("/auth/login", authCtrl.login);
router.post("/auth/google", authCtrl.googleAuth);
router.get("/auth/me", authenticate, authCtrl.getMe);
router.patch("/auth/profile", authenticate, authCtrl.updateProfile);

// ─── EVENTS ──────────────────────────────────────────────
router.get("/events", eventCtrl.getEvents);
router.get("/events/:id", eventCtrl.getEvent);
router.get("/events/:id/seats", authenticate, eventCtrl.getSeats);
router.post("/events/:id/hold-seats", authenticate, eventCtrl.holdSeats);

// ─── ORDERS ──────────────────────────────────────────────
router.post("/orders/create", authenticate, orderCtrl.createOrder);
router.post("/orders/verify-payment", authenticate, orderCtrl.verifyPayment);
router.post("/orders/validate-promo", authenticate, orderCtrl.validatePromo);
router.get("/orders/my-bookings", authenticate, orderCtrl.getMyBookings);
router.get("/orders/:ref", authenticate, orderCtrl.getOrder);

// ─── ADMIN ───────────────────────────────────────────────
router.get("/admin/stats", authenticate, requireAdmin, adminCtrl.getDashboardStats);
router.get("/admin/events", authenticate, requireAdmin, adminCtrl.adminGetEvents);
router.post("/admin/events", authenticate, requireAdmin, adminCtrl.adminCreateEvent);
router.put("/admin/events/:id", authenticate, requireAdmin, adminCtrl.adminUpdateEvent);
router.delete("/admin/events/:id", authenticate, requireAdmin, adminCtrl.adminDeleteEvent);
router.get("/admin/users", authenticate, requireAdmin, adminCtrl.adminGetUsers);
router.get("/admin/orders", authenticate, requireAdmin, adminCtrl.adminGetOrders);
router.get("/admin/venues", authenticate, requireAdmin, adminCtrl.getVenues);
router.post("/admin/venues", authenticate, requireAdmin, adminCtrl.createVenue);

module.exports = router;
