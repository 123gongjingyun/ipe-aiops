<template>
  <div class="dashboard">
    <!-- 统计概览 -->
    <div class="stats-bar">
      <div class="stat-item" v-if="stats.userRequirement > 0">
        <span class="stat-label">用户需求：</span>
        <span class="stat-value">{{ stats.userRequirement }}</span>
      </div>
      <div class="stat-item" v-if="stats.container > 0">
        <span class="stat-label">容器申请：</span>
        <span class="stat-value">{{ stats.container }}</span>
      </div>
      <div class="stat-item" v-if="stats.vm > 0">
        <span class="stat-label">虚拟机申请：</span>
        <span class="stat-value">{{ stats.vm }}</span>
      </div>
      <div class="stat-item" v-if="stats.obs > 0">
        <span class="stat-label">OBS申请：</span>
        <span class="stat-value">{{ stats.obs }}</span>
      </div>
      <div class="stat-item" v-if="stats.sfs > 0">
        <span class="stat-label">SFS申请：</span>
        <span class="stat-value">{{ stats.sfs }}</span>
      </div>
      <div class="stat-item" v-if="stats.permission > 0">
        <span class="stat-label">用户权限申请：</span>
        <span class="stat-value">{{ stats.permission }}</span>
      </div>
      <div class="stat-item" v-if="stats.networkPolicy > 0">
        <span class="stat-label">网络需求：</span>
        <span class="stat-value">{{ stats.networkPolicy }}</span>
      </div>
      <div class="stat-item" v-if="totalRequests > 0">
        <span class="stat-label">总计：</span>
        <span class="stat-value">{{ totalRequests }}</span>
      </div>
      <div class="export-button" v-if="totalRequests > 0">
        <el-button type="primary" :icon="Download" @click="exportAllToExcel" size="default">
          导出Excel
        </el-button>
      </div>
    </div>

    <!-- 标签页 -->
    <el-tabs v-model="activeTab" type="card" @tab-change="handleTabChange">
      <!-- 用户需求 -->
      <el-tab-pane v-if="userRequirementRequests.length > 0" label="用户需求" name="userRequirement">
        <div class="tab-content">
          <div class="search-bar">
            <el-input
              v-model="searchText.userRequirement"
              placeholder="搜索标题"
              clearable
              style="width: 300px"
              @input="handleSearch('userRequirement')"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button @click="loadUserRequirementRequests">刷新</el-button>
          </div>

          <el-table :data="filteredUserRequirementRequests" border stripe style="width: 100%">
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
            <el-table-column label="操作" width="200" align="center" fixed="right">
              <template #default="scope">
                <el-button type="success" size="small" @click="viewUserRequirement(scope.row.id)">查看</el-button>
                <el-button type="primary" size="small" @click="editUserRequirement(scope.row.id)">编辑</el-button>
                <el-button type="danger" size="small" @click="deleteUserRequirementRow(scope.row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-model:current-page="paginationUserRequirement.page"
            v-model:page-size="paginationUserRequirement.pageSize"
            :page-sizes="[10, 20, 50]"
            :total="paginationUserRequirement.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadUserRequirementRequests"
            @current-change="loadUserRequirementRequests"
            style="margin-top: 20px; justify-content: center"
          />
        </div>
      </el-tab-pane>

      <!-- 容器申请 -->
      <el-tab-pane v-if="containerRequests.length > 0" label="容器申请" name="container">
        <div class="tab-content">
          <div class="search-bar">
            <el-input
              v-model="searchText.container"
              placeholder="搜索系统代码或应用英文名"
              clearable
              style="width: 300px"
              @input="handleSearch('container')"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button @click="loadContainerRequests">刷新</el-button>
          </div>

          <el-table :data="filteredContainerRequests" border stripe style="width: 100%">
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="system_code" label="系统代码" width="110" align="center" />
            <el-table-column prop="supplier" label="供应商" width="100" align="center" show-overflow-tooltip />
            <el-table-column prop="app_english_name" label="应用英文名" width="130" align="center" show-overflow-tooltip />
            <el-table-column prop="app_description" label="应用描述" width="150" align="center" show-overflow-tooltip />
            <el-table-column prop="instance_count" label="实例数" width="70" align="center" />
            <el-table-column prop="cpu_per_instance" label="单CPU" width="70" align="center" />
            <el-table-column prop="memory_per_instance_gb" label="单内存" width="70" align="center" />
            <el-table-column prop="total_cpu" label="总CPU" width="70" align="center" />
            <el-table-column prop="total_memory_gb" label="总内存" width="70" align="center" />
            <el-table-column prop="environment_name" label="环境" width="80" align="center" />
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
                <el-button type="success" size="small" @click="viewContainerRequest(scope.row)">
                  查看
                </el-button>
                <el-button type="primary" size="small" @click="editContainerRequest(scope.row)">
                  编辑
                </el-button>
                <el-button type="danger" size="small" @click="deleteContainerRequestRow(scope.row)">
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
      </el-tab-pane>

      <!-- 虚拟机申请 -->
      <el-tab-pane v-if="vmRequests.length > 0" label="虚拟机申请" name="vm">
        <div class="tab-content">
          <div class="search-bar">
            <el-input
              v-model="searchText.vm"
              placeholder="搜索系统编号或系统名称"
              clearable
              style="width: 300px"
              @input="handleSearch('vm')"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button @click="loadVMRequests">刷新</el-button>
          </div>

          <el-table :data="filteredVMRequests" border stripe style="width: 100%">
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="system_code" label="系统编号" width="100" align="center" />
            <el-table-column prop="system_name" label="系统名称" width="120" align="center" show-overflow-tooltip />
            <el-table-column prop="module_name" label="模块名称" width="130" align="center" show-overflow-tooltip />
            <el-table-column prop="owner" label="担当" width="90" align="center" />
            <el-table-column prop="type" label="类型" width="80" align="center" />
            <el-table-column prop="environment" label="环境" width="80" align="center" />
            <el-table-column prop="config_option" label="配置选项" width="100" align="center" />
            <el-table-column prop="node_count" label="节点数" width="70" align="center" />
            <el-table-column prop="cpu" label="CPU" width="60" align="center" />
            <el-table-column prop="memory" label="内存" width="60" align="center" />
            <el-table-column label="资源配置" width="120" align="center">
              <template #default="scope">
                {{ scope.row.system_disk }}GB + {{ scope.row.data_disk }}GB
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
            <el-table-column label="操作" width="250" align="center" fixed="right">
              <template #default="scope">
                <el-button type="success" size="small" @click="handleView(scope.row)">
                  查看
                </el-button>
                <el-button type="primary" size="small" @click="handleEdit(scope.row)">
                  编辑
                </el-button>
                <el-button
                  type="danger"
                  size="small"
                  @click="handleDelete(scope.row)"
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
      </el-tab-pane>

      <!-- OBS申请 -->
      <el-tab-pane v-if="obsRequests.length > 0" label="OBS申请" name="obs">
        <div class="tab-content">
          <div class="search-bar">
            <el-input
              v-model="searchText.obs"
              placeholder="搜索系统名称或桶名称"
              clearable
              style="width: 300px"
              @input="handleSearch('obs')"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button @click="loadObsRequests">刷新</el-button>
          </div>

          <el-table :data="filteredObsRequests" border stripe style="width: 100%">
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="system_name" label="系统名称" width="120" align="center" />
            <el-table-column prop="bucket_name" label="桶名称" width="150" align="center" show-overflow-tooltip />
            <el-table-column prop="business_name" label="应用所属业务" width="100" align="center" />
            <el-table-column prop="capacity_size_gb" label="容量(GB)" width="90" align="center" />
            <el-table-column prop="ak_sk_count" label="AK/SK数量" width="90" align="center" />
            <el-table-column prop="usage_duration" label="使用时间" width="80" align="center" />
            <el-table-column prop="environment_name" label="环境" width="80" align="center" />
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
                <el-button type="success" size="small" @click="viewObsRequest(scope.row)">
                  查看
                </el-button>
                <el-button type="primary" size="small" @click="editObsRequest(scope.row)">
                  编辑
                </el-button>
                <el-button type="danger" size="small" @click="deleteObsRequestRow(scope.row)">
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
      </el-tab-pane>

      <!-- SFS申请 -->
      <el-tab-pane v-if="sfsRequests.length > 0" label="SFS申请" name="sfs">
        <div class="tab-content">
          <div class="search-bar">
            <el-input
              v-model="searchText.sfs"
              placeholder="搜索系统名称或SFS名称"
              clearable
              style="width: 300px"
              @input="handleSearch('sfs')"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button @click="loadSfsRequests">刷新</el-button>
          </div>

          <el-table :data="filteredSfsRequests" border stripe style="width: 100%">
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="system_name" label="系统名称" width="120" align="center" />
            <el-table-column prop="sfs_name" label="SFS名称" width="150" align="center" show-overflow-tooltip />
            <el-table-column prop="business_name" label="应用所属业务" width="100" align="center" />
            <el-table-column prop="capacity_size_gb" label="容量(GB)" width="90" align="center" />
            <el-table-column prop="usage_duration" label="使用时间" width="80" align="center" />
            <el-table-column prop="environment_name" label="环境" width="80" align="center" />
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
                <el-button type="success" size="small" @click="viewSfsRequest(scope.row)">
                  查看
                </el-button>
                <el-button type="primary" size="small" @click="editSfsRequest(scope.row)">
                  编辑
                </el-button>
                <el-button type="danger" size="small" @click="deleteSfsRequestRow(scope.row)">
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
      </el-tab-pane>

      <!-- 用户权限申请 -->
      <el-tab-pane v-if="permissionRequests.length > 0" label="用户权限申请" name="permission">
        <div class="tab-content">
          <div class="search-bar">
            <el-input
              v-model="searchText.permission"
              placeholder="搜索域账号或姓名"
              clearable
              style="width: 300px"
              @input="handleSearch('permission')"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button @click="loadPermissionRequests">刷新</el-button>
          </div>

          <el-table :data="filteredPermissionRequests" border stripe style="width: 100%">
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="domain_account" label="域账号" width="120" align="center" />
            <el-table-column prop="name" label="姓名" width="100" align="center" />
            <el-table-column prop="phone" label="手机号码" width="120" align="center" />
            <el-table-column prop="email" label="邮箱" width="150" align="center" show-overflow-tooltip />
            <el-table-column label="申请权限" width="300" align="center">
              <template #default="scope">
                <el-tag
                  v-for="perm in getPermissionLabels(scope.row.permissions)"
                  :key="perm"
                  size="small"
                  style="margin: 2px;"
                >
                  {{ perm }}
                </el-tag>
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
                <el-button type="success" size="small" @click="viewPermissionRequest(scope.row)">
                  查看
                </el-button>
                <el-button type="primary" size="small" @click="editPermissionRequest(scope.row)">
                  编辑
                </el-button>
                <el-button size="small" type="danger" @click="deletePermissionRequest(scope.row)">
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
      </el-tab-pane>

      <!-- 网络需求 -->
      <el-tab-pane v-if="networkPolicyRequests.length > 0" label="网络需求" name="networkPolicy">
        <div class="tab-content">
          <div class="search-bar">
            <el-input
              v-model="searchText.networkPolicy"
              placeholder="搜索源资产编号或目标地址"
              clearable
              style="width: 300px"
              @input="handleSearch('networkPolicy')"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button @click="loadNetworkPolicies">刷新</el-button>
          </div>

          <el-table :data="filteredNetworkPolicyRequests" border stripe style="width: 100%">
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="environment" label="环境" width="80" align="center" />
            <el-table-column prop="source_asset_code" label="源资产编号" width="110" align="center" />
            <el-table-column prop="source_address" label="源地址" width="120" align="center" show-overflow-tooltip />
            <el-table-column prop="target_asset" label="目标资产" width="120" align="center" show-overflow-tooltip />
            <el-table-column prop="target_address" label="目标地址" width="120" align="center" show-overflow-tooltip />
            <el-table-column prop="system_name" label="所属系统" width="120" align="center" show-overflow-tooltip />
            <el-table-column prop="port_type" label="端口类型" width="80" align="center" />
            <el-table-column prop="port" label="端口" width="100" align="center" />
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
                <el-button type="success" size="small" @click="viewNetworkPolicy(scope.row)">
                  查看
                </el-button>
                <el-button type="primary" size="small" @click="editNetworkPolicy(scope.row)">
                  编辑
                </el-button>
                <el-button size="small" type="danger" @click="deleteNetworkPolicy(scope.row)">
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
      </el-tab-pane>
    </el-tabs>

    <UserRequirementDetail
      v-model="detailVisible"
      :requirement-id="detailId"
    />

    <!-- 用户需求详情组件 -->
    <UserRequirementDetail
      v-model="detailVisible"
      :requirement-id="detailId"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Download } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { getMyVMRequests, getAllVMRequestsList } from '@/api/vmRequest'
