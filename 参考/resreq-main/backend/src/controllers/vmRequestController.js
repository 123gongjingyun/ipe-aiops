/**
 * 虚拟机申请控制器
 */

const { promisePool } = require('../config/database');

class VMRequestController {
  // 公共错误处理方法
  static handleError(error, res, message) {
    console.error(`${message}:`, error);
    res.status(500).json({ message, error: error.message });
  }

  // 公共分页参数处理
  static getPaginationParams(req) {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    return { page, pageSize, offset };
  }

  // 公共查询构建器
  static buildQuery(baseQuery, searchConditions) {
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (searchConditions.systemName) {
      whereClause += ' AND vr.system_name LIKE ?';
      params.push(`%${searchConditions.systemName}%`);
    }

    if (searchConditions.status) {
      whereClause += ' AND vr.status = ?';
      params.push(searchConditions.status);
    }

    if (searchConditions.username) {
      whereClause += ' AND u.username LIKE ?';
      params.push(`%${searchConditions.username}%`);
    }

    return { whereClause, params };
  }

  /**
   * 获取当前用户的虚拟机申请列表
   */
  static async getMyVMRequests(req, res) {
    try {
      const userId = req.user.id;
      const { page, pageSize, offset } = VMRequestController.getPaginationParams(req);
      const { systemName, status } = req.query;

      // 构建查询条件
      let whereClause = 'WHERE vr.applicant_id = ?';
      const params = [userId];

      if (systemName) {
        whereClause += ' AND vr.system_name LIKE ?';
        params.push(`%${systemName}%`);
      }

      if (status) {
        whereClause += ' AND vr.status = ?';
        params.push(status);
      }

      // 查询总数和数据
      const [countResult] = await promisePool.query(
        `SELECT COUNT(*) as total FROM vm_requests vr ${whereClause}`,
        params
      );

      const [requests] = await promisePool.query(
        `SELECT vr.*,
          u.username as applicant_name,
          u.real_name as applicant_real_name,
          e.name as environment_name
         FROM vm_requests vr
         LEFT JOIN users u ON vr.applicant_id = u.id
         LEFT JOIN environments e ON vr.environment_id = e.id
         ${whereClause}
         ORDER BY vr.submitted_at DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );

      res.json({
        requests,
        pagination: {
          page,
          pageSize,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / pageSize)
        }
      });
    } catch (error) {
      VMRequestController.handleError(error, res, '获取虚拟机申请列表失败');
    }
  }

  /**
   * 获取所有虚拟机申请列表（管理员）
   */
  static async getAllVMRequests(req, res) {
    try {
      const { page, pageSize, offset } = VMRequestController.getPaginationParams(req);
      const { systemName, status, username } = req.query;

      // 构建查询条件
      const { whereClause, params } = VMRequestController.buildQuery('', {
        systemName,
        status,
        username
      });

      // 查询总数和数据
      const [countResult] = await promisePool.query(
        `SELECT COUNT(*) as total
         FROM vm_requests vr
         LEFT JOIN users u ON vr.applicant_id = u.id
         ${whereClause}`,
        params
      );

      const [requests] = await promisePool.query(
        `SELECT vr.*,
          u.username as applicant_name,
          u.real_name as applicant_real_name,
          e.name as environment_name
         FROM vm_requests vr
         LEFT JOIN users u ON vr.applicant_id = u.id
         LEFT JOIN environments e ON vr.environment_id = e.id
         ${whereClause}
         ORDER BY vr.submitted_at DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );

      res.json({
        requests,
        pagination: {
          page,
          pageSize,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / pageSize)
        }
      });
    } catch (error) {
      VMRequestController.handleError(error, res, '获取所有虚拟机申请失败');
    }
  }

  /**
   * 获取单个虚拟机申请详情
   */
  static async getVMRequestById(req, res) {
    try {
      const { id } = req.params;

      const [requests] = await promisePool.query(
        `SELECT vr.*,
          u.username as applicant_name,
          u.real_name as applicant_real_name,
          e.name as environment_name
         FROM vm_requests vr
         LEFT JOIN users u ON vr.applicant_id = u.id
         LEFT JOIN environments e ON vr.environment_id = e.id
         WHERE vr.id = ?`,
        [id]
      );

      if (requests.length === 0) {
        return res.status(404).json({ message: '虚拟机申请不存在' });
      }

      const request = requests[0];

      // 权限检查
      if (!VMRequestController.checkPermission(req, request.applicant_id)) {
        return res.status(403).json({ message: '没有权限查看此申请' });
      }

      res.json({ request });
    } catch (error) {
      VMRequestController.handleError(error, res, '获取虚拟机申请详情失败');
    }
  }

  /**
   * 创建虚拟机申请
   */
  static async createVMRequest(req, res) {
    try {
      const {
        systemCode,
        systemName,
        moduleName,
        owner,
        type,
        environment,
        configOption,
        nodeCount,
        cpu,
        memory,
        diskType,
        systemDisk,
        dataDisk,
        status
      } = req.body;

      // 验证必填字段
      const requiredFields = { systemCode, systemName, moduleName, owner, type, environment, configOption };
      if (!VMRequestController.validateRequiredFields(requiredFields)) {
        return res.status(400).json({ message: '所有字段为必填项' });
      }

      // 获取环境ID
      const environmentId = await VMRequestController.getEnvironmentId(environment);

      // 插入申请记录
      const [result] = await promisePool.query(
        `INSERT INTO vm_requests
         (system_code, system_name, module_name, owner, type, environment, config_option,
          node_count, cpu, memory, disk_type, system_disk, data_disk, status,
          applicant_id, applicant_name, environment_id, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          systemCode,
          systemName,
          moduleName,
          owner,
          type,
          environment,
          configOption,
          nodeCount || 1,
          cpu || 0,
          memory || 0,
          diskType || '高IO',
          systemDisk || 0,
          dataDisk || 0,
          status || 'submitted',
          req.user.id,
          req.user.real_name || req.user.username,
          environmentId,
          new Date()
        ]
      );

      res.status(201).json({
        message: '虚拟机申请创建成功',
        requestId: result.insertId
      });
    } catch (error) {
      VMRequestController.handleError(error, res, '创建虚拟机申请失败');
    }
  }

  /**
   * 更新虚拟机申请
   */
  static async updateVMRequest(req, res) {
    try {
      const { id } = req.params;
      const {
        systemCode,
        systemName,
        moduleName,
        owner,
        type,
        environment,
        configOption,
        nodeCount,
        cpu,
        memory,
        diskType,
        systemDisk,
        dataDisk,
        status
      } = req.body;

      // 检查申请存在性和权限
      const request = await VMRequestController.getAndValidateRequest(id, req);
      if (!request) {
        return res.status(404).json({ message: '虚拟机申请不存在' });
      }

      // 获取环境ID
      const environmentId = await VMRequestController.getEnvironmentId(environment);

      // 更新申请记录
      await promisePool.query(
        `UPDATE vm_requests SET
         system_code = ?, system_name = ?, module_name = ?, owner = ?,
         type = ?, environment = ?, config_option = ?,
         node_count = ?, cpu = ?, memory = ?, disk_type = ?,
         system_disk = ?, data_disk = ?, status = ?, environment_id = ?
         WHERE id = ?`,
        [
          systemCode,
          systemName,
          moduleName,
          owner,
          type,
          environment,
          configOption,
          nodeCount || 1,
          cpu || 0,
          memory || 0,
          diskType || '高IO',
          systemDisk || 0,
          dataDisk || 0,
          status,
          environmentId,
          id
        ]
      );

      res.json({ message: '虚拟机申请更新成功' });
    } catch (error) {
      VMRequestController.handleError(error, res, '更新虚拟机申请失败');
    }
  }

  /**
   * 删除虚拟机申请
   */
  static async deleteVMRequest(req, res) {
    try {
      const { id } = req.params;

      // 检查申请存在性和权限
      const request = await VMRequestController.getAndValidateRequest(id, req);
      if (!request) {
        return res.status(404).json({ message: '虚拟机申请不存在' });
      }

      // 验证删除权限（普通用户只能删除自己的申请）
      if (!VMRequestController.checkDeletePermission(req, request)) {
        return res.status(403).json({ message: '无权删除此申请' });
      }

      // 删除申请
      await promisePool.query('DELETE FROM vm_requests WHERE id = ?', [id]);

      res.json({ message: '虚拟机申请删除成功' });
    } catch (error) {
      VMRequestController.handleError(error, res, '删除虚拟机申请失败');
    }
  }

  // 辅助方法：检查权限
  static checkPermission(req, applicantId) {
    return req.user.role === 'admin' || req.user.id === applicantId;
  }

  // 辅助方法：验证必填字段
  static validateRequiredFields(fields) {
    return Object.values(fields).every(field => field && field.trim() !== '');
  }

  // 辅助方法：获取环境ID
  static async getEnvironmentId(environmentName) {
    const [envs] = await promisePool.query('SELECT id FROM environments WHERE name = ?', [environmentName]);
    return envs.length > 0 ? envs[0].id : null;
  }

  // 辅助方法：获取并验证申请
  static async getAndValidateRequest(id, req) {
    const [requests] = await promisePool.query(
      'SELECT applicant_id, status FROM vm_requests WHERE id = ?',
      [id]
    );

    if (requests.length === 0) {
      return null;
    }

    const request = requests[0];

    // 权限检查
    if (!VMRequestController.checkPermission(req, request.applicant_id)) {
      throw new Error('没有权限操作此申请');
    }

    return request;
  }

  // 辅助方法：检查删除权限
  static checkDeletePermission(req, request) {
    // 管理员可以删除任何申请
    if (req.user.role === 'admin') {
      return true;
    }

    // 普通用户可以删除自己的任何申请
    return req.user.id === request.applicant_id;
  }
}

module.exports = VMRequestController;