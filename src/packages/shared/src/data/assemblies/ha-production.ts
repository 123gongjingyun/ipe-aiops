import type { ServiceAssemblySpec } from "../../types";

export const haProductionAssembly: ServiceAssemblySpec = {
  formConfig: {
    questions: [
      { key: "bizType", label: "业务系统类型？", type: "select", options: ["交易系统", "支付系统", "核心业务", "合规系统"] },
      { key: "rto", label: "RTO 要求？", type: "select", options: ["< 5分钟", "< 30分钟", "< 1小时", "< 4小时"] },
    ],
    extras: [
      { key: "backup", label: "自动备份", default: true },
      { key: "waf", label: "WAF 防护", default: true },
      { key: "dr", label: "容灾切换", default: true },
      { key: "audit", label: "审计日志", default: true },
    ],
    aiConfig: "多可用区部署 + 主备LB + DB集群 + WAF + 自动容灾 + 实时监控",
  },
  deliveryFlow: [
    {
      id: "net",
      label: "负载均衡配置",
      description: "配置 F5 负载均衡实现流量分发",
      order: 1,
      dependencies: [],
      services: [
        { specId: "net-f5-lb", required: true },
      ],
    },
    {
      id: "vm",
      label: "计算节点部署",
      description: "部署多可用区云主机计算节点",
      order: 2,
      dependencies: ["net"],
      services: [
        { specId: "cloud-vm-private", required: true },
      ],
    },
    {
      id: "db",
      label: "数据库集群",
      description: "AI 自动创建高可用数据库集群",
      order: 2,
      dependencies: ["net"],
      services: [
        { specId: "cloud-db-create", required: true },
      ],
    },
    {
      id: "security",
      label: "安全防护",
      description: "配置本地 WAF 应用层安全防护",
      order: 3,
      dependencies: ["vm"],
      services: [
        { specId: "net-waf-local", required: true },
      ],
    },
    {
      id: "monitor",
      label: "监控接入",
      description: "接入 Grafana 实时监控和告警",
      order: 3,
      dependencies: ["vm", "db"],
      services: [
        { specId: "paas-grafana", required: true },
      ],
    },
    {
      id: "backup",
      label: "备份策略",
      description: "配置数据库自动备份和容灾恢复策略",
      order: 4,
      dependencies: ["db"],
      services: [
        { specId: "db-backup", required: true },
      ],
    },
  ],
};
