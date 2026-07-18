# 用户权限申请模块实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个完整的用户权限申请模块，支持用户创建、编辑、删除权限申请，管理员可查看所有申请

**Architecture:** 基于现有的Express.js + Vue 3架构，复用现有的认证和权限中间件，使用独立数据表存储权限申请，遵循现有CRUD模式

**Tech Stack:** Node.js, Express.js, MySQL, Vue 3, Element Plus

---

## 文件结构概览

### 新增文件
- `backend/src/models/permissionModel.js` - 权限申请数据模型
- `backend/src/controllers/permissionController.js` - 权限申请业务逻辑
- `backend/src/routes/permission.js` - 权限申请路由定义
- `frontend/src/api/permission.js` - 权限申请API客户端
- `frontend/src/views/PermissionRequest.vue` - 权限申请表单页面

### 修改文件
- `backend/server.js` - 添加权限路由
- `frontend/src/router/index.js` - 添加权限申请路由
- `frontend/src/views/Dashboard.vue` - 添加权限申请标签页

---

## Task 1: 创建数据库表

**Files:**
- Database: `permission_requests` table

- [ ] **Step 1: 连接数据库并创建表**

```sql
CREATE TABLE permission_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  domain_account VARCHAR(50) NOT NULL COMMENT '域账号',
  name VARCHAR(100) NOT NULL COMMENT '姓名',
  phone VARCHAR(20) NOT NULL COMMENT '手机号码',
  email VARCHAR(100) COMMENT '邮箱',
  permissions JSON NOT NULL COMMENT '申请的权限列表',
  status ENUM('draft', 'submitted', 'approved', 'rejected') DEFAULT 'draft' COMMENT '状态',
  applicant_id INT NOT NULL COMMENT '申请人ID',
  applicant_name VARCHAR(100) COMMENT '申请人姓名',
  submitted_at DATETIME COMMENT '提交时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_applicant (applicant_id),
  INDEX idx_status (status),
  INDEX idx_submitted_at (submitted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户权限申请表';
```

- [ ] **Step 2: 验证表结构**

```sql
DESCRIBE permission_requests;
SHOW CREATE TABLE permission_requests;
```

Expected: 表结构正确，索引创建成功

---

## Task 2: 创建后端数据模型

**Files:**
- Create: `backend/src/models/permissionModel.js`

- [ ] **Step 1: 创建数据模型文件**

```javascript
const db = require('../config/database');

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
      const [result] = await db.execute(sql, values);
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
      const [rows] = await db.execute(sql, [userId, pageSize, offset]);
      
      // 解析JSON字段
      return rows.map(row => ({
        ...row,
        permissions: JSON.parse(row.permissions)
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
      const [rows] = await db.execute(sql, [pageSize, offset]);
      
      // 解析JSON字段
      return rows.map(row => ({
        ...row,
        permissions: JSON.parse(row.permissions)
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
      const [rows] = await db.execute(sql, [id]);
      if (rows.length === 0) {
        return null;
      }
      
      const row = rows[0];
      return {
        ...row,
        permissions: JSON.parse(row.permissions)
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
      const [result] = await db.execute(sql, values);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('更新权限申请失败: ' + error.message);
    }
  }

  // 删除权限申请
  static async delete(id) {
    const sql = 'DELETE FROM permission_requests WHERE id = ?';
    
    try {
      const [result] = await db.execute(sql, [id]);
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
      const [rows] = await db.execute(sql, params);
      return rows[0].total;
    } catch (error) {
      throw new Error('获取权限申请总数失败: ' + error.message);
    }
  }
}

module.exports = PermissionModel;
```

- [ ] **Step 2: 验证模型文件创建成功**

```bash
ls -la backend/src/models/permissionModel.js
```

Expected: 文件存在

---

## Task 3: 创建后端控制器

**Files:**
- Create: `backend/src/controllers/permissionController.js`

- [ ] **Step 1: 创建控制器文件**

