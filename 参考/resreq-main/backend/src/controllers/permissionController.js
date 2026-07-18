const PermissionModel = require('../models/permissionModel');

class PermissionController {
  // 创建权限申请
  static async createRequest(req, res) {
    try {
      const { domain_account, name, phone, email, permissions, status } = req.body;

      // 验证必填字段
      if (!domain_account || !name || !phone) {
        return res.status(400).json({
          message: '域账号、姓名、手机号码为必填项'
        });
      }

      // 验证手机号格式
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          message: '手机号码格式不正确'
        });
      }

      // 验证邮箱格式（如果提供）
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({
            message: '邮箱格式不正确'
          });
        }
      }

      // 验证权限选择
      if (!permissions || typeof permissions !== 'object') {
        return res.status(400).json({
          message: '权限选择不能为空'
        });
      }

      const permissionTypes = ['pam', 'container', 'pipeline', 'log', 'borui', 'iam', 'gitlab', 'vpn_gitlab'];
      const hasValidPermission = permissionTypes.some(type => permissions[type] === true);

      if (!hasValidPermission) {
        return res.status(400).json({
          message: '请至少选择一种权限类型'
        });
      }

      const requestData = {
        domain_account,
        name,
        phone,
        email,
        permissions,
        status: status || 'draft',
        applicant_id: req.user.id,
        applicant_name: req.user.username,
        submitted_at: status === 'submitted' ? new Date() : null
      };

      const id = await PermissionModel.create(requestData);

      const request = await PermissionModel.getById(id);

      res.status(201).json({
        message: '权限申请创建成功',
        request
      });
    } catch (error) {
      console.error('创建权限申请失败:', error);
      res.status(500).json({
        message: '创建权限申请失败',
        error: error.message
      });
    }
  }

  // 获取当前用户的权限申请列表
  static async getMyRequests(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 10;

      const requests = await PermissionModel.getByUserId(req.user.id, page, pageSize);
      const total = await PermissionModel.getCount(req.user.id);

      res.json({
        requests,
        total,
        page,
        pageSize
      });
    } catch (error) {
      console.error('获取权限申请列表失败:', error);
      res.status(500).json({
        message: '获取权限申请列表失败',
        error: error.message
      });
    }
  }

  // 获取所有权限申请列表（管理员）
  static async getAllRequests(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 10;

      const requests = await PermissionModel.getAll(page, pageSize);
      const total = await PermissionModel.getCount();

      res.json({
        requests,
        total,
        page,
        pageSize
      });
    } catch (error) {
      console.error('获取所有权限申请失败:', error);
      res.status(500).json({
        message: '获取所有权限申请失败',
        error: error.message
      });
    }
  }

  // 获取单个权限申请详情
  static async getRequestById(req, res) {
    try {
      const { id } = req.params;
      const request = await PermissionModel.getById(id);

      if (!request) {
        return res.status(404).json({
          message: '权限申请不存在'
        });
      }

      // 验证权限：只有申请人和管理员可以查看
      if (request.applicant_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          message: '无权查看此权限申请'
        });
      }

      res.json(request);
    } catch (error) {
      console.error('获取权限申请详情失败:', error);
      res.status(500).json({
        message: '获取权限申请详情失败',
        error: error.message
      });
    }
  }

  // 更新权限申请
  static async updateRequest(req, res) {
    try {
      const { id } = req.params;
      const { domain_account, name, phone, email, permissions, status } = req.body;

      // 获取现有申请
      const existing = await PermissionModel.getById(id);
      if (!existing) {
        return res.status(404).json({
          message: '权限申请不存在'
        });
      }

      // 验证权限：只有申请人可以编辑
      if (existing.applicant_id !== req.user.id) {
        return res.status(403).json({
          message: '无权编辑此权限申请'
        });
      }

      // 验证手机号格式（如果提供）
      if (phone) {
        const phoneRegex = /^1[3-9]\d{9}$/;
        if (!phoneRegex.test(phone)) {
          return res.status(400).json({
            message: '手机号码格式不正确'
          });
        }
      }

      // 验证邮箱格式（如果提供）
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({
            message: '邮箱格式不正确'
          });
        }
      }

      // 验证权限选择（如果提供）
      if (permissions) {
        const permissionTypes = ['pam', 'container', 'pipeline', 'log', 'borui', 'iam', 'gitlab', 'vpn_gitlab'];
        const hasValidPermission = permissionTypes.some(type => permissions[type] === true);

        if (!hasValidPermission) {
          return res.status(400).json({
            message: '请至少选择一种权限类型'
          });
        }
      }

      const updateData = {};
      if (domain_account !== undefined) updateData.domain_account = domain_account;
      if (name !== undefined) updateData.name = name;
      if (phone !== undefined) updateData.phone = phone;
      if (email !== undefined) updateData.email = email;
      if (permissions !== undefined) updateData.permissions = permissions;
      if (status !== undefined) {
        updateData.status = status;
        updateData.submitted_at = status === 'submitted' ? new Date() : null;
      }

      await PermissionModel.update(id, updateData);

      const request = await PermissionModel.getById(id);

      res.json({
        message: '权限申请更新成功',
        request
      });
    } catch (error) {
      console.error('更新权限申请失败:', error);
      res.status(500).json({
        message: '更新权限申请失败',
        error: error.message
      });
    }
  }

  // 删除权限申请
  static async deleteRequest(req, res) {
    try {
      const { id } = req.params;

      // 获取现有申请
      const existing = await PermissionModel.getById(id);
      if (!existing) {
        return res.status(404).json({
          message: '权限申请不存在'
        });
      }

      // 验证权限：只有申请人可以删除
      if (existing.applicant_id !== req.user.id) {
        return res.status(403).json({
          message: '无权删除此权限申请'
        });
      }

      await PermissionModel.delete(id);

      res.json({
        message: '权限申请删除成功'
      });
    } catch (error) {
      console.error('删除权限申请失败:', error);
      res.status(500).json({
        message: '删除权限申请失败',
        error: error.message
      });
    }
  }

  // 更新申请状态（管理员）
  static async updateRequestStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['draft', 'submitted', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          message: '无效的状态值'
        });
      }

      await PermissionModel.update(id, { status });

      const request = await PermissionModel.getById(id);

      res.json({
        message: '状态更新成功',
        request
      });
    } catch (error) {
      console.error('更新状态失败:', error);
      res.status(500).json({
        message: '更新状态失败',
        error: error.message
      });
    }
  }
}

module.exports = PermissionController;