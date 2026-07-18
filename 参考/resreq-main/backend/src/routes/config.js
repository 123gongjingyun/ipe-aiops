/**
 * 配置管理路由
 */

const express = require('express');
const router = express.Router();

const {
  ConfigTypeController,
  EnvironmentController,
  ConfigOptionController,
  ConfigDescriptionController,
  LinkageRelationController
} = require('../controllers/configController');

// 导入认证中间件
const { authenticate } = require('../middleware/auth');

// 权限验证中间件（管理员专用）
const adminOnly = (req, res, next) => {
  // 兼容两种权限验证方式
  const userRole = req.user?.role || req.role;
  if (userRole === 'admin') {
    next();
  } else {
    console.log('权限验证失败:', { user: req.user, role: req.role, userRole });
    res.status(403).json({
      success: false,
      message: '需要管理员权限'
    });
  }
};

// 公开的配置读取接口（所有用户可访问）

// 获取所有配置类型
router.get('/types', ConfigTypeController.getAll);

// 获取所有环境
router.get('/environments', EnvironmentController.getAll);

// 获取配置选项（支持筛选）
router.get('/options', ConfigOptionController.getAll);

// 获取配置详细说明
router.get('/descriptions', ConfigDescriptionController.getAll);

// 获取3级联动关系
router.get('/linkage', LinkageRelationController.getAll);

// 根据类型获取联动关系（用于前端下拉框联动）
router.get('/linkage/type/:typeId', LinkageRelationController.getByType);

// 管理员专用接口

// 配置类型管理
router.post('/types', authenticate, adminOnly, ConfigTypeController.create);
router.put('/types/:id', authenticate, adminOnly, ConfigTypeController.update);
router.delete('/types/:id', authenticate, adminOnly, ConfigTypeController.delete);
router.patch('/types/:id/toggle', authenticate, adminOnly, ConfigTypeController.toggleActive);

// 环境管理
router.post('/environments', authenticate, adminOnly, EnvironmentController.create);
router.put('/environments/:id', authenticate, adminOnly, EnvironmentController.update);
router.delete('/environments/:id', authenticate, adminOnly, EnvironmentController.delete);
router.patch('/environments/:id/toggle', authenticate, adminOnly, EnvironmentController.toggleActive);

// 配置选项管理
router.post('/options', authenticate, adminOnly, ConfigOptionController.create);
router.put('/options/:id', authenticate, adminOnly, ConfigOptionController.update);
router.delete('/options/:id', authenticate, adminOnly, ConfigOptionController.delete);

// 配置详细说明管理
router.put('/descriptions/:configOptionId', authenticate, adminOnly, ConfigDescriptionController.update);

module.exports = router;