```javascript
const PermissionModel = require('../models/permissionModel');

class PermissionController {
  // 创建权限申请
  static async createRequest(req, res) {
    try {
      const { domain_account, name, phone, email, permissions, status } = req.body;
      
      // 验证必填字段
      if (!domain_account || !name || !phone) {
        return res.status(400).json({
          message: '域账号、姓名、手机号码为必填项'
        });
      }
      
      // 验证手机号格式
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          message: '手机号码格式不正确'
        });
      }
      
      // 验证邮箱格式（如果提供）
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({
            message: '邮箱格式不正确'
          });
        }
      }
      
      // 验证权限选择
      if (!permissions || typeof permissions !== 'object') {
        return res.status(400).json({
          message: '权限选择不能为空'
        });
      }
      
      const permissionTypes = ['iam', 'container', 'pipeline', 'log', 'borui', 'pam', 'gitlab', 'vpn_gitlab'];
      const hasValidPermission = permissionTypes.some(type => permissions[type] === true);
      
      if (!hasValidPermission) {
        return res.status(400).json({
          message: '请至少选择一种权限类型'
        });
      }
      
      const requestData = {
        domain_account,
        name,
        phone,
        email,
        permissions,
        status: status || 'draft',
        applicant_id: req.user.id,
        applicant_name: req.user.username,
        submitted_at: status === 'submitted' ? new Date() : null
      };
      
      const id = await PermissionModel.create(requestData);
      
      const request = await PermissionModel.getById(id);
      
      res.status(201).json({
        message: '权限申请创建成功',
        request
      });
    } catch (error) {
      console.error('创建权限申请失败:', error);
      res.status(500).json({
        message: '创建权限申请失败',
        error: error.message
      });
    }
  }

  // 获取当前用户的权限申请列表
  static async getMyRequests(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 10;
      
      const requests = await PermissionModel.getByUserId(req.user.id, page, pageSize);
      const total = await PermissionModel.getCount(req.user.id);
      
      res.json({
        requests,
        total,
        page,
        pageSize
      });
    } catch (error) {
      console.error('获取权限申请列表失败:', error);
      res.status(500).json({
        message: '获取权限申请列表失败',
        error: error.message
      });
    }
  }

  // 获取所有权限申请列表（管理员）
  static async getAllRequests(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 10;
      
      const requests = await PermissionModel.getAll(page, pageSize);
      const total = await PermissionModel.getCount();
      
      res.json({
        requests,
        total,
        page,
        pageSize
      });
    } catch (error) {
      console.error('获取所有权限申请失败:', error);
      res.status(500).json({
        message: '获取所有权限申请失败',
        error: error.message
      });
    }
  }

  // 获取单个权限申请详情
  static async getRequestById(req, res) {
    try {
      const { id } = req.params;
      const request = await PermissionModel.getById(id);
      
      if (!request) {
        return res.status(404).json({
          message: '权限申请不存在'
        });
      }
      
      // 验证权限：只有申请人和管理员可以查看
      if (request.applicant_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          message: '无权查看此权限申请'
        });
      }
      
      res.json(request);
    } catch (error) {
      console.error('获取权限申请详情失败:', error);
      res.status(500).json({
        message: '获取权限申请详情失败',
        error: error.message
      });
    }
  }

  // 更新权限申请
  static async updateRequest(req, res) {
    try {
      const { id } = req.params;
      const { domain_account, name, phone, email, permissions, status } = req.body;
      
      // 获取现有申请
      const existing = await PermissionModel.getById(id);
      if (!existing) {
        return res.status(404).json({
          message: '权限申请不存在'
        });
      }
      
      // 验证权限：只有申请人可以编辑
      if (existing.applicant_id !== req.user.id) {
        return res.status(403).json({
          message: '无权编辑此权限申请'
        });
      }
      
      // 验证手机号格式（如果提供）
      if (phone) {
        const phoneRegex = /^1[3-9]\d{9}$/;
        if (!phoneRegex.test(phone)) {
          return res.status(400).json({
            message: '手机号码格式不正确'
          });
        }
      }
      
      // 验证邮箱格式（如果提供）
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({
            message: '邮箱格式不正确'
          });
        }
      }
      
      // 验证权限选择（如果提供）
      if (permissions) {
        const permissionTypes = ['iam', 'container', 'pipeline', 'log', 'borui', 'pam', 'gitlab', 'vpn_gitlab'];
        const hasValidPermission = permissionTypes.some(type => permissions[type] === true);
        
        if (!hasValidPermission) {
          return res.status(400).json({
            message: '请至少选择一种权限类型'
          });
        }
      }
      
      const updateData = {};
      if (domain_account !== undefined) updateData.domain_account = domain_account;
      if (name !== undefined) updateData.name = name;
      if (phone !== undefined) updateData.phone = phone;
      if (email !== undefined) updateData.email = email;
      if (permissions !== undefined) updateData.permissions = permissions;
      if (status !== undefined) {
        updateData.status = status;
        updateData.submitted_at = status === 'submitted' ? new Date() : null;
      }
      
      await PermissionModel.update(id, updateData);
      
      const request = await PermissionModel.getById(id);
      
      res.json({
        message: '权限申请更新成功',
        request
      });
    } catch (error) {
      console.error('更新权限申请失败:', error);
      res.status(500).json({
        message: '更新权限申请失败',
        error: error.message
      });
    }
  }

  // 删除权限申请
  static async deleteRequest(req, res) {
    try {
      const { id } = req.params;
      
      // 获取现有申请
      const existing = await PermissionModel.getById(id);
      if (!existing) {
        return res.status(404).json({
          message: '权限申请不存在'
        });
      }
      
      // 验证权限：只有申请人可以删除
      if (existing.applicant_id !== req.user.id) {
        return res.status(403).json({
          message: '无权删除此权限申请'
        });
      }
      
      await PermissionModel.delete(id);
      
      res.json({
        message: '权限申请删除成功'
      });
    } catch (error) {
      console.error('删除权限申请失败:', error);
      res.status(500).json({
        message: '删除权限申请失败',
        error: error.message
      });
    }
  }

  // 更新申请状态（管理员）
  static async updateRequestStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status || !['draft', 'submitted', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          message: '无效的状态值'
        });
      }
      
      await PermissionModel.update(id, { status });
      
      const request = await PermissionModel.getById(id);
      
      res.json({
        message: '状态更新成功',
        request
      });
    } catch (error) {
      console.error('更新状态失败:', error);
      res.status(500).json({
        message: '更新状态失败',
        error: error.message
      });
    }
  }
}

module.exports = PermissionController;
```

