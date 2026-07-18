/**
 * Excel导出控制器
 */

const excelExporter = require('../utils/excelExporter');
const { filterSensitiveData } = require('../utils/security');
const { promisePool } = require('../config/database');
const PermissionModel = require('../models/permissionModel');
const UserRequirementModel = require('../models/userRequirementModel');
const RequirementCategoryModel = require('../models/requirementCategoryModel');

class ExcelExportController {
  /**
   * 导出资源申请为Excel
   */
  static async exportRequests(req, res) {
    try {
      const { ids } = req.query; // 要导出的申请ID列表
      const user = req.user; // 当前用户

      // 获取要导出的申请数据
      let requests = [];

      if (ids) {
        // 导出指定ID的申请
        const idArray = ids.split(',').map(id => parseInt(id.trim()));
        requests = await getResourceRequestsByIds(idArray, user);
      } else {
        // 导出当前用户的所有申请
        requests = await getUserResourceRequests(user);
      }

      // 数据验证
      const validation = excelExporter.validateRequestData(requests);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: '数据验证失败',
          errors: validation.errors
        });
      }

      // 生成Excel文件
      const excelBuffer = await excelExporter.exportRequestsToExcel(requests, user);
      const fileName = excelExporter.generateExcelFileName();

      // 设置响应头
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Content-Length', excelBuffer.length);

      // 发送文件
      res.send(excelBuffer);

    } catch (error) {
      console.error('Excel导出失败:', error);
      res.status(500).json({
        success: false,
        message: 'Excel导出失败',
        error: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
      });
    }
  }

  /**
   * 导出单条资源申请
   */
  static async exportSingleRequest(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      // 获取申请数据
      const request = await getResourceRequestById(id, user);

      if (!request) {
        return res.status(404).json({
          success: false,
          message: '申请记录不存在'
        });
      }

      // 数据验证
      const validation = excelExporter.validateRequestData([request]);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: '数据验证失败',
          errors: validation.errors
        });
      }

      // 生成Excel文件
      const excelBuffer = await excelExporter.exportSingleRequest(request, user);
      const fileName = excelExporter.generateExcelFileName(request.systemName);

      // 设置响应头
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Content-Length', excelBuffer.length);

      // 发送文件
      res.send(excelBuffer);

    } catch (error) {
      console.error('Excel导出失败:', error);
      res.status(500).json({
        success: false,
        message: 'Excel导出失败',
        error: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
      });
    }
  }

  /**
   * 批量导出
   */
  static async batchExport(req, res) {
    try {
      const { requestIds } = req.body; // 申请ID数组
      const user = req.user;

      if (!Array.isArray(requestIds) || requestIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请选择要导出的申请记录'
        });
      }

      // 获取申请数据
      const requests = await getResourceRequestsByIds(requestIds, user);

      // 数据验证
      const validation = excelExporter.validateRequestData(requests);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: '数据验证失败',
          errors: validation.errors
        });
      }

      // 生成Excel文件
      const excelBuffer = await excelExporter.exportRequestsToExcel(requests, user);
      const fileName = excelExporter.generateExcelFileName('批量导出');

      // 设置响应头
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Content-Length', excelBuffer.length);

      // 发送文件
      res.send(excelBuffer);

    } catch (error) {
      console.error('批量导出失败:', error);
      res.status(500).json({
        success: false,
        message: '批量导出失败',
        error: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
      });
    }
  }

  /**
   * 预览导出数据（不生成文件）
   */
  static async previewExport(req, res) {
    try {
      const { ids } = req.query;
      const user = req.user;

      let requests = [];
      if (ids) {
        const idArray = ids.split(',').map(id => parseInt(id.trim()));
        requests = await getResourceRequestsByIds(idArray, user);
      } else {
        requests = await getUserResourceRequests(user);
      }

      // 过滤敏感数据
      const safeData = requests.map(req => filterSensitiveData(req));

      res.json({
        success: true,
        data: {
          count: safeData.length,
          requests: safeData
        }
      });

    } catch (error) {
      console.error('预览导出数据失败:', error);
      res.status(500).json({
        success: false,
        message: '预览导出数据失败'
      });
    }
  }

  /**
   * 导出所有模块的申请为多Sheet Excel
   */
  static async exportAllModules(req, res) {
    try {
      const user = req.user;

      // 获取所有模块的数据
      const [containerRequests, vmRequests, obsRequests, sfsRequests, permissionRequests, networkPolicyRequests, userRequirements] = await Promise.all([
        getAllContainerRequestsDB(user),
        getAllVMRequestsDB(user),
        getAllObsRequestsDB(user),
        getAllSfsRequestsDB(user),
        getAllPermissionRequestsDB(user),
        getAllNetworkPoliciesDB(user),
        getAllUserRequirementsDB(user)
      ]);

      const categories = await RequirementCategoryModel.getTree();

      // 生成多Sheet Excel文件
      const excelBuffer = await excelExporter.exportAllModulesToExcel({
        container: containerRequests,
        vm: vmRequests,
        obs: obsRequests,
        sfs: sfsRequests,
        permission: permissionRequests,
        networkPolicy: networkPolicyRequests,
        userRequirements: userRequirements,
        categories: categories
      }, user);

      const fileName = `资源申请汇总_${new Date().getTime()}.xlsx`;

      // 设置响应头
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Content-Length', excelBuffer.length);

      // 发送文件
      res.send(excelBuffer);

    } catch (error) {
      console.error('导出所有模块失败:', error);
      res.status(500).json({
        success: false,
        message: '导出所有模块失败',
        error: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
      });
    }
  }
  /**
   * 导出用户需求单为Excel
   */
  static async exportUserRequirement(req, res) {
    try {
      const { id } = req.params;
      const UserRequirementModel = require('../models/userRequirementModel');
      const RequirementCategoryModel = require('../models/requirementCategoryModel');

      const requirement = await UserRequirementModel.getById(id);
      if (!requirement) {
        return res.status(404).json({
          success: false,
          message: '需求单不存在'
        });
      }

      if (requirement.applicant_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '无权导出此需求单'
        });
      }

      const categories = await RequirementCategoryModel.getTree();
      const excelBuffer = await excelExporter.exportUserRequirementsToExcel(requirement, categories);
      const fileName = `用户需求_${requirement.title}_${requirement.applicant_name || ''}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Content-Length', excelBuffer.length);
      res.send(excelBuffer);
    } catch (error) {
      console.error('导出用户需求Excel失败:', error);
      res.status(500).json({
        success: false,
        message: '导出用户需求Excel失败',
        error: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
      });
    }
  }
}

// 辅助函数：根据ID获取申请
async function getResourceRequestById(id, user) {
  // 这里应该查询数据库
  // 模拟实现
  return mockRequestData.find(req => req.id === parseInt(id));
}

// 辅助函数：根据IDs获取申请列表
async function getResourceRequestsByIds(ids, user) {
  // 这里应该查询数据库
  // 模拟实现
  return mockRequestData.filter(req => ids.includes(req.id));
}

// 辅助函数：获取用户的所有申请
async function getUserResourceRequests(user) {
  // 这里应该查询数据库
  // 模拟实现
  return mockRequestData.filter(req => req.userId === user.id);
}

// 数据库查询辅助函数
async function getAllContainerRequestsDB(user) {
  const isAdmin = user.role === 'admin';
  let sql = `
    SELECT
      cr.*,
      u.username,
      u.real_name,
      e.name as environment_name,
      u.id as applicant_id
    FROM container_requests cr
    LEFT JOIN users u ON cr.user_id = u.id
    LEFT JOIN environments e ON cr.environment_id = e.id
  `;

  if (!isAdmin) {
    sql += ` WHERE cr.user_id = ${user.id}`;
  }

  sql += ` ORDER BY cr.submitted_at DESC`;

  try {
    const [rows] = await promisePool.query(sql);
    return rows.map(row => ({
      ...row,
      applicant: row.real_name || row.username
    }));
  } catch (error) {
    console.error('获取容器申请失败:', error);
    return [];
  }
}

async function getAllVMRequestsDB(user) {
  const isAdmin = user.role === 'admin';
  let sql = `
    SELECT
      vr.*,
      u.username,
      u.real_name,
      e.name as environment_name,
      u.id as applicant_id
    FROM vm_requests vr
    LEFT JOIN users u ON vr.applicant_id = u.id
    LEFT JOIN environments e ON vr.environment_id = e.id
  `;

  if (!isAdmin) {
    sql += ` WHERE vr.applicant_id = ${user.id}`;
  }

  sql += ` ORDER BY vr.submitted_at DESC`;

  try {
    const [rows] = await promisePool.query(sql);
    return rows.map(row => ({
      ...row,
      applicant_name: row.real_name || row.username
    }));
  } catch (error) {
    console.error('获取虚拟机申请失败:', error);
    return [];
  }
}

async function getAllObsRequestsDB(user) {
  const isAdmin = user.role === 'admin';
  let sql = `
    SELECT
      or_req.*,
      u.username,
      u.real_name,
      e.name as environment_name,
      u.id as applicant_id
    FROM obs_requests or_req
    LEFT JOIN users u ON or_req.user_id = u.id
    LEFT JOIN environments e ON or_req.environment_id = e.id
  `;

  if (!isAdmin) {
    sql += ` WHERE or_req.user_id = ${user.id}`;
  }

  sql += ` ORDER BY or_req.submitted_at DESC`;

  try {
    const [rows] = await promisePool.query(sql);
    return rows.map(row => ({
      ...row,
      applicant: row.real_name || row.username
    }));
  } catch (error) {
    console.error('获取OBS申请失败:', error);
    return [];
  }
}

async function getAllSfsRequestsDB(user) {
  const isAdmin = user.role === 'admin';
  let sql = `
    SELECT
      sr.*,
      u.username,
      u.real_name,
      e.name as environment_name,
      u.id as applicant_id
    FROM sfs_requests sr
    LEFT JOIN users u ON sr.user_id = u.id
    LEFT JOIN environments e ON sr.environment_id = e.id
  `;

  if (!isAdmin) {
    sql += ` WHERE sr.user_id = ${user.id}`;
  }

  sql += ` ORDER BY sr.submitted_at DESC`;

  try {
    const [rows] = await promisePool.query(sql);
    return rows.map(row => ({
      ...row,
      applicant: row.real_name || row.username
    }));
  } catch (error) {
    console.error('获取SFS申请失败:', error);
    return [];
  }
}

async function getAllPermissionRequestsDB(user) {
  try {
    const requests = await PermissionModel.getAll(1, 10000);

    // 如果不是管理员，只返回自己的申请
    if (user.role !== 'admin') {
      return requests.filter(req => req.applicant_id === user.id);
    }

    return requests;
  } catch (error) {
    console.error('获取权限申请失败:', error);
    return [];
  }
}

async function getAllNetworkPoliciesDB(user) {
  const isAdmin = user.role === 'admin';
  let sql = `
    SELECT
      np.*,
      u.username,
      u.real_name,
      u.id as applicant_id
    FROM network_policies np
    LEFT JOIN users u ON np.applicant_id = u.id
  `;

  if (!isAdmin) {
    sql += ` WHERE np.applicant_id = ${user.id}`;
  }

  sql += ` ORDER BY np.submitted_at DESC`;

  try {
    const [rows] = await promisePool.query(sql);
    return rows.map(row => ({
      ...row,
      applicant_name: row.real_name || row.username
    }));
  } catch (error) {
    console.error('获取网络策略申请失败:', error);
    return [];
  }
}

async function getAllUserRequirementsDB(user) {
  const isAdmin = user.role === 'admin';
  const params = [];
  let sql = `
    SELECT
      id, title, applicant_id, applicant_name, status, created_at, updated_at
    FROM user_requirements
  `;

  if (!isAdmin) {
    sql += ' WHERE applicant_id = ?';
    params.push(user.id);
  }

  sql += ' ORDER BY created_at DESC';

  try {
    const [rows] = await promisePool.query(sql, params);
    if (rows.length === 0) {
      return [];
    }

    const requirementIds = rows.map(row => row.id);
    const [answers] = await promisePool.query(
      `SELECT requirement_id, category_id, answer_text
       FROM requirement_answers
       WHERE requirement_id IN (?)`,
      [requirementIds]
    );

    const answersByRequirement = new Map();
    answers.forEach(answer => {
      if (!answersByRequirement.has(answer.requirement_id)) {
        answersByRequirement.set(answer.requirement_id, []);
      }
      answersByRequirement.get(answer.requirement_id).push(answer);
    });

    return rows.map(row => ({
      ...row,
      answers: answersByRequirement.get(row.id) || []
    }));
  } catch (error) {
    console.error('获取用户需求失败:', error);
    return [];
  }
}

// 模拟数据（实际应用中从数据库获取）
const mockRequestData = [
  {
    id: 1,
    userId: 1,
    systemCode: 'A-73',
    systemName: '车联网',
    moduleName: '车联网平台GTSP相关改造',
    owner: '唐晖',
    type: '数据库',
    environment: '测试',
    configOption: '配置A-小型',
    nodeCount: 1,
    cpu: 2,
    memory: 4,
    diskType: '高IO',
    systemDisk: 80,
    dataDisk: 100,
    status: 'submitted',
    submittedAt: '2026-05-21 10:30:00'
  },
  {
    id: 2,
    userId: 1,
    systemCode: 'A-74',
    systemName: '电商系统',
    moduleName: '订单服务',
    owner: '李明',
    type: 'AP',
    environment: '生产',
    configOption: '配置B-中型',
    nodeCount: 1,
    cpu: 4,
    memory: 8,
    diskType: '高IO',
    systemDisk: 80,
    dataDisk: 200,
    status: 'submitted',
    submittedAt: '2026-05-21 14:20:00'
  }
];

module.exports = ExcelExportController;