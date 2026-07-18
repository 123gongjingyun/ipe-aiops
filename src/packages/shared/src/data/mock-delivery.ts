import type {
  DeliveryDetail,
  OrchestratedPlan,
  VMDeliveryDetail,
  DBDeliveryDetail,
  NetworkDeliveryDetail,
  PaaSDeliveryDetail,
  MiddlewareDeliveryDetail,
  MonitorDeliveryDetail,
  SecurityDeliveryDetail,
  BackupDeliveryDetail,
  LoggingDeliveryDetail,
  InternetAppDeployDetail,
  NetworkChainNode,
  TargetEnv,
  AppType,
} from '../types';

// ===== Mock data templates (realistic, per spec Section 8.2) =====

const mockVM: VMDeliveryDetail = {
  type: 'vm',
  asset: { assetId: 'BJ-VM-2026-00421', location: '北京亦庄 DC2 / 机柜 A12-03', rackUnit: 'U24' },
  network: {
    hostname: 'vm-app-prod-01',
    ip: '10.20.30.41',
    subnet: '255.255.255.0',
    gateway: '10.20.30.1',
    vlan: 'VLAN-2030',
  },
  spec: {
    cpu: '4 vCPU',
    memory: '8 GB',
    systemDisk: '50 GB SSD',
    dataDisk: '200 GB SSD',
    os: 'CentOS 7.9 x86_64',
  },
  integrations: {
    pam: { status: 'active', url: 'https://pam.internal/ssh/10.20.30.41' },
    monitor: { status: 'active', url: 'https://grafana.internal/d/vm-001' },
    logging: { status: 'active', url: 'https://kibana.internal/app/kibana#/discover' },
    backup: { status: 'active', detail: '每日 02:00 增量备份' },
    security: { status: 'active', detail: 'Agent v3.2 已安装' },
  },
};

const mockDB: DBDeliveryDetail = {
  type: 'db',
  asset: { assetId: 'BJ-DB-2026-00187', instance: 'mysql-prod-001' },
  connection: { host: '10.20.30.50', port: 3306, schema: 'app_production', charset: 'utf8mb4' },
  ha: { mode: '主从', primary: '10.20.30.50', secondary: '10.20.30.51' },
  accounts: [
    { name: 'app_readonly', privilege: 'SELECT' },
    { name: 'app_readwrite', privilege: 'SELECT, INSERT, UPDATE, DELETE' },
  ],
  integrations: {
    monitor: { status: 'active', url: 'https://grafana.internal/d/mysql-001' },
    backup: { status: 'active', detail: '每日 01:00 全量 + 实时 binlog' },
    logging: { status: 'active', detail: '慢查询日志 > 1s' },
    security: { status: 'active', detail: '审计插件已启用' },
    pam: { status: 'disabled' },
  },
};

const mockNetwork: NetworkDeliveryDetail = {
  type: 'network',
  connection: { vip: '10.20.30.100', domain: 'app.internal.example.com', protocol: 'HTTP/HTTPS', port: 443 },
  firewall: {
    rules: [
      { source: '10.0.0.0/8', target: '10.20.30.100:443', action: 'ALLOW' },
      { source: '172.16.0.0/12', target: '10.20.30.100:443', action: 'ALLOW' },
      { source: '0.0.0.0/0', target: '10.20.30.100:22', action: 'DENY' },
    ],
  },
  integrations: {
    pam: { status: 'disabled' },
    monitor: { status: 'active', url: 'https://grafana.internal/d/f5-pool-001' },
    logging: { status: 'active', detail: '访问日志已接入 ELK' },
    backup: { status: 'disabled' },
    security: { status: 'active', detail: 'WAF 规则已绑定' },
  },
};

const mockPaas: PaaSDeliveryDetail = {
  type: 'paas',
  cluster: { name: 'k8s-prod-01', apiServer: 'https://10.20.10.10:6443', version: 'v1.28.6' },
  namespace: { name: 'prod-order', nodeCount: 3, resourceQuota: 'CPU: 8C / Memory: 16Gi / Pods: 50' },
  integrations: {
    pam: { status: 'active', url: 'https://pam.internal/k8s/k8s-prod-01' },
    monitor: { status: 'active', url: 'https://grafana.internal/d/k8s-cluster' },
    logging: { status: 'active', url: 'https://kibana.internal/app/kibana#/discover' },
    backup: { status: 'active', detail: 'etcd 每小时快照' },
    security: { status: 'active', detail: 'RBAC 已启用，Pod Security Standards enforced' },
  },
};

