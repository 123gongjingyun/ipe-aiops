const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, isAdmin } = require('../middleware/auth');

// 获取所有用户(仅管理员)
router.get('/', authenticate, isAdmin, userController.getAllUsers);

// 获取用户详情
router.get('/:id', authenticate, userController.getUserById);

// 更新用户信息
router.put('/:id', authenticate, userController.updateUser);

// 删除用户(仅管理员)
router.delete('/:id', authenticate, isAdmin, userController.deleteUser);

module.exports = router;
