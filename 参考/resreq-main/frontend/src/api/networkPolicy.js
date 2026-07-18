import request from '@/utils/request'

// 创建网络策略申请
export const createNetworkPolicy = (data) => {
  return request({
    url: '/network-policy',
    method: 'post',
    data
  })
}

// 获取我的网络策略申请列表
export const getMyNetworkPolicies = (params) => {
  return request({
    url: '/network-policy/my',
    method: 'get',
    params
  })
}

// 获取所有网络策略申请列表（管理员）
export const getAllNetworkPolicies = (params) => {
  return request({
    url: '/network-policy',
    method: 'get',
    params
  })
}

// 获取网络策略申请详情
export const getNetworkPolicyDetail = (id) => {
  return request({
    url: `/network-policy/${id}`,
    method: 'get'
  })
}

// 更新网络策略申请
export const updateNetworkPolicy = (id, data) => {
  return request({
    url: `/network-policy/${id}`,
    method: 'put',
    data
  })
}

// 删除网络策略申请
export const deleteNetworkPolicy = (id) => {
  return request({
    url: `/network-policy/${id}`,
    method: 'delete'
  })
}

// 更新网络策略申请状态（管理员）
export const updateNetworkPolicyStatus = (id, status) => {
  return request({
    url: `/network-policy/${id}/status`,
    method: 'put',
    data: { status }
  })
}
