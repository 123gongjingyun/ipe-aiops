import request from '@/utils/request'

// 获取当前用户的虚拟机申请列表
export const getMyVMRequests = (params) => {
  return request({
    url: '/vm-requests/my',
    method: 'get',
    params
  })
}

// 获取所有虚拟机申请列表（管理员）
export const getAllVMRequestsList = (params) => {
  return request({
    url: '/vm-requests',
    method: 'get',
    params
  })
}

// 创建虚拟机申请
export const createVMRequest = (data) => {
  return request({
    url: '/vm-requests',
    method: 'post',
    data
  })
}

// 更新虚拟机申请
export const updateVMRequest = (id, data) => {
  return request({
    url: `/vm-requests/${id}`,
    method: 'put',
    data
  })
}

// 删除虚拟机申请
export const deleteVMRequest = (id) => {
  return request({
    url: `/vm-requests/${id}`,
    method: 'delete'
  })
}

// 获取虚拟机申请详情
export const getVMRequestDetail = (id) => {
  return request({
    url: `/vm-requests/${id}`,
    method: 'get'
  })
}