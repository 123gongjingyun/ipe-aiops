<template>
  <div class="network-policy">
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
          title="新建网络需求说明"
          type="info"
          description="如基础已下发主机信息请填写资产编号和ip地址；如果没有下发就按照申请时候填写的资源录入到源资产编号中，源地址置空即可"
          :closable="false"
          class="network-demand-alert"
          style="margin-bottom: 20px"
        />

        <el-form :model="form" :rules="formRules" ref="formRef" class="table-form">
          <el-table :data="[form]" border stripe class="form-table" style="width: 100%">
            <el-table-column label="环境*" width="120" align="center">
              <template #default="scope">
                <el-form-item prop="environment" class="table-cell-form-item">
                  <el-input
                    v-model="form.environment"
                    placeholder="生产/测试/开发"
                  />
                </el-form-item>
              </template>
            </el-table-column>

            <el-table-column label="源资产编号*" width="180" align="center">
              <template #default="scope">
                <el-form-item prop="source_asset_code" class="table-cell-form-item">
                  <el-input
                    v-model="form.source_asset_code"
                    placeholder="请输入源资产编号/申请资源如数据库等"
                  />
                </el-form-item>
              </template>
            </el-table-column>

            <el-table-column label="源地址" width="180" align="center">
              <template #default="scope">
                <el-form-item prop="source_address" class="table-cell-form-item">
                  <el-input
                    v-model="form.source_address"
                    placeholder="请输入ip地址/未下发主机该项置空"
                  />
                </el-form-item>
              </template>
            </el-table-column>

            <el-table-column label="目标资产*" width="180" align="center">
              <template #default="scope">
                <el-form-item prop="target_asset" class="table-cell-form-item">
                  <el-input
                    v-model="form.target_asset"
                    placeholder="目标资产名称"
                  />
                </el-form-item>
              </template>
            </el-table-column>

            <el-table-column label="目标地址*" width="180" align="center">
              <template #default="scope">
                <el-form-item prop="target_address" class="table-cell-form-item">
                  <el-input
                    v-model="form.target_address"
                    placeholder="IP地址或域名"
                  />
                </el-form-item>
              </template>
            </el-table-column>

            <el-table-column label="所属系统*" width="180" align="center">
              <template #default="scope">
                <el-form-item prop="system_name" class="table-cell-form-item">
                  <el-input
                    v-model="form.system_name"
                    placeholder="所属系统名称"
                  />
                </el-form-item>
              </template>
            </el-table-column>

            <el-table-column label="端口类型*" width="120" align="center">
              <template #default="scope">
                <el-form-item prop="port_type" class="table-cell-form-item">
                  <el-select
                    v-model="form.port_type"
                    placeholder="端口类型"
                    style="width: 100%"
                  >
                    <el-option label="TCP" value="TCP" />
                    <el-option label="UDP" value="UDP" />
                    <el-option label="ICMP" value="ICMP" />
                    <el-option label="ALL" value="ALL" />
                  </el-select>
                </el-form-item>
              </template>
            </el-table-column>

            <el-table-column label="端口*" width="150" align="center">
              <template #default="scope">
                <el-form-item prop="port" class="table-cell-form-item">
                  <el-input
                    v-model="form.port"
                    placeholder="如:80,443或8080-8090"
                  />
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
          <h3>我的网络需求列表</h3>
          <div class="search-filters">
            <el-input
              v-model="searchForm.source_asset_code"
              placeholder="搜索源资产编号"
              clearable
              style="width: 200px; margin-right: 10px"
            />
            <el-input
              v-model="searchForm.system_name"
              placeholder="搜索所属系统"
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
              @click="showNewForm"
              style="margin-left: 10px"
            >
              <el-icon><Plus /></el-icon>
              新建申请
            </el-button>
          </div>
        </div>

        <div class="requests-list" v-loading="loading">
          <el-empty v-if="requests.length === 0 && !loading" description="暂无网络需求记录" />

          <el-table :data="requests" border stripe style="width: 100%" v-else>
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="environment" label="环境" width="80" align="center" />
            <el-table-column prop="source_asset_code" label="源资产编号" width="120" align="center" />
            <el-table-column prop="source_address" label="源地址" width="150" align="center" show-overflow-tooltip />
            <el-table-column prop="target_asset" label="目标资产" width="150" align="center" show-overflow-tooltip />
            <el-table-column prop="target_address" label="目标地址" width="150" align="center" show-overflow-tooltip />
            <el-table-column prop="system_name" label="所属系统" width="150" align="center" show-overflow-tooltip />
            <el-table-column prop="port_type" label="端口类型" width="80" align="center" />
            <el-table-column prop="port" label="端口" width="120" align="center" />
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
                  v-if="scope.row.status === 'draft' || scope.row.applicant_id === userStore.user.id || userStore.isAdmin()"
                  type="primary"
                  size="small"
                  @click="editRequest(scope.row)"
                >
                  编辑
                </el-button>
                <el-button
                  type="danger"
                  size="small"
                  @click="deleteRequest(scope.row.id)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
            <el-table-column prop="applicant_name" label="申请人" width="100" align="center" fixed="right">
              <template #default="scope">
                {{ scope.row.applicant_name }}
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadRequests"
            @current-change="loadRequests"
            style="margin-top: 20px; justify-content: center"
          />
        </div>
      </el-card>
    </div>

    <!-- 查看详情对话框 -->
    <el-dialog v-model="viewDialog" title="网络需求详情" width="600px">
      <div v-if="currentRequest" class="detail-view">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="环境">{{ currentRequest.environment }}</el-descriptions-item>
          <el-descriptions-item label="源资产编号">{{ currentRequest.source_asset_code }}</el-descriptions-item>
          <el-descriptions-item label="源地址">{{ currentRequest.source_address }}</el-descriptions-item>
          <el-descriptions-item label="目标资产">{{ currentRequest.target_asset }}</el-descriptions-item>
          <el-descriptions-item label="目标地址">{{ currentRequest.target_address }}</el-descriptions-item>
          <el-descriptions-item label="所属系统">{{ currentRequest.system_name }}</el-descriptions-item>
          <el-descriptions-item label="端口类型">{{ currentRequest.port_type }}</el-descriptions-item>
          <el-descriptions-item label="端口">{{ currentRequest.port }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentRequest.status)">
              {{ getStatusText(currentRequest.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ formatDateTime(currentRequest.submitted_at) }}</el-descriptions-item>
          <el-descriptions-item label="申请人" :span="2">{{ currentRequest.applicant_name }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="viewDialog = false">关闭</el-button>
        <el-button
          v-if="currentRequest && (currentRequest.status === 'draft' || currentRequest.applicant_id === userStore.user.id || userStore.isAdmin())"
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
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import {
  getMyNetworkPolicies,
  getAllNetworkPolicies,
  createNetworkPolicy,
  updateNetworkPolicy,
  deleteNetworkPolicy as deleteNetworkPolicyAPI,
  getNetworkPolicyDetail
} from '@/api/networkPolicy'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
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
  environment: '',
  source_asset_code: '',
  source_address: '',
  target_asset: '',
  target_address: '',
  system_name: '',
  port_type: '',
  port: '',
  status: 'submitted'
})

