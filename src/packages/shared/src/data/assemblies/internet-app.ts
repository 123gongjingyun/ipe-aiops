import type { ServiceAssemblySpec } from "../../types";

export const internetAppAssembly: ServiceAssemblySpec = {
  formConfig: {
    questions: [],
    extras: [],
    aiConfig: "Web前后端容器 + MySQL主从 + Redis哨兵 + F5 + WAF + 全链路网络发布",
  },
  deliveryFlow: [
    {
      id: "net",
      label: "网络配置",
      description: "配置网络隔离策略和防火墙规则",
      order: 1,
      dependencies: [],
      services: [
        {
          specId: "net-fw",
          required: true,
          overrides: {
            protocol: "TCP",
            direction: "入站",
            integrations: { security: "active" },
          },
        },
        {
          specId: "net-isolate",
          required: true,
          overrides: {
            description: "生产测试隔离",
            urgency: "常规",
            integrations: { security: "active" },
          },
        },
      ],
    },
    {
      id: "paas",
      label: "容器集群分配",
      description: "AI 自动分配容器集群资源",
      order: 2,
      dependencies: ["net"],
      services: [
        {
          specId: "paas-dce4",
          required: true,
          overrides: {
            integrations: { monitor: "active", pam: "active", logging: "active" },
          },
        },
      ],
    },
    {
      id: "db",
      label: "数据库创建",
      description: "AI 自动创建数据库实例",
      order: 2,
      dependencies: ["net"],
      services: [
        {
          specId: "cloud-db-create",
          required: true,
          overrides: {
            engine: "MySQL",
            version: "8.0",
            integrations: { monitor: "active", pam: "active", backup: "active" },
          },
        },
      ],
    },
    {
      id: "mw",
      label: "中间件配置",
      description: "部署 Redis 哨兵模式缓存中间件",
      order: 3,
      dependencies: ["paas", "db"],
      services: [
        {
          specId: "mw-redis",
          required: true,
          overrides: {
            description: "哨兵模式缓存",
            urgency: "常规",
            integrations: { monitor: "active", pam: "active", logging: "active" },
          },
        },
      ],
    },
    {
      id: "domain",
      label: "域名发布",
      description: "配置 F5 域名映射和 ELB 负载均衡",
      order: 3,
      dependencies: ["paas"],
      services: [
        {
          specId: "net-f5-domain",
          required: true,
          overrides: {
            urgency: "常规",
            integrations: { security: "active" },
          },
        },
        {
          specId: "net-elb",
          required: true,
          overrides: {
            urgency: "常规",
            integrations: { security: "active" },
          },
        },
      ],
    },
    {
      id: "security",
      label: "安全防护",
      description: "配置 WAF 防护和 CDN 加速策略",
      order: 4,
      dependencies: ["domain"],
      services: [
        {
          specId: "net-waf-cdn",
          required: true,
          overrides: {
            description: "互联网应用WAF防护",
            urgency: "常规",
            integrations: { security: "active" },
          },
        },
        {
          specId: "net-cdn",
          required: false,
          overrides: {},
        },
      ],
    },
  ],
};
