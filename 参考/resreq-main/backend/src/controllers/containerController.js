const { promisePool } = require('../config/database');

// 创建容器申请
const createContainerRequest = async (req, res) => {
  try {
    const {
      environmentId,
      applicant,
      system_code,
      supplier,
      app_english_name,
      app_description,
      remarks,
      instance_count,
      cpu_per_instance,
      memory_per_instance_gb,
      total_cpu,
      total_memory_gb,
      status = 'submitted'
    } = req.body;

    const userId = req.user.id;

    // 验证必填字段
    if (!environmentId || !applicant || !system_code || !supplier || !app_english_name ||
        !app_description || !instance_count || !cpu_per_instance || !memory_per_instance_gb) {
      return res.status(400).json({ message: '请填写所有必填字段' });
    }

    const sql = `
      INSERT INTO container_requests (
        user_id, environment_id, applicant, system_code, supplier, app_english_name,
        app_description, remarks, instance_count, cpu_per_instance,
        memory_per_instance_gb, total_cpu, total_memory_gb, status, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      userId, environmentId, applicant, system_code, supplier, app_english_name,
      app_description, remarks || null, instance_count, cpu_per_instance,
      memory_per_instance_gb, total_cpu || null, total_memory_gb || null, status || 'submitted', new Date()
    ];

    const [result] = await promisePool.query(sql, values);

    res.status(201).json({
      message: '容器申请创建成功',
      id: result.insertId
    });
  } catch (error) {
    console.error('创建容器申请失败:', error);
    res.status(500).json({ message: '创建容器申请失败' });
  }
};

// 获取当前用户的容器申请列表
const getMyContainerRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, pageSize = 10, system_code, supplier, status } = req.query;
    const offset = (page - 1) * pageSize;

    let whereConditions = 'WHERE cr.user_id = ?';
    const params = [userId];

    if (system_code) {
      whereConditions += ' AND cr.system_code LIKE ?';
      params.push(`%${system_code}%`);
    }

    if (supplier) {
      whereConditions += ' AND cr.supplier LIKE ?';
      params.push(`%${supplier}%`);
    }

    if (status) {
      whereConditions += ' AND cr.status = ?';
      params.push(status);
    }

    const countSql = `SELECT COUNT(*) as total FROM container_requests cr ${whereConditions}`;
    const [countResult] = await promisePool.query(countSql, params);

    const sql = `
      SELECT
        cr.*,
        u.username,
        u.real_name,
        e.name as environment_name
      FROM container_requests cr
      LEFT JOIN users u ON cr.user_id = u.id
      LEFT JOIN environments e ON cr.environment_id = e.id
      ${whereConditions}
      ORDER BY cr.submitted_at DESC
      LIMIT ? OFFSET ?
    `;

    const [requests] = await promisePool.query(sql, [...params, parseInt(pageSize), parseInt(offset)]);

    res.json({
      requests,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('获取容器申请列表失败:', error);
    res.status(500).json({ message: '获取容器申请列表失败' });
  }
};

// 获取所有容器申请（管理员）
const getAllContainerRequests = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, system_code, supplier, status } = req.query;
    const offset = (page - 1) * pageSize;

    let whereConditions = 'WHERE 1=1';
    const params = [];

    if (system_code) {
      whereConditions += ' AND cr.system_code LIKE ?';
      params.push(`%${system_code}%`);
    }

    if (supplier) {
      whereConditions += ' AND cr.supplier LIKE ?';
      params.push(`%${supplier}%`);
    }

    if (status) {
      whereConditions += ' AND cr.status = ?';
      params.push(status);
    }

    const countSql = `SELECT COUNT(*) as total FROM container_requests cr ${whereConditions}`;
    const [countResult] = await promisePool.query(countSql, params);

    const sql = `
      SELECT
        cr.*,
        u.username,
        u.real_name,
        e.name as environment_name
      FROM container_requests cr
      LEFT JOIN users u ON cr.user_id = u.id
      LEFT JOIN environments e ON cr.environment_id = e.id
      ${whereConditions}
      ORDER BY cr.submitted_at DESC
      LIMIT ? OFFSET ?
    `;

    const [requests] = await promisePool.query(sql, [...params, parseInt(pageSize), parseInt(offset)]);

    res.json({
      requests,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('获取所有容器申请失败:', error);
    res.status(500).json({ message: '获取所有容器申请失败' });
  }
};

// 获取单个容器申请详情
const getContainerRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const sql = `
      SELECT
        cr.*,
        u.username,
        u.real_name,
        e.name as environment_name
      FROM container_requests cr
      LEFT JOIN users u ON cr.user_id = u.id
      LEFT JOIN environments e ON cr.environment_id = e.id
      WHERE cr.id = ?
    `;

    const [requests] = await promisePool.query(sql, [id]);

    if (requests.length === 0) {
      return res.status(404).json({ message: '容器申请不存在' });
    }

    const request = requests[0];

    // 权限检查：只能查看自己的申请或管理员可查看所有
    if (!isAdmin && request.user_id !== userId) {
      return res.status(403).json({ message: '无权查看此申请' });
    }

    res.json(request);
  } catch (error) {
    console.error('获取容器申请详情失败:', error);
    res.status(500).json({ message: '获取容器申请详情失败' });
  }
};

// 更新容器申请
const updateContainerRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // 首先检查申请是否存在以及权限
    const [existingRequests] = await promisePool.query(
      'SELECT * FROM container_requests WHERE id = ?',
      [id]
    );

    if (existingRequests.length === 0) {
      return res.status(404).json({ message: '容器申请不存在' });
    }

    const existingRequest = existingRequests[0];

    // 权限检查：只能更新自己的申请或管理员可更新所有
    if (!isAdmin && existingRequest.user_id !== userId) {
      return res.status(403).json({ message: '无权更新此申请' });
    }

    const {
      environmentId,
      applicant,
      system_code,
      supplier,
      app_english_name,
      app_description,
      remarks,
      instance_count,
      cpu_per_instance,
      memory_per_instance_gb,
      total_cpu,
      total_memory_gb,
      status
    } = req.body;

    const values = [
      environmentId, applicant, system_code, supplier, app_english_name,
      app_description, remarks || null, instance_count, cpu_per_instance,
      memory_per_instance_gb, total_cpu || null, total_memory_gb || null
    ];

    // 如果提供了状态，则更新状态
    if (status) {
      values.push(status);
    }

    values.push(id);

    const sql = `
      UPDATE container_requests
      SET environment_id = ?, applicant = ?, system_code = ?, supplier = ?, app_english_name = ?,
          app_description = ?, remarks = ?, instance_count = ?, cpu_per_instance = ?,
          memory_per_instance_gb = ?, total_cpu = ?, total_memory_gb = ?
          ${status ? ', status = ?' : ''}
      WHERE id = ?
    `;

    await promisePool.query(sql, values);

    res.json({ message: '容器申请更新成功' });
  } catch (error) {
    console.error('更新容器申请失败:', error);
    res.status(500).json({ message: '更新容器申请失败' });
  }
};

// 删除容器申请
const deleteContainerRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // 首先检查申请是否存在以及权限
    const [existingRequests] = await promisePool.query(
      'SELECT * FROM container_requests WHERE id = ?',
      [id]
    );

    if (existingRequests.length === 0) {
      return res.status(404).json({ message: '容器申请不存在' });
    }

    const existingRequest = existingRequests[0];

    // 权限检查：只能删除自己的申请或管理员可删除所有
    if (!isAdmin && existingRequest.user_id !== userId) {
      return res.status(403).json({ message: '无权删除此申请' });
    }

    await promisePool.query('DELETE FROM container_requests WHERE id = ?', [id]);

    res.json({ message: '容器申请删除成功' });
  } catch (error) {
    console.error('删除容器申请失败:', error);
    res.status(500).json({ message: '删除容器申请失败' });
  }
};

// 更新容器申请状态（管理员）
const updateContainerRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['draft', 'submitted', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: '无效的状态值' });
    }

    const [result] = await promisePool.query(
      'UPDATE container_requests SET status = ? WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '容器申请不存在' });
    }

    res.json({ message: '容器申请状态更新成功' });
  } catch (error) {
    console.error('更新容器申请状态失败:', error);
    res.status(500).json({ message: '更新容器申请状态失败' });
  }
};

module.exports = {
  createContainerRequest,
  getMyContainerRequests,
  getAllContainerRequests,
  getContainerRequestById,
  updateContainerRequest,
  deleteContainerRequest,
  updateContainerRequestStatus
};
