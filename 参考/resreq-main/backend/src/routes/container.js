const express = require('express');
const router = express.Router();
const containerController = require('../controllers/containerController');
const { authenticate, isAdmin } = require('../middleware/auth');

// 创建容器申请
router.post('/', authenticate, containerController.createContainerRequest);

// 获取当前用户的容器申请列表
router.get('/my', authenticate, containerController.getMyContainerRequests);

// 获取所有容器申请（管理员）
router.get('/', authenticate, isAdmin, containerController.getAllContainerRequests);

// 获取单个容器申请详情
router.get('/:id', authenticate, containerController.getContainerRequestById);

// 更新容器申请
router.put('/:id', authenticate, containerController.updateContainerRequest);

// 删除容器申请
router.delete('/:id', authenticate, containerController.deleteContainerRequest);

// 更新容器申请状态（管理员）
router.put('/:id/status', authenticate, isAdmin, containerController.updateContainerRequestStatus);

module.exports = router;