- [ ] **Step 2: 验证控制器文件创建成功**

```bash
ls -la backend/src/controllers/permissionController.js
```

Expected: 文件存在

---

## Task 4: 创建后端路由

**Files:**
- Create: `backend/src/routes/permission.js`
- Modify: `backend/server.js`

- [ ] **Step 1: 创建路由文件**

```javascript
const express = require('express');
const router = express.Router();
const PermissionController = require('../controllers/permissionController');
const { authenticate, isAdmin } = require('../middleware/auth');

// 创建权限申请
router.post('/', authenticate, PermissionController.createRequest);

// 获取当前用户的权限申请列表 (必须在 /:id 之前)
router.get('/my', authenticate, PermissionController.getMyRequests);

// 获取所有权限申请列表(仅管理员) (必须在 /:id 之前)
router.get('/', authenticate, isAdmin, PermissionController.getAllRequests);

// 更新申请状态(仅管理员) - 必须在 /:id 之前
router.put('/:id/status', authenticate, isAdmin, PermissionController.updateRequestStatus);

// 获取单个权限申请详情
router.get('/:id', authenticate, PermissionController.getRequestById);

// 更新权限申请
router.put('/:id', authenticate, PermissionController.updateRequest);

// 删除权限申请
router.delete('/:id', authenticate, PermissionController.deleteRequest);

module.exports = router;
```

- [ ] **Step 2: 修改服务器主文件添加路由**

```javascript
// 在 backend/server.js 的路由部分添加
app.use('/api/permission', require('./src/routes/permission'));
```

位置：在 `app.use('/api/container', require('./src/routes/container'));` 之后

- [ ] **Step 3: 验证路由配置**

```bash
cd backend && node server.js &
sleep 3
curl -X GET http://localhost:3000/api/permission/my
pkill -f "node server.js"
```

