# 虚拟机申请列表磁盘展示功能设计文档

## 概述

本设计文档描述在虚拟机申请列表中添加系统盘和数据盘展示功能的实现方案。

**设计日期**: 2025-01-25  
**项目**: vmconf-web  
**功能**: 虚拟机申请磁盘信息展示

## 需求描述

### 功能需求
1. **默认值来源**: 系统盘和数据盘数据默认从配置选项的详细说明中获取
2. **支持修改**: 用户在表单中可以修改默认的磁盘值
3. **列表展示**: 在虚拟机申请列表中显示系统盘、总数据盘和总磁盘
4. **数据盘求和**: 总数据盘 = 数据盘 × 节点数
5. **总磁盘计算**: 总磁盘 = 系统盘 × 节点数 + 总数据盘

### 业务背景
用户需要了解每个虚拟机申请的磁盘资源配置情况，便于容量规划和资源管理。

## 架构设计

### 数据流

```
配置描述 (config_descriptions)
  ↓ resource_system_disk, resource_data_disk
表单默认填充
  ↓ 用户可修改
提交数据
  ↓ system_disk, data_disk
vm_requests表
  ↓ 存储的值
列表展示
```

### 数据模型

#### 表单数据结构
```javascript
{
  systemCode: '',
  systemName: '',
  // ... 其他字段
  systemDisk: 0,    // 新增：系统盘(GB)
  dataDisk: 0,      // 新增：数据盘(GB)
  // ...
}
```

#### 列表数据结构
```javascript
{
  id: 1,
  system_code: 'A-73',
  system_name: '系统名称',
  // ... 其他字段
  system_disk: 100,      // 系统盘(GB)
  data_disk: 500,        // 数据盘(GB)
  node_count: 3,         // 节点数
  // 计算字段：
  // 总数据盘 = data_disk * node_count = 1500GB
  // 总磁盘 = system_disk * node_count + 总数据盘 = 100*3 + 1500 = 1800GB
}
```

## 前端实现

### 1. 表单视图修改

**文件**: `frontend/src/views/CreateRequest.vue`

#### 1.1 添加磁盘输入字段

在配置详情展示后添加磁盘输入区域（约第340行后）：

```vue
<!-- 磁盘配置区域 -->
<el-col :span="24" v-if="getConfigDetails(form.configOption, index)">
  <el-divider content-position="left">
    <el-icon><Coin /></el-icon>
    磁盘配置
  </el-divider>
  
  <el-row :gutter="20">
    <el-col :span="12">
      <el-form-item label="系统盘(GB)">
        <el-input-number 
          v-model="form.systemDisk" 
          :min="0" 
          :step="10"
          :controls-position="'right'"
          placeholder="系统盘大小"
          style="width: 100%"
        />
        <div class="field-hint" v-if="form.systemDisk">
          默认值来自配置选项，可修改
        </div>
      </el-form-item>
    </el-col>

    <el-col :span="12">
      <el-form-item label="数据盘(GB)">
        <el-input-number 
          v-model="form.dataDisk" 
          :min="0" 
          :step="10"
          :controls-position="'right'"
          placeholder="数据盘大小"
          style="width: 100%"
        />
        <div class="field-hint" v-if="form.dataDisk">
          默认值来自配置选项，可修改
        </div>
      </el-form-item>
    </el-col>
  </el-row>
</el-col>
```

#### 1.2 添加磁盘数据到表单初始化

修改表单初始化（约第439行）：

```javascript
const forms = ref([
  {
    systemCode: '',
    systemName: '',
    moduleName: '',
    owner: '',
    type: '',
    environment: '',
    configOption: '',
    systemDisk: 0,    // 新增
    dataDisk: 0       // 新增
  }
])
```

#### 1.3 添加磁盘字段映射函数

在script区域添加：

```javascript
// 根据类型获取磁盘字段名
const getTypeDiskFields = (type) => {
  if (!type) return { systemDisk: '', dataDisk: '' }
  
  const normalizedType = type.toLowerCase().replace(/[\(\)]/g, '').trim()
  
  // MySQL类型使用master前缀
  if (normalizedType.includes('数据库') || normalizedType.includes('mysql')) {
    return { systemDisk: 'master_system_disk', dataDisk: 'master_data_disk' }
  }
  
  // 其他类型使用resource前缀
  return { systemDisk: 'resource_system_disk', dataDisk: 'resource_data_disk' }
}
```

#### 1.4 修改配置选择变化处理

修改`handleConfigOptionChange`函数（约第1403行）：

