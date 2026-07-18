// API基础配置
const API_BASE_URL = '/api'

// API版本
const API_VERSION = '/v1'

// 完整的API基础URL
const FULL_API_BASE_URL = API_BASE_URL + API_VERSION

export {
  API_BASE_URL,
  API_VERSION,
  FULL_API_BASE_URL
}

// 导出所有API模块
export { default as userApi } from './user'
export { default as requestApi } from './request'
export { default as configApi } from './config'
export { default as adminApi } from './admin'