const { promisePool } = require('../config/database');
const excelExporter = require('../utils/excelExporter');

// 创建资源申请
const createRequest = async (req, res) => {
  try {
    const {
      systemCode,
      systemName,
      moduleName,
      owner,
      configTypeId,
      environmentId,
      configOptionId
    } = req.body;

    // 验证必填字段
    if (!systemCode || !systemName || !moduleName || !owner || !configTypeId || !environmentId || !configOptionId) {
      return res.status(400).json({ message: '所有字段为必填项' });
    }

    // 获取配置选项详情
    const [configOptions] = await promisePool.query(
      'SELECT * FROM config_options WHERE id = ?',
      [configOptionId]
    );

    if (configOptions.length === 0) {
      return res.status(404).json({ message: '配置选项不存在' });
    }

    const configOption = configOptions[0];

    // 获取类型名称和环境名称
    const [types] = await promisePool.query('SELECT name FROM config_types WHERE id = ?', [configTypeId]);
    const [environments] = await promisePool.query('SELECT name FROM environments WHERE id = ?', [environmentId]);

    const typeName = types[0]?.name || '';
    const environmentName = environments[0]?.name || '';

    // 插入申请记录
    const [result] = await promisePool.query(
      `INSERT INTO resource_requests
       (user_id, system_code, system_name, module_name, owner, type, environment, config_option,
        node_count, cpu, memory, disk_type, system_disk, data_disk, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId,
        systemCode,
        systemName,
        moduleName,
        owner,
        typeName,
        environmentName,
        configOption.name,
        configOption.node_count,
        configOption.cpu,
        configOption.memory,
        configOption.disk_type,
        configOption.system_disk,
        configOption.data_disk,
        'submitted'
      ]
    );

    res.status(201).json({
      message: '资源申请创建成功',
      requestId: result.insertId
    });
  } catch (error) {
    console.error('创建资源申请失败:', error);
    res.status(500).json({ message: '创建资源申请失败', error: error.message });
  }
};

// 获取当前用户的申请列表
const getMyRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    // 搜索条件
    const { systemCode, systemName, status } = req.query;
    let whereClause = 'WHERE r.user_id = ?';
    const params = [req.userId];

    if (systemCode) {
      whereClause += ' AND r.system_code LIKE ?';
      params.push(`%${systemCode}%`);
    }

    if (systemName) {
      whereClause += ' AND r.system_name LIKE ?';
      params.push(`%${systemName}%`);
    }

    if (status) {
      whereClause += ' AND r.status = ?';
      params.push(status);
    }

    // 查询总数
    const [countResult] = await promisePool.query(
      `SELECT COUNT(*) as total FROM resource_requests r ${whereClause}`,
      params
    );

    // 查询数据
    const [requests] = await promisePool.query(
      `SELECT r.*,
        u.username as applicant_name
       FROM resource_requests r
       LEFT JOIN users u ON r.user_id = u.id
       ${whereClause}
       ORDER BY r.submitted_at DESC
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
    console.error('获取申请列表失败:', error);
    res.status(500).json({ message: '获取申请列表失败', error: error.message });
  }
};

// 获取所有申请(仅管理员)
const getAllRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    // 搜索条件
    const { systemCode, systemName, status, username } = req.query;
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (systemCode) {
      whereClause += ' AND r.system_code LIKE ?';
      params.push(`%${systemCode}%`);
    }

    if (systemName) {
      whereClause += ' AND r.system_name LIKE ?';
      params.push(`%${systemName}%`);
    }

    if (status) {
      whereClause += ' AND r.status = ?';
      params.push(status);
    }

    if (username) {
      whereClause += ' AND u.username LIKE ?';
      params.push(`%${username}%`);
    }

    // 查询总数
    const [countResult] = await promisePool.query(
      `SELECT COUNT(*) as total
       FROM resource_requests r
       LEFT JOIN users u ON r.user_id = u.id
       ${whereClause}`,
      params
    );

    // 查询数据
    const [requests] = await promisePool.query(
      `SELECT r.*,
        u.username as applicant_name
       FROM resource_requests r
       LEFT JOIN users u ON r.user_id = u.id
       ${whereClause}
       ORDER BY r.submitted_at DESC
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
    console.error('获取所有申请失败:', error);
    res.status(500).json({ message: '获取所有申请失败', error: error.message });
  }
};

// 获取单个申请详情
const getRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    const [requests] = await promisePool.query(
      `SELECT r.*,
        u.username as applicant_name
       FROM resource_requests r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.id = ?`,
      [id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ message: '申请不存在' });
    }

    const request = requests[0];

    // 非管理员只能查看自己的申请
    if (req.role !== 'admin' && req.userId !== request.user_id) {
      return res.status(403).json({ message: '没有权限查看此申请' });
    }

    res.json({ request });
  } catch (error) {
    console.error('获取申请详情失败:', error);
    res.status(500).json({ message: '获取申请详情失败', error: error.message });
  }
};

// 更新申请状态(仅管理员)
const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['draft', 'submitted', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: '无效的状态值' });
    }

    // 检查申请是否存在
    const [requests] = await promisePool.query(
      'SELECT id FROM resource_requests WHERE id = ?',
      [id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ message: '申请不存在' });
    }

    // 更新状态
    await promisePool.query(
      'UPDATE resource_requests SET status = ? WHERE id = ?',
      [status, id]
    );

    res.json({ message: '申请状态更新成功' });
  } catch (error) {
    console.error('更新申请状态失败:', error);
    res.status(500).json({ message: '更新申请状态失败', error: error.message });
  }
};

// 更新申请内容
const updateRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      systemCode,
      systemName,
      moduleName,
      owner,
      configTypeId,
      environmentId,
      configOptionId
    } = req.body;

    // 验证必填字段
    if (!systemCode || !systemName || !moduleName || !owner || !configTypeId || !environmentId || !configOptionId) {
      return res.status(400).json({ message: '所有字段为必填项' });
    }

    // 检查申请是否存在
    const [requests] = await promisePool.query(
      'SELECT user_id FROM resource_requests WHERE id = ?',
      [id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ message: '申请不存在' });
    }

    const request = requests[0];

    // 非管理员只能编辑自己的申请
    if (req.role !== 'admin' && req.userId !== request.user_id) {
      return res.status(403).json({ message: '没有权限编辑此申请' });
    }

    // 获取配置选项详情
    const [configOptions] = await promisePool.query(
      'SELECT * FROM config_options WHERE id = ?',
      [configOptionId]
    );

    if (configOptions.length === 0) {
      return res.status(404).json({ message: '配置选项不存在' });
    }

    const configOption = configOptions[0];

    // 获取类型名称和环境名称
    const [types] = await promisePool.query('SELECT name FROM config_types WHERE id = ?', [configTypeId]);
    const [environments] = await promisePool.query('SELECT name FROM environments WHERE id = ?', [environmentId]);

    const typeName = types[0]?.name || '';
    const environmentName = environments[0]?.name || '';

    // 更新申请记录
    await promisePool.query(
      `UPDATE resource_requests SET
       system_code = ?, system_name = ?, module_name = ?, owner = ?,
       type = ?, environment = ?, config_option = ?,
       node_count = ?, cpu = ?, memory = ?, disk_type = ?,
       system_disk = ?, data_disk = ?
       WHERE id = ?`,
      [
        systemCode,
        systemName,
        moduleName,
        owner,
        typeName,
        environmentName,
        configOption.name,
        configOption.node_count,
        configOption.cpu,
        configOption.memory,
        configOption.disk_type,
        configOption.system_disk,
        configOption.data_disk,
        id
      ]
    );

    res.json({ message: '资源申请更新成功' });
  } catch (error) {
    console.error('更新资源申请失败:', error);
    res.status(500).json({ message: '更新资源申请失败', error: error.message });
  }
};

// 删除申请
const deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;

    // 检查申请是否存在
    const [requests] = await promisePool.query(
      'SELECT user_id, status FROM resource_requests WHERE id = ?',
      [id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ message: '申请不存在' });
    }

    const request = requests[0];

    // 权限检查：只能删除自己的申请或管理员可删除所有
    const isAdmin = req.role === 'admin';
    if (!isAdmin && req.userId !== request.user_id) {
      return res.status(403).json({ message: '没有权限删除其他用户的申请' });
    }

    // 删除申请
    await promisePool.query('DELETE FROM resource_requests WHERE id = ?', [id]);

    res.json({ message: '虚拟机申请删除成功' });
  } catch (error) {
    console.error('删除申请失败:', error);
    res.status(500).json({ message: '删除申请失败', error: error.message });
  }
};

// 导出申请为Excel
const exportRequestToExcel = async (req, res) => {
  try {
    const { id } = req.params;

    const [requests] = await promisePool.query(
      `SELECT r.*,
        u.username as applicant_name,
        u.real_name as applicant_real_name
       FROM resource_requests r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.id = ?`,
      [id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ message: '申请不存在' });
    }

    const request = requests[0];

    // 非管理员只能导出自己的申请
    if (req.role !== 'admin' && req.userId !== request.user_id) {
      return res.status(403).json({ message: '没有权限导出此申请' });
    }

    // 导出Excel为Buffer
    const excelBuffer = await excelExporter.exportSingleRequest(request, req.user || { username: req.username });

    // 生成文件名（支持中文和WPS兼容）
    const filename = encodeURIComponent(`资源申请_${request.system_name}_${new Date().toISOString().slice(0,10)}.xlsx`);

    // 设置响应头，确保Excel/WPS兼容性
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // 发送Excel文件
    res.send(excelBuffer);
  } catch (error) {
    console.error('导出Excel失败:', error);
    res.status(500).json({ message: '导出Excel失败', error: error.message });
  }
};

// 导出所有申请为Excel（包含两个sheet页）
const exportAllRequests = async (req, res) => {
  try {
    // 获取当前用户的所有申请
    const [requests] = await promisePool.query(
      `SELECT r.*,
        u.username as applicant_name,
        u.real_name as applicant_real_name
       FROM resource_requests r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.user_id = ?
       ORDER BY r.submitted_at DESC`,
      [req.userId]
    );

    if (requests.length === 0) {
      return res.status(404).json({ message: '暂无可导出的申请记录' });
    }

    // 获取用户申请中涉及的服务类型
    const involvedTypes = new Set();
    requests.forEach(request => {
      if (request.type) {
        involvedTypes.add(request.type);
      }
    });
    const typeArray = Array.from(involvedTypes);
    console.log('🔍 用户申请涉及的服务类型:', typeArray);

    // 安全地构建SQL查询，避免SQL注入
    let configDescriptions;
    if (typeArray.length === 0) {
      // 如果没有类型限制，获取所有配置（保持兼容性）
      [configDescriptions] = await promisePool.query(`
        SELECT cd.*,
               co.name as config_option_name,
               ct.name as type_name,
               e.name as environment_name
        FROM config_descriptions cd
        LEFT JOIN config_options co ON cd.config_option_id = co.id
        LEFT JOIN config_types ct ON co.type_id = ct.id
        LEFT JOIN environments e ON co.environment_id = e.id
        WHERE cd.config_option_id IN (
          SELECT DISTINCT config_option_id FROM config_options WHERE is_active = 1
        )
        ORDER BY ct.name, e.name, co.name
      `);
    } else {
      // 只获取用户申请中涉及类型的配置详细说明数据
      const placeholders = typeArray.map(() => '?').join(',');
      [configDescriptions] = await promisePool.query(`
        SELECT cd.*,
               co.name as config_option_name,
               ct.name as type_name,
               e.name as environment_name
        FROM config_descriptions cd
        LEFT JOIN config_options co ON cd.config_option_id = co.id
        LEFT JOIN config_types ct ON co.type_id = ct.id
        LEFT JOIN environments e ON co.environment_id = e.id
        WHERE ct.name IN (${placeholders})
        ORDER BY ct.name, e.name, co.name
      `, typeArray);
    }

    // 确保configDescriptions不为undefined
    if (!configDescriptions) {
      configDescriptions = [];
    }

    // 调试日志
    console.log('🔍 用户申请涉及的服务类型:', typeArray);
    console.log('📊 查询到的配置描述数量:', configDescriptions.length);

    // 导出Excel为Buffer（包含两个sheet页）
    const excelBuffer = await excelExporter.exportAllRequestsWithDetails(requests, configDescriptions, req.user);

    // 生成文件名
    const filename = encodeURIComponent(`我的资源申请_${new Date().toISOString().slice(0,10)}.xlsx`);

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // 发送Excel文件
    res.send(excelBuffer);
  } catch (error) {
    console.error('导出所有申请失败:', error);
    res.status(500).json({ message: '导出所有申请失败', error: error.message });
  }
};

module.exports = {
  createRequest,
  getMyRequests,
  getAllRequests,
  getRequestById,
  updateRequestStatus,
  updateRequest,
  deleteRequest,
  exportRequestToExcel,
  exportAllRequests
};