const mockMiddleware: MiddlewareDeliveryDetail = {
  type: 'middleware',
  connection: { url: '10.20.30.60', port: 5672, protocol: 'AMQP' },
  management: { console: 'http://10.20.30.60:15672', username: 'admin' },
  topology: {
    exchanges: ['order.exchange', 'order.retry.exchange'],
    queues: ['order.process', 'order.callback', 'order.dead-letter'],
    topics: [],
  },
  integrations: {
    pam: { status: 'disabled' },
    monitor: { status: 'active', url: 'https://grafana.internal/d/rabbitmq-001' },
    logging: { status: 'active', detail: '队列操作日志已采集' },
    backup: { status: 'active', detail: '队列定义每日导出' },
    security: { status: 'active', detail: 'TLS 加密已启用' },
  },
};

const mockMonitor: MonitorDeliveryDetail = {
  type: 'monitor',
  grafana: { url: 'https://grafana.internal/d/overview', dashboard: 'IPE Overview Dashboard' },
  prometheus: { url: 'http://10.20.10.20:9090', targets: 42 },
  alerts: [
    { name: 'CPU High', condition: 'cpu_usage > 80% for 5m', channel: '钉钉群 + 邮件' },
    { name: 'Memory Critical', condition: 'mem_usage > 90% for 3m', channel: '钉钉群 + 邮件 + 电话' },
    { name: 'Disk Warning', condition: 'disk_usage > 85% for 10m', channel: '钉钉群' },
  ],
};

const mockSecurity: SecurityDeliveryDetail = {
  type: 'security',
  waf: { status: '已启用', rules: 127 },
  scan: { reportUrl: 'https://security.internal/report/2026-04-25', riskLevel: '低风险（2个提示项）', lastScan: '2026-04-25' },
  ssl: { domain: '*.internal.example.com', issuer: 'DigiCert', expiry: '2027-04-25' },
};

const mockBackup: BackupDeliveryDetail = {
  type: 'backup',
  policy: { schedule: '每日全量 02:00 + 增量每4小时', retention: '全量30天 / 增量7天', storage: 'NAS /backup/prod-order/' },
  lastBackup: { time: '2026-04-25 02:00:00', size: '4.2 GB', status: '成功' },
};

const mockLogging: LoggingDeliveryDetail = {
  type: 'logging',
  agent: { name: 'Filebeat', version: '8.12.0', status: 'running' },
  cluster: { esNodes: 3, kibanaUrl: 'https://kibana.internal', indexPattern: 'prod-order-*' },
};

// ===== Keyword-to-type mapping =====

type DeliveryType = 'db' | 'vm' | 'network' | 'paas' | 'middleware' | 'monitor' | 'security' | 'backup' | 'logging';

const SERVICE_ALIAS_MAP: Record<string, DeliveryType> = {
  '容器集群配置(DCE4)': 'paas',
  '容器集群配置(DCE5)': 'paas',
  '容器资源配置': 'paas',
  '流水线平台(DCS)': 'paas',
  '代码仓库(GitLab)': 'paas',
  '私服库(Nexus)': 'paas',
  '配置中心(Apollo)': 'paas',
  '注册中心(Eureka)': 'paas',
  '任务调度(XXL-Job)': 'paas',
  '代码检测(SonarQube)': 'paas',
  'Redis部署': 'db',
  '云中间件开通': 'middleware',
  '云中间件变更': 'middleware',
  'MQ部署': 'middleware',
  'Kafka部署': 'middleware',
  'Elasticsearch部署': 'logging',
  'HA部署': 'middleware',
  'Nginx部署': 'middleware',
  'Tomcat部署': 'middleware',
  '日志接入(EFK)': 'logging',
  '监控(Grafana)': 'monitor',
  '对象存储配置': 'backup',
  '文件存储配置': 'backup',
  'Linux服务器构筑': 'vm',
  'Windows服务器构筑': 'vm',
  'DB数据备份恢复': 'backup',
  'DB主从恢复': 'backup',
  'F5域名发布(互联网)': 'network',
  'F5负载均衡(内网)': 'network',
  'WAF防护(CDN)': 'security',
  'WAF防护(本地)': 'security',
  '证书配置': 'security',
  'DNS解析': 'network',
  'DNS私有域解析': 'network',
  '服务器上架': 'vm',
  '云二期服务器上架': 'vm',
  '网络设备上架': 'network',
  '存储设备上架': 'backup',
};

