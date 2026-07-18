import type { ServiceAssemblySpec } from "../../types";

export const dataPlatformAssembly: ServiceAssemblySpec = {
  formConfig: {
    questions: [
      { key: "dbType", label: "偏好什么数据库？", type: "select", options: ["PostgreSQL", "MySQL", "MongoDB", "ClickHouse"] },
      { key: "dataSize", label: "数据量级？", type: "select", options: ["< 100GB", "100GB-1TB", "1TB-10TB", "> 10TB"] },
    ],
    extras: [
      { key: "backup", label: "自动备份", default: true },
      { key: "monitor", label: "性能监控", default: true },
      { key: "readonly", label: "只读副本", default: false },
    ],
    aiConfig: "PostgreSQL×3(1主2从) + Grafana + Prometheus + 每日全量备份",
  },
  deliveryFlow: [
    {
      id: "db",
      label: "数据库部署",
      description: "AI 自动部署 PostgreSQL 数据库实例",
      order: 1,
      dependencies: [],
      services: [
        { specId: "db-pg", required: true },
      ],
    },
    {
      id: "monitor",
      label: "监控配置",
      description: "部署 Grafana 可视化监控面板",
      order: 2,
      dependencies: ["db"],
      services: [
        { specId: "paas-grafana", required: true },
      ],
    },
    {
      id: "backup",
      label: "备份策略",
      description: "配置数据库全量自动备份计划",
      order: 2,
      dependencies: ["db"],
      services: [
        { specId: "db-backup", required: true },
      ],
    },
  ],
};
