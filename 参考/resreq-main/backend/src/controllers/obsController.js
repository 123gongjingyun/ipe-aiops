const { promisePool } = require('../config/database');

// 应用所属业务的有效选项
const BUSINESS_NAME_OPTIONS = ['营销类', '管理类', '生产类', '研发类', '教育类', '其他'];

// 验证应用所属业务字段
const isValidBusinessName = (business_name) => {
  return BUSINESS_NAME_OPTIONS.includes(business_name);
};

// 创建OBS申请
const createObsRequest = async (req, res) => {
  try {
    const {
      environmentId,
      applicant,
      domain_account,
      supplier_name,
      system_name,
      application_owner,
      business_name,
      bucket_name,
      bucket_directory,
      capacity_size_gb,
      ak_sk_count,
      usage_duration,
      remarks
    } = req.body;

    // 验证必填字段
    if (!environmentId || !applicant || !supplier_name || !system_name ||
        !application_owner || !business_name || !bucket_name ||
        !capacity_size_gb || !ak_sk_count || !usage_duration) {
      return res.status(400).json({ message: '所有带*的字段为必填项' });
    }

    // 验证应用所属业务字段
    if (!isValidBusinessName(business_name)) {
      return res.status(400).json({
        message: '应用所属业务字段值无效',
        valid_options: BUSINESS_NAME_OPTIONS
      });
    }

    // 获取环境名称
    const [environments] = await promisePool.query(
      'SELECT name FROM environments WHERE id = ?',
      [environmentId]
    );

    if (environments.length === 0) {
      return res.status(404).json({ message: '环境不存在' });
    }

    const environmentName = environments[0].name;

    // 插入OBS申请记录
    const [result] = await promisePool.query(
      `INSERT INTO obs_requests
       (user_id, environment_id, applicant, domain_account, supplier_name, system_name,
        application_owner, business_name, bucket_name, bucket_directory, capacity_size_gb,
        ak_sk_count, usage_duration, remarks, status, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId,
        environmentId,
        applicant,
        domain_account || null,
        supplier_name,
        system_name,
        application_owner,
        business_name,
        bucket_name,
        bucket_directory || null,
        capacity_size_gb,
        ak_sk_count,
        usage_duration,
        remarks || null,
        'submitted',
        new Date()
      ]
    );

    res.status(201).json({
      message: 'OBS申请创建成功',
      requestId: result.insertId
    });
  } catch (error) {
    console.error('创建OBS申请失败:', error);
    res.status(500).json({ message: '创建OBS申请失败', error: error.message });
  }
};

// 获取当前用户的OBS申请列表
const getMyObsRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    // 搜索条件
    const { system_name, bucket_name, status } = req.query;
    let whereClause = 'WHERE o.user_id = ?';
    const params = [req.userId];

    if (system_name) {
      whereClause += ' AND o.system_name LIKE ?';
      params.push(`%${system_name}%`);
    }

    if (bucket_name) {
      whereClause += ' AND o.bucket_name LIKE ?';
      params.push(`%${bucket_name}%`);
    }

    if (status) {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }

    // 查询总数
    const [countResult] = await promisePool.query(
      `SELECT COUNT(*) as total FROM obs_requests o ${whereClause}`,
      params
    );

    // 查询数据
    const [requests] = await promisePool.query(
      `SELECT o.*,
        e.name as environment_name,
        u.username as applicant_username
       FROM obs_requests o
       LEFT JOIN environments e ON o.environment_id = e.id
       LEFT JOIN users u ON o.user_id = u.id
       ${whereClause}
       ORDER BY o.submitted_at DESC
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
    console.error('获取OBS申请列表失败:', error);
    res.status(500).json({ message: '获取OBS申请列表失败', error: error.message });
  }
};

// 获取所有OBS申请(仅管理员)
const getAllObsRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    // 搜索条件
    const { system_name, bucket_name, status, username } = req.query;
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (system_name) {
      whereClause += ' AND o.system_name LIKE ?';
      params.push(`%${system_name}%`);
    }

    if (bucket_name) {
      whereClause += ' AND o.bucket_name LIKE ?';
      params.push(`%${bucket_name}%`);
    }

    if (status) {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }

    if (username) {
      whereClause += ' AND u.username LIKE ?';
      params.push(`%${username}%`);
    }

    // 查询总数
    const [countResult] = await promisePool.query(
      `SELECT COUNT(*) as total
       FROM obs_requests o
       LEFT JOIN users u ON o.user_id = u.id
       ${whereClause}`,
      params
    );

    // 查询数据
    const [requests] = await promisePool.query(
      `SELECT o.*,
        e.name as environment_name,
        u.username as applicant_username
       FROM obs_requests o
       LEFT JOIN environments e ON o.environment_id = e.id
       LEFT JOIN users u ON o.user_id = u.id
       ${whereClause}
       ORDER BY o.submitted_at DESC
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
    console.error('获取所有OBS申请失败:', error);
    res.status(500).json({ message: '获取所有OBS申请失败', error: error.message });
  }
};

// 获取单个OBS申请详情
const getObsRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    const [requests] = await promisePool.query(
      `SELECT o.*,
        e.name as environment_name,
        u.username as applicant_username
       FROM obs_requests o
       LEFT JOIN environments e ON o.environment_id = e.id
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ message: 'OBS申请不存在' });
    }

    const request = requests[0];

    // 权限检查：非管理员只能查看自己的申请
    if (req.role !== 'admin' && req.userId !== request.user_id) {
      return res.status(403).json({ message: '没有权限查看此申请' });
    }

    res.json({ request });
  } catch (error) {
    console.error('获取OBS申请详情失败:', error);
    res.status(500).json({ message: '获取OBS申请详情失败', error: error.message });
  }
};

