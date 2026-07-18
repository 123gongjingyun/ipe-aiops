<template>
  <div class="create-request">
      <!-- 列表视图 -->
      <div v-if="currentView === 'list'">
        <el-card class="list-card">
          <div class="list-header">
            <h3>我的虚拟机申请列表</h3>
            <div class="search-filters">
              <el-input
                v-model="searchForm.systemName"
                placeholder="搜索系统名称"
                clearable
                style="width: 200px; margin-right: 10px"
              />
              <el-select
                v-model="searchForm.status"
                placeholder="选择状态"
                clearable
                style="width: 150px; margin-right: 10px"
              >
	                <el-option label="草稿" value="draft" />
                <el-option label="已提交" value="submitted" />
                <el-option label="已批准" value="approved" />
                <el-option label="已拒绝" value="rejected" />
              </el-select>
              <el-button type="primary" @click="loadMyRequests">搜索</el-button>
              <el-button
                type="success"
                @click="showFormView"
                style="margin-left: 10px"
              >
                <el-icon><Plus /></el-icon>
                新建申请
              </el-button>
            </div>
          </div>

          <div class="requests-list" v-loading="listLoading">
            <el-empty v-if="myRequests.length === 0 && !listLoading" description="暂无虚拟机申请记录" />

            <el-table :data="myRequests" border stripe style="width: 100%" v-else>
              <el-table-column type="index" label="序号" width="60" align="center" />
              <el-table-column prop="system_code" label="系统编号" width="100" align="center" />
              <el-table-column prop="system_name" label="系统名称" width="150" align="center" show-overflow-tooltip />
              <el-table-column prop="module_name" label="模块名称" width="120" align="center" show-overflow-tooltip />
              <el-table-column prop="owner" label="担当" width="100" align="center" />
              <el-table-column prop="type" label="类型" width="120" align="center" />
              <el-table-column prop="environment" label="环境" width="100" align="center" />
              <el-table-column prop="config_option" label="配置名称" width="150" align="center" show-overflow-tooltip />
              <el-table-column prop="node_count" label="节点数" width="80" align="center" />
              <el-table-column prop="cpu" label="CPU" width="80" align="center" />
              <el-table-column prop="memory" label="内存" width="80" align="center" />
              <el-table-column prop="system_disk" label="系统盘(GB)" width="100" align="center">
                <template #default="scope">
                  {{ scope.row.system_disk || '-' }}
                </template>
              </el-table-column>
              <el-table-column prop="data_disk" label="数据盘(GB)" width="100" align="center">
                <template #default="scope">
                  {{ scope.row.data_disk || '' }}
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
                    v-if="userStore.isAdmin() || scope.row.applicant_id === userStore.user.id"
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
              <el-table-column prop="applicant_name" label="申请人" width="90" align="center" fixed="right">
                <template #default="scope">
                  {{ scope.row.applicant_name }}
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- 分页 -->
          <div class="pagination-container" v-if="listPagination.total > 0">
            <el-pagination
              v-model:current-page="listPagination.page"
              v-model:page-size="listPagination.pageSize"
              :page-sizes="[10, 20, 50]"
              :total="listPagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="loadMyRequests"
              @current-change="loadMyRequests"
            />
          </div>
        </el-card>
      </div>

      <!-- 查看详情对话框 -->
      <el-dialog v-model="viewDialog" title="虚拟机申请详情" width="700px">
        <div v-if="currentRequest" class="detail-view">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="系统编号">{{ currentRequest.system_code }}</el-descriptions-item>
            <el-descriptions-item label="系统名称">{{ currentRequest.system_name }}</el-descriptions-item>
            <el-descriptions-item label="模块名称">{{ currentRequest.module_name }}</el-descriptions-item>
            <el-descriptions-item label="担当">{{ currentRequest.owner }}</el-descriptions-item>
            <el-descriptions-item label="类型">{{ currentRequest.type }}</el-descriptions-item>
            <el-descriptions-item label="环境">{{ currentRequest.environment }}</el-descriptions-item>
            <el-descriptions-item label="配置名称" :span="2">{{ currentRequest.config_option || '-' }}</el-descriptions-item>
            <el-descriptions-item label="节点数">{{ currentRequest.node_count || '-' }}</el-descriptions-item>
            <el-descriptions-item label="CPU">{{ currentRequest.cpu || '-' }}</el-descriptions-item>
            <el-descriptions-item label="内存">{{ currentRequest.memory || '-' }}</el-descriptions-item>
            <el-descriptions-item label="系统盘">{{ currentRequest.system_disk || '-' }}</el-descriptions-item>
            <el-descriptions-item label="数据盘">{{ currentRequest.data_disk || '-' }}</el-descriptions-item>
            <el-descriptions-item label="总数据盘">
              {{ calculateTotalDataDisk(currentRequest) }}
            </el-descriptions-item>
            <el-descriptions-item label="总磁盘">
              {{ calculateTotalDisk(currentRequest) }}
            </el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="getStatusType(currentRequest.status)">
                {{ getStatusText(currentRequest.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="提交时间">{{ formatDateTime(currentRequest.submitted_at) }}</el-descriptions-item>
            <el-descriptions-item label="申请人">{{ currentRequest.applicant_name || currentRequest.applicant || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>
        <template #footer>
          <el-button @click="viewDialog = false">关闭</el-button>
          <el-button
            v-if="currentRequest && (userStore.isAdmin() || currentRequest.applicant_id === userStore.user.id)"
            type="primary"
            @click="editRequest(currentRequest)"
          >
            编辑
          </el-button>
        </template>
      </el-dialog>

      <!-- 表单视图 -->
      <div v-if="currentView === 'form'">
        <div v-loading="loading">
          <!-- 编辑模式提示 -->
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
        title="批量填写说明"
        type="info"
        description="您可以一次添加多条资源申请记录，每页最多显示10条。系统会自动填充最近一次申请的数据，您可以根据需要修改。填写完成后点击提交按钮。"
        :closable="false"
        style="margin-bottom: 20px"
      />

      <el-alert
        v-if="recentRequest"
        title="已自动填充最近申请数据"
        type="success"
        :description="`基于最近的申请：${recentRequest.system_name} - ${recentRequest.module_name}`"
        :closable="true"
        style="margin-bottom: 20px"
        @close="recentRequest = null"
      />

      <el-alert
        v-if="configUpdateStatus.show"
        :title="configUpdateStatus.title"
        :type="configUpdateStatus.type"
        :description="configUpdateStatus.message"
        :closable="true"
        style="margin-bottom: 20px"
        @close="configUpdateStatus.show = false"
      />

      <el-form :model="forms" ref="formsRef">
        <el-card
          v-for="(form, index) in forms"
          :key="index"
          class="request-form-card"
          shadow="hover"
        >
          <template #header>
            <div class="card-header">
              <span>申请记录 #{{ index + 1 }}</span>
              <el-button
                type="danger"
                size="small"
                :icon="Delete"
                @click="removeForm(index)"
                :disabled="forms.length === 1"
              >
                删除
              </el-button>
            </div>
          </template>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="系统编号">
                <el-input v-model="form.systemCode" placeholder="如：A-73" />
              </el-form-item>
            </el-col>

            <el-col :span="12">
              <el-form-item label="系统名称">
                <el-input v-model="form.systemName" placeholder="请输入系统名称" />
              </el-form-item>
            </el-col>

            <el-col :span="12">
              <el-form-item label="模块名称">
                <el-input v-model="form.moduleName" placeholder="请输入模块名称" />
              </el-form-item>
            </el-col>

            <el-col :span="12">
              <el-form-item label="担当">
                <el-input v-model="form.owner" placeholder="请输入担当人" />
              </el-form-item>
            </el-col>

            <el-col :span="8">
              <el-form-item label="环境">
                <el-select
                  v-model="form.environment"
                  placeholder="选择环境"
                  style="width: 100%"
                  @change="handleEnvironmentChange(index)"
                  :loading="envLoading"
                >
                  <el-option
                    v-for="env in environments"
                    :key="env.name"
                    :label="env.name"
                    :value="env.name"
                  />
                </el-select>
              </el-form-item>
            </el-col>

            <el-col :span="8">
              <el-form-item label="类型">
                <el-select
                  v-model="form.type"
                  placeholder="选择类型"
                  style="width: 100%"
                  @change="handleTypeChange(index)"
                  :disabled="!form.environment || form.environment === 'SIT'"
                  :loading="configLoading"
                >
                  <el-option
                    v-for="type in configTypes"
                    :key="type.name"
                    :label="type.name"
                    :value="type.name"
                  />
                </el-select>
                <!-- SIT环境类型自动填充提示 -->
                <div v-if="form.environment === 'SIT'" style="color: #67c23a; font-size: 12px; margin-top: 4px;">
                  💡 SIT环境类型自动设置为"综合一体"
                </div>
              </el-form-item>
            </el-col>

            <el-col :span="8">
              <el-form-item label="配置选择">
                <el-select
                  v-model="form.configOption"
                  placeholder="选择配置"
                  style="width: 100%"
                  :disabled="!form.environment || !form.type"
                  :loading="optionsLoading"
                  @change="handleConfigOptionChange(index)"
                >
                  <el-option
                    v-for="option in getAvailableOptions(index)"
                    :key="option.id"
                    :label="option.name"
                    :value="option.name"
                  >
                    <span style="font-weight: 500;">{{ option.name }}</span>
                    <span style="color: #909399; font-size: 12px; margin-left: 12px; font-weight: normal;">
                      ({{ option.node_count }}节点 | {{ option.cpu }}C | {{ option.memory }}GB)
                    </span>
                  </el-option>
                </el-select>
                <div v-if="form.type && form.environment && getAvailableOptions(index).length === 0"
                     style="color: #f56c6c; font-size: 12px; margin-top: 4px;">
                  该类型和环境暂无配置选项
                </div>
              </el-form-item>
            </el-col>

            <!-- 配置详情展示 -->
            <el-col :span="24">
              <div class="config-details" v-if="getConfigDetails(form.configOption, index)">
                <el-divider content-position="left">
                  <el-icon><InfoFilled /></el-icon>
                  配置详情
                </el-divider>

                <!-- 添加加载状态提示 -->
                <div v-if="!getConfigDetails(form.configOption, index) || Object.keys(getConfigDetails(form.configOption, index)).length === 0" class="loading-hint">
                  <el-text type="info" size="small">正在加载配置详情...</el-text>
                </div>

                <el-descriptions :column="2" border size="small" v-else>
                  <!-- 动态根据类型显示不同的字段 -->
                  <template v-for="(chineseName, fieldName) in getTypeFields(form.type)" :key="fieldName">
                    <el-descriptions-item
                      v-if="getConfigDetails(form.configOption, index)[fieldName] !== null && getConfigDetails(form.configOption, index)[fieldName] !== undefined"
                      :label="chineseName"
                      :label-class-name="isCoreMetric(fieldName, form.type) ? 'core-metric-label' : ''"
                      :class="isCoreMetric(fieldName, form.type) ? 'core-metric-item' : ''"
                      :span="fieldName === 'technical_notes' ? 2 : 1">
                      <span :class="isCoreMetric(fieldName, form.type) ? 'core-metric-value' : ''">
                        {{ getConfigDetails(form.configOption, index)[fieldName] || '-' }}
                      </span>
                    </el-descriptions-item>
                  </template>
                </el-descriptions>
              </div>
            </el-col>

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
          </el-row>
        </el-card>
      </el-form>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button type="primary" :icon="Plus" @click="addForm" v-if="!isEditMode">
          添加记录
        </el-button>
        <el-button type="success" :icon="Select" @click="handleSubmit" :loading="submitting">
          {{ isEditMode ? '更新申请' : '批量提交' }}
        </el-button>
        <el-button @click="handleReset">
          重置表单
        </el-button>
        <el-button
          type="info"
          :icon="RefreshRight"
          @click="manualRefreshConfig"
          :loading="configLoading || envLoading || optionsLoading"
        >
          刷新配置
        </el-button>
        <span v-if="lastConfigUpdate" class="last-update-time">
          配置更新时间: {{ formatUpdateTime(lastConfigUpdate) }}
        </span>
      </div>
    </div>
  </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Plus, Select, Coin, Files, Connection, RefreshRight, InfoFilled } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { getMyVMRequests, getAllVMRequestsList, deleteVMRequest, updateVMRequest, createVMRequest, getVMRequestDetail } from '@/api/vmRequest'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const formsRef = ref(null)
const submitting = ref(false)
const loading = ref(false)
const configLoading = ref(false)
const envLoading = ref(false)
const optionsLoading = ref(false)
const viewDialog = ref(false)
const currentRequest = ref(null)

// Tab切换
// 当前视图：list(列表) 或 form(表单)
const currentView = ref('list')

// 标记表单数据是否已加载
const formDataLoaded = ref(false)

// 最近的申请记录
const recentRequest = ref(null)

// 列表相关数据
const listLoading = ref(false)
const myRequests = ref([])
const searchForm = reactive({
  systemName: '',
  status: ''
})
const listPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 配置数据 - 完全动态获取
const configTypes = ref([])
const environments = ref([])
const configOptions = ref([])
const configDescriptions = ref({}) // 存储配置详细说明，key为configOptionId

// 配置数据更新时间
const lastConfigUpdate = ref(null)
const configUpdateInterval = ref(null)

// 配置更新状态提示
const configUpdateStatus = ref({
  show: false,
  title: '',
  type: 'info',
  message: ''
})

// 编辑模式判断
const isEditMode = computed(() => {
  const editRequestId = sessionStorage.getItem('editRequestId')
  return editRequestId !== null && editRequestId !== 'null' && editRequestId !== 'undefined'
})

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

// 加载配置详细说明
const loadConfigDescription = async (configOptionId) => {
  if (configDescriptions.value[configOptionId]) {
    // 已加载过，直接返回
    console.log(`✅ 配置详情已缓存 - ID: ${configOptionId}`)
    return configDescriptions.value[configOptionId]
  }

  console.log(`🔄 开始加载配置详情 - ID: ${configOptionId}`)

  try {
    const response = await fetch(`/api/config/descriptions?configOptionId=${configOptionId}`, {
      headers: { 'Authorization': `Bearer ${userStore.token}` }
    })

    console.log(`📡 API响应状态: ${response.status}`)

    if (response.ok) {
      const data = await response.json()
      console.log(`📦 API返回数据:`, data.success ? '成功' : '失败')

      if (data.success && data.data.length > 0) {
        const description = data.data[0]
        console.log(`📝 存储配置详情，字段数量: ${Object.keys(description).length}`)
        console.log(`🎯 示例字段: master_cpu_detail=${description.master_cpu_detail}, concurrent_connections=${description.concurrent_connections}`)

        // 直接使用原始字段，不做转换
        configDescriptions.value[configOptionId] = description
        return description
      } else {
        console.log(`⚠️ API返回数据为空`)
      }
    } else {
      console.log(`❌ API请求失败: ${response.status}`)
    }
  } catch (error) {
    console.error('❌ 加载配置详细说明失败:', error)
  }

  console.log(`❌ 配置详情加载失败 - ID: ${configOptionId}`)
  return null
}

// 获取配置详情
const getConfigDetails = (configOption, index) => {
  const availableOptions = getAvailableOptions(index)
  const option = availableOptions.find(opt => opt.name === configOption)

  if (option) {
    // 异步加载配置详情（如果还没有加载）
    loadConfigDescription(option.id)

    // 返回当前已有的详情（可能为null，等待加载完成）
    let details = configDescriptions.value[option.id] || {}

    // 对于通用类型（包括综合一体），格式化性能指标显示
    const form = forms.value[index]
    if (form && form.type) {
      const normalizedType = form.type.toLowerCase().replace(/[\(\)]/g, '').trim()
      // 如果不是特定类型，则为通用类型，需要格式化指标
      if (!normalizedType.includes('数据库') && !normalizedType.includes('mysql') &&
          !normalizedType.includes('rabbitmq') && !normalizedType.includes('redis') &&
          !normalizedType.includes('kafka') && !normalizedType.includes('ap') &&
          !normalizedType.includes('zookeeper') &&
          !(normalizedType.includes('综合一体') || normalizedType.includes('comprehensive'))) {
        details = formatGeneralMetrics(details)
      }
    }

    // 添加调试日志
    console.log(`🔍 getConfigDetails - 配置: ${configOption}, OptionID: ${option.id}`)
    console.log('📊 可用字段:', Object.keys(details).slice(0, 5).join(', '))

    return details
  }

  return {}
}

// 格式化通用类型性能指标显示
const formatGeneralMetrics = (details) => {
  const formatted = { ...details }

  // 将性能指标转换为更易读的格式
  for (let i = 1; i <= 3; i++) {
    const nameKey = `performance_metric${i}_name`
    const valueKey = `performance_metric${i}_value`
    const combinedKey = `performance_metric_${i}`
    const name = details[nameKey]
    const value = details[valueKey]

    // 合并显示指标名称和数值
    if (name && value) {
      formatted[combinedKey] = `${name}: ${value}`
    } else if (name) {
      formatted[combinedKey] = name
    } else if (value) {
      formatted[combinedKey] = value
    } else {
      formatted[combinedKey] = null // 标记为空，后续不显示
    }

    // 删除原始字段，避免显示
    delete formatted[nameKey]
    delete formatted[valueKey]
  }

  return formatted
}

// 根据服务类型获取对应的字段配置
const getTypeFields = (type) => {
  if (!type) return {}

  const normalizedType = type.toLowerCase().replace(/[\(\)]/g, '').trim()

  if (normalizedType.includes('数据库') || normalizedType.includes('mysql')) {
    return {
      architecture_type: '架构类型',
      scenario_usage: '适用场景',
      scenario_user_scale: '用户规模',
      // MySQL原始字段
      master_cpu_detail: 'CPU详情',
      master_memory_detail: '内存详情',
      master_system_disk: '系统盘',
      master_data_disk: '数据盘',
      master_connections: '最大连接数',
      master_daily_qps: '日均QPS',
      master_peak_qps: '峰值QPS',
      disk_iops: '磁盘IOPS',
      disk_throughput: '磁盘吞吐量',
      recommendation_level: '推荐等级',
      price_level: '价格等级',
      technical_notes: '技术说明'
    }
  } else if (normalizedType.includes('rabbitmq')) {
    return {
      architecture_type: '架构类型',
      scenario_usage: '适用场景',
      scenario_user_scale: '用户规模',
      // RabbitMQ原始字段
      resource_cpu_detail: 'CPU详情',
      resource_memory_detail: '内存详情',
      resource_system_disk: '系统盘',
      resource_data_disk: '数据盘',
      concurrent_connections: '并发连接数',
      message_throughput: '消息吞吐量',
      queue_count: '队列数量',
      disk_iops: '磁盘IOPS',
      disk_throughput: '磁盘吞吐量',
      ha_features: '高可用特性',
      recommendation_level: '推荐等级',
      price_level: '价格等级',
      technical_notes: '技术说明'
    }
  } else if (normalizedType.includes('redis')) {
    return {
      architecture_type: '架构类型',
      scenario_usage: '适用场景',
      scenario_user_scale: '用户规模',
      // Redis原始字段
      resource_cpu_detail: 'CPU详情',
      resource_memory_detail: '内存详情',
      resource_system_disk: '系统盘',
      resource_data_disk: '数据盘',
      max_connections: '最大连接数',
      ops_per_second: '每秒操作数',
      memory_usage: '内存使用',
      hit_rate: '缓存命中率',
      data_size: '数据容量',
      persistence_mode: '持久化模式',
      disk_iops: '磁盘IOPS',
      disk_throughput: '磁盘吞吐量',
      recommendation_level: '推荐等级',
      price_level: '价格等级',
      technical_notes: '技术说明'
    }
  } else if (normalizedType.includes('kafka')) {
    return {
      architecture_type: '架构类型',
      scenario_usage: '适用场景',
      scenario_user_scale: '用户规模',
      // Kafka原始字段
      resource_cpu_detail: 'CPU详情',
      resource_memory_detail: '内存详情',
      resource_system_disk: '系统盘',
      resource_data_disk: '数据盘',
      throughput: '消息吞吐量',
      partition_count: '分区数量',
      replication_factor: '副本因子',
      broker_count: 'Broker节点数',
      retention_period: '消息保留期',
      disk_iops: '磁盘IOPS',
      disk_throughput: '磁盘吞吐量',
      recommendation_level: '推荐等级',
      price_level: '价格等级',
      technical_notes: '技术说明'
    }
  } else if (normalizedType.includes('zookeeper')) {
    return {
      architecture_type: '架构类型',
      scenario_usage: '适用场景',
      scenario_user_scale: '用户规模',
      // Zookeeper原始字段
      resource_cpu_detail: 'CPU详情',
      resource_memory_detail: '内存详情',
      resource_system_disk: '系统盘',
      resource_data_disk: '数据盘',
      // 单节点指标
      client_connections: '客户端连接数',
      coordination_capability: '协调能力',
      read_qps: '读QPS',
      // 集群指标
      cluster_client_connections: '集群客户端连接数',
      cluster_write_qps: '集群写QPS',
      cluster_read_qps: '集群读QPS',
      disk_iops: '磁盘IOPS',
      disk_throughput: '磁盘吞吐量',
      disk_type_description: '磁盘类型说明',
      ha_features: '高可用特性',
      recommendation_level: '推荐等级',
      price_level: '价格等级',
      technical_notes: '技术说明'
    }
  } else if (normalizedType.includes('ap')) {
    return {
      architecture_type: '架构类型',
      scenario_usage: '适用场景',
      scenario_user_scale: '用户规模',
      // AP应用原始字段
      resource_cpu_detail: 'CPU详情',
      resource_memory_detail: '内存详情',
      resource_system_disk: '系统盘',
      resource_data_disk: '数据盘',
      concurrent_users: '并发用户数',
      requests_per_second: '每秒请求数',
      response_time: '响应时间',
      throughput: '吞吐量',
      user_capacity: '用户容量',
      disk_iops: '磁盘IOPS',
      disk_throughput: '磁盘吞吐量',
      recommendation_level: '推荐等级',
      price_level: '价格等级',
      technical_notes: '技术说明'
    }
  } else if (normalizedType.includes('综合一体') || normalizedType.includes('comprehensive')) {
    return {
      architecture_type: '架构类型',
      scenario_usage: '适用场景',
      scenario_user_scale: '用户规模',
      // 综合一体原始字段（与AP相同）
      resource_cpu_detail: 'CPU详情',
      resource_memory_detail: '内存详情',
      resource_system_disk: '系统盘',
      resource_data_disk: '数据盘',
      concurrent_users: '并发用户数',
      requests_per_second: '每秒请求数',
      response_time: '响应时间',
      throughput: '吞吐量',
      user_capacity: '用户容量',
      disk_iops: '磁盘IOPS',
      disk_throughput: '磁盘吞吐量',
      disk_type_description: '磁盘类型说明',
      recommendation_level: '推荐等级',
      price_level: '价格等级',
      technical_notes: '技术说明'
    }
  }

  // 通用类型（其他类型）
  return {
    architecture_type: '架构类型',
    scenario_usage: '适用场景',
    scenario_user_scale: '用户规模',
    resource_cpu_detail: 'CPU详情',
    resource_memory_detail: '内存详情',
    resource_system_disk: '系统盘',
    resource_data_disk: '数据盘',
    performance_metric_1: '性能指标1',
    performance_metric_2: '性能指标2',
    performance_metric_3: '性能指标3',
    disk_iops: '磁盘IOPS',
    disk_throughput: '磁盘吞吐量',
    disk_type_description: '磁盘类型说明',
    recommendation_level: '推荐等级',
    price_level: '价格等级',
    technical_notes: '技术说明'
  }
}

// 判断是否为核心指标字段
const isCoreMetric = (fieldName, type) => {
  if (!type) return false

  const normalizedType = type.toLowerCase().replace(/[\(\)]/g, '').trim()

  // MySQL核心指标
  if (normalizedType.includes('数据库') || normalizedType.includes('mysql')) {
    return ['master_connections', 'master_daily_qps', 'master_peak_qps'].includes(fieldName)
  }
  // RabbitMQ核心指标
  else if (normalizedType.includes('rabbitmq')) {
    return ['concurrent_connections', 'message_throughput', 'queue_count'].includes(fieldName)
  }
  // Redis核心指标
  else if (normalizedType.includes('redis')) {
    return ['max_connections', 'ops_per_second', 'hit_rate'].includes(fieldName)
  }
  // Kafka核心指标
  else if (normalizedType.includes('kafka')) {
    return ['throughput', 'partition_count', 'broker_count'].includes(fieldName)
  }
  // AP应用核心指标
  else if (normalizedType.includes('ap')) {
    return ['concurrent_users', 'requests_per_second', 'response_time'].includes(fieldName)
  }
  // Zookeeper核心指标
  else if (normalizedType.includes('zookeeper')) {
    return ['client_connections', 'coordination_capability', 'read_qps'].includes(fieldName)
  }
  // 综合一体核心指标（与AP相同）
  else if (normalizedType.includes('综合一体') || normalizedType.includes('comprehensive')) {
    return ['concurrent_users', 'requests_per_second', 'response_time'].includes(fieldName)
  }
  // 通用类型核心指标
  else {
    return ['performance_metric_1', 'performance_metric_2', 'performance_metric_3'].includes(fieldName)
  }
}

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

// 获取最近的申请记录
const loadRecentRequest = async () => {
  try {
    loading.value = true

    // 并行加载配置数据（独立于最近申请）
    await Promise.all([
      loadConfigData(),
      loadConfigOptions()
    ])

    // 检查是否有编辑或复制的数据
    const editData = sessionStorage.getItem('editRequestData')
    const copyData = sessionStorage.getItem('copyRequestData')
    const editRequestId = sessionStorage.getItem('editRequestId')

    // 优先判断编辑模式：需要同时有editData和editRequestId
    if (editData && editRequestId) {
      // 编辑模式 - 有明确的编辑ID和编辑数据
      try {
        const data = JSON.parse(editData)
        if (forms.value.length > 0) {
          // 先设置基本信息，不包括configOption
          forms.value[0] = {
            systemCode: data.systemCode || '',  // 保持原始系统编号，无-COPY
            systemName: data.systemName || '',
            moduleName: data.moduleName || '',
            owner: data.owner || '',
            type: data.type || '',
            environment: data.environment || '',
            configOption: '', // 暂时不设置configOption，等待配置数据加载完成
            systemDisk: data.systemDisk || 0,
            dataDisk: data.dataDisk || 0
          }
          ElMessage.success(`正在编辑申请: ${data.systemName} (${data.systemCode})`)
          // 清除复制数据，避免冲突
          sessionStorage.removeItem('copyRequestData')
          // 清除编辑数据，但保留editRequestId用于提交时判断
          sessionStorage.removeItem('editRequestData')

          // 等待配置数据加载完成后，再设置configOption
          if (data.configOption) {
            // 使用nextTick确保配置选项已加载
            await nextTick()
            // 给额外的延迟确保数据完全准备好
            setTimeout(() => {
              const availableOptions = getAvailableOptions(0)
              const selectedOption = availableOptions.find(opt => opt.name === data.configOption)
              if (selectedOption) {
                // 现在可以安全地设置configOption了
                forms.value[0].configOption = data.configOption
                // 加载配置详情
                loadConfigDescription(selectedOption.id)
                console.log('✅ 编辑模式配置预览已更新')
              } else {
                console.warn('⚠️ 编辑模式：找不到配置选项', data.configOption)
                ElMessage.warning(`找不到配置选项: ${data.configOption}`)
              }
            }, 800) // 增加延迟时间，确保配置数据完全加载
          }
        }
      } catch (error) {
        console.error('解析编辑数据失败:', error)
        // 出错时清理所有数据
        sessionStorage.removeItem('editRequestData')
        sessionStorage.removeItem('editRequestId')
        sessionStorage.removeItem('copyRequestData')
      }
    } else if (copyData) {
      // 复制模式 - 只有复制数据，没有编辑ID
      try {
        const data = JSON.parse(copyData)
        if (forms.value.length > 0) {
          // 先设置基本信息，不包括configOption
          forms.value[0] = {
            systemCode: data.systemCode || '',  // 包含-COPY标识
            systemName: data.systemName || '',
            moduleName: data.moduleName || '',
            owner: data.owner || '',
            type: data.type || '',
            environment: data.environment || '',
            configOption: '', // 暂时不设置configOption，等待配置数据加载完成
            systemDisk: data.systemDisk || 0,
            dataDisk: data.dataDisk || 0
          }
          ElMessage.success(`已复制申请数据: ${data.systemName} → ${data.systemCode}`)
          // 清除复制数据，避免重复加载
          sessionStorage.removeItem('copyRequestData')

          // 等待配置数据加载完成后，再设置configOption
          if (data.configOption) {
            // 使用nextTick确保配置选项已加载
            await nextTick()
            // 给额外的延迟确保数据完全准备好
            setTimeout(() => {
              const availableOptions = getAvailableOptions(0)
              const selectedOption = availableOptions.find(opt => opt.name === data.configOption)
              if (selectedOption) {
                // 现在可以安全地设置configOption了
                forms.value[0].configOption = data.configOption
                // 加载配置详情
                loadConfigDescription(selectedOption.id)
                console.log('✅ 复制模式配置预览已更新')
              } else {
                console.warn('⚠️ 复制模式：找不到配置选项', data.configOption)
                ElMessage.warning(`找不到配置选项: ${data.configOption}`)
              }
            }, 800) // 增加延迟时间，确保配置数据完全加载
          }
        }
      } catch (error) {
        console.error('解析复制数据失败:', error)
        sessionStorage.removeItem('copyRequestData')
      }
    } else {
      // 正常模式：加载最近申请
      try {
        const recentResponse = await getMyVMRequests({ page: 1, pageSize: 1 })

        if (recentResponse.requests && recentResponse.requests.length > 0) {
          // 获取最近的一条申请记录
          recentRequest.value = recentResponse.requests[0]

          // 自动填充第一个表单
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

            ElMessage.success('已自动填充最近申请的数据')

            // 加载配置详情（最近申请模式）
            if (recentRequest.value.config_option) {
              setTimeout(() => {
                const availableOptions = getAvailableOptions(0)
                const selectedOption = availableOptions.find(opt => opt.name === recentRequest.value.config_option)
                if (selectedOption) {
                  loadConfigDescription(selectedOption.id)
                }
              }, 500) // 延迟加载，确保选项数据已加载
            }
          }
        }
      } catch (recentError) {
        console.log('加载最近申请失败，但配置数据已加载:', recentError.message)
        // 最近申请加载失败不影响配置数据的使用
      }
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    // 静默失败，不影响正常使用
  } finally {
    loading.value = false
  }
}

const addForm = () => {
  if (forms.value.length >= 10) {
    ElMessage.warning('最多只能添加10条记录')
    return
  }

  // 使用最近的数据预填充新表单项
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

  forms.value.push(newForm)

  if (recentRequest.value) {
    ElMessage.success('新表单已自动填充最近申请的数据')
  }
}

const removeForm = (index) => {
  forms.value.splice(index, 1)
}

const handleSubmit = async () => {
  try {
    // 更准确地判断编辑模式：检查editRequestId和当前表单是否是从编辑进入的
    const editRequestId = sessionStorage.getItem('editRequestId')
    const isEditMode = editRequestId !== null && editRequestId !== 'null' && editRequestId !== 'undefined' && forms.value.length === 1

    const confirmMessage = isEditMode ? '确定要更新这个资源申请吗？' : '确定要提交这些资源申请吗？'

    await ElMessageBox.confirm(confirmMessage, '确认提交', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    })

    submitting.value = true

    try {
      const currentUser = userStore.user
      const requestsToSubmit = forms.value.filter(form =>
        form.systemName && form.type && form.environment && form.configOption
      )

      if (requestsToSubmit.length === 0) {
        ElMessage.warning('请至少填写一条完整的申请记录')
        return
      }

      // 验证每个表单的配置选项是否有效
      for (let i = 0; i < forms.value.length; i++) {
        const form = forms.value[i]

        // 跳过未填写的表单
        if (!form.systemName || !form.type || !form.environment || !form.configOption) {
          continue
        }

        // 获取该类型和环境的可用配置选项
        const type = configTypes.value.find(t => t.name === form.type)
        const env = environments.value.find(e => e.name === form.environment)

        if (!type || !env) {
          throw new Error(`表单 ${i + 1}: 类型或环境无效，请重新选择`)
        }

        const availableOptions = getAvailableOptions(i)
        const selectedOption = availableOptions.find(opt => opt.name === form.configOption)

        if (!selectedOption) {
          const optionNames = availableOptions.map(opt => opt.name).join(', ')
          throw new Error(`表单 ${i + 1}: 配置选项 "${form.configOption}" 在 ${form.type} 的 ${form.environment} 环境中不存在。\n\n请重新选择配置选项。\n可用选项: ${optionNames || '无'}`)
        }

        console.log(`表单 ${i + 1} 验证通过:`, {
          type: form.type,
          environment: form.environment,
          configOption: form.configOption,
          matchedOption: selectedOption
        })
      }

      // 编辑模式：只更新第一个表单
      if (isEditMode) {
        // 获取第一个已填写的表单
        const form = forms.value.find(f =>
          f.systemName && f.type && f.environment && f.configOption
        )

        if (!form) {
          throw new Error('请填写完整的申请信息')
        }

        // 获取该表单的索引（用于获取可用配置选项）
        const formIndex = forms.value.indexOf(form)

        // 从已验证的配置选项中获取数据
        const type = configTypes.value.find(t => t.name === form.type)
        const env = environments.value.find(e => e.name === form.environment)
        const availableOptions = getAvailableOptions(formIndex)
        const selectedOption = availableOptions.find(opt => opt.name === form.configOption)

        if (!type || !env || !selectedOption) {
          throw new Error('配置数据验证失败，请刷新页面重试')
        }

        const updateData = {
          systemCode: form.systemCode,
          systemName: form.systemName,
          moduleName: form.moduleName,
          owner: form.owner,
          type: form.type,
          environment: form.environment,
          configOption: form.configOption,
          nodeCount: selectedOption.node_count || 1,
          cpu: selectedOption.cpu || 0,
          memory: selectedOption.memory || 0,
          systemDisk: form.systemDisk || 0,
          dataDisk: form.dataDisk || 0,
          status: 'submitted'
        }

        // 更新申请
        await updateVMRequest(editRequestId, updateData)
        // 清除编辑标记
        sessionStorage.removeItem('editRequestId')
        sessionStorage.removeItem('editRequestData')
        currentView.value = 'list'
        ElMessage.success('虚拟机申请更新成功！')
        await loadMyRequests()
      } else {
        // 创建模式：逐个提交申请记录
        let successCount = 0
        let failureCount = 0

        for (const form of requestsToSubmit) {
          try {
            // 获取配置选项详情
            const configResponse = await fetch(`/api/config/options?type=${encodeURIComponent(form.type)}&environment=${encodeURIComponent(form.environment)}`, {
              headers: {
                'Authorization': `Bearer ${userStore.token}`
              }
            })

            const configData = await configResponse.json()
            const configOption = configData.data.find(opt => opt.name === form.configOption)

            if (!configOption) {
              throw new Error(`找不到配置选项: ${form.configOption}`)
            }

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
              systemDisk: form.systemDisk || 0,
              dataDisk: form.dataDisk || 0,
              status: 'submitted'
            })

            successCount++
          } catch (error) {
            console.error('提交申请失败:', error)
            failureCount++
          }
        }

        if (successCount === requestsToSubmit.length) {
          ElMessage.success(`成功提交 ${successCount} 条申请！`)
        } else if (successCount > 0) {
          ElMessage.warning(`部分提交成功：成功 ${successCount} 条，失败 ${failureCount} 条`)
        } else {
          ElMessage.error('所有申请提交失败')
        }

        // 确保清除任何残留的编辑标记
        sessionStorage.removeItem('editRequestId')
        sessionStorage.removeItem('editRequestData')

        if (successCount > 0) {
          currentView.value = 'list'
          await loadMyRequests()
        }
      }

    } catch (error) {
      console.error('提交失败:', error)
      ElMessage.error('提交失败: ' + error.message)
    } finally {
      submitting.value = false
    }
  } catch (error) {
    // 用户取消操作
  } finally {
    submitting.value = false
  }
}

const handleReset = () => {
  forms.value = [{
    systemCode: '',
    systemName: '',
    moduleName: '',
    owner: '',
    type: '',
    environment: '',
    configOption: ''
  }]
  // 清除编辑标记，重置后变为创建模式
  sessionStorage.removeItem('editRequestId')
  ElMessage.info('表单已重置')
}

// 组件挂载时加载最近的申请记录
onMounted(async () => {
  // 检查是否有编辑数据
  const hasEditData = sessionStorage.getItem('editRequestData') !== null
  const hasEditId = sessionStorage.getItem('editRequestId') !== null
  const hasCopyData = sessionStorage.getItem('copyRequestData') !== null
  const queryEditId = route.query.id
  const queryIsEdit = route.query.edit
  const queryIsView = route.query.view

  if (hasEditId && !hasEditData && !hasCopyData && !queryEditId) {
    // 有编辑ID但没有编辑数据，说明是直接访问创建页面，清除残留的编辑ID
    console.log('🧹 清除残留的编辑标记')
    sessionStorage.removeItem('editRequestId')
  }

  // 立即加载申请列表数据（默认tab）
  console.log('📋 页面加载，立即加载申请列表')
  await loadMyRequests()

  // 处理 query 参数编辑模式
  if (queryEditId && queryIsEdit) {
    const request = myRequests.value.find(r => r.id.toString() === queryEditId.toString())
    if (request) {
      editRequestFromQuery(request)
    } else {
      try {
        const response = await getVMRequestDetail(queryEditId)
        if (response && response.request) {
          const detail = response.request
          if (userStore.isAdmin() || detail.applicant_id === userStore.user.id) {
            editRequestFromQuery(detail)
          } else {
            ElMessage.error('无权编辑此虚拟机申请')
          }
        }
      } catch (error) {
        console.error('加载虚拟机申请详情失败:', error)
        ElMessage.error('加载申请详情失败')
      }
    }
  }

  // 处理 query 参数查看模式
  if (queryEditId && queryIsView) {
    const request = myRequests.value.find(r => r.id.toString() === queryEditId.toString())
    if (request) {
      viewRequest(request)
    } else {
      try {
        const response = await getVMRequestDetail(queryEditId)
        if (response && response.request) {
          viewRequest(response.request)
        }
      } catch (error) {
        console.error('加载虚拟机申请详情失败:', error)
        ElMessage.error('加载申请详情失败')
      }
    }
  }

  // 检查是否有快速创建标记
  if (sessionStorage.getItem('quickCreate') === 'true') {
    sessionStorage.removeItem('quickCreate')
    currentView.value = 'form'
    loadRecentRequest()
  }

  // 如果有编辑或复制数据，切换到表单tab并加载数据
  if (hasEditData || hasCopyData) {
    currentView.value = 'form'
    loadRecentRequest()
  }

  startConfigAutoRefresh() // 启动配置数据自动刷新

  // 监听配置变化事件（从配置管理页面返回时触发）
  window.addEventListener('config-changed', handleConfigChangeEvent)

  // 监听页面重新获得焦点（用户从其他标签页返回时）
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

// 组件卸载时清理定时器
onUnmounted(() => {
  stopConfigAutoRefresh()

  // 移除事件监听
  window.removeEventListener('config-changed', handleConfigChangeEvent)
  document.removeEventListener('visibilitychange', handleVisibilityChange)

  console.log('🧹 清理：配置数据自动刷新已停止')
})

// 监听Tab切换
// 处理页面可见性变化
const handleVisibilityChange = () => {
  if (!document.hidden) {
    console.log('👀 页面重新获得焦点，检查配置更新...')
    // 页面重新获得焦点时，检查是否需要刷新配置
    const now = new Date()
    if (!lastConfigUpdate.value || (now - lastConfigUpdate.value) > 60000) {
      // 超过1分钟未更新，自动刷新
      manualRefreshConfig()
    }
  }
}

// 加载配置数据 - 从配置管理动态获取
const loadConfigData = async (showNotification = false) => {
  try {
    configLoading.value = true
    envLoading.value = true

    // 并行加载配置类型和环境（从配置管理API）
    const [typesResponse, envsResponse] = await Promise.all([
      fetch('/api/config/types', {
        headers: { 'Authorization': `Bearer ${userStore.token}` }
      }),
      fetch('/api/config/environments', {
        headers: { 'Authorization': `Bearer ${userStore.token}` }
      })
    ])

    const typesData = await typesResponse.json()
    const envsData = await envsResponse.json()

    const oldTypes = [...configTypes.value]
    const oldEnvs = [...environments.value]

    if (typesData.success) {
      // 只显示启用的类型（is_active = 1）
      configTypes.value = typesData.data.filter(type => type.is_active === 1)
    }

    if (envsData.success) {
      // 只显示启用的环境（is_active = 1）
      environments.value = envsData.data.filter(env => env.is_active === 1)
    }

    // 记录更新时间
    lastConfigUpdate.value = new Date()

    // 智能验证和通知
    if (showNotification) {
      validateAndUpdateForms(oldTypes, oldEnvs)
    }

  } catch (error) {
    console.error('加载配置数据失败:', error)
    if (showNotification) {
      showConfigUpdateStatus('error', '配置更新失败', '无法获取最新的配置数据，请检查网络连接')
    }
  } finally {
    configLoading.value = false
    envLoading.value = false
  }
}

// 停止配置数据的自动刷新
const stopConfigAutoRefresh = () => {
  if (configUpdateInterval.value) {
    clearInterval(configUpdateInterval.value)
    configUpdateInterval.value = null
    console.log('⏸️ 配置数据自动刷新已停止')
  }
}

// 获取某个表单的可用配置选项
const getAvailableOptions = (index) => {
  const form = forms.value[index]
  if (!form.type || !form.environment) {
    return []
  }

  // 查找对应的类型ID和环境ID
  const type = configTypes.value.find(t => t.name === form.type)
  const env = environments.value.find(e => e.name === form.environment)

  if (!type || !env) {
    return []
  }

  // 过滤配置选项
  return configOptions.value.filter(option =>
    option.type_id === type.id && option.environment_id === env.id
  )
}

// 加载配置选项
const loadConfigOptions = async (showNotification = false) => {
  try {
    optionsLoading.value = true

    const response = await fetch('/api/config/options', {
      headers: { 'Authorization': `Bearer ${userStore.token}` }
    })

    const data = await response.json()

    if (data.success) {
      const oldOptions = [...configOptions.value]
      configOptions.value = data.data

      // 强制更新表单数据，触发配置预览重新计算
      await nextTick()
      forms.value = [...forms.value] // 触发响应式更新

      if (showNotification) {
        const newCount = data.data.length - oldOptions.length
        if (newCount > 0) {
          showConfigUpdateStatus('success', '配置选项已更新', `新增了 ${newCount} 个配置选项`)
        }
      }
    }

  } catch (error) {
    console.error('加载配置选项失败:', error)
    if (showNotification) {
      showConfigUpdateStatus('error', '配置选项更新失败', '无法获取最新的配置选项')
    }
  } finally {
    optionsLoading.value = false
  }
}

// 处理类型变化
const handleEnvironmentChange = (index) => {
  const form = forms.value[index]

  // 特殊处理：SIT环境自动填充"综合一体"类型
  if (form.environment === 'SIT') {
    // 自动设置类型为"综合一体"
    form.type = '综合一体'

    // 检查当前配置选项是否属于"综合一体"类型
    if (form.configOption) {
      const availableOptions = getAvailableOptions(index)
      const optionBelongsToType = availableOptions.some(opt => opt.name === form.configOption)
      
      // 如果当前配置选项不属于"综合一体"类型，清空它
      if (!optionBelongsToType) {
        form.configOption = ''
      }
    }

    // 清除配置详情缓存，强制重新加载
    const availableOptions = getAvailableOptions(index)
    availableOptions.forEach(opt => {
      delete configDescriptions.value[opt.id]
    })

    // 如果没有有效的配置选项，提示用户选择
    if (!form.configOption) {
      ElMessage.success('SIT环境已自动设置为"综合一体"类型，请选择配置选项')
    } else {
      // 如果有有效配置选项，自动触发配置变化来填充磁盘数据
      handleConfigOptionChange(index)
    }
    return
  }

  // 其他环境：清空该表单的类型和配置选择
  form.type = ''
  form.configOption = ''

  // 清除配置详情缓存
  const availableOptions = getAvailableOptions(index)
  availableOptions.forEach(opt => {
    delete configDescriptions.value[opt.id]
  })

  // 显示提示
  if (form.environment) {
    ElMessage.info(`已切换到${form.environment}环境，请重新选择类型和配置选项`)
  }
}

// 处理类型变化
const handleTypeChange = async (index) => {
  // 如果是SIT环境，不允许手动修改类型
  if (forms.value[index].environment === 'SIT') {
    ElMessage.warning('SIT环境下类型自动设置，无法手动修改')
    forms.value[index].type = '综合一体'
    return
  }

  // 清空该表单的配置选择
  forms.value[index].configOption = ''

  const form = forms.value[index]
  const availableOptions = getAvailableOptions(index)

  // 清除之前的配置详情缓存
  availableOptions.forEach(opt => {
    delete configDescriptions.value[opt.id]
  })

  // 如果新类型有配置选项，可以显示提示
  const type = configTypes.value.find(t => t.name === forms.value[index].type)
  if (type) {
    ElMessage.info(`已选择${type.name}，请选择配置选项`)
  }
}

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

// 智能验证和更新表单
const validateAndUpdateForms = (oldTypes, oldEnvs) => {
  let invalidCount = 0
  const warnings = []

  forms.value.forEach((form, index) => {
    // 检查类型是否仍然有效
    if (form.type) {
      const typeExists = configTypes.value.some(t => t.name === form.type)
      if (!typeExists) {
        invalidCount++
        warnings.push(`表单 #${index + 1}: 类型"${form.type}"已被删除`)
        form.type = ''
        form.environment = ''
        form.configOption = ''
      }
    }

    // 检查环境是否仍然有效
    if (form.environment && form.type) {
      const envExists = environments.value.some(e => e.name === form.environment)
      if (!envExists) {
        invalidCount++
        warnings.push(`表单 #${index + 1}: 环境"${form.environment}"已被删除`)
        form.environment = ''
        form.configOption = ''
      }
    }

    // 检查配置选项是否仍然有效
    if (form.configOption && form.type && form.environment) {
      const availableOptions = getAvailableOptions(index)
      const optionExists = availableOptions.some(o => o.name === form.configOption)
      if (!optionExists) {
        invalidCount++
        warnings.push(`表单 #${index + 1}: 配置"${form.configOption}"已被删除或更改`)
        form.configOption = ''
      }
    }
  })

  // 显示更新状态
  if (invalidCount > 0) {
    showConfigUpdateStatus(
      'warning',
      '配置已更新，部分数据失效',
      `${invalidCount} 个表单项的配置需要重新选择:\n${warnings.join('\n')}`
    )
  } else {
    const typeChanges = configTypes.value.length - oldTypes.length
    const envChanges = environments.value.length - oldEnvs.length
    const changes = []
    if (typeChanges !== 0) changes.push(`类型${typeChanges > 0 ? '增加' : '减少'} ${Math.abs(typeChanges)} 个`)
    if (envChanges !== 0) changes.push(`环境${envChanges > 0 ? '增加' : '减少'} ${Math.abs(envChanges)} 个`)

    if (changes.length > 0) {
      showConfigUpdateStatus('success', '配置已更新', changes.join(', '))
    }
  }
}

// 显示配置更新状态
const showConfigUpdateStatus = (type, title, message) => {
  configUpdateStatus.value = {
    show: true,
    title,
    type,
    message
  }

  // 5秒后自动隐藏
  setTimeout(() => {
    configUpdateStatus.value.show = false
  }, 5000)
}

// 手动刷新配置
const manualRefreshConfig = async () => {
  console.log('🔄 手动刷新配置数据...')
  await Promise.all([
    loadConfigData(true),
    loadConfigOptions(true)
  ])
  ElMessage.success('配置数据已刷新')
}

// 格式化更新时间
const formatUpdateTime = (date) => {
  if (!date) return ''
  const now = new Date()
  const diff = Math.floor((now - date) / 1000)

  if (diff < 60) return `${diff}秒前`
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  return date.toLocaleString('zh-CN')
}

// 监听配置变化事件
const handleConfigChangeEvent = () => {
  console.log('📢 收到配置变化通知，立即刷新...')
  manualRefreshConfig()
}

// 启动配置数据的自动刷新（每30秒）
const startConfigAutoRefresh = () => {
  // 清除现有的刷新定时器
  if (configUpdateInterval.value) {
    clearInterval(configUpdateInterval.value)
  }

  // 设置新的刷新定时器（30秒）
  configUpdateInterval.value = setInterval(() => {
    console.log('🔄 自动刷新配置数据...')
    loadConfigData(false) // 自动刷新不显示通知
    loadConfigOptions(false) // 同时刷新配置选项
  }, 30000) // 30秒刷新一次

  console.log('✅ 配置数据自动刷新已启动（30秒间隔）')
}

// 加载我的虚拟机申请列表
const loadMyRequests = async () => {
  try {
    listLoading.value = true
    const params = {
      page: listPagination.page,
      pageSize: listPagination.pageSize,
      system_name: searchForm.systemName,
      status: searchForm.status
    }

    // 管理员查看所有申请，普通用户只查看自己的申请
    const response = userStore.isAdmin()
      ? await getAllVMRequestsList(params)
      : await getMyVMRequests(params)

    myRequests.value = response.requests || []
    listPagination.total = response.pagination?.total || 0
  } catch (error) {
    console.error('加载申请列表失败:', error)
    ElMessage.error('加载申请列表失败')
  } finally {
    listLoading.value = false
  }
}

// 查看申请详情
const viewRequest = (request) => {
  currentRequest.value = request
  viewDialog.value = true
}

// 编辑申请
const editRequest = (request) => {
  // 如果从查看对话框进入编辑，关闭查看对话框
  viewDialog.value = false

  // 将申请数据存储到sessionStorage（保留兼容）
  sessionStorage.setItem('editRequestData', JSON.stringify({
    systemCode: request.system_code,
    systemName: request.system_name,
    moduleName: request.module_name,
    owner: request.owner,
    type: request.type,
    environment: request.environment,
    configOption: request.config_option,
    systemDisk: request.system_disk || 0,
    dataDisk: request.data_disk || 0
  }))
  sessionStorage.setItem('editRequestId', request.id.toString())

  // 切换到表单tab并刷新页面
  currentView.value = 'form'
  window.location.reload()
}

// 从query参数进入编辑模式
const editRequestFromQuery = (request) => {
  // 如果从查看对话框进入编辑，关闭查看对话框
  viewDialog.value = false

  // 将申请数据存储到sessionStorage
  sessionStorage.setItem('editRequestData', JSON.stringify({
    systemCode: request.system_code,
    systemName: request.system_name,
    moduleName: request.module_name,
    owner: request.owner,
    type: request.type,
    environment: request.environment,
    configOption: request.config_option,
    systemDisk: request.system_disk || 0,
    dataDisk: request.data_disk || 0
  }))
  sessionStorage.setItem('editRequestId', request.id.toString())

  // 切换到表单tab，不刷新页面
  currentView.value = 'form'
  loadRecentRequest()
}

// 复制申请
const copyRequest = (request) => {
  // 将申请数据存储到sessionStorage，添加-COPY标识
  sessionStorage.setItem('copyRequestData', JSON.stringify({
    systemCode: request.system_code + '-COPY',
    systemName: request.system_name,
    moduleName: request.module_name,
    owner: request.owner,
    type: request.type,
    environment: request.environment,
    configOption: request.config_option,
    systemDisk: request.system_disk || 0,
    dataDisk: request.data_disk || 0
  }))

  // 切换到表单tab并刷新页面
  currentView.value = 'form'
  window.location.reload()
}

// 删除申请
const deleteRequest = async (request) => {
  try {
    const systemName = request.system_name || request.system_code || '该申请'
    await ElMessageBox.confirm(
      `确定要删除系统 "${systemName}" 的虚拟机申请吗？此操作不可恢复！`,
      '删除虚拟机申请',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await deleteVMRequest(request.id)
    ElMessage.success('虚拟机申请删除成功')
    await loadMyRequests()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除申请失败:', error)
      ElMessage.error('删除失败: ' + (error.response?.data?.message || error.message))
    }
  }
}

// 获取状态类型
const getStatusType = (status) => {
  const typeMap = {
    draft: 'info',
    submitted: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return typeMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status) => {
  const textMap = {
    draft: '草稿',
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

// 计算总数据盘量
const calculateTotalDataDisk = (row) => {
  if (!row.node_count || row.node_count <= 0) return '-'
  const dataDisk = row.data_disk || 0
  return dataDisk * row.node_count
}

// 计算总磁盘量
const calculateTotalDisk = (row) => {
  if (!row.node_count || row.node_count <= 0) return '-'
  const systemDisk = row.system_disk || 0
  const dataDisk = row.data_disk || 0
  return (systemDisk + dataDisk) * row.node_count
}

// 切换到表单视图
const showFormView = () => {
  currentView.value = 'form'
  if (!formDataLoaded.value) {
    console.log('📋 切换到表单视图，加载表单数据')
    loadRecentRequest()
    formDataLoaded.value = true
  }
}
</script>

<style scoped>
.create-request {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

.request-form-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.config-details {
  margin-top: 15px;
  padding: 15px;
  background-color: #f0f9ff;
  border-radius: 4px;
  border: 1px solid #d1e7dd;
}

.config-details .el-descriptions {
  margin-top: 10px;
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
}

/* 核心指标突出样式 - 与"已提交"标签样式一致，添加背景颜色和加粗 */
.core-metric-item {
  background-color: #f0f9ff !important;
}

.core-metric-item .el-descriptions__label {
  background-color: transparent !important;
  color: #606266 !important;
  font-weight: 600 !important;
  font-size: 12px !important;
}

.core-metric-value {
  color: #67c23a !important;
  font-weight: 600 !important;
  font-size: 12px !important;
}

.core-metric-label {
  color: #606266 !important;
}

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

/* 列表样式 */
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

.last-update-time {
  margin-left: 10px;
  font-size: 12px;
  color: #909399;
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