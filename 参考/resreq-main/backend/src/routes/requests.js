const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { authenticate, isAdmin } = require('../middleware/auth');

// 创建资源申请
router.post('/', authenticate, requestController.createRequest);

// 获取当前用户的申请列表 (必须在 /:id 之前)
router.get('/my', authenticate, requestController.getMyRequests);

// 获取所有申请(仅管理员) (必须在 /:id 之前)
router.get('/', authenticate, isAdmin, requestController.getAllRequests);

// 具体路由必须在通用路由之前
// 更新申请状态(仅管理员) - 必须在 /:id 之前
router.put('/:id/status', authenticate, isAdmin, requestController.updateRequestStatus);

// 导出所有申请为Excel
router.get('/export/all', authenticate, requestController.exportAllRequests);

// 导出申请为Excel - 必须在 /:id 之前
router.get('/:id/export', authenticate, requestController.exportRequestToExcel);

// 通用CRUD路由 (放在最后)
// 获取单个申请详情
router.get('/:id', authenticate, requestController.getRequestById);

// 更新申请内容
router.put('/:id', authenticate, requestController.updateRequest);

// 删除申请
router.delete('/:id', authenticate, requestController.deleteRequest);

module.exports = router;
