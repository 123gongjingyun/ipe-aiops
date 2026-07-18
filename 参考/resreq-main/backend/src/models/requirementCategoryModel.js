const { promisePool } = require('../config/database');

class RequirementCategoryModel {
  // 创建需求分类
  static async create(data) {
    const sql = `
      INSERT INTO requirement_categories
      (parent_id, name, description, reference, level, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      data.parent_id || null,
      data.name,
      data.description || null,
      data.reference || null,
      data.level,
      data.sort_order || 0,
      data.is_active !== undefined ? data.is_active : 1
    ];

    try {
      const [result] = await promisePool.query(sql, values);
      return result.insertId;
    } catch (error) {
      throw new Error('创建需求分类失败: ' + error.message);
    }
  }

  // 根据ID获取分类
  static async getById(id) {
    const sql = `
      SELECT id, parent_id, name, description, reference, level,
             sort_order, is_active, created_at, updated_at
      FROM requirement_categories
      WHERE id = ?
    `;

    try {
      const [rows] = await promisePool.query(sql, [id]);
      if (rows.length === 0) {
        return null;
      }
      return rows[0];
    } catch (error) {
      throw new Error('获取需求分类详情失败: ' + error.message);
    }
  }

  // 获取所有启用的分类
  static async getAll() {
    const sql = `
      SELECT id, parent_id, name, description, reference, level,
             sort_order, is_active, created_at, updated_at
      FROM requirement_categories
      WHERE is_active = 1
      ORDER BY sort_order, id
    `;

    try {
      const [rows] = await promisePool.query(sql);
      return rows;
    } catch (error) {
      throw new Error('获取需求分类列表失败: ' + error.message);
    }
  }

  // 根据父分类ID获取子分类
  static async getByParentId(parentId) {
    const sql = `
      SELECT id, parent_id, name, description, reference, level,
             sort_order, is_active, created_at, updated_at
      FROM requirement_categories
      WHERE parent_id = ? AND is_active = 1
      ORDER BY sort_order, id
    `;

    try {
      const [rows] = await promisePool.query(sql, [parentId]);
      return rows;
    } catch (error) {
      throw new Error('获取子分类列表失败: ' + error.message);
    }
  }

  // 获取分类树（仅启用的分类）
  static async getTree() {
    try {
      const rows = await this.getAll();
      return this.buildTree(rows);
    } catch (error) {
      throw new Error('获取需求分类树失败: ' + error.message);
    }
  }

  // 构建树形结构
  static buildTree(rows) {
    const nodeMap = new Map();
    const roots = [];

    rows.forEach(row => {
      nodeMap.set(row.id, { ...row, children: [] });
    });

    rows.forEach(row => {
      const node = nodeMap.get(row.id);
      if (row.parent_id && nodeMap.has(row.parent_id)) {
        nodeMap.get(row.parent_id).children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  // 更新需求分类
  static async update(id, data) {
    const fields = [];
    const values = [];

    if (data.parent_id !== undefined) {
      fields.push('parent_id = ?');
      values.push(data.parent_id);
    }
    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }
    if (data.reference !== undefined) {
      fields.push('reference = ?');
      values.push(data.reference);
    }
    if (data.level !== undefined) {
      fields.push('level = ?');
      values.push(data.level);
    }
    if (data.sort_order !== undefined) {
      fields.push('sort_order = ?');
      values.push(data.sort_order);
    }
    if (data.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(data.is_active);
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id);
    const sql = `
      UPDATE requirement_categories
      SET ${fields.join(', ')}
      WHERE id = ?
    `;

    try {
      const [result] = await promisePool.query(sql, values);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('更新需求分类失败: ' + error.message);
    }
  }

  // 检查分类是否有关联的答案
  static async hasAnswers(id) {
    const sql = 'SELECT COUNT(*) as total FROM requirement_answers WHERE category_id = ?';

    try {
      const [rows] = await promisePool.query(sql, [id]);
      return rows[0].total > 0;
    } catch (error) {
      throw new Error('检查分类答案失败: ' + error.message);
    }
  }
}

module.exports = RequirementCategoryModel;
