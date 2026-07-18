# MySQL从库字段完全移除指南

## 概述
本次修改完全移除了MySQL配置中的从库相关字段，包括数据库、后端API和前端界面。

## 修改内容

### 1. 数据库层面
**文件**: `database-remove-mysql-slave-fields.sql`

移除的字段：
- `slave_cpu_detail` - 从库CPU详细说明
- `slave_memory_detail` - 从库内存详细说明  
- `slave_system_disk` - 从库系统盘详细配置说明
- `slave_data_disk` - 从库数据盘详细配置说明
- `slave_connections` - 从库最大连接数
- `slave_daily_qps` - 从库日均QPS
- `slave_peak_qps` - 从库峰值QPS

### 2. 后端层面
**文件**: `backend/src/models/configModel.js`

移除了 `MySQLDescriptionModel` 中从库字段的映射关系。

### 3. 前端层面
**文件**: 
- `frontend/src/views/ConfigManagement.vue`
- `frontend/src/views/ConfigManagement-improved.vue`  
- `frontend/src/views/CreateRequest.vue`

移除了：
- 表单数据对象中的从库字段定义
- 配置详情显示中的从库信息
- 配置管理界面的从库配置区域

## 执行步骤

### 第一步：备份数据库
```bash
# 备份当前数据库
mysqldump -u root -p resreq > backup_before_slave_removal_$(date +%Y%m%d_%H%M%S).sql
```

### 第二步：执行数据库迁移
```bash
# 连接到MySQL并执行迁移脚本
mysql -u root -p resreq < database-remove-mysql-slave-fields.sql
```

或者在MySQL客户端中：
```sql
USE resreq;

SOURCE /path/to/database-remove-mysql-slave-fields.sql;
```

### 第三步：重启后端服务
```bash
# 如果后端服务正在运行，需要重启以加载新的模型定义
cd backend
npm restart
# 或者
pm2 restart resreq-backend
```

### 第四步：重新构建前端（可选）
```bash
cd frontend
npm run build
```

## 验证步骤

### 1. 验证数据库字段已删除
```sql
SELECT COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'resreq' 
  AND TABLE_NAME = 'config_descriptions_mysql'
  AND COLUMN_NAME LIKE '%slave%';

-- 预期结果：空集（没有从库字段）
```

### 2. 验证前端界面
1. 登录系统
2. 进入"配置管理" → "配置选项"
3. 点击任意MySQL配置的"详细说明"按钮
4. 确认界面上没有从库相关的配置项

### 3. 验证API功能
```bash
# 测试获取MySQL配置详情（应该不包含从库字段）
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/config/descriptions?configOptionId=1

# 检查返回的JSON中不应该有slave_*字段
```

## 回滚方案

如果需要回滚，可以：

1. **恢复数据库**：
```bash
mysql -u root -p resreq < backup_before_slave_removal_YYYYMMDD_HHMMSS.sql
```

2. **恢复代码**：
```bash
git checkout HEAD~1 -- backend/src/models/configModel.js
git checkout HEAD~1 -- frontend/src/views/ConfigManagement.vue
git checkout HEAD~1 -- frontend/src/views/ConfigManagement-improved.vue
git checkout HEAD~1 -- frontend/src/views/CreateRequest.vue
```

## 注意事项

1. **数据丢失**: 执行SQL脚本后，现有的从库配置数据将永久丢失，无法恢复
2. **兼容性**: 如果有其他系统依赖这些从库字段，需要同步修改
3. **测试环境**: 建议先在测试环境执行并验证，确认无问题后再在生产环境执行

## 影响范围

- ✅ **配置管理**: MySQL配置编辑界面不再显示从库字段
- ✅ **申请表单**: 配置预览不再显示从库信息  
- ✅ **API接口**: 不再返回和保存从库相关数据
- ✅ **数据库存储**: 从库字段被完全删除

## 执行时间

建议在业务低峰期执行，预计 downtime < 5分钟。

---

**创建时间**: 2026-05-27  
**执行人**: 系统管理员  
**审核人**: 技术负责人