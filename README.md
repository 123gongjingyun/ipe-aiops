# project-mywayaiops-refactor-V2

`project-mywayaiops-refactor-V2` 不是一套独立平台，而是现网 `autoops-workspace` 中的一个业务功能模块：

- 对外入口：`/portal/`
- 对内入口：`/center/`
- 所属现网平台：`autoops-workspace`
- 现网主域名：`https://www.getpre.cn/`

当前仓库的职责是承载 **资源申请发起、材料整理、评审导出主线**，覆盖：

- 资源申请工作台
- 常见资源申请
- 资源申请单
- 完整服务目录
- 我的工单
- 帮助中心

---

## 一、现网关系

当前现网真实结构不是“本仓库单独对外提供网站”，而是：

```text
autoops-workspace（现网平台壳层）
├── 平台首页 https://www.getpre.cn/
├── Portal 模块入口 https://www.getpre.cn/portal/
├── Center 模块入口 https://www.getpre.cn/center/
└── 其他平台模块

project-mywayaiops-refactor-V2
├── 提供 /portal/ 前端产物
└── 提供 /center/ 前端产物
```

所以需要特别注意：

- `project-mywayaiops-refactor-V2` 只是 `autoops-workspace` 下的一个功能模块
- 现网发布不能脱离 `autoops-workspace` 的真实目录结构理解
- 现网静态资源最终生效路径是 `project-myway-platform` 宿主机目录，而不是随意解压目录

---

## 二、本仓库内容

### 2.1 Portal

面向申请人，当前主要包含：

- 资源申请工作台
- 常见资源申请
- 资源申请单
- 完整服务目录
- 我的工单
- 填写说明与帮助中心

### 2.2 Center

面向交付与运营人员，主要包含：

- 仪表板
- 工单管理
- 工单详情
- 交付资产
- 能力矩阵
- 运维集成中心
- 设置页

### 2.3 Shared

公共层，主要包含：

- 类型定义
- Store / Hooks
- 共用 UI 组件
- 导出逻辑
- 模拟交付数据

---

## 三、本地开发

在 `src/` 目录执行：

```bash
npm install
npm run dev
```

或者分别启动：

```bash
npm run dev:portal
npm run dev:center
```

本地访问地址：

- Portal：`http://localhost:3004/portal/`
- Center：`http://localhost:3004/center/`

构建：

```bash
./build.sh
./build.sh <version>
```

测试：

```bash
npm run test --prefix src
```

---

## 四、当前实施边界

当前版本先解决“申请材料怎么发起、怎么填、怎么导出给线下评审”，不提前把正式审批与交付流程压到首页。

当前边界是：

- 主入口聚焦 `资源申请工作台`
- 高频入口聚焦 `常见资源申请`
- 历史材料回溯聚焦 `资源申请单`
- 旧能力保留但降级到 `完整服务目录`
- 正式审批、交付和验收继续留在 `我的工单`
- `填写说明` 只作为辅助弹框，不再单独占一级菜单

### 4.1 后续开发与汇报原则

从 `2026-07-17` 起，后续开发、评审和阶段汇报统一遵循下面原则：

1. **先看计划，再做开发**
   - 后续每次开发默认先对照总方案和执行文档：
   - [docs/项目总方案与执行基线-2026-07-17.md](/Users/gjy/project-mywayaiops-refactor-V2/docs/项目总方案与执行基线-2026-07-17.md:1)
   - [docs/开发执行详细方案-2026-07-17.md](/Users/gjy/project-mywayaiops-refactor-V2/docs/开发执行详细方案-2026-07-17.md:1)
2. **每次汇报统一按“计划 / 已完成 / 下一步”结构输出**
   - `计划`：当前阶段目标、边界、验收口径
   - `已完成`：本轮已落地能力、已收口问题、已验证范围
   - `下一步`：下一批任务项、依赖项、风险点
3. **先更新文档，再推进后续实现**
   - 只要阶段目标、功能边界、实施顺序发生变化，先更新文档，再继续开发
4. **按阶段推进，不跳步堆功能**
   - 当前最新优先顺序固定为：导出 HTML / PDF → 后端与数据库 → 登录登出与菜单权限 → 基于新版本继续做字段 / 模板 / 套餐 / 布局产品化沉淀
5. **产品化升级基于新版本副本推进**
   - 为降低回滚风险，后续“数据库、登录权限、配置中心、字段模板产品化”等中长期改造，不直接覆盖当前基线版本
   - 当前回滚副本：`/Users/gjy/project-mywayaiops-refactor-V2.backup.20260717-163611`
   - 后续如进入新版本主线开发，应明确“当前稳定版”和“产品化演进版”的边界

### 4.2 常见资源申请字段冻结原则

当前 `常见资源申请` 相关表单字段，属于已经和用户逐项核对过的一版业务口径。

从当前阶段开始，默认遵循下面约束：

1. **字段口径先冻结，不随产品化推进随意改动**
   - 当前字段名
   - 当前字段含义
   - 当前字段分组
   - 当前字段顺序
   - 当前字段是否展示
