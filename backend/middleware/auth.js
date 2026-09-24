const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'vongveo_secret_key_2026';

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(403).json({ message: 'A token is required for authentication' });

    try {
        const actualToken = authHeader.split(' ')[1];
        req.user = jwt.verify(actualToken, JWT_SECRET);
    } catch (err) {
        const message = err.name === 'TokenExpiredError'
            ? 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại'
            : 'Invalid Token';
        return res.status(401).json({ message });
    }

    try {
        // Dùng PostgreSQL placeholder $1 và async/await
        const user = await db.get(
            'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
            [req.user.user_id]
        );
        if (!user) return res.status(401).json({ message: 'Tài khoản không tồn tại' });
        // Nếu cột is_active có thì kiểm tra, nếu không có thì bỏ qua
        if (user.is_active === false) return res.status(401).json({ message: 'Tài khoản không còn hoạt động' });
        req.user = { ...req.user, user_id: user.id, name: user.name, email: user.email, role: user.role };
        return next();
    } catch (err) {
        console.error('Auth middleware DB error:', err.message);
        return res.status(500).json({ message: 'Lỗi xác thực tài khoản' });
    }
};

module.exports = verifyToken;
