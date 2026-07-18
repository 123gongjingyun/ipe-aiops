<template>
  <div class="config-management">
    <div class="page-header">
      <h2 class="page-title">配置管理</h2>
    </div>

    <el-tabs v-model="activeTab" type="border-card" @tab-change="handleTabChange">
      <!-- 类型管理 -->
      <el-tab-pane label="类型管理" name="types">
        <div class="tab-header">
          <el-button type="primary" :icon="Plus" @click="handleAddType">
            添加类型
          </el-button>
          <el-button @click="loadTypes">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>

        <el-table :data="types" border stripe v-loading="loading.types">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="name" label="类型名称" />
          <el-table-column prop="description" label="描述" />
          <el-table-column prop="sort_order" label="排序" width="100" />
          <el-table-column prop="is_active" label="状态" width="100">
            <template #default="{ row }">
              <el-switch
                :model-value="!!row.is_active"
                @change="toggleTypeActive(row)"
                :loading="row.toggling"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="{ row }">
              <el-button size="small" @click="handleEditType(row)">编辑</el-button>
              <el-button size="small" type="danger" @click="handleDeleteType(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 环境管理 -->
      <el-tab-pane label="环境管理" name="environments">
        <div class="tab-header">
          <el-button type="primary" :icon="Plus" @click="handleAddEnvironment">
            添加环境
          </el-button>
          <el-button @click="loadEnvironments">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>

        <el-table :data="environments" border stripe v-loading="loading.environments">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="name" label="环境名称" />
          <el-table-column prop="description" label="描述" />
          <el-table-column prop="sort_order" label="排序" width="100" />
          <el-table-column prop="is_active" label="状态" width="100">
            <template #default="{ row }">
              <el-switch
                :model-value="!!row.is_active"
                @change="toggleEnvironmentActive(row)"
                :loading="row.toggling"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="{ row }">
              <el-button size="small" @click="handleEditEnvironment(row)">编辑</el-button>
              <el-button size="small" type="danger" @click="handleDeleteEnvironment(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 配置选项管理 -->
      <el-tab-pane label="配置选项" name="options">
        <div class="tab-header">
          <el-button type="primary" :icon="Plus" @click="handleAddOption">
            添加配置选项
          </el-button>
          <el-button @click="loadConfigOptions">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>

        <div class="filter-bar">
          <el-select v-model="filters.typeId" placeholder="按类型筛选" clearable style="width: 150px" @change="loadConfigOptions">
            <el-option v-for="type in types" :key="type.id" :label="type.name" :value="type.id" />
          </el-select>
          <el-select v-model="filters.environmentId" placeholder="按环境筛选" clearable style="width: 150px" @change="loadConfigOptions">
            <el-option v-for="env in environments" :key="env.id" :label="env.name" :value="env.id" />
          </el-select>
        </div>

        <el-table :data="configOptions" border stripe v-loading="loading.options">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="type_name" label="类型" width="120" />
          <el-table-column prop="environment_name" label="环境" width="100" />
          <el-table-column prop="name" label="配置名称" width="150" />
          <el-table-column prop="node_count" label="节点数" width="80" />
          <el-table-column prop="cpu" label="CPU" width="80" />
          <el-table-column prop="memory" label="内存" width="80" />
          <el-table-column prop="disk_type" label="磁盘类型" width="100" />
          <el-table-column prop="system_disk" label="系统盘" width="100" />
          <el-table-column prop="data_disk" label="数据盘" width="100" />
          <el-table-column label="操作" width="250">
            <template #default="{ row }">
              <el-button size="small" @click="handleEditOption(row)">编辑</el-button>
              <el-button size="small" type="success" @click="handleEditDescription(row)">详细说明</el-button>
              <el-button size="small" type="danger" @click="handleDeleteOption(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 类型编辑对话框 -->
    <el-dialog v-model="dialogs.type" :title="typeForm.isEdit ? '编辑类型' : '添加类型'" width="500px">
      <el-form :model="typeForm" :rules="typeRules" ref="typeFormRef" label-width="100px">
        <el-form-item label="类型名称" prop="name">
          <el-input v-model="typeForm.name" placeholder="如：数据库、RabbitMQ" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="typeForm.description" type="textarea" rows="3" />
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="typeForm.sortOrder" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogs.type = false">取消</el-button>
        <el-button type="primary" @click="saveType" :loading="loading.save">保存</el-button>
      </template>
    </el-dialog>

    <!-- 环境编辑对话框 -->
    <el-dialog v-model="dialogs.environment" :title="environmentForm.isEdit ? '编辑环境' : '添加环境'" width="500px">
      <el-form :model="environmentForm" :rules="environmentRules" ref="environmentFormRef" label-width="100px">
        <el-form-item label="环境名称" prop="name">
          <el-input v-model="environmentForm.name" placeholder="如：测试、生产" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="environmentForm.description" type="textarea" rows="3" />
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="environmentForm.sortOrder" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogs.environment = false">取消</el-button>
        <el-button type="primary" @click="saveEnvironment" :loading="loading.save">保存</el-button>
      </template>
    </el-dialog>

    <!-- 配置选项编辑对话框 -->
    <el-dialog v-model="dialogs.option" :title="optionForm.isEdit ? '编辑配置选项' : '添加配置选项'" width="600px">
      <el-form :model="optionForm" :rules="optionRules" ref="optionFormRef" label-width="120px">
        <el-form-item label="配置类型" prop="typeId">
          <el-select v-model="optionForm.typeId" placeholder="选择类型" style="width: 100%">
            <el-option v-for="type in activeTypes" :key="type.id" :label="type.name" :value="type.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="环境" prop="environmentId">
          <el-select v-model="optionForm.environmentId" placeholder="选择环境" style="width: 100%">
            <el-option v-for="env in activeEnvironments" :key="env.id" :label="env.name" :value="env.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="配置名称" prop="name">
          <el-input v-model="optionForm.name" placeholder="如：配置A-小型" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="节点数" prop="nodeCount">
              <el-input-number v-model="optionForm.nodeCount" :min="1" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="CPU" prop="cpu">
              <el-input-number v-model="optionForm.cpu" :min="1" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="内存(GB)" prop="memory">
              <el-input-number v-model="optionForm.memory" :min="1" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="磁盘类型" prop="diskType">
              <el-select v-model="optionForm.diskType" style="width: 100%">
                <el-option label="高IO" value="高IO" />
                <el-option label="超高IO" value="超高IO" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="系统盘(GB)" prop="systemDisk">
              <el-input-number v-model="optionForm.systemDisk" :min="1" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="数据盘(GB)" prop="dataDisk">
              <el-input-number v-model="optionForm.dataDisk" :min="1" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="描述" prop="description">
          <el-input v-model="optionForm.description" type="textarea" rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogs.option = false">取消</el-button>
        <el-button type="primary" @click="saveOption" :loading="loading.save">保存</el-button>
      </template>
    </el-dialog>

    <!-- 配置详细说明编辑对话框 -->
    <el-dialog v-model="dialogs.description" title="配置详细说明" width="800px">
      <el-form :model="descriptionForm" ref="descriptionFormRef" label-width="140px">
        <el-divider content-position="left">基本信息</el-divider>
        <el-form-item label="配置选项">
          <el-input v-model="currentConfigOptionName" disabled />
        </el-form-item>
        <el-form-item label="架构类型">
          <el-input v-model="descriptionForm.architectureType" placeholder="如：单节点、主从架构、集群架构" />
        </el-form-item>

        <el-divider content-position="left">性能指标</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="并发连接数">
              <el-input v-model="descriptionForm.performanceConcurrent" placeholder="如：50-80" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="吞吐量">
              <el-input v-model="descriptionForm.performanceThroughput" placeholder="如：800-2,000" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="响应时间">
              <el-input v-model="descriptionForm.performanceResponse" placeholder="如：<100ms" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="磁盘IOPS">
              <el-input v-model="descriptionForm.performanceIops" placeholder="如：1200~5000" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">资源配置详情</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="CPU详细说明">
              <el-input v-model="descriptionForm.resourceCpuDetail" placeholder="如：2核Intel Xeon" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="内存详细说明">
              <el-input v-model="descriptionForm.resourceMemoryDetail" placeholder="如：4GB DDR4" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="系统盘详细说明">
              <el-input v-model="descriptionForm.resourceSystemDisk" placeholder="如：40 GB 高IO云盘" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="数据盘详细说明">
              <el-input v-model="descriptionForm.resourceDataDisk" placeholder="如：100 GB 高IO块存储" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">使用场景</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="适用场景">
              <el-input v-model="descriptionForm.scenarioUsage" placeholder="如：开发测试环境" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="用户规模">
              <el-input v-model="descriptionForm.scenarioUserScale" placeholder="如：日活<3,000" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="推荐等级">
              <el-select v-model="descriptionForm.recommendationLevel" style="width: 100%">
                <el-option label="不推荐" value="不推荐" />
                <el-option label="一般" value="一般" />
                <el-option label="推荐" value="推荐" />
                <el-option label="强烈推荐" value="强烈推荐" />
                <el-option label="顶级" value="顶级" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="价格等级">
              <el-select v-model="descriptionForm.priceLevel" style="width: 100%">
                <el-option label="便宜" value="便宜" />
                <el-option label="中等" value="中等" />
                <el-option label="较贵" value="较贵" />
                <el-option label="最贵" value="最贵" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="技术说明">
          <el-input v-model="descriptionForm.technicalNotes" type="textarea" rows="3" placeholder="技术选型建议和注意事项" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogs.description = false">取消</el-button>
        <el-button type="primary" @click="saveDescription" :loading="loading.save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const activeTab = ref('types')