// 搜索条件
const searchForm = reactive({
  source_asset_code: '',
  system_name: '',
  status: ''
})

// 列表数据
const requests = ref([])

// 分页信息
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 表单验证规则
const formRules = {
  environment: [{ required: true, message: '请输入环境', trigger: 'blur' }],
  source_asset_code: [{ required: true, message: '请输入源资产编号', trigger: 'blur' }],
  target_asset: [{ required: true, message: '请输入目标资产', trigger: 'blur' }],
  target_address: [{ required: true, message: '请输入目标地址', trigger: 'blur' }],
  system_name: [{ required: true, message: '请输入所属系统', trigger: 'blur' }],
  port_type: [{ required: true, message: '请选择端口类型', trigger: 'change' }],
  port: [{ required: true, message: '请输入端口', trigger: 'blur' }]
}

// 加载网络需求列表
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
      ? await getAllNetworkPolicies(params)
      : await getMyNetworkPolicies(params)

    requests.value = response.policies || []
    pagination.total = response.total || 0
  } catch (error) {
    console.error('加载网络需求列表失败:', error)
    ElMessage.error('加载网络需求列表失败')
  } finally {
    loading.value = false
  }
}

// 显示新建表单
const showNewForm = () => {
  isEditMode.value = false
  editingId.value = null
  resetForm()
  showForm.value = true
}

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    submitting.value = true

    if (isEditMode.value) {
      // 编辑模式
      await updateNetworkPolicy(editingId.value, form)
      ElMessage.success('网络需求更新成功')
    } else {
      // 新建模式
      await createNetworkPolicy(form)
      ElMessage.success('网络需求创建成功')
    }

    // 重置表单并重新加载列表
    resetForm()
    showForm.value = false
    await loadRequests()
  } catch (error) {
    console.error('提交网络需求失败:', error)
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      ElMessage.error('提交网络需求失败')
    }
  } finally {
    submitting.value = false
  }
}

