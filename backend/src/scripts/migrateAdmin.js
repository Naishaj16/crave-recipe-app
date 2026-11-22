require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const pool = require("../config/db");

async function migrate() {
  try {
    console.log("Applying database migrations...");
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITHOUT TIME ZONE;
      ALTER TABLE recipes ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
      
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        email VARCHAR(255),
        user_name VARCHAR(255),
        action VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'success',
        ip_address VARCHAR(100),
        user_agent TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure status is active for existing users
    await pool.query("UPDATE users SET status = 'active' WHERE status IS NULL");

    const count = await pool.query("SELECT COUNT(*) FROM activity_logs");
    if (parseInt(count.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO activity_logs (email, user_name, action, status, ip_address, created_at)
        VALUES 
          ('naishajain982@gmail.com', 'Naisha', 'login', 'success', '127.0.0.1', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
          ('demo@crave.com', 'Demo User', 'login', 'success', '127.0.0.1', CURRENT_TIMESTAMP - INTERVAL '30 minutes'),
          ('unknown@test.com', 'Unknown User', 'failed_login', 'failed', '127.0.0.1', CURRENT_TIMESTAMP - INTERVAL '15 minutes');
      `);
    }

    console.log("Admin migration completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();

