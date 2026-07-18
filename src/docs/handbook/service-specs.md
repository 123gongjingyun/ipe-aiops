# BOM 模型设计

Service Specs（服务规格体系）是 IT 服务 BOM 的完整类型定义与流程设计。

---

## 定位

Service Specs 是制造业 BOM（Bill of Materials）在 IT 服务领域的映射。正如汽车 BOM 定义了一辆车由哪些零部件组成、按什么流程组装，Service Specs 定义了 IT 服务由哪些原子能力组成、按什么流程交付。客户（汽车厂）对 BOM 有天然理解。

---

## 配置层类型定义

配置层以 `Spec` 后缀标识，定义"是什么"。

| 类型 | 说明 |
|------|------|
| `ServiceSpec` | 统一入口（discriminated union），服务目录管理一张表 |
| `AtomicServiceSpec` | 原子服务规格，最小服务单元（7 域 100+ 项），含 inputSchema/outputSchema/SLA/Flow |
| `ComboServiceSpec` | 组合服务规格，面向用户的一键交付组合，内嵌 ServiceAssemblySpec |
| `ServiceAssemblySpec` | 服务组装规格，编排多个原子服务的表单/流程/依赖/网络链路 |
| `ServiceSLASpec` | SLA 规格（金/银/铜），横切，附加在 ServiceSpec 上 |
| `ServiceFlowSpec` | 流程规格，定义状态机和流转规则，横切 |

### AtomicServiceSpec 二级分类

| 领域 (domain) | 分类 (category) | 示例服务 |
|---|---|---|
| compute | 云主机 | 虚拟机分配 |
| compute | 容器服务 | 容器实例分配 |
| database | 关系型数据库 | MySQL 实例分配 |
| database | 缓存服务 | Redis 实例分配 |
| network | 负载均衡 | SLB 配置 |
| network | CDN | CDN 加速配置 |
| middleware | 消息队列 | MQ 实例分配 |
| paas | 容器平台 | K8s 集群部署 |
| security | Web 安全 | WAF 配置 |
| dc | 机柜管理 | 机柜分配 |

---

## 运行时层类型定义

运行时层无 `Spec` 后缀，定义"发生了什么"。

| 类型 | 说明 |
|------|------|
| `ServiceOrder` | 服务工单，从 ServiceSpec 实例化（原子或组合均可生成） |
| `AtomicServiceInstance` | 原子服务实例，含 deliveryDetail/metric/flowRecord |
| `ServiceMetric` | SLA 实际监控指标 |
| `ServiceFlowRecord` | 流程执行记录 |

---

## 双路径申请

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ServiceSpec 统一入口                         │
├──────────────────────────┬──────────────────────────────────────────┤
│    路径 A：组合申请       │         路径 B：单服务申请                │
│                          │                                          │
│  ComboServiceSpec        │  AtomicServiceSpec                       │
│       │                  │       │                                  │
│       ▼                  │       ▼                                  │
│  ServiceAssemblySpec     │  inputSchema                             │
│       │                  │  渲染表单                                │
│       ▼                  │       │                                  │
│  渲染申请表单             │       ▼                                  │
│  （向导问题 + 可选项）    │  提交                                    │
│       │                  │       │                                  │
│       ▼                  │       ▼                                  │
│  提交                    │  ServiceOrder                            │
│       │                  │  （含 1 个 AtomicServiceInstance）        │
│       ▼                  │                                          │
│  ServiceOrder            │                                          │
│  （含 N 个               │                                          │
│   AtomicServiceInstance）│                                          │
└──────────────────────────┴──────────────────────────────────────────┘
```

---

## 数据管理层

采用混合模式：种子数据（TypeScript 文件）+ localStorage 运行时 + BroadcastChannel 跨应用同步。

| 层 | 机制 | 路径/标识 |
|----|------|-----------|
| 种子数据 | TypeScript 文件，按域拆分 | `shared/src/data/specs/`、`assemblies/`、`combos.ts` |
| 运行时存储 | localStorage | `ipe_service_specs` |
| 跨应用同步 | BroadcastChannel | `ipe_specs_sync` |

核心 API：

| 函数 | 用途 |
|------|------|
| `initSpecs()` | 从种子数据加载（首次）或从 localStorage 读取 |
| `getSpec(id)` | 按 ID 查询单个 ServiceSpec |
| `getSpecs(filter?)` | 按条件筛选 ServiceSpec 列表 |
| `getAtomicSpecs(domain?)` | 按领域查询 AtomicServiceSpec |
| `getComboSpecs()` | 查询全部 ComboServiceSpec |
| `createSpec(spec)` | 新增 ServiceSpec |
| `updateSpec(id, partial)` | 更新 ServiceSpec |
| `deleteSpec(id)` | 删除 ServiceSpec |

---

## Center 管理界面

Center 左侧导航新增「服务目录」顶级分组，含 5 个子菜单：

| 子菜单 | 页面内容 | 数据源 |
|--------|----------|--------|
| 全部服务 | 统一 ServiceSpec 列表，支持类型/领域筛选 | `getSpecs()` |
| 原子服务 | AtomicServiceSpec 列表，按 domain/category 分组 | `getAtomicSpecs()` |
| 组合服务 | ComboServiceSpec 列表 + Assembly 配置 | `getComboSpecs()` |
| SLA 管理 | ServiceSLASpec 预设等级管理 | SLA presets |
| 服务流程 | ServiceFlowSpec 配置和状态机编辑 | Flow specs |