import { getMyContainerRequests, getAllContainerRequests, deleteContainerRequest } from '@/api/container'
import { getMyObsRequests, getAllObsRequests, deleteObsRequest } from '@/api/obs'
import { getMySfsRequests, getAllSfsRequests, deleteSfsRequest } from '@/api/sfs'
import {
  getMyPermissionRequests,
  getAllPermissionRequests,
  deletePermissionRequest as deletePermissionRequestAPI
} from '@/api/permission'
import {
  getMyNetworkPolicies,
  getAllNetworkPolicies,
  deleteNetworkPolicy as deleteNetworkPolicyAPI
} from '@/api/networkPolicy'
import {
  getUserRequirements,
  deleteUserRequirement as deleteUserRequirementAPI,
  exportUserRequirement
} from '@/api/userRequirement'
import UserRequirementDetail from './UserRequirementDetail.vue'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)

const activeTab = ref('')
const searchText = reactive({
  vm: '',
  container: '',
  obs: '',
  sfs: '',
  permission: '',
  networkPolicy: '',
  userRequirement: ''
})

// 各类型申请数据
const containerRequests = ref([])
const vmRequests = ref([])
const obsRequests = ref([])
const sfsRequests = ref([])
const permissionRequests = ref([])
const networkPolicyRequests = ref([])
const userRequirementRequests = ref([])

