// backend/scripts/setAdminPassword.js
// ------------------------------------------------------------
// Script to reset the password of the default admin (admin@vongveo.com)
// to the plain password "123456" (hashed with bcrypt).
// ------------------------------------------------------------
require('dotenv').config(); // load DATABASE_URL from .env if present
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Create a PostgreSQL pool using the Render‑provided connection string
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const adminEmail = 'admin@vongveo.com';
    const plainPassword = '123456';

    // Ensure the DB is reachable
    await pool.connect().then(client => client.release());

    // Find admin user
    const res = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (res.rowCount === 0) {
      console.log('⚠️  No admin account found. You may need to run the seed script first.');
      process.exit(1);
    }

    const adminId = res.rows[0].id;
    const hashed = await bcrypt.hash(plainPassword, 10);

    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashed, adminId]
    );
    console.log(`✅ Admin password reset to "${plainPassword}" (id=${adminId})`);
  } catch (err) {
    console.error('❌ Error resetting admin password:', err);
  } finally {
    await pool.end();
  }
})();