// 重置表单
const resetForm = () => {
  formRef.value?.resetFields()
  Object.assign(form, {
    environment: '',
    source_asset_code: '',
    source_address: '',
    target_asset: '',
    target_address: '',
    system_name: '',
    port_type: '',
    port: '',
    status: 'submitted'
  })
}

// 取消表单
const cancelForm = () => {
  resetForm()
  showForm.value = false
  isEditMode.value = false
  editingId.value = null
}

// 查看申请详情
const viewRequest = (request) => {
  currentRequest.value = request
  viewDialog.value = true
}

// 编辑申请
const editRequest = (request) => {
  viewDialog.value = false
  isEditMode.value = true
  editingId.value = request.id

  Object.assign(form, {
    environment: request.environment,
    source_asset_code: request.source_asset_code,
    source_address: request.source_address,
    target_asset: request.target_asset,
    target_address: request.target_address,
    system_name: request.system_name,
    port_type: request.port_type,
    port: request.port,
    status: request.status
  })

  showForm.value = true
}

// 删除申请
const deleteRequest = async (id) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除此网络需求吗？此操作不可恢复！',
      '删除网络需求',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await deleteNetworkPolicyAPI(id)
    ElMessage.success('删除成功')
    await loadRequests()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败: ' + error.message)
    }
  }
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

// 组件挂载时加载数据
onMounted(async () => {
  if (!userStore.user) {
    userStore.loadUserFromStorage()
  }

  await loadRequests()

  // 检查是否是快速创建模式
  if (sessionStorage.getItem('quickCreate') === 'true') {
    sessionStorage.removeItem('quickCreate')
    showNewForm()
  }

  // 检查URL参数，处理编辑模式
  const editId = route.query.id
  const isEdit = route.query.edit
  const isView = route.query.view

  if (editId && isEdit) {
    try {
      loading.value = true
      const response = await getNetworkPolicyDetail(editId)
      const request = response

      // 验证权限：申请人或管理员可以编辑
      if (request.applicant_id !== userStore.user.id && !userStore.isAdmin()) {
        ElMessage.error('无权编辑此网络需求')
        return
      }

      editRequest(request)
    } catch (error) {
      console.error('加载网络需求详情失败:', error)
      ElMessage.error('加载网络需求详情失败')
    } finally {
      loading.value = false
    }
  } else if (editId && isView) {
    try {
      loading.value = true
      const response = await getNetworkPolicyDetail(editId)
      if (response) {
        viewRequest(response)
      }
    } catch (error) {
      console.error('加载网络需求详情失败:', error)
      ElMessage.error('加载网络需求详情失败')
    } finally {
      loading.value = false
    }
  }
})
</script>

<style scoped>
.network-policy {
  padding: 20px;
  background: #f0f2f5;
  min-height: 100vh;
}

.content-container {
  max-width: 1400px;
  margin: 0 auto;
}

.form-card {
  margin-bottom: 20px;
}

.table-form {
  width: 100%;
}

.form-table {
  margin-bottom: 20px;
}

/* 表格内的表单项样式 */
.table-cell-form-item {
  margin: 0;
}

.table-cell-form-item :deep(.el-form-item__content) {
  width: 100%;
}

.table-cell-form-item :deep(.el-input),
.table-cell-form-item :deep(.el-select) {
  width: 100%;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  padding: 20px 0;
}

.list-card {
  background: #fff;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.list-header h3 {
  margin: 0;
  color: #303133;
  font-size: 16px;
  font-weight: 500;
}

.search-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.requests-list {
  min-height: 200px;
}

.detail-view {
  padding: 10px 0;
}

.network-demand-alert :deep(.el-alert__description) {
  color: #f56c6c;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .search-filters {
    width: 100%;
  }

  .search-filters .el-input,
  .search-filters .el-select {
    width: 100% !important;
    margin-bottom: 10px;
  }
}
</style>
