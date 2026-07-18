import request from '@/utils/request'

// 获取用户列表（管理员）
export const getUsers = (params) => {
  return request({
    url: '/admin/users',
    method: 'get',
    params
  })
}

// 创建用户（管理员）
export const createUser = (data) => {
  return request({
    url: '/admin/users',
    method: 'post',
    data
  })
}

// 更新用户（管理员）
export const updateUser = (id, data) => {
  return request({
    url: `/admin/users/${id}`,
    method: 'put',
    data
  })
}

// 删除用户（管理员）
export const deleteUser = (id) => {
  return request({
    url: `/admin/users/${id}`,
    method: 'delete'
  })
}

// 重置用户密码（管理员）
export const resetUserPassword = (id, data) => {
  return request({
    url: `/admin/users/${id}/reset-password`,
    method: 'post',
    data
  })
}

// 获取所有用户的申请列表（管理员）
export const getAllRequests = (params) => {
  return request({
    url: '/admin/requests',
    method: 'get',
    params
  })
}