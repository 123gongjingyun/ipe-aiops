/**
 * Excel导出API接口
 */
import request from '@/utils/request'

// 导出资源申请为Excel
export const exportRequests = (params) => {
  return request({
    url: '/excel/requests',
    method: 'get',
    params,
    responseType: 'blob'
  })
}

// 导出单条资源申请
export const exportSingleRequest = (id) => {
  return request({
    url: `/excel/requests/${id}`,
    method: 'get',
    responseType: 'blob'
  })
}

// 批量导出
export const batchExport = (requestIds) => {
  return request({
    url: '/excel/batch',
    method: 'post',
    data: { requestIds },
    responseType: 'blob'
  })
}

// 预览导出数据
export const previewExport = (params) => {
  return request({
    url: '/excel/preview',
    method: 'get',
    params
  })
}

// 下载Excel文件的通用方法
export const downloadExcel = (blob, filename) => {
  const url = window.URL.createObjectURL(new Blob([blob], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }))

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()

  // 清理
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

// 生成导出文件名
export const generateExportFilename = (prefix = '资源申请', count = 1) => {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');

  if (count > 1) {
    return `${prefix}_批量_${dateStr}_${timeStr}.xlsx`
  } else {
    return `${prefix}_${dateStr}_${timeStr}.xlsx`
  }
}