// 加载状态
const loading = reactive({
  types: false,
  environments: false,
  options: false,
  linkage: false,
  save: false
})

// 对话框状态
const dialogs = reactive({
  type: false,
  environment: false,
  option: false,
  description: false
})

// 数据存储
const types = ref([])
const environments = ref([])
const configOptions = ref([])

// 筛选条件
const filters = reactive({
  typeId: null,
  environmentId: null
})

// 用于下拉选择的类型和环境（显示所有，包括未启用的）
const activeTypes = computed(() => types.value)
const activeEnvironments = computed(() => environments.value)

// 类型表单
const typeFormRef = ref(null)
const typeForm = reactive({
  id: null,
  name: '',
  description: '',
  sortOrder: 0,
  isEdit: false
})

const typeRules = {
  name: [
    { required: true, message: '请输入类型名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在2-20个字符', trigger: 'blur' }
  ]
}

// 环境表单
const environmentFormRef = ref(null)
const environmentForm = reactive({
  id: null,
  name: '',
  description: '',
  sortOrder: 0,
  isEdit: false
})

const environmentRules = {
  name: [
    { required: true, message: '请输入环境名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在2-20个字符', trigger: 'blur' }
  ]
}

// 配置选项表单
const optionFormRef = ref(null)
const optionForm = reactive({
  id: null,
  typeId: null,
  environmentId: null,
  name: '',
  nodeCount: 1,
  cpu: 2,
  memory: 4,
  diskType: '高IO',
  systemDisk: 80,
  dataDisk: 100,
  description: '',
  isEdit: false
})

