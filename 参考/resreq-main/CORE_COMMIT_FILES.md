# 本次提交核心文件清单

## ✅ 需要提交的核心文件（本次对话修改）

### 后端文件
- `backend/server.js` - 注册vm_requests路由
- `backend/src/controllers/vmRequestController.js` - 虚拟机申请控制器（新增）
- `backend/src/routes/vmRequest.js` - 虚拟机申请路由（新增）

### 前端文件
- `frontend/src/api/vmRequest.js` - 虚拟机申请API（新增）
- `frontend/src/views/Dashboard.vue` - 修复虚拟机申请显示
- `frontend/src/views/CreateRequest.vue` - 删除复制按钮
- `frontend/src/views/PermissionRequest.vue` - 添加搜索功能

### 文档文件
- `CHANGELOG_VM_REQUEST_EXPORT.md` - 功能变更日志

## 📊 统计信息
- **新增文件**: 4个
- **修改文件**: 4个
- **代码变更**: ~500行（不含文档）

## 🚀 提交命令

### 方式一：只提交核心文件
```bash
# 添加核心文件
git add backend/server.js
git add backend/src/controllers/vmRequestController.js
git add backend/src/routes/vmRequest.js
git add frontend/src/api/vmRequest.js
git add frontend/src/views/Dashboard.vue
git add frontend/src/views/CreateRequest.vue
git add frontend/src/views/PermissionRequest.vue
git add CHANGELOG_VM_REQUEST_EXPORT.md

# 提交
git commit -m "feat: 完善虚拟机申请导出功能和权限申请搜索功能"

# 推送
git push origin main
```

### 方式二：提交所有修改（包含其他功能）
```bash
# 如果需要包含其他功能的所有修改
git add .
git commit -m "feat: 完善虚拟机申请导出功能和权限申请搜索功能

## 主要变更

### 1. 虚拟机申请数据源统一
- 修复Dashboard与导出数据不一致问题
- 统一使用vm_requests表作为唯一数据源
- 新增虚拟机申请专用API和控制器
- 完成数据迁移：resource_requests → vm_requests（8条记录）

### 2. 虚拟机申请页面优化
- 删除列表中的复制按钮
- 简化用户操作流程

### 3. 用户权限申请搜索功能
- 新增搜索按钮和状态筛选功能
- 支持组合搜索（关键词+状态）
- 添加搜索反馈和快捷操作"

git push origin main
```

## ⚠️ 注意事项

### 关于未追踪的文件
这些未追踪文件可能是：
- 之前功能的文件（容器申请、OBS申请、SFS申请等）
- 文档和报告文件
- 测试脚本和工具文件

### 建议
1. **生产环境**: 只提交核心功能文件
2. **开发环境**: 可以提交所有文件
3. **代码审查**: 建议先提交核心文件，其他文件分批提交

## 🔍 验证清单

提交前请确认：
- [ ] 虚拟机申请导出功能正常
- [ ] Dashboard显示正确的记录数
- [ ] 用户权限申请搜索功能正常
- [ ] 权限控制正常工作
- [ ] 代码没有明显的错误或警告

---

**建议**: 先提交核心功能文件，确保生产环境稳定性，其他文件可以后续分批处理。