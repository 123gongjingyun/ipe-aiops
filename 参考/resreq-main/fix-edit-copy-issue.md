# 修复编辑和复制功能冲突问题

## 问题分析

1. **编辑显示错误**: 显示"S-60-COPY"而不是"S-60"
2. **保存失败**: 修改类型后无法保存新值

## 根本原因

1. sessionStorage清理不彻底，残留复制数据
2. 编辑和复制的数据读取逻辑有冲突
3. 编辑模式判断逻辑不够准确

## 修复方案

### 修复1: Dashboard.vue - 改进编辑和复制逻辑

**当前问题**:
```javascript
// handleEdit 和 handleCopy 都使用 sessionStorage，可能互相干扰
const handleEdit = (request) => {
  sessionStorage.setItem('editRequestData', JSON.stringify(editData))
  sessionStorage.setItem('editRequestId', request.id.toString())
  // ...
}

const handleCopy = (request) => {
  sessionStorage.setItem('copyRequestData', JSON.stringify(copyData))
  // ...
}
```

**修复后**:
```javascript
const handleEdit = (request) => {
  // 清理所有残留数据
  sessionStorage.removeItem('copyRequestData')
  sessionStorage.removeItem('editRequestData')
  sessionStorage.removeItem('editRequestId')
  
  // 设置新的编辑数据（不修改原始数据）
  const editData = {
    systemCode: request.systemCode, // 不添加-COPY
    systemName: request.systemName,
    moduleName: request.moduleName,
    owner: request.owner,
    type: request.type,
    environment: request.environment,
    configOption: request.configOption
  }
  
  sessionStorage.setItem('editRequestData', JSON.stringify(editData))
  sessionStorage.setItem('editRequestId', request.id.toString())
  
  ElMessage.success(`正在编辑申请: ${request.systemName}`)
  router.push('/create')
}

const handleCopy = async (request) => {
  try {
    await ElMessageBox.confirm(
      `确定要复制 ${request.systemName} 的申请吗？`,
      '复制申请'
    )
    
    // 清理所有残留数据
    sessionStorage.removeItem('editRequestData')
    sessionStorage.removeItem('editRequestId')
    
    // 设置复制数据（添加-COPY标识）
    const copyData = {
      systemCode: request.systemCode + '-COPY',
      systemName: request.systemName,
      moduleName: request.moduleName,
      owner: request.owner,
      type: request.type,
      environment: request.environment,
      configOption: request.configOption
    }
    
    sessionStorage.setItem('copyRequestData', JSON.stringify(copyData))
    ElMessage.success('已复制申请数据')
    router.push('/create')
  } catch (error) {
    // 用户取消
  }
}
```

### 修复2: CreateRequest.vue - 改进数据加载和清理逻辑

**当前问题**:
```javascript
// 数据加载逻辑优先级不清晰
const editData = sessionStorage.getItem('editRequestData')
const copyData = sessionStorage.getItem('copyRequestData')

if (editData) {
  // 编辑模式
  sessionStorage.removeItem('editRequestData') // 清除过早
} else if (copyData) {
  // 复制模式
  sessionStorage.removeItem('copyRequestData')
}
```

**修复后**:
```javascript
onMounted(() => {
  // 获取各种sessionStorage数据
  const editData = sessionStorage.getItem('editRequestData')
  const copyData = sessionStorage.getItem('copyRequestData')
  const editRequestId = sessionStorage.getItem('editRequestId')

  // 清理逻辑：优先使用编辑数据，避免冲突
  if (editData && editRequestId) {
    // 编辑模式 - 有明确的编辑ID
    try {
      const data = JSON.parse(editData)
      if (forms.value.length > 0) {
        forms.value[0] = {
          systemCode: data.systemCode || '',  // 保持原始系统编号
          systemName: data.systemName || '',
          moduleName: data.moduleName || '',
          owner: data.owner || '',
          type: data.type || '',
          environment: data.environment || '',
          configOption: data.configOption || ''
        }
        ElMessage.success(`正在编辑: ${data.systemName}`)
        // 清除复制数据，避免冲突
        sessionStorage.removeItem('copyRequestData')
        // 保留editRequestId用于提交时判断
      }
    } catch (error) {
      console.error('解析编辑数据失败:', error)
      sessionStorage.removeItem('editRequestData')
      sessionStorage.removeItem('editRequestId')
    }
  } else if (copyData) {
    // 复制模式 - 只有复制数据，没有编辑ID
    try {
      const data = JSON.parse(copyData)
      if (forms.value.length > 0) {
        forms.value[0] = {
          systemCode: data.systemCode || '',
          systemName: data.systemName || '',
          moduleName: data.moduleName || '',
          owner: data.owner || '',
          type: data.type || '',
          environment: data.environment || '',
          configOption: data.configOption || ''
        }
        ElMessage.success(`正在创建副本: ${data.systemName}`)
        sessionStorage.removeItem('copyRequestData')
      }
    } catch (error) {
      console.error('解析复制数据失败:', error)
      sessionStorage.removeItem('copyRequestData')
    }
  }
})
```

### 修复3: 改进提交逻辑

**修复保存类型修改的问题**:
```javascript
const handleSubmit = async () => {
  try {
    // 更准确的编辑模式判断
    const editRequestId = sessionStorage.getItem('editRequestId')
    const isEditMode = editRequestId !== null && forms.value.length === 1
    
    // 获取表单数据
    const formData = forms.value[0]
    
    if (isEditMode) {
      // 编辑模式 - 调用更新API
      const response = await fetch(`/api/requests/${editRequestId}`, {
        method: 'PUT',  // 使用PUT方法更新
        headers: {
          'Authorization': `Bearer ${userStore.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) {
        throw new Error('更新失败')
      }
      
      ElMessage.success('申请更新成功')
      
      // 清除sessionStorage
      sessionStorage.removeItem('editRequestId')
      
    } else {
      // 新建模式 - 调用创建API
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userStore.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) {
        throw new Error('提交失败')
      }
      
      ElMessage.success('申请提交成功')
    }
    
    // 跳转回列表页
    setTimeout(() => {
      router.push('/dashboard')
    }, 1000)
    
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error('操作失败: ' + error.message)
  } finally {
    submitting.value = false
  }
}
```

## 测试步骤

1. **测试编辑功能**:
   - 点击"编辑"按钮
   - 验证显示的是原始系统编号（不含-COPY）
   - 修改类型字段
   - 保存后验证修改成功

2. **测试复制功能**:
   - 点击"复制"按钮
   - 验证系统编号显示为"S-60-COPY"
   - 修改后保存
   - 验证创建了新的申请记录

3. **测试sessionStorage清理**:
   - 在浏览器开发者工具中检查sessionStorage
   - 确认每次操作后正确清理

## 预期效果

- ✅ 编辑时显示原始数据（不含-COPY）
- ✅ 复制时显示带-COPY的数据
- ✅ 修改类型后可以正常保存
- ✅ sessionStorage正确清理，无残留数据
