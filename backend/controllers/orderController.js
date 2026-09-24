// backend/controllers/orderController.js – PostgreSQL version
const db = require('../config/db');

// Helper to send standardized error responses
const sendError = (res, error) => {
  console.error('Order error:', error.message);
  res.status(500).json({ message: 'Có lỗi khi xử lý đơn hàng' });
};

// Create a new order
const createOrder = async (req, res) => {
  try {
    const shippingName = typeof req.body.shipping_name === 'string' ? req.body.shipping_name.trim() : '';
    const shippingPhone = typeof req.body.shipping_phone === 'string' ? req.body.shipping_phone.trim() : '';
    const shippingAddress = typeof req.body.shipping_address === 'string' ? req.body.shipping_address.trim() : '';
    const note = typeof req.body.note === 'string' ? req.body.note.trim() : '';
    const phoneDigits = shippingPhone.replace(/\\D/g, '');
    if (shippingName.length < 2 || shippingName.length > 100) return res.status(400).json({ message: 'Vui lòng nhập họ tên người nhận (2–100 ký tự)' });
    if (!/^[+\\d\\s().-]+$/.test(shippingPhone) || phoneDigits.length < 9 || phoneDigits.length > 15) return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
    if (shippingAddress.length < 5 || shippingAddress.length > 300) return res.status(400).json({ message: 'Vui lòng nhập địa chỉ nhận hàng (5–300 ký tự)' });
    if (note.length > 500) return res.status(400).json({ message: 'Ghi chú tối đa 500 ký tự' });
    if (!Array.isArray(req.body.items) || req.body.items.length === 0 || req.body.items.length > 20) {
      return res.status(400).json({ message: 'Giỏ hàng trống hoặc có quá nhiều sản phẩm' });
    }

    const items = req.body.items.map(item => ({
      productId: Number(item.product_id),
      quantity: Number(item.quantity),
      rentDays: Number(item.rent_days || 0),
    }));
    const ids = items.map(i => i.productId);
    if (
      items.some(item => !Number.isInteger(item.productId) || item.productId < 1 || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) ||
      new Set(ids).size !== ids.length
    ) {
      return res.status(400).json({ message: 'Thông tin sản phẩm hoặc số lượng không hợp lệ' });
    }

    // Fetch product data
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const products = await db.all(`SELECT id, user_id, type, price FROM products WHERE status = 'Công khai' AND id IN (${placeholders})`, ids);
    if (products.length !== items.length) return res.status(400).json({ message: 'Một hoặc nhiều sản phẩm không còn khả dụng' });
    const productById = new Map(products.map(p => [Number(p.id), p]));
    let totalAmount = 0;
    for (const item of items) {
      const product = productById.get(item.productId);
      if (Number(product.user_id) === Number(req.user.user_id)) {
        return res.status(400).json({ message: 'Bạn không thể đặt mua sản phẩm của chính mình' });
      }
      if (product.type === 'Cho thuê') {
        if (!Number.isInteger(item.rentDays) || item.rentDays < 1 || item.rentDays > 365) {
          return res.status(400).json({ message: 'Số ngày thuê phải từ 1 đến 365' });
        }
        totalAmount += Number(product.price) * item.quantity * item.rentDays;
      } else {
        item.rentDays = 0;
        totalAmount += Number(product.price) * item.quantity;
      }
      item.price = Number(product.price);
    }

    // Insert order and order items inside a transaction
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const orderResult = await client.query(
        `INSERT INTO orders (user_id, total_amount, status, shipping_name, shipping_phone, shipping_address, note)
         VALUES ($1, $2, 'Chờ xác nhận', $3, $4, $5, $6) RETURNING id`,
        [req.user.user_id, totalAmount, shippingName, shippingPhone, shippingAddress, note]
      );
      const orderId = orderResult.rows[0].id;
      for (const item of items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, rent_days, price)
           VALUES ($1, $2, $3, $4, $5)`,
          [orderId, item.productId, item.quantity, item.rentDays, item.price]
        );
      }
      await client.query('COMMIT');
      return res.status(201).json({ message: 'Đặt hàng thành công, đang chờ người bán xác nhận', order_id: orderId, total_amount: totalAmount });
    } catch (txErr) {
      await client.query('ROLLBACK');
      return res.status(500).json({ message: txErr.message });
    } finally {
      client.release();
    }
  } catch (err) {
    sendError(res, err);
  }
};

// Get orders belonging to the logged‑in user
const getMyOrders = async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT orders.id, orders.total_amount, orders.status, orders.created_at,
              orders.shipping_name, orders.shipping_phone, orders.shipping_address, orders.note,
              buyers.name AS account_name, buyers.email AS account_email,
              order_items.product_id, order_items.quantity, order_items.rent_days, order_items.status AS item_status,
              order_items.price, products.name, products.type, products.image_url
       FROM orders
       JOIN users AS buyers ON buyers.id = orders.user_id
       LEFT JOIN order_items ON order_items.order_id = orders.id
       LEFT JOIN products ON products.id = order_items.product_id
       WHERE orders.user_id = $1
       ORDER BY orders.created_at DESC, orders.id DESC`,
      [req.user.user_id]
    );
    return res.json(rows);
  } catch (err) {
    sendError(res, err);
  }
};

