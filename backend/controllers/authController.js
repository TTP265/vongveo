const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'vongveo_secret_key_2026';

const register = async (req, res) => {
    try {
        await db.ready;
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All input is required' });
        }

        const existingUser = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        if (existingUser) {
            return res.status(409).json({ message: 'User Already Exist. Please Login' });
        }

        const salt = await bcrypt.genSalt(10);
        const encryptedPassword = await bcrypt.hash(password, salt);
        const userId = await new Promise((resolve, reject) => {
            db.run(
                "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'user')",
                [name, email, encryptedPassword],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });

        const role = 'user';
        const token = jwt.sign(
            { user_id: userId, email, name, role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.status(201).json({
            message: 'Registration successful',
            user: { id: userId, user_id: userId, name, email, role, phone: '', address: '', profile_image: '' },
            token
        });
    } catch (err) {
        console.error('Registration error:', err);
        if (err.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ message: 'User Already Exist. Please Login' });
        }
        return res.status(500).json({ message: 'Server error' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'All input is required' });
        }

        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                return res.status(500).json({ message: err.message });
            }
            if (!user || !user.is_active) {
                return res.status(401).json({ message: 'Invalid Credentials' });
            }

            const isMatch = await bcrypt.compare(password, user.password);

            if (isMatch) {
                // Create token
                const token = jwt.sign(
                    { user_id: user.id, email: user.email, name: user.name, role: user.role },
                    JWT_SECRET,
                    { expiresIn: '7d' }
                );

                res.status(200).json({
                    message: 'Login successful',
                    user: { id: user.id, user_id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone || '', address: user.address || '', profile_image: user.profile_image || '' },
                    token
                });
            } else {
                res.status(401).json({ message: 'Invalid Credentials' });
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

const getMe = (req, res) => {
    db.get('SELECT id, name, email, role, phone, address, profile_image FROM users WHERE id = ?', [req.user.user_id], (err, user) => {
        if (err) return res.status(500).json({ message: err.message });
        if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
        return res.json({ ...user, user_id: user.id });
    });
};

const updateMe = (req, res) => {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : '';
    const address = typeof req.body.address === 'string' ? req.body.address.trim() : '';
    const phoneDigits = phone.replace(/\D/g, '');
    if (name.length < 2 || name.length > 100) return res.status(400).json({ message: 'Tên phải từ 2 đến 100 ký tự' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Email không hợp lệ' });
    if (phone && (phoneDigits.length < 9 || phoneDigits.length > 15)) return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
    if (address.length > 300) return res.status(400).json({ message: 'Địa chỉ tối đa 300 ký tự' });

    db.get('SELECT id FROM users WHERE email = ? AND id <> ?', [email, req.user.user_id], (lookupError, existing) => {
        if (lookupError) return res.status(500).json({ message: lookupError.message });
        if (existing) return res.status(409).json({ message: 'Email này đã được tài khoản khác sử dụng' });
        const profileImage = req.file ? `/uploads/${req.file.filename}` : null;
        db.run(`UPDATE users SET name = ?, email = ?, phone = ?, address = ?,
                    profile_image = COALESCE(?, profile_image) WHERE id = ?`,
            [name, email, phone, address, profileImage, req.user.user_id], function (updateError) {
                if (updateError) return res.status(500).json({ message: updateError.message });
                return db.get('SELECT id, name, email, role, phone, address, profile_image FROM users WHERE id = ?', [req.user.user_id], (getError, user) => {
                    if (getError) return res.status(500).json({ message: getError.message });
                    const token = jwt.sign(
                        { user_id: user.id, email: user.email, name: user.name, role: user.role },
                        JWT_SECRET,
                        { expiresIn: '7d' }
                    );
                    return res.json({ message: 'Đã cập nhật hồ sơ', user: { ...user, user_id: user.id }, token });
                });
            });
    });
};

const listUsers = (req, res) => {
    db.all(`SELECT id, name, email, role, phone, address, profile_image, created_at
            FROM users WHERE is_active = 1 ORDER BY id ASC`, [], (err, users) => {
        if (err) return res.status(500).json({ message: err.message });
        return res.json(users);
    });
};

const createUser = async (req, res) => {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const role = req.body.role || 'user';
    const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : '';
    const address = typeof req.body.address === 'string' ? req.body.address.trim() : '';
    const phoneDigits = phone.replace(/\D/g, '');
    if (name.length < 2 || name.length > 100) return res.status(400).json({ message: 'Tên phải từ 2 đến 100 ký tự' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Email không hợp lệ' });
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ message: 'Vai trò không hợp lệ' });
    if (phone && (phoneDigits.length < 9 || phoneDigits.length > 15)) return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
    if (address.length > 300) return res.status(400).json({ message: 'Địa chỉ tối đa 300 ký tự' });
    if (password.length < 8 || password.length > 100) return res.status(400).json({ message: 'Mật khẩu phải có từ 8 đến 100 ký tự' });

    try {
        const encryptedPassword = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO users (name, email, password, role, phone, address, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [name, email, encryptedPassword, role, phone, address], function (err) {
                if (err?.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ message: 'Email này đã được sử dụng' });
                if (err) return res.status(500).json({ message: err.message });
                return db.get('SELECT id, name, email, role, phone, address, profile_image, created_at FROM users WHERE id = ?', [this.lastID], (getError, user) => {
                    if (getError) return res.status(500).json({ message: getError.message });
                    return res.status(201).json({ message: 'Đã tạo tài khoản', user });
                });
            });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

const updateUser = (req, res) => {
    const userId = Number(req.params.id);
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const role = req.body.role;
    const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : '';
    const address = typeof req.body.address === 'string' ? req.body.address.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const phoneDigits = phone.replace(/\D/g, '');
    if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: 'ID tài khoản không hợp lệ' });
    if (name.length < 2 || name.length > 100) return res.status(400).json({ message: 'Tên phải từ 2 đến 100 ký tự' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Email không hợp lệ' });
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ message: 'Vai trò không hợp lệ' });
    if (phone && (phoneDigits.length < 9 || phoneDigits.length > 15)) return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
    if (address.length > 300) return res.status(400).json({ message: 'Địa chỉ tối đa 300 ký tự' });
    if (password && (password.length < 8 || password.length > 100)) return res.status(400).json({ message: 'Mật khẩu mới phải có từ 8 đến 100 ký tự' });

    db.get('SELECT id, role FROM users WHERE id = ? AND is_active = 1', [userId], (lookupError, target) => {
        if (lookupError) return res.status(500).json({ message: lookupError.message });
        if (!target) return res.status(404).json({ message: 'Không tìm thấy tài khoản đang hoạt động' });
        if (target.role === 'admin' && role !== 'admin') {
            return db.get("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = 1", [], (countError, result) => {
                if (countError) return res.status(500).json({ message: countError.message });
                if (result.count <= 1) return res.status(409).json({ message: 'Không thể hạ quyền admin cuối cùng' });
                return saveUserUpdate();
            });
        }
        return saveUserUpdate();

        function saveUserUpdate() {
            db.get('SELECT id FROM users WHERE email = ? AND id <> ?', [email, userId], async (emailError, duplicate) => {
                if (emailError) return res.status(500).json({ message: emailError.message });
                if (duplicate) return res.status(409).json({ message: 'Email này đã được sử dụng' });
                try {
                    const encryptedPassword = password ? await bcrypt.hash(password, 10) : null;
                    db.run(`UPDATE users SET name = ?, email = ?, role = ?, phone = ?, address = ?,
                                password = COALESCE(?, password) WHERE id = ? AND is_active = 1`,
                        [name, email, role, phone, address, encryptedPassword, userId], (updateError) => {
                            if (updateError) return res.status(500).json({ message: updateError.message });
                            return db.get('SELECT id, name, email, role, phone, address, profile_image, created_at FROM users WHERE id = ?', [userId], (getError, user) => {
                                if (getError) return res.status(500).json({ message: getError.message });
                                return res.json({ message: 'Đã cập nhật tài khoản', user });
                            });
                        });
                } catch (hashError) {
                    return res.status(500).json({ message: hashError.message });
                }
            });
        }
    });
};

const deleteUser = (req, res) => {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ message: 'ID tài khoản không hợp lệ' });
    if (userId === Number(req.user.user_id)) return res.status(400).json({ message: 'Bạn không thể xóa chính tài khoản admin đang đăng nhập' });

    db.get('SELECT id, role FROM users WHERE id = ? AND is_active = 1', [userId], (lookupError, target) => {
        if (lookupError) return res.status(500).json({ message: lookupError.message });
        if (!target) return res.status(404).json({ message: 'Không tìm thấy tài khoản đang hoạt động' });

        const deactivate = () => {
            const deletedEmail = `deleted-${userId}-${Date.now()}@invalid.local`;
            db.serialize(() => {
                db.run('BEGIN IMMEDIATE TRANSACTION', (beginError) => {
                    if (beginError) return res.status(500).json({ message: beginError.message });
                    db.run(`UPDATE products SET status = 'Người bán đã xóa'
                            WHERE user_id = ? AND status IN ('Công khai', 'Chờ kiểm duyệt')`, [userId], (productError) => {
                        if (productError) return db.run('ROLLBACK', () => res.status(500).json({ message: productError.message }));
                        db.run(`UPDATE order_items SET status = 'Từ chối'
                                WHERE status = 'Chờ xác nhận'
                                  AND product_id IN (SELECT id FROM products WHERE user_id = ?)`, [userId], (itemsError) => {
                            if (itemsError) return db.run('ROLLBACK', () => res.status(500).json({ message: itemsError.message }));
                            db.run(`UPDATE orders SET status = CASE
                                    WHEN EXISTS (SELECT 1 FROM order_items WHERE order_id = orders.id AND status = 'Chờ xác nhận') THEN 'Chờ xác nhận'
                                    WHEN EXISTS (SELECT 1 FROM order_items WHERE order_id = orders.id AND status = 'Từ chối') THEN 'Có sản phẩm bị từ chối'
                                    WHEN EXISTS (SELECT 1 FROM order_items WHERE order_id = orders.id AND status = 'Đã hủy') THEN 'Đã hủy'
                                    ELSE 'SOLD' END
                                WHERE id IN (SELECT order_id FROM order_items
                                             WHERE product_id IN (SELECT id FROM products WHERE user_id = ?))`, [userId], (ordersError) => {
                                if (ordersError) return db.run('ROLLBACK', () => res.status(500).json({ message: ordersError.message }));
                                db.run(`UPDATE users SET is_active = 0, role = 'user', name = 'Tài khoản đã xóa',
                                            email = ?, phone = '', address = '', profile_image = '' WHERE id = ?`,
                                    [deletedEmail, userId], (userError) => {
                                        if (userError) return db.run('ROLLBACK', () => res.status(500).json({ message: userError.message }));
                                        db.run('COMMIT', (commitError) => {
                                            if (commitError) return db.run('ROLLBACK', () => res.status(500).json({ message: commitError.message }));
                                            return res.json({ message: 'Đã xóa tài khoản; sản phẩm đang bán được ẩn, dữ liệu lịch sử được giữ lại', id: userId });
                                        });
                                    });
                            });
                        });
                    });
                });
            });
        };

        if (target.role !== 'admin') return deactivate();
        db.get("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = 1", [], (countError, result) => {
            if (countError) return res.status(500).json({ message: countError.message });
            if (result.count <= 1) return res.status(409).json({ message: 'Không thể xóa admin cuối cùng' });
            return deactivate();
        });
    });
};

module.exports = { register, login, getMe, updateMe, listUsers, createUser, updateUser, deleteUser };
