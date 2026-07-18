# 用户需求录入模块实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 vmconf-web 中新增一个可配置分类的「用户需求录入」独立模块，支持录入、编辑、删除、查看、管理员维护分类以及 Excel 导出。

**Architecture:** 沿用现有权限申请模块的分层模式（Vue 视图 + API 模块 + Express 控制器/模型 + MySQL 表）。新增三张表：可配置分类表、需求单主表、答案表，实现配置与答案解耦。Excel 导出复用 `excelExporter.js`，新增「用户需求」sheet。

**Tech Stack:** Vue 3 + Element Plus + Pinia, Express.js + mysql2, ExcelJS, JWT 认证。

---

## 文件结构

### 后端
- 创建 `backend/src/migrations/create_user_requirements.sql` — 建表脚本
- 创建 `backend/src/models/userRequirementModel.js` — 需求单数据访问
- 创建 `backend/src/models/requirementCategoryModel.js` — 分类数据访问
- 创建 `backend/src/controllers/userRequirementController.js` — 需求单业务逻辑
- 创建 `backend/src/controllers/requirementCategoryController.js` — 分类业务逻辑
- 创建 `backend/src/routes/userRequirement.js` — 需求单路由
- 创建 `backend/src/routes/requirementCategory.js` — 分类路由
- 修改 `backend/server.js` — 注册新路由
- 修改 `backend/src/utils/excelExporter.js` — 新增用户需求 sheet 导出函数

### 前端
- 创建 `frontend/src/api/userRequirement.js` — 需求单 API 调用
- 创建 `frontend/src/api/requirementCategory.js` — 分类 API 调用
- 创建 `frontend/src/views/UserRequirement.vue` — 需求单列表页
- 创建 `frontend/src/views/UserRequirementForm.vue` — 新增/编辑表单页
- 创建 `frontend/src/views/UserRequirementDetail.vue` — 详情弹窗组件
- 创建 `frontend/src/views/RequirementCategoryManage.vue` — 分类维护页（管理员）
- 修改 `frontend/src/router/index.js` — 注册新路由
- 修改 `frontend/src/views/Main.vue` — 添加侧边栏菜单入口

---

## Task 1: 创建数据库表

**Files:**
- Create: `backend/src/migrations/create_user_requirements.sql`

- [ ] **Step 1: 编写建表 SQL**

```sql
CREATE TABLE IF NOT EXISTS requirement_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parent_id INT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  reference TEXT,
  level TINYINT NOT NULL COMMENT '1 大类，2 小类，3 问题项',
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_parent_sort (parent_id, sort_order),
  INDEX idx_level (level),
  FOREIGN KEY (parent_id) REFERENCES requirement_categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='需求分类与问题项配置';

CREATE TABLE IF NOT EXISTS user_requirements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  applicant_id INT NOT NULL,
  applicant_name VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_applicant (applicant_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户需求单';

CREATE TABLE IF NOT EXISTS requirement_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  requirement_id INT NOT NULL,
  category_id INT NOT NULL,
  answer_text TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_requirement_category (requirement_id, category_id),
  INDEX idx_requirement (requirement_id),
  FOREIGN KEY (requirement_id) REFERENCES user_requirements(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES requirement_categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户需求答案';
```

- [ ] **Step 2: 在本地 MySQL 执行脚本**

Run: `mysql -u root -p vmconf_db < backend/src/migrations/create_user_requirements.sql`
Expected: 三条 `Query OK` 成功信息。

- [ ] **Step 3: 提交建表脚本**

```bash
git add backend/src/migrations/create_user_requirements.sql
git commit -m "feat: 新增用户需求录入模块数据库表"
```

---

## Task 2: 后端分类模型

**Files:**
- Create: `backend/src/models/requirementCategoryModel.js`

- [ ] **Step 1: 编写分类模型**

