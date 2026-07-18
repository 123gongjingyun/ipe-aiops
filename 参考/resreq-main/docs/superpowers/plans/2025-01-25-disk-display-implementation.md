# 虚拟机申请磁盘展示功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在虚拟机申请列表和表单中添加系统盘和数据盘的展示、自动填充和计算功能

**Architecture:** 前端Vue组件扩展，通过修改CreateRequest.vue文件实现磁盘配置的输入、存储、计算和展示，后端API已支持相关字段。

**Tech Stack:** Vue 3, Composition API, Element Plus, JavaScript

---

## File Structure

**Modify:**
- `frontend/src/views/CreateRequest.vue` - 主要的虚拟机申请管理组件

**Changes:**
1. 添加表单数据字段（systemDisk, dataDisk）
2. 添加磁盘字段映射工具函数
3. 添加磁盘配置输入UI区域
4. 实现配置选择时的自动填充逻辑
5. 更新表单提交数据包含磁盘字段
6. 在列表表格中添加磁盘列显示
7. 添加磁盘计算函数（总数据盘、总磁盘）
8. 在详情对话框中添加磁盘信息显示
9. 添加字段提示样式

---

## Task 1: 添加表单数据字段

**Files:**
- Modify: `frontend/src/views/CreateRequest.vue:439-449`

- [ ] **Step 1: 在表单初始化中添加磁盘字段**

