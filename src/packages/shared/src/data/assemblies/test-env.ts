import type { ServiceAssemblySpec } from "../../types";

export const testEnvAssembly: ServiceAssemblySpec = {
  formConfig: {
    questions: [
      { key: "appType", label: "测试什么类型的应用？", type: "select", options: ["微服务架构", "单体应用", "前后端分离", "数据管道"] },
      { key: "duration", label: "需要使用多久？", type: "select", options: ["1周", "1个月", "3个月", "长期"] },
    ],
    extras: [
      { key: "ci", label: "CI/CD 集成", default: true },
      { key: "logging", label: "日志采集", default: true },
    ],
    aiConfig: "K8S 集群(3节点) + Redis + RabbitMQ + ELK 日志",
  },
  deliveryFlow: [
    {
      id: "paas",
      label: "PaaS集群",
      description: "AI 自动创建 K8S 容器集群环境",
      order: 1,
      dependencies: [],
      services: [
        { specId: "paas-dce4", required: true },
      ],
    },
    {
      id: "mw",
      label: "中间件部署",
      description: "部署 Redis 缓存和 RabbitMQ 消息队列",
      order: 2,
      dependencies: ["paas"],
      services: [
        { specId: "mw-redis", required: true },
        { specId: "mw-mq", required: true },
      ],
    },
    {
      id: "logging",
      label: "日志接入",
      description: "部署 EFK 日志采集和检索平台",
      order: 3,
      dependencies: ["paas"],
      services: [
        { specId: "paas-efk", required: true },
      ],
    },
  ],
};