2. **后续可以做产品化升级，但不先改字段本身**
   - 可做：布局优化、交互优化、导出优化、模板化、配置化、权限控制、持久化、配置中心建设
   - 不先做：未经确认直接新增 / 删除 / 改名 / 改含义 / 改分组
3. **如果后续确实要改字段，必须先走字段确认**
   - 先和用户确认口径
   - 再更新文档
   - 最后再改实现
4. **配置中心建设也必须遵守字段冻结原则**
   - 配置中心先解决“在线维护方式”
   - 不是立刻重写当前已确认字段集合

一句话约束：

- **当前常见资源申请字段，以用户已确认版本为准；后续先做产品化承载，不先改字段口径。**

### 4.3 当前开发优先级调整（2026-07-17）

从当前时间点开始，优先级调整为：

1. **先做支持导出 `HTML / PDF`**
   - 这是当前最直接面向用户审阅和评审流转的能力
2. **再上数据库**
   - 把工单、申请单、模板、字段、套餐等从本地存储迁移到正式持久化结构
3. **再做登录 / 登出 / 菜单权限**
   - 让 Portal / Center 具备正式用户访问和首发入口控制能力
4. **最后基于新版本继续做字段 / 表单 / 套餐 / 布局产品化沉淀**
   - 即建设可在线维护的配置中心

注意：

- `Portal 首发权限收口` 仍然是要做的内容，但它应并入“登录 / 权限”阶段统一处理
- `历史复用 / 重新发起` 仍然重要，但当前优先级低于 `HTML / PDF 导出`
- `常见资源申请` 当前字段口径不变，产品化阶段只做承载方式升级，不先改字段集合

---

## 五、当前关键状态口径

工单状态统一为：

```text
pending(待处理)
→ reviewing(评审中)
→ processing(ITSM/资源审批与交付受理)
→ plan_confirming(待确认方案)
→ delivering(交付中)
→ completed(待验收)
→ confirmed(已验收)
→ archived(已归档)
```

其中：

- `pending` 表示“用户发起需求，必要时可通过咨询入口沟通”
- `reviewing` 表示“客户与供应商架构师进行架构评审”
- `processing` 表示“ITSM / 资源审批处理中；审批通过后由 IPE 交付中心前台正式受理并形成实施方案”
- `plan_confirming` 表示“实施方案已提交，等待用户确认”
- `completed` 表示“交付完成，待用户验收”
- `confirmed` 表示“已验收”
- `archived` 表示“已归档”

---

## 六、云上发布要点

当前现网不要再按旧口径理解成“把文件 `docker cp` 到 `/usr/share/nginx/html/...` 就生效”。

真实现网链路已经确认如下：

- 现网容器：`presales-frontend`
- 宿主机真实发布目录：`/home/deploy/project-myway-platform/`
- Portal 生效目录：`/home/deploy/project-myway-platform/portal/`
- Center 生效目录：`/home/deploy/project-myway-platform/center/`
- 容器内映射目录：`/usr/share/nginx/platform/portal/`、`/usr/share/nginx/platform/center/`
- Nginx 配置源文件：`/opt/presales-platform/frontend/nginx.conf`

这意味着：

1. 本地先构建 `releases/<version>.tar.gz`
2. 上传到云上 `/home/deploy/`
3. 解压到临时目录
4. 覆盖 `/home/deploy/project-myway-platform/portal/` 和 `/center/`
5. `docker exec presales-frontend nginx -t && nginx -s reload`

详细发布步骤见：

- [DEPLOY.md](/Users/gjy/project-mywayaiops-refactor-V1/DEPLOY.md:1)

---

## 七、共享演示数据要点

当前原型支持两种云上演示方式：

### 6.1 最小演示模式

适合：

- 只想让别人点开页面直接看效果
- 不要求多人共享新增数据

特点：

- 依赖内置演示种子工单

### 6.2 共享演示模式

适合：

- 多人共同访问同一套演示环境
- 一个人新增或流转工单后，其他人刷新也能看到

额外要求：

- 启动 `orders-sync` 服务
- 在现网 Nginx 增加 `/api/dev/orders-sync` 同源代理

详细说明见：

- [DEPLOY.md](/Users/gjy/project-mywayaiops-refactor-V1/DEPLOY.md:1)

---

## 八、推荐阅读顺序

如果你要理解当前项目，建议按下面顺序看文档：

1. [DEPLOY.md](/Users/gjy/project-mywayaiops-refactor-V1/DEPLOY.md:1)
   说明当前真实现网发布方式
2. [docs/与autoops-workspace整合方案.md](/Users/gjy/project-mywayaiops-refactor-V1/docs/与autoops-workspace整合方案.md:1)
   说明本模块与 `autoops-workspace` 的关系
3. [docs/现网升级实施清单-2026-06.md](/Users/gjy/project-mywayaiops-refactor-V1/docs/现网升级实施清单-2026-06.md:1)
   说明现网升级思路
4. [docs/现网升级执行命令清单-2026-06.md](/Users/gjy/project-mywayaiops-refactor-V1/docs/现网升级执行命令清单-2026-06.md:1)
   说明现网上线执行命令
