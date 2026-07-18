import type { DeliveryDetail, Order } from '../types';

function pushSectionRows(rows: Array<[string, string, string]>, section: string, data: Record<string, string | number | boolean | undefined>) {
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null || String(value).trim() === '') continue;
    rows.push([section, key, String(value)]);
  }
}

function flattenDeliveryDetail(detail: DeliveryDetail): Array<[string, string, string]> {
  const rows: Array<[string, string, string]> = [];

  switch (detail.type) {
    case 'vm':
      pushSectionRows(rows, '资产信息', detail.asset);
      pushSectionRows(rows, '网络信息', detail.network);
      pushSectionRows(rows, '规格信息', detail.spec);
      pushSectionRows(rows, '集成状态', {
        PAM: detail.integrations.pam.status,
        监控: detail.integrations.monitor.status,
        日志: detail.integrations.logging.status,
        备份: detail.integrations.backup.status,
        安全: detail.integrations.security.status,
      });
      break;
    case 'db':
      pushSectionRows(rows, '资产信息', detail.asset);
      pushSectionRows(rows, '连接信息', detail.connection);
      pushSectionRows(rows, '高可用信息', detail.ha);
      detail.accounts.forEach((account, index) => {
        pushSectionRows(rows, `账号${index + 1}`, account);
      });
      pushSectionRows(rows, '集成状态', {
        PAM: detail.integrations.pam.status,
        监控: detail.integrations.monitor.status,
        日志: detail.integrations.logging.status,
        备份: detail.integrations.backup.status,
        安全: detail.integrations.security.status,
      });
      break;
    case 'network':
      pushSectionRows(rows, '连接信息', detail.connection);
      detail.firewall.rules.forEach((rule, index) => {
        pushSectionRows(rows, `防火墙规则${index + 1}`, rule);
      });
      pushSectionRows(rows, '集成状态', {
        PAM: detail.integrations.pam.status,
        监控: detail.integrations.monitor.status,
        日志: detail.integrations.logging.status,
        备份: detail.integrations.backup.status,
        安全: detail.integrations.security.status,
      });
      break;
    case 'paas':
      pushSectionRows(rows, '集群信息', detail.cluster);
      pushSectionRows(rows, '命名空间', detail.namespace);
      pushSectionRows(rows, '集成状态', {
        PAM: detail.integrations.pam.status,
        监控: detail.integrations.monitor.status,
        日志: detail.integrations.logging.status,
        备份: detail.integrations.backup.status,
        安全: detail.integrations.security.status,
      });
      break;
    case 'middleware':
      pushSectionRows(rows, '连接信息', detail.connection);
      pushSectionRows(rows, '管理信息', detail.management);
      pushSectionRows(rows, '拓扑信息', {
        exchanges: detail.topology.exchanges.join('；'),
        queues: detail.topology.queues.join('；'),
        topics: detail.topology.topics.join('；'),
      });
      pushSectionRows(rows, '集成状态', {
        PAM: detail.integrations.pam.status,
        监控: detail.integrations.monitor.status,
        日志: detail.integrations.logging.status,
        备份: detail.integrations.backup.status,
        安全: detail.integrations.security.status,
      });
      break;
    case 'monitor':
      pushSectionRows(rows, 'Grafana', detail.grafana);
      pushSectionRows(rows, 'Prometheus', detail.prometheus);
      detail.alerts.forEach((alert, index) => {
        pushSectionRows(rows, `告警规则${index + 1}`, alert);
      });
      break;
    case 'security':
      pushSectionRows(rows, 'WAF', detail.waf);
      pushSectionRows(rows, '扫描结果', detail.scan);
      pushSectionRows(rows, 'SSL证书', detail.ssl);
      break;
    case 'backup':
      pushSectionRows(rows, '备份策略', detail.policy);
      pushSectionRows(rows, '最近备份', detail.lastBackup);
      break;
    case 'logging':
      pushSectionRows(rows, '采集代理', detail.agent);
      pushSectionRows(rows, '日志集群', detail.cluster);
      break;
  }

  return rows;
}

export async function downloadDeliveryConfigExcel(order: Order) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IPE 交付门户';
  workbook.created = new Date();

  const overviewSheet = workbook.addWorksheet('交付总览');
  overviewSheet.addRow(['项目', '内容']);
  overviewSheet.addRow(['工单号', order.id]);
  overviewSheet.addRow(['服务名称', order.comboName]);
  overviewSheet.addRow(['当前状态', order.status]);
  overviewSheet.addRow(['创建时间', order.createdAt]);
  overviewSheet.addRow(['服务清单', order.services.join('、')]);

  if (order.internetAppDetail) {
    const internetSheet = workbook.addWorksheet('互联网应用配置');
    internetSheet.addRow(['模块', '字段', '值']);
    const detail = order.internetAppDetail;
    [
      ['应用信息', '应用名称', detail.appName],
      ['应用信息', '所属系统', detail.system],
      ['应用信息', '目标环境', String(detail.targetEnv)],
      ['应用信息', '应用类型', String(detail.appType)],
      ['应用信息', '业务域', detail.businessDomain],
      ['计算资源', '云平台', detail.cloudInfra.platform],
      ['计算资源', 'VPC', detail.cloudInfra.vpc],
      ['计算资源', '子网', detail.cloudInfra.subnet],
      ['计算资源', '后端容器CPU', String(detail.backendContainer.cpu)],
      ['计算资源', '后端容器内存', String(detail.backendContainer.memory)],
      ['计算资源', '后端容器实例数', String(detail.backendContainer.instances)],
      ['数据库', 'MySQL规格', detail.mysql.spec],
      ['数据库', 'MySQL存储', detail.mysql.storage],
      ['数据库', 'MySQL版本', detail.mysql.version],
      ['数据库', 'MySQL高可用', detail.mysql.ha],
      ['数据库', 'Redis规格', detail.redis.spec],
      ['数据库', 'Redis内存', detail.redis.memory],
      ['数据库', 'Redis版本', detail.redis.version],
      ['数据库', 'Redis高可用', detail.redis.ha],
      ['网络发布', '域名', detail.domain],
      ['网络发布', '端口', detail.ports],
      ['网络发布', 'CDN启用', detail.cdnEnabled ? '是' : '否'],
    ].forEach(row => internetSheet.addRow(row as [string, string, string]));

    if (detail.frontendContainer) {
      internetSheet.addRow(['计算资源', '前端容器CPU', String(detail.frontendContainer.cpu)]);
      internetSheet.addRow(['计算资源', '前端容器内存', String(detail.frontendContainer.memory)]);
      internetSheet.addRow(['计算资源', '前端容器实例数', String(detail.frontendContainer.instances)]);
    }

    detail.networkChain.forEach(node => {
      internetSheet.addRow(['网络链路', `${node.name}状态`, node.status]);
      Object.entries(node.config).forEach(([key, value]) => {
        internetSheet.addRow(['网络链路', `${node.name}.${key}`, value]);
      });
    });
  }

  const servicesSheet = workbook.addWorksheet('服务交付明细');
  servicesSheet.addRow(['服务', '状态', '模块', '字段', '值']);
  for (const service of order.serviceProgress) {
    if (!service.deliveryDetail) {
      servicesSheet.addRow([service.name, service.status, '说明', '交付详情', '当前服务暂无交付配置']);
      continue;
    }

    for (const [section, field, value] of flattenDeliveryDetail(service.deliveryDetail)) {
      servicesSheet.addRow([service.name, service.status, section, field, value]);
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${order.id}_交付配置.xlsx`;
  link.click();
}
