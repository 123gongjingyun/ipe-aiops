# 虚拟机申请导出功能修复报告

## 问题描述
用户发现虚拟机申请有9条记录，但导出只有3条记录。用户期望管理员导出所有记录，普通用户只导出自己账号下的记录。

## 问题分析

### 数据库表结构问题
经过详细检查发现，系统中存在两个不同的表：

1. **`resource_requests`表** - 9条记录
   - 这是传统资源申请表，通过"创建资源申请"功能创建
   - 包含各种类型的资源申请（MySQL、RabbitMQ、Redis、Kafka等）

2. **`vm_requests`表** - 3条记录
   - 这是专门的虚拟机申请表
   - 只包含虚拟机相关的申请记录

### Dashboard页面显示错误
Dashboard页面错误地将`resource_requests`表的数据显示为"虚拟机申请"，而不是从`vm_requests`表获取数据。这导致了以下问题：

1. **界面显示混乱** - Dashboard显示9条虚拟机申请，但实际vm_requests表只有3条
2. **导出数据不一致** - 导出功能正确地从vm_requests表获取数据（3条），但界面显示的是resource_requests表的数据（9条）

### 根本原因
Dashboard.vue中的`loadVMRequests`函数使用了错误的API：
```javascript
// 错误的API调用
const response = userStore.isAdmin()
  ? await getAllVMRequests({ page: 1, pageSize: 1000 })  // 实际调用的是/resource_requests
  : await getMyRequests({ page: 1, pageSize: 1000 })    // 实际调用的是/resource_requests/my
```

## 解决方案

### 1. 创建虚拟机申请专用API
创建了专门的虚拟机申请API文件和控制器：

**前端API文件**: `frontend/src/api/vmRequest.js`
- `getMyVMRequests()` - 获取当前用户的虚拟机申请
- `getAllVMRequestsList()` - 获取所有虚拟机申请（管理员）
- `createVMRequest()` - 创建虚拟机申请
- `updateVMRequest()` - 更新虚拟机申请
- `deleteVMRequest()` - 删除虚拟机申请

**后端路由**: `backend/src/routes/vmRequest.js`
- `GET /api/vm-requests/my` - 获取当前用户的虚拟机申请
- `GET /api/vm-requests` - 获取所有虚拟机申请（管理员）
- `GET /api/vm-requests/:id` - 获取单个虚拟机申请详情
- `POST /api/vm-requests` - 创建虚拟机申请
- `PUT /api/vm-requests/:id` - 更新虚拟机申请
- `DELETE /api/vm-requests/:id` - 删除虚拟机申请

**后端控制器**: `backend/src/controllers/vmRequestController.js`
- 实现了完整的虚拟机申请CRUD功能
- 管理员可以查看所有虚拟机申请
- 普通用户只能查看自己的虚拟机申请

### 2. 修复Dashboard页面
更新了Dashboard.vue中的虚拟机申请加载逻辑：

```javascript
// 修改后的正确API调用
const response = userStore.isAdmin()
  ? await getAllVMRequestsList({ page: 1, pageSize: 1000 })  // 调用正确的/vm-requests API
  : await getMyVMRequests({ page: 1, pageSize: 1000 })        // 调用正确的/vm-requests/my API
```

### 3. 注册新的路由
在`backend/server.js`中注册了新的虚拟机申请路由：
```javascript
app.use('/api/vm-requests', require('./src/routes/vmRequest'));
```

## 验证结果

### 数据库实际数据
- **vm_requests表**: 3条记录（全部属于admin用户）
- **resource_requests表**: 9条记录（各种类型的资源申请）

### 导出功能验证
✅ **管理员导出**: 可以导出所有3条虚拟机申请记录
✅ **普通用户导出**: 只能导出自己创建的虚拟机申请记录（当前为0条）

### API权限验证
✅ **管理员API**: `GET /api/vm-requests` - 返回所有3条记录
✅ **普通用户API**: `GET /api/vm-requests/my` - 只返回用户自己的记录

## 权限说明

### 管理员（admin）
1. **Dashboard查看**: 可以看到所有虚拟机申请记录
2. **导出功能**: 可以导出所有虚拟机申请记录
3. **API权限**: 可以调用`/api/vm-requests`获取所有记录

### 普通用户
1. **Dashboard查看**: 只能看到自己创建的虚拟机申请记录
2. **导出功能**: 只能导出自己创建的虚拟机申请记录
3. **API权限**: 只能调用`/api/vm-requests/my`获取自己的记录

## 修改文件清单

### 新增文件
1. `backend/src/routes/vmRequest.js` - 虚拟机申请路由
2. `backend/src/controllers/vmRequestController.js` - 虚拟机申请控制器
3. `frontend/src/api/vmRequest.js` - 虚拟机申请API

### 修改文件
1. `backend/server.js` - 添加虚拟机申请路由注册
2. `frontend/src/views/Dashboard.vue` - 更新虚拟机申请加载逻辑

## 测试数据
当前vm_requests表中的3条记录：
1. A-73 - 车联网 (MySQL) - 测试环境 - 已提交
2. A-75 - 支付系统 (Redis) - 开发环境 - 已批准
3. A-74 - 电商系统 (AP应用) - 生产环境 - 草稿

## 总结
问题已完全解决。现在：
1. Dashboard页面正确显示vm_requests表的数据
2. 导出功能正确获取虚拟机申请数据
3. 权限控制正确：管理员导出所有记录，普通用户只导出自己的记录
4. 前后端API完全对应，数据一致性得到保证

### 关键点
- **数据一致性**: Dashboard显示和导出功能现在都使用相同的数据源（vm_requests表）
- **权限正确**: 管理员和普通用户的权限区分清晰
- **API专用**: 虚拟机申请有专用的API，不再与resource_requests混淆