5. [docs/现网证书更新说明.md](/Users/gjy/project-mywayaiops-refactor-V1/docs/现网证书更新说明.md:1)
   说明 HTTPS 证书替换路径与校验方法
6. [docs/资源申请字段收口方案-2026-07-01.md](/Users/gjy/project-mywayaiops-refactor-V1/docs/资源申请字段收口方案-2026-07-01.md:1)
   说明资源申请 Excel 模板拆解后的字段归类、页面承载与主流程保护约束
7. [docs/资源申请字段实施优先级-2026-07-01.md](/Users/gjy/project-mywayaiops-refactor-V1/docs/资源申请字段实施优先级-2026-07-01.md:1)
   说明资源申请字段分批落地顺序，强调先补发起字段与推荐字段，再补评审/交付/运营字段

---

## 八、2026-07 常见资源申请改版

当前这一轮改版的重点，不是继续直接扩写 Portal 原有通用申请页，而是先把“当前阶段客户真正高频使用的常见资源申请”重新分层整理清楚。

当前已整理出的分析文档：

1. [docs/常见资源申请页面结构方案-2026-07-15.md](/Users/gjy/project-mywayaiops-refactor-V2/docs/常见资源申请页面结构方案-2026-07-15.md:1)
   说明当前阶段建议的前台页面结构、主入口分层、旧服务目录降级策略，以及虚拟机申请页的推荐骨架。
2. [docs/常见资源申请字段差异分析-2026-07-15.md](/Users/gjy/project-mywayaiops-refactor-V2/docs/常见资源申请字段差异分析-2026-07-15.md:1)
   说明参考平台 `resreq-main` 中各常见资源申请页的字段结构与当前 Portal 原型的差异，明确哪些先吸收、哪些暂不替代。
3. [docs/常见资源申请字段映射总表-2026-07-15.md](/Users/gjy/project-mywayaiops-refactor-V2/docs/常见资源申请字段映射总表-2026-07-15.md:1)
   说明公共发起字段、六类常见资源申请的产品专属字段，以及页面结构与字段承载关系。
4. [docs/常见资源申请实施任务计划-2026-07-15.md](/Users/gjy/project-mywayaiops-refactor-V2/docs/常见资源申请实施任务计划-2026-07-15.md:1)
   说明当前阶段建议的实施顺序、任务边界、汇报顺序和阶段风险。

当前建议的实施顺序：

1. 先用页面结构方案与用户确认方向
2. 再按差异分析和字段映射总表收口字段
3. 然后开始调整页面逻辑和长相
4. 最后再逐步补内容与共享配置映射

截至 `2026-07-16`，这一轮 Portal 页面结构已完成的收口包括：

1. `资源申请工作台`、`常见资源申请`、`资源申请单`、`完整服务目录`、`我的工单` 的信息层级已重新整理。
2. Portal 顶栏中的阶段说明已下沉为统一页面头部区，避免和全局导航混在一起。
3. 首页已稳定为“主入口在上、其他入口说明在下”的结构。
4. `填写说明` 已从一级菜单移除，改为 `常见资源申请` 和 `引导填写 / 直接填写` 中的弹框辅助入口。
5. `常见资源申请` 已形成六类高频产品入口首版，并补充了用户侧的 `引导填写 / 直接填写` 说明。
6. `资源申请单` 已形成草稿、导出、回溯、筛选、批量导出、删除等首版能力。
7. `常见资源申请` 入口卡片角标已统一为 `高频套餐`，不再使用 `高频产品`。
8. `虚拟机申请` 已完成当前阶段首版真实骨架：
   - `用户需求` 与 `申请信息` 分成两块并行区
   - `用户需求` 支持折叠，已补默认样例占位
   - `环境 + 申请模式` 已合并为一个紧凑卡片
   - `引导填写 / 直接填写` 已移到页面头部右上侧，并带短解释
   - 主体区会跟随模式切换同步主题色
   - `组件能力` 已改为“先选组件，再选组件部署方式和规格档位”
   - 组件详情当前按“固定信息只读 + 磁盘信息可改”收口
   - 页面底部总 `规格档位 / 配置参考` 重复区块已移除
   - `正式申请 / 审批 / 交付` 说明已降级到表单操作区内的低优先级说明

### 8.1 当前实现边界

当前版本严格只解决下面这条主线：

1. 用户进入 `资源申请工作台`
2. 从 `常见资源申请` 找到高频入口
3. 在 `虚拟机申请` 等页面补齐申请材料
4. 保存申请单
5. 预留后续 `预览导出` 能力，线下拿去评审

当前 **不** 在本轮解决：

1. 不把 Portal 做成正式审批系统
2. 不把 `我的工单` 的审批、交付、验收全流程搬回发起页
3. 不把 81 个原子服务重新抬回前台主入口
4. 不在 Portal 单独维护一套与 Center 长期分裂的字段/套餐/模板体系
5. 不先做全量后端联动与正式数据落库

一句话概括当前边界：

- `Portal` 先负责“发起、整理、导出评审材料”
- `Center` 负责“配置、治理、后续正式运营承接”

### 8.2 Portal / Center / Shared 分工

#### Portal 当前职责

Portal 当前只承接面向申请人的前台体验：