const paginationUserRequirement = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const detailVisible = ref(false)
const detailId = ref(null)

// 统计数据
const stats = reactive({
  container: 0,
  vm: 0,
  obs: 0,
  sfs: 0,
  permission: 0,
  networkPolicy: 0,
  userRequirement: 0
})

const totalRequests = computed(() => {
  return stats.container + stats.vm + stats.obs + stats.sfs + stats.permission + stats.networkPolicy + stats.userRequirement
})

// 过滤后的数据
const filteredContainerRequests = computed(() => {
  if (!searchText.container) return containerRequests.value
  const search = searchText.container.toLowerCase()
  return containerRequests.value.filter(req =>
    req.system_code?.toLowerCase().includes(search) ||
    req.app_english_name?.toLowerCase().includes(search)
  )
})

const filteredVMRequests = computed(() => {
  if (!searchText.vm) return vmRequests.value
  const search = searchText.vm.toLowerCase()
  return vmRequests.value.filter(req =>
    req.system_code?.toLowerCase().includes(search) ||
    req.system_name?.toLowerCase().includes(search)
  )
})

const filteredObsRequests = computed(() => {
  if (!searchText.obs) return obsRequests.value
  const search = searchText.obs.toLowerCase()
  return obsRequests.value.filter(req =>
    req.system_name?.toLowerCase().includes(search) ||
    req.bucket_name?.toLowerCase().includes(search)
  )
})

