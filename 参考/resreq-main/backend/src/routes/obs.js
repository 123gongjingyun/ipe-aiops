const express = require('express');
const router = express.Router();
const obsController = require('../controllers/obsController');
const { authenticate, isAdmin } = require('../middleware/auth');

// 创建OBS申请
router.post('/', authenticate, obsController.createObsRequest);

// 获取当前用户的OBS申请列表 (必须在 /:id 之前)
router.get('/my', authenticate, obsController.getMyObsRequests);

// 获取所有OBS申请(仅管理员) (必须在 /:id 之前)
router.get('/', authenticate, isAdmin, obsController.getAllObsRequests);

// 具体路由必须在通用路由之前
// 更新OBS申请状态(仅管理员) - 必须在 /:id 之前
router.put('/:id/status', authenticate, isAdmin, obsController.updateObsRequestStatus);

// 通用CRUD路由 (放在最后)
// 获取单个OBS申请详情
router.get('/:id', authenticate, obsController.getObsRequestById);

// 更新OBS申请内容
router.put('/:id', authenticate, obsController.updateObsRequest);

// 删除OBS申请
router.delete('/:id', authenticate, obsController.deleteObsRequest);

module.exports = router;