const optionRules = {
  typeId: [{ required: true, message: '请选择配置类型', trigger: 'change' }],
  environmentId: [{ required: true, message: '请选择环境', trigger: 'change' }],
  name: [
    { required: true, message: '请输入配置名称', trigger: 'blur' },
    { min: 3, max: 50, message: '长度在3-50个字符', trigger: 'blur' }
  ]
}

// 配置详细说明表单
const descriptionFormRef = ref(null)
const currentConfigOptionId = ref(null)
const currentConfigOptionName = ref('')
const descriptionForm = reactive({
  architectureType: '',
  performanceConcurrent: '',
  performanceThroughput: '',
  performanceResponse: '',
  performanceIops: '',
  performanceDiskThroughput: '',
  resourceCpuDetail: '',
  resourceMemoryDetail: '',
  resourceSystemDisk: '',
  resourceDataDisk: '',
  diskTypeDescription: '',
  capacityStorage: '',
  capacityQueues: '',
  scenarioUsage: '',
  scenarioUserScale: '',
  recommendationLevel: '一般',
  technicalNotes: '',
  priceLevel: '中等'
})

// ==================== 数据加载方法 ====================

const loadTypes = async () => {
  loading.types = true
  try {
    // 从真实API加载配置类型（从数据库config_types表获取）
    const response = await fetch('/api/config/types', {
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })
    const data = await response.json()

    if (data.success) {
      types.value = data.data
      console.log('✅ 配置类型已从数据库加载:', data.data.length, '个类型')
    } else {
      throw new Error('API返回失败')
    }
  } catch (error) {
    console.error('加载配置类型失败:', error)
    ElMessage.error('加载配置类型失败')
  } finally {
    loading.types = false
  }
}