const filteredSfsRequests = computed(() => {
  if (!searchText.sfs) return sfsRequests.value
  const search = searchText.sfs.toLowerCase()
  return sfsRequests.value.filter(req =>
    req.system_name?.toLowerCase().includes(search) ||
    req.sfs_name?.toLowerCase().includes(search)
  )
})

const filteredPermissionRequests = computed(() => {
  if (!searchText.permission) return permissionRequests.value
  const search = searchText.permission.toLowerCase()
  return permissionRequests.value.filter(req =>
    req.domain_account?.toLowerCase().includes(search) ||
    req.name?.toLowerCase().includes(search)
  )
})

const filteredNetworkPolicyRequests = computed(() => {
  if (!searchText.networkPolicy) return networkPolicyRequests.value
  const search = searchText.networkPolicy.toLowerCase()
  return networkPolicyRequests.value.filter(req =>
    req.source_asset_code?.toLowerCase().includes(search) ||
    req.target_address?.toLowerCase().includes(search)
  )
})

const filteredUserRequirementRequests = computed(() => {
  if (!searchText.userRequirement) return userRequirementRequests.value
  const search = searchText.userRequirement.toLowerCase()
  return userRequirementRequests.value.filter(req =>
    req.title?.toLowerCase().includes(search)
  )
})

