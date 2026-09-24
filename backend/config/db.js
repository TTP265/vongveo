// backend/config/db.js – PostgreSQL connection wrapper
const { Pool } = require('pg');

// DATABASE_URL is supplied by Render (or local .env)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Simple wrappers mimicking the old SQLite API so controllers do not need major changes
const query = (text, params = []) => pool.query(text, params);

const all = async (text, params = []) => {
  const { rows } = await query(text, params);
  return rows;
};

const get = async (text, params = []) => {
  const { rows } = await query(text, params);
  return rows[0] || null;
};

const run = async (text, params = []) => {
  // For INSERT/UPDATE/DELETE we just return the raw pg result
  return await query(text, params);
};

module.exports = {
  query,
  all,
  get,
  run,
  pool,
};