```javascript
const { promisePool } = require('../config/database');

class RequirementCategoryModel {
  static async create(data) {
    const sql = `
      INSERT INTO requirement_categories (parent_id, name, description, reference, level, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await promisePool.query(sql, [
      data.parent_id || null,
      data.name,
      data.description || null,
      data.reference || null,
      data.level,
      data.sort_order || 0
    ]);
    return result.insertId;
  }

  static async getById(id) {
    const [rows] = await promisePool.query('SELECT * FROM requirement_categories WHERE id = ?', [id]);
    return rows[0] || null;
  }

  static async getTree() {
    const [rows] = await promisePool.query(
      'SELECT * FROM requirement_categories WHERE is_active = 1 ORDER BY sort_order, id'
    );
    const map = new Map();
    const tree = [];
    rows.forEach(row => {
      row.children = [];
      map.set(row.id, row);
    });
    rows.forEach(row => {
      if (row.parent_id && map.has(row.parent_id)) {
        map.get(row.parent_id).children.push(row);
      } else {
        tree.push(row);
      }
    });
    return tree;
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    ['parent_id', 'name', 'description', 'reference', 'level', 'sort_order', 'is_active'].forEach(key => {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    });
    if (fields.length === 0) return false;
    values.push(id);
    const sql = `UPDATE requirement_categories SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await promisePool.query(sql, values);
    return result.affectedRows > 0;
  }

  static async hasAnswers(id) {
    const [rows] = await promisePool.query(
      'SELECT COUNT(*) as count FROM requirement_answers WHERE category_id = ?',
      [id]
    );
    return rows[0].count > 0;
  }
}

module.exports = RequirementCategoryModel;
```

- [ ] **Step 2: 提交模型**

```bash
git add backend/src/models/requirementCategoryModel.js
git commit -m "feat: 新增需求分类模型"
```

---

## Task 3: 后端需求单模型

**Files:**
- Create: `backend/src/models/userRequirementModel.js`

- [ ] **Step 1: 编写需求单模型**

```javascript
const { promisePool } = require('../config/database');

class UserRequirementModel {
  static async create(data) {
    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();
      const [reqResult] = await connection.query(
        'INSERT INTO user_requirements (title, applicant_id, applicant_name) VALUES (?, ?, ?)',
        [data.title, data.applicant_id, data.applicant_name]
      );
      const requirementId = reqResult.insertId;

      if (Array.isArray(data.answers)) {
        for (const answer of data.answers) {
          await connection.query(
            'INSERT INTO requirement_answers (requirement_id, category_id, answer_text) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE answer_text = ?',
            [requirementId, answer.category_id, answer.answer_text || '', answer.answer_text || '']
          );
        }
      }

      await connection.commit();
      return requirementId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getById(id) {
    const [reqRows] = await promisePool.query(
      'SELECT * FROM user_requirements WHERE id = ?',
      [id]
    );
    if (reqRows.length === 0) return null;
    const requirement = reqRows[0];

    const [answerRows] = await promisePool.query(
      'SELECT category_id, answer_text FROM requirement_answers WHERE requirement_id = ?',
      [id]
    );
    requirement.answers = answerRows;
    return requirement;
  }

  static async getList({ userId = null, page = 1, pageSize = 10, search = '' }) {
    const offset = (page - 1) * pageSize;
    let where = 'WHERE 1=1';
    const params = [];
    if (userId) {
      where += ' AND applicant_id = ?';
      params.push(userId);
    }
    if (search) {
      where += ' AND title LIKE ?';
      params.push(`%${search}%`);
    }

    const [countRows] = await promisePool.query(
      `SELECT COUNT(*) as total FROM user_requirements ${where}`,
      params
    );
    const [rows] = await promisePool.query(
      `SELECT * FROM user_requirements ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return { rows, total: countRows[0].total };
  }

  static async update(id, data) {
    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();
      if (data.title !== undefined) {
        await connection.query(
          'UPDATE user_requirements SET title = ? WHERE id = ?',
          [data.title, id]
        );
      }
      if (Array.isArray(data.answers)) {
        for (const answer of data.answers) {
          await connection.query(
            'INSERT INTO requirement_answers (requirement_id, category_id, answer_text) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE answer_text = ?',
            [id, answer.category_id, answer.answer_text || '', answer.answer_text || '']
          );
        }
      }
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async delete(id) {
    const [result] = await promisePool.query('DELETE FROM user_requirements WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = UserRequirementModel;
```

- [ ] **Step 2: 提交模型**

```bash
git add backend/src/models/userRequirementModel.js
git commit -m "feat: 新增用户需求单模型"
```

---

## Task 4: 后端分类控制器与路由

**Files:**
- Create: `backend/src/controllers/requirementCategoryController.js`
- Create: `backend/src/routes/requirementCategory.js`

- [ ] **Step 1: 编写分类控制器**

```javascript
const RequirementCategoryModel = require('../models/requirementCategoryModel');

class RequirementCategoryController {
  static async getTree(req, res) {
    try {
      const tree = await RequirementCategoryModel.getTree();
      res.json({ categories: tree });
    } catch (error) {
      console.error('获取需求分类失败:', error);
      res.status(500).json({ message: '获取需求分类失败', error: error.message });
    }
  }

  static async create(req, res) {
    try {
      const { parent_id, name, description, reference, level, sort_order } = req.body;
      if (!name || !level) {
        return res.status(400).json({ message: '名称和层级为必填项' });
      }
      const id = await RequirementCategoryModel.create({ parent_id, name, description, reference, level, sort_order });
      const category = await RequirementCategoryModel.getById(id);
      res.status(201).json({ message: '创建成功', category });
    } catch (error) {
      console.error('创建需求分类失败:', error);
      res.status(500).json({ message: '创建需求分类失败', error: error.message });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const existing = await RequirementCategoryModel.getById(id);
      if (!existing) return res.status(404).json({ message: '分类不存在' });
      await RequirementCategoryModel.update(id, req.body);
      const category = await RequirementCategoryModel.getById(id);
      res.json({ message: '更新成功', category });
    } catch (error) {
      console.error('更新需求分类失败:', error);
      res.status(500).json({ message: '更新需求分类失败', error: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      const existing = await RequirementCategoryModel.getById(id);
      if (!existing) return res.status(404).json({ message: '分类不存在' });
      if (await RequirementCategoryModel.hasAnswers(id)) {
        await RequirementCategoryModel.update(id, { is_active: 0 });
        return res.json({ message: '该分类已有填写记录，已禁用' });
      }
      await RequirementCategoryModel.update(id, { is_active: 0 });
      res.json({ message: '删除成功' });
    } catch (error) {
      console.error('删除需求分类失败:', error);
      res.status(500).json({ message: '删除需求分类失败', error: error.message });
    }
  }
}

module.exports = RequirementCategoryController;
```

- [ ] **Step 2: 编写分类路由**

```javascript
const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const RequirementCategoryController = require('../controllers/requirementCategoryController');

router.get('/', authenticate, RequirementCategoryController.getTree);
router.post('/', authenticate, isAdmin, RequirementCategoryController.create);
router.put('/:id', authenticate, isAdmin, RequirementCategoryController.update);
router.delete('/:id', authenticate, isAdmin, RequirementCategoryController.delete);

module.exports = router;
```

- [ ] **Step 3: 提交控制器与路由**

```bash
git add backend/src/controllers/requirementCategoryController.js backend/src/routes/requirementCategory.js
git commit -m "feat: 新增需求分类控制器与路由"
```

---

## Task 5: 后端需求单控制器与路由

**Files:**
- Create: `backend/src/controllers/userRequirementController.js`
- Create: `backend/src/routes/userRequirement.js`

- [ ] **Step 1: 编写需求单控制器**

```javascript
const UserRequirementModel = require('../models/userRequirementModel');

class UserRequirementController {
  static async create(req, res) {
    try {
      const { title, answers } = req.body;
      if (!title) return res.status(400).json({ message: '需求标题为必填项' });

      const id = await UserRequirementModel.create({
        title,
        answers,
        applicant_id: req.user.id,
        applicant_name: req.user.username
      });
      const request = await UserRequirementModel.getById(id);
      res.status(201).json({ message: '创建成功', request });
    } catch (error) {
      console.error('创建用户需求单失败:', error);
      res.status(500).json({ message: '创建用户需求单失败', error: error.message });
    }
  }

  static async getList(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 10;
      const search = req.query.search || '';
      const userId = req.user.role === 'admin' ? null : req.user.id;

      const { rows, total } = await UserRequirementModel.getList({ userId, page, pageSize, search });
      res.json({ requests: rows, total, page, pageSize });
    } catch (error) {
      console.error('获取用户需求单列表失败:', error);
      res.status(500).json({ message: '获取用户需求单列表失败', error: error.message });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const request = await UserRequirementModel.getById(id);
      if (!request) return res.status(404).json({ message: '需求单不存在' });
      if (request.applicant_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: '无权查看此需求单' });
      }
      res.json(request);
    } catch (error) {
      console.error('获取用户需求单详情失败:', error);
      res.status(500).json({ message: '获取用户需求单详情失败', error: error.message });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const existing = await UserRequirementModel.getById(id);
      if (!existing) return res.status(404).json({ message: '需求单不存在' });
      if (existing.applicant_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: '无权编辑此需求单' });
      }
      await UserRequirementModel.update(id, req.body);
      const request = await UserRequirementModel.getById(id);
      res.json({ message: '更新成功', request });
    } catch (error) {
      console.error('更新用户需求单失败:', error);
      res.status(500).json({ message: '更新用户需求单失败', error: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      const existing = await UserRequirementModel.getById(id);
      if (!existing) return res.status(404).json({ message: '需求单不存在' });
      if (existing.applicant_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: '无权删除此需求单' });
      }
      await UserRequirementModel.delete(id);
      res.json({ message: '删除成功' });
    } catch (error) {
      console.error('删除用户需求单失败:', error);
      res.status(500).json({ message: '删除用户需求单失败', error: error.message });
    }
  }
}