找到 `forms` 的定义（约第439行），在 `configOption: ''` 后添加：

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
    systemDisk: 0,    // 系统盘(GB)
    dataDisk: 0       // 数据盘(GB)
  }
])
```

- [ ] **Step 2: 在最近申请数据加载中添加磁盘字段处理**

找到 `loadRecentRequest` 函数中的最近申请数据填充（约第903行），修改为：

```javascript
if (forms.value.length > 0) {
  forms.value[0] = {
    systemCode: recentRequest.value.system_code || '',
    systemName: recentRequest.value.system_name || '',
    moduleName: recentRequest.value.module_name || '',
    owner: recentRequest.value.owner || '',
    type: recentRequest.value.type || '',
    environment: recentRequest.value.environment || '',
    configOption: recentRequest.value.config_option || '',
    systemDisk: recentRequest.value.system_disk || 0,
    dataDisk: recentRequest.value.data_disk || 0
  }
  // ... 后续代码保持不变
}
```

---

## Task 2: 添加磁盘字段映射工具函数

**Files:**
- Modify: `frontend/src/views/CreateRequest.vue:780-790`

- [ ] **Step 1: 在 isCoreMetric 函数后添加磁盘字段映射函数**

找到 `isCoreMetric` 函数定义的结束位置（约第780行），在该函数后添加：

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

- [ ] **Step 2: 保存文件并验证语法**

检查确保函数位置正确，在 `isCoreMetric` 函数之后，`loadRecentRequest` 函数之前。

---

## Task 3: 添加磁盘配置输入UI区域

**Files:**
- Modify: `frontend/src/views/CreateRequest.vue:340-350`

- [ ] **Step 1: 在配置详情展示区域后添加磁盘配置UI**

找到配置详情展示的 `</el-col>` 标签结束位置（约第340行），在该标签后添加：

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

- [ ] **Step 2: 检查Coin图标导入**

确认文件顶部的 `import` 语句中已包含 `Coin` 图标（约第376行）：

```javascript
import { Delete, Plus, Select, Coin, Files, Connection, RefreshRight, InfoFilled } from '@element-plus/icons-vue'
```

如果没有 `Coin`，添加到该导入语句中。

---

## Task 4: 实现配置选择时的自动填充逻辑

**Files:**
- Modify: `frontend/src/views/CreateRequest.vue:1403-1420`

- [ ] **Step 1: 修改 handleConfigOptionChange 函数**

找到 `handleConfigOptionChange` 函数（约第1403行），替换整个函数为：

```javascript
// 处理配置选项变化
const handleConfigOptionChange = (index) => {
  const form = forms.value[index]
  if (!form.configOption) return

  // 查找对应的配置选项ID
  const availableOptions = getAvailableOptions(index)
  const selectedOption = availableOptions.find(opt => opt.name === form.configOption)

  if (selectedOption) {
    // 异步加载配置详情
    loadConfigDescription(selectedOption.id)
    console.log(`📝 已选择配置: ${form.configOption}，正在加载详细说明...`)
    
    // 延迟获取配置详情后自动填充磁盘默认值
    setTimeout(() => {
      const details = configDescriptions.value[selectedOption.id]
      if (details) {
        const diskFields = getTypeDiskFields(form.type)
        form.systemDisk = parseInt(details[diskFields.systemDisk]) || 0
        form.dataDisk = parseInt(details[diskFields.dataDisk]) || 0
        
        console.log(`💾 磁盘配置已自动填充: 系统${form.systemDisk}GB, 数据${form.dataDisk}GB`)
      }
    }, 500)
  }
}
```

- [ ] **Step 2: 更新编辑和复制模式的数据加载**

找到编辑模式的数据加载部分（约第804行），在 `configOption: ''` 后添加：

```javascript
forms.value[0] = {
  systemCode: data.systemCode || '',
  systemName: data.systemName || '',
  moduleName: data.moduleName || '',
  owner: data.owner || '',
  type: data.type || '',
  environment: data.environment || '',
  configOption: '',
  systemDisk: data.systemDisk || 0,
  dataDisk: data.dataDisk || 0
}
```

找到复制模式的数据加载部分（约第853行），进行相同的修改。

- [ ] **Step 3: 更新 addForm 函数中的新表单数据**

找到 `addForm` 函数中的 `newForm` 定义（约第946行），添加磁盘字段：

```javascript
const newForm = {
  systemCode: recentRequest.value?.system_code || '',
  systemName: recentRequest.value?.system_name || '',
  moduleName: recentRequest.value?.module_name || '',
  owner: recentRequest.value?.owner || '',
  type: recentRequest.value?.type || '',
  environment: recentRequest.value?.environment || '',
  configOption: '',
  systemDisk: 0,
  dataDisk: 0
}
```

---

## Task 5: 更新表单提交数据

**Files:**
- Modify: `frontend/src/views/CreateRequest.vue:1090-1105`

- [ ] **Step 1: 在创建VM请求时添加磁盘字段**

找到创建VM请求的API调用（约第1090行），在 `memory: configOption.memory || 0,` 后添加：

```javascript
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
  systemDisk: form.systemDisk || 0,
  dataDisk: form.dataDisk || 0,
  status: 'submitted'
})
```

- [ ] **Step 2: 在更新VM请求时添加磁盘字段**

找到更新VM请求的 `updateData` 定义（约第1051行），在 `configOption: form.configOption,` 后添加：

```javascript
const updateData = {
  systemCode: form.systemCode,
  systemName: form.systemName,
  moduleName: form.moduleName,
  owner: form.owner,
  type: form.type,
  environment: form.environment,
  configOption: form.configOption,
  systemDisk: form.systemDisk || 0,
  dataDisk: form.dataDisk || 0,
  status: 'submitted'
}
```

---

## Task 6: 添加列表磁盘列显示

**Files:**
- Modify: `frontend/src/views/CreateRequest.vue:53-60`

- [ ] **Step 1: 在列表表格中添加磁盘列**

找到内存列的定义（约第52行），在该列后添加：

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

---

## Task 7: 添加磁盘计算函数

**Files:**
- Modify: `frontend/src/views/CreateRequest.vue:1670-1680`

- [ ] **Step 1: 在 formatDateTime 函数后添加磁盘计算函数**

找到 `formatDateTime` 函数定义的结束位置（约第1670行），在该函数后添加：

```javascript
// 计算总数据盘量
const calculateTotalDataDisk = (row) => {
  if (!row.data_disk || !row.node_count) return '-'
  const total = row.data_disk * row.node_count
  return total > 0 ? total : '-'
}

// 计算总磁盘量（系统盘 × 节点数 + 数据盘 × 节点数）
const calculateTotalDisk = (row) => {
  if (!row.system_disk && !row.data_disk) return '-'
  if (!row.node_count || row.node_count <= 0) return '-'
  
  const totalSystemDisk = (row.system_disk || 0) * row.node_count
  const totalDataDisk = (row.data_disk || 0) * row.node_count
  const grandTotal = totalSystemDisk + totalDataDisk
  
  return grandTotal > 0 ? grandTotal : '-'
}
```

---

## Task 8: 更新详情对话框

**Files:**
- Modify: `frontend/src/views/CreateRequest.vue:133-140`

- [ ] **Step 1: 在详情对话框中添加磁盘信息**

找到内存的 `el-descriptions-item` 定义（约第127行），在该项后添加：

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

---

## Task 9: 添加样式

**Files:**
- Modify: `frontend/src/views/CreateRequest.vue:1790-1800`

- [ ] **Step 1: 在 style 区域添加字段提示样式**

找到 `.core-metric-label` 样式定义的结束位置（约第1790行），在该样式后添加：

```css
/* 字段提示样式 */
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