```javascript
const handleConfigOptionChange = (index) => {
  const form = forms.value[index]
  if (!form.configOption) return

  const availableOptions = getAvailableOptions(index)
  const selectedOption = availableOptions.find(opt => opt.name === form.configOption)

  if (selectedOption) {
    // 异步加载配置详情
    loadConfigDescription(selectedOption.id)
    
    // 延迟获取配置详情后自动填充磁盘默认值
    setTimeout(() => {
      const details = configDescriptions.value[selectedOption.id]
      if (details) {
        const diskFields = getTypeDiskFields(form.type)
        form.systemDisk = parseInt(details[diskFields.systemDisk]) || 0
        form.dataDisk = parseInt(details[diskFields.dataDisk]) || 0
        
        console.log(`磁盘配置已自动填充: 系统${form.systemDisk}GB, 数据${form.dataDisk}GB`)
      }
    }, 500)
  }
}
```

#### 1.5 更新表单复制和编辑逻辑

修改相关表单数据复制逻辑，确保包含磁盘字段：

```javascript
// 编辑模式数据加载（约第804行）
forms.value[0] = {
  systemCode: data.systemCode || '',
  systemName: data.systemName || '',
  // ... 其他字段
  systemDisk: data.systemDisk || 0,
  dataDisk: data.dataDisk || 0,
  configOption: '' // 配置选项稍后设置
}

// 复制模式数据加载（约第853行）
forms.value[0] = {
  systemCode: data.systemCode || '',
  systemName: data.systemName || '',
  // ... 其他字段
  systemDisk: data.systemDisk || 0,
  dataDisk: data.dataDisk || 0,
  configOption: ''
}

// 添加新表单（约第946行）
const newForm = {
  systemCode: recentRequest.value?.system_code || '',
  systemName: recentRequest.value?.system_name || '',
  // ... 其他字段
  systemDisk: 0,
  dataDisk: 0
}
```

#### 1.6 更新提交数据

修改`handleSubmit`函数（约第1090行），在创建VM请求时包含磁盘数据：

```javascript
// 使用vm-requests API创建申请
await createVMRequest({
  systemCode: form.systemCode,
  systemName: form.systemName,
  moduleName: form.moduleName,
  owner: form.owner,
  type: form.type,
  environment: form.environment,
  configOption: form.configOption,
  nodeCount: configOption.node_count || 1,
  cpu: configOption.cpu || 0,
  memory: configOption.memory || 0,
  systemDisk: form.systemDisk || 0,    // 新增
  dataDisk: form.dataDisk || 0,        // 新增
  status: 'submitted'
})
```

修改编辑模式数据（约第1051行）：

```javascript
const updateData = {
  systemCode: form.systemCode,
  systemName: form.systemName,
  moduleName: form.moduleName,
  owner: form.owner,
  type: form.type,
  environment: form.environment,
  configOption: form.configOption,
  systemDisk: form.systemDisk || 0,    // 新增
  dataDisk: form.dataDisk || 0,        // 新增
  status: 'submitted'
}
```

### 2. 列表视图修改

#### 2.1 添加磁盘列到表格

在列表表格中添加磁盘列（约第53行后）：

```vue
<el-table-column prop="system_disk" label="系统盘(GB)" width="100" align="center">
  <template #default="scope">
    {{ scope.row.system_disk || '-' }}
  </template>
</el-table-column>

<el-table-column label="总数据盘(GB)" width="120" align="center">
  <template #default="scope">
    {{ calculateTotalDataDisk(scope.row) }}
  </template>
</el-table-column>

<el-table-column label="总磁盘(GB)" width="120" align="center">
  <template #default="scope">
    {{ calculateTotalDisk(scope.row) }}
  </template>
</el-table-column>
```

#### 2.2 添加计算函数

在script区域添加：

```javascript
// 计算总数据盘量
const calculateTotalDataDisk = (row) => {
  if (!row.data_disk || !row.node_count) return '-'
  const total = row.data_disk * row.node_count
  return total > 0 ? total : '-'
}

// 计算总磁盘量（系统盘 × 节点数 + 总数据盘）
const calculateTotalDisk = (row) => {
  if (!row.system_disk && !row.data_disk) return '-'
  if (!row.node_count || row.node_count <= 0) return '-'
  
  const totalSystemDisk = (row.system_disk || 0) * row.node_count
  const totalDataDisk = (row.data_disk || 0) * row.node_count
  const grandTotal = totalSystemDisk + totalDataDisk
  
  return grandTotal > 0 ? grandTotal : '-'
}
```

#### 2.3 更新详情对话框

在详情对话框中添加磁盘信息（约第133行后）：

