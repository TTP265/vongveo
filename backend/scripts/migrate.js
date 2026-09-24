const { readFileSync } = require('fs');
const { Pool } = require('pg');
const path = require('path');

const sql = readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    await pool.query(sql);
    console.log('Migration completed - all tables created.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