// 获取权限标签
const getPermissionLabels = (permissions) => {
  const labels = []
  const permissionNames = {
    iam: 'IAM权限',
    container: '容器平台',
    pipeline: '流水线',
    log: '日志平台',
    borui: '博睿平台',
    pam: 'PAM权限',
    gitlab: 'GitLab代码库',
    vpn_gitlab: 'VPN访问GitLab'
  }

  Object.keys(permissions).forEach(key => {
    if (permissions[key] === true && permissionNames[key]) {
      labels.push(permissionNames[key])
    }
  })

  return labels
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
    approved: '已批准',
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

// 字段名转中文标签
const formatLabel = (key) => {
  const labelMap = {
    id: 'ID',
    system_code: '系统编号',
    system_name: '系统名称',
    module_name: '模块名称',
    owner: '担当',
    type: '类型',
    environment: '环境',
    environment_name: '环境',
    environment_id: '环境ID',
    config_option: '配置选项',
    configOption: '配置选项',
    node_count: '节点数',
    cpu: 'CPU',
    memory: '内存',
    system_disk: '系统盘(GB)',
    data_disk: '数据盘(GB)',
    total_disk: '总磁盘(GB)',
    submitted_at: '提交时间',
    created_at: '创建时间',
    updated_at: '更新时间',
    applicant: '申请人',
    applicant_name: '申请人',
    applicant_id: '申请人ID',
    status: '状态',
    title: '标题',
    description: '描述',
    remarks: '备注',
    supplier: '供应商',
    app_english_name: '应用英文名',
    app_description: '应用描述',
    instance_count: '实例数',
    cpu_per_instance: '单实例CPU',
    memory_per_instance_gb: '单实例内存(GB)',
    total_cpu: '总CPU',
    total_memory_gb: '总内存(GB)',
    bucket_name: '桶名称',
    bucket_directory: '桶目录',
    capacity_size_gb: '容量(GB)',
    ak_sk_count: 'AK/SK数量',
    usage_duration: '使用时间',
    sfs_name: 'SFS名称',
    domain_account: '域账号',
    name: '姓名',
    phone: '手机号码',
    email: '邮箱',
    permissions: '申请权限',
    project_name: '项目名称',
    business_contact: '业务对接人',
    business_name: '应用所属业务',
    source_asset_code: '源资产编号',
    source_address: '源地址',
    target_asset: '目标资产',
    target_address: '目标地址',
    port_type: '端口类型',
    port: '端口',
    username: '用户名',
    real_name: '真实姓名',
    user_id: '用户ID',
    memory_gb: '内存(GB)',
    storage_gb: '存储(GB)',
    disk_size: '磁盘大小(GB)',
    cluster_name: '集群名称',
    namespace: '命名空间',
    applicant_username: '申请人用户名',
    applicant_real_name: '申请人真实姓名'
  }
  return labelMap[key] || key
}

// 搜索处理
const handleSearch = (type) => {
  // 搜索逻辑通过computed实现
}

// 标签页切换
const handleTabChange = (tabName) => {
  activeTab.value = tabName
}

// 加载虚拟机申请
const loadVMRequests = async () => {
  try {
    // 管理员查看所有申请，普通用户只查看自己的申请
    const response = userStore.isAdmin()
      ? await getAllVMRequestsList({ page: 1, pageSize: 1000 })
      : await getMyVMRequests({ page: 1, pageSize: 1000 })

    vmRequests.value = response.requests || []
    stats.vm = vmRequests.value.length
  } catch (error) {
    console.error('加载虚拟机申请失败:', error)
  }
}

// 加载容器申请
const loadContainerRequests = async () => {
  try {
    // 管理员查看所有申请，普通用户只查看自己的申请
    const response = userStore.isAdmin()
      ? await getAllContainerRequests({ page: 1, pageSize: 1000 })
      : await getMyContainerRequests({ page: 1, pageSize: 1000 })

    containerRequests.value = response.requests || []
    stats.container = containerRequests.value.length
  } catch (error) {
    console.error('加载容器申请失败:', error)
  }
}

// 加载OBS申请
const loadObsRequests = async () => {
  try {
    // 管理员查看所有申请，普通用户只查看自己的申请
    const response = userStore.isAdmin()
      ? await getAllObsRequests({ page: 1, pageSize: 1000 })
      : await getMyObsRequests({ page: 1, pageSize: 1000 })

    obsRequests.value = response.requests || []
    stats.obs = obsRequests.value.length
  } catch (error) {
    console.error('加载OBS申请失败:', error)
  }
}

// 加载SFS申请
const loadSfsRequests = async () => {
  try {
    // 管理员查看所有申请，普通用户只查看自己的申请
    const response = userStore.isAdmin()
      ? await getAllSfsRequests({ page: 1, pageSize: 1000 })
      : await getMySfsRequests({ page: 1, pageSize: 1000 })

    sfsRequests.value = response.requests || []
    stats.sfs = sfsRequests.value.length
  } catch (error) {
    console.error('加载SFS申请失败:', error)
  }
}

// 加载用户权限申请
const loadPermissionRequests = async () => {
  try {
    // 管理员查看所有申请，普通用户只查看自己的申请
    const response = userStore.isAdmin()
      ? await getAllPermissionRequests({ page: 1, pageSize: 1000 })
      : await getMyPermissionRequests({ page: 1, pageSize: 1000 })

    permissionRequests.value = response.requests || []
    stats.permission = permissionRequests.value.length
  } catch (error) {
    console.error('加载用户权限申请失败:', error)
  }
}

// 加载网络策略申请
const loadNetworkPolicies = async () => {
  try {
    // 管理员查看所有申请，普通用户只查看自己的申请
    const response = userStore.isAdmin()
      ? await getAllNetworkPolicies({ page: 1, pageSize: 1000 })
      : await getMyNetworkPolicies({ page: 1, pageSize: 1000 })

    networkPolicyRequests.value = response.policies || []
    stats.networkPolicy = networkPolicyRequests.value.length
  } catch (error) {
    console.error('加载网络策略申请失败:', error)
  }
}

// 加载用户需求
const loadUserRequirementRequests = async () => {
  try {
    const response = await getUserRequirements({
      page: paginationUserRequirement.page,
      pageSize: paginationUserRequirement.pageSize,
      search: searchText.userRequirement || undefined
    })

    userRequirementRequests.value = response.list || []
    paginationUserRequirement.total = response.pagination?.total || 0
    stats.userRequirement = paginationUserRequirement.total
  } catch (error) {
    console.error('加载用户需求失败:', error)
  }
}

// 编辑容器申请
const editContainerRequest = (request) => {
  router.push({
    path: '/container-request',
    query: { edit: true, id: request.id }
  })
}

// 查看容器申请
const viewContainerRequest = (request) => {
  router.push({
    path: '/container-request',
    query: { view: true, id: request.id }
  })
}

// 删除容器申请
const deleteContainerRequestRow = async (request) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除应用 "${request.app_english_name || request.system_code}" 的容器申请吗？此操作不可恢复！`,
      '删除容器申请',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await deleteContainerRequest(request.id)
    ElMessage.success('删除成功')
    await loadContainerRequests()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除容器申请失败:', error)
      ElMessage.error('删除失败: ' + (error.message || '未知错误'))
    }
  }
}

// 编辑OBS申请
const editObsRequest = (request) => {
  router.push({
    path: '/obs-request',
    query: { edit: true, id: request.id }
  })
}

// 查看OBS申请
const viewObsRequest = (request) => {
  router.push({
    path: '/obs-request',
    query: { view: true, id: request.id }
  })
}

// 删除OBS申请
const deleteObsRequestRow = async (request) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除系统 "${request.system_name || request.bucket_name}" 的OBS申请吗？此操作不可恢复！`,
      '删除OBS申请',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await deleteObsRequest(request.id)
    ElMessage.success('删除成功')
    await loadObsRequests()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除OBS申请失败:', error)
      ElMessage.error('删除失败: ' + (error.message || '未知错误'))
    }
  }
}

