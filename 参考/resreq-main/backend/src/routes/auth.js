const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// 用户注册
router.post('/register', authController.register);

// 用户登录
router.post('/login', authController.login);

// 获取当前用户信息
router.get('/me', authenticate, authController.getCurrentUser);

// 修改密码
router.put('/password', authenticate, authController.changePassword);

module.exports = router;
