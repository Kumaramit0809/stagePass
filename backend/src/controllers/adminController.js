const { pool } = require("../config/db");

// GET /api/admin/stats
const getDashboardStats = async (req, res) => {
  try {
    const [[revenue]] = await pool.query("SELECT COALESCE(SUM(total),0) AS total FROM orders WHERE status='confirmed'");
    const [[bookings]] = await pool.query("SELECT COUNT(*) AS total FROM orders WHERE status='confirmed'");
    const [[users]] = await pool.query("SELECT COUNT(*) AS total FROM users WHERE role='user'");
    const [[events]] = await pool.query("SELECT COUNT(*) AS total FROM events WHERE status='published'");

    const [recentOrders] = await pool.query(`
      SELECT o.order_ref,o.total,o.created_at,u.name AS user_name,e.title AS event_title
      FROM orders o JOIN users u ON o.user_id=u.id JOIN events e ON o.event_id=e.id
      WHERE o.status='confirmed' ORDER BY o.created_at DESC LIMIT 8
    `);

    const [topEvents] = await pool.query(`
      SELECT e.title,COUNT(oi.id) AS tickets,SUM(oi.price) AS revenue
      FROM events e LEFT JOIN orders o ON e.id=o.event_id AND o.status='confirmed'
      LEFT JOIN order_items oi ON o.id=oi.order_id
      GROUP BY e.id ORDER BY tickets DESC LIMIT 5
    `);

    const [monthlyRevenue] = await pool.query(`
      SELECT DATE_FORMAT(created_at,'%b %Y') AS month, SUM(total) AS revenue, COUNT(*) AS orders
      FROM orders WHERE status='confirmed' AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at,'%Y-%m') ORDER BY MIN(created_at)
    `);

    res.json({
      success: true,
      stats: {
        revenue: revenue.total,
        bookings: bookings.total,
        users: users.total,
        events: events.total,
      },
      recentOrders,
      topEvents,
      monthlyRevenue,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
};

// GET /api/admin/events
const adminGetEvents = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = [];
    const params = [];
    if (status) { where.push("e.status=?"); params.push(status); }
    if (search) { where.push("(e.title LIKE ? OR e.artist LIKE ?)"); params.push(`%${search}%`, `%${search}%`); }
    const whereStr = where.length ? "WHERE " + where.join(" AND ") : "";

    const [events] = await pool.query(`
      SELECT e.*,v.name AS venue_name,v.city,
        COALESCE(SUM(tt.total_seats),0) AS total_seats,
        COALESCE(SUM(tt.available_seats),0) AS available_seats,
        COALESCE(MIN(tt.price),0) AS min_price,
        (SELECT COUNT(*) FROM orders o WHERE o.event_id=e.id AND o.status='confirmed') AS booking_count,
        (SELECT COALESCE(SUM(total),0) FROM orders o WHERE o.event_id=e.id AND o.status='confirmed') AS revenue
      FROM events e JOIN venues v ON e.venue_id=v.id
      LEFT JOIN ticket_tiers tt ON tt.event_id=e.id
      ${whereStr} GROUP BY e.id ORDER BY e.created_at DESC LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const [[count]] = await pool.query(
      `SELECT COUNT(DISTINCT e.id) AS total FROM events e JOIN venues v ON e.venue_id=v.id ${whereStr}`,
      params
    );
    res.json({ success: true, data: events, total: count.total });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch events" });
  }
};

// POST /api/admin/events
const adminCreateEvent = async (req, res) => {
  const { title, description, artist, genre, venue_id, event_date, start_time, end_time,
    gates_open, banner_gradient, age_restriction, is_featured, status, tiers, tags } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [er] = await conn.query(
      `INSERT INTO events (title,description,artist,genre,venue_id,event_date,start_time,end_time,
        gates_open,banner_gradient,age_restriction,is_featured,status,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [title, description, artist, genre, venue_id, event_date, start_time, end_time || null,
        gates_open || null, banner_gradient || "from-violet-900 to-violet-600",
        age_restriction || 0, is_featured ? 1 : 0, status || "draft", req.user.id]
    );
    const eid = er.insertId;

    if (tags?.length) {
      for (const tag of tags) {
        await conn.query("INSERT INTO event_tags (event_id,tag) VALUES (?,?)", [eid, tag]);
      }
    }

    if (tiers?.length) {
      for (let i = 0; i < tiers.length; i++) {
        const t = tiers[i];
        const [tr] = await conn.query(
          "INSERT INTO ticket_tiers (event_id,name,description,price,total_seats,available_seats,color,sort_order) VALUES (?,?,?,?,?,?,?,?)",
          [eid, t.name, t.description || null, t.price, t.total_seats, t.total_seats, t.color || "violet", i]
        );
        const tid = tr.insertId;
        const rowLabels = ["A","B","C","D","E","F","G","H"];
        const seatsPerRow = Math.ceil(t.total_seats / rowLabels.length);
        for (const row of rowLabels) {
          for (let s = 1; s <= seatsPerRow; s++) {
            if ((row.charCodeAt(0) - 65) * seatsPerRow + s > t.total_seats) break;
            await conn.query(
              "INSERT INTO seats (event_id,tier_id,row_label,seat_number,seat_code) VALUES (?,?,?,?,?)",
              [eid, tid, row, s, `${row}${s}`]
            );
          }
        }
      }
    }

    await conn.commit();
    res.status(201).json({ success: true, event_id: eid });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to create event" });
  } finally {
    conn.release();
  }
};

// PUT /api/admin/events/:id
const adminUpdateEvent = async (req, res) => {
  const { title, description, artist, genre, venue_id, event_date, start_time, end_time,
    gates_open, banner_gradient, age_restriction, is_featured, status, tags } = req.body;
  try {
    await pool.query(
      `UPDATE events SET title=?,description=?,artist=?,genre=?,venue_id=?,event_date=?,start_time=?,
        end_time=?,gates_open=?,banner_gradient=?,age_restriction=?,is_featured=?,status=? WHERE id=?`,
      [title, description, artist, genre, venue_id, event_date, start_time, end_time || null,
        gates_open || null, banner_gradient, age_restriction || 0, is_featured ? 1 : 0, status, req.params.id]
    );
    if (tags) {
      await pool.query("DELETE FROM event_tags WHERE event_id=?", [req.params.id]);
      for (const tag of tags) {
        await pool.query("INSERT INTO event_tags (event_id,tag) VALUES (?,?)", [req.params.id, tag]);
      }
    }
    res.json({ success: true, message: "Event updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Update failed" });
  }
};

// DELETE /api/admin/events/:id
const adminDeleteEvent = async (req, res) => {
  try {
    await pool.query("UPDATE events SET status='cancelled' WHERE id=?", [req.params.id]);
    res.json({ success: true, message: "Event cancelled" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Delete failed" });
  }
};

// GET /api/admin/users
const adminGetUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = ["role='user'"];
    const params = [];
    if (search) { where.push("(name LIKE ? OR email LIKE ?)"); params.push(`%${search}%`, `%${search}%`); }
    const whereStr = "WHERE " + where.join(" AND ");
    const [users] = await pool.query(
      `SELECT u.id,u.name,u.email,u.phone,u.avatar,u.is_active,u.created_at,
        (SELECT COUNT(*) FROM orders o WHERE o.user_id=u.id AND o.status='confirmed') AS booking_count,
        (SELECT COALESCE(SUM(total),0) FROM orders o WHERE o.user_id=u.id AND o.status='confirmed') AS total_spent
       FROM users u ${whereStr} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    const [[count]] = await pool.query(`SELECT COUNT(*) AS total FROM users ${whereStr}`, params);
    res.json({ success: true, data: users, total: count.total });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

// GET /api/admin/orders
const adminGetOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = [];
    const params = [];
    if (status) { where.push("o.status=?"); params.push(status); }
    const whereStr = where.length ? "WHERE " + where.join(" AND ") : "";
    const [orders] = await pool.query(
      `SELECT o.*,u.name AS user_name,u.email AS user_email,e.title AS event_title
       FROM orders o JOIN users u ON o.user_id=u.id JOIN events e ON o.event_id=e.id
       ${whereStr} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    const [[count]] = await pool.query(
      `SELECT COUNT(*) AS total FROM orders o ${whereStr}`, params
    );
    res.json({ success: true, data: orders, total: count.total });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
};

// GET /api/admin/venues
const getVenues = async (req, res) => {
  try {
    const [venues] = await pool.query("SELECT * FROM venues ORDER BY name");
    res.json({ success: true, data: venues });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch venues" });
  }
};

// POST /api/admin/venues
const createVenue = async (req, res) => {
  const { name, address, city, state, pincode, capacity, latitude, longitude } = req.body;
  try {
    const [r] = await pool.query(
      "INSERT INTO venues (name,address,city,state,pincode,capacity,latitude,longitude) VALUES (?,?,?,?,?,?,?,?)",
      [name, address, city, state, pincode, capacity, latitude, longitude]
    );
    res.status(201).json({ success: true, venue_id: r.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to create venue" });
  }
};

module.exports = {
  getDashboardStats, adminGetEvents, adminCreateEvent, adminUpdateEvent, adminDeleteEvent,
  adminGetUsers, adminGetOrders, getVenues, createVenue
};
