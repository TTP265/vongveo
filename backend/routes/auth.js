const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const verifyToken = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const profileUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, callback) => {
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) {
            return callback(new Error('Ảnh đại diện chỉ nhận JPG, PNG, WEBP hoặc GIF'));
        }
        return callback(null, true);
    }
});

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/users', verifyToken, requireAdmin, authController.listUsers);
router.post('/users', verifyToken, requireAdmin, authController.createUser);
router.patch('/users/:id', verifyToken, requireAdmin, authController.updateUser);
router.delete('/users/:id', verifyToken, requireAdmin, authController.deleteUser);
router.get('/me', verifyToken, authController.getMe);
router.patch('/me', verifyToken, profileUpload.single('profile_image'), authController.updateMe);

module.exports = router;