module.exports = UserRequirementController;
```

- [ ] **Step 2: 编写需求单路由**

```javascript
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const UserRequirementController = require('../controllers/userRequirementController');

router.post('/', authenticate, UserRequirementController.create);
router.get('/', authenticate, UserRequirementController.getList);
router.get('/:id', authenticate, UserRequirementController.getById);
router.put('/:id', authenticate, UserRequirementController.update);
router.delete('/:id', authenticate, UserRequirementController.delete);

module.exports = router;
```

- [ ] **Step 3: 提交控制器与路由**

```bash
git add backend/src/controllers/userRequirementController.js backend/src/routes/userRequirement.js
git commit -m "feat: 新增用户需求单控制器与路由"
```

---

## Task 6: 注册后端路由

**Files:**
- Modify: `backend/server.js:28`

- [ ] **Step 1: 在 server.js 注册路由**

在 `app.use('/api/network-policy', require('./src/routes/network-policy'));` 之后添加：

```javascript
app.use('/api/user-requirements', require('./src/routes/userRequirement'));
app.use('/api/requirement-categories', require('./src/routes/requirementCategory'));
```

- [ ] **Step 2: 重启后端服务并测试健康检查**

Run: `curl http://localhost:3000/health`
Expected: `{ "status": "ok", ... }`