1. `资源申请工作台`
   - 负责主入口分流
   - 负责告诉用户从哪里开始
2. `常见资源申请`
   - 负责六类高频套餐入口
   - 负责弱化完整服务目录的前台暴露
3. `虚拟机申请`
   - 当前阶段的样板页
   - 负责验证“用户需求 + 申请信息 + 组件配置”的真实工作区结构
4. `资源申请单`
   - 负责草稿、回溯、筛选、批量导出
   - 它是材料记录区，不是正式工单区
5. `完整服务目录`
   - 保留弱入口
   - 只在高频场景未覆盖时进入

#### Center 当前职责

Center 不直接承接当前 Portal 的前台引导体验，而是逐步承接下面这些“配置与治理”能力：

1. 模板配置
   - 哪些产品页有哪些字段
   - 哪些字段按环境推荐
2. 套餐配置
   - 不同产品、不同环境、不同部署方式对应哪些推荐套餐
   - 套餐展示名、规格档位、说明文案如何维护
3. 配置详情规则
   - 例如 MySQL / Redis / RabbitMQ / Kafka 的部署方式与规格说明
   - 后续应逐步改成由配置源驱动，而不是长期写死在 Portal 页面里
4. 后续正式工单治理
   - 审批
   - 交付
   - 资产沉淀
   - 运营回填

#### Shared 当前职责

Shared 是 Portal 和 Center 之间的共享层，后续应逐步收口这些内容：

1. 字段 key 与类型定义
2. 申请草稿数据结构
3. 套餐/规格的共享数据模型
4. 导出结构与草稿记录结构
5. 公共 UI 组件与页面基础能力

当前结论非常明确：

1. 页面长相和交互节奏先在 Portal 收口
2. 长期复用的数据定义和规则，逐步沉到 Shared
3. 可配置能力与后台治理，逐步归到 Center

### 8.3 当前推荐协作方式

后续实现时，默认按下面顺序协作，不要反过来：

1. 先在 Portal 验证用户是否看得懂、会不会迷路、页面是否够紧凑
2. 再把已经稳定的字段、套餐、部署方式、配置详情规则沉到 Shared
3. 最后再由 Center 接手做配置化维护

也就是说，当前阶段：

- `Portal` 先证明“这套页面结构和填写逻辑是对的”
- `Shared` 再负责把稳定规则抽出来
- `Center` 最后负责“让这些规则变成可维护后台能力”

### 8.4 当前虚拟机申请页状态

截至 `2026-07-16`，`虚拟机申请` 已进入“真实工作区骨架”阶段，而不再只是说明页。

#### 已完成

1. 页面头部结构已收口：
   - 左侧只保留当前资源标题与短说明
   - 右侧保留模式切换和 `返回常见资源申请`
2. `引导填写 / 直接填写`
   - 已移到头部
   - 已补简短解释
   - 当前模式会影响主体区主题色
3. `用户需求`
   - 已独立为第 `1` 块
   - 支持折叠
   - 已补示例占位
4. `申请信息`
   - 已独立为第 `2` 块
   - 已把 `环境 + 申请模式` 合并在同一个紧凑卡片
5. `虚拟机底座配置`
   - 已独立成单独区块
   - 当前保留底座规格、数量、磁盘与详情
6. `组件能力`
   - 已支持选择 `MySQL / RabbitMQ / Redis / Kafka`
   - 每个组件支持独立展开/收起
   - 当前逻辑为：先选组件部署方式，再选规格档位，再自动带出详情
7. 组件详情
   - 只读展示：配置名称、节点数、CPU、内存、场景说明
   - 允许编辑：磁盘类型、系统盘、数据盘

#### 当前仍是前端骨架，不算已完成

1. 配置详情字段尚未逐条完全对齐参考源码
2. `用户需求` 表头与题目还不是最终版
3. `预览导出` 仍未开放
4. 与 Center 的配置源仍未接通
5. 仍然是前端草稿级数据，不是正式后端模型

#### 当前补充收口规则

1. `评审交流话术建议`
   - 不放在日常填写页主界面
   - 只放在导出材料中
   - HTML 评审页默认折叠展示，避免正文过长影响审阅
2. `虚拟机申请`
   - 页面只保留一个环境字段，统一叫 `申请环境`
   - `申请环境` 要和 `申请模式` 保持联动
   - `申请环境 + 申请模式 + 虚拟机数量` 合并到同一组紧凑区域展示
   - `虚拟机数量` 不再单独漂浮在右侧

### 8.6 当前字段冻结说明

当前 `常见资源申请` 已经进入“字段口径以用户确认版为准”的阶段。

这意味着：

1. 页面还能继续产品化演进
   - 例如：
   - 布局更清晰
   - 交互更顺手
   - 导出更标准
   - 配置方式更后台化
2. 但字段本身当前不作为自由调整对象
   - 不默认新增字段
   - 不默认删除字段
   - 不默认改字段名
   - 不默认改字段含义
3. 如果后续某一类资源申请字段确实要变，先按“用户确认 → 文档更新 → 实现改造”的顺序处理

后续所有“字段优化”讨论，默认先区分两类：