const KEYWORD_MAP: { keywords: string[]; type: DeliveryType }[] = [
  { keywords: ['数据库', 'DB', 'MySQL', 'PostgreSQL', 'Redis', 'Oracle', 'SQL Server', 'MongoDB'], type: 'db' },
  { keywords: ['虚拟化', 'VM', '服务器', 'ECS', '主机', '计算'], type: 'vm' },
  { keywords: ['网络', 'LB', '负载', 'F5', '均衡', 'CDN', 'DNS'], type: 'network' },
  { keywords: ['PaaS', '容器', 'K8S', 'Kubernetes', '集群', 'Ingress'], type: 'paas' },
  { keywords: ['中间件', '队列', 'RabbitMQ', 'Kafka', 'RocketMQ'], type: 'middleware' },
  { keywords: ['监控', 'Grafana', 'Prometheus', 'Zabbix', '可观测'], type: 'monitor' },
  { keywords: ['安全', 'WAF', '扫描', '防火墙', 'SSL', 'IDS', 'IPS'], type: 'security' },
  { keywords: ['备份', '快照', '归档'], type: 'backup' },
  { keywords: ['日志', 'ELK', 'Filebeat', 'Logstash'], type: 'logging' },
];

function matchType(name: string): DeliveryType | null {
  if (SERVICE_ALIAS_MAP[name]) {
    return SERVICE_ALIAS_MAP[name];
  }
  for (const { keywords, type } of KEYWORD_MAP) {
    if (keywords.some((kw) => name.includes(kw))) {
      return type;
    }
  }
  return null;
}

const MOCK_MAP: Record<DeliveryType, DeliveryDetail> = {
  db: mockDB,
  vm: mockVM,
  network: mockNetwork,
  paas: mockPaas,
  middleware: mockMiddleware,
  monitor: mockMonitor,
  security: mockSecurity,
  backup: mockBackup,
  logging: mockLogging,
};

/**
 * Generate a delivery detail based on service name keyword matching.
 * Returns null if no keyword matches.
 */
export function generateDeliveryDetail(name: string): DeliveryDetail | null {
  const type = matchType(name);
  if (!type) return null;
  return MOCK_MAP[type];
}

// ===== Orchestrated plans per combo =====

const PLAN_COMBO_APP: OrchestratedPlan = {
  summary: '2 VM + 1 DB + 1 网络接入 + 全套集成',
  estimatedTime: '3-5 工作日',
  resources: [
    { type: 'vm', name: '应用服务器 A', spec: { cpu: '4 vCPU', memory: '8 GB', disk: '200 GB SSD', os: 'CentOS 7.9' }, purpose: '承载 Java Web 应用' },
    { type: 'vm', name: '应用服务器 B', spec: { cpu: '4 vCPU', memory: '8 GB', disk: '200 GB SSD', os: 'CentOS 7.9' }, purpose: '承载 Java Web 应用（冗余节点）' },
    { type: 'db', name: 'MySQL 主从', spec: { cpu: '4 vCPU', memory: '16 GB', disk: '500 GB SSD', engine: 'MySQL 8.0' }, purpose: '业务数据库，主从高可用' },
    { type: 'network', name: 'F5 负载均衡', spec: { vip: '10.20.30.100', protocol: 'HTTPS', port: '443' }, purpose: '流量分发与健康检查' },
  ],
  integrations: [
    { type: 'monitor', enabled: true, config: { dashboard: 'Grafana 应用总览', alertChannel: '钉钉群 + 邮件' } },
    { type: 'logging', enabled: true, config: { index: 'prod-app-*', retention: '热7天/温30天/冷90天' } },
    { type: 'backup', enabled: true, config: { schedule: '每日 02:00 全量', retention: '30天' } },
    { type: 'pam', enabled: true, config: { sshProxy: 'pam.internal', dbProxy: 'pam.internal' } },
    { type: 'security', enabled: true, config: { agent: 'v3.2', waf: '可选' } },
  ],
};

