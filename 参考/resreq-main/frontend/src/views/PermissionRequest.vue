<template>
  <div class="permission-request">
    <div class="page-header">
      <h2 class="page-title">权限申请管理</h2>
      <div class="user-info" v-if="userStore.user">
        <span class="user-name">申请人: {{ userStore.user.username }}</span>
      </div>
    </div>

    <!-- 权限类型选择区 -->
    <el-card class="permission-types-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">选择申请权限类型</span>
          <div class="card-actions">
            <el-button size="small" @click="selectAllPermissions" :icon="Check">全选</el-button>
            <el-button size="small" @click="clearAllPermissions" :icon="Close">清空</el-button>
          </div>
        </div>
      </template>

      <div class="permission-checkbox-group">
        <el-checkbox
          v-for="permission in permissionTypes"
          :key="permission.key"
          v-model="preSelectedPermissions[permission.key]"
          :class="'permission-checkbox-' + permission.type"
          class="permission-checkbox"
        >
          <div class="permission-checkbox-content">
            <div class="permission-checkbox-icon">
              <el-icon :size="20">
                <component :is="permission.icon" />
              </el-icon>
            </div>
            <div class="permission-checkbox-info">
              <div class="permission-checkbox-name">{{ permission.name }}</div>
              <div class="permission-checkbox-desc">{{ permission.desc }}</div>
            </div>
          </div>
        </el-checkbox>
      </div>
    </el-card>

    <!-- 权限申请列表 -->
    <el-card class="list-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">我的权限申请</span>
          <div class="card-actions">
            <el-input
              v-model="searchText"
              placeholder="搜索域账号或姓名"
              clearable
              style="width: 200px; margin-right: 10px"
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-select
              v-model="statusFilter"
              placeholder="选择状态"
              clearable
              style="width: 120px; margin-right: 10px"
              @change="handleSearch"
            >
              <el-option label="已提交" value="submitted" />
              <el-option label="已通过" value="approved" />
              <el-option label="已拒绝" value="rejected" />
            </el-select>
            <el-button type="primary" @click="handleSearch" :icon="Search">搜索</el-button>
            <el-button type="success" @click="showApplyDialog" :icon="Plus">新建申请</el-button>
            <el-button @click="handleResetAndRefresh" :icon="Refresh">刷新</el-button>
          </div>
        </div>
      </template>

      <!-- Excel样式的表格 -->
      <el-table
        :data="filteredRequests"
        border
        stripe
        style="width: 100%"
        :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: '600' }"
        :cell-style="{ fontSize: '14px' }"
      >
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="domain_account" label="域账号" width="120" align="center" />
        <el-table-column prop="name" label="姓名" width="100" align="center" />
        <el-table-column prop="phone" label="手机号码" width="120" align="center" />
        <el-table-column prop="email" label="邮箱" width="150" align="center" show-overflow-tooltip />
        <el-table-column label="申请权限" width="200" align="left">
          <template #default="scope">
            <div class="permission-list-compact">
              {{ getPermissionLabels(scope.row.permissions).join('、') }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)" size="small">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="140" align="center">
          <template #default="scope">
            {{ formatDateTime(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" align="center" fixed="right">
          <template #default="scope">
            <el-button type="success" size="small" @click="viewRequest(scope.row)">
              查看
            </el-button>
            <el-button type="primary" size="small" @click="editRequest(scope.row)">
              编辑
            </el-button>
            <el-button size="small" type="danger" @click="deleteRequest(scope.row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页或统计信息 -->
      <div class="table-footer">
        <span class="total-info">共 {{ filteredRequests.length }} 条记录</span>
      </div>
    </el-card>

    <!-- 新建/编辑申请对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑权限申请' : '新建权限申请'"
      width="700px"
      @close="resetForm"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="域账号" prop="domain_account">
          <el-input
            v-model="form.domain_account"
            placeholder="请输入域账号"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="姓名" prop="name">
          <el-input
            v-model="form.name"
            placeholder="请输入姓名"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="手机号码" prop="phone">
          <el-input
            v-model="form.phone"
            placeholder="请输入手机号码（11位数字）"
            maxlength="11"
          />
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input
            v-model="form.email"
            placeholder="请输入邮箱（选填）"
          />
        </el-form-item>

        <el-form-item label="申请权限" prop="permissions" required>
          <el-checkbox-group v-model="form.permissions" class="dialog-permission-group">
            <el-checkbox
              v-for="permission in permissionTypes"
              :key="permission.key"
              :label="permission.key"
              border
              class="dialog-permission-checkbox"
            >
              {{ permission.name }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="loading">
          提交申请
        </el-button>
      </template>
    </el-dialog>

    <!-- 查看详情对话框 -->
    <el-dialog v-model="viewDialog" title="权限申请详情" width="600px">
      <div v-if="currentRequest" class="detail-view">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="域账号">{{ currentRequest.domain_account || '-' }}</el-descriptions-item>
          <el-descriptions-item label="姓名">{{ currentRequest.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="手机号码">{{ currentRequest.phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ currentRequest.email || '-' }}</el-descriptions-item>
          <el-descriptions-item label="申请权限" :span="2">
            <el-tag
              v-for="perm in getPermissionLabels(currentRequest.permissions)"
              :key="perm"
              size="small"
              style="margin: 2px;"
            >
              {{ perm }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentRequest.status)" size="small">
              {{ getStatusText(currentRequest.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(currentRequest.created_at) }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="viewDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import {
  Search, Refresh, Plus, Check, Close, Key, Box, Opportunity, List, DataAnalysis, Service, Lock, Connection
} from '@element-plus/icons-vue'
import {
  getMyPermissionRequests,
  createPermissionRequest,
  getPermissionRequestById,
  updatePermissionRequest,
  deletePermissionRequest as deletePermissionRequestAPI
} from '@/api/permission'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const formRef = ref(null)
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const viewDialog = ref(false)
const currentRequest = ref(null)

// 列表相关
const allRequests = ref([])
const searchText = ref('')
const statusFilter = ref('')

// 表单相关
const preSelectedPermissions = reactive({
  pam: true,
  container: true,
  pipeline: true,
  log: true,
  borui: true,
  iam: true,
  gitlab: true,
  vpn_gitlab: true
})

const form = reactive({
  domain_account: '',
  name: '',
  phone: '',
  email: '',
  permissions: []
})

// 权限类型定义
const permissionTypes = [
  { key: 'pam', name: 'PAM权限', desc: '特权账号管理权限', icon: Lock, type: 'primary' },
  { key: 'container', name: '容器平台', desc: '容器化应用管理平台', icon: Box, type: 'success' },
  { key: 'pipeline', name: '流水线', desc: 'CI/CD流水线权限', icon: Opportunity, type: 'warning' },
  { key: 'log', name: '日志平台', desc: '日志查看和分析权限', icon: List, type: 'info' },
  { key: 'borui', name: '博睿平台', desc: '性能监控平台权限', icon: DataAnalysis, type: 'danger' },
  { key: 'iam', name: 'IAM权限', desc: '身份与访问管理权限', icon: Key, type: 'primary' },
  { key: 'gitlab', name: 'GitLab代码库', desc: '代码仓库访问权限', icon: Service, type: 'success' },
  { key: 'vpn_gitlab', name: 'VPN访问GitLab', desc: 'VPN方式访问GitLab', icon: Connection, type: 'warning' }
]

// 权限对象
const permissionsObject = computed(() => {
  const perms = {
    pam: false,
    container: false,
    pipeline: false,
    log: false,
    borui: false,
    iam: false,
    gitlab: false,
    vpn_gitlab: false
  }

  form.permissions.forEach(key => {
    if (perms.hasOwnProperty(key)) {
      perms[key] = true
    }
  })

  return perms
})

// 过滤后的列表
const filteredRequests = computed(() => {
  let filtered = allRequests.value

  // 按状态筛选
  if (statusFilter.value) {
    filtered = filtered.filter(req => req.status === statusFilter.value)
  }

  // 按文本搜索
  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    filtered = filtered.filter(req =>
      req.domain_account?.toLowerCase().includes(search) ||
      req.name?.toLowerCase().includes(search)
    )
  }

  return filtered
})

// 表单验证规则
const rules = {
  domain_account: [
    { required: true, message: '请输入域账号', trigger: 'blur' },
    { min: 1, max: 50, message: '域账号长度在1-50个字符', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 1, max: 100, message: '姓名长度在1-100个字符', trigger: 'blur' },
    { pattern: /^[\u4e00-\u9fa5a-zA-Z]+$/, message: '姓名只能包含中文和英文', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号码', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码格式', trigger: 'blur' }
  ],
  email: [
    {
      validator: (rule, value, callback) => {
        if (!value) {
          callback()
          return
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) {
          callback(new Error('请输入正确的邮箱格式'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  permissions: [
    {
      type: 'array',
      required: true,
      message: '请至少选择一种权限类型',
      trigger: 'change'
    }
  ]
}

// 获取权限标签
const getPermissionLabels = (permissions) => {
  const labels = []
  const permissionNames = {
    pam: 'PAM权限',
    container: '容器平台',
    pipeline: '流水线',
    log: '日志平台',
    borui: '博睿平台',
    iam: 'IAM权限',
    gitlab: 'GitLab代码库',
    vpn_gitlab: 'VPN访问GitLab'
  }

  Object.keys(permissions).forEach(key => {
    if (permissions[key] === true && permissionNames[key]) {
      labels.push(permissionNames[key])
    }
  })

  return labels
}

// 获取权限标签颜色
const getPermissionTagType = (permission) => {
  const tagColors = {
    'IAM权限': 'primary',
    '容器平台': 'success',
    '流水线': 'warning',
    '日志平台': 'info',
    '博睿平台': 'danger',
    'PAM权限': 'primary',
    'GitLab代码库': 'success',
    'VPN访问GitLab': 'warning'
  }
  return tagColors[permission] || 'default'
}

// 获取状态类型
const getStatusType = (status) => {
  const types = {
    submitted: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return types[status] || 'info'
}

// 获取状态文本
const getStatusText = (status) => {
  const texts = {
    submitted: '已提交',
    approved: '已通过',
    rejected: '已拒绝'
  }
  return texts[status] || status
}

// 格式化日期时间
const formatDateTime = (dateTime) => {
  if (!dateTime) return '-'
  const date = new Date(dateTime)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 显示申请对话框
const showApplyDialog = () => {
  // 使用用户预先选择的权限类型
  form.permissions = Object.keys(preSelectedPermissions).filter(
    key => preSelectedPermissions[key] === true
  )

  // 检查是否至少选择了一种权限类型
  if (form.permissions.length === 0) {
    ElMessage.warning('请先在页面顶部至少勾选一种权限类型')
    return
  }

  dialogVisible.value = true
}

// 全选权限类型
const selectAllPermissions = () => {
  Object.keys(preSelectedPermissions).forEach(key => {
    preSelectedPermissions[key] = true
  })
}

// 清空权限类型选择
const clearAllPermissions = () => {
  Object.keys(preSelectedPermissions).forEach(key => {
    preSelectedPermissions[key] = false
  })
}

// 加载权限申请列表
const loadPermissionRequests = async () => {
  try {
    const response = await getMyPermissionRequests({ page: 1, pageSize: 1000 })
    allRequests.value = response.requests || []
  } catch (error) {
    console.error('加载权限申请列表失败:', error)
  }
}

// 搜索处理
const handleSearch = () => {
  // 搜索逻辑通过computed自动实现
  // 这里提供搜索反馈
  const searchInfo = []
  if (searchText.value) {
    searchInfo.push(`关键词"${searchText.value}"`)
  }
  if (statusFilter.value) {
    const statusText = {
      draft: '草稿',
      submitted: '已提交',
      approved: '已通过',
      rejected: '已拒绝'
    }
    searchInfo.push(`状态"${statusText[statusFilter.value]}"`)
  }

  if (searchInfo.length > 0) {
    ElMessage.success(`搜索条件: ${searchInfo.join('、')}，找到 ${filteredRequests.value.length} 条记录`)
  } else {
    ElMessage.info(`显示全部 ${filteredRequests.value.length} 条记录`)
  }
}

// 重置搜索条件并刷新
const handleResetAndRefresh = () => {
  searchText.value = ''
  statusFilter.value = ''
  loadPermissionRequests()
  ElMessage.success('已刷新并重置搜索条件')
}

// 加载编辑数据
const loadEditData = async () => {
  try {
    const response = await getPermissionRequestById(editId.value)

    form.domain_account = response.domain_account
    form.name = response.name
    form.phone = response.phone
    form.email = response.email || ''

    // 设置选中的权限
    form.permissions = Object.keys(response.permissions).filter(
      key => response.permissions[key] === true
    )
  } catch (error) {
    console.error('加载申请数据失败:', error)
    ElMessage.error('加载申请数据失败')
    dialogVisible.value = false
  }
}

// 编辑申请
const editRequest = (request) => {
  isEdit.value = true
  editId.value = request.id
  dialogVisible.value = true
  loadEditData()
}

// 查看申请详情
const viewRequest = (request) => {
  currentRequest.value = request
  viewDialog.value = true
}

// 删除申请
const deleteRequest = async (request) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除 ${request.name} (${request.domain_account}) 的权限申请吗？此操作不可恢复！`,
      '删除权限申请',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await deletePermissionRequestAPI(request.id)
    ElMessage.success('删除成功')
    await loadPermissionRequests()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

// 提交申请
const handleSubmit = async () => {
  try {
    await formRef.value.validate()

    // 再次检查权限选择
    if (form.permissions.length === 0) {
      ElMessage.warning('请至少选择一种权限类型')
      return
    }

    loading.value = true

    const requestData = {
      domain_account: form.domain_account,
      name: form.name,
      phone: form.phone,
      email: form.email,
      permissions: permissionsObject.value,
      status: 'submitted'
    }

    if (isEdit.value) {
      await updatePermissionRequest(editId.value, requestData)
      ElMessage.success('权限申请更新成功')
    } else {
      await createPermissionRequest(requestData)
      ElMessage.success('权限申请提交成功')
    }

    await loadPermissionRequests()
    dialogVisible.value = false
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error('提交失败: ' + (error.response?.data?.message || error.message))
  } finally {
    loading.value = false
  }
}

// 保存草稿
const handleSaveDraft = async () => {
  try {
    await formRef.value.validate()

    // 检查权限选择（草稿也至少需要一种权限）
    if (form.permissions.length === 0) {
      ElMessage.warning('请至少选择一种权限类型')
      return
    }

    loading.value = true

    const requestData = {
      domain_account: form.domain_account,
      name: form.name,
      phone: form.phone,
      email: form.email,
      permissions: permissionsObject.value,
      status: 'draft'
    }

    if (isEdit.value) {
      await updatePermissionRequest(editId.value, requestData)
      ElMessage.success('草稿保存成功')
    } else {
      await createPermissionRequest(requestData)
      ElMessage.success('草稿创建成功')
    }

    await loadPermissionRequests()
    dialogVisible.value = false
  } catch (error) {
    console.error('保存草稿失败:', error)
    ElMessage.error('保存草稿失败: ' + (error.response?.data?.message || error.message))
  } finally {
    loading.value = false
  }
}

// 重置表单
const resetForm = () => {
  isEdit.value = false
  editId.value = null
  form.domain_account = ''
  form.name = ''
  form.phone = ''
  form.email = ''
  form.permissions = []
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

onMounted(async () => {
  if (!userStore.user) {
    userStore.loadUserFromStorage()
  }

  // 加载权限申请列表
  await loadPermissionRequests()

  // 处理 query 参数编辑模式
  const editIdParam = route.query.id
  const isEditParam = route.query.edit
  const isViewParam = route.query.view
  if (editIdParam && isEditParam) {
    try {
      const response = await getPermissionRequestById(editIdParam)
      if (response) {
        editRequest(response)
      }
    } catch (error) {
      console.error('加载权限申请详情失败:', error)
      ElMessage.error('加载申请详情失败')
    }
  } else if (editIdParam && isViewParam) {
    try {
      const response = await getPermissionRequestById(editIdParam)
      if (response) {
        viewRequest(response)
      }
    } catch (error) {
      console.error('加载权限申请详情失败:', error)
      ElMessage.error('加载申请详情失败')
    }
  }
})
</script>

<style scoped>
.permission-request {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  color: #303133;
  font-weight: 600;
}

.user-info {
  margin: 8px 0 0 0;
  font-size: 14px;
  color: #606266;
}

.user-name {
  font-weight: 500;
}

/* 权限类型选择区样式 */
.permission-types-card {
  margin-bottom: 20px;
}

.permission-checkbox-group {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 10px 0;
}

.permission-checkbox {
  margin: 0 !important;
  padding: 12px;
  border-radius: 8px;
  border: 2px solid #e9ecef;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  transition: all 0.3s ease;
  height: auto;
  line-height: normal;
}

.permission-checkbox:hover {
  border-color: #409eff;
  background: linear-gradient(135deg, #e8f4ff 0%, #ffffff 100%);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}

.permission-checkbox :deep(.el-checkbox__label) {
  padding-left: 8px;
  width: 100%;
}

.permission-checkbox :deep(.el-checkbox__input.is-checked + .el-checkbox__label) {
  color: #303133;
}

.permission-checkbox-primary:hover {
  border-color: #409eff;
  background: linear-gradient(135deg, #e8f4ff 0%, #ffffff 100%);
}

.permission-checkbox-success:hover {
  border-color: #67c23a;
  background: linear-gradient(135deg, #f0fff4 0%, #ffffff 100%);
}

.permission-checkbox-warning:hover {
  border-color: #e6a23c;
  background: linear-gradient(135deg, #fff8e6 0%, #ffffff 100%);
}

.permission-checkbox-info:hover {
  border-color: #909399;
  background: linear-gradient(135deg, #f4f4f5 0%, #ffffff 100%);
}

.permission-checkbox-danger:hover {
  border-color: #f56c6c;
  background: linear-gradient(135deg, #fee 0%, #ffffff 100%);
}

.permission-checkbox-content {
  display: flex;
  align-items: center;
  width: 100%;
}

.permission-checkbox-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  margin-right: 12px;
  color: #ffffff;
  flex-shrink: 0;
}

.permission-checkbox-primary .permission-checkbox-icon {
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
}

.permission-checkbox-success .permission-checkbox-icon {
  background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
}

.permission-checkbox-warning .permission-checkbox-icon {
  background: linear-gradient(135deg, #e6a23c 0%, #ebb563 100%);
}

.permission-checkbox-info .permission-checkbox-icon {
  background: linear-gradient(135deg, #909399 0%, #a6a9ad 100%);
}

.permission-checkbox-danger .permission-checkbox-icon {
  background: linear-gradient(135deg, #f56c6c 0%, #f78989 100%);
}

.permission-checkbox-info {
  flex: 1;
}

.permission-checkbox-name {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
  margin-bottom: 2px;
}

.permission-checkbox-desc {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

/* 选中状态的复选框样式 */
.permission-checkbox :deep(.el-checkbox__input.is-checked) {
  background-color: #409eff;
  border-color: #409eff;
}

.permission-checkbox-primary :deep(.el-checkbox__input.is-checked) {
  background-color: #409eff;
  border-color: #409eff;
}

.permission-checkbox-success :deep(.el-checkbox__input.is-checked) {
  background-color: #67c23a;
  border-color: #67c23a;
}

.permission-checkbox-warning :deep(.el-checkbox__input.is-checked) {
  background-color: #e6a23c;
  border-color: #e6a23c;
}

.permission-checkbox-info :deep(.el-checkbox__input.is-checked) {
  background-color: #909399;
  border-color: #909399;
}

.permission-checkbox-danger :deep(.el-checkbox__input.is-checked) {
  background-color: #f56c6c;
  border-color: #f56c6c;
}

/* 列表卡片样式 */
.list-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-weight: 600;
  font-size: 16px;
  color: #303133;
}

.card-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.card-actions .el-input {
  flex-shrink: 0;
}

/* 移除不再使用的search-bar样式 */
/* .search-bar {
  margin-bottom: 15px;
} */

.table-footer {
  margin-top: 15px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.total-info {
  color: #606266;
  font-size: 14px;
}

/* 表单对话框样式 */
.form-tip {
  margin-top: 8px;
}

.el-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

:deep(.el-checkbox) {
  margin-right: 0;
}

.dialog-permission-checkbox {
  margin-right: 0 !important;
  margin-bottom: 0 !important;
}

/* Excel样式表格优化 */
:deep(.el-table) {
  font-family: 'Microsoft YaHei', Arial, sans-serif;
}

:deep(.el-table th) {
  font-weight: 600;
  background: linear-gradient(to bottom, #f8f9fa, #e9ecef);
}

:deep(.el-table td) {
  padding: 12px 0;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background: #f8f9fa;
}

:deep(.el-table__body tr:hover > td) {
  background-color: #e3f2fd !important;
}

/* 权限列表紧凑样式 */
.permission-list-compact {
  line-height: 1.4;
  max-height: 2.8em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-all;
}

/* 响应式适配 */
@media (max-width: 1200px) {
  .permission-checkbox-group {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 900px) {
  .permission-checkbox-group {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>