1. **产品化承载优化**
   - 可以继续做
2. **字段口径变化**
   - 默认不做，除非重新确认

### 8.5 接下来任务清单

下面这组任务是下一次继续时应直接执行的任务，不需要再重新分析方向。

#### P0：继续收虚拟机申请页

目标：把当前样板页从“结构正确”推进到“内容足够拿去和用户核对”

任务：

1. 继续细化 `用户需求` 表
   - 对照参考环境里的 `用户需求` 录入模块
   - 调整字段标题、顺序、默认示例
   - 明确哪些是当前阶段保留，哪些暂不放前台
2. 继续细化虚拟机底座配置
   - 核对 `SIT / UAT / 压测 / PROD` 对应的底座推荐规格
   - 收紧底座说明文案
   - 确认底座数量字段是否继续保留单独输入
3. 继续细化组件配置详情
   - `MySQL`
   - `Redis`
   - `RabbitMQ`
   - `Kafka`
   - 对照参考源码补齐每个组件的部署方式与详情说明
4. 明确哪些组件字段固定只读
   - CPU
   - 内存
   - 节点数
   - 配置名称
   - 场景说明
5. 明确哪些字段允许用户继续改
   - 磁盘类型
   - 系统盘
   - 数据盘

边界：

1. 只做前台体验和结构化材料承载
2. 不把组件配置直接改成复杂编辑器
3. 不先接正式后端接口

#### P1：把另外五类高频套餐接入同一套语言

目标：让 `容器 / OBS / SFS / 权限 / 网络` 进入页不再像占位页

任务：

1. 为这五类入口统一页面语言
2. 每类至少补一版真实骨架
3. 结构遵循同一原则：
   - 用户需求
   - 申请信息
   - 产品特有配置区
   - 表单操作
4. 不追求一次补完所有字段，但必须先消除“空壳感”

边界：

1. 不要求这五类立刻达到虚拟机页的细度
2. 先统一语言和结构，再补细节

#### P1：资源申请单继续完善

目标：让材料记录区可真正支撑“保存、回溯、筛选、批量导出”

任务：

1. 明确记录字段与表头排序
2. 继续完善筛选条件
3. 明确批量导出的口径
4. 明确“基于原单再发起”的文案与交互
5. 评估是否需要在列表里补状态解释

边界：

1. 它仍然是材料记录区，不改造成正式工单列表
2. 不在这里打通审批流

#### P2：Portal / Shared 数据模型收口

目标：把当前已经稳定下来的前台规则逐步抽象成共享模型

任务：

1. 抽 `常见资源申请` 的产品定义模型
2. 抽 `虚拟机申请` 的底座配置模型
3. 抽组件部署方式与规格映射模型
4. 抽导出所需的结构化材料模型
5. 让 Portal 的页面渲染尽量从数据定义出发，不再继续把规则散写在页面里

边界：

1. 先抽稳定规则，不抽还在摇摆的字段
2. 抽模型时不能影响现有 Portal 演示效果

#### P2：Center 配合任务

目标：为后续把 Portal 里稳定的前台规则搬到后台可配置能力做准备

任务：

1. 明确 Center 后续需要接管哪些配置：
   - 产品定义
   - 环境推荐规格
   - 套餐名称与说明
   - 组件部署方式
   - 配置详情模板
2. 明确哪些仍暂时留在代码里：
   - 仍在频繁讨论的页面说明文案
   - 仍未稳定的题目顺序
3. 先输出字段/套餐/规则三张映射清单
4. 再决定是否在 `center/settings` 下新增对应治理入口

边界：

1. 当前不要为了“配合 Center”而反向把 Portal 先做复杂
2. 当前不要新做一套后台页面去拖慢前台确认节奏

### 8.6 下一次继续时的默认顺序

如果下次打开项目，默认按下面顺序继续，不用再重新讨论优先级：

1. 先看 `README` 这段任务清单
2. 先看 `虚拟机申请` 当前页面效果
3. 先收 `用户需求` 表和 `组件配置详情`
4. 再补其余五类高频套餐骨架
5. 然后整理 Portal / Shared / Center 的配置迁移清单

一句话：

- 下次继续，先做 `虚拟机申请内容细化`
- 再做 `其余五类入口统一骨架`
- 最后做 `与 Shared / Center 的规则收口`

能力矩阵相关文档：

- [docs/能力矩阵自动化等级判定说明.md](/Users/gjy/project-mywayaiops-refactor-V1/docs/能力矩阵自动化等级判定说明.md:1)
- [docs/能力矩阵自动化等级维护方案.md](/Users/gjy/project-mywayaiops-refactor-V1/docs/能力矩阵自动化等级维护方案.md:1)

---

## 八、当前补充说明

近期已确认的几个关键事实：

1. 现网 `/portal/` 与 `/center/` 真实读取的是 `project-myway-platform` 宿主机目录，不是容器内 `/usr/share/nginx/html/...`
2. 现网 HTTPS 证书真实目录是 `/opt/presales-platform/getpre.cn_nginx`
3. Portal 当前已经补充了“导出交付配置”能力，不再只有“发起表单 / 发起阶段详情”导出
4. 能力矩阵当前的“自动化等级”仍然是原型期规则推导，后续建议改为“初始判定 + 人工维护 + 规则可配置”

