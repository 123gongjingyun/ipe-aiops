<template>
  <div class="container-request">
    <div class="content-container">
      <!-- 表单区域 -->
      <el-card v-if="showForm || isEditMode" class="form-card">
        <el-alert
          v-if="isEditMode"
          title="编辑模式"
          type="warning"
          description="您正在编辑现有申请，修改后将直接更新原申请记录，不会创建新记录。"
          :closable="false"
          style="margin-bottom: 20px"
        />

        <el-alert
          v-else
          title="新建容器申请说明"
          type="info"
          description="填写容器申请的相关信息，所有带*的字段为必填项。总CPU和总内存会自动计算。"
          :closable="false"
          style="margin-bottom: 20px"
        />

        <el-form :model="form" :rules="formRules" ref="formRef" class="table-form">
          <el-table :data="[form]" border stripe class="form-table" style="width: 100%">
            <el-table-column label="环境" width="100" align="center">
              <template #default="scope">
                <el-form-item prop="environmentId" class="table-cell-form-item">
                  <el-select
                    v-model="form.environmentId"
                    placeholder="选择环境"
                    :disabled="false"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="env in environments"
                      :key="env.id"
                      :label="env.name"
                      :value="env.id"
                    />
                  </el-select>
                </el-form-item>
              </template>
            </el-table-column>

            <el-table-column label="系统代码*" width="130" align="center">
              <template #default>
                <el-form-item prop="system_code" class="table-cell-form-item">
                  <el-input
                    v-model="form.system_code"
                    placeholder="系统代码"
                    :disabled="false"
                  />
                </el-form-item>
              </template>
            </el-table-column>

            <el-table-column label="供应商*" width="120" align="center">
              <template #default>
                <el-form-item prop="supplier" class="table-cell-form-item">
                  <el-input
                    v-model="form.supplier"
                    placeholder="供应商"
                    :disabled="false"
                  />
                </el-form-item>
              </template>
            </el-table-column>

            <el-table-column label="应用英文名*" width="180" align="center">
              <template #default>
                <el-form-item prop="app_english_name" class="table-cell-form-item">
                  <el-input
                    v-model="form.app_english_name"
                    placeholder="应用英文名称"
                    :disabled="false"
                  />
                </el-form-item>
              </template>
            </el-table-column>

            <el-table-column label="应用描述*" width="180" align="center">
              <template #default>
                <el-form-item prop="app_description" class="table-cell-form-item">
                  <el-input
                    v-model="form.app_description"
                    placeholder="应用描述"
                    :disabled="false"
                  />
                </el-form-item>
              </template>
            </el-table-column>

            <el-table-column label="实例数*" width="90" align="center">
              <template #default>
                <el-form-item prop="instance_count" class="table-cell-form-item">
                  <el-input
                    v-model="form.instance_count"
                    placeholder="实例数"
                    :disabled="false"
                    @input="calculateTotals"
                  />
                </el-form-item>
              </template>
            </el-table-column>

            <el-table-column label="单CPU*" width="90" align="center">
              <template #default>
                <el-form-item prop="cpu_per_instance" class="table-cell-form-item">
                  <el-select
                    v-model="form.cpu_per_instance"
                    placeholder="选择CPU"
                    :disabled="false"
                    @change="calculateTotals"
                    style="width: 100%"
                  >
                    <el-option label="1C" value="1" />
                    <el-option label="2C" value="2" />
                  </el-select>
                </el-form-item>
              </template>
            </el-table-column>

            <el-table-column label="单内存*" width="100" align="center">
              <template #default>
                <el-form-item prop="memory_per_instance_gb" class="table-cell-form-item">
                  <el-select
                    v-model="form.memory_per_instance_gb"
                    placeholder="选择内存"
                    :disabled="false"
                    @change="calculateTotals"
                    style="width: 100%"
                  >
                    <el-option label="2G" value="2" />
                    <el-option label="4G" value="4" />
                  </el-select>
                </el-form-item>
              </template>
            </el-table-column>

            <el-table-column label="备注" width="180" align="center">
              <template #default>
                <el-form-item class="table-cell-form-item">
                  <el-input
                    v-model="form.remarks"
                    placeholder="备注（可选）"
                    :disabled="false"
                  />
                </el-form-item>
              </template>
            </el-table-column>

            <el-table-column label="申请人" width="100" align="center">
              <template #default>
                <el-form-item prop="applicant" class="table-cell-form-item">
                  <el-input v-model="form.applicant" disabled />
                </el-form-item>
              </template>
            </el-table-column>
          </el-table>

          <div class="form-actions">
            <el-button type="primary" @click="submitForm" :loading="submitting">
              {{ isEditMode ? '更新' : '提交' }}
            </el-button>
            <el-button v-if="!isEditMode" @click="resetForm">重置</el-button>
            <el-button @click="cancelForm">取消</el-button>
          </div>
        </el-form>
      </el-card>

      <!-- 列表区域 -->
      <el-card class="list-card">
        <div class="list-header">
          <h3>我的容器申请列表</h3>
          <div class="search-filters">
            <el-input
              v-model="searchForm.system_code"
              placeholder="搜索系统代码"
              clearable
              style="width: 200px; margin-right: 10px"
            />
            <el-input
              v-model="searchForm.supplier"
              placeholder="搜索供应商"
              clearable
              style="width: 200px; margin-right: 10px"
            />
            <el-select
              v-model="searchForm.status"
              placeholder="选择状态"
              clearable
              style="width: 150px; margin-right: 10px"
            >
              <el-option label="已提交" value="submitted" />
              <el-option label="已批准" value="approved" />
              <el-option label="已拒绝" value="rejected" />
            </el-select>
            <el-button type="primary" @click="loadRequests">搜索</el-button>
            <el-button
              v-if="!showForm"
              type="success"
              @click="openCreateForm"
              style="margin-left: 10px"
            >
              <el-icon><Plus /></el-icon>
              新建申请
            </el-button>
          </div>
        </div>

        <div class="requests-list" v-loading="loading">
          <el-empty v-if="requests.length === 0 && !loading" description="暂无容器申请记录" />

          <el-table :data="requests" border stripe style="width: 100%" v-else>
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="environment_name" label="环境" width="80" align="center" />
            <el-table-column prop="system_code" label="系统代码" width="110" align="center" />
            <el-table-column prop="supplier" label="供应商" width="100" align="center" show-overflow-tooltip />
            <el-table-column prop="app_english_name" label="应用英文名" width="130" align="center" show-overflow-tooltip />
            <el-table-column prop="app_description" label="应用描述" width="150" align="center" show-overflow-tooltip />
            <el-table-column prop="instance_count" label="实例数" width="70" align="center" />
            <el-table-column prop="cpu_per_instance" label="单CPU" width="70" align="center" />
            <el-table-column prop="memory_per_instance_gb" label="单内存" width="70" align="center" />
            <el-table-column prop="total_cpu" label="总CPU" width="70" align="center" />
            <el-table-column prop="total_memory_gb" label="总内存" width="70" align="center" />
            <el-table-column prop="status" label="状态" width="80" align="center">
              <template #default="scope">
                <el-tag :type="getStatusType(scope.row.status)" size="small">
                  {{ getStatusText(scope.row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="submitted_at" label="提交时间" width="140" align="center">
              <template #default="scope">
                {{ formatDateTime(scope.row.submitted_at) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" align="center" fixed="right">
              <template #default="scope">
                <el-button
                  type="success"
                  size="small"
                  @click="viewRequest(scope.row)"
                >
                  查看
                </el-button>
                <el-button
                  v-if="userStore.isAdmin() || scope.row.user_id === userStore.user.id"
                  type="primary"
                  size="small"
                  @click="editRequest(scope.row)"
                >
                  编辑
                </el-button>
                <el-button
                  type="danger"
                  size="small"
                  @click="deleteRequest(scope.row)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
            <el-table-column prop="applicant" label="申请人" width="90" align="center" fixed="right">
              <template #default="scope">
                {{ scope.row.applicant }}
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 分页 -->
        <div class="pagination-container" v-if="pagination.total > 0">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadRequests"
            @current-change="loadRequests"
          />
        </div>
      </el-card>
    </div>

    <!-- 查看详情对话框 -->
    <el-dialog v-model="viewDialog" title="容器申请详情" width="700px">
      <div v-if="currentRequest" class="detail-view">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="环境">{{ currentRequest.environment_name }}</el-descriptions-item>
          <el-descriptions-item label="申请人">{{ currentRequest.applicant }}</el-descriptions-item>
          <el-descriptions-item label="系统编号">{{ currentRequest.system_code }}</el-descriptions-item>
          <el-descriptions-item label="应用供应商">{{ currentRequest.supplier }}</el-descriptions-item>
          <el-descriptions-item label="应用英文名" :span="2">{{ currentRequest.app_english_name }}</el-descriptions-item>
          <el-descriptions-item label="应用描述" :span="2">{{ currentRequest.app_description }}</el-descriptions-item>
          <el-descriptions-item label="实例数量">{{ currentRequest.instance_count }}</el-descriptions-item>
          <el-descriptions-item label="单实例CPU">{{ currentRequest.cpu_per_instance }}C</el-descriptions-item>
          <el-descriptions-item label="单实例内存">{{ currentRequest.memory_per_instance_gb }}G</el-descriptions-item>
          <el-descriptions-item label="总CPU">{{ currentRequest.total_cpu }}C</el-descriptions-item>
          <el-descriptions-item label="总内存">{{ currentRequest.total_memory_gb }}G</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentRequest.status)">
              {{ getStatusText(currentRequest.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="提交时间" :span="2">{{ formatDateTime(currentRequest.submitted_at) }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2" v-if="currentRequest.remarks">{{ currentRequest.remarks }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="viewDialog = false">关闭</el-button>
        <el-button
          v-if="currentRequest && (currentRequest.status === 'draft' || currentRequest.user_id === userStore.user.id)"
          type="primary"
          @click="editRequest(currentRequest)"
        >
          编辑
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import {
  getMyContainerRequests,
  getAllContainerRequests,
  getContainerRequestById,
  createContainerRequest,
  updateContainerRequest,
  deleteContainerRequest
} from '@/api/container'
import { getEnvironments } from '@/api/config'

const userStore = useUserStore()
const route = useRoute()
const formRef = ref(null)
const loading = ref(false)
const submitting = ref(false)
const showForm = ref(false)
const isEditMode = ref(false)
const editingId = ref(null)
const viewDialog = ref(false)
const currentRequest = ref(null)

// 表单数据
const form = reactive({
  environmentId: '',
  applicant: '',
  system_code: '',
  supplier: '',
  app_english_name: '',
  app_description: '',
  remarks: '',
  instance_count: '',
  cpu_per_instance: '',
  memory_per_instance_gb: '',
  total_cpu: '',
  total_memory_gb: ''
})

// 搜索条件
const searchForm = reactive({
  system_code: '',
  supplier: '',
  status: ''
})

// 列表数据
const requests = ref([])
const environments = ref([])

// 分页信息
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 表单验证规则
const formRules = {
  environmentId: [{ required: true, message: '请选择环境', trigger: 'change' }],
  applicant: [{ required: true, message: '申请人不能为空', trigger: 'blur' }],
  system_code: [{ required: true, message: '请输入系统代码', trigger: 'blur' }],
  supplier: [{ required: true, message: '请输入供应商', trigger: 'blur' }],
  app_english_name: [{ required: true, message: '请输入应用英文名称', trigger: 'blur' }],
  app_description: [{ required: true, message: '请输入应用描述', trigger: 'blur' }],
  instance_count: [{ required: true, message: '请输入实例个数', trigger: 'blur' }],
  cpu_per_instance: [{ required: true, message: '请输入单实例CPU', trigger: 'blur' }],
  memory_per_instance_gb: [{ required: true, message: '请输入单实例内存', trigger: 'blur' }]
}

// 计算总CPU和总内存
const calculateTotals = () => {
  const instanceCount = parseFloat(form.instance_count) || 0
  const cpuPerInstance = parseFloat(form.cpu_per_instance) || 0
  const memoryPerInstance = parseFloat(form.memory_per_instance_gb) || 0

  if (instanceCount && cpuPerInstance) {
    form.total_cpu = (instanceCount * cpuPerInstance).toFixed(1)
  } else {
    form.total_cpu = ''
  }

  if (instanceCount && memoryPerInstance) {
    form.total_memory_gb = (instanceCount * memoryPerInstance).toFixed(1)
  } else {
    form.total_memory_gb = ''
  }
}

// 初始化用户信息
const initUserInfo = () => {
  if (userStore.user) {
    form.applicant = userStore.user.realName || userStore.user.username || ''
  } else {
    form.applicant = ''
  }
}

// 加载环境列表
const loadEnvironments = async () => {
  try {
    const response = await getEnvironments()
    environments.value = response.data || []
  } catch (error) {
    console.error('加载环境列表失败:', error)
    ElMessage.error('加载环境列表失败')
  }
}

// 加载容器申请列表
const loadRequests = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...searchForm
    }

    // 管理员查看所有申请，普通用户只查看自己的申请
    const response = userStore.isAdmin()
      ? await getAllContainerRequests(params)
      : await getMyContainerRequests(params)

    requests.value = response.requests || []
    pagination.total = response.pagination?.total || 0
  } catch (error) {
    console.error('加载容器申请列表失败:', error)
    ElMessage.error('加载容器申请列表失败')
  } finally {
    loading.value = false
  }
}

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    submitting.value = true

    // 转换数字字段
    const submitData = {
      ...form,
      instance_count: parseFloat(form.instance_count) || 0,
      cpu_per_instance: parseFloat(form.cpu_per_instance) || 0,
      memory_per_instance_gb: parseFloat(form.memory_per_instance_gb) || 0,
      total_cpu: parseFloat(form.total_cpu) || 0,
      total_memory_gb: parseFloat(form.total_memory_gb) || 0
    }

    if (isEditMode.value) {
      // 编辑模式
      await updateContainerRequest(editingId.value, submitData)
      ElMessage.success('容器申请更新成功')
    } else {
      // 新建模式
      await createContainerRequest(submitData)
      ElMessage.success('容器申请创建成功')
    }

    // 重置表单并重新加载列表
    resetForm()
    showForm.value = false
    await loadRequests()
  } catch (error) {
    console.error('提交容器申请失败:', error)
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      ElMessage.error('提交容器申请失败')
    }
  } finally {
    submitting.value = false
  }
}

// 重置表单
const resetForm = () => {
  formRef.value?.resetFields()
  Object.assign(form, {
    environmentId: '',
    system_code: '',
    supplier: '',
    app_english_name: '',
    app_description: '',
    remarks: '',
    instance_count: '',
    cpu_per_instance: '',
    memory_per_instance_gb: '',
    total_cpu: '',
    total_memory_gb: ''
  })

  // 重新填充用户信息
  initUserInfo()

  isEditMode.value = false
  editingId.value = null
}

// 打开创建表单
const openCreateForm = () => {
  // 重置表单
  resetForm()
  // 显示表单
  showForm.value = true
}

// 取消表单
const cancelForm = () => {
  showForm.value = false
  resetForm()
}

// 编辑申请
const editRequest = (request) => {
  // 如果从查看对话框进入编辑，关闭查看对话框
  viewDialog.value = false

  isEditMode.value = true
  editingId.value = request.id
  showForm.value = true

  // 填充表单数据，将数字转换为字符串
  Object.assign(form, {
    environmentId: request.environment_id,
    applicant: request.applicant,
    system_code: request.system_code,
    supplier: request.supplier,
    app_english_name: request.app_english_name,
    app_description: request.app_description,
    remarks: request.remarks || '',
    instance_count: request.instance_count?.toString() || '',
    cpu_per_instance: request.cpu_per_instance?.toString() || '',
    memory_per_instance_gb: request.memory_per_instance_gb?.toString() || '',
    total_cpu: request.total_cpu?.toString() || '',
    total_memory_gb: request.total_memory_gb?.toString() || '',
    status: request.status // 添加状态字段
  })
}

// 查看申请详情
const viewRequest = (request) => {
  currentRequest.value = request
  viewDialog.value = true
}

// 删除申请
const deleteRequest = async (request) => {
  try {
    const appName = request.app_english_name || request.system_code || '该应用'
    await ElMessageBox.confirm(
      `确定要删除应用 "${appName}" 的容器申请吗？此操作不可恢复！`,
      '删除容器申请',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await deleteContainerRequest(request.id)
    ElMessage.success('容器申请删除成功')
    await loadRequests()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除容器申请失败:', error)
      ElMessage.error('删除容器申请失败')
    }
  }
}

// 获取状态类型
const getStatusType = (status) => {
  const typeMap = {
    submitted: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return typeMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status) => {
  const textMap = {
    submitted: '已提交',
    approved: '已批准',
    rejected: '已拒绝'
  }
  return textMap[status] || status
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

// 组件挂载时初始化
onMounted(async () => {
  // 确保用户信息已加载
  if (!userStore.user) {
    userStore.loadUserFromStorage()
  }

  initUserInfo()
  await Promise.all([
    loadEnvironments(),
    loadRequests()
  ])

  // 处理 query 参数编辑模式
  const editId = route.query.id
  const isEdit = route.query.edit
  const isView = route.query.view
  if (editId && isEdit) {
    try {
      const response = await getContainerRequestById(editId)
      if (response) {
        editRequest(response)
      }
    } catch (error) {
      console.error('加载容器申请详情失败:', error)
      ElMessage.error('加载申请详情失败')
    }
  } else if (editId && isView) {
    try {
      const response = await getContainerRequestById(editId)
      if (response) {
        viewRequest(response)
      }
    } catch (error) {
      console.error('加载容器申请详情失败:', error)
      ElMessage.error('加载申请详情失败')
    }
  }

  // 检查是否有快速创建标记
  if (sessionStorage.getItem('quickCreate') === 'true') {
    sessionStorage.removeItem('quickCreate')
    openCreateForm()
  }
})
</script>

<style scoped>
.container-request {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.content-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-card {
  margin-bottom: 20px;
}

.table-form {
  border: none;
}

.form-table {
  margin-bottom: 20px;
}

.table-cell-form-item {
  margin-bottom: 0 !important;
}

.table-cell-form-item .el-form-item__content {
  line-height: normal;
}

.form-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  padding: 20px 0;
}

.list-card {
  flex: 1;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.list-header h3 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.search-filters {
  display: flex;
  align-items: center;
}

.requests-list {
  min-height: 200px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.detail-view {
  padding: 10px 0;
}

:deep(.el-descriptions__label) {
  font-weight: 600;
  background-color: #f5f7fa;
}

:deep(.el-descriptions__body) {
  background-color: #ffffff;
}

:deep(.el-descriptions__cell) {
  padding: 12px 16px;
}
</style>
