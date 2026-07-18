<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h1>资源申请管理系统</h1>
        <p>Resource Application Management System</p>
      </div>

      <el-form :model="loginForm" :rules="rules" ref="loginFormRef" class="login-form">
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
            size="large"
            prefix-icon="User"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            prefix-icon="Lock"
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            @click="handleLogin"
            style="width: 100%"
          >
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-footer">
        <el-link type="primary" @click="showRegister = true">没有账号？立即注册</el-link>
      </div>

      <!-- 注册对话框 -->
      <el-dialog
        v-model="showRegister"
        title="用户注册"
        width="400px"
        :close-on-click-modal="false"
      >
        <el-form :model="registerForm" :rules="registerRules" ref="registerFormRef" label-width="80px">
          <el-form-item label="用户名" prop="username">
            <el-input v-model="registerForm.username" placeholder="请输入用户名(域账号)" />
          </el-form-item>

          <el-form-item label="真实姓名" prop="realName">
            <el-input v-model="registerForm.realName" placeholder="请输入真实姓名" autocomplete="off" />
          </el-form-item>

          <el-form-item label="密码" prop="password">
            <el-input v-model="registerForm.password" type="password" placeholder="请输入密码" autocomplete="new-password" />
            <div class="password-rules">
              <p>密码要求：8-20位，必须包含大写字母、小写字母、数字和特殊字符</p>
            </div>
          </el-form-item>

          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input v-model="registerForm.confirmPassword" type="password" placeholder="请再次输入密码" autocomplete="new-password" />
          </el-form-item>
        </el-form>

        <template #footer>
          <el-button @click="showRegister = false">取消</el-button>
          <el-button type="primary" @click="handleRegister" :loading="registerLoading">
            注册
          </el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import { validateUsername, validatePassword } from '@/utils/security'

const router = useRouter()
const userStore = useUserStore()

const loginFormRef = ref(null)
const registerFormRef = ref(null)
const loading = ref(false)
const showRegister = ref(false)
const registerLoading = ref(false)

const loginForm = reactive({
  username: '',
  password: ''
})

const registerForm = reactive({
  username: '',
  realName: '',
  password: '',
  confirmPassword: ''
})

const rules = {
  username: [
    {
      validator: (rule, value, callback) => {
        const validation = validateUsername(value)
        if (!validation.isValid) {
          callback(new Error(validation.errors[0]))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  password: [
    {
      validator: (rule, value, callback) => {
        if (!value) {
          callback(new Error('请输入密码'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const registerRules = {
  username: [
    {
      validator: (rule, value, callback) => {
        const validation = validateUsername(value)
        if (!validation.isValid) {
          callback(new Error(validation.errors[0]))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  realName: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度在2-20个字符', trigger: 'blur' },
    { pattern: /^[\u4e00-\u9fa5a-zA-Z\s]+$/, message: '姓名只能包含中文、英文字母和空格', trigger: 'blur' }
  ],
  password: [
    {
      validator: (rule, value, callback) => {
        const validation = validatePassword(value)
        if (!validation.isValid) {
          callback(new Error(validation.errors[0]))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== registerForm.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const handleLogin = async () => {
  try {
    const valid = await loginFormRef.value.validate()
    if (!valid) return

    loading.value = true

    // 调用后端API进行登录验证
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: loginForm.username,
        password: loginForm.password
      })
    })

    const data = await response.json()

    if (!response.ok) {
      ElMessage.error(data.message || '登录失败，请检查用户名和密码')
      return
    }

    // 保存用户信息和token
    userStore.setUser(data.user, data.token)
    ElMessage.success('登录成功')
    router.push('/')

  } catch (error) {
    console.error('登录错误:', error)
    ElMessage.error('网络错误，请检查后端服务器是否运行')
  } finally {
    loading.value = false
  }
}

const handleRegister = async () => {
  try {
    const valid = await registerFormRef.value.validate()
    if (!valid) return

    registerLoading.value = true

    // 调用后端API进行注册
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: registerForm.username,
        password: registerForm.password,
        realName: registerForm.realName
      })
    })

    const data = await response.json()

    if (!response.ok) {
      ElMessage.error(data.message || '注册失败')
      return
    }

    // 注册成功后自动登录
    userStore.setUser(data.user, data.token || 'temp-token')
    ElMessage.success('注册成功！')
    showRegister.value = false
    router.push('/')

    // 清空注册表单
    Object.assign(registerForm, {
      username: '',
      realName: '',
      password: '',
      confirmPassword: ''
    })
  } catch (error) {
    console.error('注册错误:', error)
    ElMessage.error('网络错误，请检查后端服务器是否运行')
  } finally {
    registerLoading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  width: 400px;
  padding: 40px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h1 {
  font-size: 28px;
  color: #303133;
  margin-bottom: 10px;
}

.login-header p {
  font-size: 14px;
  color: #909399;
}

.login-form {
  margin-top: 20px;
}

.login-footer {
  text-align: center;
  margin-top: 20px;
  color: #909399;
  font-size: 14px;
}

.login-footer p {
  margin: 5px 0;
}

.password-rules {
  margin-top: 5px;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}

.password-rules p {
  margin: 0;
}
</style>