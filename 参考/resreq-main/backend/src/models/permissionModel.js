const { promisePool } = require('../config/database');

class PermissionModel {
  // 创建权限申请
  static async create(data) {
    const sql = `
      INSERT INTO permission_requests
      (domain_account, name, phone, email, permissions, status, applicant_id, applicant_name, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      data.domain_account,
      data.name,
      data.phone,
      data.email || null,
      JSON.stringify(data.permissions),
      data.status || 'draft',
      data.applicant_id,
      data.applicant_name,
      data.submitted_at || null
    ];

    try {
      const [result] = await promisePool.query(sql, values);
      return result.insertId;
    } catch (error) {
      throw new Error('创建权限申请失败: ' + error.message);
    }
  }

  // 获取用户的权限申请列表
  static async getByUserId(userId, page = 1, pageSize = 10) {
    const offset = (page - 1) * pageSize;
    const sql = `
      SELECT id, domain_account, name, phone, email, permissions, status,
             applicant_id, applicant_name, submitted_at, created_at, updated_at
      FROM permission_requests
      WHERE applicant_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    try {
      const [rows] = await promisePool.query(sql, [userId, pageSize, offset]);

      // 解析JSON字段（MySQL JSON字段会自动解析为对象，无需JSON.parse）
      return rows.map(row => ({
        ...row,
        permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions
      }));
    } catch (error) {
      throw new Error('获取权限申请列表失败: ' + error.message);
    }
  }

  // 获取所有权限申请列表（管理员）
  static async getAll(page = 1, pageSize = 10) {
    const offset = (page - 1) * pageSize;
    const sql = `
      SELECT id, domain_account, name, phone, email, permissions, status,
             applicant_id, applicant_name, submitted_at, created_at, updated_at
      FROM permission_requests
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    try {
      const [rows] = await promisePool.query(sql, [pageSize, offset]);

      // 解析JSON字段（MySQL JSON字段会自动解析为对象，无需JSON.parse）
      return rows.map(row => ({
        ...row,
        permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions
      }));
    } catch (error) {
      throw new Error('获取所有权限申请失败: ' + error.message);
    }
  }

  // 获取单个权限申请详情
  static async getById(id) {
    const sql = `
      SELECT id, domain_account, name, phone, email, permissions, status,
             applicant_id, applicant_name, submitted_at, created_at, updated_at
      FROM permission_requests
      WHERE id = ?
    `;

    try {
      const [rows] = await promisePool.query(sql, [id]);
      if (rows.length === 0) {
        return null;
      }

      const row = rows[0];
      return {
        ...row,
        permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions
      };
    } catch (error) {
      throw new Error('获取权限申请详情失败: ' + error.message);
    }
  }

  // 更新权限申请
  static async update(id, data) {
    const fields = [];
    const values = [];

    if (data.domain_account !== undefined) {
      fields.push('domain_account = ?');
      values.push(data.domain_account);
    }
    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.phone !== undefined) {
      fields.push('phone = ?');
      values.push(data.phone);
    }
    if (data.email !== undefined) {
      fields.push('email = ?');
      values.push(data.email);
    }
    if (data.permissions !== undefined) {
      fields.push('permissions = ?');
      values.push(JSON.stringify(data.permissions));
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
      UPDATE permission_requests
      SET ${fields.join(', ')}
      WHERE id = ?
    `;

    try {
      const [result] = await promisePool.query(sql, values);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('更新权限申请失败: ' + error.message);
    }
  }

  // 删除权限申请
  static async delete(id) {
    const sql = 'DELETE FROM permission_requests WHERE id = ?';

    try {
      const [result] = await promisePool.query(sql, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('删除权限申请失败: ' + error.message);
    }
  }

  // 获取总数
  static async getCount(userId = null) {
    let sql = 'SELECT COUNT(*) as total FROM permission_requests';
    const params = [];

    if (userId) {
      sql += ' WHERE applicant_id = ?';
      params.push(userId);
    }

    try {
      const [rows] = await promisePool.query(sql, params);
      return rows[0].total;
    } catch (error) {
      throw new Error('获取权限申请总数失败: ' + error.message);
    }
  }
}

module.exports = PermissionModel;