const { pool } = require("../config/db");

// GET /api/events
const getEvents = async (req, res) => {
  try {
    const { genre, city, date, search, featured, page = 1, limit = 12 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = ["e.status='published'", "e.event_date >= CURDATE()"];
    const params = [];

    if (genre) { where.push("e.genre=?"); params.push(genre); }
    if (city) { where.push("v.city=?"); params.push(city); }
    if (date) { where.push("e.event_date=?"); params.push(date); }
    if (featured === "true") { where.push("e.is_featured=1"); }
    if (search) {
      where.push("(e.title LIKE ? OR e.artist LIKE ? OR v.city LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereStr = where.length ? "WHERE " + where.join(" AND ") : "";

    const [events] = await pool.query(`
      SELECT e.*, v.name AS venue_name, v.city, v.address,
        MIN(tt.price) AS min_price,
        SUM(tt.total_seats) AS total_seats,
        SUM(tt.available_seats) AS available_seats,
        ROUND((1 - SUM(tt.available_seats)/NULLIF(SUM(tt.total_seats),0))*100) AS sold_pct
      FROM events e
      JOIN venues v ON e.venue_id = v.id
      LEFT JOIN ticket_tiers tt ON tt.event_id = e.id
      ${whereStr}
      GROUP BY e.id
      ORDER BY e.is_featured DESC, e.event_date ASC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const [countRow] = await pool.query(
      `SELECT COUNT(DISTINCT e.id) AS total FROM events e JOIN venues v ON e.venue_id=v.id ${whereStr}`,
      params
    );

    // Attach tags
    for (const ev of events) {
      const [tags] = await pool.query("SELECT tag FROM event_tags WHERE event_id=?", [ev.id]);
      ev.tags = tags.map(t => t.tag);
    }

    res.json({ success: true, data: events, total: countRow[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch events" });
  }
};

// GET /api/events/:id
const getEvent = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT e.*, v.name AS venue_name, v.city, v.address, v.state, v.pincode,
        v.latitude, v.longitude, v.capacity
      FROM events e JOIN venues v ON e.venue_id=v.id
      WHERE e.id=? AND e.status='published'
    `, [req.params.id]);

    if (!rows.length) return res.status(404).json({ success: false, message: "Event not found" });

    const event = rows[0];

    const [tiers] = await pool.query(
      "SELECT * FROM ticket_tiers WHERE event_id=? ORDER BY sort_order",
      [event.id]
    );
    const [tags] = await pool.query("SELECT tag FROM event_tags WHERE event_id=?", [event.id]);

    event.tiers = tiers;
    event.tags = tags.map(t => t.tag);

    res.json({ success: true, data: event });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch event" });
  }
};

// GET /api/events/:id/seats
const getSeats = async (req, res) => {
  try {
    const { tier_id } = req.query;
    let q = "SELECT s.*, tt.name AS tier_name, tt.price, tt.color FROM seats s JOIN ticket_tiers tt ON s.tier_id=tt.id WHERE s.event_id=?";
    const params = [req.params.id];

    if (tier_id) { q += " AND s.tier_id=?"; params.push(tier_id); }

    // Release expired holds
    await pool.query("UPDATE seats SET status='available',held_until=NULL,held_by=NULL WHERE status='held' AND held_until < NOW()");

    const [seats] = await pool.query(q + " ORDER BY s.tier_id, s.row_label, s.seat_number", params);

    // Group by tier
    const grouped = {};
    for (const s of seats) {
      if (!grouped[s.tier_id]) grouped[s.tier_id] = { tier_id: s.tier_id, tier_name: s.tier_name, price: s.price, color: s.color, rows: {} };
      if (!grouped[s.tier_id].rows[s.row_label]) grouped[s.tier_id].rows[s.row_label] = [];
      grouped[s.tier_id].rows[s.row_label].push({
        id: s.id, code: s.seat_code, row: s.row_label, num: s.seat_number,
        status: s.status === "held" && s.held_by !== req.user?.id ? "held" : s.status
      });
    }

    res.json({ success: true, data: Object.values(grouped) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch seats" });
  }
};

// POST /api/events/:id/hold-seats
const holdSeats = async (req, res) => {
  const { seat_ids } = req.body;
  if (!seat_ids?.length || seat_ids.length > 6) {
    return res.status(400).json({ success: false, message: "Select 1–6 seats" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Release user's previous holds
    await conn.query(
      "UPDATE seats SET status='available',held_until=NULL,held_by=NULL WHERE held_by=? AND event_id=?",
      [req.user.id, req.params.id]
    );

    await conn.query("UPDATE seats SET status='available',held_until=NULL,held_by=NULL WHERE status='held' AND held_until < NOW()");

    const placeholders = seat_ids.map(() => "?").join(",");
    const [seats] = await conn.query(
      `SELECT id,status,event_id FROM seats WHERE id IN (${placeholders}) AND event_id=? FOR UPDATE`,
      [...seat_ids, req.params.id]
    );

    const unavailable = seats.filter(s => s.status !== "available");
    if (unavailable.length) {
      await conn.rollback();
      return res.status(409).json({ success: false, message: "Some seats are no longer available" });
    }

    const holdUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await conn.query(
      `UPDATE seats SET status='held',held_until=?,held_by=? WHERE id IN (${placeholders})`,
      [holdUntil, req.user.id, ...seat_ids]
    );

    await conn.commit();
    res.json({ success: true, message: "Seats held for 10 minutes", held_until: holdUntil });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to hold seats" });
  } finally {
    conn.release();
  }
};

module.exports = { getEvents, getEvent, getSeats, holdSeats };
