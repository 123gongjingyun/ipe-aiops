import request from '@/utils/request'

// 获取配置类型列表
export const getConfigTypes = () => {
  return request({
    url: '/config/types',
    method: 'get'
  })
}

// 创建配置类型
export const createConfigType = (data) => {
  return request({
    url: '/config/types',
    method: 'post',
    data
  })
}

// 更新配置类型
export const updateConfigType = (id, data) => {
  return request({
    url: `/config/types/${id}`,
    method: 'put',
    data
  })
}

// 删除配置类型
export const deleteConfigType = (id) => {
  return request({
    url: `/config/types/${id}`,
    method: 'delete'
  })
}

// 获取环境列表
export const getEnvironments = () => {
  return request({
    url: '/config/environments',
    method: 'get'
  })
}

// 创建环境
export const createEnvironment = (data) => {
  return request({
    url: '/config/environments',
    method: 'post',
    data
  })
}

// 更新环境
export const updateEnvironment = (id, data) => {
  return request({
    url: `/config/environments/${id}`,
    method: 'put',
    data
  })
}

// 删除环境
export const deleteEnvironment = (id) => {
  return request({
    url: `/config/environments/${id}`,
    method: 'delete'
  })
}

// 获取配置选项列表
export const getConfigOptions = (params) => {
  return request({
    url: '/config/options',
    method: 'get',
    params
  })
}

// 创建配置选项
export const createConfigOption = (data) => {
  return request({
    url: '/config/options',
    method: 'post',
    data
  })
}

// 更新配置选项
export const updateConfigOption = (id, data) => {
  return request({
    url: `/config/options/${id}`,
    method: 'put',
    data
  })
}

// 删除配置选项
export const deleteConfigOption = (id) => {
  return request({
    url: `/config/options/${id}`,
    method: 'delete'
  })
}

// 获取配置详细说明
export const getConfigDescriptions = (params) => {
  return request({
    url: '/config/descriptions',
    method: 'get',
    params
  })
}

// 更新配置详细说明
export const updateConfigDescription = (id, data) => {
  return request({
    url: `/config/descriptions/${id}`,
    method: 'put',
    data
  })
}

// 获取3级联动关系
export const getLinkageRelations = (params) => {
  return request({
    url: '/config/linkage',
    method: 'get',
    params
  })
}