<template>
  <div class="config-selector">
    <el-row :gutter="20">
      <!-- 类型选择 -->
      <el-col :span="8">
        <el-form-item label="类型" required>
          <el-select
            v-model="selectedType"
            placeholder="请选择类型"
            @change="handleTypeChange"
            :disabled="disabled"
            style="width: 100%"
          >
            <el-option
              v-for="type in types"
              :key="type.id"
              :label="type.name"
              :value="type.id"
            />
          </el-select>
        </el-form-item>
      </el-col>

      <!-- 环境选择 -->
      <el-col :span="8">
        <el-form-item label="环境" required>
          <el-select
            v-model="selectedEnvironment"
            placeholder="请选择环境"
            @change="handleEnvironmentChange"
            :disabled="disabled || !selectedType"
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
      </el-col>

      <!-- 配置选择 -->
      <el-col :span="8">
        <el-form-item label="配置选择" required>
          <el-select
            v-model="selectedConfig"
            placeholder="请选择配置"
            @change="handleConfigChange"
            :disabled="disabled || !selectedEnvironment"
            style="width: 100%"
          >
            <el-option
              v-for="config in availableConfigs"
              :key="config.id"
              :label="config.name"
              :value="config.id"
            >
              <div class="config-option">
                <span>{{ config.name }}</span>
                <span class="config-preview">{{ config.cpu }}C/{{ config.memory }}GB/{{ config.nodeCount }}节点</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
      </el-col>
    </el-row>

    <!-- 配置预览 -->
    <el-alert
      v-if="selectedConfigDetail"
      title="配置详情"
      type="info"
      :closable="false"
      style="margin-top: 10px"
    >
      <div class="detail-preview">
        <el-descriptions :column="4" size="small" border>
          <el-descriptions-item label="配置名称">{{ selectedConfigDetail.name }}</el-descriptions-item>
          <el-descriptions-item label="节点数">{{ selectedConfigDetail.nodeCount }}</el-descriptions-item>
          <el-descriptions-item label="CPU">{{ selectedConfigDetail.cpu }}C</el-descriptions-item>
          <el-descriptions-item label="内存">{{ selectedConfigDetail.memory }}GB</el-descriptions-item>
          <el-descriptions-item label="磁盘类型">{{ selectedConfigDetail.diskType }}</el-descriptions-item>
          <el-descriptions-item label="系统盘">{{ selectedConfigDetail.systemDisk }}GB</el-descriptions-item>
          <el-descriptions-item label="数据盘">{{ selectedConfigDetail.dataDisk }}GB</el-descriptions-item>
          <el-descriptions-item label="总存储">{{ selectedConfigDetail.systemDisk + selectedConfigDetail.dataDisk }}GB</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-alert>

    <!-- 详细说明 -->
    <el-collapse v-if="selectedDescription" style="margin-top: 10px">
      <el-collapse-item title="详细说明" name="description">
        <div class="description-content">
          <el-descriptions :column="2" size="small" border>
            <el-descriptions-item label="架构类型">
              {{ selectedDescription.architectureType || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="并发连接数">
              {{ selectedDescription.performanceConcurrent || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="吞吐量">
              {{ selectedDescription.performanceThroughput || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="响应时间">
              {{ selectedDescription.performanceResponse || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="适用场景">
              {{ selectedDescription.scenarioUsage || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="用户规模">
              {{ selectedDescription.scenarioUserScale || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="推荐等级">
              <el-tag :type="getRecommendationType(selectedDescription.recommendationLevel)">
                {{ selectedDescription.recommendationLevel || '-' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="价格等级">
              {{ selectedDescription.priceLevel || '-' }}
            </el-descriptions-item>
          </el-descriptions>

          <div v-if="selectedDescription.technicalNotes" class="technical-notes">
            <el-divider content-position="left">技术说明</el-divider>
            <p>{{ selectedDescription.technicalNotes }}</p>
          </div>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

// 选择状态
const selectedType = ref(null)
const selectedEnvironment = ref(null)
const selectedConfig = ref(null)

// 数据存储
const types = ref([])
const environments = ref([])
const configOptions = ref([])

// 可用的配置选项（基于已选择的环境）
const availableConfigs = computed(() => {
  if (!selectedEnvironment.value) return []
  return configOptions.value.filter(opt => opt.environmentId === selectedEnvironment.value)
})

// 选中的配置详情
const selectedConfigDetail = computed(() => {
  if (!selectedConfig.value) return null
  return configOptions.value.find(opt => opt.id === selectedConfig.value)
})

// 配置详细说明
const selectedDescription = ref(null)

// 获取推荐等级标签类型
const getRecommendationType = (level) => {
  const types = {
    '不推荐': 'danger',
    '一般': 'info',
    '推荐': 'success',
    '强烈推荐': 'warning',
    '顶级': 'primary'
  }
  return types[level] || 'info'
}

// 加载配置数据
const loadConfigData = async () => {
  try {
    // 这里应该调用API获取数据
    // 模拟数据
    await new Promise(resolve => setTimeout(resolve, 300))

    types.value = [
      { id: 1, name: '数据库' },
      { id: 2, name: 'rabbitmq' },
      { id: 3, name: 'redis' },
      { id: 4, name: 'AP' },
      { id: 5, name: '其他' }
    ]

    environments.value = [
      { id: 1, name: '测试' },
      { id: 2, name: '生产' }
    ]

    configOptions.value = [
      { id: 1, typeId: 1, environmentId: 1, name: '配置A-小型', nodeCount: 1, cpu: 2, memory: 4, diskType: '高IO', systemDisk: 80, dataDisk: 100 },
      { id: 2, typeId: 1, environmentId: 1, name: '配置B-中型', nodeCount: 1, cpu: 4, memory: 8, diskType: '高IO', systemDisk: 80, dataDisk: 200 },
      { id: 3, typeId: 1, environmentId: 2, name: '配置A-小型主从', nodeCount: 2, cpu: 2, memory: 4, diskType: '超高IO', systemDisk: 80, dataDisk: 100 },
      { id: 4, typeId: 1, environmentId: 2, name: '配置B-标准主从', nodeCount: 2, cpu: 4, memory: 8, diskType: '超高IO', systemDisk: 80, dataDisk: 200 },
      { id: 5, typeId: 2, environmentId: 1, name: '配置A-小型', nodeCount: 1, cpu: 2, memory: 4, diskType: '高IO', systemDisk: 80, dataDisk: 100 },
      { id: 6, typeId: 2, environmentId: 2, name: '配置A-小型集群', nodeCount: 3, cpu: 2, memory: 4, diskType: '超高IO', systemDisk: 80, dataDisk: 100 }
    ]
  } catch (error) {
    ElMessage.error('加载配置数据失败')
  }
}

// 类型变更处理
const handleTypeChange = () => {
  selectedEnvironment.value = null
  selectedConfig.value = null
  selectedDescription.value = null
  emitChange()
}

// 环境变更处理
const handleEnvironmentChange = () => {
  selectedConfig.value = null
  selectedDescription.value = null
  emitChange()
}

// 配置变更处理
const handleConfigChange = async () => {
  if (selectedConfig.value) {
    // 模拟加载详细说明
    await new Promise(resolve => setTimeout(resolve, 200))

    selectedDescription.value = {
      architectureType: '单节点',
      performanceConcurrent: '50-80',
      performanceThroughput: '800-2,000',
      performanceResponse: '<100ms',
      scenarioUsage: '开发测试环境',
      scenarioUserScale: '日活<3,000',
      recommendationLevel: '一般',
      technicalNotes: '云环境，适合开发测试使用',
      priceLevel: '中等'
    }
  } else {
    selectedDescription.value = null
  }

  emitChange()
}

// 发出变更事件
const emitChange = () => {
  const result = {
    typeId: selectedType.value,
    environmentId: selectedEnvironment.value,
    configId: selectedConfig.value,
    configDetail: selectedConfigDetail.value,
    description: selectedDescription.value
  }
  emit('update:modelValue', result)
  emit('change', result)
}

// 从外部设置值
const setValue = (value) => {
  if (value.typeId) selectedType.value = value.typeId
  if (value.environmentId) selectedEnvironment.value = value.environmentId
  if (value.configId) {
    selectedConfig.value = value.configId
    handleConfigChange()
  }
}

// 监听props变化
watch(() => props.modelValue, (newValue) => {
  if (newValue && Object.keys(newValue).length > 0) {
    setValue(newValue)
  }
}, { immediate: true })

onMounted(() => {
  loadConfigData()
})

// 暴露方法给父组件
defineExpose({
  setValue,
  reset: () => {
    selectedType.value = null
    selectedEnvironment.value = null
    selectedConfig.value = null
    selectedDescription.value = null
    emitChange()
  }
})
</script>

<style scoped>
.config-selector {
  width: 100%;
}

.config-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.config-preview {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}

.detail-preview {
  margin-top: 10px;
}

.description-content {
  padding: 10px 0;
}

.technical-notes {
  margin-top: 15px;
}

.technical-notes p {
  color: #606266;
  line-height: 1.6;
}
</style>
