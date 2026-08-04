const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const seed = async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "stagepass",
  });

  try {
    console.log("🌱 Seeding database...");

    // Admin user
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || "Admin@123456", 12);
    await conn.query(`
      INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)
      ON DUPLICATE KEY UPDATE role='admin'
    `, ["Admin", process.env.ADMIN_EMAIL || "admin@stagepass.com", hashedPassword, "admin"]);
    console.log("✅ Admin user created");

    // Venues
    const [v1] = await conn.query(`INSERT INTO venues (name,address,city,state,capacity,latitude,longitude) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
      ["Palace Grounds","Bellary Road","Bengaluru","Karnataka",8000,13.0068,77.5937]);
    const [v2] = await conn.query(`INSERT INTO venues (name,address,city,state,capacity,latitude,longitude) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
      ["The Humming Tree","12th Main, Indiranagar","Bengaluru","Karnataka",500,12.9784,77.6408]);
    const [v3] = await conn.query(`INSERT INTO venues (name,address,city,state,capacity,latitude,longitude) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
      ["Chowdiah Memorial Hall","Gayathri Devi Park Extension","Bengaluru","Karnataka",1200,13.0068,77.5600]);
    const [v4] = await conn.query(`INSERT INTO venues (name,address,city,state,capacity,latitude,longitude) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
      ["Rang Shankara","JP Nagar","Bengaluru","Karnataka",300,12.9100,77.5900]);
    console.log("✅ Venues created");

    const vid1 = v1.insertId, vid2 = v2.insertId, vid3 = v3.insertId, vid4 = v4.insertId;
    const futureDate1 = new Date(); futureDate1.setDate(futureDate1.getDate() + 7);
    const futureDate2 = new Date(); futureDate2.setDate(futureDate2.getDate() + 14);
    const futureDate3 = new Date(); futureDate3.setDate(futureDate3.getDate() + 21);
    const futureDate4 = new Date(); futureDate4.setDate(futureDate4.getDate() + 28);

    const fmt = (d) => d.toISOString().split("T")[0];

    // Events
    const events = [
      { title:"Resonance Music Festival 2026", desc:"Bengaluru's premier indie music festival with 9 artists across 5 hours.", artist:"Prateek Kuhad, Peter Cat Recording Co., When Chai Met Toast + 6 more", genre:"Live Music", vid:vid1, date:fmt(futureDate1), start:"18:00:00", end:"23:30:00", gates:"17:30:00", gradient:"from-violet-900 via-violet-700 to-violet-500", age:16, featured:1, tags:["Alt-rock","Indie","Multi-artist"] },
      { title:"Neon Jungle", desc:"An immersive electronic music night featuring the best DJs in the scene.", artist:"Various DJs", genre:"Electronic", vid:vid2, date:fmt(futureDate1), start:"20:00:00", end:"02:00:00", gates:"19:30:00", gradient:"from-teal-900 via-teal-700 to-emerald-500", age:18, featured:1, tags:["Electronic","Dance","18+"] },
      { title:"Zakir Khan: Haq Se Single Vol. III", desc:"India's most beloved stand-up comedian returns with brand new material.", artist:"Zakir Khan", genre:"Comedy", vid:vid3, date:fmt(futureDate2), start:"19:30:00", end:"22:00:00", gates:"19:00:00", gradient:"from-orange-900 via-orange-700 to-amber-500", age:16, featured:0, tags:["Stand-up","Hindi","Comedy"] },
      { title:"Karnatak Sangeet Samaroh", desc:"An evening of classical Carnatic music by master vocalist T.M. Krishna.", artist:"T.M. Krishna & Ensemble", genre:"Classical", vid:vid4, date:fmt(futureDate2), start:"18:30:00", end:"21:30:00", gates:"18:00:00", gradient:"from-blue-900 via-blue-700 to-sky-500", age:0, featured:0, tags:["Classical","Carnatic","Culture"] },
      { title:"Prateek Kuhad Solo Night", desc:"An intimate solo set by the globally acclaimed singer-songwriter.", artist:"Prateek Kuhad", genre:"Live Music", vid:vid4, date:fmt(futureDate3), start:"19:00:00", end:"22:00:00", gates:"18:30:00", gradient:"from-rose-900 via-rose-700 to-pink-500", age:16, featured:1, tags:["Indie","Singer-songwriter"] },
      { title:"Sunburn Arena Bengaluru", desc:"The world's biggest EDM festival comes to Bengaluru for one massive night.", artist:"Martin Garrix, DJ Snake + more", genre:"Electronic", vid:vid1, date:fmt(futureDate4), start:"17:00:00", end:"23:59:00", gates:"16:00:00", gradient:"from-cyan-900 via-cyan-700 to-blue-500", age:18, featured:1, tags:["EDM","Electronic","Festival"] },
    ];

    for (const ev of events) {
      const [er] = await conn.query(
        `INSERT INTO events (title,description,artist,genre,venue_id,event_date,start_time,end_time,gates_open,banner_gradient,age_restriction,status,is_featured) VALUES (?,?,?,?,?,?,?,?,?,?,?,'published',?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
        [ev.title,ev.desc,ev.artist,ev.genre,ev.vid,ev.date,ev.start,ev.end,ev.gates,ev.gradient,ev.age,ev.featured]
      );
      const eid = er.insertId;

      // Tags
      for (const tag of ev.tags) {
        await conn.query(`INSERT IGNORE INTO event_tags (event_id,tag) VALUES (?,?)`, [eid, tag]);
      }

      // Ticket tiers
      const tiers = [
        { name:"GA Floor", price:799, total:500, color:"violet" },
        { name:"Premium Standing", price:1299, total:300, color:"teal" },
        { name:"Seated (North)", price:1799, total:200, color:"amber" },
        { name:"VIP Lounge", price:3499, total:50, color:"rose" },
      ];

      for (let t = 0; t < tiers.length; t++) {
        const tier = tiers[t];
        const [tr] = await conn.query(
          `INSERT INTO ticket_tiers (event_id,name,price,total_seats,available_seats,color,sort_order) VALUES (?,?,?,?,?,?,?)`,
          [eid, tier.name, tier.price, tier.total, tier.total, tier.color, t]
        );
        const tid = tr.insertId;

        // Generate seats
        const rowLabels = ["A","B","C","D","E"];
        const seatsPerRow = Math.ceil(tier.total / rowLabels.length);
        for (const row of rowLabels) {
          for (let s = 1; s <= seatsPerRow; s++) {
            const code = `${row}${s}`;
            // Mark some as booked for realism
            const status = Math.random() < 0.25 ? "booked" : "available";
            await conn.query(
              `INSERT IGNORE INTO seats (event_id,tier_id,row_label,seat_number,seat_code,status) VALUES (?,?,?,?,?,?)`,
              [eid, tid, row, s, code, status]
            ).catch(() => {});
          }
        }
      }
    }
    console.log("✅ Events, tiers and seats created");

    // Promo codes
    const promos = [
      { code:"FIRST50", type:"flat", value:200, uses:1000 },
      { code:"WEEKEND20", type:"percent", value:20, uses:500 },
      { code:"VIP500", type:"flat", value:500, uses:100 },
    ];
    for (const p of promos) {
      await conn.query(
        `INSERT IGNORE INTO promo_codes (code,discount_type,discount_value,max_uses) VALUES (?,?,?,?)`,
        [p.code, p.type, p.value, p.uses]
      );
    }
    console.log("✅ Promo codes created");

    console.log("\n🎉 Seeding complete!");
    console.log(`   Admin: ${process.env.ADMIN_EMAIL || "admin@stagepass.com"} / ${process.env.ADMIN_PASSWORD || "Admin@123456"}`);
  } catch (err) {
    console.error("Seed failed:", err);
  } finally {
    await conn.end();
  }
};

seed();
