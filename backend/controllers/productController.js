const db = require('../config/db');
const categories = ['Thời trang', 'Đồ gia dụng', 'Dụng cụ học tập', 'Đồ sự kiện'];
const types = ['Bán', 'Cho thuê'];

const getAllProducts = (req, res) => {
    db.all(`SELECT id, user_id, name, category, description, type, price, image_url, status, created_at
            FROM products WHERE status IN ('Công khai', 'SOLD') ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: err.message });
        }
        const search = (req.query.search || '').trim().toLocaleLowerCase('vi-VN');
        const filteredRows = search
            ? rows.filter((product) => product.name.toLocaleLowerCase('vi-VN').includes(search))
            : rows;
        res.json(filteredRows);
    });
};

const getPendingProducts = (req, res) => {
    db.all(`SELECT products.id, products.name, products.category, products.description,
                   products.type, products.price, products.image_url, products.status,
                   products.created_at, users.name AS seller_name, users.email AS seller_email
            FROM products JOIN users ON users.id = products.user_id
            WHERE products.status = 'Chờ kiểm duyệt'
            ORDER BY products.created_at ASC`, [], (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json(rows);
    });
};

const getAdminProducts = (req, res) => {
    db.all(`SELECT products.id, products.name, products.category, products.description,
                   products.type, products.price, products.image_url, products.status,
                   products.created_at, users.name AS seller_name, users.email AS seller_email
            FROM products JOIN users ON users.id = products.user_id
            ORDER BY products.created_at DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json(rows);
    });
};

const getAdminProductById = (req, res) => {
    db.get(`SELECT products.id, products.user_id, products.name, products.category,
                   products.description, products.type, products.price, products.image_url,
                   products.status, products.created_at, users.name AS seller_name,
                   users.email AS seller_email
            FROM products JOIN users ON users.id = products.user_id
            WHERE products.id = ?`, [req.params.id], (err, product) => {
        if (err) return res.status(500).json({ message: err.message });
        if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        return res.json(product);
    });
};

const getMyProducts = (req, res) => {
    db.all(`SELECT id, name, category, description, type, price, image_url, status, created_at
            FROM products WHERE user_id = ? ORDER BY created_at DESC`, [req.user.user_id], (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json(rows);
    });
};

const updateMyProduct = (req, res) => {
    const { name, category, description, type, price } = req.body;
    const parsedPrice = Number(price);

    if (!name || !category || !type || price === undefined || price === '') {
        return res.status(400).json({ message: 'Vui lòng nhập đầy đủ các trường bắt buộc' });
    }
    if (!categories.includes(category)) {
        return res.status(400).json({ message: 'Danh mục không hợp lệ' });
    }
    if (!types.includes(type)) {
        return res.status(400).json({ message: 'Loại giao dịch không hợp lệ' });
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({ message: 'Giá phải là số lớn hơn 0' });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    db.run(`UPDATE products
            SET name = ?, category = ?, description = ?, type = ?, price = ?,
                image_url = COALESCE(?, image_url), status = 'Chờ kiểm duyệt'
            WHERE id = ? AND user_id = ?`,
        [name.trim(), category, description || '', type, parsedPrice, imageUrl, req.params.id, req.user.user_id],
        function (err) {
            if (err) return res.status(500).json({ message: err.message });
            if (this.changes === 0) return res.status(404).json({ message: 'Không tìm thấy sản phẩm của bạn' });
            return res.json({ message: 'Đã cập nhật sản phẩm; sản phẩm sẽ chờ admin duyệt lại', status: 'Chờ kiểm duyệt' });
        });
};

const updateMyProductStatus = (req, res) => {
    const requestedStatus = req.body.status;
    if (!['SOLD', 'Công khai'].includes(requestedStatus)) {
        return res.status(400).json({ message: 'Trạng thái chỉ được đổi giữa Công khai và SOLD' });
    }

    const validTransition = requestedStatus === 'SOLD'
        ? "status = 'Công khai'"
        : "status = 'SOLD'";
    db.run(`UPDATE products SET status = ? WHERE id = ? AND user_id = ? AND ${validTransition}`,
        [requestedStatus, req.params.id, req.user.user_id], function (err) {
            if (err) return res.status(500).json({ message: err.message });
            if (this.changes === 0) {
                return db.get('SELECT status FROM products WHERE id = ? AND user_id = ?', [req.params.id, req.user.user_id], (lookupError, product) => {
                    if (lookupError) return res.status(500).json({ message: lookupError.message });
                    if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm của bạn' });
                    return res.status(409).json({ message: 'Chỉ sản phẩm đã được duyệt mới có thể chuyển giữa Công khai và SOLD' });
                });
            }
            const message = requestedStatus === 'SOLD'
                ? 'Đã chuyển sản phẩm sang SOLD'
                : 'Đã cập nhật sản phẩm thành Công khai';
            return res.json({ message, id: Number(req.params.id), status: requestedStatus });
        });
};

const deleteProduct = (req, res) => {
    db.run('DELETE FROM products WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ message: err.message });
        if (this.changes === 0) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        return res.json({ message: 'Đã xóa sản phẩm', id: Number(req.params.id) });
    });
};

