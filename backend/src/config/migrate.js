const mysql = require("mysql2/promise");
require("dotenv").config();

const migrate = async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
  });

  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || "stagepass"}\``);
    await conn.query(`USE \`${process.env.DB_NAME || "stagepass"}\``);
    console.log("📦 Database selected");

    // Users
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255),
        google_id VARCHAR(255),
        avatar VARCHAR(500),
        role ENUM('user','admin') DEFAULT 'user',
        phone VARCHAR(20),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_google_id (google_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ Table: users");

    // Venues
    await conn.query(`
      CREATE TABLE IF NOT EXISTS venues (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        address TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100),
        pincode VARCHAR(10),
        capacity INT NOT NULL DEFAULT 0,
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ Table: venues");

    // Events
    await conn.query(`
      CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(300) NOT NULL,
        description TEXT,
        artist VARCHAR(300),
        genre VARCHAR(100),
        venue_id INT NOT NULL,
        event_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME,
        gates_open TIME,
        image_url VARCHAR(500),
        banner_gradient VARCHAR(200) DEFAULT 'from-violet-900 to-violet-600',
        age_restriction INT DEFAULT 0,
        status ENUM('draft','published','cancelled','completed') DEFAULT 'draft',
        is_featured BOOLEAN DEFAULT FALSE,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE RESTRICT,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_event_date (event_date),
        INDEX idx_status (status),
        INDEX idx_genre (genre)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ Table: events");

    // Ticket tiers
    await conn.query(`
      CREATE TABLE IF NOT EXISTS ticket_tiers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        total_seats INT NOT NULL,
        available_seats INT NOT NULL,
        color VARCHAR(50) DEFAULT 'violet',
        sort_order INT DEFAULT 0,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        INDEX idx_event_id (event_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ Table: ticket_tiers");

    // Seats
    await conn.query(`
      CREATE TABLE IF NOT EXISTS seats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id INT NOT NULL,
        tier_id INT NOT NULL,
        row_label VARCHAR(5) NOT NULL,
        seat_number INT NOT NULL,
        seat_code VARCHAR(20) NOT NULL,
        status ENUM('available','held','booked') DEFAULT 'available',
        held_until TIMESTAMP NULL,
        held_by INT NULL,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        FOREIGN KEY (tier_id) REFERENCES ticket_tiers(id) ON DELETE CASCADE,
        UNIQUE KEY uk_seat (event_id, row_label, seat_number),
        INDEX idx_event_status (event_id, status),
        INDEX idx_tier (tier_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ Table: seats");

    // Orders
    await conn.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_ref VARCHAR(50) NOT NULL UNIQUE,
        user_id INT NOT NULL,
        event_id INT NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        convenience_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
        discount DECIMAL(10,2) NOT NULL DEFAULT 0,
        total DECIMAL(10,2) NOT NULL,
        promo_code VARCHAR(50),
        contact_name VARCHAR(100),
        contact_email VARCHAR(150),
        contact_phone VARCHAR(20),
        status ENUM('pending','confirmed','cancelled','refunded') DEFAULT 'pending',
        razorpay_order_id VARCHAR(200),
        razorpay_payment_id VARCHAR(200),
        razorpay_signature VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (event_id) REFERENCES events(id),
        INDEX idx_user (user_id),
        INDEX idx_status (status),
        INDEX idx_order_ref (order_ref)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ Table: orders");

    // Order items (individual tickets)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        seat_id INT NOT NULL,
        tier_id INT NOT NULL,
        ticket_code VARCHAR(100) NOT NULL UNIQUE,
        price DECIMAL(10,2) NOT NULL,
        attendee_name VARCHAR(100),
        is_used BOOLEAN DEFAULT FALSE,
        used_at TIMESTAMP NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (seat_id) REFERENCES seats(id),
        FOREIGN KEY (tier_id) REFERENCES ticket_tiers(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ Table: order_items");

    // Promo codes
    await conn.query(`
      CREATE TABLE IF NOT EXISTS promo_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        discount_type ENUM('flat','percent') DEFAULT 'flat',
        discount_value DECIMAL(10,2) NOT NULL,
        max_uses INT DEFAULT 100,
        used_count INT DEFAULT 0,
        min_order_value DECIMAL(10,2) DEFAULT 0,
        valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        valid_until TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ Table: promo_codes");

    // Event tags
    await conn.query(`
      CREATE TABLE IF NOT EXISTS event_tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id INT NOT NULL,
        tag VARCHAR(50) NOT NULL,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        INDEX idx_event (event_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ Table: event_tags");

    console.log("\n🎉 All migrations completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await conn.end();
  }
};

migrate();