const loadEnvironments = async () => {
  loading.environments = true
  try {
    // 从真实API加载环境配置（从数据库environments表获取）
    const response = await fetch('/api/config/environments', {
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })
    const data = await response.json()

    if (data.success) {
      environments.value = data.data
      console.log('✅ 环境配置已从数据库加载:', data.data.length, '个环境')
    } else {
      throw new Error('API返回失败')
    }
  } catch (error) {
    console.error('加载环境失败:', error)
    ElMessage.error('加载环境失败')
  } finally {
    loading.environments = false
  }
}

const loadConfigOptions = async () => {
  loading.options = true
  try {
    // 从真实API加载配置选项（从数据库config_options表获取）
    const response = await fetch('/api/config/options', {
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })
    const data = await response.json()

    if (data.success) {
      let filtered = data.data

      // 应用筛选条件
      if (filters.typeId) {
        filtered = filtered.filter(opt => opt.type_id === filters.typeId)
      }
      if (filters.environmentId) {
        filtered = filtered.filter(opt => opt.environment_id === filters.environmentId)
      }

      configOptions.value = filtered
      console.log('✅ 配置选项已从数据库加载:', filtered.length, '个选项')
    } else {
      throw new Error('API返回失败')
    }
  } catch (error) {
    console.error('加载配置选项失败:', error)
    ElMessage.error('加载配置选项失败')
  } finally {
    loading.options = false
  }
}

// ==================== 类型管理方法 ====================

const handleAddType = () => {
  Object.assign(typeForm, {
    id: null,
    name: '',
    description: '',
    sortOrder: types.value.length + 1,
    isEdit: false
  })
  dialogs.type = true
}

const handleEditType = (row) => {
  Object.assign(typeForm, {
    id: row.id,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    isEdit: true
  })
  dialogs.type = true
}

const saveType = async () => {
  try {
    const valid = await typeFormRef.value.validate()
    if (!valid) return

    loading.save = true

    if (typeForm.isEdit) {
      // 更新类型
      await fetch(`/api/config/types/${typeForm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userStore.token}`
        },
        body: JSON.stringify({
          name: typeForm.name,
          description: typeForm.description,
          sortOrder: typeForm.sortOrder,
          isActive: true
        })
      })
      ElMessage.success('类型更新成功')
    } else {
      // 创建新类型
      await fetch('/api/config/types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userStore.token}`
        },
        body: JSON.stringify({
          name: typeForm.name,
          description: typeForm.description,
          sortOrder: typeForm.sortOrder
        })
      })
      ElMessage.success('类型添加成功')
    }

    dialogs.type = false
    await loadTypes()

    // 触发配置变化事件，通知其他页面配置已更新
    window.dispatchEvent(new CustomEvent('config-changed', { detail: { type: 'types' } }))
  } catch (error) {
    console.error('保存类型失败:', error)
    ElMessage.error('保存失败: ' + error.message)
  } finally {
    loading.save = false
  }
}