const PLAN_COMBO_TEST: OrchestratedPlan = {
  summary: '1 PaaS 集群 + 1 中间件 + 日志',
  estimatedTime: '1-2 工作日',
  resources: [
    { type: 'paas', name: 'K8S 测试集群', spec: { version: 'v1.28.6', nodes: '3', resourceQuota: 'CPU 8C / Memory 16Gi' }, purpose: '测试环境容器编排' },
    { type: 'middleware', name: 'Redis + RabbitMQ', spec: { redis: '6节点集群', rabbitmq: '3节点集群' }, purpose: '缓存与消息队列' },
  ],
  integrations: [
    { type: 'logging', enabled: true, config: { index: 'test-*', retention: '热3天/温7天' } },
    { type: 'monitor', enabled: true, config: { dashboard: 'Grafana 测试总览' } },
    { type: 'pam', enabled: false, config: {} },
    { type: 'backup', enabled: false, config: {} },
    { type: 'security', enabled: false, config: {} },
  ],
};

const PLAN_COMBO_DATA: OrchestratedPlan = {
  summary: '3 DB 节点 + 监控 + 备份',
  estimatedTime: '2-3 工作日',
  resources: [
    { type: 'db', name: 'PostgreSQL 主节点', spec: { cpu: '8 vCPU', memory: '32 GB', disk: '1 TB SSD', engine: 'PostgreSQL 16' }, purpose: '主写入节点' },
    { type: 'db', name: 'PostgreSQL 从节点 A', spec: { cpu: '8 vCPU', memory: '32 GB', disk: '1 TB SSD', engine: 'PostgreSQL 16' }, purpose: '只读副本 + 高可用' },
    { type: 'db', name: 'PostgreSQL 从节点 B', spec: { cpu: '8 vCPU', memory: '32 GB', disk: '1 TB SSD', engine: 'PostgreSQL 16' }, purpose: '只读副本 + 报表查询' },
  ],
  integrations: [
    { type: 'monitor', enabled: true, config: { dashboard: 'Grafana 数据库性能', alertChannel: '钉钉群 + 邮件' } },
    { type: 'backup', enabled: true, config: { schedule: '每日 01:00 全量 + 实时 WAL', retention: '全量30天' } },
    { type: 'logging', enabled: true, config: { slowQuery: '> 1s 记录' } },
    { type: 'security', enabled: true, config: { audit: '审计插件已启用' } },
    { type: 'pam', enabled: false, config: {} },
  ],
};

const PLAN_COMBO_HA: OrchestratedPlan = {
  summary: '2 VM + 1 DB + 1 网络 + 监控 + 备份 + 安全',
  estimatedTime: '5-7 工作日',
  resources: [
    { type: 'vm', name: '生产服务器 A（AZ-1）', spec: { cpu: '8 vCPU', memory: '16 GB', disk: '500 GB SSD', os: 'CentOS 7.9' }, purpose: '主可用区业务节点' },
    { type: 'vm', name: '生产服务器 B（AZ-2）', spec: { cpu: '8 vCPU', memory: '16 GB', disk: '500 GB SSD', os: 'CentOS 7.9' }, purpose: '备可用区容灾节点' },
    { type: 'db', name: 'MySQL 集群', spec: { cpu: '8 vCPU', memory: '32 GB', disk: '1 TB SSD', engine: 'MySQL 8.0', ha: '主主双写' }, purpose: '双活数据库集群' },
    { type: 'network', name: '主备 LB', spec: { vip: '10.20.30.200', protocol: 'HTTPS', port: '443', ha: 'Active-Standby' }, purpose: '多可用区流量分发' },
  ],
  integrations: [
    { type: 'monitor', enabled: true, config: { dashboard: 'Grafana 高可用总览', alertChannel: '钉钉群 + 邮件 + 电话' } },
    { type: 'logging', enabled: true, config: { index: 'prod-ha-*', retention: '热7天/温30天/冷180天' } },
    { type: 'backup', enabled: true, config: { schedule: '每4小时增量 + 每日全量', retention: '全量90天' } },
    { type: 'security', enabled: true, config: { waf: '已启用', vulnScan: '每周自动扫描', audit: '全量审计日志' } },
    { type: 'pam', enabled: true, config: { sshProxy: 'pam.internal', dbProxy: 'pam.internal', mfa: '强制 MFA' } },
  ],
};

const PLAN_MAP: Record<string, OrchestratedPlan> = {
  'combo-internet-app': PLAN_COMBO_APP,
  'combo-test': PLAN_COMBO_TEST,
  'combo-data': PLAN_COMBO_DATA,
  'combo-ha': PLAN_COMBO_HA,
};

/**
 * Generate a pre-set orchestrated plan for a given combo ID.
 * Returns a default plan if the combo ID is not recognized.
 */
