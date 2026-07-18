const express = require('express');
const router = express.Router();
const sfsController = require('../controllers/sfsController');
const { authenticate, isAdmin } = require('../middleware/auth');

// 创建SFS申请
router.post('/', authenticate, sfsController.createSfsRequest);

// 获取当前用户的SFS申请列表 (必须在 /:id 之前)
router.get('/my', authenticate, sfsController.getMySfsRequests);

// 获取所有SFS申请(仅管理员) (必须在 /:id 之前)
router.get('/', authenticate, isAdmin, sfsController.getAllSfsRequests);

// 具体路由必须在通用路由之前
// 更新SFS申请状态(仅管理员) - 必须在 /:id 之前
router.put('/:id/status', authenticate, isAdmin, sfsController.updateSfsRequestStatus);

// 通用CRUD路由 (放在最后)
// 获取单个SFS申请详情
router.get('/:id', authenticate, sfsController.getSfsRequestById);

// 更新SFS申请内容
router.put('/:id', authenticate, sfsController.updateSfsRequest);

// 删除SFS申请
router.delete('/:id', authenticate, sfsController.deleteSfsRequest);

module.exports = router;
