const express = require('express');
const router = express.Router();
const NetworkPolicyController = require('../controllers/networkPolicyController');
const { authenticate, isAdmin } = require('../middleware/auth');

// 创建网络策略申请
router.post('/', authenticate, NetworkPolicyController.createPolicy);

// 获取当前用户的网络策略申请列表
router.get('/my', authenticate, NetworkPolicyController.getMyPolicies);

// 获取所有网络策略申请列表（管理员）
router.get('/', authenticate, isAdmin, NetworkPolicyController.getAllPolicies);

// 获取单个网络策略申请详情
router.get('/:id', authenticate, NetworkPolicyController.getPolicyById);

// 更新网络策略申请
router.put('/:id', authenticate, NetworkPolicyController.updatePolicy);

// 删除网络策略申请
router.delete('/:id', authenticate, NetworkPolicyController.deletePolicy);

// 更新网络策略申请状态（管理员）
router.put('/:id/status', authenticate, isAdmin, NetworkPolicyController.updatePolicyStatus);

module.exports = router;
