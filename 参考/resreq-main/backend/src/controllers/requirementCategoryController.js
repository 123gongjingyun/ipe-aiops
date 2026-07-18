const RequirementCategoryModel = require('../models/requirementCategoryModel');

class RequirementCategoryController {
  // 获取需求分类树
  static async getTree(req, res) {
    try {
      const tree = await RequirementCategoryModel.getTree();
      res.json(tree);
    } catch (error) {
      console.error('获取需求分类树失败:', error);
      res.status(500).json({
        message: '获取需求分类树失败',
        error: error.message
      });
    }
  }

  // 创建需求分类
  static async create(req, res) {
    try {
      const { parent_id, name, description, reference, level, sort_order } = req.body;

      // 验证必填字段
      if (!name || level === undefined || level === null) {
        return res.status(400).json({
          message: '分类名称和层级为必填项'
        });
      }

      // 验证层级值
      if (![1, 2, 3].includes(parseInt(level))) {
        return res.status(400).json({
          message: '分类层级必须为 1、2 或 3'
        });
      }

      const categoryData = {
        parent_id,
        name,
        description,
        reference,
        level: parseInt(level),
        sort_order: sort_order !== undefined ? parseInt(sort_order) : 0
      };

      const id = await RequirementCategoryModel.create(categoryData);
      const category = await RequirementCategoryModel.getById(id);

      res.status(201).json({
        message: '需求分类创建成功',
        category
      });
    } catch (error) {
      console.error('创建需求分类失败:', error);
      res.status(500).json({
        message: '创建需求分类失败',
        error: error.message
      });
    }
  }

  // 更新需求分类
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { parent_id, name, description, reference, level, sort_order, is_active } = req.body;

      // 获取现有分类
      const existing = await RequirementCategoryModel.getById(id);
      if (!existing) {
        return res.status(404).json({
          message: '需求分类不存在'
        });
      }

      // 验证层级值（如果提供）
      if (level !== undefined && level !== null) {
        if (![1, 2, 3].includes(parseInt(level))) {
          return res.status(400).json({
            message: '分类层级必须为 1、2 或 3'
          });
        }
      }

      const updateData = {};
      if (parent_id !== undefined) updateData.parent_id = parent_id;
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (reference !== undefined) updateData.reference = reference;
      if (level !== undefined) updateData.level = parseInt(level);
      if (sort_order !== undefined) updateData.sort_order = parseInt(sort_order);
      if (is_active !== undefined) updateData.is_active = is_active;

      await RequirementCategoryModel.update(id, updateData);

      const category = await RequirementCategoryModel.getById(id);

      res.json({
        message: '需求分类更新成功',
        category
      });
    } catch (error) {
      console.error('更新需求分类失败:', error);
      res.status(500).json({
        message: '更新需求分类失败',
        error: error.message
      });
    }
  }

  // 删除需求分类（软删除）
  static async delete(req, res) {
    try {
      const { id } = req.params;

      // 获取现有分类
      const existing = await RequirementCategoryModel.getById(id);
      if (!existing) {
        return res.status(404).json({
          message: '需求分类不存在'
        });
      }

      // 统一使用软删除
      await RequirementCategoryModel.update(id, { is_active: 0 });

      res.json({
        message: '需求分类已删除'
      });
    } catch (error) {
      console.error('删除需求分类失败:', error);
      res.status(500).json({
        message: '删除需求分类失败',
        error: error.message
      });
    }
  }
}

module.exports = RequirementCategoryController;