const handleDeleteType = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除类型"${row.name}"吗？`, '确认删除', {
      type: 'warning'
    })

    // 调用真实的删除API
    const response = await fetch(`/api/config/types/${row.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })

    if (response.ok) {
      ElMessage.success('删除成功')
      await loadTypes()

      // 触发配置变化事件，通知其他页面配置已更新
      window.dispatchEvent(new CustomEvent('config-changed', { detail: { type: 'types' } }))
    } else {
      const data = await response.json()
      throw new Error(data.message || '删除失败')
    }
  } catch (error) {
    console.error('删除类型失败:', error)
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

const toggleTypeActive = async (row) => {
  row.toggling = true
  try {
    // 调用真实的切换状态API
    const response = await fetch(`/api/config/types/${row.id}/toggle`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })

    if (response.ok) {
      ElMessage.success('状态更新成功')
      // 重新加载数据以获取最新的状态
      await loadTypes()

      // 触发配置变化事件，通知其他页面配置已更新
      window.dispatchEvent(new CustomEvent('config-changed', { detail: { type: 'types' } }))
    } else {
      throw new Error('状态更新失败')
    }
  } catch (error) {
    console.error('切换类型状态失败:', error)
    ElMessage.error('状态更新失败')
  } finally {
    row.toggling = false
  }
}

// ==================== 环境管理方法 ====================

const handleAddEnvironment = () => {
  Object.assign(environmentForm, {
    id: null,
    name: '',
    description: '',
    sortOrder: environments.value.length + 1,
    isEdit: false
  })
  dialogs.environment = true
}

const handleEditEnvironment = (row) => {
  Object.assign(environmentForm, {
    id: row.id,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    isEdit: true
  })
  dialogs.environment = true
}

const saveEnvironment = async () => {
  try {
    const valid = await environmentFormRef.value.validate()
    if (!valid) return

    loading.save = true

    if (environmentForm.isEdit) {
      // 更新环境
      await fetch(`/api/config/environments/${environmentForm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userStore.token}`
        },
        body: JSON.stringify({
          name: environmentForm.name,
          description: environmentForm.description,
          sortOrder: environmentForm.sortOrder,
          isActive: true
        })
      })
      ElMessage.success('环境更新成功')
    } else {
      // 创建新环境
      await fetch('/api/config/environments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userStore.token}`
        },
        body: JSON.stringify({
          name: environmentForm.name,
          description: environmentForm.description,
          sortOrder: environmentForm.sortOrder
        })
      })
      ElMessage.success('环境添加成功')
    }

    dialogs.environment = false
    await loadEnvironments()

    // 触发配置变化事件，通知其他页面配置已更新
    window.dispatchEvent(new CustomEvent('config-changed', { detail: { type: 'environments' } }))
  } catch (error) {
    console.error('保存环境失败:', error)
    ElMessage.error('保存失败: ' + error.message)
  } finally {
    loading.save = false
  }
}

const handleDeleteEnvironment = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除环境"${row.name}"吗？`, '确认删除', {
      type: 'warning'
    })

    // 调用真实的删除API
    const response = await fetch(`/api/config/environments/${row.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })

    if (response.ok) {
      ElMessage.success('删除成功')
      await loadEnvironments()

      // 触发配置变化事件，通知其他页面配置已更新
      window.dispatchEvent(new CustomEvent('config-changed', { detail: { type: 'environments' } }))
    } else {
      const data = await response.json()
      throw new Error(data.message || '删除失败')
    }
  } catch (error) {
    console.error('删除环境失败:', error)
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

const toggleEnvironmentActive = async (row) => {
  row.toggling = true
  try {
    // 调用真实的切换状态API
    const response = await fetch(`/api/config/environments/${row.id}/toggle`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })

    if (response.ok) {
      ElMessage.success('状态更新成功')
      // 重新加载数据以获取最新的状态
      await loadEnvironments()

      // 触发配置变化事件，通知其他页面配置已更新
      window.dispatchEvent(new CustomEvent('config-changed', { detail: { type: 'environments' } }))
    } else {
      throw new Error('状态更新失败')
    }
  } catch (error) {
    console.error('切换环境状态失败:', error)
    ElMessage.error('状态更新失败')
  } finally {
    row.toggling = false
  }
}

// ==================== 配置选项管理方法 ====================

const handleAddOption = () => {
  Object.assign(optionForm, {
    id: null,
    typeId: null,
    environmentId: null,
    name: '',
    nodeCount: 1,
    cpu: 2,
    memory: 4,
    diskType: '高IO',
    systemDisk: 80,
    dataDisk: 100,
    description: '',
    isEdit: false
  })
  dialogs.option = true
}

