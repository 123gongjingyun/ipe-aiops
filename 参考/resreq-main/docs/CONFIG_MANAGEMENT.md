# 配置管理模块使用说明

## 概述

配置管理模块是资源申请管理系统的核心功能，允许管理员配置和管理所有资源申请相关的配置信息。

## 功能特性

### 1. 配置类型管理
- 管理资源类型，如：数据库、RabbitMQ、Redis、AP等
- 支持启用/禁用状态控制
- 可排序显示

### 2. 环境管理
- 管理部署环境，如：测试、生产
- 支持环境描述和排序
- 启用/禁用状态控制

### 3. 配置选项管理
- 为每个"类型+环境"组合配置具体资源规格
- 支持配置：节点数、CPU、内存、磁盘类型和容量
- 支持按类型和环境筛选

### 4. 配置详细说明
- 统一字段结构，适用于所有应用类型
- 包含性能指标、资源配置详情、使用场景等
- 推荐等级和价格等级管理

### 5. 3级联动选择
- 类型 → 环境 → 配置选择的智能联动
- 实时配置预览
- 详细说明展示

## 安全特性

### 输入验证
- ✅ 用户名严格验证（3-20字符，仅字母数字下划线）
- ✅ 配置名称验证（3-50字符）
- ✅ 数值范围限制（CPU、内存、磁盘等）

### SQL注入防护
- ✅ 参数化查询
- ✅ 危险模式检测
- ✅ 输入清理和验证

### XSS防护
- ✅ 输入验证和清理
- ✅ 输出编码
- ✅ 危险字符过滤

### 权限控制
- ✅ 管理员专用接口
- ✅ 用户权限验证
- ✅ 操作审计日志

## API接口

### 公开接口（所有用户）
```
GET /api/config/types          # 获取所有配置类型
GET /api/config/environments   # 获取所有环境
GET /api/config/options        # 获取配置选项（支持筛选）
GET /api/config/linkage        # 获取3级联动关系
GET /api/config/linkage/type/:typeId  # 获取类型的联动关系
```

### 管理员接口
```
POST   /api/config/types          # 创建配置类型
PUT    /api/config/types/:id      # 更新配置类型
DELETE /api/config/types/:id      # 删除配置类型
PATCH  /api/config/types/:id/toggle  # 切换类型状态

POST   /api/config/environments   # 创建环境
PUT    /api/config/environments/:id  # 更新环境
DELETE /api/config/environments/:id  # 删除环境

POST   /api/config/options        # 创建配置选项
PUT    /api/config/options/:id    # 更新配置选项
DELETE /api/config/options/:id    # 删除配置选项

PUT    /api/config/descriptions/:configOptionId  # 更新配置详细说明
```

## 数据结构

### 配置类型（ConfigType）
```json
{
  "id": 1,
  "name": "数据库",
  "description": "数据库服务相关配置",
  "sortOrder": 1,
  "isActive": true
}
```

### 环境（Environment）
```json
{
  "id": 1,
  "name": "测试",
  "description": "测试环境",
  "sortOrder": 1,
  "isActive": true
}
```

### 配置选项（ConfigOption）
```json
{
  "id": 1,
  "typeId": 1,
  "environmentId": 1,
  "name": "配置A-小型",
  "nodeCount": 1,
  "cpu": 2,
  "memory": 4,
  "diskType": "高IO",
  "systemDisk": 80,
  "dataDisk": 100,
  "description": "适合小型项目使用"
}
```

### 配置详细说明（ConfigDescription）
```json
{
  "architectureType": "单节点",
  "performanceConcurrent": "50-80",
  "performanceThroughput": "800-2,000 / 2,000-4,000",
  "performanceResponse": "<100ms",
  "performanceIops": "1200~5000",
  "performanceDiskThroughput": "100-150 MB/s",
  "scenarioUsage": "开发测试环境",
  "scenarioUserScale": "日活<3,000",
  "recommendationLevel": "一般",
  "technicalNotes": "云环境，适合开发测试使用",
  "priceLevel": "中等"
}
```

## 使用示例

### 前端3级联动选择组件
```vue
<template>
  <ConfigSelector
    v-model="formData.config"
    @change="handleConfigChange"
  />
</template>

<script setup>
import ConfigSelector from '@/components/ConfigSelector.vue'
import { ref } from 'vue'

const formData = ref({
  config: {}
})

const handleConfigChange = (config) => {
  console.log('选择的配置:', config)
  // config包含：typeId, environmentId, configId, configDetail, description
}
</script>
```

### 配置筛选
```javascript
// 按类型筛选配置选项
const options = await configApi.getConfigOptions({
  typeId: 1,          // 数据库类型
  environmentId: 1,    // 测试环境
  isActive: true       // 仅启用的配置
})
```

## 维护指南

### 日常维护
1. 定期审查配置选项的合理性
2. 根据业务需求添加新的配置类型
3. 更新配置详细说明中的性能数据
4. 禁用过期的配置选项

### 安全检查
1. 定期检查配置数据的完整性
2. 验证配置参数的合理性
3. 审查配置详细说明的准确性
4. 确保权限控制正常工作

### 性能优化
1. 配置数据会缓存到前端，减少API调用
2. 大量配置数据支持分页加载
3. 筛选和排序在前端进行，提升响应速度

---
*文档版本：1.0*
*最后更新：2026-05-21*