# MySQL从库字段移除检查清单

## ✅ 已完成的修改

### 1. 数据库层面
- ✅ **创建数据库迁移脚本**: `database-remove-mysql-slave-fields.sql`
- ✅ **移除的数据库字段**:
  - `slave_cpu_detail`
  - `slave_memory_detail` 
  - `slave_system_disk`
  - `slave_data_disk`
  - `slave_connections`
  - `slave_daily_qps`
  - `slave_peak_qps`

### 2. 后端层面
- ✅ **修改主模型**: `backend/src/models/configModel.js`
  - 移除了 `MySQLDescriptionModel` 中从库字段的映射关系
  
- ✅ **修改改进版模型**: `backend/src/models/configModel-improved.js`
  - 移除了从库字段的映射关系

- ✅ **修改迁移脚本**: `backend/src/scripts/migrate-descriptions.js`
  - 移除了从库数据的迁移逻辑

### 3. 前端层面
- ✅ **修改配置管理页面**: `frontend/src/views/ConfigManagement.vue`
  - 移除了表单数据对象中的从库字段定义
  - 移除了配置详情显示的从库区域
  - 简化了标签名称（"主库配置" → "资源配置"）

- ✅ **修改改进版配置管理**: `frontend/src/views/ConfigManagement-improved.vue`
  - 移除了表单数据对象中的从库字段定义
  - 移除了配置详情显示的从库区域
  - 简化了标签名称

- ✅ **修改申请表单页面**: `frontend/src/views/CreateRequest.vue`
  - 移除了配置预览中的从库字段显示
  - 简化了MySQL配置的字段映射

### 4. 文档层面
- ✅ **创建执行指南**: `REMOVE_MYSQL_SLAVE_FIELDS_README.md`
- ✅ **创建检查清单**: `MYSQL_SLAVE_FIELDS_REMOVAL_CHECKLIST.md`

## 🔄 执行步骤

### 第一步：备份数据库
```bash
mysqldump -u root -p resreq > backup_before_slave_removal_$(date +%Y%m%d_%H%M%S).sql
```

### 第二步：执行数据库迁移
```bash
mysql -u root -p resreq < database-remove-mysql-slave-fields.sql
```

### 第三步：重启后端服务
```bash
cd backend
npm restart
# 或
pm2 restart resreq-backend
```

### 第四步：重新构建前端
```bash
cd frontend
npm run build
```

## ✅ 验证步骤

### 1. 数据库验证
```sql
-- 检查从库字段是否已删除
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'resreq' 
  AND TABLE_NAME = 'config_descriptions_mysql'
  AND COLUMN_NAME LIKE '%slave%';
  
-- 预期结果：空集
```

### 2. 后端验证
```bash
# 检查代码中是否还有从库字段引用
grep -r "slave.*detail\|slave_cpu" backend/src/ --include="*.js"
# 预期结果：无匹配（除注释外）
```

### 3. 前端验证
```bash
# 检查前端代码中是否还有从库字段引用
grep -r "slaveCpu\|slave.*detail" frontend/src/ --include="*.vue" --include="*.js"
# 预期结果：无匹配（除构建文件外）
```

### 4. 功能验证
1. 登录系统
2. 进入"配置管理" → "配置选项"
3. 点击MySQL配置的"详细说明"按钮
4. 确认界面无从库配置项
5. 进入"创建申请"页面
6. 选择MySQL类型配置
7. 查看配置详情预览
8. 确认无从库信息显示

## 🎯 影响范围分析

### 正面影响
- ✅ **简化配置**: MySQL配置不再有主从之分，降低配置复杂度
- ✅ **减少混淆**: 用户不会看到不使用的从库字段
- ✅ **数据一致性**: 消除了数据库和API中的冗余字段

### 潜在风险
- ⚠️ **数据丢失**: 现有的从库配置数据将永久丢失
- ⚠️ **不可逆**: 数据库字段删除后无法恢复（除非从备份恢复）
- ⚠️ **兼容性**: 如果有其他系统依赖这些字段，需要同步修改

## 📋 回滚方案

如果需要回滚：

### 1. 恢复数据库
```bash
mysql -u root -p resreq < backup_before_slave_removal_YYYYMMDD_HHMMSS.sql
```

### 2. 恢复代码
```bash
# 使用git恢复到修改前的版本
git checkout HEAD~1 -- backend/src/models/configModel.js
git checkout HEAD~1 -- backend/src/models/configModel-improved.js  
git checkout HEAD~1 -- backend/src/scripts/migrate-descriptions.js
git checkout HEAD~1 -- frontend/src/views/ConfigManagement.vue
git checkout HEAD~1 -- frontend/src/views/ConfigManagement-improved.vue
git checkout HEAD~1 -- frontend/src/views/CreateRequest.vue

# 重启服务
cd backend && npm restart
cd frontend && npm run build
```

## ⏰ 建议执行时间

- **最佳时间**: 业务低峰期（如凌晨或周末）
- **预计停机时间**: < 5分钟
- **数据备份时间**: 1-2分钟（取决于数据库大小）

## 👥 执行人员

- **执行人**: 系统管理员
- **监督人**: 技术负责人  
- **测试人**: QA工程师

---

**检查清单创建时间**: 2026-05-27  
**最后更新时间**: 2026-05-27  
**状态**: ✅ 所有代码修改已完成，等待执行数据库迁移