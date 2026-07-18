# 用户权限申请模块设计文档

**日期**: 2026-06-02  
**状态**: 设计阶段  
**类型**: 新功能开发

## 1. 项目概述

### 1.1 目标
在现有的资源申请管理系统中新增用户权限申请模块，支持用户申请各种平台权限。

### 1.2 核心需求
- **申请字段**: 域账号*、姓名*、手机号码*、邮箱（选填）
- **权限类型**: IAM权限、容器平台、流水线、日志平台、博睿平台、PAM权限、GitLab代码库、VPN访问GitLab代码库
- **无审批流程**: 提交即完成
- **全状态编辑删除**: 任何状态下都可以编辑和删除
- **权限控制**: 用户管理自己的申请，管理员查看所有申请
- **严格验证**: 表单字段严格验证格式和必填项

## 2. 架构设计

### 2.1 整体架构
```
┌─────────────────────────────────────────────────────┐
│                    前端 (Vue 3)                      │
├─────────────────────────────────────────────────────┤
│  Dashboard.vue (添加权限申请标签页)                   │
│  PermissionRequest.vue (新建表单页面)                 │
└─────────────────────────────────────────────────────┘
                        ↓ API调用
┌─────────────────────────────────────────────────────┐
│              后端 (Express.js)                       │
├─────────────────────────────────────────────────────┤
│  /api/permission 路由                               │
│  permissionController 控制器                         │
│  permissionModel 数据模型                            │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│              数据库 (MySQL)                          │
├─────────────────────────────────────────────────────┤
│  permission_requests 表                             │
└─────────────────────────────────────────────────────┘
```

### 2.2 设计原则
- **遵循现有模式**: 复用vm-request、container-request的成熟模式
- **数据隔离**: 使用独立表存储，不与其他申请混在一起
- **权限控制**: 用户只能管理自己的申请，管理员可查看所有
- **无需审批**: 提交即完成，简化流程

## 3. 数据库设计

### 3.1 表结构
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

### 3.2 permissions JSON字段
```json
{
  "iam": true,
  "container": true, 
  "pipeline": false,
  "log": false,
  "borui": false,
  "pam": false,
  "gitlab": false,
  "vpn_gitlab": false
}
```

### 3.3 字段验证规则
- **domain_account**: 必填，最大长度50字符
- **name**: 必填，最大长度100字符，仅允许中文、英文
- **phone**: 必填，手机号格式验证（11位数字，1开头）
- **email**: 非必填，邮箱格式验证
- **permissions**: 至少选择一个权限类型

### 3.4 状态说明
- **draft**: 草稿状态（用户编辑中）
- **submitted**: 已提交（无需审批，直接显示为已提交）
- **approved**: 已通过（预留状态，保持与其他申请表一致）
- **rejected**: 已拒绝（预留状态，保持与其他申请表一致）

### 3.5 编辑删除策略
- **编辑权限**: 申请人可以编辑自己提交的任何状态的申请
- **删除权限**: 申请人可以删除自己提交的任何状态的申请
- **查看权限**: 普通用户查看自己的申请，管理员查看所有申请
- **状态作用**: 仅用于记录和分类展示，不控制编辑/删除权限

## 4. API设计

### 4.1 路由定义
所有路由基于 `/api/permission` 前缀：

### POST /api/permission/
创建权限申请
- **Body**: `{ domain_account, name, phone, email, permissions }`
- **Response**: `{ id, ...申请数据 }`
- **权限**: 需要登录

### GET /api/permission/my
获取当前用户的权限申请列表
- **Query**: `?page=1&pageSize=10`
- **Response**: `{ requests: [], total }`
- **权限**: 需要登录

### GET /api/permission/
获取所有权限申请列表（管理员）
- **Query**: `?page=1&pageSize=10`
- **Response**: `{ requests: [], total }`
- **权限**: 仅管理员

