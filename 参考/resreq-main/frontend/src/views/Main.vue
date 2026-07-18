<template>
  <el-container class="main-container">
    <!-- 侧边栏 -->
    <el-aside width="200px" class="sidebar">
      <div class="logo">
        <h3>资源申请管理</h3>
      </div>

      <el-menu
        :default-active="activeMenu"
        class="sidebar-menu"
        router
        background-color="transparent"
        text-color="#bfcbd9"
        active-text-color="#ffffff"
      >
        <el-menu-item index="/dashboard">
          <el-icon><Document /></el-icon>
          <span>我的申请</span>
        </el-menu-item>

        <el-menu-item index="/user-requirement">
          <el-icon><Notebook /></el-icon>
          <span>用户需求</span>
        </el-menu-item>

        <el-menu-item index="/container-request">
          <el-icon><Box /></el-icon>
          <span>容器申请</span>
          <el-button
            @click.stop="handleQuickCreate('container')"
            :icon="Plus"
            circle
            size="small"
            class="menu-create-btn"
          />
        </el-menu-item>

        <el-menu-item index="/vm-request">
          <el-icon><Monitor /></el-icon>
          <span>虚拟机申请</span>
          <el-button
            @click.stop="handleQuickCreate('vm')"
            :icon="Plus"
            circle
            size="small"
            class="menu-create-btn"
          />
        </el-menu-item>

        <el-menu-item index="/obs-request">
          <el-icon><FolderOpened /></el-icon>
          <span>OBS申请</span>
          <el-button
            @click.stop="handleQuickCreate('obs')"
            :icon="Plus"
            circle
            size="small"
            class="menu-create-btn"
          />
        </el-menu-item>

        <el-menu-item index="/sfs-request">
          <el-icon><Files /></el-icon>
          <span>SFS申请</span>
          <el-button
            @click.stop="handleQuickCreate('sfs')"
            :icon="Plus"
            circle
            size="small"
            class="menu-create-btn"
          />
        </el-menu-item>

        <el-menu-item index="/permission-request">
          <el-icon><Key /></el-icon>
          <span>用户权限申请</span>
          <el-button
            @click.stop="handleQuickCreate('permission')"
            :icon="Plus"
            circle
            size="small"
            class="menu-create-btn"
          />
        </el-menu-item>

        <el-menu-item index="/network-policy">
          <el-icon><Connection /></el-icon>
          <span>网络需求</span>
          <el-button
            @click.stop="handleQuickCreate('network-policy')"
            :icon="Plus"
            circle
            size="small"
            class="menu-create-btn"
          />
        </el-menu-item>

        <el-menu-item index="/requirement-categories" v-if="userStore.isAdmin()">
          <el-icon><Setting /></el-icon>
          <span>用户需求分类管理</span>
        </el-menu-item>

        <el-menu-item index="/config" v-if="userStore.isAdmin()">
          <el-icon><Setting /></el-icon>
          <span>虚拟机配置管理</span>
        </el-menu-item>

        <el-menu-item index="/users" v-if="userStore.isAdmin()">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 主内容区 -->
    <el-container>
      <!-- 顶部栏 -->
      <el-header class="header">
        <div class="header-left">
          <span class="page-title">{{ currentPageTitle }}</span>
        </div>

        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-dropdown">
              <el-icon><UserFilled /></el-icon>
              {{ userStore.user?.realName || userStore.user?.username }}
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人信息</el-dropdown-item>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 主要内容 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Key, Connection, Document, Setting, Notebook } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const activeMenu = computed(() => route.path)
const currentPageTitle = computed(() => route.meta.title || '资源申请管理系统')

const handleCommand = (command) => {
  switch (command) {
    case 'profile':
      ElMessage.info('个人信息功能开发中...')
      break
    case 'logout':
      handleLogout()
      break
  }
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    userStore.clearUser()
    ElMessage.success('已退出登录')
    router.push('/login')
  } catch (error) {
    // 用户取消操作
  }
}

// 快速创建申请
const handleQuickCreate = (type) => {
  const routeMap = {
    container: '/container-request',
    vm: '/vm-request',
    obs: '/obs-request',
    sfs: '/sfs-request',
    permission: '/permission-request',
    'network-policy': '/network-policy'
  }

  // 设置sessionStorage标记，让页面知道需要打开创建表单
  sessionStorage.setItem('quickCreate', 'true')

  // 路由到对应页面
  router.push(routeMap[type])
}
</script>

<style scoped>
.main-container {
  height: 100vh;
}

.sidebar {
  background: linear-gradient(180deg, #2a3f5f 0%, #1d2d42 100%);
  color: #bfcbd9;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
}

.logo {
  padding: 24px 20px;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.1) 0%, rgba(64, 158, 255, 0.05) 100%);
}

.logo h3 {
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  letter-spacing: 1px;
}

.sidebar-menu {
  border: none;
}

/* 优化菜单项样式 */
.sidebar-menu .el-menu-item {
  color: #bfcbd9;
  transition: all 0.3s ease;
  position: relative;
  margin: 4px 8px;
  border-radius: 6px;
}

/* 菜单项hover效果 */
.sidebar-menu .el-menu-item:hover {
  background-color: rgba(64, 158, 255, 0.15) !important;
  color: #ffffff !important;
}

/* 选中菜单项样式 - 醒目的渐变背景 */
.sidebar-menu .el-menu-item.is-active {
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%) !important;
  color: #ffffff !important;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.4);
  border-radius: 8px;
}

/* 选中菜单项左侧指示条 */
.sidebar-menu .el-menu-item.is-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 70%;
  background-color: #ffffff;
  border-radius: 0 3px 3px 0;
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.6);
}

/* 图标样式优化 */
.sidebar-menu .el-menu-item .el-icon {
  color: inherit;
  font-size: 18px;
  transition: transform 0.2s ease;
}

/* hover时图标微微放大 */
.sidebar-menu .el-menu-item:hover .el-icon {
  transform: scale(1.1);
}

/* 选中时图标发光效果 */
.sidebar-menu .el-menu-item.is-active .el-icon {
  filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.5));
  transform: scale(1.05);
}

/* 菜单创建按钮样式 */
.menu-create-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  border: none;
  color: white;
  opacity: 0;
  transition: all 0.3s ease;
  pointer-events: none;
  width: 28px;
  height: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

/* 菜单项hover时显示创建按钮 */
.sidebar-menu .el-menu-item:hover .menu-create-btn {
  opacity: 1;
  pointer-events: auto;
}

/* 菜单项激活时也显示创建按钮 */
.sidebar-menu .el-menu-item.is-active .menu-create-btn {
  opacity: 1;
  pointer-events: auto;
}

/* 创建按钮hover效果 */
.menu-create-btn:hover {
  transform: translateY(-50%) scale(1.15);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.6);
}

/* 确保图标居中 */
.menu-create-btn .el-icon {
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 20px;
}

.header-left {
  flex: 1;
}

.page-title {
  font-size: 18px;
  font-weight: 500;
  color: #303133;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  color: #606266;
  font-size: 14px;
}

.user-dropdown:hover {
  color: #409eff;
}

.main-content {
  background-color: #f0f2f5;
  padding: 20px;
}
</style>