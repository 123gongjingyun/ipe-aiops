import request from '@/utils/request'

// 获取当前用户的申请列表
export const getMyRequests = (params) => {
  return request({
    url: '/requests/my',
    method: 'get',
    params
  })
}

// 获取所有申请列表（管理员）
export const getAllRequests = (params) => {
  return request({
    url: '/requests',
    method: 'get',
    params
  })
}

// 获取申请列表（兼容旧版本，默认调用getMyRequests）
export const getRequests = (params) => {
  return getMyRequests(params)
}

// 创建申请
export const createRequest = (data) => {
  return request({
    url: '/requests',
    method: 'post',
    data
  })
}

// 批量创建申请
export const batchCreateRequests = (data) => {
  return request({
    url: '/requests/batch',
    method: 'post',
    data
  })
}

// 更新申请
export const updateRequest = (id, data) => {
  return request({
    url: `/requests/${id}`,
    method: 'put',
    data
  })
}

// 删除申请
export const deleteRequest = (id) => {
  return request({
    url: `/requests/${id}`,
    method: 'delete'
  })
}

// 获取申请详情
export const getRequestDetail = (id) => {
  return request({
    url: `/requests/${id}`,
    method: 'get'
  })
}

// 导出申请为Excel
export const exportToExcel = (params) => {
  return request({
    url: '/requests/export',
    method: 'get',
    params,
    responseType: 'blob'
  })
}