Expected: 返回401未授权错误（证明路由已注册）

---

## Task 5: 创建前端API文件

**Files:**
- Create: `frontend/src/api/permission.js`

- [ ] **Step 1: 创建API文件**

```javascript
import request from './request'

// 创建权限申请
export const createPermissionRequest = (data) => {
  return request.post('/api/permission/', data)
}

// 获取当前用户的权限申请列表
export const getMyPermissionRequests = (params) => {
  return request.get('/api/permission/my', { params })
}

// 获取所有权限申请列表（管理员）
export const getAllPermissionRequests = (params) => {
  return request.get('/api/permission/', { params })
}

// 获取单个权限申请详情
export const getPermissionRequestById = (id) => {
  return request.get(`/api/permission/${id}`)
}

// 更新权限申请
export const updatePermissionRequest = (id, data) => {
  return request.put(`/api/permission/${id}`, data)
}

// 删除权限申请
export const deletePermissionRequest = (id) => {
  return request.delete(`/api/permission/${id}`)
}

// 更新申请状态
export const updatePermissionRequestStatus = (id, status) => {
  return request.put(`/api/permission/${id}/status`, { status })
}
```

- [ ] **Step 2: 验证API文件创建成功**

```bash
ls -la frontend/src/api/permission.js
```

Expected: 文件存在

---

## Task 6: 创建权限申请表单页面

**Files:**
- Create: `frontend/src/views/PermissionRequest.vue`

- [ ] **Step 1: 创建表单页面组件**