// Get orders where the logged‑in user is the seller
const getSellerOrders = async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT order_items.id AS order_item_id, order_items.order_id,
              order_items.product_id, order_items.quantity, order_items.rent_days,
              order_items.price, order_items.status AS item_status,
              products.name AS product_name, products.type AS product_type,
              products.image_url AS product_image,
              orders.created_at, orders.status AS order_status,
              orders.shipping_name, orders.shipping_phone, orders.shipping_address,
              orders.note, buyers.name AS buyer_name, buyers.email AS buyer_email
       FROM order_items
       JOIN products ON products.id = order_items.product_id
       JOIN orders ON orders.id = order_items.order_id
       JOIN users AS buyers ON buyers.id = orders.user_id
       WHERE products.user_id = $1
       ORDER BY orders.created_at DESC, orders.id DESC`,
      [req.user.user_id]
    );
    return res.json(rows);
  } catch (err) {
    sendError(res, err);
  }
};

// Seller updates status of a specific order item
const updateSellerOrderItemStatus = async (req, res) => {
  try {
    const requestedStatus = req.body.status;
    if (!['Đã xác nhận', 'Từ chối'].includes(requestedStatus)) {
      return res.status(400).json({ message: 'Trạng thái xử lý không hợp lệ' });
    }
    const status = requestedStatus === 'Đã xác nhận' ? 'SOLD' : 'Từ chối';
    const updateResult = await db.run(
      `UPDATE order_items
       SET status = $1
       WHERE id = $2 AND status = 'Chờ xác nhận'
         AND product_id IN (SELECT id FROM products WHERE user_id = $3)`,
      [status, req.params.itemId, req.user.user_id]
    );
    if (updateResult.rowCount === 0) return res.status(404).json({ message: 'Không tìm thấy đơn chờ xác nhận cho sản phẩm của bạn' });

    const item = await db.get('SELECT order_id, product_id FROM order_items WHERE id = $1', [req.params.itemId]);
    if (!item) return res.json({ message: 'Đã cập nhật trạng thái đơn hàng', status });

    // Update order status based on remaining items
    const updateOrderStatus = async () => {
      await db.run(
        `UPDATE orders SET status = CASE
               WHEN EXISTS (SELECT 1 FROM order_items WHERE order_id = $1 AND status = 'Chờ xác nhận') THEN 'Chờ xác nhận'
               WHEN EXISTS (SELECT 1 FROM order_items WHERE order_id = $1 AND status = 'Từ chối') THEN 'Có sản phẩm bị từ chối'
               ELSE 'SOLD' END
         WHERE id = $1`,
        [item.order_id]
      );
    };
    if (status === 'SOLD') {
      await db.run(`UPDATE products SET status = 'SOLD' WHERE id = $1`, [item.product_id]);
    }
    await updateOrderStatus();
    return res.json({ message: status === 'SOLD' ? 'Đã xác nhận yêu cầu' : 'Đã từ chối yêu cầu', status });
  } catch (err) {
    sendError(res, err);
  }
};

// Cancel an order placed by the logged‑in user
const cancelMyOrder = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const orderRes = await client.query('SELECT id FROM orders WHERE id = $1 AND user_id = $2', [req.params.id, req.user.user_id]);
    if (orderRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng của bạn' });
    }
    const countsRes = await client.query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status = 'Chờ xác nhận' THEN 1 ELSE 0 END) AS pending
       FROM order_items WHERE order_id = $1`,
      [req.params.id]
    );
    const counts = countsRes.rows[0];
    if (!counts.total || Number(counts.pending) !== Number(counts.total)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Chỉ có thể hủy khi tất cả sản phẩm vẫn đang chờ người bán xác nhận' });
    }
    await client.query(`UPDATE order_items SET status = 'Đã hủy' WHERE order_id = $1 AND status = 'Chờ xác nhận'`, [req.params.id]);
    await client.query(`UPDATE orders SET status = 'Đã hủy' WHERE id = $1`, [req.params.id]);
    await client.query('COMMIT');
    return res.json({ message: 'Đã hủy đơn hàng', status: 'Đã hủy' });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};

module.exports = { createOrder, getMyOrders, getSellerOrders, updateSellerOrderItemStatus, cancelMyOrder };
