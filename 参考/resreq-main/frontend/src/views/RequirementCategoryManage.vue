<template>
  <div class="requirement-category-manage">
    <div class="content-container">
      <el-card class="list-card">
        <template #header>
          <div class="card-header">
            <span>需求分类管理</span>
            <el-button type="primary" size="small" @click="openCreateRoot">
              <el-icon><Plus /></el-icon>
              新增一级分类
            </el-button>
          </div>
        </template>

        <div v-loading="loading" class="tree-wrapper">
          <el-empty v-if="treeData.length === 0 && !loading" description="暂无分类数据" />

          <el-tree
            v-else
            :data="treeData"
            node-key="id"
            default-expand-all
            :expand-on-click-node="false"
            :props="{ label: 'name', children: 'children' }"
          >
            <template #default="{ node, data }">
              <div class="custom-tree-node">
                <div class="node-info">
                  <span class="node-name">{{ data.name }}</span>
                  <el-tag size="small" :type="getLevelType(data.level)" class="level-tag">
                    {{ getLevelText(data.level) }}
                  </el-tag>
                </div>
                <div class="node-actions">
                  <el-button
                    v-if="data.level < 3"
                    type="primary"
                    link
                    size="small"
                    @click="openAddChild(data)"
                  >
                    添加子类
                  </el-button>
                  <el-button
                    type="primary"
                    link
                    size="small"
                    @click="openEdit(data)"
                  >
                    编辑
                  </el-button>
                  <el-button
                    type="danger"
                    link
                    size="small"
                    @click="handleDelete(data)"
                  >
                    删除
                  </el-button>
                </div>
              </div>
            </template>
          </el-tree>
        </div>
      </el-card>
    </div>

    <!-- 分类表单弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑分类' : '新增分类'"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form
        :model="form"
        :rules="formRules"
        ref="formRef"
        label-width="100px"
      >
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入分类名称" maxlength="100" show-word-limit />
        </el-form-item>

        <el-form-item label="所属层级" prop="level">
          <el-select
            v-model="form.level"
            placeholder="请选择层级"
            style="width: 100%"
            :disabled="isEdit && form.level === 1"
          >
            <el-option label="一级（大类）" :value="1" />
            <el-option label="二级（子类）" :value="2" />
            <el-option label="三级（问题）" :value="3" />
          </el-select>
        </el-form-item>

        <el-form-item label="父级分类" prop="parent_id"
          v-if="form.level > 1"
        >
          <el-tree-select
            v-model="form.parent_id"
            :data="treeData"
            :props="{ label: 'name', value: 'id', children: 'children' }"
            :disabled="isEdit && form.level === 1"
            check-strictly
            clearable
            placeholder="请选择父级分类"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="排序">
          <el-input-number v-model="form.sort_order" :min="0" style="width: 100%" />
        </el-form-item>

        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入分类描述"
          />
        </el-form-item>

        <el-form-item label="参考内容">
          <el-input
            v-model="form.reference"
            type="textarea"
            :rows="3"
            placeholder="请输入参考内容（如填写示例）"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  getRequirementCategories,
  createRequirementCategory,
  updateRequirementCategory,
  deleteRequirementCategory
} from '@/api/requirementCategory'

const loading = ref(false)
const submitting = ref(false)
const treeData = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const currentId = ref(null)
const formRef = ref(null)

const defaultForm = {
  parent_id: null,
  name: '',
  level: 1,
  sort_order: 0,
  description: '',
  reference: ''
}

const form = reactive({ ...defaultForm })

const parentName = computed(() => {
  if (!form.parent_id) return '无（作为一级分类）'
  const parent = findNodeById(treeData.value, form.parent_id)
  return parent ? parent.name : ''
})

const formRules = {
  name: [
    { required: true, message: '请输入分类名称', trigger: 'blur' },
    { max: 100, message: '分类名称最多100个字符', trigger: 'blur' }
  ],
  level: [
    { required: true, message: '请选择分类层级', trigger: 'change' }
  ]
}

const loadTree = async () => {
  try {
    loading.value = true
    const data = await getRequirementCategories()
    treeData.value = Array.isArray(data) ? data : (data.categories || [])
  } catch (error) {
    console.error('加载分类树失败:', error)
    ElMessage.error('加载分类树失败')
  } finally {
    loading.value = false
  }
}

const findNodeById = (nodes, id) => {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children && node.children.length > 0) {
      const found = findNodeById(node.children, id)
      if (found) return found
    }
  }
  return null
}

const resetForm = () => {
  Object.assign(form, { ...defaultForm })
  currentId.value = null
  isEdit.value = false
  formRef.value?.resetFields()
}

const openCreateRoot = () => {
  resetForm()
  dialogVisible.value = true
}

const openAddChild = (parentNode) => {
  resetForm()
  form.parent_id = parentNode.id
  form.level = parentNode.level + 1
  dialogVisible.value = true
}

const openEdit = (node) => {
  resetForm()
  isEdit.value = true
  currentId.value = node.id
  Object.assign(form, {
    parent_id: node.parent_id || null,
    name: node.name,
    level: node.level,
    sort_order: node.sort_order !== undefined ? node.sort_order : 0,
    description: node.description || '',
    reference: node.reference || ''
  })
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    submitting.value = true

    const payload = {
      name: form.name,
      level: form.level,
      sort_order: form.sort_order,
      description: form.description,
      reference: form.reference,
      parent_id: form.parent_id || null
    }

    if (!isEdit.value) {
      await createRequirementCategory(payload)
      ElMessage.success('分类创建成功')
    } else {
      await updateRequirementCategory(currentId.value, payload)
      ElMessage.success('分类更新成功')
    }

    dialogVisible.value = false
    await loadTree()
  } catch (error) {
    console.error('保存分类失败:', error)
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      ElMessage.error('保存分类失败')
    }
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (node) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除分类 "${node.name}" 吗？删除后该分类将不再显示。`,
      '删除分类',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await deleteRequirementCategory(node.id)
    ElMessage.success('删除成功')
    await loadTree()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除分类失败:', error)
      ElMessage.error('删除失败: ' + (error.message || '未知错误'))
    }
  }
}

const getLevelType = (level) => {
  const types = { 1: 'primary', 2: 'success', 3: 'warning' }
  return types[level] || 'info'
}

const getLevelText = (level) => {
  const texts = { 1: '一级', 2: '二级', 3: '三级' }
  return texts[level] || `Level ${level}`
}

onMounted(() => {
  loadTree()
})
</script>

<style scoped>
.requirement-category-manage {
  padding: 20px;
  background: #f0f2f5;
  min-height: 100vh;
}

.content-container {
  max-width: 1000px;
  margin: 0 auto;
}

.list-card {
  background: #fff;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tree-wrapper {
  min-height: 200px;
}

.custom-tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 8px;
}

.node-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.node-name {
  font-size: 14px;
  color: #303133;
}

.level-tag {
  flex-shrink: 0;
}

.node-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

@media (max-width: 768px) {
  .custom-tree-node {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .node-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