const handleEditOption = (row) => {
  Object.assign(optionForm, {
    id: row.id,
    typeId: row.type_id,  // 使用正确的字段名
    environmentId: row.environment_id,  // 使用正确的字段名
    name: row.name,
    nodeCount: row.node_count,  // 使用正确的字段名
    cpu: row.cpu,
    memory: row.memory,
    diskType: row.disk_type,  // 使用正确的字段名
    systemDisk: row.system_disk,  // 使用正确的字段名
    dataDisk: row.data_disk,  // 使用正确的字段名
    description: row.description || '',
    isEdit: true
  })
  dialogs.option = true
}

const saveOption = async () => {
  try {
    const valid = await optionFormRef.value.validate()
    if (!valid) return

    loading.save = true

    if (optionForm.isEdit) {
      // 更新配置选项
      await fetch(`/api/config/options/${optionForm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userStore.token}`
        },
        body: JSON.stringify({
          typeId: optionForm.typeId,
          environmentId: optionForm.environmentId,
          name: optionForm.name,
          nodeCount: optionForm.nodeCount,
          cpu: optionForm.cpu,
          memory: optionForm.memory,
          diskType: optionForm.diskType,
          systemDisk: optionForm.systemDisk,
          dataDisk: optionForm.dataDisk,
          description: optionForm.description
        })
      })
      ElMessage.success('配置选项更新成功')
    } else {
      // 创建新配置选项
      await fetch('/api/config/options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userStore.token}`
        },
        body: JSON.stringify({
          typeId: optionForm.typeId,
          environmentId: optionForm.environmentId,
          name: optionForm.name,
          nodeCount: optionForm.nodeCount,
          cpu: optionForm.cpu,
          memory: optionForm.memory,
          diskType: optionForm.diskType,
          systemDisk: optionForm.systemDisk,
          dataDisk: optionForm.dataDisk,
          description: optionForm.description
        })
      })
      ElMessage.success('配置选项添加成功')
    }

    dialogs.option = false
    await loadConfigOptions()

    // 触发配置变化事件，通知其他页面配置已更新
    window.dispatchEvent(new CustomEvent('config-changed', { detail: { type: 'options' } }))
  } catch (error) {
    console.error('保存配置选项失败:', error)
    ElMessage.error('保存失败: ' + error.message)
  } finally {
    loading.save = false
  }
}

