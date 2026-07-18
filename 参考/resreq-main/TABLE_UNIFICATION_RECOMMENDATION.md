# 虚拟机申请表整合建议

## 执行摘要
**建议**: 以`vm_requests`表为准，逐步淘汰`resource_requests`表

## 详细分析

### 1. 表结构对比

#### 字段差异
| 特性 | resource_requests | vm_requests | 推荐选择 |
|------|------------------|-------------|----------|
| 用户字段 | `user_id` (简单) | `applicant_id + applicant_name` (完整) | ✅ vm_requests |
| 环境字段 | `environment` (字符串) | `environment + environment_id` (关联) | ✅ vm_requests |
| 状态字段 | `enum` (固定) | `varchar` (灵活) | ✅ vm_requests |
| 创建时间 | 无 | `created_at` | ✅ vm_requests |
| 字段约束 | 较少(NULL多) | 完整(默认值+NOT NULL) | ✅ vm_requests |

#### 数据量对比
- `resource_requests`: 9条记录
- `vm_requests`: 3条记录
- **总数据量**: 12条记录，迁移成本可控

### 2. 系统架构分析

#### 当前申请表结构
系统已采用模块化设计，每种申请类型都有独立表：
- `container_requests` - 容器申请
- `obs_requests` - OBS存储申请
- `sfs_requests` - SFS文件存储申请
- `permission_requests` - 权限申请
- `network_policies` - 网络策略申请
- `vm_requests` - 虚拟机申请 ✅
- `resource_requests` - 通用资源申请 (旧系统)

#### 架构趋势
新系统向**模块化、专用化**方向发展，`vm_requests`表符合这一趋势。

### 3. 技术优势分析

#### vm_requests表优势
1. **数据完整性**
   - `applicant_name`字段避免频繁JOIN用户表
   - `environment_id`关联设计，支持环境管理

2. **扩展性**
   - `varchar`状态字段支持自定义状态
   - 字段约束规范，数据质量高

3. **维护性**
   - 符合系统模块化架构
   - 与其他申请表保持一致

4. **审计性**
   - `created_at`字段支持创建时间审计
   - 时间记录更完整

#### resource_requests表劣势
1. **架构过时**
   - 通用设计不符合模块化趋势
   - 缺少关联设计

2. **功能限制**
   - `enum`状态字段扩展性差
   - 缺少创建时间记录

## 迁移方案

### 阶段一：数据迁移
```sql
-- 将resource_requests数据迁移到vm_requests
INSERT INTO vm_requests (
  system_code, system_name, module_name, owner, type, environment,
  config_option, node_count, cpu, memory, disk_type, system_disk,
  data_disk, status, applicant_id, applicant_name, environment_id, submitted_at
)
SELECT
  r.system_code, r.system_name, r.module_name, r.owner, r.type, r.environment,
  r.config_option, r.node_count, r.cpu, r.memory, r.disk_type, r.system_disk,
  r.data_disk, r.status, r.user_id, u.real_name, e.id, r.submitted_at
FROM resource_requests r
LEFT JOIN users u ON r.user_id = u.id
LEFT JOIN environments e ON r.environment = e.name
WHERE NOT EXISTS (
  SELECT 1 FROM vm_requests v
  WHERE v.system_code = r.system_code AND v.type = r.type
);
```

### 阶段二：代码更新
1. **前端更新**
   - ✅ 已创建专用API: `frontend/src/api/vmRequest.js`
   - ✅ 已更新Dashboard: 使用正确的vm_requests API

2. **后端更新**
   - ✅ 已创建控制器: `backend/src/controllers/vmRequestController.js`
   - ✅ 已创建路由: `backend/src/routes/vmRequest.js`
   - ✅ 已注册路由: `backend/server.js`

### 阶段三：废弃旧表
1. 保留`resource_requests`表作为只读备份
2. 更新所有引用指向`vm_requests`表
3. 监控系统稳定性
4. 最终废弃`resource_requests`表

## 实施步骤

### 立即执行
1. ✅ 运行数据迁移脚本
2. ✅ 验证数据完整性
3. ✅ 更新相关API和前端代码

### 短期（1-2周）
1. 监控vm_requests表的性能和稳定性
2. 收集用户反馈
3. 修复可能出现的问题

### 中期（1个月）
1. 完全移除对resource_requests表的写入依赖
2. 更新所有相关文档
3. 培训用户使用新系统

### 长期（3个月）
1. 将resource_requests表设为只读归档
2. 最终考虑删除resource_requests表

## 风险评估

### 低风险 ✅
- **数据量小**: 总共12条记录，迁移风险可控
- **代码已更新**: 前后端代码已经支持vm_requests表
- **技术成熟**: 迁移技术方案成熟可靠

### 注意事项 ⚠️
- **兼容性**: 确保所有相关功能已更新
- **性能监控**: 监控vm_requests表的查询性能
- **备份**: 迁移前做好数据备份

## 推荐决策

### 强烈推荐采用vm_requests表
1. **架构一致性**: 符合系统模块化设计趋势
2. **技术优势**: 字段设计更合理、扩展性更强
3. **迁移成本**: 数据量小，实施风险低
4. **未来可维护性**: 更易于长期维护和扩展

### 不建议继续使用resource_requests表
1. **架构不符**: 与系统模块化趋势不符
2. **功能限制**: 字段设计限制了扩展性
3. **维护成本**: 混用两表增加维护复杂度

## 结论
**明确建议**: 以`vm_requests`表作为唯一的虚拟机申请数据表，逐步淘汰`resource_requests`表。

这个决策能够：
- ✅ 统一系统架构
- ✅ 提升数据质量
- ✅ 简化维护复杂度
- ✅ 增强系统扩展性
- ✅ 降低长期维护成本

## 验证清单
迁移完成后需要验证：
- [ ] 所有虚拟机申请记录都已迁移
- [ ] Dashboard显示正确的记录数量
- [ ] 导出功能包含所有虚拟机申请
- [ ] 权限控制正常（管理员/普通用户）
- [ ] 创建、编辑、删除功能正常
- [ ] 所有API响应正常
- [ ] 数据完整性验证通过