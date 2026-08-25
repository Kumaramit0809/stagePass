const Razorpay = require("razorpay");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const { pool } = require("../config/db");

// Razorpay is optional until credentials are configured
const razorpay =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      })
    : null;

// POST /api/orders/create
const createOrder = async (req, res) => {
  // Payment service is not configured
  if (!razorpay) {
    return res.status(503).json({
      success: false,
      message: "Payment service is not configured yet",
    });
  }

  const { event_id, seat_ids, promo_code, contact } = req.body;

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Verify seats are held by this user
    const placeholders = seat_ids.map(() => "?").join(",");

    const [seats] = await conn.query(
      `SELECT s.*,tt.price,tt.name AS tier_name,tt.id AS tier_id
       FROM seats s
       JOIN ticket_tiers tt ON s.tier_id=tt.id
       WHERE s.id IN (${placeholders})
       AND s.held_by=?
       AND s.status='held'
       AND s.held_until > NOW()
       FOR UPDATE`,
      [...seat_ids, req.user.id]
    );

    if (seats.length !== seat_ids.length) {
      await conn.rollback();

      return res.status(409).json({
        success: false,
        message: "Seat hold expired. Please re-select your seats.",
      });
    }

    let subtotal = seats.reduce(
      (s, x) => s + parseFloat(x.price),
      0
    );

    let discount = 0;

    // Validate promo
    if (promo_code) {
      const [promos] = await conn.query(
        `SELECT *
         FROM promo_codes
         WHERE code=?
         AND is_active=1
         AND used_count < max_uses
         AND (valid_until IS NULL OR valid_until > NOW())`,
        [promo_code]
      );

      if (
        promos.length &&
        subtotal >= promos[0].min_order_value
      ) {
        const p = promos[0];

        discount =
          p.discount_type === "flat"
            ? p.discount_value
            : Math.round(
                (subtotal * p.discount_value) / 100
              );

        discount = Math.min(discount, subtotal);
      }
    }

    const convenienceFee = Math.round(subtotal * 0.04);
    const total = Math.round(
      subtotal + convenienceFee - discount
    );

    // Create Razorpay order
    const rzpOrder = await razorpay.orders.create({
      amount: total * 100,
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: {
        user_id: req.user.id,
        event_id,
      },
    });

    const orderRef = `SP-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}`;

    const [orderResult] = await conn.query(
      `INSERT INTO orders
       (
         order_ref,
         user_id,
         event_id,
         subtotal,
         convenience_fee,
         discount,
         total,
         promo_code,
         contact_name,
         contact_email,
         contact_phone,
         status,
         razorpay_order_id
       )
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        orderRef,
        req.user.id,
        event_id,
        subtotal,
        convenienceFee,
        discount,
        total,
        promo_code || null,
        contact.name,
        contact.email,
        contact.phone,
        "pending",
        rzpOrder.id,
      ]
    );

    const orderId = orderResult.insertId;

    // Create order items & book seats
    for (const seat of seats) {
      const ticketCode = `TKT-${uuidv4()
        .substring(0, 8)
        .toUpperCase()}`;

      await conn.query(
        `INSERT INTO order_items
         (order_id,seat_id,tier_id,ticket_code,price)
         VALUES (?,?,?,?,?)`,
        [
          orderId,
          seat.id,
          seat.tier_id,
          ticketCode,
          seat.price,
        ]
      );
    }

    await conn.commit();

    res.json({
      success: true,
      order_id: orderId,
      order_ref: orderRef,
      razorpay_order_id: rzpOrder.id,
      razorpay_key: process.env.RAZORPAY_KEY_ID,
      amount: total,
      currency: "INR",
      prefill: {
        name: contact.name,
        email: contact.email,
        contact: contact.phone,
      },
    });
  } catch (err) {
    await conn.rollback();

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to create order",
    });
  } finally {
    conn.release();
  }
};

// POST /api/orders/verify-payment
const verifyPayment = async (req, res) => {
  // Payment service is not configured
  if (!process.env.RAZORPAY_KEY_SECRET) {
    return res.status(503).json({
      success: false,
      message: "Payment service is not configured yet",
    });
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    order_id,
    promo_code,
  } = req.body;

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const expectedSig = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET
      )
      .update(
        `${razorpay_order_id}|${razorpay_payment_id}`
      )
      .digest("hex");

    if (expectedSig !== razorpay_signature) {
      await conn.rollback();

      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    // Update order
    await conn.query(
      `UPDATE orders
       SET status='confirmed',
           razorpay_payment_id=?,
           razorpay_signature=?
       WHERE id=?
       AND user_id=?`,
      [
        razorpay_payment_id,
        razorpay_signature,
        order_id,
        req.user.id,
      ]
    );

    // Get seat ids from order
    const [items] = await conn.query(
      `SELECT seat_id,tier_id
       FROM order_items
       WHERE order_id=?`,
      [order_id]
    );

    // Book seats permanently
    for (const item of items) {
      await conn.query(
        `UPDATE seats
         SET status='booked',
             held_until=NULL,
             held_by=NULL
         WHERE id=?`,
        [item.seat_id]
      );
    }

    // Update tier available seats
    const [tierCounts] = await conn.query(
      `SELECT tier_id,COUNT(*) AS cnt
       FROM order_items
       WHERE order_id=?
       GROUP BY tier_id`,
      [order_id]
    );

    for (const tc of tierCounts) {
      await conn.query(
        `UPDATE ticket_tiers
         SET available_seats=available_seats-?
         WHERE id=?`,
        [tc.cnt, tc.tier_id]
      );
    }

    // Increment promo usage
    if (promo_code) {
      await conn.query(
        `UPDATE promo_codes
         SET used_count=used_count+1
         WHERE code=?`,
        [promo_code]
      );
    }

    await conn.commit();

    // Fetch order details
    const [order] = await conn.query(
      `SELECT
         o.*,
         e.title AS event_title,
         e.event_date,
         e.start_time,
         v.name AS venue_name,
         v.city
       FROM orders o
       JOIN events e ON o.event_id=e.id
       JOIN venues v ON e.venue_id=v.id
       WHERE o.id=?`,
      [order_id]
    );

    const [orderItems] = await conn.query(
      `SELECT
         oi.*,
         s.seat_code,
         s.row_label,
         tt.name AS tier_name
       FROM order_items oi
       JOIN seats s ON oi.seat_id=s.id
       JOIN ticket_tiers tt ON oi.tier_id=tt.id
       WHERE oi.order_id=?`,
      [order_id]
    );

    res.json({
      success: true,
      order: {
        ...order[0],
        items: orderItems,
      },
    });
  } catch (err) {
    await conn.rollback();

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Payment verification error",
    });
  } finally {
    conn.release();
  }
};

// GET /api/orders/my-bookings
const getMyBookings = async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT
         o.*,
         e.title,
         e.event_date,
         e.start_time,
         e.banner_gradient,
         v.name AS venue_name,
         v.city
       FROM orders o
       JOIN events e ON o.event_id=e.id
       JOIN venues v ON e.venue_id=v.id
       WHERE o.user_id=?
       AND o.status='confirmed'
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );

    for (const o of orders) {
      const [items] = await pool.query(
        `SELECT
           oi.*,
           s.seat_code,
           tt.name AS tier_name
         FROM order_items oi
         JOIN seats s ON oi.seat_id=s.id
         JOIN ticket_tiers tt ON oi.tier_id=tt.id
         WHERE oi.order_id=?`,
        [o.id]
      );

      o.items = items;
    }

    res.json({
      success: true,
      data: orders,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
    });
  }
};

// GET /api/orders/:ref
const getOrder = async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT
         o.*,
         e.title,
         e.event_date,
         e.start_time,
         e.banner_gradient,
         v.name AS venue_name,
         v.city,
         v.address
       FROM orders o
       JOIN events e ON o.event_id=e.id
       JOIN venues v ON e.venue_id=v.id
       WHERE o.order_ref=?
       AND o.user_id=?`,
      [req.params.ref, req.user.id]
    );

    if (!orders.length) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const [items] = await pool.query(
      `SELECT
         oi.*,
         s.seat_code,
         s.row_label,
         tt.name AS tier_name
       FROM order_items oi
       JOIN seats s ON oi.seat_id=s.id
       JOIN ticket_tiers tt ON oi.tier_id=tt.id
       WHERE oi.order_id=?`,
      [orders[0].id]
    );

    res.json({
      success: true,
      data: {
        ...orders[0],
        items,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
    });
  }
};

// POST /api/orders/validate-promo
const validatePromo = async (req, res) => {
  const { code, amount } = req.body;

  try {
    const [promos] = await pool.query(
      `SELECT *
       FROM promo_codes
       WHERE code=?
       AND is_active=1
       AND used_count < max_uses
       AND (valid_until IS NULL OR valid_until > NOW())`,
      [code]
    );

    if (!promos.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired promo code",
      });
    }

    const p = promos[0];

    if (amount < p.min_order_value) {
      return res.status(400).json({
        success: false,
        message: `Minimum order ₹${p.min_order_value} required`,
      });
    }

    const discount =
      p.discount_type === "flat"
        ? p.discount_value
        : Math.round(
            (amount * p.discount_value) / 100
          );

    res.json({
      success: true,
      discount,
      type: p.discount_type,
      value: p.discount_value,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to validate promo",
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getMyBookings,
  getOrder,
  validatePromo,
};
