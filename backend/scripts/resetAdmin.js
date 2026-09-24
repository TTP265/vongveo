/**
 * backend/scripts/resetAdmin.js
 * ─────────────────────────────
 * Tạo hoặc reset tài khoản admin (admin@vongveo.com / 123456).
 * Chạy trên Render bằng lệnh:  node scripts/resetAdmin.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('❌ Thiếu biến môi trường DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const ADMIN_EMAIL    = 'admin@vongveo.com';
const ADMIN_NAME     = 'Admin';
const ADMIN_PASSWORD = '123456';
const ADMIN_ROLE     = 'admin';

(async () => {
  const client = await pool.connect();
  try {
    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // Kiểm tra admin đã tồn tại chưa
    const check = await client.query(
      'SELECT id, is_active FROM users WHERE email = $1',
      [ADMIN_EMAIL]
    );

    if (check.rowCount === 0) {
      // Chưa có → tạo mới
      const ins = await client.query(
        `INSERT INTO users (name, email, password, role, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id`,
        [ADMIN_NAME, ADMIN_EMAIL, hashed, ADMIN_ROLE]
      );
      console.log(`✅ Admin mới được tạo  (id = ${ins.rows[0].id})`);
    } else {
      // Đã có → cập nhật mật khẩu + bật is_active + đảm bảo role = admin
      const adminId = check.rows[0].id;
      await client.query(
        `UPDATE users
         SET password  = $1,
             is_active = true,
             role      = '${ADMIN_ROLE}'
         WHERE id = $2`,
        [hashed, adminId]
      );
      console.log(`✅ Admin đã cập nhật   (id = ${adminId}) – password & is_active reset`);
    }

    console.log('─────────────────────────────────────────');
    console.log(`Email   : ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log('─────────────────────────────────────────');
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
