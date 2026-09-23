const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const orderController = require('../controllers/orderController');

router.get('/mine', verifyToken, orderController.getMyOrders);
router.patch('/mine/:id/cancel', verifyToken, orderController.cancelMyOrder);
router.get('/sales', verifyToken, orderController.getSellerOrders);
router.patch('/sales/:itemId', verifyToken, orderController.updateSellerOrderItemStatus);
router.post('/', verifyToken, orderController.createOrder);

module.exports = router;
