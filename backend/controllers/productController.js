const db = require('../config/db');
const categories = ['Thời trang', 'Đồ gia dụng', 'Dụng cụ học tập', 'Đồ sự kiện'];
const types = ['Bán', 'Cho thuê'];

// Get all public products (including SOLD)
const getAllProducts = async (req, res) => {
  try {
    const rows = await db.all(`SELECT id, user_id, name, category, description, type, price, image_url, status, created_at FROM products WHERE status IN ('Công khai', 'SOLD') ORDER BY created_at DESC`);
    const search = (req.query.search || '').trim().toLocaleLowerCase('vi-VN');
    const filteredRows = search ? rows.filter(p => p.name.toLocaleLowerCase('vi-VN').includes(search)) : rows;
    res.json(filteredRows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get products pending admin approval
const getPendingProducts = async (req, res) => {
  try {
    const rows = await db.all(`SELECT p.id, p.name, p.category, p.description,
            p.type, p.price, p.image_url, p.status,
            p.created_at, u.name AS seller_name, u.email AS seller_email
        FROM products p
        JOIN users u ON u.id = p.user_id
        WHERE p.status = 'Chờ kiểm duyệt'
        ORDER BY p.created_at ASC`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin list all products
const getAdminProducts = async (req, res) => {
  try {
    const rows = await db.all(`SELECT p.id, p.name, p.category, p.description,
            p.type, p.price, p.image_url, p.status,
            p.created_at, u.name AS seller_name, u.email AS seller_email
        FROM products p
        JOIN users u ON u.id = p.user_id
        ORDER BY p.created_at DESC`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin get product by id (any status)
const getAdminProductById = async (req, res) => {
  try {
    const product = await db.get(`SELECT p.id, p.user_id, p.name, p.category,
            p.description, p.type, p.price, p.image_url,
            p.status, p.created_at, u.name AS seller_name, u.email AS seller_email
        FROM products p
        JOIN users u ON u.id = p.user_id
        WHERE p.id = $1`, [req.params.id]);
    if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get products of the logged‑in user
const getMyProducts = async (req, res) => {
  try {
    const rows = await db.all(`SELECT id, name, category, description, type, price, image_url, status, created_at FROM products WHERE user_id = $1 ORDER BY created_at DESC`, [req.user.user_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update a product of the logged‑in user (sets status to pending)
const updateMyProduct = async (req, res) => {
  try {
    const { name, category, description, type, price } = req.body;
    const parsedPrice = Number(price);
    if (!name || !category || !type || price === undefined || price === '')
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ các trường bắt buộc' });
    if (!categories.includes(category))
      return res.status(400).json({ message: 'Danh mục không hợp lệ' });
    if (!types.includes(type))
      return res.status(400).json({ message: 'Loại giao dịch không hợp lệ' });
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0)
      return res.status(400).json({ message: 'Giá phải là số lớn hơn 0' });
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const result = await db.run(`UPDATE products
        SET name = $1, category = $2, description = $3, type = $4, price = $5,
            image_url = COALESCE($6, image_url), status = 'Chờ kiểm duyệt'
        WHERE id = $7 AND user_id = $8`,
      [name.trim(), category, description || '', type, parsedPrice, imageUrl, req.params.id, req.user.user_id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Không tìm thấy sản phẩm của bạn' });
    res.json({ message: 'Đã cập nhật sản phẩm; sản phẩm sẽ chờ admin duyệt lại', status: 'Chờ kiểm duyệt' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Change product status between Công khai and SOLD (only after admin approval)
const updateMyProductStatus = async (req, res) => {
  try {
    const requestedStatus = req.body.status;
    if (!['SOLD', 'Công khai'].includes(requestedStatus))
      return res.status(400).json({ message: 'Trạng thái chỉ được đổi giữa Công khai và SOLD' });
    const validTransition = requestedStatus === 'SOLD' ? "status = 'Công khai'" : "status = 'SOLD'";
    const result = await db.run(`UPDATE products SET status = $1 WHERE id = $2 AND user_id = $3 AND ${validTransition}`,
      [requestedStatus, req.params.id, req.user.user_id]
    );
    if (result.rowCount === 0) {
      const product = await db.get('SELECT status FROM products WHERE id = $1 AND user_id = $2', [req.params.id, req.user.user_id]);
      if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm của bạn' });
      return res.status(409).json({ message: 'Chỉ sản phẩm đã được duyệt mới có thể chuyển giữa Công khai và SOLD' });
    }
    const message = requestedStatus === 'SOLD' ? 'Đã chuyển sản phẩm sang SOLD' : 'Đã cập nhật sản phẩm thành Công khai';
    res.json({ message, id: Number(req.params.id), status: requestedStatus });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete any product (admin)
const deleteProduct = async (req, res) => {
  try {
    const result = await db.run('DELETE FROM products WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    res.json({ message: 'Đã xóa sản phẩm', id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete own product
const deleteMyProduct = async (req, res) => {
  try {
    const result = await db.run('DELETE FROM products WHERE id = $1 AND user_id = $2', [req.params.id, req.user.user_id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Không tìm thấy sản phẩm của bạn' });
    res.json({ message: 'Đã xóa sản phẩm của bạn', id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Approve product (admin)
const approveProduct = async (req, res) => {
  try {
    const result = await db.run("UPDATE products SET status = 'Công khai' WHERE id = $1 AND status = 'Chờ kiểm duyệt'", [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Không tìm thấy sản phẩm đang chờ duyệt' });
    res.json({ message: 'Đã duyệt sản phẩm', id: Number(req.params.id), status: 'Công khai' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Reject product (admin)
const rejectProduct = async (req, res) => {
  try {
    const result = await db.run("UPDATE products SET status = 'Không được duyệt' WHERE id = $1 AND status = 'Chờ kiểm duyệt'", [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Không tìm thấy sản phẩm đang chờ duyệt' });
    res.json({ message: 'Đã từ chối sản phẩm', id: Number(req.params.id), status: 'Không được duyệt' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get product by id (public, only Công khai or SOLD)
const getProductById = async (req, res) => {
  try {
    const product = await db.get(`SELECT p.id, p.user_id, p.name, p.category,
            p.description, p.type, p.price, p.image_url,
            p.status, p.created_at, u.name AS seller_name
        FROM products p
        JOIN users u ON u.id = p.user_id
        WHERE p.id = $1 AND p.status IN ('Công khai', 'SOLD')`,
      [req.params.id]
    );
    if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get product images (public)
const getProductImages = async (req, res) => {
  try {
    const rows = await db.all(`SELECT image_url FROM (
           SELECT p.image_url AS image_url, 0 AS sort_order
           FROM products p WHERE p.id = $1 AND p.status IN ('Công khai', 'SOLD')
           UNION ALL
           SELECT pi.image_url AS image_url, pi.id AS sort_order
           FROM product_images pi
           JOIN products p ON p.id = pi.product_id
           WHERE p.id = $1 AND p.status IN ('Công khai', 'SOLD')
         ) AS imgs ORDER BY sort_order`, [req.params.id, req.params.id]);
    res.json(rows.map(r => r.image_url));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get product images for admin (any status)
const getAdminProductImages = async (req, res) => {
  try {
    const rows = await db.all(`SELECT image_url FROM (
           SELECT p.image_url AS image_url, 0 AS sort_order
           FROM products p WHERE p.id = $1
           UNION ALL
           SELECT pi.image_url AS image_url, pi.id AS sort_order
           FROM product_images pi
           WHERE pi.product_id = $1
         ) AS imgs ORDER BY sort_order`, [req.params.id, req.params.id]);
    res.json(rows.map(r => r.image_url));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get product reviews (public)
const getProductReviews = async (req, res) => {
  try {
    const rows = await db.all(`SELECT r.id, r.rating, r.comment, r.created_at,
            r.updated_at, u.name AS reviewer_name
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        JOIN products p ON p.id = r.product_id
        WHERE r.product_id = $1 AND p.status IN ('Công khai', 'SOLD')
        ORDER BY r.created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Save (create or update) a product review
const saveProductReview = async (req, res) => {
  try {
    const rating = Number(req.body.rating);
    const comment = typeof req.body.comment === 'string' ? req.body.comment.trim() : '';
    if (!Number.isInteger(rating) || rating < 1 || rating > 5)
      return res.status(400).json({ message: 'Số sao phải từ 1 đến 5' });
    if (!comment) return res.status(400).json({ message: 'Vui lòng nhập nội dung đánh giá' });
    const product = await db.get('SELECT user_id FROM products WHERE id = $1 AND status = $2', [req.params.id, 'Công khai']);
    if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm công khai' });
    if (Number(product.user_id) === Number(req.user.user_id))
      return res.status(403).json({ message: 'Bạn không thể tự đánh giá sản phẩm của mình' });
    await db.run(`INSERT INTO reviews (product_id, user_id, rating, comment)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (product_id, user_id) DO UPDATE SET
          rating = EXCLUDED.rating,
          comment = EXCLUDED.comment,
          updated_at = CURRENT_TIMESTAMP`,
      [req.params.id, req.user.user_id, rating, comment]
    );
    res.status(201).json({ message: 'Đã lưu đánh giá của bạn' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create a new product (seller)
const createProduct = async (req, res) => {
  try {
    const { name, category, description, type, price } = req.body;
    const parsedPrice = Number(price);
    if (!name || !category || !type || price === undefined || price === '')
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin bắt buộc' });
    if (!categories.includes(category))
      return res.status(400).json({ message: 'Danh mục không hợp lệ' });
    if (!types.includes(type))
      return res.status(400).json({ message: 'Loại giao dịch không hợp lệ' });
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0)
      return res.status(400).json({ message: 'Giá phải là số lớn hơn 0' });
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ message: 'Vui lòng tải lên ít nhất một ảnh sản phẩm' });
    const imageUrls = req.files.map(f => `/uploads/${f.filename}`);
    const imageUrl = imageUrls[0];
    const result = await db.run(`INSERT INTO products (user_id, name, category, description, condition, type, price, image_url, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Chờ kiểm duyệt') RETURNING id`,
      [req.user.user_id, name.trim(), category, description || '', '', type, parsedPrice, imageUrl]
    );
    const productId = result.rows[0].id;
    // Insert extra images if any
    for (let i = 1; i < imageUrls.length; i++) {
      await db.run('INSERT INTO product_images (product_id, image_url) VALUES ($1, $2)', [productId, imageUrls[i]]);
    }
    res.status(201).json({
      message: 'Sản phẩm đang chờ kiểm duyệt',
      product: { id: productId, name: name.trim(), status: 'Chờ kiểm duyệt', image_url: imageUrl, image_urls: imageUrls }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
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