---

## 九、流程节点状态修复进展

截至 `2026-06-29`，本轮已完成的修复与收口：

1. 工单 `workflowTimeline` 已改为按统一顺序归一，当前状态只保留一个有效节点，避免回退或重复推进后出现多个“处理中”节点。
2. 历史本地脏数据在读取时会自动修正时间线，不再依赖旧的时间线残留状态。
3. Center 工单详情页的阶段时间摘要不再直接取时间线最后一个节点，而是优先识别当前未完成节点，再回退到最近已完成节点。
4. Portal / Center 两侧的阶段节点线性归一与阶段状态汇总已抽到 shared：
   - `src/packages/shared/src/lib/workflow-stage.ts`
   - `src/packages/shared/src/lib/order-stage-flags.ts`
5. Portal 的 `resource_itsm`、`delivery_plan`、`acceptance_asset` 三段节点 builder 已抽到 shared：
   - `src/packages/shared/src/lib/order-stage-nodes.ts`
6. Center 已复用 shared 的 `delivery_plan`、`acceptance_asset` 基础 builder，并保留运营侧少量差异化文案覆盖。

当前这轮修复的重点不是视觉调整，而是先把“工单状态 -> 阶段状态 -> 节点状态 -> 时间线展示”这条链路压成可回归、可复用、可继续抽象的结构。

对应回归测试已补齐并通过：

- `src/packages/shared/src/store/orders.test.ts`
- `src/packages/shared/src/lib/workflow-stage.test.ts`
- `src/packages/shared/src/lib/order-stage-flags.test.ts`
- `src/packages/shared/src/lib/order-stage-nodes.test.ts`

本地最近一次验证命令：

```bash
npm run test --prefix src
```

最近一次结果：`12` 个测试文件、`48` 个测试全部通过。

---

## 十、资源申请模板拆解原则

基于 [【资源申请】基础资源需求_V1.xlsx](/Users/gjy/project-mywayaiops-refactor-V1/【资源申请】基础资源需求_V1.xlsx:1) 的最新分析，当前项目对“资源申请 Excel 模板”的产品化改造，统一按下面原则收口。

### 10.1 总原则

这份 Excel 不是一张线上表单，而是一套线下协作包，里面混合了：

- 发起输入
- 资源设计
- 模板附件
- 评审记录
- 交付/运营回填

因此不能按“整份 Excel 原样线上化”的思路推进，而应拆成：

1. 发起页主表单
2. 系统推荐与用户调整
3. 模板下载与附件上传
4. 评审/审批节点补充
5. 交付中心/运营中心回填

### 10.2 各 Sheet 的承载建议

建议按下面口径理解：

- `4-用户需求表-需填`
  不是模板件，而是发起页主表单来源。应拆成结构化字段，例如系统/应用名称、业务背景、应用场景、对接系统、用户类型、业务目标、环境、优先级、使用时长等。
- `5-SLA保障-需填`
  不再保留为整张手填表。应改为“关键保障字段 + 系统生成建议 + 评审确认”，例如 SLA 等级、高可用要求、备份策略、RTO/RPO、业务重要级别。
- `6-应用&基础架构图-需画` 与 `7-基础架构图(必填)`
  应合并为“架构图模板下载 + 成品上传”节点，不做复杂在线填表。
- `7-进容器资源列表（选填）`
  应改为“容器资源推荐套餐 + 用户可调参数”，例如实例数、CPU、内存、资源分区、应用英文名等。
- `8-进虚拟机资源列表(选填)`
  应改为“虚机/数据库/中间件资源推荐清单 + 用户补充运维字段”，例如用途、数据库名、编码、日志保留天数等。
- `4-网络需求申报表`
  基础意图留在发起页，详细带宽/互访/链路策略留到网络评审或实施节点补充。
- `9-租户信息`
  仅保留少量前台申请项，其余平台账号、租户编码、权限结果应由交付侧回填。
- `10-容器+虚拟机资源汇总(PaaS运维填写)`
  应完全改为系统自动汇总结果，不再作为用户输入表。
- `11-备份申请表`
  标准场景下拆成结构化字段；非标备份需求放在专项评审补充。
- `12-架构师评审表`
  应转为系统评审节点数据，不再维持 Excel 录入。
- `13-设备监控指标确认表`
  应转为平台默认监控接入策略，异常场景再人工补充。
- `17-商流管理表`
  保留为运营/成本侧后台能力，不进入普通申请主流程。

### 10.3 字段治理方向

当前应优先收口的不是“把表头搬进系统”，而是把字段分成三类：

- 主申请字段
  例如 `systemCode`、`systemName`、`applicationName`、`applicationEnglishName`、`environment`、`businessPurpose`、`businessGoal`、`businessCategory`、`owner`、`assignee`
- 推荐/编排字段
  例如 `cpu`、`memory`、`instanceCount`、`backupPolicy`、`retentionPeriod`、`haRequirement`