```vue
<template>
  <div class="permission-request">
    <div class="page-header">
      <h2 class="page-title">{{ pageTitle }}</h2>
      <div class="user-info" v-if="userStore.user">
        <span class="user-name">申请人: {{ userStore.user.username }}</span>
      </div>
    </div>

    <el-card class="form-card">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
        <el-form-item label="域账号" prop="domain_account">
          <el-input 
            v-model="form.domain_account" 
            placeholder="请输入域账号"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
        
        <el-form-item label="姓名" prop="name">
          <el-input 
            v-model="form.name" 
            placeholder="请输入姓名"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        
        <el-form-item label="手机号码" prop="phone">
          <el-input 
            v-model="form.phone" 
            placeholder="请输入手机号码（11位数字）"
            maxlength="11"
          />
        </el-form-item>
        
        <el-form-item label="邮箱" prop="email">
          <el-input 
            v-model="form.email" 
            placeholder="请输入邮箱（选填）"
          />
        </el-form-item>
        
        <el-form-item label="申请权限" prop="permissions">
          <el-checkbox-group v-model="selectedPermissions">
            <el-checkbox label="iam">IAM权限</el-checkbox>
            <el-checkbox label="container">容器平台</el-checkbox>
            <el-checkbox label="pipeline">流水线</el-checkbox>
            <el-checkbox label="log">日志平台</el-checkbox>
            <el-checkbox label="borui">博睿平台</el-checkbox>
            <el-checkbox label="pam">PAM权限</el-checkbox>
            <el-checkbox label="gitlab">GitLab代码库</el-checkbox>
            <el-checkbox label="vpn_gitlab">VPN访问GitLab</el-checkbox>
          </el-checkbox-group>
          <div class="form-tip">
            <el-text type="info" size="small">至少选择一种权限类型</el-text>
          </div>
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="loading">
            提交申请
          </el-button>
          <el-button @click="handleSaveDraft" :loading="loading">
            保存草稿
          </el-button>
          <el-button @click="handleCancel">
            取消
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import {
  createPermissionRequest,
  getPermissionRequestById,
  updatePermissionRequest
} from '@/api/permission'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const formRef = ref(null)
const loading = ref(false)
const isEdit = ref(false)
const editId = ref(null)

const selectedPermissions = ref([])

const form = reactive({
  domain_account: '',
  name: '',
  phone: '',
  email: '',
  permissions: {}
})

const pageTitle = computed(() => isEdit.value ? '编辑权限申请' : '新建权限申请')

// 权限对象
const permissionsObject = computed(() => {
  const perms = {
    iam: false,
    container: false,
    pipeline: false,
    log: false,
    borui: false,
    pam: false,
    gitlab: false,
    vpn_gitlab: false
  }
  
  selectedPermissions.value.forEach(key => {
    if (perms.hasOwnProperty(key)) {
      perms[key] = true
    }
  })
  
  return perms
})

// 表单验证规则
const rules = {
  domain_account: [
    { required: true, message: '请输入域账号', trigger: 'blur' },
    { min: 1, max: 50, message: '域账号长度在1-50个字符', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 1, max: 100, message: '姓名长度在1-100个字符', trigger: 'blur' },
    { pattern: /^[\u4e00-\u9fa5a-zA-Z]+$/, message: '姓名只能包含中文和英文', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号码', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码格式', trigger: 'blur' }
  ],
  email: [
    { 
      validator: (rule, value, callback) => {
        if (!value) {
          callback()
          return
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) {
          callback(new Error('请输入正确的邮箱格式'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  permissions: [
    { 
      validator: (rule, value, callback) => {
        if (selectedPermissions.value.length === 0) {
          callback(new Error('请至少选择一种权限类型'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ]
}

// 加载编辑数据
const loadEditData = async () => {
  try {
    const response = await getPermissionRequestById(editId.value)
    
    form.domain_account = response.domain_account
    form.name = response.name
    form.phone = response.phone
    form.email = response.email || ''
    
    // 设置选中的权限
    selectedPermissions.value = Object.keys(response.permissions).filter(
      key => response.permissions[key] === true
    )
  } catch (error) {
    console.error('加载申请数据失败:', error)
    ElMessage.error('加载申请数据失败')
    router.push('/dashboard')
  }
}

// 提交申请
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    
    await ElMessageBox.confirm(
      '确定要提交此权限申请吗？',
      '提交确认',
      {
        confirmButtonText: '确定提交',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    
    loading.value = true
    
    const requestData = {
      domain_account: form.domain_account,
      name: form.name,
      phone: form.phone,
      email: form.email,
      permissions: permissionsObject.value,
      status: 'submitted'
    }
    
    if (isEdit.value) {
      await updatePermissionRequest(editId.value, requestData)
      ElMessage.success('权限申请更新成功')
    } else {
      await createPermissionRequest(requestData)
      ElMessage.success('权限申请提交成功')
    }
    
    router.push('/dashboard')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('提交失败:', error)
      ElMessage.error('提交失败: ' + (error.response?.data?.message || error.message))
    }
  } finally {
    loading.value = false
  }
}

// 保存草稿
const handleSaveDraft = async () => {
  try {
    await formRef.value.validate()
    
    loading.value = true
    
    const requestData = {
      domain_account: form.domain_account,
      name: form.name,
      phone: form.phone,
      email: form.email,
      permissions: permissionsObject.value,
      status: 'draft'
    }
    
    if (isEdit.value) {
      await updatePermissionRequest(editId.value, requestData)
      ElMessage.success('草稿保存成功')
    } else {
      await createPermissionRequest(requestData)
      ElMessage.success('草稿创建成功')
    }
    
    router.push('/dashboard')
  } catch (error) {
    console.error('保存草稿失败:', error)
    ElMessage.error('保存草稿失败: ' + (error.response?.data?.message || error.message))
  } finally {
    loading.value = false
  }
}

// 取消
const handleCancel = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要取消吗？未保存的数据将丢失。',
      '取消确认',
      {
        confirmButtonText: '确定取消',
        cancelButtonText: '继续编辑',
        type: 'warning'
      }
    )
    
    router.push('/dashboard')
  } catch (error) {
    // 用户选择继续编辑
  }
}

onMounted(() => {
  if (!userStore.user) {
    userStore.loadUserFromStorage()
  }
  
  // 检查是否是编辑模式
  if (route.query.edit && route.query.id) {
    isEdit.value = true
    editId.value = parseInt(route.query.id)
    loadEditData()
  }
})
</script>

<style scoped>
.permission-request {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.user-info {
  margin: 8px 0 0 0;
  font-size: 14px;
  color: #606266;
}

.user-name {
  font-weight: 500;
}

.form-card {
  margin-top: 20px;
}

.form-tip {
  margin-top: 8px;
}

.el-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

:deep(.el-checkbox) {
  margin-right: 0;
}
</style>
```

