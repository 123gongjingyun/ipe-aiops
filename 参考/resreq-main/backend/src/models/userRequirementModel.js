const { promisePool } = require('../config/database');

class UserRequirementModel {
  // 创建用户需求单（含答案）
  static async create(data) {
    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        `INSERT INTO user_requirements (title, applicant_id, applicant_name, status)
         VALUES (?, ?, ?, ?)`,
        [
          data.title,
          data.applicant_id,
          data.applicant_name,
          data.status || 'submitted'
        ]
      );

      const requirementId = result.insertId;

      if (data.answers && data.answers.length > 0) {
        const placeholders = data.answers.map(() => '(?, ?, ?)').join(', ');
        const values = [];
        for (const answer of data.answers) {
          values.push(
            requirementId,
            answer.category_id,
            answer.answer_text || null
          );
        }

        await connection.query(
          `INSERT INTO requirement_answers (requirement_id, category_id, answer_text)
           VALUES ${placeholders}
           ON DUPLICATE KEY UPDATE answer_text = VALUES(answer_text)`,
          values
        );
      }

      await connection.commit();
      return requirementId;
    } catch (error) {
      await connection.rollback();
      throw new Error('创建需求单失败: ' + error.message);
    } finally {
      connection.release();
    }
  }

  // 根据ID获取需求单详情（含答案数组）
  static async getById(id) {
    try {
      const [requirements] = await promisePool.query(
        `SELECT id, title, applicant_id, applicant_name, status, created_at, updated_at
         FROM user_requirements
         WHERE id = ?`,
        [id]
      );

      if (requirements.length === 0) {
        return null;
      }

      const [answers] = await promisePool.query(
        `SELECT id, category_id, answer_text, created_at, updated_at
         FROM requirement_answers
         WHERE requirement_id = ?`,
        [id]
      );

      const requirement = requirements[0];
      requirement.answers = answers;
      return requirement;
    } catch (error) {
      throw new Error('获取需求单详情失败: ' + error.message);
    }
  }

  // 获取需求单列表
  static async getList({ userId, page = 1, pageSize = 10, search }) {
    try {
      let whereClause = 'WHERE 1=1';
      const params = [];

      if (userId !== undefined && userId !== null) {
        whereClause += ' AND applicant_id = ?';
        params.push(userId);
      }

      if (search) {
        whereClause += ' AND title LIKE ?';
        params.push(`%${search}%`);
      }

      const offset = (page - 1) * pageSize;

      const [countResult] = await promisePool.query(
        `SELECT COUNT(*) as total FROM user_requirements ${whereClause}`,
        params
      );

      const [rows] = await promisePool.query(
        `SELECT id, title, applicant_id, applicant_name, status, created_at, updated_at
         FROM user_requirements
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );

      return {
        list: rows,
        pagination: {
          page,
          pageSize,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / pageSize)
        }
      };
    } catch (error) {
      throw new Error('获取需求单列表失败: ' + error.message);
    }
  }

  // 更新需求单（标题 + 答案upsert）
  static async update(id, data) {
    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();

      if (data.title !== undefined) {
        await connection.query(
          `UPDATE user_requirements SET title = ? WHERE id = ?`,
          [data.title, id]
        );
      }

      if (data.answers && data.answers.length > 0) {
        const placeholders = data.answers.map(() => '(?, ?, ?)').join(', ');
        const values = [];
        for (const answer of data.answers) {
          values.push(
            id,
            answer.category_id,
            answer.answer_text || null
          );
        }

        await connection.query(
          `INSERT INTO requirement_answers (requirement_id, category_id, answer_text)
           VALUES ${placeholders}
           ON DUPLICATE KEY UPDATE answer_text = VALUES(answer_text)`,
          values
        );
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw new Error('更新需求单失败: ' + error.message);
    } finally {
      connection.release();
    }
  }

  // 删除需求单
  static async delete(id) {
    try {
      const [result] = await promisePool.query(
        `DELETE FROM user_requirements WHERE id = ?`,
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('删除需求单失败: ' + error.message);
    }
  }
}

module.exports = UserRequirementModel;
