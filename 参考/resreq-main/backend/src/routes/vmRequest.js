/**
 * 虚拟机申请路由
 */

const express = require('express');
const router = express.Router();
const VMRequestController = require('../controllers/vmRequestController');
const authenticate = require('../middleware/auth').authenticate;

// 获取当前用户的虚拟机申请列表
// GET /api/vm-requests/my?page=1&pageSize=10&systemName=&status=
router.get('/my', authenticate, VMRequestController.getMyVMRequests);

// 获取所有虚拟机申请列表（管理员）
// GET /api/vm-requests?page=1&pageSize=10&systemName=&status=&username=
router.get('/', authenticate, VMRequestController.getAllVMRequests);

// 获取单个虚拟机申请详情
// GET /api/vm-requests/:id
router.get('/:id', authenticate, VMRequestController.getVMRequestById);

// 创建虚拟机申请
// POST /api/vm-requests
router.post('/', authenticate, VMRequestController.createVMRequest);

// 更新虚拟机申请
// PUT /api/vm-requests/:id
router.put('/:id', authenticate, VMRequestController.updateVMRequest);

// 删除虚拟机申请
// DELETE /api/vm-requests/:id
router.delete('/:id', authenticate, VMRequestController.deleteVMRequest);

module.exports = router;