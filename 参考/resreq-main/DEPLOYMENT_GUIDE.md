# Git提交与部署指南

## 📋 本次更新内容总结

### 主要功能
1. **虚拟机申请导出功能完善** - 修复Dashboard与导出数据不一致问题
2. **用户权限申请搜索功能** - 添加搜索按钮和状态筛选
3. **虚拟机申请页面优化** - 删除复制按钮

### 文件变更统计
- **新增文件**: 7个（3个后端 + 1个前端API + 3个文档）
- **修改文件**: 6个（1个后端 + 5个前端）
- **总代码行数**: ~800行新增/修改

## 🚀 Git提交流程

### 方式一：使用准备脚本（推荐）

```bash
# 1. 运行准备脚本
./prepare-git-commit.sh

# 2. 查看暂存的文件
git status

# 3. 提交更改
git commit -F GIT_COMMIT_MESSAGE.txt

# 4. 推送到远程仓库
git push origin main
```

### 方式二：手动提交

```bash
# 1. 查看修改状态
git status

# 2. 添加修改的文件
git add backend/src/controllers/vmRequestController.js
git add backend/src/routes/vmRequest.js
git add frontend/src/api/vmRequest.js
git add frontend/src/views/Dashboard.vue
git add frontend/src/views/CreateRequest.vue
git add frontend/src/views/PermissionRequest.vue
git add backend/server.js
git add CHANGELOG_VM_REQUEST_EXPORT.md

# 3. 提交更改
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
- 添加搜索反馈和快捷操作

Closes #虚拟机申请导出问题
Closes #权限申请搜索需求"

# 4. 推送到远程仓库
git push origin main
```

## 📦 部署流程

### 1. 开发环境部署

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 检查依赖
cd backend
npm install

# 3. 检查环境变量
cat .env

# 4. 重启服务
npm run start
```

### 2. 测试环境部署

```bash
# 1. 登录测试服务器
ssh user@test-server

# 2. 进入项目目录
cd /path/to/vmconf-web

# 3. 拉取最新代码
git pull origin main

# 4. 安装依赖（如有新增）
cd backend && npm install

# 5. 重启服务
pm2 restart vmconf-web
# 或
npm run start:prod

# 6. 检查服务状态
pm2 status
# 或访问健康检查端点
curl http://localhost:3000/health
```

### 3. 生产环境部署

```bash
# 1. 备份当前版本
cp -r /path/to/vmconf-web /path/to/vmconf-web.backup

# 2. 拉取最新代码
cd /path/to/vmconf-web
git pull origin main

# 3. 安装依赖
cd backend
npm install --production

# 4. 数据库验证（已自动迁移，无需操作）
# vm_requests表已有8条记录

# 5. 重启服务
pm2 restart vmconf-web
pm2 save

# 6. 验证部署
curl https://your-domain.com/health
```

## 🔍 部署验证清单

### 功能验证
- [ ] Dashboard正确显示8条虚拟机申请
- [ ] 导出Excel包含所有虚拟机申请
- [ ] 用户权限申请搜索功能正常
- [ ] 状态筛选功能正常工作
- [ ] 管理员权限正常
- [ ] 普通用户权限正常

### 性能验证
- [ ] 页面加载时间正常
- [ ] 搜索响应时间正常
- [ ] 导出功能速度正常
- [ ] 数据库查询性能正常

### 兼容性验证
- [ ] Chrome浏览器正常
- [ ] Firefox浏览器正常
- [ ] Safari浏览器正常
- [ ] 移动端浏览器正常

## 🐛 回滚方案

### 如果部署出现问题

```bash
# 1. 立即回滚到备份版本
pm2 stop vmconf-web
cd /path/to/vmconf-web.backup
pm2 start vmconf-web
pm2 save

# 2. 或回滚到上一个Git版本
git checkout <previous-commit-tag>
npm run start:prod
pm2 save

# 3. 验证回滚成功
curl http://localhost:3000/health
```

## 📊 监控指标

### 需要关注的指标
- 虚拟机申请导出成功率
- 搜索功能使用频率
- 页面加载时间
- 用户反馈数量

### 日志检查
```bash
# 查看错误日志
pm2 logs vmconf-web --err

# 查看访问日志
tail -f /var/log/nginx/access.log

# 查看应用日志
tail -f /path/to/vmconf-web/logs/app.log
```

## 📞 联系方式

如有部署问题，请联系：
- 开发团队：dev-team@example.com
- 运维团队：ops-team@example.com

---

**部署时间建议**: 建议在业务低峰期进行部署  
**预计停机时间**: 1-2分钟  
**回滚时间**: 5分钟内