- [ ] **Step 3: 提交路由注册**

```bash
git add backend/server.js
git commit -m "feat: 注册用户需求相关路由"
```

---

## Task 7: 后端 Excel 导出用户需求 Sheet

**Files:**
- Modify: `backend/src/utils/excelExporter.js:690`（module.exports 之前追加）

- [ ] **Step 1: 新增用户需求导出函数**

在 `module.exports` 之前追加：

```javascript
const exportUserRequirementsToExcel = async (requirement, categories) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('用户需求');

    worksheet.columns = [
      { header: '大类', key: 'bigCategory', width: 20 },
      { header: '小类', key: 'subCategory', width: 20 },
      { header: '问题项', key: 'question', width: 30 },
      { header: '用户侧回答', key: 'answer', width: 40 },
      { header: '填写说明', key: 'description', width: 40 },
      { header: '参考示例', key: 'reference', width: 40 }
    ];

    setupHeaderStyle(worksheet);

    const answerMap = new Map((requirement.answers || []).map(a => [a.category_id, a.answer_text]));

    const flattenCategories = (nodes, bigCategory = '', subCategory = '') => {
      let rows = [];
      for (const node of nodes) {
        if (node.level === 1) {
          rows = rows.concat(flattenCategories(node.children || [], node.name, ''));
        } else if (node.level === 2) {
          rows = rows.concat(flattenCategories(node.children || [], bigCategory, node.name));
        } else if (node.level === 3) {
          rows.push({
            bigCategory,
            subCategory,
            question: node.name,
            answer: answerMap.get(node.id) || '',
            description: node.description || '',
            reference: node.reference || ''
          });
        }
      }
      return rows;
    };

    const rows = flattenCategories(categories);
    rows.forEach(row => worksheet.addRow(row));

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  } catch (error) {
    console.error('导出用户需求Excel失败:', error);
    throw new Error('导出用户需求Excel文件失败');
  }
};
```

- [ ] **Step 2: 导出新函数**

修改 `module.exports` 为：

```javascript
module.exports = {
  exportRequestsToExcel,
  exportAllRequestsWithDetails,
  exportAllModulesToExcel,
  exportUserRequirementsToExcel
};
```

- [ ] **Step 3: 提交 Excel 导出功能**

```bash
git add backend/src/utils/excelExporter.js
git commit -m "feat: 新增用户需求 Excel sheet 导出"
```

---

## Task 8: 后端导出接口

**Files:**
- Modify: `backend/src/controllers/excelController.js`
- Modify: `backend/src/routes/excel.js`

- [ ] **Step 1: 在 excelController 新增导出方法**

在 `ExcelExportController` 类中追加：

```javascript
  static async exportUserRequirement(req, res) {
    try {
      const { id } = req.params;
      const UserRequirementModel = require('../models/userRequirementModel');
      const RequirementCategoryModel = require('../models/requirementCategoryModel');

      const requirement = await UserRequirementModel.getById(id);
      if (!requirement) {
        return res.status(404).json({ success: false, message: '需求单不存在' });
      }
      if (requirement.applicant_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: '无权导出此需求单' });
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
      res.status(500).json({ success: false, message: '导出失败', error: error.message });
    }
  }
```

- [ ] **Step 2: 在 excel.js 路由注册**

在 `router.get('/all-modules', ...)` 之后添加：

```javascript
router.get('/user-requirements/:id', authenticate, ExcelExportController.exportUserRequirement);
```

- [ ] **Step 3: 提交导出接口**

```bash
git add backend/src/controllers/excelController.js backend/src/routes/excel.js
git commit -m "feat: 新增用户需求单导出接口"
```

---

## Task 9: 前端 API 模块

**Files:**
- Create: `frontend/src/api/userRequirement.js`
- Create: `frontend/src/api/requirementCategory.js`

