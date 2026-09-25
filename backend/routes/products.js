const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const verifyToken = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024, files: 10 },
    fileFilter: (req, file, callback) => {
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) {
            return callback(new Error('Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF'));
        }
        callback(null, true);
    }
});

const verifyAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Chỉ admin mới được duyệt sản phẩm' });
    }
    return next();
};

router.get('/', productController.getAllProducts);
router.get('/mine', verifyToken, productController.getMyProducts);
router.patch('/mine/:id/status', verifyToken, productController.updateMyProductStatus);
router.patch('/mine/:id', verifyToken, upload.single('image'), productController.updateMyProduct);
router.delete('/mine/:id', verifyToken, productController.deleteMyProduct);
router.get('/admin/all', verifyToken, verifyAdmin, productController.getAdminProducts);
router.get('/admin/pending', verifyToken, verifyAdmin, productController.getPendingProducts);
router.get('/admin/:id/images', verifyToken, verifyAdmin, productController.getAdminProductImages);
router.get('/admin/:id', verifyToken, verifyAdmin, productController.getAdminProductById);
router.patch('/admin/:id/approve', verifyToken, verifyAdmin, productController.approveProduct);
router.patch('/admin/:id/reject', verifyToken, verifyAdmin, productController.rejectProduct);
router.delete('/admin/:id', verifyToken, verifyAdmin, productController.deleteProduct);
router.get('/:id/reviews', productController.getProductReviews);
router.post('/:id/reviews', verifyToken, productController.saveProductReview);
router.get('/:id', productController.getProductById);
router.post('/', verifyToken, upload.array('images', 10), productController.createProduct);
router.get('/:id/images', productController.getProductImages);

module.exports = router;