// 编辑SFS申请
const editSfsRequest = (request) => {
  router.push({
    path: '/sfs-request',
    query: { edit: true, id: request.id }
  })
}

// 查看SFS申请
const viewSfsRequest = (request) => {
  router.push({
    path: '/sfs-request',
    query: { view: true, id: request.id }
  })
}

// 删除SFS申请
const deleteSfsRequestRow = async (request) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除系统 "${request.system_name || request.sfs_name}" 的SFS申请吗？此操作不可恢复！`,
      '删除SFS申请',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await deleteSfsRequest(request.id)
    ElMessage.success('删除成功')
    await loadSfsRequests()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除SFS申请失败:', error)
      ElMessage.error('删除失败: ' + (error.message || '未知错误'))
    }
  }
}

// 编辑用户权限申请
const editPermissionRequest = (request) => {
  router.push({
    path: '/permission-request',
    query: { edit: true, id: request.id }
  })
}

// 查看用户权限申请
const viewPermissionRequest = (request) => {
  router.push({
    path: '/permission-request',
    query: { view: true, id: request.id }
  })
}

// 删除用户权限申请
const deletePermissionRequest = async (request) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除 ${request.name} (${request.domain_account}) 的用户权限申请吗？此操作不可恢复！`,
      '删除用户权限申请',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await deletePermissionRequestAPI(request.id)
    ElMessage.success('删除成功')
    await loadPermissionRequests()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