- [ ] **Step 2: 验证组件文件创建成功**

```bash
ls -la frontend/src/views/PermissionRequest.vue
```

Expected: 文件存在

---

## Task 7: 添加前端路由配置

**Files:**
- Modify: `frontend/src/router/index.js`

- [ ] **Step 1: 在路由配置中添加权限申请路由**

```javascript
// 在 frontend/src/router/index.js 的 children 数组中添加
{
  path: 'permission-request',
  name: 'PermissionRequest',
  component: () => import('@/views/PermissionRequest.vue'),
  meta: { title: '权限申请' }
}
```

位置：在 `path: 'sfs-request'` 之后

- [ ] **Step 2: 验证路由配置**

```bash
cd frontend && npm run build
```

Expected: 构建成功，无路由错误

---

## Task 8: 修改Dashboard页面

**Files:**
- Modify: `frontend/src/views/Dashboard.vue`

- [ ] **Step 1: 在Dashboard中添加权限申请相关代码**

首先在script setup部分添加导入：

```javascript
import {
  getMyPermissionRequests,
  getAllPermissionRequests,
  deletePermissionRequest
} from '@/api/permission'
```

在data定义部分添加：

```javascript
const permissionRequests = ref([])
```

在stats对象中添加：

```javascript
const stats = reactive({
  container: 0,
  vm: 0,
  obs: 0,
  sfs: 0,
  permission: 0
})
```

在totalRequests计算属性中更新：

```javascript
const totalRequests = computed(() => {
  return stats.container + stats.vm + stats.obs + stats.sfs + stats.permission
})
```

添加权限标签获取函数：

```javascript
// 获取权限标签
const getPermissionLabels = (permissions) => {
  const labels = []
  const permissionNames = {
    iam: 'IAM权限',
    container: '容器平台',
    pipeline: '流水线',
    log: '日志平台',
    borui: '博睿平台',
    pam: 'PAM权限',
    gitlab: 'GitLab代码库',
    vpn_gitlab: 'VPN访问GitLab'
  }
  
  Object.keys(permissions).forEach(key => {
    if (permissions[key] === true && permissionNames[key]) {
      labels.push(permissionNames[key])
    }
  })
  
  return labels
}
```

添加加载权限申请函数：

```javascript
// 加载权限申请
const loadPermissionRequests = async () => {
  try {
    const response = userStore.isAdmin()
      ? await getAllPermissionRequests({ page: 1, pageSize: 1000 })
      : await getMyPermissionRequests({ page: 1, pageSize: 1000 })

    permissionRequests.value = response.requests || []
    stats.permission = permissionRequests.value.length
  } catch (error) {
    console.error('加载权限申请失败:', error)
  }
}
```

添加编辑权限申请函数：

```javascript
// 编辑权限申请
const editPermissionRequest = (request) => {
  router.push({
    path: '/permission-request',
    query: { edit: true, id: request.id }
  })
}
```

添加删除权限申请函数：

```javascript
// 删除权限申请
const deletePermissionRequest = async (request) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除 ${request.name} (${request.domain_account}) 的权限申请吗？此操作不可恢复！`,
      '删除权限申请',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await deletePermissionRequest(request.id)
    ElMessage.success('删除成功')
    await loadPermissionRequests()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}