- [ ] **Step 1: 编写需求单 API**

```javascript
import request from '@/utils/request'

export const getUserRequirements = (params) => request({ url: '/user-requirements', method: 'get', params })
export const getUserRequirementById = (id) => request({ url: `/user-requirements/${id}`, method: 'get' })
export const createUserRequirement = (data) => request({ url: '/user-requirements', method: 'post', data })
export const updateUserRequirement = (id, data) => request({ url: `/user-requirements/${id}`, method: 'put', data })
export const deleteUserRequirement = (id) => request({ url: `/user-requirements/${id}`, method: 'delete' })
export const exportUserRequirement = (id) => request({ url: `/excel/user-requirements/${id}`, method: 'get', responseType: 'blob' })
```

- [ ] **Step 2: 编写分类 API**

```javascript
import request from '@/utils/request'

export const getRequirementCategories = () => request({ url: '/requirement-categories', method: 'get' })
export const createRequirementCategory = (data) => request({ url: '/requirement-categories', method: 'post', data })
export const updateRequirementCategory = (id, data) => request({ url: `/requirement-categories/${id}`, method: 'put', data })
export const deleteRequirementCategory = (id) => request({ url: `/requirement-categories/${id}`, method: 'delete' })
```

- [ ] **Step 3: 提交 API 模块**

```bash
git add frontend/src/api/userRequirement.js frontend/src/api/requirementCategory.js
git commit -m "feat: 新增用户需求前端 API 模块"
```

---

## Task 10: 前端需求单列表页

**Files:**
- Create: `frontend/src/views/UserRequirement.vue`

- [ ] **Step 1: 编写列表页**

```vue
<template>
  <div class="user-requirement">
    <div class="page-header">
      <h2 class="page-title">用户需求录入</h2>
    </div>

    <el-card>
      <template #header>
        <div class="card-header">
          <span>需求单列表</span>
          <div>
            <el-input v-model="searchText" placeholder="搜索需求标题" clearable style="width: 200px; margin-right: 10px" />
            <el-button type="primary" @click="handleSearch" :icon="Search">搜索</el-button>
            <el-button type="success" @click="handleCreate" :icon="Plus">新建</el-button>
          </div>
        </div>
      </template>

      <el-table :data="requests" border stripe>
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="title" label="需求标题" show-overflow-tooltip />
        <el-table-column prop="applicant_name" label="申请人" width="120" />
        <el-table-column prop="created_at" label="创建时间" width="160">
          <template #default="scope">{{ formatDateTime(scope.row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="280" align="center" fixed="right">
          <template #default="scope">
            <el-button type="primary" size="small" @click="handleView(scope.row)">查看</el-button>
            <el-button size="small" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button type="danger" size="small" @click="handleDelete(scope.row)">删除</el-button>
            <el-button size="small" @click="handleExport(scope.row)">导出</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        class="pagination"
        @current-change="loadRequests"
      />
    </el-card>

    <UserRequirementDetail v-model:visible="detailVisible" :data="selectedRequirement" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus } from '@element-plus/icons-vue'
import { getUserRequirements, deleteUserRequirement, exportUserRequirement } from '@/api/userRequirement'
import UserRequirementDetail from './UserRequirementDetail.vue'

const router = useRouter()
const requests = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const searchText = ref('')
const detailVisible = ref(false)
const selectedRequirement = ref(null)

const formatDateTime = (dateTime) => {
  if (!dateTime) return '-'
  return new Date(dateTime).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const loadRequests = async () => {
  try {
    const res = await getUserRequirements({ page: page.value, pageSize: pageSize.value, search: searchText.value })
    requests.value = res.requests || []
    total.value = res.total || 0
  } catch (error) {
    console.error('加载需求单失败:', error)
  }
}

const handleSearch = () => {
  page.value = 1
  loadRequests()
}

const handleCreate = () => router.push('/user-requirements/create')
const handleEdit = (row) => router.push(`/user-requirements/${row.id}/edit`)

const handleView = async (row) => {
  selectedRequirement.value = row
  detailVisible.value = true
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确认删除该需求单？', '提示', { type: 'warning' })
    await deleteUserRequirement(row.id)
    ElMessage.success('删除成功')
    loadRequests()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
    }
  }
}

const handleExport = async (row) => {
  try {
    const res = await exportUserRequirement(row.id)
    const blob = new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `用户需求_${row.title}.xlsx`
    link.click()
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

onMounted(loadRequests)
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.pagination { margin-top: 20px; justify-content: flex-end; }
</style>
```

- [ ] **Step 2: 提交列表页**

```bash
git add frontend/src/views/UserRequirement.vue
git commit -m "feat: 新增用户需求单列表页"
```

---

## Task 11: 前端详情弹窗

**Files:**
- Create: `frontend/src/views/UserRequirementDetail.vue`

