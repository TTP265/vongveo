const db = require('../config/db');

const requireAdmin = (req, res, next) => {
    db.get('SELECT role, is_active FROM users WHERE id = ?', [req.user.user_id], (err, user) => {
        if (err) return res.status(500).json({ message: err.message });
        if (!user || !user.is_active) return res.status(401).json({ message: 'Tài khoản không còn hoạt động' });
        if (user.role !== 'admin') return res.status(403).json({ message: 'Chỉ admin mới được phép thực hiện thao tác này' });
        return next();
    });
};

module.exports = requireAdmin;
