const express = require('express');
const router = express.Router();
const RequirementCategoryController = require('../controllers/requirementCategoryController');
const { authenticate, isAdmin } = require('../middleware/auth');

// 获取需求分类树
router.get('/', authenticate, RequirementCategoryController.getTree);

// 创建需求分类（仅管理员）
router.post('/', authenticate, isAdmin, RequirementCategoryController.create);

// 更新需求分类（仅管理员）
router.put('/:id', authenticate, isAdmin, RequirementCategoryController.update);

// 删除需求分类（仅管理员）
router.delete('/:id', authenticate, isAdmin, RequirementCategoryController.delete);

module.exports = router;
