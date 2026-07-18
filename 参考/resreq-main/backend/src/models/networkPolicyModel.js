const { promisePool } = require('../config/database');

class NetworkPolicyModel {
  // 创建网络策略申请
  static async create(data) {
    const sql = `
      INSERT INTO network_policies
      (environment, source_asset_code, source_address, target_asset, target_address,
       system_name, port_type, port, status, applicant_id, applicant_name, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      data.environment,
      data.source_asset_code,
      data.source_address,
      data.target_asset,
      data.target_address,
      data.system_name,
      data.port_type,
      data.port,
      data.status || 'draft',
      data.applicant_id,
      data.applicant_name,
      data.submitted_at || null
    ];

    try {
      const [result] = await promisePool.query(sql, values);
      return result.insertId;
    } catch (error) {
      throw new Error('创建网络策略申请失败: ' + error.message);
    }
  }

  // 获取用户的网络策略申请列表
  static async getByUserId(userId, page = 1, pageSize = 10) {
    const offset = (page - 1) * pageSize;
    const sql = `
      SELECT id, environment, source_asset_code, source_address, target_asset, target_address,
             system_name, port_type, port, status, applicant_id, applicant_name,
             submitted_at, created_at, updated_at
      FROM network_policies
      WHERE applicant_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    try {
      const [rows] = await promisePool.query(sql, [userId, pageSize, offset]);
      return rows;
    } catch (error) {
      throw new Error('获取网络策略申请列表失败: ' + error.message);
    }
  }

  // 获取所有网络策略申请列表（管理员）
  static async getAll(page = 1, pageSize = 10) {
    const offset = (page - 1) * pageSize;
    const sql = `
      SELECT id, environment, source_asset_code, source_address, target_asset, target_address,
             system_name, port_type, port, status, applicant_id, applicant_name,
             submitted_at, created_at, updated_at
      FROM network_policies
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    try {
      const [rows] = await promisePool.query(sql, [pageSize, offset]);
      return rows;
    } catch (error) {
      throw new Error('获取所有网络策略申请失败: ' + error.message);
    }
  }

  // 获取单个网络策略申请详情
  static async getById(id) {
    const sql = `
      SELECT id, environment, source_asset_code, source_address, target_asset, target_address,
             system_name, port_type, port, status, applicant_id, applicant_name,
             submitted_at, created_at, updated_at
      FROM network_policies
      WHERE id = ?
    `;

    try {
      const [rows] = await promisePool.query(sql, [id]);
      if (rows.length === 0) {
        return null;
      }
      return rows[0];
    } catch (error) {
      throw new Error('获取网络策略申请详情失败: ' + error.message);
    }
  }

  // 更新网络策略申请
  static async update(id, data) {
    const fields = [];
    const values = [];

    if (data.environment !== undefined) {
      fields.push('environment = ?');
      values.push(data.environment);
    }
    if (data.source_asset_code !== undefined) {
      fields.push('source_asset_code = ?');
      values.push(data.source_asset_code);
    }
    if (data.source_address !== undefined) {
      fields.push('source_address = ?');
      values.push(data.source_address);
    }
    if (data.target_asset !== undefined) {
      fields.push('target_asset = ?');
      values.push(data.target_asset);
    }
    if (data.target_address !== undefined) {
      fields.push('target_address = ?');
      values.push(data.target_address);
    }
    if (data.system_name !== undefined) {
      fields.push('system_name = ?');
      values.push(data.system_name);
    }
    if (data.port_type !== undefined) {
      fields.push('port_type = ?');
      values.push(data.port_type);
    }
    if (data.port !== undefined) {
      fields.push('port = ?');
      values.push(data.port);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }
    if (data.submitted_at !== undefined) {
      fields.push('submitted_at = ?');
      values.push(data.submitted_at);
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id);
    const sql = `
      UPDATE network_policies
      SET ${fields.join(', ')}
      WHERE id = ?
    `;

    try {
      const [result] = await promisePool.query(sql, values);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('更新网络策略申请失败: ' + error.message);
    }
  }

  // 删除网络策略申请
  static async delete(id) {
    const sql = 'DELETE FROM network_policies WHERE id = ?';

    try {
      const [result] = await promisePool.query(sql, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('删除网络策略申请失败: ' + error.message);
    }
  }

  // 获取总数
  static async getCount(userId = null) {
    let sql = 'SELECT COUNT(*) as total FROM network_policies';
    const params = [];

    if (userId) {
      sql += ' WHERE applicant_id = ?';
      params.push(userId);
    }

    try {
      const [rows] = await promisePool.query(sql, params);
      return rows[0].total;
    } catch (error) {
      throw new Error('获取网络策略申请总数失败: ' + error.message);
    }
  }
}

module.exports = NetworkPolicyModel;
