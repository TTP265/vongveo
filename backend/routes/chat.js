const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const chatController = require('../controllers/chatController');

router.use(verifyToken);
router.get('/conversations', chatController.listConversations);
router.post('/conversations', chatController.startConversation);
router.get('/conversations/:id/messages', chatController.getMessages);
router.post('/conversations/:id/messages', chatController.sendMessage);

module.exports = router;