const deleteMyProduct = (req, res) => {
    db.run('DELETE FROM products WHERE id = ? AND user_id = ?', [req.params.id, req.user.user_id], function (err) {
        if (err) return res.status(500).json({ message: err.message });
        if (this.changes === 0) return res.status(404).json({ message: 'Không tìm thấy sản phẩm của bạn' });
        return res.json({ message: 'Đã xóa sản phẩm của bạn', id: Number(req.params.id) });
    });
};

const approveProduct = (req, res) => {
    db.run("UPDATE products SET status = 'Công khai' WHERE id = ? AND status = 'Chờ kiểm duyệt'", [req.params.id], function (err) {
        if (err) return res.status(500).json({ message: err.message });
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm đang chờ duyệt' });
        }
        return res.json({ message: 'Đã duyệt sản phẩm', id: Number(req.params.id), status: 'Công khai' });
    });
};

const rejectProduct = (req, res) => {
    db.run("UPDATE products SET status = 'Không được duyệt' WHERE id = ? AND status = 'Chờ kiểm duyệt'", [req.params.id], function (err) {
        if (err) return res.status(500).json({ message: err.message });
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm đang chờ duyệt' });
        }
        return res.json({ message: 'Đã từ chối sản phẩm', id: Number(req.params.id), status: 'Không được duyệt' });
    });
};

const getProductById = (req, res) => {
    db.get(`SELECT products.id, products.user_id, products.name, products.category,
                   products.description, products.type, products.price, products.image_url,
                   products.status, products.created_at, users.name AS seller_name
            FROM products JOIN users ON users.id = products.user_id
            WHERE products.id = ? AND products.status IN ('Công khai', 'SOLD')`,
        [req.params.id], (err, product) => {
            if (err) return res.status(500).json({ message: err.message });
            if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
            res.json(product);
        });
};

const getProductImages = (req, res) => {
    db.all(`SELECT image_url FROM (
                SELECT products.image_url AS image_url, 0 AS sort_order
                FROM products WHERE products.id = ? AND products.status IN ('Công khai', 'SOLD')
                UNION ALL
                SELECT product_images.image_url AS image_url, product_images.id AS sort_order
                FROM product_images JOIN products ON products.id = product_images.product_id
                WHERE products.id = ? AND products.status IN ('Công khai', 'SOLD')
            ) ORDER BY sort_order`, [req.params.id, req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        return res.json(rows.map((row) => row.image_url));
    });
};

const getAdminProductImages = (req, res) => {
    db.all(`SELECT image_url FROM (
                SELECT products.image_url AS image_url, 0 AS sort_order
                FROM products WHERE products.id = ?
                UNION ALL
                SELECT product_images.image_url AS image_url, product_images.id AS sort_order
                FROM product_images WHERE product_images.product_id = ?
            ) ORDER BY sort_order`, [req.params.id, req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        return res.json(rows.map((row) => row.image_url));
    });
};

