import request from '@/utils/request'

// 获取需求分类树
export const getRequirementCategories = () => {
  return request({
    url: '/requirement-categories',
    method: 'get'
  })
}

// 创建需求分类
export const createRequirementCategory = (data) => {
  return request({
    url: '/requirement-categories',
    method: 'post',
    data
  })
}

// 更新需求分类
export const updateRequirementCategory = (id, data) => {
  return request({
    url: `/requirement-categories/${id}`,
    method: 'put',
    data
  })
}

// 删除需求分类
export const deleteRequirementCategory = (id) => {
  return request({
    url: `/requirement-categories/${id}`,
    method: 'delete'
  })
}
