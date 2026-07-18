<template>
  <el-dialog
    v-model="visible"
    title="需求单详情"
    width="720px"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <div v-loading="loading" class="detail-content">
      <template v-if="requirement">
        <el-descriptions :column="2" border class="detail-header">
          <el-descriptions-item label="标题" :span="2">{{ requirement.title }}</el-descriptions-item>
          <el-descriptions-item label="申请人">{{ requirement.applicant_name }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(requirement.status)" size="small">
              {{ getStatusText(requirement.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(requirement.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDateTime(requirement.updated_at) }}</el-descriptions-item>
        </el-descriptions>

        <div v-if="groupedAnswers.length === 0" class="empty-answers">
          <el-empty description="暂无分类答案" />
        </div>

        <el-collapse v-else v-model="activeNames">
          <el-collapse-item
            v-for="big in groupedAnswers"
            :key="big.id"
            :title="big.name"
            :name="String(big.id)"
          >
            <div
              v-for="sub in big.children"
              :key="sub.id"
              class="sub-category-block"
            >
              <div class="sub-title">{{ sub.name }}</div>
              <el-descriptions :column="1" border>
                <el-descriptions-item
                  v-for="qa in sub.questions"
                  :key="qa.id"
                  :label="qa.name"
                >
                  <div class="answer-text">{{ qa.answer || '-' }}</div>
                  <div v-if="qa.description" class="reference-text">{{ qa.description }}</div>
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </el-collapse-item>
        </el-collapse>
      </template>
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getUserRequirementById } from '@/api/userRequirement'
import { getRequirementCategories } from '@/api/requirementCategory'

const props = defineProps({
  requirementId: {
    type: Number,
    default: null
  },
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const loading = ref(false)
const requirement = ref(null)
const categoryTree = ref([])
const activeNames = ref([])
const categoryMap = ref(new Map())

const groupedAnswers = computed(() => {
  if (!requirement.value || !categoryTree.value.length) return []

  const answersMap = new Map()
  ;(requirement.value.answers || []).forEach((answer) => {
    answersMap.set(answer.category_id, answer.answer_text)
  })

  const result = []
  categoryTree.value.forEach((big) => {
    const bigNode = {
      id: big.id,
      name: big.name,
      children: []
    }

    ;(big.children || []).forEach((sub) => {
      const subNode = {
        id: sub.id,
        name: sub.name,
        questions: []
      }

      ;(sub.children || []).forEach((question) => {
        subNode.questions.push({
          id: question.id,
          name: question.name,
          description: question.description,
          reference: question.reference,
          answer: answersMap.get(question.id)
        })
      })

      if (subNode.questions.length > 0) {
        bigNode.children.push(subNode)
      }
    })

    if (bigNode.children.length > 0) {
      result.push(bigNode)
    }
  })

  return result
})

const loadDetail = async () => {
  if (!props.requirementId) return

  try {
    loading.value = true
    const [detailRes, treeRes] = await Promise.all([
      getUserRequirementById(props.requirementId),
      getRequirementCategories()
    ])

    requirement.value = detailRes.requirement || null
    categoryTree.value = Array.isArray(treeRes) ? treeRes : (treeRes.categories || [])

    buildCategoryMap(categoryTree.value)

    // 默认展开所有一级分类
    activeNames.value = groupedAnswers.value.map((item) => String(item.id))
  } catch (error) {
    console.error('加载需求单详情失败:', error)
    ElMessage.error('加载需求单详情失败')
  } finally {
    loading.value = false
  }
}

const buildCategoryMap = (nodes, parentChain = []) => {
  nodes.forEach((node) => {
    categoryMap.value.set(node.id, [...parentChain, node])
    if (node.children && node.children.length > 0) {
      buildCategoryMap(node.children, [...parentChain, node])
    }
  })
}

const getStatusType = (status) => {
  const types = {
    draft: 'info',
    submitted: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    draft: '草稿',
    submitted: '已提交',
    approved: '已通过',
    rejected: '已拒绝'
  }
  return texts[status] || status
}

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

watch(() => [props.modelValue, props.requirementId], ([newVisible]) => {
  if (newVisible && props.requirementId) {
    loadDetail()
  }
})
</script>

<style scoped>
.detail-content {
  min-height: 120px;
}

.detail-header {
  margin-bottom: 20px;
}

.sub-category-block {
  margin-bottom: 16px;
}

.sub-category-block:last-child {
  margin-bottom: 0;
}

.sub-title {
  font-weight: 500;
  color: #303133;
  margin-bottom: 8px;
  padding-left: 8px;
  border-left: 3px solid #409eff;
}

.answer-text {
  color: #606266;
  white-space: pre-wrap;
  word-break: break-word;
}

.reference-text {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
}

.empty-answers {
  margin-top: 20px;
}
</style>
