/**
 * Excel导出工具 - 模板格式版
 * 按照资源申请模板的格式导出配置详细说明
 */

const ExcelJS = require('exceljs');

/**
 * 导出所有申请（包含配置详细说明）- 模板格式版
 */
const exportAllRequestsWithDetails = async (requests, configDescriptions, user) => {
  try {
    const workbook = new ExcelJS.Workbook();

    // 第一个Sheet：资源申请列表
    const requestsWorksheet = workbook.addWorksheet('资源申请列表');
    setupRequestsWorksheet(requestsWorksheet, requests);

    // 第二个Sheet：配置详细说明 - 按模板格式
    const detailsWorksheet = workbook.addWorksheet('配置详细说明');
    await setupConfigDetailsWorksheet(detailsWorksheet, configDescriptions, requests);

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;

  } catch (error) {
    console.error('导出详细Excel失败:', error);
    throw new Error('导出Excel文件失败');
  }
};

/**
 * 设置配置详细说明工作表 - 模板格式
 */
async function setupConfigDetailsWorksheet(worksheet, configDescriptions, requests) {
  // 分析用户申请中涉及的所有类型
  const involvedTypes = getInvolvedTypesFromRequests(requests);

  // 按类型分组配置数据
  const groupedConfigs = groupConfigsByServiceType(configDescriptions, involvedTypes);

  // 为每种类型创建独立的配置区域
  let currentRow = 1;

  for (const [typeName, configs] of groupedConfigs.entries()) {
    // 添加类型标题行
    const titleRow = worksheet.getRow(currentRow);
    titleRow.height = 30;
    const titleCell = titleRow.getCell(1);
    titleCell.value = `${typeName}配置详情`;
    titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: getTypeColor(typeName) }
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells(currentRow, 1, currentRow, 15);
    currentRow++;

    // 添加表头和数据
    const headers = getTypeHeaders(typeName);
    addConfigSection(worksheet, currentRow, typeName, configs, headers);
    currentRow += configs.length + 2;
  }

  setupColumnWidths(worksheet);
}

function addConfigSection(worksheet, startRow, typeName, configs, headers) {
  // 添加表头
  const headerRow = worksheet.getRow(startRow);
  headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;

  headers.forEach((header, index) => {
    headerRow.getCell(index + 1).value = header;
  });

  // 添加数据
  configs.forEach((config, index) => {
    const dataRow = worksheet.getRow(startRow + 1 + index);
    const rowData = buildConfigRowData(config, typeName);
    
    headers.forEach((header, colIndex) => {
      const cell = dataRow.getCell(colIndex + 1);
      cell.value = rowData[header] || '';
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
      };
    });
  });
}

function getInvolvedTypesFromRequests(requests) {
  const types = new Set();
  requests.forEach(request => {
    if (request.type) {
      // 保持原始类型名称，不进行简化
      types.add(request.type);
    }
  });
  return Array.from(types);
}

function normalizeTypeName(typeName) {
  if (!typeName) return '其他';
  const normalized = typeName.toLowerCase().replace(/[\(\)]/g, '').replace(/\s+/g, '').trim();
  
  if (normalized.includes('数据库') || normalized.includes('mysql')) return 'MySQL';
  if (normalized.includes('rabbitmq')) return 'RabbitMQ';
  if (normalized.includes('redis')) return 'Redis';
  if (normalized.includes('kafka')) return 'Kafka';
  if (normalized.includes('ap') || normalized.includes('应用')) return 'AP应用';
  return typeName;
}

function groupConfigsByServiceType(configDescriptions, involvedTypes) {
  const grouped = new Map();
  involvedTypes.forEach(type => grouped.set(type, []));

  // 确保configDescriptions是数组
  if (!configDescriptions || !Array.isArray(configDescriptions)) {
    console.warn('configDescriptions is not an array:', configDescriptions);
    return grouped;
  }

  configDescriptions.forEach(config => {
    const originalType = config.type_name || '其他';
    if (grouped.has(originalType)) {
      grouped.get(originalType).push(config);
    }
  });

  return grouped;
}

