const NetworkPolicyModel = require('../models/networkPolicyModel');

class NetworkPolicyController {
  // 创建网络策略申请
  static async createPolicy(req, res) {
    try {
      const { environment, source_asset_code, source_address, target_asset, target_address, system_name, port_type, port, status } = req.body;

      // 验证必填字段
      if (!environment || !source_asset_code || !source_address || !target_asset || !target_address || !system_name || !port_type || !port) {
        return res.status(400).json({
          message: '所有字段均为必填项'
        });
      }

      const policyData = {
        environment,
        source_asset_code,
        source_address,
        target_asset,
        target_address,
        system_name,
        port_type,
        port,
        status: status || 'submitted',
        applicant_id: req.user.id,
        applicant_name: req.user.real_name || req.user.username,
        submitted_at: new Date()
      };

      const id = await NetworkPolicyModel.create(policyData);

      const policy = await NetworkPolicyModel.getById(id);

      res.status(201).json({
        message: '网络策略申请创建成功',
        policy
      });
    } catch (error) {
      console.error('创建网络策略申请失败:', error);
      res.status(500).json({
        message: '创建网络策略申请失败',
        error: error.message
      });
    }
  }

  // 获取当前用户的网络策略申请列表
  static async getMyPolicies(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 10;

      const policies = await NetworkPolicyModel.getByUserId(req.user.id, page, pageSize);
      const total = await NetworkPolicyModel.getCount(req.user.id);

      res.json({
        policies,
        total,
        page,
        pageSize
      });
    } catch (error) {
      console.error('获取网络策略申请列表失败:', error);
      res.status(500).json({
        message: '获取网络策略申请列表失败',
        error: error.message
      });
    }
  }

  // 获取所有网络策略申请列表（管理员）
  static async getAllPolicies(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 10;

      const policies = await NetworkPolicyModel.getAll(page, pageSize);
      const total = await NetworkPolicyModel.getCount();

      res.json({
        policies,
        total,
        page,
        pageSize
      });
    } catch (error) {
      console.error('获取所有网络策略申请失败:', error);
      res.status(500).json({
        message: '获取所有网络策略申请失败',
        error: error.message
      });
    }
  }

  // 获取单个网络策略申请详情
  static async getPolicyById(req, res) {
    try {
      const { id } = req.params;
      const policy = await NetworkPolicyModel.getById(id);

      if (!policy) {
        return res.status(404).json({
          message: '网络策略申请不存在'
        });
      }

      // 验证权限：只有申请人和管理员可以查看
      if (policy.applicant_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          message: '无权查看此网络策略申请'
        });
      }

      res.json(policy);
    } catch (error) {
      console.error('获取网络策略申请详情失败:', error);
      res.status(500).json({
        message: '获取网络策略申请详情失败',
        error: error.message
      });
    }
  }

  // 更新网络策略申请
  static async updatePolicy(req, res) {
    try {
      const { id } = req.params;
      const { environment, source_asset_code, source_address, target_asset, target_address, system_name, port_type, port, status } = req.body;

      // 获取现有申请
      const existing = await NetworkPolicyModel.getById(id);
      if (!existing) {
        return res.status(404).json({
          message: '网络策略申请不存在'
        });
      }

      // 验证权限：只有申请人可以编辑
      if (existing.applicant_id !== req.user.id) {
        return res.status(403).json({
          message: '无权编辑此网络策略申请'
        });
      }

      const updateData = {};
      if (environment !== undefined) updateData.environment = environment;
      if (source_asset_code !== undefined) updateData.source_asset_code = source_asset_code;
      if (source_address !== undefined) updateData.source_address = source_address;
      if (target_asset !== undefined) updateData.target_asset = target_asset;
      if (target_address !== undefined) updateData.target_address = target_address;
      if (system_name !== undefined) updateData.system_name = system_name;
      if (port_type !== undefined) updateData.port_type = port_type;
      if (port !== undefined) updateData.port = port;
      if (status !== undefined) {
        updateData.status = status;
        updateData.submitted_at = status === 'submitted' ? new Date() : null;
      }

      await NetworkPolicyModel.update(id, updateData);

      const policy = await NetworkPolicyModel.getById(id);

      res.json({
        message: '网络策略申请更新成功',
        policy
      });
    } catch (error) {
      console.error('更新网络策略申请失败:', error);
      res.status(500).json({
        message: '更新网络策略申请失败',
        error: error.message
      });
    }
  }

  // 删除网络策略申请
  static async deletePolicy(req, res) {
    try {
      const { id } = req.params;

      // 获取现有申请
      const existing = await NetworkPolicyModel.getById(id);
      if (!existing) {
        return res.status(404).json({
          message: '网络策略申请不存在'
        });
      }

      // 验证权限：申请人和管理员可以删除
      if (existing.applicant_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          message: '无权删除此网络策略申请'
        });
      }

      await NetworkPolicyModel.delete(id);

      res.json({
        message: '网络策略申请删除成功'
      });
    } catch (error) {
      console.error('删除网络策略申请失败:', error);
      res.status(500).json({
        message: '删除网络策略申请失败',
        error: error.message
      });
    }
  }

  // 更新申请状态（管理员）
  static async updatePolicyStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['draft', 'submitted', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          message: '无效的状态值'
        });
      }

      await NetworkPolicyModel.update(id, { status });

      const policy = await NetworkPolicyModel.getById(id);

      res.json({
        message: '状态更新成功',
        policy
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

module.exports = NetworkPolicyController;
