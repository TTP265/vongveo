const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = 'vongveo_secret_key_2026'; // In production, use process.env.JWT_SECRET

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) return res.status(403).json({ message: 'A token is required for authentication' });

    try {
        const actualToken = token.split(' ')[1];
        req.user = jwt.verify(actualToken, JWT_SECRET);
    } catch (err) {
        const message = err.name === 'TokenExpiredError'
            ? 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại'
            : 'Invalid Token';
        return res.status(401).json({ message });
    }

    db.get('SELECT id, name, email, role, is_active FROM users WHERE id = ?', [req.user.user_id], (err, user) => {
        if (err) return res.status(500).json({ message: err.message });
        if (!user || !user.is_active) return res.status(401).json({ message: 'Tài khoản không còn hoạt động' });
        req.user = { ...req.user, user_id: user.id, name: user.name, email: user.email, role: user.role };
        return next();
    });
};

module.exports = verifyToken;
