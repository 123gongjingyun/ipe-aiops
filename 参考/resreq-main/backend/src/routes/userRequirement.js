const express = require('express');
const router = express.Router();
const UserRequirementController = require('../controllers/userRequirementController');
const { authenticate } = require('../middleware/auth');

// 创建需求单
router.post('/', authenticate, UserRequirementController.create);

// 获取需求单列表
router.get('/', authenticate, UserRequirementController.getList);

// 获取需求单详情
router.get('/:id', authenticate, UserRequirementController.getById);

// 更新需求单
router.put('/:id', authenticate, UserRequirementController.update);

// 删除需求单
router.delete('/:id', authenticate, UserRequirementController.delete);

module.exports = router;
