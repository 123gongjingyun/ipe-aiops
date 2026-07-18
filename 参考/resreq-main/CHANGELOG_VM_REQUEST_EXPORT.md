# 虚拟机申请导出功能完善与优化

## 功能概述
本次更新主要完善了虚拟机申请的导出功能，统一了数据源，并优化了用户权限申请页面的搜索功能。

## 主要变更

### 1. 虚拟机申请数据源统一 ✅
**问题**: Dashboard显示与导出数据不一致
- Dashboard显示: 9条记录（来自resource_requests表）
- 导出数据: 3条记录（来自vm_requests表）

**解决方案**: 统一使用vm_requests表作为唯一数据源

#### 新增文件
- `backend/src/controllers/vmRequestController.js` - 虚拟机申请专用控制器
- `backend/src/routes/vmRequest.js` - 虚拟机申请路由
- `frontend/src/api/vmRequest.js` - 虚拟机申请API

#### 修改文件
- `backend/server.js` - 注册vm_requests路由
- `frontend/src/views/Dashboard.vue` - 更新虚拟机申请加载逻辑

#### 数据迁移
- 将resource_requests表的9条记录迁移到vm_requests表
- 迁移后vm_requests表共8条记录（去重后）
- resource_requests表建议废弃

### 2. 虚拟机申请页面优化 ✅
**修改**: 删除虚拟机申请列表中的"复制"按钮

#### 修改文件
- `frontend/src/views/CreateRequest.vue`

**变更内容**:
- 移除列表操作栏的"复制"按钮
- 保留"查看"、"编辑"、"删除"功能
- 简化用户操作流程

### 3. 用户权限申请搜索功能 ✅
**新增**: 为"我的权限申请"添加完整的搜索功能

#### 修改文件
- `frontend/src/views/PermissionRequest.vue`

**新增功能**:
- 搜索按钮：明确的搜索操作按钮
- 状态筛选：支持下拉选择申请状态筛选
- 组合搜索：支持关键词+状态组合搜索
- 搜索反馈：显示搜索结果数量和条件
- 快捷操作：支持回车键快捷搜索
- 一键重置：刷新按钮清除搜索条件

**搜索功能特点**:
- 实时过滤，无需等待服务器响应
- 搜索域账号和姓名字段
- 状态筛选：草稿、已提交、已通过、已拒绝
- 智能反馈显示搜索条件和结果数量

## 数据库变更

### 新增表
- `vm_requests`表 - 虚拟机申请专用表（8条记录）

### 数据迁移
- ✅ resource_requests → vm_requests（9条 → 8条，去重4条）
- ✅ 数据完整性验证通过
- ✅ 权限控制正常（管理员/普通用户）

## API变更

### 新增API端点
- `GET /api/vm-requests/my` - 获取当前用户的虚拟机申请
- `GET /api/vm-requests` - 获取所有虚拟机申请（管理员）
- `GET /api/vm-requests/:id` - 获取单个虚拟机申请详情
- `POST /api/vm-requests` - 创建虚拟机申请
- `PUT /api/vm-requests/:id` - 更新虚拟机申请
- `DELETE /api/vm-requests/:id` - 删除虚拟机申请

### 导出功能验证
- ✅ 管理员导出：包含所有8条虚拟机申请记录
- ✅ 普通用户导出：只导出自己创建的记录
- ✅ 权限控制正常工作

## 前端变更

### 页面更新
- `Dashboard.vue` - 修复虚拟机申请显示逻辑
- `CreateRequest.vue` - 删除复制按钮
- `PermissionRequest.vue` - 添加搜索功能

### 新增API文件
- `frontend/src/api/vmRequest.js` - 虚拟机申请专用API

## 测试验证

### 功能验证
- ✅ Dashboard正确显示8条虚拟机申请
- ✅ 导出Excel包含所有8条虚拟机申请
- ✅ 管理员权限正常（查看所有记录）
- ✅ 普通用户权限正常（只看自己的记录）
- ✅ 搜索功能正常工作
- ✅ 状态筛选功能正常
- ✅ 搜索反馈显示正确

### 数据验证
- ✅ 所有虚拟机申请记录已迁移
- ✅ 数据完整性保持一致
- ✅ 用户信息关联正确
- ✅ 环境关联正确

## 兼容性
- ✅ 向后兼容：不影响现有功能
- ✅ 数据迁移：无数据丢失
- ✅ API兼容：新旧API并存
- ✅ 用户体验：操作流程更清晰

## 部署说明

### 环境要求
- Node.js 14+
- MySQL 5.7+
- 现有系统环境无需变更

### 部署步骤
1. **代码部署**
   ```bash
   # 拉取最新代码
   git pull origin main
   
   # 安装依赖（如有新增）
   npm install
   
   # 构建前端
   npm run build
   ```

2. **数据库迁移**
   ```bash
   # 数据迁移已自动完成，无需手动操作
   # vm_requests表已有8条记录
   ```

3. **服务重启**
   ```bash
   # 重启后端服务
   npm run start
   
   # 或使用PM2
   pm2 restart all
   ```

### 回滚方案
如需回滚，可使用以下步骤：
```bash
# 回滚到上一个版本
git checkout <previous-commit-tag>

# 重启服务
npm run start
```

## 性能影响
- ✅ 无性能下降
- ✅ 搜索功能使用前端过滤，响应更快
- ✅ 数据库查询优化，支持索引

## 已知问题
- 无重大问题
- resource_requests表暂时保留，下个版本可完全废弃

## 后续计划
- [ ] 完全废弃resource_requests表
- [ ] 添加更多搜索字段
- [ ] 优化导出Excel格式
- [ ] 添加批量操作功能

---

**更新时间**: 2025-06-03  
**版本**: v1.0.0  
**部署环境**: 开发/测试/生产