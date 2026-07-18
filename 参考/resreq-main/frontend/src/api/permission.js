import request from '@/utils/request'

// 创建权限申请
export const createPermissionRequest = (data) => {
  return request({
    url: '/permission/',
    method: 'post',
    data
  })
}

// 获取当前用户的权限申请列表
export const getMyPermissionRequests = (params) => {
  return request({
    url: '/permission/my',
    method: 'get',
    params
  })
}

// 获取所有权限申请列表（管理员）
export const getAllPermissionRequests = (params) => {
  return request({
    url: '/permission/',
    method: 'get',
    params
  })
}

// 获取单个权限申请详情
export const getPermissionRequestById = (id) => {
  return request({
    url: `/permission/${id}`,
    method: 'get'
  })
}

// 更新权限申请
export const updatePermissionRequest = (id, data) => {
  return request({
    url: `/permission/${id}`,
    method: 'put',
    data
  })
}

// 删除权限申请
export const deletePermissionRequest = (id) => {
  return request({
    url: `/permission/${id}`,
    method: 'delete'
  })
}

// 更新申请状态
export const updatePermissionRequestStatus = (id, status) => {
  return request({
    url: `/permission/${id}/status`,
    method: 'put',
    data: { status }
  })
}