```

在onMounted中添加权限申请加载：

```javascript
await Promise.all([
  loadContainerRequests(),
  loadVMRequests(),
  loadObsRequests(),
  loadSfsRequests(),
  loadPermissionRequests()
])
```

在tab激活逻辑中添加权限判断：

```javascript
if (stats.container > 0) {
  activeTab.value = 'container'
} else if (stats.vm > 0) {
  activeTab.value = 'vm'
} else if (stats.obs > 0) {
  activeTab.value = 'obs'
} else if (stats.sfs > 0) {
  activeTab.value = 'sfs'
} else if (stats.permission > 0) {
  activeTab.value = 'permission'
}
```

- [ ] **Step 2: 添加权限申请标签页HTML**

在template的el-tabs中添加：

```vue
<!-- 权限申请 -->
<el-tab-pane v-if="permissionRequests.length > 0" label="权限申请" name="permission">
  <div class="tab-content">
    <div class="search-bar">
      <el-input
        v-model="searchText.permission"
        placeholder="搜索域账号或姓名"
        clearable
        style="width: 300px"
        @input="handleSearch('permission')"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button @click="loadPermissionRequests">刷新</el-button>
    </div>

    <el-table :data="filteredPermissionRequests" border stripe style="width: 100%">
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="domain_account" label="域账号" width="120" align="center" />
      <el-table-column prop="name" label="姓名" width="100" align="center" />
      <el-table-column prop="phone" label="手机号码" width="120" align="center" />
      <el-table-column prop="email" label="邮箱" width="150" align="center" show-overflow-tooltip />
      <el-table-column label="申请权限" width="300" align="center">
        <template #default="scope">
          <el-tag 
            v-for="perm in getPermissionLabels(scope.row.permissions)" 
            :key="perm" 
            size="small" 
            style="margin: 2px;"
          >
            {{ perm }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="80" align="center">
        <template #default="scope">
          <el-tag :type="getStatusType(scope.row.status)" size="small">
            {{ getStatusText(scope.row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="submitted_at" label="提交时间" width="140" align="center">
        <template #default="scope">
          {{ formatDateTime(scope.row.submitted_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" align="center" fixed="right">
        <template #default="scope">
          <el-button type="primary" size="small" @click="editPermissionRequest(scope.row)">
            编辑
          </el-button>
          <el-button size="small" type="danger" @click="deletePermissionRequest(scope.row)">
            删除
          </el-button>
        </template>
      </el-table-column>
      <el-table-column prop="applicant_name" label="申请人" width="90" align="center" fixed="right">
        <template #default="scope">
          {{ scope.row.applicant_name }}
        </template>
      </el-table-column>
    </el-table>
  </div>
</el-tab-pane>
```

在stats-bar中添加权限统计：

```vue
<div class="stat-item" v-if="stats.permission > 0">
  <span class="stat-label">权限申请：</span>
  <span class="stat-value">{{ stats.permission }}</span>
</div>
```

- [ ] **Step 3: 添加过滤逻辑**

在computed中添加：

```javascript
const filteredPermissionRequests = computed(() => {
  if (!searchText.permission) return permissionRequests.value
  const search = searchText.permission.toLowerCase()
  return permissionRequests.value.filter(req =>
    req.domain_account?.toLowerCase().includes(search) ||
    req.name?.toLowerCase().includes(search)
  )
})
```

在searchText对象中添加：

```javascript
const searchText = reactive({
  vm: '',
  container: '',
  obs: '',
  sfs: '',
  permission: ''
})
```

---

## Task 9: 添加Dashboard导航入口

**Files:**
- Modify: `frontend/src/views/Dashboard.vue`

- [ ] **Step 1: 在页面顶部添加新建权限申请按钮**

在page-header之后添加：

```vue
<div class="action-bar">
  <el-button type="primary" @click="goToPermissionRequest">
    <el-icon><Plus /></el-icon>
    新建权限申请
  </el-button>
</div>
```

- [ ] **Step 2: 添加跳转函数**

在script setup中添加：

```javascript
// 跳转到权限申请页面
const goToPermissionRequest = () => {
  router.push('/permission-request')
}
```

- [ ] **Step 3: 添加样式**

在style中添加：

```css
.action-bar {
  margin-bottom: 20px;
}
```

---

## Task 10: 测试功能完整性

**Files:**
- Test: All implemented components

- [ ] **Step 1: 启动后端服务**

```bash
cd backend
npm start
```

Expected: 服务器在3000端口启动

- [ ] **Step 2: 启动前端服务**

```bash
cd frontend
npm run dev
```

Expected: 前端开发服务器启动

- [ ] **Step 3: 测试权限申请创建流程**

1. 登录系统
2. 在Dashboard点击"新建权限申请"
3. 填写表单：
   - 域账号: testuser
   - 姓名: 测试用户
   - 手机号: 13800138000
   - 邮箱: test@example.com
   - 权限选择: IAM权限、容器平台
4. 点击"提交申请"

Expected: 成功创建申请，跳转回Dashboard，显示新创建的权限申请

- [ ] **Step 4: 测试表单验证**

1. 新建权限申请
2. 不填写任何字段，点击"提交申请"
3. 测试各种无效输入：
   - 无效手机号: 12345
   - 无效邮箱: invalid-email
   - 不选择任何权限

Expected: 显示相应的验证错误提示

- [ ] **Step 5: 测试编辑功能**

1. 在Dashboard权限申请标签页点击"编辑"按钮
2. 修改表单内容
3. 点击"提交申请"

Expected: 成功更新申请，显示更新后的内容

- [ ] **Step 6: 测试删除功能**

1. 在Dashboard权限申请标签页点击"删除"按钮
2. 在确认对话框中点击"确定删除"

Expected: 成功删除申请，列表中不再显示

- [ ] **Step 7: 测试搜索功能**

1. 在权限申请列表的搜索框输入域账号或姓名
2. 验证过滤结果

Expected: 只显示匹配的申请记录

- [ ] **Step 8: 测试权限控制**

1. 以普通用户登录
2. 尝试访问其他用户的申请详情
3. 验证只能查看和编辑自己的申请

Expected: 无法访问其他用户的申请

- [ ] **Step 9: 测试管理员功能**

1. 以管理员登录
2. 查看Dashboard中的权限申请标签页
3. 验证可以看到所有用户的申请

Expected: 显示所有权限申请记录

- [ ] **Step 10: 测试草稿功能**

1. 新建权限申请
2. 填写表单内容
3. 点击"保存草稿"

Expected: 成功创建草稿状态的申请，显示为"草稿"标签

---

## Task 11: 验证数据库完整性

**Files:**
- Database: `permission_requests` table

- [ ] **Step 1: 验证表结构**

```sql
DESCRIBE permission_requests;
```

Expected: 表结构包含所有必需字段

- [ ] **Step 2: 验证索引创建**

```sql
SHOW INDEX FROM permission_requests;
```

Expected: 显示applicant_id、status、submitted_at索引

- [ ] **Step 3: 验证数据完整性**

```sql
SELECT id, domain_account, name, phone, email, permissions, status, applicant_id, applicant_name, submitted_at, created_at, updated_at
FROM permission_requests
LIMIT 5;
```

Expected: 显示测试数据，JSON字段正确解析

- [ ] **Step 4: 验证权限选择JSON格式**

```sql
SELECT 
  id,
  domain_account,
  JSON_EXTRACT(permissions, '$.iam') as iam_permission,
  JSON_EXTRACT(permissions, '$.container') as container_permission
FROM permission_requests
LIMIT 5;
```

Expected: JSON字段正确存储和查询

---

## 验证清单

完成所有任务后，请验证以下功能点：

### 功能完整性
- [x] 用户可以创建权限申请
- [x] 用户可以编辑权限申请（任何状态）
- [x] 用户可以删除权限申请（任何状态）
- [x] 用户可以查看自己的权限申请列表
- [x] 管理员可以查看所有权限申请
- [x] 表单验证正常工作
- [x] 权限选择至少一个验证
- [x] 手机号和邮箱格式验证
- [x] 搜索过滤功能
- [x] 草稿和提交状态管理

### 权限控制
- [x] 普通用户只能管理自己的申请
- [x] 管理员可以查看所有申请
- [x] 未登录用户无法访问

### 数据完整性
- [x] 数据库表结构正确
- [x] JSON字段正确存储和解析
- [x] 索引正确创建
- [x] 时间戳正确记录

### 用户体验
- [x] Dashboard集成显示
- [x] 路由跳转流畅
- [x] 错误提示友好
- [x] 加载状态显示
- [x] 确认对话框保护

---

**实施计划版本**: 1.0  
**创建日期**: 2026-06-02  
**预计完成时间**: 按顺序执行所有任务
