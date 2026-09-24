const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const app = express();
const PORT = process.env.PORT || 5000;
const path = require('path');

// Middleware
app.use(cors({ origin: [/\.ngrok-free\.app$/] }));
app.use(express.json());
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads'))); // Phục vụ file tĩnh
// Kiểm tra kết nối DB còn sống trước mỗi request
app.use(async (req, res, next) => {
  try {
    await pool.query('SELECT 1');
    next();
  } catch (err) {
    console.error('DB health-check failed:', err.message);
    res.status(500).json({ message: 'Database không sẵn sàng' });
  }
});

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const chatRoutes = require('./routes/chat');

// Basic route
//app.get('/', (req, res) => {
//  res.send('VòngVèo API is running...');
//});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/chat', chatRoutes);

// Serve static files (frontend build)
app.use(express.static(path.resolve(__dirname, '../frontend/dist')));

// Fallback middleware for client-side routing (serve index.html for non-API paths)
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.resolve(__dirname, '../frontend/dist', 'index.html'));
});

app.use((err, req, res, next) => {
  if (err instanceof require('multer').MulterError) {
    return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'Ảnh tối đa 5 MB' : err.message });
  }
  if (err) return res.status(400).json({ message: err.message });
  next();
});

// ─────────────────────────────────────────────────────────────
// Đảm bảo tài khoản admin tồn tại khi server khởi động
// ─────────────────────────────────────────────────────────────
async function ensureDefaultAdmin() {
  const client = await pool.connect();
  try {
    const ADMIN_EMAIL = 'admin@vongveo.com';
    const hashed = await bcrypt.hash('123456', 10);

    const check = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [ADMIN_EMAIL]
    );

    if (check.rowCount === 0) {
      const ins = await client.query(
        `INSERT INTO users (name, email, password, role, is_active)
         VALUES ($1, $2, $3, 'admin', true) RETURNING id`,
        ['Admin', ADMIN_EMAIL, hashed]
      );
      console.log('✅ Admin created  (id=' + ins.rows[0].id + ')');
    } else {
      await client.query(
        `UPDATE users SET password = $1, is_active = true, role = 'admin' WHERE id = $2`,
        [hashed, check.rows[0].id]
      );
      console.log('✅ Admin refreshed (id=' + check.rows[0].id + ')');
    }
  } catch (err) {
    console.error('❌ ensureDefaultAdmin error:', err.message);
  } finally {
    client.release();
  }
}

ensureDefaultAdmin().finally(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
});