- 评审/交付补充字段
  例如网络细节、非标原因、租户开通结果、交付资产结果、监控/商流结果

建议后续补齐但不急于直接挂到主流程状态判断上的字段包括：

- `integrationSystems`
- `userTypes`
- `clientTypes`
- `resourcePartition`
- `resourcePurpose`
- `databaseName`
- `charset`
- `logRetentionDays`
- `requiresBackup`
- `restoreRequirement`
- `rtoTarget`
- `rpoTarget`
- `drRequirement`
- `requiresPipelineAccess`
- `requiresEfkAccess`
- `requiresMonitoring`
- `requiresLogging`

### 10.4 严格约束：不得破坏当前工单主流程状态判断

资源申请模板、表头、字段分组、导出列、推荐套餐等后续改造，必须遵守下面约束：

1. 不得改变当前工单主流程状态机口径：
   `pending -> reviewing -> processing -> plan_confirming -> delivering -> completed -> confirmed -> archived`
2. 不得为了新增字段、修改表头、调整导出列，就改坏 Portal / Center 当前阶段判断、节点归一、时间线展示逻辑。
3. 新增申请字段时，优先作为 `answers` / `extras` / 附件元数据 / 评审补充字段接入，不直接耦合到状态判断。
4. 只有明确属于流程推进条件的字段，才允许进入状态门禁判断；进入前必须同步补测试。
5. 任何资源申请表单改造，都应复用现有 shared 层的阶段判断与节点 builder，不允许在页面内重新散写一套状态口径。

当前页面试点已经按这个约束落地到 Portal 侧，范围控制如下：

- `MySQL部署`：已试点结构化字段分组、紧凑布局、AI 推荐确认收口、架构图模板下载/上传入口，并按环境带出默认套餐
- `云数据库开通`：已试点数据库申请分组布局、架构图模板下载/上传入口，并按环境带出规格 / 高可用 / 容量 / 备份默认套餐
- `云服务器开通（私有云）`：已试点近生产表单标签、架构图模板下载/上传入口，并按环境带出配置选择推荐套餐
- `云服务器开通（虚拟化）`：已试点近生产表单标签、架构图模板下载/上传入口，并按环境带出基础推荐套餐
- `云服务器开通（公有云）`：已试点近生产表单标签、架构图模板下载/上传入口，并按环境带出配置选择与运行策略推荐套餐
- `容器集群配置(DCE4)`：已按表格内“进容器资源列表 / 租户信息”试点近生产表单标签、架构图模板下载/上传入口，并按环境带出容器实例规格与平台接入默认套餐
- `容器资源配置`：已按表格内“进容器资源列表 / 租户信息”试点近生产表单标签、架构图模板下载/上传入口，并按环境带出容器实例规格与平台接入默认套餐
- `F5域名发布(互联网)`：已试点公网发布分组布局、架构图模板下载/上传入口，并保持与原子服务主流程解耦
- `F5负载均衡(内网)`：已试点内网负载配置分组布局、架构图模板下载/上传入口，并保持与原子服务主流程解耦
- 组合服务申请页：已切到与原子服务一致的架构图材料控件与样式；`搭建测试环境` 等容器场景已补充环境驱动的容器资源推荐套餐卡片，并会带入 AI 建议确认阶段的交付范围说明
- `对象存储配置`：当前仍保留独立的套餐推荐试点，但不再归入“近生产表单”标签范围，待表格清单整理完成后再决定是否纳入
- 上述改造仅作为发起页 `answers` / 附件元数据增强输入，不修改主流程状态判断口径

当前 Portal 侧表单试点还补充了两条实现约束：

- 原子服务页面的 UI 试点规则统一收口在 `src/packages/aiops-service-portal/src/components/atomic-service-ui-profiles.ts`
- 页面布局分组与 5 -> 3+2 / 4 -> 2+2 / 2 -> 1x2 这类排版规则统一收口在 `src/packages/aiops-service-portal/src/components/apply-service-layout.ts`
- 该配置层和布局层目前只负责架构图要求、近生产标签、试点字段补充、推荐套餐展示与表单默认值带出；不承载任何流程推进判断

### 10.5 Center 模板页环境推荐配置

截至 `2026-07-03`，Center 侧 `设置 -> 表单模板` 已补充模板级“环境推荐配置”能力，当前口径如下：

- 能力入口位于模板详情弹窗内，与“环境推荐套餐绑定”并列维护
- 模板可指定一个环境字段作为触发入口，例如 `environment`
- 模板可勾选首期环境推荐字段：
  - `节点`
  - `CPU`
  - `内存`
  - `磁盘`
  - `安全等级`
- 上述字段默认不在预览中展示；只有选择环境后才会显示并初始化推荐值
- 推荐提示文案默认是：`默认会根据环境推荐配置，可按需调整`
- 模板预览区会同步展示说明型提示，解释“系统会结合所选环境推荐配置，手动调整后会保留”

当前值覆盖策略统一为：

- 首次选择环境时，系统自动初始化推荐字段值
- 用户手动修改某个推荐字段后，该字段视为已覆盖
- 再次重新选择环境时，已手动修改的字段值保留，不会被新的环境推荐值覆盖
- 未手动修改的推荐字段，仍可继续跟随环境推荐值刷新

