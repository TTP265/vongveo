// backend/controllers/chatController.js – PostgreSQL version
const db = require('../config/db');

// Helper to send standardized error response
const sendError = (res, error) => {
  console.error('Chat error:', error.message);
  res.status(500).json({ message: 'Có lỗi khi xử lý tin nhắn' });
};

// List conversations for the logged‑in user
exports.listConversations = async (req, res) => {
  try {
    const uid = req.user.user_id;
    const rows = await db.all(
      `SELECT c.id, c.product_id, c.updated_at, p.name AS product_name,
              p.image_url AS product_image,
              CASE WHEN c.buyer_id = $1 THEN s.name ELSE b.name END AS other_name,
              (SELECT body FROM chat_messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS last_message,
              (SELECT created_at FROM chat_messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS last_message_at,
              (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.id AND sender_id <> $1 AND is_read = 0) AS unread_count
       FROM chat_conversations c
       JOIN products p ON p.id = c.product_id
       JOIN users b ON b.id = c.buyer_id
       JOIN users s ON s.id = c.seller_id
       WHERE c.buyer_id = $1 OR c.seller_id = $1
       ORDER BY COALESCE(c.updated_at, c.created_at) DESC`,
      [uid]
    );
    res.json(rows);
  } catch (error) {
    sendError(res, error);
  }
};

// Start a new conversation (or retrieve existing one)
exports.startConversation = async (req, res) => {
  try {
    const productId = Number(req.body.product_id);
    if (!Number.isInteger(productId) || productId < 1) return res.status(400).json({ message: 'Sản phẩm không hợp lệ' });
    const product = await db.get('SELECT id, user_id, status FROM products WHERE id = $1', [productId]);
    if (!product || !['Công khai', 'SOLD'].includes(product.status))
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm để chat' });
    if (Number(product.user_id) === Number(req.user.user_id))
      return res.status(400).json({ message: 'Bạn không thể chat với chính mình' });
    let conversation = await db.get('SELECT id FROM chat_conversations WHERE product_id = $1 AND buyer_id = $2', [productId, req.user.user_id]);
    if (!conversation) {
      try {
        const created = await db.run(
          `INSERT INTO chat_conversations (product_id, buyer_id, seller_id) VALUES ($1, $2, $3) RETURNING id`,
          [productId, req.user.user_id, product.user_id]
        );
        conversation = { id: created.rows[0].id };
      } catch (error) {
        // Handle race condition where another request inserted the row
        if (error.code !== 'SQLITE_CONSTRAINT') throw error;
        conversation = await db.get('SELECT id FROM chat_conversations WHERE product_id = $1 AND buyer_id = $2', [productId, req.user.user_id]);
      }
    }
    res.status(200).json({ conversation_id: conversation.id });
  } catch (error) {
    sendError(res, error);
  }
};

// Get messages of a specific conversation
exports.getMessages = async (req, res) => {
  try {
    const conversationId = Number(req.params.id);
    const uid = Number(req.user.user_id);
    const conversation = await db.get(
      `SELECT c.id, c.product_id, c.buyer_id, c.seller_id, p.name AS product_name,
              p.image_url AS product_image,
              CASE WHEN c.buyer_id = $1 THEN s.name ELSE b.name END AS other_name
       FROM chat_conversations c
       JOIN products p ON p.id = c.product_id
       JOIN users b ON b.id = c.buyer_id
       JOIN users s ON s.id = c.seller_id
       WHERE c.id = $2 AND (c.buyer_id = $1 OR c.seller_id = $1)`,
      [uid, conversationId]
    );
    if (!conversation) return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });
    await db.run('UPDATE chat_messages SET is_read = 1 WHERE conversation_id = $1 AND sender_id <> $2', [conversationId, uid]);
    const messages = await db.all(
      `SELECT m.id, m.conversation_id, m.sender_id, m.body, m.created_at, u.name AS sender_name
       FROM chat_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.id ASC`,
      [conversationId]
    );
    res.json({ conversation, messages });
  } catch (error) {
    sendError(res, error);
  }
};

// Send a new chat message
exports.sendMessage = async (req, res) => {
  try {
    const conversationId = Number(req.params.id);
    const uid = Number(req.user.user_id);
    const body = typeof req.body.body === 'string' ? req.body.body.trim() : '';
    if (!body || body.length > 2000) return res.status(400).json({ message: 'Tin nhắn cần từ 1 đến 2000 ký tự' });
    const conversation = await db.get('SELECT id FROM chat_conversations WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)', [conversationId, uid]);
    if (!conversation) return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });
    const inserted = await db.run('INSERT INTO chat_messages (conversation_id, sender_id, body) VALUES ($1, $2, $3) RETURNING id', [conversationId, uid, body]);
    await db.run('UPDATE chat_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [conversationId]);
    const message = await db.get(
      `SELECT m.id, m.conversation_id, m.sender_id, m.body, m.created_at, u.name AS sender_name
       FROM chat_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.id = $1`,
      [inserted.rows[0].id]
    );
    res.status(201).json(message);
  } catch (error) {
    sendError(res, error);
  }
};