function getTypeHeaders(typeName) {
  const normalizedType = typeName.toLowerCase();

  if (normalizedType.includes('mysql') || normalizedType.includes('数据库')) {
    return ['配置名称', '环境', '架构类型', 'CPU', '内存', '系统盘', '数据盘', '最大连接数', '日均QPS', '峰值QPS', '适用场景', '用户规模', '推荐等级', '价格等级'];
  } else if (normalizedType.includes('rabbitmq')) {
    return ['配置名称', '环境', '架构类型', 'CPU', '内存', '系统盘', '数据盘', '并发连接数', '消息吞吐量', '队列数量', '适用场景', '用户规模', '推荐等级', '价格等级'];
  } else if (normalizedType.includes('redis')) {
    return ['配置名称', '环境', '架构类型', 'CPU', '内存', '系统盘', '数据盘', '最大连接数', '每秒操作数', '缓存命中率', '适用场景', '用户规模', '推荐等级', '价格等级'];
  } else if (normalizedType.includes('kafka')) {
    return ['配置名称', '环境', '架构类型', 'CPU', '内存', '系统盘', '数据盘', '分区数量', '副本因子', 'Broker节点数', '适用场景', '用户规模', '推荐等级', '价格等级'];
  } else if (normalizedType.includes('ap')) {
    return ['配置名称', '环境', '架构类型', 'CPU', '内存', '系统盘', '数据盘', '并发用户数', '每秒请求数', '响应时间', '适用场景', '用户规模', '推荐等级', '价格等级'];
  }

  return ['配置名称', '环境', '架构类型', 'CPU', '内存', '系统盘', '数据盘', '连接数', '吞吐量', '响应时间', '适用场景', '用户规模', '推荐等级', '价格等级'];
}

function buildConfigRowData(config, typeName) {
  const normalizedType = typeName.toLowerCase();
  const rowData = {
    '配置名称': config.config_option_name || '',
    '环境': config.environment_name || '',
    '架构类型': config.architecture_type || '',
    '适用场景': config.scenario_usage || '',
    '用户规模': config.scenario_user_scale || '',
    '推荐等级': config.recommendation_level || '',
    '价格等级': config.price_level || ''
  };

  if (normalizedType.includes('mysql') || normalizedType.includes('数据库')) {
    // 解析MySQL性能数据：performance_throughput格式为"800-2,000 / 2,000-4,000"
    let dailyQps = '', peakQps = '';
    if (config.performance_throughput) {
      const parts = config.performance_throughput.split('/').map(p => p.trim());
      dailyQps = parts[0] || '';
      peakQps = parts[1] || '';
    }

    Object.assign(rowData, {
      'CPU': config.resource_cpu_detail || '',
      '内存': config.resource_memory_detail || '',
      '系统盘': config.resource_system_disk || '',
      '数据盘': config.resource_data_disk || '',
      '最大连接数': config.performance_concurrent || '',
      '日均QPS': dailyQps,
      '峰值QPS': peakQps
    });
  } else if (normalizedType.includes('rabbitmq')) {
    // RabbitMQ字段映射：field1=并发连接, field2=消息吞吐, field3=队列数量
    Object.assign(rowData, {
      'CPU': config.resource_cpu_detail || '',
      '内存': config.resource_memory_detail || '',
      '系统盘': config.resource_system_disk || '',
      '数据盘': config.resource_data_disk || '',
      '并发连接数': config.field1 || config.performance_concurrent || '',
      '消息吞吐量': config.field2 || config.performance_throughput || '',
      '队列数量': config.field3 || ''
    });
  } else if (normalizedType.includes('redis')) {
    Object.assign(rowData, {
      'CPU': config.resource_cpu_detail || '',
      '内存': config.resource_memory_detail || '',
      '系统盘': config.resource_system_disk || '',
      '数据盘': config.resource_data_disk || '',
      '最大连接数': config.max_connections || '',
      '每秒操作数': config.ops_per_second || '',
      '缓存命中率': config.hit_rate || ''
    });
  } else if (normalizedType.includes('kafka')) {
    Object.assign(rowData, {
      'CPU': config.resource_cpu_detail || '',
      '内存': config.resource_memory_detail || '',
      '系统盘': config.resource_system_disk || '',
      '数据盘': config.resource_data_disk || '',
      '分区数量': config.partition_count || '',
      '副本因子': config.replication_factor || '',
      'Broker节点数': config.broker_count || ''
    });
  } else if (normalizedType.includes('ap')) {
    Object.assign(rowData, {
      'CPU': config.resource_cpu_detail || '',
      '内存': config.resource_memory_detail || '',
      '系统盘': config.resource_system_disk || '',
      '数据盘': config.resource_data_disk || '',
      '并发用户数': config.concurrent_users || '',
      '每秒请求数': config.requests_per_second || '',
      '响应时间': config.response_time || ''
    });
  } else {
    Object.assign(rowData, {
      'CPU': config.resource_cpu_detail || '',
      '内存': config.resource_memory_detail || '',
      '系统盘': config.resource_system_disk || '',
      '数据盘': config.resource_data_disk || '',
      '连接数': config.performance_concurrent || '',
      '吞吐量': config.performance_throughput || '',
      '响应时间': config.performance_response || ''
    });
  }

  return rowData;
}