const handleDeleteOption = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除配置选项"${row.name}"吗？`, '确认删除', {
      type: 'warning'
    })

    // 调用真实的删除API
    const response = await fetch(`/api/config/options/${row.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })

    if (response.ok) {
      ElMessage.success('删除成功')
      await loadConfigOptions()

      // 触发配置变化事件，通知其他页面配置已更新
      window.dispatchEvent(new CustomEvent('config-changed', { detail: { type: 'options' } }))
    } else {
      const data = await response.json()
      throw new Error(data.message || '删除失败')
    }
  } catch (error) {
    console.error('删除配置选项失败:', error)
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

// ==================== 配置详细说明管理方法 ====================

const handleEditDescription = async (row) => {
  try {
    currentConfigOptionId.value = row.id
    currentConfigOptionName.value = `${row.type_name} - ${row.environment_name} - ${row.name}`

    // 从API获取配置详细说明
    const response = await fetch(`/api/config/descriptions?configOptionId=${row.id}`, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })

    if (response.ok) {
      const data = await response.json()

      if (data.success && data.data.length > 0) {
        // 使用API返回的真实数据
        const description = data.data[0]
        Object.assign(descriptionForm, {
          architectureType: description.architecture_type || '',
          performanceConcurrent: description.performance_concurrent || '',
          performanceThroughput: description.performance_throughput || '',
          performanceResponse: description.performance_response || '',
          performanceIops: description.performance_iops || '',
          performanceDiskThroughput: description.performance_disk_throughput || '',
          resourceCpuDetail: description.resource_cpu_detail || '',
          resourceMemoryDetail: description.resource_memory_detail || '',
          resourceSystemDisk: description.resource_system_disk || '',
          resourceDataDisk: description.resource_data_disk || '',
          scenarioUsage: description.scenario_usage || '',
          scenarioUserScale: description.scenario_user_scale || '',
          recommendationLevel: description.recommendation_level || '一般',
          technicalNotes: description.technical_notes || '',
          priceLevel: description.price_level || '中等'
        })
        console.log('✅ 配置详细说明已从API加载')
      } else {
        // 如果API没有数据，使用默认值
        Object.assign(descriptionForm, {
          architectureType: '单节点',
          performanceConcurrent: '50-80',
          performanceThroughput: '800-2,000',
          performanceResponse: '<100ms',
          performanceIops: '1200~5000',
          performanceDiskThroughput: '100-150 MB/s',
          resourceCpuDetail: '2核Intel Xeon',
          resourceMemoryDetail: '4GB DDR4',
          resourceSystemDisk: '40 GB 高IO云盘',
          resourceDataDisk: '100 GB 高IO块存储',
          scenarioUsage: '开发测试环境',
          scenarioUserScale: '日活<3,000',
          recommendationLevel: '一般',
          technicalNotes: '云环境，适合开发测试使用',
          priceLevel: '中等'
        })
        console.log('ℹ️️ API无数据，使用默认值')
      }
    } else {
      throw new Error('获取配置详细说明失败')
    }

    dialogs.description = true
  } catch (error) {
    console.error('加载配置详细说明失败:', error)
    // 如果加载失败，使用默认值并打开对话框
    Object.assign(descriptionForm, {
      architectureType: '单节点',
      performanceConcurrent: '50-80',
      performanceThroughput: '800-2,000',
      performanceResponse: '<100ms',
      performanceIops: '1200~5000',
      performanceDiskThroughput: '100-150 MB/s',
      resourceCpuDetail: '2核Intel Xeon',
      resourceMemoryDetail: '4GB DDR4',
      resourceSystemDisk: '40 GB 高IO云盘',
      resourceDataDisk: '100 GB 高IO块存储',
      scenarioUsage: '开发测试环境',
      scenarioUserScale: '日活<3,000',
      recommendationLevel: '一般',
      technicalNotes: '云环境，适合开发测试使用',
      priceLevel: '中等'
    })
    dialogs.description = true
  }
}

const saveDescription = async () => {
  try {
    loading.save = true

    // 调用真实的API保存配置详细说明
    const response = await fetch(`/api/config/descriptions/${currentConfigOptionId.value}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`
      },
      body: JSON.stringify({
        architectureType: descriptionForm.architectureType,
        performanceConcurrent: descriptionForm.performanceConcurrent,
        performanceThroughput: descriptionForm.performanceThroughput,
        performanceResponse: descriptionForm.performanceResponse,
        performanceIops: descriptionForm.performanceIops,
        performanceDiskThroughput: descriptionForm.performanceDiskThroughput,
        resourceCpuDetail: descriptionForm.resourceCpuDetail,
        resourceMemoryDetail: descriptionForm.resourceMemoryDetail,
        resourceSystemDisk: descriptionForm.resourceSystemDisk,
        resourceDataDisk: descriptionForm.resourceDataDisk,
        scenarioUsage: descriptionForm.scenarioUsage,
        scenarioUserScale: descriptionForm.scenarioUserScale,
        recommendationLevel: descriptionForm.recommendationLevel,
        technicalNotes: descriptionForm.technicalNotes,
        priceLevel: descriptionForm.priceLevel
      })
    })

    if (response.ok) {
      ElMessage.success('配置详细说明保存成功')
      dialogs.description = false
    } else {
      const data = await response.json()
      throw new Error(data.message || '保存失败')
    }
  } catch (error) {
    console.error('保存配置详细说明失败:', error)
    ElMessage.error('保存失败: ' + error.message)
  } finally {
    loading.save = false
  }
}

// ==================== 通用方法 ====================

const handleTabChange = (tabName) => {
  switch (tabName) {
    case 'types':
      if (types.value.length === 0) loadTypes()
      break
    case 'environments':
      if (environments.value.length === 0) loadEnvironments()
      break
    case 'options':
      if (configOptions.value.length === 0) loadConfigOptions()
      break
  }
}

// 初始化
onMounted(() => {
  loadTypes()
  loadEnvironments()
})
</script>

<style scoped>
.config-management {
  padding: 20px;
}

.tab-header {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.filter-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}
</style>