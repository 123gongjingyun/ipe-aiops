import request from '@/utils/request'

// 创建容器申请
export const createContainerRequest = (data) => {
  return request({
    url: '/container',
    method: 'post',
    data
  })
}

// 获取当前用户的容器申请列表
export const getMyContainerRequests = (params) => {
  return request({
    url: '/container/my',
    method: 'get',
    params
  })
}

// 获取所有容器申请（管理员）
export const getAllContainerRequests = (params) => {
  return request({
    url: '/container',
    method: 'get',
    params
  })
}

// 获取单个容器申请详情
export const getContainerRequestById = (id) => {
  return request({
    url: `/container/${id}`,
    method: 'get'
  })
}

// 更新容器申请
export const updateContainerRequest = (id, data) => {
  return request({
    url: `/container/${id}`,
    method: 'put',
    data
  })
}

// 删除容器申请
export const deleteContainerRequest = (id) => {
  return request({
    url: `/container/${id}`,
    method: 'delete'
  })
}

// 更新容器申请状态（管理员）
export const updateContainerRequestStatus = (id, status) => {
  return request({
    url: `/container/${id}/status`,
    method: 'put',
    data: { status }
  })
}