function setupColumnWidths(worksheet) {
  const widths = [20, 12, 15, 15, 15, 20, 20, 15, 15, 15, 20, 15, 12, 12];
  widths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });
}

function getTypeColor(typeName) {
  if (typeName.toLowerCase().includes('mysql') || typeName.toLowerCase().includes('数据库')) return 'FF4472C4';
  if (typeName.toLowerCase().includes('rabbitmq')) return 'FF70AD47';
  if (typeName.toLowerCase().includes('redis')) return 'FFFFC000';
  if (typeName.toLowerCase().includes('kafka')) return 'FFFF0000';
  if (typeName.toLowerCase().includes('ap')) return 'FF0070C0';
  return 'FF92D050';
}

function setupRequestsWorksheet(worksheet, requests) {
  worksheet.columns = [
    { header: '系统编号', key: 'systemCode', width: 15 },
    { header: '系统名称', key: 'systemName', width: 20 },
    { header: '模块名称', key: 'moduleName', width: 25 },
    { header: '担当', key: 'owner', width: 12 },
    { header: '类型', key: 'type', width: 15 },
    { header: '环境', key: 'environment', width: 12 },
    { header: '配置选项', key: 'configOption', width: 20 },
    { header: '节点数', key: 'nodeCount', width: 10 },
    { header: 'CPU', key: 'cpu', width: 10 },
    { header: '内存(GB)', key: 'memory', width: 12 },
    { header: '磁盘类型', key: 'diskType', width: 12 },
    { header: '系统盘(GB)', key: 'systemDisk', width: 15 },
    { header: '数据盘(GB)', key: 'dataDisk', width: 15 },
    { header: '总数据盘(GB)', key: 'totalDataDisk', width: 15 },
    { header: '总磁盘(GB)', key: 'totalDisk', width: 15 },
    { header: '状态', key: 'status', width: 12 },
    { header: '提交时间', key: 'submittedAt', width: 20 }
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;

  requests.forEach((request) => {
    const nodeCount = request.node_count || 1;
    const systemDisk = request.system_disk || 0;
    const dataDisk = request.data_disk || 0;
    const totalDataDisk = dataDisk * nodeCount;
    const totalDisk = (systemDisk + dataDisk) * nodeCount;

    worksheet.addRow({
      systemCode: request.system_code || '',
      systemName: request.system_name || '',
      moduleName: request.module_name || '',
      owner: request.owner || '',
      type: request.type || '',
      environment: request.environment || '',
      configOption: request.config_option || '',
      nodeCount: nodeCount,
      cpu: request.cpu || 0,
      memory: request.memory || 0,
      diskType: request.disk_type || '',
      systemDisk: systemDisk,
      dataDisk: dataDisk,
      totalDataDisk: totalDataDisk,
      totalDisk: totalDisk,
      status: getStatusText(request.status),
      submittedAt: formatDate(request.submitted_at)
    });
  });
}

function getStatusText(status) {
  const statusMap = { 'draft': '草稿', 'submitted': '已提交', 'approved': '已批准', 'rejected': '已拒绝' };
  return statusMap[status] || status;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const exportRequestsToExcel = async (requests, user) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('资源申请');

    worksheet.columns = [
      { header: '系统编号', key: 'systemCode', width: 15 },
      { header: '系统名称', key: 'systemName', width: 20 },
      { header: '模块名称', key: 'moduleName', width: 25 },
      { header: '担当', key: 'owner', width: 12 },
      { header: '类型', key: 'type', width: 15 },
      { header: '环境', key: 'environment', width: 12 },
      { header: '配置选项', key: 'configOption', width: 20 },
      { header: '节点数', key: 'nodeCount', width: 10 },
      { header: 'CPU', key: 'cpu', width: 10 },
      { header: '内存(GB)', key: 'memory', width: 12 },
      { header: '磁盘类型', key: 'diskType', width: 12 },
      { header: '系统盘(GB)', key: 'systemDisk', width: 15 },
      { header: '数据盘(GB)', key: 'dataDisk', width: 15 },
      { header: '总数据盘(GB)', key: 'totalDataDisk', width: 15 },
      { header: '总磁盘(GB)', key: 'totalDisk', width: 15 },
      { header: '状态', key: 'status', width: 12 },
      { header: '提交时间', key: 'submittedAt', width: 20 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, size: 12 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    requests.forEach((request) => {
      const nodeCount = request.node_count || 1;
      const systemDisk = request.system_disk || 0;
      const dataDisk = request.data_disk || 0;
      const totalDataDisk = dataDisk * nodeCount;
      const totalDisk = (systemDisk + dataDisk) * nodeCount;

      worksheet.addRow({
        systemCode: request.system_code || '',
        systemName: request.system_name || '',
        moduleName: request.module_name || '',
        owner: request.owner || '',
        type: request.type || '',
        environment: request.environment || '',
        configOption: request.config_option || '',
        nodeCount: nodeCount,
        cpu: request.cpu || 0,
        memory: request.memory || 0,
        diskType: request.disk_type || '',
        systemDisk: systemDisk,
        dataDisk: dataDisk,
        totalDataDisk: totalDataDisk,
        totalDisk: totalDisk,
        status: getStatusText(request.status),
        submittedAt: formatDate(request.submitted_at)
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  } catch (error) {
    console.error('导出Excel失败:', error);
    throw new Error('导出Excel文件失败');
  }
};

/**
 * 导出所有模块为多Sheet Excel文件
 */
const exportAllModulesToExcel = async (allData, user) => {
  try {
    const workbook = new ExcelJS.Workbook();

    // 创建用户需求Sheet（放在第一位）
    if (allData.userRequirements && allData.userRequirements.length > 0 && allData.categories) {
      const userRequirementWorksheet = workbook.addWorksheet('用户需求');
      setupUserRequirementsWorksheet(userRequirementWorksheet, allData.userRequirements, allData.categories);
    }

    // 创建容器申请Sheet
    if (allData.container && allData.container.length > 0) {
      const containerWorksheet = workbook.addWorksheet('容器申请');
      setupContainerWorksheet(containerWorksheet, allData.container);
    }

    // 创建虚拟机申请Sheet
    if (allData.vm && allData.vm.length > 0) {
      const vmWorksheet = workbook.addWorksheet('虚拟机申请');
      setupVMWorksheet(vmWorksheet, allData.vm);
    }

    // 创建OBS申请Sheet
    if (allData.obs && allData.obs.length > 0) {
      const obsWorksheet = workbook.addWorksheet('OBS申请');
      setupObsWorksheet(obsWorksheet, allData.obs);
    }

    // 创建SFS申请Sheet
    if (allData.sfs && allData.sfs.length > 0) {
      const sfsWorksheet = workbook.addWorksheet('SFS申请');
      setupSfsWorksheet(sfsWorksheet, allData.sfs);
    }

    // 创建权限申请Sheet
    if (allData.permission && allData.permission.length > 0) {
      const permissionWorksheet = workbook.addWorksheet('权限申请');
      setupPermissionWorksheet(permissionWorksheet, allData.permission);
    }

    // 创建网络策略申请Sheet
    if (allData.networkPolicy && allData.networkPolicy.length > 0) {
      const networkPolicyWorksheet = workbook.addWorksheet('网络策略申请');
      setupNetworkPolicyWorksheet(networkPolicyWorksheet, allData.networkPolicy);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;

  } catch (error) {
    console.error('导出所有模块Excel失败:', error);
    throw new Error('导出所有模块Excel文件失败');
  }
};

/**
 * 设置容器申请工作表
 */
function setupContainerWorksheet(worksheet, requests) {
  worksheet.columns = [
    { header: '系统代码', key: 'systemCode', width: 15 },
    { header: '供应商', key: 'supplier', width: 15 },
    { header: '应用英文名', key: 'appName', width: 25 },
    { header: '应用描述', key: 'appDesc', width: 30 },
    { header: '实例数', key: 'instanceCount', width: 10 },
    { header: '单CPU', key: 'cpuPerInstance', width: 10 },
    { header: '单内存(GB)', key: 'memoryPerInstance', width: 12 },
    { header: '总CPU', key: 'totalCpu', width: 10 },
    { header: '总内存(GB)', key: 'totalMemory', width: 12 },
    { header: '环境', key: 'environment', width: 12 },
    { header: '状态', key: 'status', width: 12 },
    { header: '提交时间', key: 'submittedAt', width: 20 },
    { header: '申请人', key: 'applicant', width: 15 }
  ];

  setupHeaderStyle(worksheet);

  requests.forEach((request) => {
    worksheet.addRow({
      systemCode: request.system_code || '',
      supplier: request.supplier || '',
      appName: request.app_english_name || '',
      appDesc: request.app_description || '',
      instanceCount: request.instance_count || 0,
      cpuPerInstance: request.cpu_per_instance || 0,
      memoryPerInstance: request.memory_per_instance_gb || 0,
      totalCpu: request.total_cpu || 0,
      totalMemory: request.total_memory_gb || 0,
      environment: request.environment_name || '',
      status: getStatusText(request.status),
      submittedAt: formatDate(request.submitted_at),
      applicant: request.applicant || ''
    });
  });
}

/**
 * 设置虚拟机申请工作表
 */
function setupVMWorksheet(worksheet, requests) {
  worksheet.columns = [
    { header: '系统编号', key: 'systemCode', width: 15 },
    { header: '系统名称', key: 'systemName', width: 20 },
    { header: '模块名称', key: 'moduleName', width: 25 },
    { header: '担当', key: 'owner', width: 12 },
    { header: '类型', key: 'type', width: 15 },
    { header: '环境', key: 'environment', width: 12 },
    { header: '配置选项', key: 'configOption', width: 20 },
    { header: '节点数', key: 'nodeCount', width: 10 },
    { header: 'CPU', key: 'cpu', width: 10 },
    { header: '内存(GB)', key: 'memory', width: 12 },
    { header: '系统盘(GB)', key: 'systemDisk', width: 15 },
    { header: '数据盘(GB)', key: 'dataDisk', width: 15 },
    { header: '总数据盘(GB)', key: 'totalDataDisk', width: 15 },
    { header: '总磁盘(GB)', key: 'totalDisk', width: 15 },
    { header: '状态', key: 'status', width: 12 },
    { header: '提交时间', key: 'submittedAt', width: 20 },
    { header: '申请人', key: 'applicantName', width: 15 }
  ];

  setupHeaderStyle(worksheet);

  requests.forEach((request) => {
    const nodeCount = request.node_count || 1;
    const systemDisk = request.system_disk || 0;
    const dataDisk = request.data_disk || 0;
    const totalDataDisk = dataDisk * nodeCount;
    const totalDisk = (systemDisk + dataDisk) * nodeCount;

    worksheet.addRow({
      systemCode: request.system_code || '',
      systemName: request.system_name || '',
      moduleName: request.module_name || '',
      owner: request.owner || '',
      type: request.type || '',
      environment: request.environment || '',
      configOption: request.config_option || '',
      nodeCount: nodeCount,
      cpu: request.cpu || 0,
      memory: request.memory || 0,
      systemDisk: systemDisk,
      dataDisk: dataDisk,
      totalDataDisk: totalDataDisk,
      totalDisk: totalDisk,
      status: getStatusText(request.status),
      submittedAt: formatDate(request.submitted_at),
      applicantName: request.applicant_name || ''
    });
  });
}

/**
 * 设置OBS申请工作表
 */
function setupObsWorksheet(worksheet, requests) {
  worksheet.columns = [
    { header: '系统名称', key: 'systemName', width: 20 },
    { header: '桶名称', key: 'bucketName', width: 25 },
    { header: '应用所属业务', key: 'businessName', width: 20 },
    { header: '容量(GB)', key: 'capacity', width: 12 },
    { header: 'AK/SK数量', key: 'akSkCount', width: 12 },
    { header: '使用时间', key: 'usageDuration', width: 12 },
    { header: '环境', key: 'environment', width: 12 },
    { header: '状态', key: 'status', width: 12 },
    { header: '提交时间', key: 'submittedAt', width: 20 },
    { header: '申请人', key: 'applicant', width: 15 }
  ];

  setupHeaderStyle(worksheet);

  requests.forEach((request) => {
    worksheet.addRow({
      systemName: request.system_name || '',
      bucketName: request.bucket_name || '',
      businessName: request.business_name || '',
      capacity: request.capacity_size_gb || 0,
      akSkCount: request.ak_sk_count || 0,
      usageDuration: request.usage_duration || '',
      environment: request.environment_name || '',
      status: getStatusText(request.status),
      submittedAt: formatDate(request.submitted_at),
      applicant: request.applicant || ''
    });
  });
}

/**
 * 设置SFS申请工作表
 */
function setupSfsWorksheet(worksheet, requests) {
  worksheet.columns = [
    { header: '系统名称', key: 'systemName', width: 20 },
    { header: 'SFS名称', key: 'sfsName', width: 25 },
    { header: '应用所属业务', key: 'businessName', width: 20 },
    { header: '容量(GB)', key: 'capacity', width: 12 },
    { header: '使用时间', key: 'usageDuration', width: 12 },
    { header: '环境', key: 'environment', width: 12 },
    { header: '状态', key: 'status', width: 12 },
    { header: '提交时间', key: 'submittedAt', width: 20 },
    { header: '申请人', key: 'applicant', width: 15 }
  ];

  setupHeaderStyle(worksheet);

  requests.forEach((request) => {
    worksheet.addRow({
      systemName: request.system_name || '',
      sfsName: request.sfs_name || '',
      businessName: request.business_name || '',
      capacity: request.capacity_size_gb || 0,
      usageDuration: request.usage_duration || '',
      environment: request.environment_name || '',
      status: getStatusText(request.status),
      submittedAt: formatDate(request.submitted_at),
      applicant: request.applicant || ''
    });
  });
}

/**
 * 设置权限申请工作表
 */
function setupPermissionWorksheet(worksheet, requests) {
  worksheet.columns = [
    { header: '域账号', key: 'domainAccount', width: 15 },
    { header: '姓名', key: 'name', width: 15 },
    { header: '手机号码', key: 'phone', width: 15 },
    { header: '邮箱', key: 'email', width: 25 },
    { header: '申请权限', key: 'permissions', width: 40 },
    { header: '状态', key: 'status', width: 12 },
    { header: '提交时间', key: 'submittedAt', width: 20 },
    { header: '申请人', key: 'applicantName', width: 15 }
  ];

  setupHeaderStyle(worksheet);

  requests.forEach((request) => {
    worksheet.addRow({
      domainAccount: request.domain_account || '',
      name: request.name || '',
      phone: request.phone || '',
      email: request.email || '',
      permissions: formatPermissions(request.permissions),
      status: getStatusText(request.status),
      submittedAt: formatDate(request.submitted_at),
      applicantName: request.applicant_name || ''
    });
  });
}

/**
 * 设置网络策略申请工作表
 */
function setupNetworkPolicyWorksheet(worksheet, requests) {
  worksheet.columns = [
    { header: '环境', key: 'environment', width: 12 },
    { header: '源资产编号', key: 'sourceAssetCode', width: 15 },
    { header: '源地址', key: 'sourceAddress', width: 20 },
    { header: '目标资产', key: 'targetAsset', width: 20 },
    { header: '目标地址', key: 'targetAddress', width: 20 },
    { header: '所属系统', key: 'systemName', width: 20 },
    { header: '端口类型', key: 'portType', width: 12 },
    { header: '端口', key: 'port', width: 15 },
    { header: '状态', key: 'status', width: 12 },
    { header: '提交时间', key: 'submittedAt', width: 20 },
    { header: '申请人', key: 'applicantName', width: 15 }
  ];

  setupHeaderStyle(worksheet);

  requests.forEach((request) => {
    worksheet.addRow({
      environment: request.environment || '',
      sourceAssetCode: request.source_asset_code || '',
      sourceAddress: request.source_address || '',
      targetAsset: request.target_asset || '',
      targetAddress: request.target_address || '',
      systemName: request.system_name || '',
      portType: request.port_type || '',
      port: request.port || '',
      status: getStatusText(request.status),
      submittedAt: formatDate(request.submitted_at),
      applicantName: request.applicant_name || ''
    });
  });
}

/**
 * 设置表头样式
 */
function setupHeaderStyle(worksheet) {
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;
}

/**
 * 格式化权限显示
 */
function formatPermissions(permissions) {
  if (!permissions || typeof permissions !== 'object') return '';

  const permissionNames = {
    iam: 'IAM权限',
    container: '容器平台',
    pipeline: '流水线',
    log: '日志平台',
    borui: '博睿平台',
    pam: 'PAM权限',
    gitlab: 'GitLab代码库',
    vpn_gitlab: 'VPN访问GitLab'
  };

  const labels = [];
  Object.keys(permissions).forEach(key => {
    if (permissions[key] === true && permissionNames[key]) {
      labels.push(permissionNames[key]);
    }
  });

  return labels.join(', ');
}

function setupUserRequirementsWorksheet(worksheet, requirements, categories) {
  worksheet.columns = [
    { header: '需求单标题', key: 'title', width: 30 },
    { header: '申请人', key: 'applicantName', width: 15 },
    { header: '状态', key: 'status', width: 12 },
    { header: '大类', key: 'bigCategory', width: 20 },
    { header: '小类', key: 'subCategory', width: 20 },
    { header: '问题项', key: 'question', width: 30 },
    { header: '用户侧回答', key: 'answer', width: 40 },
    { header: '填写说明', key: 'description', width: 40 },
    { header: '参考示例', key: 'reference', width: 40 }
  ];

  setupHeaderStyle(worksheet);

  const flattenCategories = (nodes, bigCategory = '', subCategory = '') => {
    let rows = [];
    for (const node of nodes) {
      if (node.level === 1) {
        rows = rows.concat(flattenCategories(node.children || [], node.name, ''));
      } else if (node.level === 2) {
        rows = rows.concat(flattenCategories(node.children || [], bigCategory, node.name));
      } else if (node.level === 3) {
        rows.push({
          categoryId: node.id,
          bigCategory,
          subCategory,
          question: node.name,
          description: node.description || '',
          reference: node.reference || ''
        });
      }
    }
    return rows;
  };

  const categoryRows = flattenCategories(categories);

  requirements.forEach(requirement => {
    const answerMap = new Map((requirement.answers || []).map(a => [a.category_id, a.answer_text]));

    categoryRows.forEach(catRow => {
      worksheet.addRow({
        title: requirement.title || '',
        applicantName: requirement.applicant_name || '',
        status: getStatusText(requirement.status),
        bigCategory: catRow.bigCategory,
        subCategory: catRow.subCategory,
        question: catRow.question,
        answer: answerMap.get(catRow.categoryId) || '',
        description: catRow.description,
        reference: catRow.reference
      });
    });
  });
}

/**
 * 导出用户需求单为Excel
 * @param {Object} requirement 需求单对象（包含 answers 数组）
 * @param {Array} categories 分类树数组
 */
const exportUserRequirementsToExcel = async (requirement, categories) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('用户需求');

    setupUserRequirementsWorksheet(worksheet, [requirement], categories);

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  } catch (error) {
    console.error('导出用户需求Excel失败:', error);
    throw new Error('导出用户需求Excel文件失败');
  }
};

module.exports = { exportRequestsToExcel, exportAllRequestsWithDetails, exportAllModulesToExcel, exportUserRequirementsToExcel };
