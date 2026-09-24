const express = require('express');
const cors = require('cors');
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;
const path = require('path');

// Middleware
app.use(cors({ origin: [/\.ngrok-free\.app$/] }));
app.use(express.json());
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads'))); // Phục vụ file tĩnh
app.use(async (req, res, next) => {
  try {
    await db.ready;
    next();
  } catch {
    res.status(500).json({ message: 'Database schema is not ready' });
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

// Start server
// ------------------------------------------------------------
// 1️⃣  Ensure a default admin account exists when the server starts
// ------------------------------------------------------------
const bcrypt = require('bcryptjs');

async function ensureDefaultAdmin() {
  try {
    // Wait for DB schema to be ready (same as the middleware does)
    await db.ready;
    const adminEmail = 'admin@vongveo.com';
    const existing = await db.get('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (!existing) {
      const hashed = await bcrypt.hash('123456', 10);
      const res = await db.run(
        `INSERT INTO users (name, email, password, role, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        ['Admin', adminEmail, hashed, 'admin', true]
      );
      console.log('✅ Default admin created (id=' + res.rows[0].id + ')');
    } else {
      console.log('✅ Default admin already exists (id=' + existing.id + ')');
    }
  } catch (err) {
    console.error('❌ Error ensuring default admin:', err);
  }
}

ensureDefaultAdmin().finally(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
});