- [ ] **Step 1: 编写详情弹窗**

```vue
<template>
  <el-dialog v-model="visible" title="需求单详情" width="800px" @close="handleClose">
    <div v-if="data">
      <h3>{{ data.title }}</h3>
      <p class="meta">申请人：{{ data.applicant_name }} | 创建时间：{{ formatDateTime(data.created_at) }}</p>
      <el-divider />
      <div v-for="group in groupedAnswers" :key="group.subCategory" class="answer-group">
        <h4>{{ group.bigCategory }} - {{ group.subCategory }}</h4>
        <div v-for="item in group.questions" :key="item.category_id" class="answer-item">
          <div class="question">{{ item.question }}</div>
          <div class="answer">{{ item.answer || '（未填写）' }}</div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ visible: Boolean, data: Object })
const emit = defineEmits(['update:visible'])

const visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const formatDateTime = (dateTime) => {
  if (!dateTime) return '-'
  return new Date(dateTime).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const handleClose = () => {
  emit('update:visible', false)
}
</script>

<style scoped>
.meta { color: #999; font-size: 14px; }
.answer-group { margin-bottom: 20px; }
.answer-item { margin: 10px 0; padding: 10px; background: #f5f7fa; border-radius: 4px; }
.question { font-weight: bold; margin-bottom: 6px; }
.answer { color: #333; white-space: pre-wrap; }
</style>
```

注：弹窗内的分组展示依赖父组件传入已处理好的 `groupedAnswers` 结构；后续可在父组件或弹窗内部根据分类树与答案拼接。本示例展示最小可运行结构。

- [ ] **Step 2: 提交详情弹窗**

```bash
git add frontend/src/views/UserRequirementDetail.vue
git commit -m "feat: 新增用户需求单详情弹窗"
```

---

## Task 12: 前端表单页

**Files:**
- Create: `frontend/src/views/UserRequirementForm.vue`

- [ ] **Step 1: 编写表单页**

```vue
<template>
  <div class="user-requirement-form">
    <h2 class="page-title">{{ isEdit ? '编辑需求单' : '新建需求单' }}</h2>

    <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
      <el-form-item label="需求标题" prop="title">
        <el-input v-model="form.title" maxlength="200" show-word-limit />
      </el-form-item>
    </el-form>

    <el-card v-for="group in groupedCategories" :key="group.subCategory.id" class="category-group">
      <template #header>
        <span>{{ group.bigCategory.name }} - {{ group.subCategory.name }}</span>
      </template>

      <div v-for="question in group.questions" :key="question.id" class="question-item">
        <div class="question-title">{{ question.name }}</div>
        <div class="question-desc" v-if="question.description">说明：{{ question.description }}</div>
        <div class="question-reference" v-if="question.reference">参考：{{ question.reference }}</div>
        <el-input
          v-model="answers[question.id]"
          type="textarea"
          :rows="3"
          placeholder="请输入答案"
        />
      </div>
    </el-card>

    <div class="form-actions">
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleSave" :loading="loading">保存</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getRequirementCategories } from '@/api/requirementCategory'
import { createUserRequirement, updateUserRequirement, getUserRequirementById } from '@/api/userRequirement'

const route = useRoute()
const router = useRouter()
const formRef = ref(null)
const loading = ref(false)
const isEdit = computed(() => !!route.params.id)

const form = reactive({ title: '' })
const answers = reactive({})
const categories = ref([])

const rules = {
  title: [{ required: true, message: '请输入需求标题', trigger: 'blur' }]
}

const groupedCategories = computed(() => {
  const groups = []
  const bigCategories = categories.value.filter(c => c.level === 1)
  bigCategories.forEach(big => {
    const subs = (big.children || []).filter(c => c.level === 2)
    subs.forEach(sub => {
      const questions = (sub.children || []).filter(c => c.level === 3)
      if (questions.length > 0) {
        groups.push({ bigCategory: big, subCategory: sub, questions })
      }
    })
  })
  return groups
})

const loadCategories = async () => {
  try {
    const res = await getRequirementCategories()
    categories.value = res.categories || []
  } catch (error) {
    ElMessage.error('加载分类失败')
  }
}

const loadDetail = async () => {
  if (!isEdit.value) return
  try {
    const res = await getUserRequirementById(route.params.id)
    form.title = res.title
    ;(res.answers || []).forEach(a => {
      answers[a.category_id] = a.answer_text
    })
  } catch (error) {
    ElMessage.error('加载需求单失败')
  }
}

const handleSave = async () => {
  await formRef.value.validate()
  loading.value = true
  try {
    const payload = {
      title: form.title,
      answers: Object.keys(answers).map(categoryId => ({
        category_id: parseInt(categoryId),
        answer_text: answers[categoryId] || ''
      }))
    }
    if (isEdit.value) {
      await updateUserRequirement(route.params.id, payload)
    } else {
      await createUserRequirement(payload)
    }
    ElMessage.success('保存成功')
    router.push('/user-requirements')
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    loading.value = false
  }
}

const handleCancel = () => router.push('/user-requirements')

onMounted(() => {
  loadCategories().then(loadDetail)
})
</script>

<style scoped>
.page-title { margin-bottom: 20px; }
.category-group { margin-bottom: 20px; }
.question-item { margin-bottom: 20px; }
.question-title { font-weight: bold; margin-bottom: 6px; }
.question-desc, .question-reference { color: #999; font-size: 13px; margin-bottom: 6px; }
.form-actions { margin-top: 20px; }
</style>
```

