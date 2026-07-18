/**
 * Excel导出路由
 */

const express = require('express');
const router = express.Router();
const ExcelExportController = require('../controllers/excelController');
const authenticate = require('../middleware/auth').authenticate;

// 导出资源申请（支持筛选）
// GET /api/excel/requests?ids=1,2,3 (导出指定ID的申请)
// GET /api/excel/requests (导出当前用户的所有申请)
router.get('/requests', authenticate, ExcelExportController.exportRequests);

// 导出单条资源申请
// GET /api/excel/requests/:id
router.get('/requests/:id', authenticate, ExcelExportController.exportSingleRequest);

// 批量导出
// POST /api/excel/batch
// Body: { requestIds: [1, 2, 3] }
router.post('/batch', authenticate, ExcelExportController.batchExport);

// 预览导出数据
// GET /api/excel/preview?ids=1,2,3
router.get('/preview', authenticate, ExcelExportController.previewExport);

// 导出所有模块为多Sheet Excel
// GET /api/excel/all-modules
router.get('/all-modules', authenticate, ExcelExportController.exportAllModules);

// 导出用户需求单
// GET /api/excel/user-requirements/:id
router.get('/user-requirements/:id', authenticate, ExcelExportController.exportUserRequirement);

module.exports = router;
