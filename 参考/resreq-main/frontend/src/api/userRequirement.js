import request from '@/utils/request'

// 获取需求单列表
export const getUserRequirements = (params) => {
  return request({
    url: '/user-requirements',
    method: 'get',
    params
  })
}

// 获取需求单详情
export const getUserRequirementById = (id) => {
  return request({
    url: `/user-requirements/${id}`,
    method: 'get'
  })
}

// 创建需求单
export const createUserRequirement = (data) => {
  return request({
    url: '/user-requirements',
    method: 'post',
    data
  })
}

// 更新需求单
export const updateUserRequirement = (id, data) => {
  return request({
    url: `/user-requirements/${id}`,
    method: 'put',
    data
  })
}

// 删除需求单
export const deleteUserRequirement = (id) => {
  return request({
    url: `/user-requirements/${id}`,
    method: 'delete'
  })
}

// 导出需求单为 Excel
export const exportUserRequirement = (id) => {
  return request({
    url: `/excel/user-requirements/${id}`,
    method: 'get',
    responseType: 'blob'
  })
}