---

## Task 10: 功能测试验证

**Files:**
- Manual testing in browser

- [ ] **Step 1: 测试创建申请时的磁盘默认填充**

1. 访问虚拟机申请创建页面
2. 选择环境和类型
3. 选择配置选项
4. 验证系统盘和数据盘自动填充了默认值
5. 验证显示了提示信息"默认值来自配置选项，可修改"

**Expected:** 磁盘字段自动填充配置描述中的值，显示提示信息

- [ ] **Step 2: 测试磁盘值的修改**

1. 修改系统盘和数据盘的值
2. 修改配置选项，验证磁盘值重新自动填充
3. 手动调整磁盘值

**Expected:** 可以成功修改磁盘值，数值保存正确

- [ ] **Step 3: 测试申请提交和列表显示**

1. 填写完整申请信息，修改磁盘值
2. 提交申请
3. 在列表中查看新申请的磁盘信息
4. 验证系统盘、总数据盘、总磁盘显示正确

**Expected:** 列表显示正确的磁盘计算值

- [ ] **Step 4: 测试多节点磁盘计算**

1. 创建一个节点数大于1的申请（如3个节点）
2. 设置系统盘100GB，数据盘500GB
3. 提交后在列表中查看
4. 验证计算：总数据盘 = 500 × 3 = 1500GB，总磁盘 = (100 + 500) × 3 = 1800GB

**Expected:** 多节点磁盘计算正确

- [ ] **Step 5: 测试详情对话框显示**

1. 点击列表中的"查看"按钮
2. 验证详情对话框显示磁盘信息
3. 检查系统盘、数据盘、总数据盘、总磁盘的显示

**Expected:** 详情对话框显示完整的磁盘信息和计算结果

- [ ] **Step 6: 测试边界情况**

1. 测试磁盘为0的情况
2. 测试没有磁盘数据的旧申请（显示"-"）
3. 测试不同虚拟机类型的磁盘字段映射

**Expected:** 边界情况正确处理，空值显示"-"

---

## Task 11: 代码清理和验证

**Files:**
- `frontend/src/views/CreateRequest.vue`

- [ ] **Step 1: 检查代码一致性**

验证以下事项：
- 所有新增的函数命名一致
- 磁盘字段引用大小写一致
- 没有重复的代码或函数定义
- 所有导入的图标和组件正确

- [ ] **Step 2: 测试编辑和复制功能**

1. 编辑现有申请，验证磁盘数据正确加载
2. 复制现有申请，验证磁盘数据正确复制
3. 修改后提交，验证数据正确保存

**Expected:** 编辑和复制功能正常工作，磁盘数据处理正确

- [ ] **Step 3: 测试表单验证**

1. 不填写磁盘字段，提交申请
2. 验证表单验证逻辑正确
3. 确认磁盘字段默认为0是可以接受的

**Expected:** 表单验证逻辑正常，磁盘字段可以为0

---

## Implementation Complete Checklist

完成后确认以下功能点：

- [ ] 表单中显示磁盘配置输入区域
- [ ] 选择配置选项时自动填充磁盘默认值
- [ ] 用户可以修改磁盘值
- [ ] 提交时磁盘数据正确保存
- [ ] 列表显示系统盘列
- [ ] 列表显示总数据盘列（数据盘 × 节点数）
- [ ] 列表显示总磁盘列（(系统盘 + 数据盘) × 节点数）
- [ ] 详情对话框显示磁盘信息和计算结果
- [ ] 空值正确显示为"-"
- [ ] 多节点磁盘计算正确
- [ ] 不同虚拟机类型的磁盘字段映射正确
- [ ] 编辑和复制功能包含磁盘数据
- [ ] 样式正确显示字段提示信息

---

## Notes

1. **磁盘字段映射**: MySQL类型使用 `master_system_disk` 和 `master_data_disk`，其他类型使用 `resource_system_disk` 和 `resource_data_disk`
2. **计算逻辑**: 总磁盘 = (系统盘 + 数据盘) × 节点数
3. **数据来源**: 默认值从配置描述表获取，用户可修改后存储到vm_requests表
4. **向后兼容**: 旧申请没有磁盘数据时显示"-"
5. **延迟填充**: 使用setTimeout确保配置详情加载完成后再填充磁盘值

---

**Plan version:** 1.0  
**Last updated:** 2025-01-25  
**Estimated time:** 2-3 hours
