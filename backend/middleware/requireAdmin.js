const db = require('../config/db');

const requireAdmin = async (req, res, next) => {
    try {
        const user = await db.get(
            'SELECT role, is_active FROM users WHERE id = $1',
            [req.user.user_id]
        );
        if (!user) return res.status(401).json({ message: 'Tài khoản không tồn tại' });
        if (user.is_active === false) return res.status(401).json({ message: 'Tài khoản không còn hoạt động' });
        if (user.role !== 'admin') return res.status(403).json({ message: 'Chỉ admin mới được phép thực hiện thao tác này' });
        return next();
    } catch (err) {
        console.error('requireAdmin DB error:', err.message);
        return res.status(500).json({ message: err.message });
    }
};

module.exports = requireAdmin;
