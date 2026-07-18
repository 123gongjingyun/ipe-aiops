<template>
  <div class="user-requirement">
    <div class="content-container">
      <el-card class="list-card">
        <div class="list-header">
          <h3>用户需求单列表</h3>
          <div class="search-filters">
            <el-input
              v-model="searchQuery"
              placeholder="搜索标题"
              clearable
              style="width: 240px; margin-right: 10px"
              @keyup.enter="loadRequirements"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button type="primary" @click="loadRequirements">搜索</el-button>
            <el-button
              type="success"
              @click="goCreate"
              style="margin-left: 10px"
            >
              <el-icon><Plus /></el-icon>
              新建需求单
            </el-button>
          </div>
        </div>

        <div class="requirements-list" v-loading="loading">
          <el-empty v-if="requirements.length === 0 && !loading" description="暂无需求单记录" />

          <el-table :data="requirements" border stripe style="width: 100%" v-else>
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
            <el-table-column prop="applicant_name" label="申请人" width="120" align="center" />
            <el-table-column prop="status" label="状态" width="100" align="center">
              <template #default="scope">
                <el-tag :type="getStatusType(scope.row.status)" size="small">
                  {{ getStatusText(scope.row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="创建时间" width="160" align="center">
              <template #default="scope">
                {{ formatDateTime(scope.row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="300" align="center" fixed="right">
              <template #default="scope">
                <el-button
                  type="success"
                  size="small"
                  :icon="View"
                  @click="openDetail(scope.row.id)"
                >
                  查看
                </el-button>
                <el-button
                  type="primary"
                  size="small"
                  :icon="Edit"
                  @click="goEdit(scope.row.id)"
                >
                  编辑
                </el-button>
                <el-button
                  type="danger"
                  size="small"
                  :icon="Delete"
                  @click="handleDelete(scope.row.id)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadRequirements"
            @current-change="loadRequirements"
            style="margin-top: 20px; justify-content: center"
          />
        </div>
      </el-card>
    </div>

    <UserRequirementDetail
      v-model="detailVisible"
      :requirement-id="detailId"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, View, Edit, Delete } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import {
  getUserRequirements,
  deleteUserRequirement
} from '@/api/userRequirement'
import UserRequirementDetail from './UserRequirementDetail.vue'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const requirements = ref([])
const searchQuery = ref('')
const detailVisible = ref(false)
const detailId = ref(null)

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const loadRequirements = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      search: searchQuery.value || undefined
    }

    const response = await getUserRequirements(params)
    requirements.value = response.list || []
    pagination.total = response.pagination?.total || 0
  } catch (error) {
    console.error('加载需求单列表失败:', error)
    ElMessage.error('加载需求单列表失败')
  } finally {
    loading.value = false
  }
}

const goCreate = () => {
  router.push('/user-requirement/create')
}

const goEdit = (id) => {
  router.push(`/user-requirement/edit/${id}`)
}

const openDetail = (id) => {
  detailId.value = id
  detailVisible.value = true
}

const handleDelete = async (id) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除此需求单吗？此操作不可恢复！',
      '删除需求单',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await deleteUserRequirement(id)
    ElMessage.success('删除成功')
    await loadRequirements()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除需求单失败:', error)
      ElMessage.error('删除失败: ' + (error.message || '未知错误'))
    }
  }
}

const getStatusType = (status) => {
  const types = {
    draft: 'warning',
    submitted: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    draft: '已提交',
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

onMounted(async () => {
  if (!userStore.user) {
    userStore.loadUserFromStorage()
  }
  await loadRequirements()
})
</script>

<style scoped>
.user-requirement {
  padding: 20px;
  background: #f0f2f5;
  min-height: 100vh;
}

.content-container {
  max-width: 1400px;
  margin: 0 auto;
}

.list-card {
  background: #fff;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
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

.requirements-list {
  min-height: 200px;
}

@media (max-width: 768px) {
  .search-filters {
    width: 100%;
  }

  .search-filters .el-input {
    width: 100% !important;
    margin-bottom: 10px;
  }
}
</style>