### GET /api/permission/:id
获取单个权限申请详情
- **Response**: 申请详情对象
- **权限**: 申请人本人或管理员

### PUT /api/permission/:id
更新权限申请
- **Body**: `{ domain_account, name, phone, email, permissions, status }`
- **Response**: 更新后的申请对象
- **权限**: 申请人本人（任何状态）

### DELETE /api/permission/:id
删除权限申请
- **Response**: `{ message: '删除成功' }`
- **权限**: 申请人本人（任何状态）

### PUT /api/permission/:id/status
更新申请状态（预留接口）
- **Body**: `{ status }`
- **Response**: 更新后的申请对象
- **权限**: 仅管理员

### 4.2 API特点
- **RESTful设计**: 遵循现有API规范
- **权限验证**: 中间件验证用户身份和所有权
- **灵活查询**: 支持分页和筛选
- **统一响应**: 与其他API保持一致的响应格式

## 5. 前端设计

### 5.1 页面结构

#### Dashboard.vue 修改
添加权限申请标签页：
```vue
<el-tab-pane v-if="permissionRequests.length > 0" label="权限申请" name="permission">
  <div class="tab-content">
    <div class="search-bar">
      <el-input v-model="searchText.permission" placeholder="搜索域账号或姓名" />
      <el-button @click="loadPermissionRequests">刷新</el-button>
    </div>
    
    <el-table :data="filteredPermissionRequests">
      <el-table-column prop="domain_account" label="域账号" width="120" />
      <el-table-column prop="name" label="姓名" width="100" />
      <el-table-column prop="phone" label="手机号码" width="120" />
      <el-table-column prop="email" label="邮箱" width="150" />
      <el-table-column label="申请权限" width="200">
        <template #default="scope">
          <el-tag v-for="perm in getPermissionLabels(scope.row.permissions)" 
                  :key="perm" size="small" style="margin: 2px;">
            {{ perm }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="80">
        <template #default="scope">
          <el-tag :type="getStatusType(scope.row.status)" size="small">
            {{ getStatusText(scope.row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="submitted_at" label="提交时间" width="140" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="scope">
          <el-button size="small" @click="editPermissionRequest(scope.row)">编辑</el-button>
          <el-button size="small" type="danger" @click="deletePermissionRequest(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</el-tab-pane>
```

#### 新建 PermissionRequest.vue 页面
权限申请表单页面，包含：
- 域账号输入（必填）
- 姓名输入（必填）
- 手机号码输入（必填，格式验证）
- 邮箱输入（选填，格式验证）
- 权限类型多选框（必选至少一个）
- 提交/保存草稿/取消按钮

### 5.2 路由配置
在 `frontend/src/router/index.js` 中添加：
```javascript
{
  path: 'permission-request',
  name: 'PermissionRequest', 
  component: () => import('@/views/PermissionRequest.vue'),
  meta: { title: '权限申请' }
}
```

### 5.3 主要功能实现
- **表单验证**: 严格验证必填字段和格式
- **权限标签**: 将JSON权限数组转换为可读标签
- **搜索过滤**: 支持按域账号和姓名搜索
- **编辑/删除**: 任何状态都可操作
- **状态管理**: 草稿、已提交状态切换

## 6. 数据流程

### 6.1 用户操作流程
```
用户进入Dashboard
    ├─→ 查看现有申请
    └─→ 点击"新建权限申请"
           ↓
       填写申请表单
           ├─→ 保存草稿 (status=draft)
           └─→ 提交申请 (status=submitted)
                  ↓
            返回Dashboard查看申请列表
                  ├─→ 编辑申请
                  └─→ 删除申请
```

### 6.2 错误处理策略

#### 前端错误处理
- **表单验证错误**: 实时显示字段错误提示
- **API调用失败**: 显示错误消息，保留用户输入
- **网络错误**: 显示网络异常提示，提供重试按钮
- **权限错误**: 跳转登录页面