// 编辑网络策略申请
const editNetworkPolicy = (request) => {
  router.push({
    path: '/network-policy',
    query: { edit: true, id: request.id }
  })
}

// 查看网络策略申请
const viewNetworkPolicy = (request) => {
  router.push({
    path: '/network-policy',
    query: { view: true, id: request.id }
  })
}

// 删除网络策略申请
const deleteNetworkPolicy = async (request) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除此网络策略申请吗？此操作不可恢复！`,
      '删除网络策略申请',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await deleteNetworkPolicyAPI(request.id)
    ElMessage.success('删除成功')
    await loadNetworkPolicies()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

// 用户需求相关函数
const viewUserRequirement = (id) => {
  detailId.value = id
  detailVisible.value = true
}

const editUserRequirement = (id) => {
  router.push(`/user-requirement/edit/${id}`)
}

const deleteUserRequirementRow = async (id) => {
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

    await deleteUserRequirementAPI(id)
    ElMessage.success('删除成功')
    await loadUserRequirementRequests()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除需求单失败:', error)
      ElMessage.error('删除失败: ' + (error.message || '未知错误'))
    }
  }
}

const exportUserRequirementRow = async (id, title) => {
  try {
    const blob = await exportUserRequirement(id)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url

    let fileName = `用户需求_${title || id}.xlsx`
    const disposition = blob.headers?.['content-disposition']
    if (disposition) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      if (match && match[1]) {
        fileName = decodeURIComponent(match[1].replace(/['"]/g, ''))
      }
    }

    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出需求单失败:', error)
    ElMessage.error('导出需求单失败')
  }
}

// 虚拟机申请相关函数
const handleView = (request) => {
  router.push({
    path: '/vm-request',
    query: { view: true, id: request.id }
  })
}

const handleEdit = (request) => {
  router.push({
    path: '/vm-request',
    query: { edit: true, id: request.id }
  })
}


const handleDelete = async (request) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除 ${request.system_name} 的申请吗？此操作不可恢复！`,
      '删除申请',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await fetch(`/api/requests/${request.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || '删除失败')
    }

    ElMessage.success('删除成功')
    await loadVMRequests()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

// 导出所有申请到Excel
const exportAllToExcel = async () => {
  try {
    loading.value = true
    ElMessage.info('正在生成Excel文件，请稍候...')

    // 调用后端API导出所有模块
    const response = await fetch('/api/excel/all-modules', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || '导出失败')
    }

    // 下载文件
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `资源申请汇总_${new Date().getTime()}.xlsx`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    ElMessage.success('Excel文件导出成功')
  } catch (error) {
    console.error('导出Excel失败:', error)
    ElMessage.error('导出Excel失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 组件挂载时加载所有申请
onMounted(async () => {
  if (!userStore.user) {
    userStore.loadUserFromStorage()
  }

  // 并行加载所有类型的申请
  await Promise.all([
    loadContainerRequests(),
    loadVMRequests(),
    loadObsRequests(),
    loadSfsRequests(),
    loadPermissionRequests(),
    loadNetworkPolicies(),
    loadUserRequirementRequests()
  ])

  // 设置默认激活的标签页（按照优先级：用户需求 > 容器 > 虚拟机 > OBS > SFS > 权限 > 网络策略）
  if (stats.userRequirement > 0) {
    activeTab.value = 'userRequirement'
  } else if (stats.container > 0) {
    activeTab.value = 'container'
  } else if (stats.vm > 0) {
    activeTab.value = 'vm'
  } else if (stats.obs > 0) {
    activeTab.value = 'obs'
  } else if (stats.sfs > 0) {
    activeTab.value = 'sfs'
  } else if (stats.permission > 0) {
    activeTab.value = 'permission'
  } else if (stats.networkPolicy > 0) {
    activeTab.value = 'networkPolicy'
  }
})
</script>

<style scoped>
.dashboard {
  padding: 20px;
}

.stats-bar {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.stat-label {
  color: #606266;
  font-size: 14px;
}

.stat-value {
  color: #409eff;
  font-weight: bold;
  font-size: 16px;
}

.tab-content {
  margin-top: 20px;
}

.search-bar {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  gap: 10px;
}

/* 详情对话框样式 */
.detail-view {
  padding: 10px 0;
}

.config-detail {
  margin-top: 20px;
}

.config-detail .config-item {
  display: flex;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.config-detail .config-item:last-child {
  border-bottom: none;
}

.config-detail .config-item .label {
  width: 100px;
  color: #909399;
  font-weight: 500;
}

.config-detail .config-item .value {
  flex: 1;
  color: #303133;
}

.export-button {
  margin-left: auto;
}

@media (max-width: 768px) {
  .export-button {
    width: 100%;
    margin-left: 0;
    margin-top: 10px;
  }
}
</style>
