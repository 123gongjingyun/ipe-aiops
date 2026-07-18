<template>
  <div class="obs-request">
    <div class="content-container">
      <!-- 表单区域 -->
      <el-card v-if="showForm || isEditMode" class="form-card">
        <el-form :model="form" :rules="formRules" ref="formRef" label-width="140px">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="所属环境" prop="environmentId">
                <el-select
                  v-model="form.environmentId"
                  placeholder="请选择环境"
                >
                  <el-option
                    v-for="env in environments"
                    :key="env.id"
                    :label="env.name"
                    :value="env.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="申请人" prop="applicant">
                <el-input v-model="form.applicant" disabled />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="域账号" prop="domain_account">
                <el-input
                  v-model="form.domain_account"
                  placeholder="请输入域账号"
                  disabled
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="应用供应商名称*" prop="supplier_name">
                <el-input
                  v-model="form.supplier_name"
                  placeholder="请输入应用供应商名称"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="所属系统*" prop="system_name">
                <el-input
                  v-model="form.system_name"
                  placeholder="请输入所属系统"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="应用担当*" prop="application_owner">
                <el-input
                  v-model="form.application_owner"
                  placeholder="请输入应用担当"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="应用所属业务*" prop="business_name">
                <el-select
                  v-model="form.business_name"
                  placeholder="请选择应用所属业务"
                  style="width: 100%"
                >
                  <el-option
                    v-for="option in businessNameOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="桶名称*" prop="bucket_name">
                <el-input
                  v-model="form.bucket_name"
                  placeholder="请输入桶名称，例：生产环境 gtmc-prod-xxx-service，测试环境 gtmc-test-xxx-service"
                />
                <div class="form-tip">
                  <el-text type="info" size="small">
                    命名规则：{前缀}-{环境}-{业务标识}-service，例：gtmc-prod-sharefile-service（生产）、gtmc-test-backup-service（测试）
                  </el-text>
                </div>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="桶内目录名称" prop="bucket_directory">
                <el-input
                  v-model="form.bucket_directory"
                  placeholder="如不需要可不填，例：data/files/logs"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="容量大小(GB)*" prop="capacity_size_gb">
                <el-input-number
                  v-model="form.capacity_size_gb"
                  :min="0.01"
                  :step="0.01"
                  :precision="2"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="AK SK数量*" prop="ak_sk_count">
                <el-input-number
                  v-model="form.ak_sk_count"
                  :min="1"
                  :step="1"
                  :precision="0"
                  style="width: 100%"
                  placeholder="请输入需要的访问密钥数量"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="使用时间*" prop="usage_duration">
                <el-select
                  v-model="form.usage_duration"
                  placeholder="请选择使用时间"
                  style="width: 100%"
                >
                  <el-option
                    v-for="option in usageDurationOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="备注" prop="remarks">
            <el-input
              v-model="form.remarks"
              type="textarea"
              :rows="3"
              placeholder="请输入备注信息"
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="submitForm" :loading="submitting">
              {{ isEditMode ? '更新' : '提交' }}
            </el-button>
            <el-button v-if="!isEditMode" @click="resetForm">重置</el-button>
            <el-button @click="cancelForm">取消</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 列表区域 -->
      <el-card class="list-card">
        <div class="list-header">
          <h3>我的OBS申请列表</h3>
          <div class="search-filters">
            <el-input
              v-model="searchForm.system_name"
              placeholder="搜索系统名称"
              clearable
              style="width: 200px; margin-right: 10px"
            />
            <el-input
              v-model="searchForm.bucket_name"
              placeholder="搜索桶名称"
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
          <el-empty v-if="requests.length === 0 && !loading" description="暂无OBS申请记录" />

          <el-row :gutter="20" v-else>
            <el-col :span="24" v-for="request in requests" :key="request.id">
              <el-card class="request-card" shadow="hover">
                <div class="card-header">
                  <div class="header-left">
                    <span class="request-id">序号: {{ request.id }}</span>
                    <el-tag :type="getStatusType(request.status)" size="small">
                      {{ getStatusText(request.status) }}
                    </el-tag>
                  </div>
                  <div class="header-actions">
                    <el-button
                      type="success"
                      size="small"
                      @click="viewRequest(request)"
                    >
                      查看
                    </el-button>
                    <el-button
                      type="primary"
                      size="small"
                      @click="editRequest(request)"
                    >
                      编辑
                    </el-button>
                    <el-button
                      type="danger"
                      size="small"
                      @click="deleteRequest(request.id)"
                    >
                      删除
                    </el-button>
                  </div>
                </div>

                <div class="card-content">
                  <el-descriptions :column="3" border>
                    <el-descriptions-item label="所属环境">
                      {{ request.environment_name }}
                    </el-descriptions-item>
                    <el-descriptions-item label="申请人">
                      {{ request.applicant }}
                    </el-descriptions-item>
                    <el-descriptions-item label="域账号">
                      {{ request.domain_account || '-' }}
                    </el-descriptions-item>
                    <el-descriptions-item label="应用供应商名称">
                      {{ request.supplier_name }}
                    </el-descriptions-item>
                    <el-descriptions-item label="所属系统">
                      {{ request.system_name }}
                    </el-descriptions-item>
                    <el-descriptions-item label="应用担当">
                      {{ request.application_owner }}
                    </el-descriptions-item>
                    <el-descriptions-item label="应用所属业务">
                      {{ request.business_name }}
                    </el-descriptions-item>
                    <el-descriptions-item label="桶名称">
                      {{ request.bucket_name }}
                    </el-descriptions-item>
                    <el-descriptions-item label="桶内目录名称">
                      {{ request.bucket_directory || '-' }}
                    </el-descriptions-item>
                    <el-descriptions-item label="容量大小">
                      {{ request.capacity_size_gb }} GB
                    </el-descriptions-item>
                    <el-descriptions-item label="AK SK数量">
                      {{ request.ak_sk_count }}
                    </el-descriptions-item>
                    <el-descriptions-item label="使用时间" :span="1">
                      {{ request.usage_duration }}
                    </el-descriptions-item>
                    <el-descriptions-item label="备注" :span="3" v-if="request.remarks">
                      {{ request.remarks }}
                    </el-descriptions-item>
                    <el-descriptions-item label="提交时间" :span="3">
                      {{ formatDateTime(request.submitted_at) }}
                    </el-descriptions-item>
                  </el-descriptions>
                </div>
              </el-card>
            </el-col>
          </el-row>
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
    <el-dialog v-model="viewDialog" title="OBS申请详情" width="700px">
      <div v-if="currentRequest" class="detail-view">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="所属环境">{{ currentRequest.environment_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="申请人">{{ currentRequest.applicant || '-' }}</el-descriptions-item>
          <el-descriptions-item label="域账号">{{ currentRequest.domain_account || '-' }}</el-descriptions-item>
          <el-descriptions-item label="应用供应商名称">{{ currentRequest.supplier_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="所属系统">{{ currentRequest.system_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="应用担当">{{ currentRequest.application_owner || '-' }}</el-descriptions-item>
          <el-descriptions-item label="应用所属业务">{{ currentRequest.business_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="桶名称">{{ currentRequest.bucket_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="桶内目录名称">{{ currentRequest.bucket_directory || '-' }}</el-descriptions-item>
          <el-descriptions-item label="容量大小">{{ currentRequest.capacity_size_gb ? `${currentRequest.capacity_size_gb} GB` : '-' }}</el-descriptions-item>
          <el-descriptions-item label="AK SK数量">{{ currentRequest.ak_sk_count || '-' }}</el-descriptions-item>
          <el-descriptions-item label="使用时间">{{ currentRequest.usage_duration || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentRequest.status)" size="small">
              {{ getStatusText(currentRequest.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ formatDateTime(currentRequest.submitted_at) }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2" v-if="currentRequest.remarks">{{ currentRequest.remarks }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="viewDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import {
  getMyObsRequests,
  getAllObsRequests,
  getObsRequestDetail,
  createObsRequest,
  updateObsRequest,
  deleteObsRequest
} from '@/api/obs'
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
  domain_account: '',
  supplier_name: '',
  system_name: '',
  application_owner: '',
  business_name: '',
  bucket_name: '',
  bucket_directory: '',
  capacity_size_gb: null,
  ak_sk_count: null,
  usage_duration: '',
  remarks: '',
  status: ''
})

// 使用时间选项
const usageDurationOptions = [
  { label: '长期', value: '长期' },
  { label: '6个月', value: '6个月' },
  { label: '3个月', value: '3个月' },
  { label: '临时1周', value: '临时1周' }
]

// 应用所属业务选项
const businessNameOptions = [
  { label: '营销类', value: '营销类' },
  { label: '管理类', value: '管理类' },
  { label: '生产类', value: '生产类' },
  { label: '研发类', value: '研发类' },
  { label: '教育类', value: '教育类' },
  { label: '其他', value: '其他' }
]

// 搜索条件
const searchForm = reactive({
  system_name: '',
  bucket_name: '',
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
  supplier_name: [{ required: true, message: '请输入应用供应商名称', trigger: 'blur' }],
  system_name: [{ required: true, message: '请输入所属系统', trigger: 'blur' }],
  application_owner: [{ required: true, message: '请输入应用担当', trigger: 'blur' }],
  business_name: [{ required: true, message: '请选择应用所属业务', trigger: 'change' }],
  bucket_name: [{ required: true, message: '请输入桶名称', trigger: 'blur' }],
  capacity_size_gb: [{ required: true, message: '请输入容量大小', trigger: 'blur' }],
  ak_sk_count: [{ required: true, message: '请输入AK SK数量', trigger: 'blur' }],
  usage_duration: [{ required: true, message: '请选择使用时间', trigger: 'change' }]
}

// 初始化用户信息
const initUserInfo = () => {
  if (userStore.user) {
    form.applicant = userStore.user.realName || userStore.user.username || ''
    form.domain_account = userStore.user.username || ''
  } else {
    form.applicant = ''
    form.domain_account = ''
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

// 加载OBS申请列表
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
      ? await getAllObsRequests(params)
      : await getMyObsRequests(params)

    requests.value = response.requests || []
    pagination.total = response.pagination?.total || 0
  } catch (error) {
    console.error('加载OBS申请列表失败:', error)
    ElMessage.error('加载OBS申请列表失败')
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

    if (isEditMode.value) {
      // 编辑模式
      await updateObsRequest(editingId.value, form)
      ElMessage.success('OBS申请更新成功')
    } else {
      // 新建模式
      await createObsRequest(form)
      ElMessage.success('OBS申请创建成功')
    }

    // 重置表单并重新加载列表
    resetForm()
    showForm.value = false
    await loadRequests()
  } catch (error) {
    console.error('提交OBS申请失败:', error)
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      ElMessage.error('提交OBS申请失败')
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
    supplier_name: '',
    system_name: '',
    application_owner: '',
    business_name: '',
    bucket_name: '',
    bucket_directory: '',
    capacity_size_gb: null,
    ak_sk_count: null,
    usage_duration: '',
    remarks: ''
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

// 查看申请详情
const viewRequest = (request) => {
  currentRequest.value = request
  viewDialog.value = true
}

// 编辑申请
const editRequest = (request) => {
  isEditMode.value = true
  editingId.value = request.id
  showForm.value = true

  // 填充表单数据
  Object.assign(form, {
    environmentId: request.environment_id,
    applicant: request.applicant,
    domain_account: request.domain_account || '',
    supplier_name: request.supplier_name,
    system_name: request.system_name,
    application_owner: request.application_owner,
    business_name: request.business_name,
    bucket_name: request.bucket_name,
    bucket_directory: request.bucket_directory || '',
    capacity_size_gb: request.capacity_size_gb,
    ak_sk_count: request.ak_sk_count,
    usage_duration: request.usage_duration,
    remarks: request.remarks || '',
    status: request.status
  })
}

// 删除申请
const deleteRequest = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这个OBS申请吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await deleteObsRequest(id)
    ElMessage.success('OBS申请删除成功')
    await loadRequests()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除OBS申请失败:', error)
      ElMessage.error('删除OBS申请失败')
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
      const response = await getObsRequestDetail(editId)
      if (response && response.request) {
        editRequest(response.request)
      }
    } catch (error) {
      console.error('加载OBS申请详情失败:', error)
      ElMessage.error('加载申请详情失败')
    }
  } else if (editId && isView) {
    try {
      const response = await getObsRequestDetail(editId)
      if (response && response.request) {
        viewRequest(response.request)
      }
    } catch (error) {
      console.error('加载OBS申请详情失败:', error)
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
.obs-request {
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

.request-card {
  margin-bottom: 15px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.request-id {
  font-weight: bold;
  color: #606266;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.card-content {
  margin-top: 15px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.form-tip {
  margin-top: 4px;
  line-height: 1.4;
}

.form-tip .el-text {
  color: #909399;
  font-size: 12px;
}
</style>