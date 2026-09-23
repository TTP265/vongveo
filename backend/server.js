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
app.get('/', (req, res) => {
  res.send('VòngVèo API is running...');
});

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
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