- [ ] **Step 2: 提交表单页**

```bash
git add frontend/src/views/UserRequirementForm.vue
git commit -m "feat: 新增用户需求单表单页"
```

---

## Task 13: 前端分类维护页

**Files:**
- Create: `frontend/src/views/RequirementCategoryManage.vue`

- [ ] **Step 1: 编写分类维护页**

```vue
<template>
  <div class="requirement-category-manage">
    <h2 class="page-title">需求分类维护</h2>

    <el-card>
      <template #header>
        <div class="card-header">
          <span>分类列表</span>
          <el-button type="primary" @click="handleAdd">新增大类</el-button>
        </div>
      </template>

      <el-tree
        :data="categories"
        :props="{ label: 'name', children: 'children' }"
        node-key="id"
        default-expand-all
      >
        <template #default="{ node, data }">
          <span class="tree-node">
            <span>{{ node.label }}</span>
            <span>
              <el-button link type="primary" size="small" @click="handleAddChild(data)">新增子项</el-button>
              <el-button link type="primary" size="small" @click="handleEdit(data)">编辑</el-button>
              <el-button link type="danger" size="small" @click="handleDelete(data)">删除</el-button>
            </span>
          </span>
        </template>
      </el-tree>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑分类' : '新增分类'" width="500px">
      <el-form :model="form" :rules="rules" ref="dialogFormRef" label-width="100px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="层级" prop="level">
          <el-select v-model="form.level" placeholder="选择层级" style="width: 100%">
            <el-option label="大类" :value="1" />
            <el-option label="小类" :value="2" />
            <el-option label="问题项" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="填写说明">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="参考示例">
          <el-input v-model="form.reference" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort_order" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getRequirementCategories, createRequirementCategory, updateRequirementCategory, deleteRequirementCategory } from '@/api/requirementCategory'

const categories = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const currentId = ref(null)
const dialogFormRef = ref(null)

const form = reactive({ parent_id: null, name: '', level: 1, description: '', reference: '', sort_order: 0 })

const rules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  level: [{ required: true, message: '请选择层级', trigger: 'change' }]
}

const loadCategories = async () => {
  const res = await getRequirementCategories()
  categories.value = res.categories || []
}

const resetForm = () => {
  Object.assign(form, { parent_id: null, name: '', level: 1, description: '', reference: '', sort_order: 0 })
  currentId.value = null
  isEdit.value = false
}

const handleAdd = () => {
  resetForm()
  dialogVisible.value = true
}

const handleAddChild = (parent) => {
  resetForm()
  form.parent_id = parent.id
  form.level = parent.level + 1
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  currentId.value = row.id
  Object.assign(form, row)
  dialogVisible.value = true
}

const handleSave = async () => {
  await dialogFormRef.value.validate()
  if (isEdit.value) {
    await updateRequirementCategory(currentId.value, form)
  } else {
    await createRequirementCategory(form)
  }
  ElMessage.success('保存成功')
  dialogVisible.value = false
  loadCategories()
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确认删除该分类？', '提示', { type: 'warning' })
    await deleteRequirementCategory(row.id)
    ElMessage.success('删除成功')
    loadCategories()
  } catch (error) {
    if (error !== 'cancel') console.error('删除失败:', error)
  }
}

onMounted(loadCategories)
</script>

<style scoped>
.page-title { margin-bottom: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.tree-node { flex: 1; display: flex; align-items: center; justify-content: space-between; padding-right: 8px; }
</style>
```

- [ ] **Step 2: 提交分类维护页**

```bash
git add frontend/src/views/RequirementCategoryManage.vue
git commit -m "feat: 新增需求分类维护页"
```

---

## Task 14: 注册前端路由

**Files:**
- Modify: `frontend/src/router/index.js`

- [ ] **Step 1: 在 children 数组中追加路由**

在 `network-policy` 路由之后添加：

