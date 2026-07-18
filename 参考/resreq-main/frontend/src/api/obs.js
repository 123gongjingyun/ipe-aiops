import request from '@/utils/request'

// 获取我的OBS申请列表
export const getMyObsRequests = (params) => {
  return request({
    url: '/obs/my',
    method: 'get',
    params
  })
}

// 获取所有OBS申请列表（管理员）
export const getAllObsRequests = (params) => {
  return request({
    url: '/obs',
    method: 'get',
    params
  })
}

// 创建OBS申请
export const createObsRequest = (data) => {
  return request({
    url: '/obs',
    method: 'post',
    data
  })
}

// 获取OBS申请详情
export const getObsRequestDetail = (id) => {
  return request({
    url: `/obs/${id}`,
    method: 'get'
  })
}

// 更新OBS申请
export const updateObsRequest = (id, data) => {
  return request({
    url: `/obs/${id}`,
    method: 'put',
    data
  })
}

// 删除OBS申请
export const deleteObsRequest = (id) => {
  return request({
    url: `/obs/${id}`,
    method: 'delete'
  })
}

// 更新OBS申请状态（管理员）
export const updateObsRequestStatus = (id, status) => {
  return request({
    url: `/obs/${id}/status`,
    method: 'put',
    data: { status }
  })
}
