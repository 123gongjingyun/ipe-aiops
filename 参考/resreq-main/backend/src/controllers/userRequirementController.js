const UserRequirementModel = require('../models/userRequirementModel');

class UserRequirementController {
  // 创建需求单
  static async create(req, res) {
    try {
      const { title, answers } = req.body;

      if (!title) {
        return res.status(400).json({ message: '需求单标题为必填项' });
      }

      const requirementData = {
        title,
        applicant_id: req.user.id,
        applicant_name: req.user.username,
        status: 'submitted',
        answers
      };

      const id = await UserRequirementModel.create(requirementData);
      const requirement = await UserRequirementModel.getById(id);

      res.status(201).json({
        message: '需求单创建成功',
        requirement
      });
    } catch (error) {
      console.error('创建需求单失败:', error);
      res.status(500).json({ message: '创建需求单失败', error: error.message });
    }
  }

  // 获取需求单列表（管理员查看全部，普通用户仅查看自己的）
  static async getList(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 10;
      const { search } = req.query;

      const isAdmin = req.user.role === 'admin';
      const userId = isAdmin ? req.query.userId : req.user.id;

      const result = await UserRequirementModel.getList({
        userId,
        page,
        pageSize,
        search
      });

      res.json(result);
    } catch (error) {
      console.error('获取需求单列表失败:', error);
      res.status(500).json({ message: '获取需求单列表失败', error: error.message });
    }
  }

  // 获取需求单详情
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const requirement = await UserRequirementModel.getById(id);

      if (!requirement) {
        return res.status(404).json({ message: '需求单不存在' });
      }

      if (req.user.role !== 'admin' && req.user.id !== requirement.applicant_id) {
        return res.status(403).json({ message: '没有权限查看此需求单' });
      }

      res.json({ requirement });
    } catch (error) {
      console.error('获取需求单详情失败:', error);
      res.status(500).json({ message: '获取需求单详情失败', error: error.message });
    }
  }

  // 更新需求单
  static async update(req, res) {
    try {
      const { id } = req.params;
      const requirement = await UserRequirementModel.getById(id);

      if (!requirement) {
        return res.status(404).json({ message: '需求单不存在' });
      }

      if (req.user.role !== 'admin' && req.user.id !== requirement.applicant_id) {
        return res.status(403).json({ message: '没有权限编辑此需求单' });
      }

      const { title, answers } = req.body;
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (answers !== undefined) updateData.answers = answers;

      await UserRequirementModel.update(id, updateData);
      const updated = await UserRequirementModel.getById(id);

      res.json({
        message: '需求单更新成功',
        requirement: updated
      });
    } catch (error) {
      console.error('更新需求单失败:', error);
      res.status(500).json({ message: '更新需求单失败', error: error.message });
    }
  }

  // 删除需求单
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const requirement = await UserRequirementModel.getById(id);

      if (!requirement) {
        return res.status(404).json({ message: '需求单不存在' });
      }

      if (req.user.role !== 'admin' && req.user.id !== requirement.applicant_id) {
        return res.status(403).json({ message: '没有权限删除此需求单' });
      }

      await UserRequirementModel.delete(id);
      res.json({ message: '需求单删除成功' });
    } catch (error) {
      console.error('删除需求单失败:', error);
      res.status(500).json({ message: '删除需求单失败', error: error.message });
    }
  }
}

module.exports = UserRequirementController;