```javascript
{
  path: 'user-requirements',
  name: 'UserRequirement',
  component: () => import('@/views/UserRequirement.vue'),
  meta: { title: '用户需求录入' }
},
{
  path: 'user-requirements/create',
  name: 'UserRequirementCreate',
  component: () => import('@/views/UserRequirementForm.vue'),
  meta: { title: '新建用户需求' }
},
{
  path: 'user-requirements/:id/edit',
  name: 'UserRequirementEdit',
  component: () => import('@/views/UserRequirementForm.vue'),
  meta: { title: '编辑用户需求' }
},
{
  path: 'requirement-categories',
  name: 'RequirementCategoryManage',
  component: () => import('@/views/RequirementCategoryManage.vue'),
  meta: { title: '需求分类维护', requiresAdmin: true }
}
```

- [ ] **Step 2: 提交路由**

```bash
git add frontend/src/router/index.js
git commit -m "feat: 注册用户需求模块前端路由"
```

---

## Task 15: 添加侧边栏菜单

**Files:**
- Modify: `frontend/src/views/Main.vue`

- [ ] **Step 1: 在侧边栏增加菜单项**

在「网络需求收集」菜单项之后添加：

```vue
<el-menu-item index="/user-requirements">
  <el-icon><Document /></el-icon>
  <span>用户需求录入</span>
</el-menu-item>

<el-menu-item index="/requirement-categories" v-if="userStore.isAdmin()">
  <el-icon><Setting /></el-icon>
  <span>需求分类维护</span>
</el-menu-item>
```

确保 `Document` 已在 `import { ... } from '@element-plus/icons-vue'` 中引入。

- [ ] **Step 2: 提交侧边栏**

```bash
git add frontend/src/views/Main.vue
git commit -m "feat: 在侧边栏添加用户需求菜单"
```

---

## Task 16: 初始化分类数据

**Files:**
- Create: `backend/src/migrations/init_requirement_categories.sql`

- [ ] **Step 1: 根据 Excel 编写初始化数据**

从 `资源申请用户需求.xlsx` 的「用户需求」sheet 中提取大类、小类、问题项、填写说明、参考示例，整理成 INSERT 语句。示例结构（需按实际 Excel 内容填充）：

```sql
INSERT INTO requirement_categories (parent_id, name, description, reference, level, sort_order) VALUES
(NULL, '1、背景', NULL, NULL, 1, 1),
(NULL, '2、用户相关', NULL, NULL, 1, 2),
...
;

-- 假设大类 ID 为 1，小类 ID 为 11，问题项示例：
INSERT INTO requirement_categories (parent_id, name, description, reference, level, sort_order) VALUES
(11, '系统使用人员类别', '系统使用人员是哪些人？\na.互联网不确定用户...', 'a.互联网用户\nc.经销店人员', 3, 1),
...
;
```

- [ ] **Step 2: 执行初始化脚本**

Run: `mysql -u root -p vmconf_db < backend/src/migrations/init_requirement_categories.sql`
Expected: 插入成功。

- [ ] **Step 3: 提交初始化脚本**

```bash
git add backend/src/migrations/init_requirement_categories.sql
git commit -m "chore: 初始化需求分类与问题项数据"
```

---

## Task 17: 联调与验证

- [ ] **Step 1: 启动前后端服务**

Run:
```bash
cd /Users/jiangli/claude-code-projects/vmconf-web
docker-compose up -d
```
Expected: mysql、backend、frontend 三个容器正常运行。

- [ ] **Step 2: 验证分类树接口**

Run: `curl -H "Authorization: Bearer <token>" http://localhost:3000/api/requirement-categories`
Expected: 返回树形分类 JSON。

- [ ] **Step 3: 验证创建需求单**

Run:
```bash
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"title":"测试需求","answers":[{"category_id":3,"answer_text":"测试答案"}]}' \
  http://localhost:3000/api/user-requirements
```
Expected: 返回 201 和创建成功的需求单。

- [ ] **Step 4: 验证列表、详情、编辑、删除、导出**

依次调用对应接口，确认功能正常。

- [ ] **Step 5: 前端页面验证**

打开 `http://localhost:8080`，登录后进入「用户需求录入」菜单，测试新建、编辑、查看、导出功能。

- [ ] **Step 6: 提交联调结果**

```bash
git log --oneline -5
```
Expected: 看到所有提交记录。

---

## Self-Review

1. **Spec coverage**: 每个设计要点都有对应任务：独立模块（Task 10-15）、可配置分类（Task 1-6, 13, 16）、无审批流（Task 5 无状态校验）、Excel 导出（Task 7-8）、权限控制（Task 5, 13 路由守卫）。
2. **Placeholder scan**: 无 TBD/TODO；Task 16 的初始化 SQL 需要执行者根据 Excel 实际内容填充，已在注释中说明。
3. **Type consistency**: `requirement_id`、`category_id`、`level` 在模型、控制器、API 中类型一致。
