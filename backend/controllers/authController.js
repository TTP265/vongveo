// backend/controllers/authController.js – PostgreSQL version
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'vongveo_secret_key_2026';

// Register a new user
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All input is required' });
    }
    // Check if user exists
    const existingUser = await db.get('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser) {
      return res.status(409).json({ message: 'User Already Exist. Please Login' });
    }
    const salt = await bcrypt.genSalt(10);
    const encryptedPassword = await bcrypt.hash(password, salt);
    const insertResult = await db.run(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, email, encryptedPassword, 'user']
    );
    const userId = insertResult.rows[0].id;
    const role = 'user';
    const token = jwt.sign({ user_id: userId, email, name, role }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(201).json({
      message: 'Registration successful',
      user: { id: userId, user_id: userId, name, email, role, phone: '', address: '', profile_image: '' },
      token,
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Login existing user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'All input is required' });
    }
    const user = await db.get('SELECT * FROM users WHERE email = $1', [email]);
    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Invalid Credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid Credentials' });
    }
    const token = jwt.sign(
      { user_id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        user_id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        address: user.address || '',
        profile_image: user.profile_image || '',
      },
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get current user profile
const getMe = async (req, res) => {
  try {
    const user = await db.get(
      'SELECT id, name, email, role, phone, address, profile_image FROM users WHERE id = $1',
      [req.user.user_id]
    );
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    return res.json({ ...user, user_id: user.id });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Update current user profile
const updateMe = async (req, res) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : '';
    const address = typeof req.body.address === 'string' ? req.body.address.trim() : '';
    const phoneDigits = phone.replace(/\\D/g, '');
    if (name.length < 2 || name.length > 100)
      return res.status(400).json({ message: 'Tên phải từ 2 đến 100 ký tự' });
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) return res.status(400).json({ message: 'Email không hợp lệ' });
    if (phone && (phoneDigits.length < 9 || phoneDigits.length > 15)) return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
    if (address.length > 300) return res.status(400).json({ message: 'Địa chỉ tối đa 300 ký tự' });

    const existing = await db.get('SELECT id FROM users WHERE email = $1 AND id <> $2', [email, req.user.user_id]);
    if (existing) return res.status(409).json({ message: 'Email này đã được tài khoản khác sử dụng' });

    const profileImage = req.file ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}` : null;
    await db.run(
      `UPDATE users SET name = $1, email = $2, phone = $3, address = $4, profile_image = COALESCE($5, profile_image) WHERE id = $6`,
      [name, email, phone, address, profileImage, req.user.user_id]
    );
    const updatedUser = await db.get(
      'SELECT id, name, email, role, phone, address, profile_image FROM users WHERE id = $1',
      [req.user.user_id]
    );
    const token = jwt.sign(
      { user_id: updatedUser.id, email: updatedUser.email, name: updatedUser.name, role: updatedUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    return res.json({ message: 'Đã cập nhật hồ sơ', user: { ...updatedUser, user_id: updatedUser.id }, token });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ message: err.message });
  }
};

// List all active users (admin view)
const listUsers = async (req, res) => {
  try {
    const users = await db.all(
      'SELECT id, name, email, role, phone, address, profile_image, created_at FROM users WHERE is_active = true ORDER BY id ASC'
    );
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Admin: create a new user
const createUser = async (req, res) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const role = req.body.role || 'user';
    const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : '';
    const address = typeof req.body.address === 'string' ? req.body.address.trim() : '';
    const phoneDigits = phone.replace(/\\D/g, '');
    if (name.length < 2 || name.length > 100) return res.status(400).json({ message: 'Tên phải từ 2 đến 100 ký tự' });
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) return res.status(400).json({ message: 'Email không hợp lệ' });
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ message: 'Vai trò không hợp lệ' });
    if (phone && (phoneDigits.length < 9 || phoneDigits.length > 15)) return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
    if (address.length > 300) return res.status(400).json({ message: 'Địa chỉ tối đa 300 ký tự' });
    if (password.length < 8 || password.length > 100) return res.status(400).json({ message: 'Mật khẩu phải có từ 8 đến 100 ký tự' });

    const encryptedPassword = await bcrypt.hash(password, 10);
    const result = await db.run(
      `INSERT INTO users (name, email, password, role, phone, address, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, email, role, phone, address, profile_image, created_at`,
      [name, email, encryptedPassword, role, phone, address, true]
    );
    const user = result.rows[0];
    return res.status(201).json({ message: 'Đã tạo tài khoản', user });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Email này đã được sử dụng' });
    }
    return res.status(500).json({ message: err.message });
  }
};

// Admin: update a user
const updateUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId < 1)
      return res.status(400).json({ message: 'ID tài khoản không hợp lệ' });
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const role = req.body.role;
    const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : '';
    const address = typeof req.body.address === 'string' ? req.body.address.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const phoneDigits = phone.replace(/\\D/g, '');
    if (name.length < 2 || name.length > 100) return res.status(400).json({ message: 'Tên phải từ 2 đến 100 ký tự' });
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) return res.status(400).json({ message: 'Email không hợp lệ' });
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ message: 'Vai trò không hợp lệ' });
    if (phone && (phoneDigits.length < 9 || phoneDigits.length > 15)) return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
    if (address.length > 300) return res.status(400).json({ message: 'Địa chỉ tối đa 300 ký tự' });
    if (password && (password.length < 8 || password.length > 100)) return res.status(400).json({ message: 'Mật khẩu mới phải có từ 8 đến 100 ký tự' });

    const target = await db.get('SELECT id, role FROM users WHERE id = $1 AND is_active = true', [userId]);
    if (!target) return res.status(404).json({ message: 'Không tìm thấy tài khoản đang hoạt động' });
    if (target.role === 'admin' && role !== 'admin') {
      const adminCount = await db.get("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = true");
      if (adminCount.count <= 1) {
        return res.status(409).json({ message: 'Không thể hạ quyền admin cuối cùng' });
      }
    }
    const duplicate = await db.get('SELECT id FROM users WHERE email = $1 AND id <> $2', [email, userId]);
    if (duplicate) return res.status(409).json({ message: 'Email này đã được sử dụng' });
    let encryptedPassword = null;
    if (password) encryptedPassword = await bcrypt.hash(password, 10);
    await db.run(
      `UPDATE users SET name = $1, email = $2, role = $3, phone = $4, address = $5, password = COALESCE($6, password) WHERE id = $7 AND is_active = true`,
      [name, email, role, phone, address, encryptedPassword, userId]
    );
    const updated = await db.get(
      'SELECT id, name, email, role, phone, address, profile_image, created_at FROM users WHERE id = $1',
      [userId]
    );
    return res.json({ message: 'Đã cập nhật tài khoản', user: updated });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Admin: delete (deactivate) a user
const deleteUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId < 1)
      return res.status(400).json({ message: 'ID tài khoản không hợp lệ' });
    if (userId === Number(req.user.user_id))
      return res.status(400).json({ message: 'Bạn không thể xóa chính tài khoản admin đang đăng nhập' });
    const target = await db.get('SELECT id, role FROM users WHERE id = $1 AND is_active = true', [userId]);
    if (!target) return res.status(404).json({ message: 'Không tìm thấy tài khoản đang hoạt động' });
    const deactivate = async () => {
      const deletedEmail = `deleted-${userId}-${Date.now()}@invalid.local`;
      await db.run('BEGIN');
      try {
        await db.run(
          `UPDATE products SET status = 'Người bán đã xóa' WHERE user_id = $1 AND status IN ('Công khai', 'Chờ kiểm duyệt')`,
          [userId]
        );
        await db.run(
          `UPDATE order_items SET status = 'Từ chối' WHERE status = 'Chờ xác nhận' AND product_id IN (SELECT id FROM products WHERE user_id = $1)`,
          [userId]
        );
        await db.run(
          `UPDATE orders SET status = CASE
                WHEN EXISTS (SELECT 1 FROM order_items WHERE order_id = orders.id AND status = 'Chờ xác nhận') THEN 'Chờ xác nhận'
                WHEN EXISTS (SELECT 1 FROM order_items WHERE order_id = orders.id AND status = 'Từ chối') THEN 'Có sản phẩm bị từ chối'
                WHEN EXISTS (SELECT 1 FROM order_items WHERE order_id = orders.id AND status = 'Đã hủy') THEN 'Đã hủy'
                ELSE 'SOLD' END
            WHERE id IN (SELECT order_id FROM order_items WHERE product_id IN (SELECT id FROM products WHERE user_id = $1))`,
          [userId]
        );
        await db.run(
          `UPDATE users SET is_active = false, role = 'user', name = 'Tài khoản đã xóa', email = $1, phone = '', address = '', profile_image = '' WHERE id = $2`,
          [deletedEmail, userId]
        );
        await db.run('COMMIT');
        return res.json({ message: 'Đã xóa tài khoản; sản phẩm đang bán được ẩn, dữ liệu lịch sử được giữ lại', id: userId });
      } catch (e) {
        await db.run('ROLLBACK');
        return res.status(500).json({ message: e.message });
      }
    };
    if (target.role !== 'admin') {
      return deactivate();
    }
    const adminCount = await db.get("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = true");
    if (adminCount.count <= 1) {
      return res.status(409).json({ message: 'Không thể xóa admin cuối cùng' });
    }
    return deactivate();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { register, login, getMe, updateMe, listUsers, createUser, updateUser, deleteUser };