#### 后端错误处理
- **参数验证**: 400 Bad Request + 详细错误信息
- **认证失败**: 401 Unauthorized
- **权限不足**: 403 Forbidden  
- **资源不存在**: 404 Not Found
- **服务器错误**: 500 Internal Server Error

### 6.3 数据一致性保证
- **删除确认**: 前端弹窗确认，防止误删
- **编辑冲突**: 使用乐观锁，检测数据更新时间
- **事务处理**: 数据库操作使用事务，保证原子性
- **日志记录**: 关键操作记录审计日志

## 7. 文件结构

### 7.1 新增文件

#### 后端文件
```
backend/
├── src/
│   ├── routes/
│   │   └── permission.js              # 权限申请路由
│   ├── controllers/
│   │   └── permissionController.js    # 权限申请控制器
│   └── models/
│       └── permissionModel.js         # 权限申请数据模型
```

#### 前端文件
```
frontend/
├── src/
│   ├── views/
│   │   └── PermissionRequest.vue      # 权限申请表单页面
│   └── api/
│       └── permission.js              # 权限申请API接口
```

### 7.2 修改文件
```
backend/
└── server.js                           # 添加权限路由

frontend/
├── src/
│   ├── router/
│   │   └── index.js                   # 添加权限申请路由
│   └── views/
│       └── Dashboard.vue              # 添加权限申请标签页
```

### 7.3 复用现有组件
- **Element Plus组件**: el-form, el-table, el-dialog等
- **用户认证**: useUserStore状态管理
- **工具函数**: formatDateTime, getStatusType等
- **样式模式**: 复用现有CSS类和布局

## 8. 测试策略

### 8.1 功能测试
- ✓ 创建权限申请（草稿和提交）
- ✓ 编辑权限申请（各状态下）
- ✓ 删除权限申请（各状态下）
- ✓ 查看权限列表（用户和管理员视角）
- ✓ 表单验证（必填字段、格式验证）
- ✓ 权限选择（至少选择一个）
- ✓ 搜索过滤功能

### 8.2 权限测试
- ✓ 普通用户只能管理自己的申请
- ✓ 管理员可以查看所有申请
- ✓ 未登录用户无法访问
- ✓ 用户无法编辑/删除他人申请

### 8.3 边界测试
- ✓ 空权限选择处理
- ✓ 超长字段处理
- ✓ 无效手机号/邮箱格式
- ✓ 并发编辑处理

### 8.4 集成测试
- ✓ Dashboard集成显示
- ✓ 路由跳转正常
- ✓ API调用链路完整

## 9. 部署计划

### 9.1 开发阶段
1. **数据库准备**: 创建permission_requests表
2. **后端开发**: 实现模型、控制器、路由
3. **前端开发**: 实现页面、API、路由配置
4. **测试验证**: 功能测试、权限测试、集成测试

### 9.2 部署步骤
1. **数据库部署**: 执行建表SQL
2. **后端部署**: 部署新的后端代码
3. **前端部署**: 构建并部署前端代码
4. **生产验证**: 验证功能正常运行

## 10. 风险和约束

### 10.1 技术风险
- **数据一致性**: 使用独立表可能增加查询复杂度
- **权限管理**: 需要确保权限验证的完整性

### 10.2 约束条件
- **现有架构**: 必须遵循现有的前后端架构模式
- **用户体验**: 保持与现有申请模块的一致性
- **数据迁移**: 当前不需要历史数据迁移

## 11. 未来扩展

### 11.1 潜在功能
- 权限申请详情页面
- 权限申请统计和报表
- 权限申请审批流程（如需要）
- 权限申请导出功能

### 11.2 优化方向
- 权限类型动态配置
- 表单字段可配置化
- 批量操作支持

---

**设计文档版本**: 1.0  
**最后更新**: 2026-06-02  
**下一步**: 编写实施计划
