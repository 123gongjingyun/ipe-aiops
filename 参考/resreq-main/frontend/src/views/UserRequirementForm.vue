<template>
  <div class="user-requirement-form">
    <div class="content-container">
      <el-card class="form-card">
        <template #header>
          <div class="card-header">
            <span>{{ isEdit ? '编辑需求单' : '新建需求单' }}</span>
          </div>
        </template>

        <el-form
          :model="form"
          :rules="formRules"
          ref="formRef"
          label-position="top"
          v-loading="loading"
        >
          <el-form-item label="需求单标题" prop="title">
            <el-input
              v-model="form.title"
              placeholder="请输入需求单标题"
              maxlength="200"
              show-word-limit
            />
          </el-form-item>

          <div v-if="categoryTree.length === 0 && !loading" class="empty-categories">
            <el-empty description="暂无需求分类，请联系管理员配置" />
          </div>

          <div v-for="big in categoryTree" :key="big.id" class="big-category">
            <div class="big-title">{{ big.name }}</div>

            <div
              v-for="sub in big.children"
              :key="sub.id"
              class="sub-category"
            >
              <div class="sub-title">{{ sub.name }}</div>

              <div class="questions">
                <el-form-item
                  v-for="question in sub.children"
                  :key="question.id"
                  :label="question.name"
                  class="question-item"
                >
                  <template v-if="question.description" #label>
                    <div class="question-label">
                      <span>{{ question.name }}</span>
                    </div>
                  </template>

                  <el-input
                    v-model="answersMap[question.id]"
                    type="textarea"
                    :rows="3"
                    :placeholder="question.reference || '请输入答案'"
                  />

                  <div v-if="question.description" class="question-description">
                    {{ question.description }}
                  </div>
                </el-form-item>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <el-button @click="goBack">返回</el-button>
            <el-button type="primary" :loading="saving" @click="submitForm">
              {{ isEdit ? '保存修改' : '创建需求单' }}
            </el-button>
          </div>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  createUserRequirement,
  updateUserRequirement,
  getUserRequirementById
} from '@/api/userRequirement'
import { getRequirementCategories } from '@/api/requirementCategory'

const route = useRoute()
const router = useRouter()

const formRef = ref(null)
const loading = ref(false)
const saving = ref(false)
const categoryTree = ref([])
const answersMap = ref({})

const isEdit = computed(() => !!route.params.id)
const requirementId = computed(() => Number(route.params.id) || null)

const form = reactive({
  title: ''
})

const formRules = {
  title: [
    { required: true, message: '请输入需求单标题', trigger: 'blur' },
    { max: 200, message: '标题最多200个字符', trigger: 'blur' }
  ]
}

const loadCategories = async () => {
  try {
    const data = await getRequirementCategories()
    categoryTree.value = Array.isArray(data) ? data : (data.categories || [])
    initAnswersMap(categoryTree.value)
  } catch (error) {
    console.error('加载需求分类失败:', error)
    ElMessage.error('加载需求分类失败')
  }
}

const initAnswersMap = (nodes) => {
  nodes.forEach((node) => {
    if (node.level === 3) {
      if (answersMap.value[node.id] === undefined) {
        answersMap.value[node.id] = ''
      }
    }
    if (node.children && node.children.length > 0) {
      initAnswersMap(node.children)
    }
  })
}

const loadDetail = async () => {
  if (!requirementId.value) return

  try {
    const response = await getUserRequirementById(requirementId.value)
    const requirement = response.requirement

    if (requirement) {
      form.title = requirement.title || ''
      ;(requirement.answers || []).forEach((answer) => {
        answersMap.value[answer.category_id] = answer.answer_text || ''
      })
    }
  } catch (error) {
    console.error('加载需求单详情失败:', error)
    ElMessage.error('加载需求单详情失败')
  }
}

const collectAnswers = () => {
  const answers = []

  const walk = (nodes) => {
    nodes.forEach((node) => {
      if (node.level === 3) {
        answers.push({
          category_id: node.id,
          answer_text: answersMap.value[node.id] || ''
        })
      }
      if (node.children && node.children.length > 0) {
        walk(node.children)
      }
    })
  }

  walk(categoryTree.value)
  return answers
}

const submitForm = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    saving.value = true
    const payload = {
      title: form.title,
      answers: collectAnswers()
    }

    if (isEdit.value) {
      await updateUserRequirement(requirementId.value, payload)
      ElMessage.success('需求单更新成功')
    } else {
      await createUserRequirement(payload)
      ElMessage.success('需求单创建成功')
    }

    router.push('/user-requirement')
  } catch (error) {
    console.error('保存需求单失败:', error)
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      ElMessage.error('保存需求单失败')
    }
  } finally {
    saving.value = false
  }
}

const goBack = () => {
  router.push('/user-requirement')
}

onMounted(async () => {
  loading.value = true
  await loadCategories()
  if (isEdit.value) {
    await loadDetail()
  }
  loading.value = false
})
</script>

<style scoped>
.user-requirement-form {
  padding: 20px;
  background: #f0f2f5;
  min-height: 100vh;
}

.content-container {
  max-width: 1000px;
  margin: 0 auto;
}

.form-card {
  background: #fff;
}

.card-header {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.big-category {
  margin-bottom: 24px;
}

.big-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.sub-category {
  margin-bottom: 20px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.sub-title {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 12px;
}

.questions {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.question-item {
  margin-bottom: 0;
}

.question-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.question-description {
  color: #909399;
  font-size: 12px;
  line-height: 1.5;
  margin-top: 6px;
}

.info-icon {
  color: #909399;
  cursor: help;
}

.reference-hint {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
  line-height: 1.5;
}

.empty-categories {
  margin: 20px 0;
}

.form-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
}

@media (min-width: 768px) {
  .questions {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
