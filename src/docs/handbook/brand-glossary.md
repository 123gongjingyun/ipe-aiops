# 品牌术语表

IPE/AIOps 平台品牌语言规范，所有 UI 文本、文档、代码中的术语必须遵循本规范。

> 本表是铁律「术语命名一致」的权威来源。新增术语须先录入本表再使用。

---

## 品牌体系

| 标准名 | 英文全称 | 曾用名 | 适用场景 |
|--------|---------|--------|---------|
| IPE/AIOps 服务平台 | IPE/AIOps Service Platform | IPE 交付平台 | 产品官方名称，用于标题、导航、文档 |
| GTMC 数智化交付平台 | — | — | 产品展示名（中文长名），用于 Hero 标题、About |
| GTMC IT基础服务智能交付中心 | — | 基础设施智能交付的统一中枢 | 产品 Slogan，用于 Hero 副标题 |
| Infrastructure Platform & Engineering & AI Operations | — | Infrastructure Platform & Engineering | 英文全称，用于 About 页面、技术文档 |
| AI-Native 工程交付与运营统一体系 | — | — | 平台定位语，用于 Hero、About、技术文档 |

---

## 子产品命名

| 子产品 | 标准名（中） | 标准名（英） | 曾用名 |
|--------|------------|------------|--------|
| 上层门户 | IPE/AIOps 服务门户 | IPE/AIOps Service Portal | AIOps 服务门户、AIOps Service Portal |
| 下层控制台 | IPE/AIOps 服务运营中心 | IPE/AIOps Service Center | AIOps 服务运营中心、AIOps Service Center |
| Portal 英文展示名 | — | GTMC AI-Native Delivery Portal | Portal Hero 英文标签 |
| Center 英文展示名 | — | GTMC AI-Native Delivery Center | Center Hero 英文标签 |
| Portal 副标题展示名 | GTMC 数智化交付门户 | — | Portal Hero 副标题 |
| Center 副标题展示名 | GTMC 数智化交付中心 | — | Center Hero 副标题 |

### 简称规则

- 正式场合使用完整标准名
- 上下文明确时，可简称"服务门户"和"运营中心"
- 代码包名保持 `@aiops/service-portal` 和 `@aiops/service-center` 不变

---

## 角色术语

| 标准名 | 曾用名 | 释义 | 对应入口 |
|--------|--------|------|---------|
| 业务/应用担当（应用供应商） | 业务担当 | 服务需求方，提出基础设施交付需求的人员和团队 | 服务门户 |
| 基础担当（基础供应商） | 技术担当 | 服务交付方，执行基础设施交付和运营的人员和团队 | 运营中心 |

辅助角色：

| 角色 | 释义 | 对应位置 |
|------|------|---------|
| 数字化架构师 | 顶层架构规划，连接业务需求与技术交付 | 架构图 |
| 基础架构师 | 基础设施领域专家，深度技术交付 | Center 用户信息卡（`center-layout.tsx`） |

---

## 功能模块命名

| 标准名 | 曾用名 | 释义 |
|--------|--------|------|
| 快速开始（高频场景组合服务） | 快速开始 | 首页服务组合卡片区域，引导用户快速选择高频交付场景 |
| AI 智能编排层（8个高频场景+自定义编排场景一键交付） | AI 智能编排层 | 平台核心能力层，负责需求理解、方案生成、自动拆解 |
| 周边系统集成（规范内置/固化） | 周边系统集成 | 与 CMDB、监控、日志、备份、安全等外部系统的集成能力 |

衍生命名：

| 场景 | 标准命名 |
|------|---------|
| 能力矩阵中的集成概览 | 周边系统集成概览（规范内置/固化） |
| 工单详情中的集成状态 | 周边系统集成状态（规范内置/固化） |

---

## Slogan / 定位语

| 场景 | 文案 |
|------|------|
| 产品定位 | GTMC IT基础服务智能交付中心 |
| 产品愿景 | 从一句话需求到全自动化交付 |
| Portal Hero 副标题 | GTMC IT基础服务智能交付中心 |
| Center Hero 副标题 | 从技术交付到业务价值创造 |
| Center 标语 | 智能交付 · 价值驱动 · 持续运营 |

---

## 废弃术语替换

| 废弃术语 | 标准术语 | 影响范围 |
|---------|---------|---------|
| IPE 交付平台 | IPE/AIOps 服务平台 | 全局 |
| IPE交付平台 | IPE/AIOps 服务平台 | 全局 |
| Infrastructure Platform & Engineering（不含 & AI Operations） | Infrastructure Platform & Engineering & AI Operations | About 页面、技术文档 |
| 基础设施智能交付的统一中枢 | GTMC IT基础服务智能交付中心 | Hero 区域 |
| AIOps Service Portal | IPE/AIOps Service Portal | Portal Hero |
| AIOps Service Center | IPE/AIOps Service Center | Center Hero |
| AIOps 服务门户 | IPE/AIOps 服务门户 | HTML title |
| AIOps 服务运营中心 | IPE/AIOps 服务运营中心 | HTML title |
| 业务担当 → 服务门户 | 业务/应用担当（应用供应商） → 服务门户 | 架构图 |
| 技术担当 → 运营中心 | 基础担当（基础供应商） → 运营中心 | 架构图 |
| AI 智能编排层（无补充说明） | AI 智能编排层（8个高频场景+自定义编排场景一键交付） | 架构图 |
| 周边系统集成（无补充说明） | 周边系统集成（规范内置/固化） | 架构图、能力矩阵、工单详情 |
| 快速开始（无补充说明） | 快速开始（高频场景组合服务） | 首页 |

---

## 三条主线

| 主线 | 标准名 | 简称 | 释义 |
|------|--------|------|------|
| 主线 1 | AI-SDLC（应用与数据服务开发） | AI-SDLC | AI 嵌入需求→设计→开发→测试→运维全过程 |
| 主线 2 | IPE 平台服务交付 | IPE | 基础设施服务的标准化、自助化交付 |
| 主线 3 | AIOps/SRE 运行保障 | AIOps/SRE | 可观测性、可靠性、事件管理、发布管理、持续优化 |

---

## 五层架构

| 层级 | 标准名 | 简称 | 出现位置 |
|------|--------|------|---------|
| 统一入口 | IDP 统一数智化交付门户 | IDP 统一门户 | 架构图、About、背景文档 |