const getProductReviews = (req, res) => {
    db.all(`SELECT reviews.id, reviews.rating, reviews.comment, reviews.created_at,
                   reviews.updated_at, users.name AS reviewer_name
            FROM reviews JOIN users ON users.id = reviews.user_id
            JOIN products ON products.id = reviews.product_id
            WHERE reviews.product_id = ? AND products.status IN ('Công khai', 'SOLD')
            ORDER BY reviews.created_at DESC`, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        return res.json(rows);
    });
};

const saveProductReview = (req, res) => {
    const rating = Number(req.body.rating);
    const comment = typeof req.body.comment === 'string' ? req.body.comment.trim() : '';
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Số sao phải từ 1 đến 5' });
    }
    if (!comment) return res.status(400).json({ message: 'Vui lòng nhập nội dung đánh giá' });

    db.get(`SELECT user_id FROM products WHERE id = ? AND status = 'Công khai'`, [req.params.id], (err, product) => {
        if (err) return res.status(500).json({ message: err.message });
        if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm công khai' });
        if (Number(product.user_id) === Number(req.user.user_id)) {
            return res.status(403).json({ message: 'Bạn không thể tự đánh giá sản phẩm của mình' });
        }

        db.run(`INSERT INTO reviews (product_id, user_id, rating, comment)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(product_id, user_id) DO UPDATE SET
                    rating = excluded.rating,
                    comment = excluded.comment,
                    updated_at = CURRENT_TIMESTAMP`,
            [req.params.id, req.user.user_id, rating, comment], function (saveErr) {
                if (saveErr) return res.status(500).json({ message: saveErr.message });
                return res.status(201).json({ message: 'Đã lưu đánh giá của bạn' });
            });
    });
};

const createProduct = (req, res) => {
    const { name, category, description, type, price } = req.body;
    const parsedPrice = Number(price);

    if (!name || !category || !type || price === undefined || price === '') {
        return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin bắt buộc' });
    }
    if (!categories.includes(category)) {
        return res.status(400).json({ message: 'Danh mục không hợp lệ' });
    }
    if (!types.includes(type)) {
        return res.status(400).json({ message: 'Loại giao dịch không hợp lệ' });
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({ message: 'Giá phải là số lớn hơn 0' });
    }
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'Vui lòng tải lên ít nhất một ảnh sản phẩm' });

    const imageUrls = req.files.map((file) => `/uploads/${file.filename}`);
    const imageUrl = imageUrls[0];
    db.run(`INSERT INTO products
            (user_id, name, category, description, condition, type, price, image_url, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Chờ kiểm duyệt')`,
        [req.user.user_id, name.trim(), category, description || '', '', type, parsedPrice, imageUrl],
        function (err) {
            if (err) return res.status(500).json({ message: err.message });
            const productId = this.lastID;
            const extraImages = imageUrls.slice(1);
            let index = 0;
            const saveNextImage = () => {
                if (index >= extraImages.length) {
                    return res.status(201).json({
                        message: 'Sản phẩm đang chờ kiểm duyệt',
                        product: { id: productId, name: name.trim(), status: 'Chờ kiểm duyệt', image_url: imageUrl, image_urls: imageUrls }
                    });
                }
                const url = extraImages[index++];
                db.run('INSERT INTO product_images (product_id, image_url) VALUES (?, ?)', [productId, url], (imageError) => {
                    if (imageError) return res.status(500).json({ message: imageError.message });
                    saveNextImage();
                });
            };
            saveNextImage();
        });
};

module.exports = {
    getAllProducts,
    getPendingProducts,
    getAdminProducts,
    getAdminProductById,
    getMyProducts,
    updateMyProduct,
    updateMyProductStatus,
    approveProduct,
    rejectProduct,
    deleteProduct,
    deleteMyProduct,
    getProductById,
    getProductImages,
    getAdminProductImages,
    getProductReviews,
    saveProductReview,
    createProduct
};
