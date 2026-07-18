import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/views/Main.vue'),
    meta: { requiresAuth: true },
    redirect: '/dashboard',
    children: [
      {
        path: '',
        name: 'Main',
        redirect: '/dashboard'
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '我的申请' }
      },
      {
        path: 'container-request',
        name: 'ContainerRequest',
        component: () => import('@/views/ContainerRequest.vue'),
        meta: { title: '容器申请' }
      },
      {
        path: 'vm-request',
        name: 'VMRequest',
        component: () => import('@/views/CreateRequest.vue'),
        meta: { title: '虚拟机申请' }
      },
      {
        path: 'obs-request',
        name: 'OBSRequest',
        component: () => import('@/views/OBSRequest.vue'),
        meta: { title: 'OBS申请' }
      },
      {
        path: 'sfs-request',
        name: 'SFSRequest',
        component: () => import('@/views/SFSRequest.vue'),
        meta: { title: 'SFS申请' }
      },
      {
        path: 'permission-request',
        name: 'PermissionRequest',
        component: () => import('@/views/PermissionRequest.vue'),
        meta: { title: '用户权限申请' }
      },
      {
        path: 'network-policy',
        name: 'NetworkPolicy',
        component: () => import('@/views/NetworkPolicy.vue'),
        meta: { title: '网络需求' }
      },
      {
        path: 'user-requirement',
        name: 'UserRequirement',
        component: () => import('@/views/UserRequirement.vue'),
        meta: { title: '用户需求录入' }
      },
      {
        path: 'user-requirement/create',
        name: 'UserRequirementCreate',
        component: () => import('@/views/UserRequirementForm.vue'),
        meta: { title: '新建用户需求' }
      },
      {
        path: 'user-requirement/edit/:id',
        name: 'UserRequirementEdit',
        component: () => import('@/views/UserRequirementForm.vue'),
        meta: { title: '编辑用户需求' }
      },
      {
        path: 'requirement-categories',
        name: 'RequirementCategoryManage',
        component: () => import('@/views/RequirementCategoryManage.vue'),
        meta: { title: '需求分类维护', requiresAdmin: true }
      },
      {
        path: 'config',
        name: 'ConfigManagement',
        component: () => import('@/views/ConfigManagement.vue'),
        meta: { title: '配置管理', requiresAdmin: true }
      },
      {
        path: 'users',
        name: 'UserManagement',
        component: () => import('@/views/UserManagement.vue'),
        meta: { title: '用户管理', requiresAdmin: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  if (to.meta.requiresAuth && !userStore.isLoggedIn()) {
    next('/login')
  } else if (to.meta.requiresAdmin && !userStore.isAdmin()) {
    next('/')
  } else if (to.path === '/login' && userStore.isLoggedIn()) {
    next('/')
  } else {
    next()
  }
})

export default router