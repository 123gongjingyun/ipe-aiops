const express = require('express');
const router = express.Router();
const PermissionController = require('../controllers/permissionController');
const { authenticate, isAdmin } = require('../middleware/auth');

// 创建权限申请
router.post('/', authenticate, PermissionController.createRequest);

// 获取当前用户的权限申请列表 (必须在 /:id 之前)
router.get('/my', authenticate, PermissionController.getMyRequests);

// 获取所有权限申请列表(仅管理员) (必须在 /:id 之前)
router.get('/', authenticate, isAdmin, PermissionController.getAllRequests);

// 更新申请状态(仅管理员) - 必须在 /:id 之前
router.put('/:id/status', authenticate, isAdmin, PermissionController.updateRequestStatus);

// 获取单个权限申请详情
router.get('/:id', authenticate, PermissionController.getRequestById);

// 更新权限申请
router.put('/:id', authenticate, PermissionController.updateRequest);

// 删除权限申请
router.delete('/:id', authenticate, PermissionController.deleteRequest);

module.exports = router;