export function generateOrchestratedPlan(comboId: string): OrchestratedPlan {
  return PLAN_MAP[comboId] ?? {
    summary: '自定义交付方案',
    estimatedTime: '待评估',
    resources: [],
    integrations: [],
  };
}

// ===== 互联网应用部署 - 网络链路编排 =====

export function generateDefaultChainNodes(cdnEnabled: boolean): NetworkChainNode[] {
  const nodes: NetworkChainNode[] = [
    { id: 'cdn', name: 'CDN', type: 'cdn', required: false, deliveryMode: 'ai', status: 'pending', label: 'CNAME 接入', config: { provider: '阿里云CDN', domain: '待配置' } },
    { id: 'f5', name: 'F5 负载均衡', type: 'f5', required: true, deliveryMode: 'manual', status: 'pending', label: '集成DNS', config: { vip: '10.1.2.30', port: '443', domain: '待配置' } },
    { id: 'waf', name: '外网防火墙', type: 'waf', required: true, deliveryMode: 'manual', status: 'pending', label: 'WAF/IDS/IPS', config: { policy: '标准Web防护' } },
    { id: 'internal-router', name: '内部路由', type: 'internal-router', required: true, deliveryMode: 'ai', status: 'pending', label: 'Nginx', config: { upstream: '10.2.3.15:8080', protocol: 'HTTP' } },
    { id: 'internal-fw', name: '内网防火墙', type: 'internal-fw', required: true, deliveryMode: 'manual', status: 'pending', label: '端口策略', config: { ports: '8080,3306,6379' } },
    { id: 'cloud-access', name: '云二期接入', type: 'cloud-access', required: true, deliveryMode: 'ai', status: 'pending', label: '安全组/ELB', config: { elb: '10.3.2.25', securityGroup: 'sg-web-prod' } },
    { id: 'container', name: '容器', type: 'container', required: true, deliveryMode: 'ai', status: 'pending', label: 'Ingress', config: { ingress: '待配置', frontend: '×2', backend: '×2' } },
    { id: 'vm', name: '虚拟机', type: 'vm', required: true, deliveryMode: 'ai', status: 'pending', label: '数据层', config: { mysql: ':3306', redis: ':6379' } },
  ];
  return cdnEnabled ? nodes : nodes.filter(n => n.type !== 'cdn');
}

export function generateInternetAppDetail(
  appName: string,
  system: string,
  targetEnv: string,
  appType: string,
  businessDomain: string,
  domain: string,
  ports: string,
  cdnEnabled: boolean,
): InternetAppDeployDetail {
  const isProd = targetEnv === 'PROD';
  const needsFrontend = appType !== 'API服务';

  const chain = generateDefaultChainNodes(cdnEnabled);
  chain.forEach(n => {
    if (n.type === 'f5') n.config.domain = domain;
    if (n.type === 'container') {
      n.config.frontend = needsFrontend ? '×2' : '跳过';
    }
  });

  return {
    appName,
    system,
    targetEnv: targetEnv as TargetEnv,
    appType: appType as AppType,
    businessDomain,
    cloudInfra: { platform: '云二期', vpc: isProd ? 'vpc-prod-01' : 'vpc-dev-01', subnet: isProd ? 'subnet-app-01' : 'subnet-dev-01' },
    backendContainer: { cpu: isProd ? 4 : 2, memory: isProd ? 8 : 4, instances: 2 },
    frontendContainer: needsFrontend ? { cpu: isProd ? 2 : 1, memory: isProd ? 4 : 2, instances: 2 } : undefined,
    mysql: {
      spec: isProd ? '4核 8G' : '2核 4G',
      storage: isProd ? '100G SSD' : '50G SSD',
      version: 'MySQL 8.0',
      ha: isProd ? '主从复制' : '单机',
      vpc: isProd ? 'vpc-db-01' : 'vpc-dev-01',
      subnet: isProd ? 'subnet-db-01' : 'subnet-db-dev-01',
    },
    redis: {
      spec: isProd ? '2核 4G' : '1核 2G',
      memory: isProd ? '4GB' : '2GB',
      version: 'Redis 7.0',
      ha: isProd ? '哨兵模式' : '单机',
      vpc: isProd ? 'vpc-db-01' : 'vpc-dev-01',
      subnet: isProd ? 'subnet-db-01' : 'subnet-db-dev-01',
    },
    domain,
    ports,
    cdnEnabled,
    networkChain: chain,
  };
}