// 更新OBS申请
const updateObsRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      environmentId,
      applicant,
      domain_account,
      supplier_name,
      system_name,
      application_owner,
      business_name,
      bucket_name,
      bucket_directory,
      capacity_size_gb,
      ak_sk_count,
      usage_duration,
      remarks
    } = req.body;

    // 获取原申请信息
    const [requests] = await promisePool.query(
      'SELECT * FROM obs_requests WHERE id = ?',
      [id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ message: 'OBS申请不存在' });
    }

    const request = requests[0];

    // 权限检查：非管理员只能编辑自己的申请
    if (req.role !== 'admin' && req.userId !== request.user_id) {
      return res.status(403).json({ message: '没有权限编辑此申请' });
    }

    // 验证应用所属业务字段
    if (business_name && !isValidBusinessName(business_name)) {
      return res.status(400).json({
        message: '应用所属业务字段值无效',
        valid_options: BUSINESS_NAME_OPTIONS
      });
    }

    // 获取环境名称
    const [environments] = await promisePool.query(
      'SELECT name FROM environments WHERE id = ?',
      [environmentId]
    );

    if (environments.length === 0) {
      return res.status(404).json({ message: '环境不存在' });
    }

    // 更新申请信息
    await promisePool.query(
      `UPDATE obs_requests SET
       environment_id = ?, applicant = ?, domain_account = ?, supplier_name = ?,
       system_name = ?, application_owner = ?, business_name = ?, bucket_name = ?,
       bucket_directory = ?, capacity_size_gb = ?, ak_sk_count = ?, usage_duration = ?,
       remarks = ?
       WHERE id = ?`,
      [
        environmentId,
        applicant,
        domain_account || null,
        supplier_name,
        system_name,
        application_owner,
        business_name,
        bucket_name,
        bucket_directory || null,
        capacity_size_gb,
        ak_sk_count,
        usage_duration,
        remarks || null,
        id
      ]
    );

    res.json({ message: 'OBS申请更新成功' });
  } catch (error) {
    console.error('更新OBS申请失败:', error);
    res.status(500).json({ message: '更新OBS申请失败', error: error.message });
  }
};

// 删除OBS申请
const deleteObsRequest = async (req, res) => {
  try {
    const { id } = req.params;

    // 获取申请信息
    const [requests] = await promisePool.query(
      'SELECT * FROM obs_requests WHERE id = ?',
      [id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ message: 'OBS申请不存在' });
    }

    const request = requests[0];

    // 权限检查：用户只能删除自己的申请，管理员可以删除任何申请
    if (req.role !== 'admin' && req.userId !== request.user_id) {
      return res.status(403).json({ message: '没有权限删除其他用户的申请' });
    }

    // 删除申请
    await promisePool.query('DELETE FROM obs_requests WHERE id = ?', [id]);

    res.json({ message: 'OBS申请删除成功' });
  } catch (error) {
    console.error('删除OBS申请失败:', error);
    res.status(500).json({ message: '删除OBS申请失败', error: error.message });
  }
};

// 更新OBS申请状态(仅管理员)
const updateObsRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['draft', 'submitted', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: '无效的状态值' });
    }

    // 检查申请是否存在
    const [requests] = await promisePool.query(
      'SELECT * FROM obs_requests WHERE id = ?',
      [id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ message: 'OBS申请不存在' });
    }

    // 更新状态
    await promisePool.query(
      'UPDATE obs_requests SET status = ? WHERE id = ?',
      [status, id]
    );

    res.json({ message: 'OBS申请状态更新成功' });
  } catch (error) {
    console.error('更新OBS申请状态失败:', error);
    res.status(500).json({ message: '更新OBS申请状态失败', error: error.message });
  }
};

module.exports = {
  createObsRequest,
  getMyObsRequests,
  getAllObsRequests,
  getObsRequestById,
  updateObsRequest,
  deleteObsRequest,
  updateObsRequestStatus
};