当前这套能力只落在 Center 模板编辑态和预览态，用于字段编排和验收演示：

- 不修改 Portal 主流程
- 不改变现有工单状态机
- 不把“环境档案”这个后台概念暴露给终端用户
- 终端用户只感知“环境会影响推荐配置，且推荐值可继续调整”

### 10.6 Center 配置套餐页口径

截至 `2026-07-03`，Center 侧 `设置 -> 套餐与定价` 已按同一业务页收口，当前口径如下：

- 设置页左侧只保留一个入口：`套餐与定价`
- 入口进入同一业务容器页，页面内部再分两个子视图：
  - `套餐管理`
  - `定价管理`
- `套餐管理` 维护的是“分类 + 分类下环境套餐明细”两层结构：
  - 分类示例：`云服务器`、`数据库`、`Redis`
  - 明细示例：分类下的 `DEV / UAT / PROD` 套餐
- 分页粒度按“分类”计算，而不是按分类内环境明细计算；当前默认每页展示 `3` 个分类
- 页面顶部支持 `新增分类`，用于新增一条类似“云服务器”的套餐分类
- 每个分类内部保留 `新增套餐明细`，用于补充该分类下不同环境的套餐配置
- 模板页里的绑定关系文案统一改为“绑定套餐”，底层仍按 `groupKey` 绑定套餐分类

这意味着后续如果继续扩表格内的 `cloud-vm-private`、`cloud-vm-public`、`cloud-db-create`、`net-f5-lb`、`paas-dce4`、`paas-resource` 等服务，默认应优先改配置层和页面布局层，不直接进入 shared 状态判断文件；表格外服务先不继续扩“近生产表单”范围。

涉及当前主流程判断的核心文件包括：

- [src/packages/shared/src/lib/workflow-stage.ts](/Users/gjy/project-mywayaiops-refactor-V1/src/packages/shared/src/lib/workflow-stage.ts:1)
- [src/packages/shared/src/lib/order-stage-flags.ts](/Users/gjy/project-mywayaiops-refactor-V1/src/packages/shared/src/lib/order-stage-flags.ts:1)
- [src/packages/shared/src/lib/order-stage-nodes.ts](/Users/gjy/project-mywayaiops-refactor-V1/src/packages/shared/src/lib/order-stage-nodes.ts:1)
- [src/packages/shared/src/store/orders.ts](/Users/gjy/project-mywayaiops-refactor-V1/src/packages/shared/src/store/orders.ts:924)
- [src/packages/aiops-service-portal/src/pages/order-detail.tsx](/Users/gjy/project-mywayaiops-refactor-V1/src/packages/aiops-service-portal/src/pages/order-detail.tsx:1)
- [src/packages/aiops-service-center/src/pages/order-detail.tsx](/Users/gjy/project-mywayaiops-refactor-V1/src/packages/aiops-service-center/src/pages/order-detail.tsx:1)

后续如果继续推进资源申请字段收口，默认先做：

1. 文档口径统一
2. 字段承载位置设计
3. 数据模型扩展
4. 回归测试补齐
5. 再考虑页面交互与导出格式调整

---

## 十一、明天继续

明天建议继续这几个点，按顺序推进：

1. 继续抽 `demand_review` 与 `resource_itsm` 的 shared builder，尽量把 `portal/order-detail.tsx` 与 `center/order-detail.tsx` 里剩余的阶段节点定义继续压缩。
2. 统一 `processing` 在两侧页面上的业务口径与文案，确认它到底是“ITSM 审批中”还是“审批通过后待前台受理”的展示语义，避免继续混用。
3. 视情况给 `aiops-service-center/src/pages/order-detail.tsx` 增补页面级测试，验证阶段摘要、时间线和当前节点在回退场景下的展示。

如果明天继续这条线，建议优先从下面几个文件开始看：

- [README.md](/Users/gjy/project-mywayaiops-refactor-V1/README.md:1)
- [src/packages/shared/src/store/orders.ts](/Users/gjy/project-mywayaiops-refactor-V1/src/packages/shared/src/store/orders.ts:924)
- [src/packages/shared/src/lib/workflow-stage.ts](/Users/gjy/project-mywayaiops-refactor-V1/src/packages/shared/src/lib/workflow-stage.ts:1)
- [src/packages/shared/src/lib/order-stage-flags.ts](/Users/gjy/project-mywayaiops-refactor-V1/src/packages/shared/src/lib/order-stage-flags.ts:1)
- [src/packages/shared/src/lib/order-stage-nodes.ts](/Users/gjy/project-mywayaiops-refactor-V1/src/packages/shared/src/lib/order-stage-nodes.ts:1)
- [src/packages/aiops-service-portal/src/pages/order-detail.tsx](/Users/gjy/project-mywayaiops-refactor-V1/src/packages/aiops-service-portal/src/pages/order-detail.tsx:1)
- [src/packages/aiops-service-center/src/pages/order-detail.tsx](/Users/gjy/project-mywayaiops-refactor-V1/src/packages/aiops-service-center/src/pages/order-detail.tsx:1)
