import request from '@/utils/request'

// 获取我的SFS申请列表
export const getMySfsRequests = (params) => {
  return request({
    url: '/sfs/my',
    method: 'get',
    params
  })
}

// 获取所有SFS申请列表（管理员）
export const getAllSfsRequests = (params) => {
  return request({
    url: '/sfs',
    method: 'get',
    params
  })
}

// 创建SFS申请
export const createSfsRequest = (data) => {
  return request({
    url: '/sfs',
    method: 'post',
    data
  })
}

// 获取SFS申请详情
export const getSfsRequestDetail = (id) => {
  return request({
    url: `/sfs/${id}`,
    method: 'get'
  })
}

// 更新SFS申请
export const updateSfsRequest = (id, data) => {
  return request({
    url: `/sfs/${id}`,
    method: 'put',
    data
  })
}

// 删除SFS申请
export const deleteSfsRequest = (id) => {
  return request({
    url: `/sfs/${id}`,
    method: 'delete'
  })
}

// 更新SFS申请状态（管理员）
export const updateSfsRequestStatus = (id, status) => {
  return request({
    url: `/sfs/${id}/status`,
    method: 'put',
    data: { status }
  })
}