```vue
<el-descriptions-item label="系统盘">{{ currentRequest.system_disk || '-' }}</el-descriptions-item>
<el-descriptions-item label="数据盘">{{ currentRequest.data_disk || '-' }}</el-descriptions-item>
<el-descriptions-item label="总数据盘">
  {{ calculateTotalDataDisk(currentRequest) }}
</el-descriptions-item>
<el-descriptions-item label="总磁盘">
  {{ calculateTotalDisk(currentRequest) }}
</el-descriptions-item>
```

### 3. 计算逻辑详解

#### 3.1 磁盘计算公式

对于包含多个节点的虚拟机申请：

- **单节点系统盘**: system_disk (GB)
- **单节点数据盘**: data_disk (GB)  
- **节点数**: node_count
- **总数据盘**: data_disk × node_count
- **总系统盘**: system_disk × node_count
- **总磁盘**: (system_disk + data_disk) × node_count

#### 3.2 示例计算

假设一个申请：
- 系统盘: 100GB
- 数据盘: 500GB
- 节点数: 3

计算结果：
- 总数据盘 = 500GB × 3 = 1500GB
- 总系统盘 = 100GB × 3 = 300GB
- 总磁盘 = (100GB + 500GB) × 3 = 1800GB

### 3. 样式调整

添加输入字段提示样式：

```css
.field-hint {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
  line-height: 1.4;
}

/* 确保表格列宽合理 */
.el-table .el-table__cell {
  padding: 8px 0;
}
```

## 用户体验流程

### 创建申请流程

1. **选择配置选项** → 自动填充磁盘默认值
2. **查看默认值** → 显示提示信息"默认值来自配置选项，可修改"
3. **修改(可选)** → 用户可根据实际需求调整磁盘大小
4. **提交** → 保存最终的磁盘值

### 列表查看流程

1. **浏览列表** → 查看每个申请的磁盘配置
2. **系统盘** → 显示单节点的系统盘大小
3. **总数据盘** → 显示所有节点的数据盘总量（数据盘 × 节点数）
4. **查看详情** → 在详情对话框中查看完整的磁盘信息

## 技术考虑

### 向后兼容性

- **现有数据**: 对于没有磁盘数据的旧记录，显示"-"
- **字段处理**: 使用 `|| 0` 确保数值字段有默认值
- **API兼容**: 后端API已支持system_disk和data_disk字段

### 性能优化

- **异步加载**: 配置详情异步加载，不阻塞表单渲染
- **延迟填充**: 使用setTimeout确保配置数据完全加载后再填充
- **缓存机制**: 已加载的配置详情会缓存，避免重复请求

### 错误处理

- **数据缺失**: 配置描述中没有磁盘字段时，默认填充0
- **数值解析**: 使用parseInt确保数值类型正确
- **空值处理**: 在显示时检查空值，显示"-"

## 测试计划

### 单元测试

1. **getTypeDiskFields函数**: 测试不同类型返回正确的字段名
2. **calculateTotalDataDisk函数**: 测试各种情况下的计算结果
3. **handleConfigOptionChange函数**: 测试自动填充逻辑

### 集成测试

1. **创建申请**: 测试默认值填充和修改功能
2. **编辑申请**: 测试磁盘数据的加载和更新
3. **列表显示**: 测试磁盘信息的正确显示
4. **详情查看**: 测试详情对话框中的磁盘信息

### 边界测试

1. **空值处理**: 测试没有磁盘数据时的显示
2. **零值处理**: 测试磁盘为0时的显示
3. **大数据量**: 测试多节点情况下的总数据盘计算
4. **类型覆盖**: 测试所有虚拟机类型的磁盘字段映射

## 交付清单

### 代码修改
- [ ] `frontend/src/views/CreateRequest.vue` - 主要修改文件

### 新增功能
- [ ] 磁盘配置输入区域
- [ ] 磁盘默认值自动填充
- [ ] 列表磁盘列显示
- [ ] 总数据盘计算

### 测试验证
- [ ] 创建申请功能测试
- [ ] 编辑申请功能测试
- [ ] 列表显示测试
- [ ] 边界情况测试

## 实施风险

### 低风险
- 纯前端修改，不影响现有API
- 向后兼容，旧数据显示"-"
- 功能独立，不影响其他模块

### 缓解措施
- 充分测试自动填充逻辑
- 验证不同虚拟机类型的字段映射
- 确保数据类型正确转换

## 后续优化建议

1. **磁盘容量提示**: 可添加磁盘容量合理性校验提示
2. **批量编辑**: 支持批量修改磁盘配置
3. **磁盘统计**: 添加磁盘资源的统计报表
4. **历史记录**: 记录磁盘配置的修改历史

---

**文档版本**: 1.0  
**最后更新**: 2025-01-25  
**状态**: 待用户审查
