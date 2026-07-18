# project-mywayaiops-refactor-V1 与 autoops-workspace 整合方案

## 一、两个项目的架构差异

### autoops-workspace（智能运维平台）

```
平台壳层（Platform Shell）
├── 首页（Portal）— 模块卡片、风险概览、切换弹窗
├── 配置驱动（config/modules.json）注册 5 个模块
├── 模块切换器（module-switcher.js）统一注入各模块
└── 构建产物 dist/platform/ — Nginx 静态托管

业务模块
├── 智能点检 / 异常检测 / 告警运营 / 容量运营 — 纯静态 HTML，直接嵌入
└── AI 工具台 — iframe 包装页 + 独立 Python 后端
```

### project-mywayaiops-refactor-V1（IPE/AIOps 服务交付平台）

```
Monorepo（npm workspaces）
├── @aiops/shared — UI 组件 + 数据模型 + Store
├── @aiops/service-portal — React SPA（对外门户），base=/portal/
└── @aiops/service-center — React SPA（对内运营），base=/center/

构建产物
├── releases/<ver>/portal/ — 独立 SPA（~730KB JS bundle）
└── releases/<ver>/center/ — 独立 SPA（~737KB JS bundle）

部署方式
├── 构建产物覆盖宿主机 /home/deploy/project-myway-platform/portal 与 /center/
├── 容器内只读映射到 /usr/share/nginx/platform/portal 与 /center/
└── 访问地址 /portal/ 和 /center/
```

**核心差异**：

| 维度 | autoops-workspace | project-mywayaiops-refactor-V1 |
|------|-------------------|-------------------|
| 架构模式 | 平台壳层 + 多模块聚合 | 双 SPA 独立应用 |
| 前端框架 | 原生 HTML/JS，模块异构 | React 18 + Vite + TS |
| 路由 | 整页跳转 | HashRouter（SPA 内路由） |
| 模块注册 | config/modules.json 配置驱动 | 硬编码在 App.tsx 中 |
| 组件系统 | 无统一组件库 | Radix UI + Tailwind（shadcn 风格） |
| 构建产物 | 多 HTML 入口 | 两个独立 SPA（单 JS bundle） |

---

## 二、推荐整合方案：iframe 包装页 + 独立路径部署

采用与 AI 工具台相同的接入模式——**iframe 包装页**。

```
用户浏览器
    │
    ├── https://www.getpre.cn/                    → 平台首页
    ├── https://www.getpre.cn/modules/ipe-portal/ → 包装页（iframe 加载 /portal/）
    ├── https://www.getpre.cn/modules/ipe-center/ → 包装页（iframe 加载 /center/）
    ├── https://www.getpre.cn/portal/             → Portal SPA 静态资源
    ├── https://www.getpre.cn/center/             → Center SPA 静态资源
    └── https://www.getpre.cn/ai-hub/             → AI 工具台（已有）
```

**为什么不用微前端？**
- Portal 和 Center 是完整的 React SPA，有自己的路由系统和全局状态
- 微前端改造（qiankun/single-spa）需要对源码做大量侵入性修改
- iframe 方式零侵入当前 IPE/AIOps 源码，保留其独立演进能力

**为什么不用直接嵌入（非 iframe）？**
- Portal/Center 使用 HashRouter，`/#/orders` 是客户端路由
- 直接嵌入会导致 URL 与平台壳层冲突
- iframe 天然隔离 CSS/JS，避免与平台壳层或其他模块冲突

---

## 三、整合任务清单

### 任务 1：在 autoops-workspace 注册两个新模块

**文件**：`autoops-workspace/config/modules.json`

```json
{
  "key": "ipe-portal",
  "name": "服务门户",
  "description": "IPE/AIOps 服务门户，面向客户浏览服务和提交申请",
  "subtitle": "服务目录浏览、服务申请与订单跟踪。",
  "entry": "./modules/ipe-portal/index.html",
  "order": 60,
  "enabled": true,
  "menu": true,
  "homeCard": true,
  "sourceDir": "/Users/gjy/autoops-workspace/modules/ipe-portal/current",
  "publishSubdir": "ipe-portal",
  "publishIncludeFiles": ["index.html"]
}
```

```json
{
  "key": "ipe-center",
  "name": "运营中心",
  "description": "IPE/AIOps 服务运营中心，面向内部运营人员管理交付",
  "subtitle": "订单审批、服务交付与运维管理。",
  "entry": "./modules/ipe-center/index.html",
  "order": 70,
  "enabled": true,
  "menu": true,
  "homeCard": true,
  "sourceDir": "/Users/gjy/autoops-workspace/modules/ipe-center/current",
  "publishSubdir": "ipe-center",
  "publishIncludeFiles": ["index.html"]
}
```

**工作量**：小（修改 JSON）

---

### 任务 2：创建 iframe 包装页

**目录结构**：

```
autoops-workspace/modules/
├── ipe-portal/
│   └── current/
│       └── index.html          # 包装页
├── ipe-center/
│   └── current/
│       └── index.html          # 包装页
```

**包装页模板**（与 ai-hub 包装页保持一致）：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>服务门户 - IPE/AIOps</title>
  <link rel="stylesheet" href="../../shared/module-switcher.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; overflow: hidden; }
    body { display: flex; flex-direction: column; }
    .platform-bar {
      height: 48px;
      background: #fff;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      padding: 0 16px;
      flex-shrink: 0;
    }
    iframe {
      flex: 1;
      border: none;
      width: 100%;
      min-height: 0;
    }
  </style>
</head>
<body data-platform-module="ipe-portal">
  <div class="platform-bar">
    <div data-platform-topbar-switcher></div>
    <div style="margin-left: auto; font-size: 14px; color: #6b7280;">
      IPE 服务门户
    </div>
  </div>
  <iframe src="/portal/" title="IPE Service Portal" loading="lazy"></iframe>
  <script src="../../shared/module-switcher.js"></script>
</body>
</html>
```

**工作量**：小（创建两个 HTML 文件）

---

### 任务 3：构建流程整合

**目标**：把 `project-mywayaiops-refactor-V1` 的构建产物纳入 autoops-workspace 的构建产物。

**方案 A：修改 autoops-workspace 的 build-platform.mjs**

在 `buildPlatformShell()` 之后、`buildModule()` 之前，增加步骤：

```javascript
// 从 project-mywayaiops-refactor-V1 复制构建产物
function copyMywayaiopsArtifacts(distRoot) {
  const mywayReleases = path.resolve(workspaceRoot, '../project-mywayaiops-refactor-V1/releases');
  const latestVersion = fs.readdirSync(mywayReleases)
    .filter(f => /\d{8}_\d{6}/.test(f) || /^[a-f0-9]{7,}$/.test(f))
    .sort()
    .pop();
  
  if (!latestVersion) {
    warn('No mywayaiops release found');
    return;
  }
  
  const sourcePortal = path.join(mywayReleases, latestVersion, 'portal');
  const sourceCenter = path.join(mywayReleases, latestVersion, 'center');
  const targetPortal = path.join(distRoot, 'portal');
  const targetCenter = path.join(distRoot, 'center');
  
  if (fs.existsSync(sourcePortal)) {
    fs.cpSync(sourcePortal, targetPortal, { recursive: true });
    log(`copied mywayaiops portal from ${latestVersion}`);
  }
  if (fs.existsSync(sourceCenter)) {
    fs.cpSync(sourceCenter, targetCenter, { recursive: true });
    log(`copied mywayaiops center from ${latestVersion}`);
  }
}
```

**方案 B：修改 project-mywayaiops-refactor-V1 的 build.sh**

在 build.sh 末尾增加：

```bash
# 同步到 autoops-workspace
AUTOOPS_DIST="$PROJECT_ROOT/../autoops-workspace/dist/platform"
if [ -d "$AUTOOPS_DIST" ]; then
  mkdir -p "$AUTOOPS_DIST/portal" "$AUTOOPS_DIST/center"
  cp -r "$BUILD_DIR/portal/"* "$AUTOOPS_DIST/portal/"
  cp -r "$BUILD_DIR/center/"* "$AUTOOPS_DIST/center/"
  echo "[build] synced to autoops-workspace dist/platform"
fi
```

**推荐方案 A**：由 autoops-workspace 主导构建，`project-mywayaiops-refactor-V1` 保持独立。

**工作量**：中（修改 build-platform.mjs）

---

### 任务 4：Nginx 配置确认

Portal 和 Center 使用 `/portal/` 和 `/center/` 作为 base 路径，构建产物中的资源引用为绝对路径（如 `/portal/assets/xxx.js`）。

当前 Nginx 配置（容器内 `/etc/nginx/conf.d/default.conf`）中，`location / { root /usr/share/nginx/platform; }` 已能处理：

```
/portal/         → /usr/share/nginx/platform/portal/index.html
/portal/assets/  → /usr/share/nginx/platform/portal/assets/
/center/         → /usr/share/nginx/platform/center/index.html
/center/assets/  → /usr/share/nginx/platform/center/assets/
```

**无需额外 Nginx 配置**。

**但需注意**：如果 Portal/Center 未来从 HashRouter 改为 BrowserRouter，则需要添加：

```nginx
location /portal/ {
    alias /usr/share/nginx/platform/portal/;
    try_files $uri $uri/ /portal/index.html;
}
location /center/ {
    alias /usr/share/nginx/platform/center/;
    try_files $uri $uri/ /center/index.html;
}
```

**工作量**：小（当前无需改动）

---

### 任务 5：module-switcher.js 适配

当前 `module-switcher.js` 中的跳转逻辑：

```javascript
window.location.href = module.entry;
```

在 iframe 内部执行时，这只改变 iframe 的 URL，不会跳出 iframe。需要修改为：

```javascript
// 检测是否在 iframe 中
const isInIframe = window !== window.top;
if (isInIframe) {
  window.top.location.href = absoluteEntry;
} else {
  window.location.href = absoluteEntry;
}
```

**文件**：`autoops-workspace/platform/current/shared/module-switcher.js`

**工作量**：小（修改一行逻辑）

---

### 任务 6：部署流程更新

**新增步骤**：

1. 构建 `project-mywayaiops-refactor-V1`：
   ```bash
   cd /Users/gjy/project-mywayaiops-refactor-V1
   ./build.sh
   ```

2. 构建 autoops-workspace（已包含 mywayaiops 产物）：
   ```bash
   cd /Users/gjy/autoops-workspace
   node scripts/build-platform.mjs
   ```

3. 同步到服务器：
   ```bash
   rsync -av --delete dist/platform/ deploy@101.43.78.27:/home/deploy/project-myway-platform/
   ```

**工作量**：小（更新 deploy.sh 或手动执行）

---

### 任务 7：首页卡片与导航适配

Portal 和 Center 作为新模块加入后，平台首页需要：

1. **卡片网格布局**：从 5 列变为 6-7 列，可能需要调整 `grid-template-columns`
2. **图标**：为 Portal 和 Center 准备 SVG 图标，放入 `modules/ipe-portal/current/icon.svg`
3. **帮助文档**：在平台帮助弹层中添加 Portal 和 Center 的帮助内容

**工作量**：小

---

## 四、完整任务清单（按优先级排序）

| 优先级 | 任务 | 文件/目录 | 工作量 |
|--------|------|-----------|--------|
| P0 | 注册模块（modules.json） | `config/modules.json` | 小 |
| P0 | 创建包装页 | `modules/ipe-portal/current/index.html`、`modules/ipe-center/current/index.html` | 小 |
| P0 | 构建流程整合 | `scripts/build-platform.mjs` | 中 |
| P1 | module-switcher 跳出 iframe | `platform/current/shared/module-switcher.js` | 小 |
| P1 | 部署流程更新 | `deploy.sh` 或手动文档 | 小 |
| P2 | 首页卡片布局适配 | `platform/current/styles/platform.css` | 小 |
| P2 | 模块图标 | `modules/ipe-portal/current/icon.svg` 等 | 小 |
| P2 | 帮助文档 | `platform/current/docs/` 或 `src/packages/...` | 小 |

---

## 五、整合风险分析

### 风险 1：Portal ↔ Center 内部跳转失效

**场景**：Portal 中提交服务申请后，需要跳转到 Center 查看订单详情。

**当前实现**：Portal 的 Vite dev proxy 配置 `/center → localhost:3001`，仅开发时有效。生产环境中 Portal 内部可能有硬编码链接指向 `/center/`。

**在 iframe 中的行为**：
- 如果 Portal 内部使用 `<a href="/center/">`，在 iframe 中会加载 Center 到 iframe 内（iframe 套 iframe）
- 如果 Portal 使用 `window.location.href = '/center/'`，同样只改变 iframe URL

**风险等级**：**高**

**缓解措施**：
- 在 Portal 代码中检测是否在 iframe 中，如果是则使用 `window.top.location.href` 跳转
- 或者在包装页中监听 iframe 的 URL 变化，必要时整页刷新
- 更彻底的方案：在 Portal 和 Center 之间不直接跳转，而是通过平台壳层的模块切换器切换

---

### 风险 2：HashRouter 的 URL 不可分享

**场景**：用户在 Portal 中导航到 `/portal/#/orders/123`，想要分享这个链接。

**问题**：iframe 内的 URL 变化不会反映到浏览器地址栏。用户复制地址栏的 URL 永远是 `https://www.getpre.cn/modules/ipe-portal/`。

**风险等级**：**中**

**缓解措施**：
- 使用 `postMessage` 在 iframe 和父页面之间同步路由状态
- 父页面通过 `history.pushState` 更新地址栏（如 `/modules/ipe-portal/?route=/orders/123`）
- 但这需要修改 Portal 源码，增加复杂度

---

### 风险 3：构建耦合与版本管理

**场景**：mywayaiops 团队独立发布新版本，autoops-workspace 团队不知情。

**问题**：
- mywayaiops 的构建产物更新后，autoops-workspace 需要重新构建才能包含新版本
- 如果两个项目 CI/CD 独立，可能导致线上版本不一致
- 可能出现 autoops-workspace 已发布但 mywayaiops 产物是旧版本的情况

**风险等级**：**中**

**缓解措施**：
- 建立统一的发布流程：先构建 mywayaiops → 再构建 autoops-workspace → 统一部署
- 在 build-platform.mjs 中增加版本校验：如果 mywayaiops 产物不存在或版本不匹配，构建失败
- 或者将 mywayaiops 的构建产物作为 Git submodule 管理

---

### 风险 4：mywayaiops 主线变更导致整合失效

以下是 mywayaiops 可能发生的主线变更及对应风险：

#### 变更 A：新增第三个 SPA（如 Admin 后台）

**影响**：
- 需要新增模块注册、新增包装页、新增构建产物复制逻辑
- 首页卡片网格可能需要重新调整

**风险等级**：**中**

**应对**：每次新增 SPA 都需要走一遍完整的"注册→包装页→构建整合"流程。

---

#### 变更 B：base 路径变更（如 /portal/ → /service-portal/）

**影响**：
- vite.config.ts 中的 `base` 变更 → 构建产物中的资源引用路径变更
- Nginx 配置可能需要更新（如果从 HashRouter 改为 BrowserRouter）
- 模块注册表中的 entry 可能需要更新（如果包装页 iframe src 也改变）
- 包装页中的 iframe src 需要同步更新

**风险等级**：**高**

**应对**：建立变更检查清单，base 路径变更时必须同步修改：
1. vite.config.ts
2. 包装页 iframe src
3. Nginx 配置（如需要）
4. 构建脚本中的复制路径

---

#### 变更 C：路由模式变更（HashRouter → BrowserRouter）

**影响**：
- Nginx 必须添加 `try_files $uri $uri/ /portal/index.html;` 否则直接刷新子页面 404
- 当前 iframe 包装页方式下，BrowserRouter 的 URL 形如 `/portal/orders/123`，Nginx 需要正确处理

**风险等级**：**高**

**应对**：如果发生此变更，必须同步更新 Nginx 配置。

---

#### 变更 D：引入后端 API 服务

**影响**：
- 类似 ai-hub，需要独立的反向代理配置
- 需要端口管理、systemd 服务、防火墙规则
- 需要处理 iframe 内 API 请求的跨域问题（但同源下无此问题）

**风险等级**：**中**

**应对**：建立与 ai-hub 相同的部署模式（systemd + Nginx 反向代理）。

---

#### 变更 E：技术栈升级（Vite → Next.js / 引入 SSR）

**影响**：
- 构建产物结构可能完全改变
- 可能需要 Node.js 运行时（不再是纯静态文件）
- iframe 包装页模式可能不再适用

**风险等级**：**高**

**应对**：技术栈升级前必须评估对整合架构的影响。

---

#### 变更 F：组件库 / 共享包重大变更

**影响**：
- 如果 `@aiops/shared` 的导出结构改变，Portal 和 Center 都需要重新构建
- 如果引入新的全局样式，可能与平台壳层冲突（虽然 iframe 已隔离）

**风险等级**：**低**

**应对**：iframe 天然隔离 CSS/JS，共享包变更不影响平台壳层。

---

#### 变更 G：增加认证 / SSO

**影响**：
- 如果 Portal/Center 引入登录态，需要与平台壳层统一认证
- iframe 内的 Cookie 在同源下共享，但 Token 传递可能需要额外处理

**风险等级**：**中**

**应对**：统一认证机制（如 JWT 存储在 localStorage，同源 iframe 可读取）。

---

## 六、风险矩阵汇总

| 风险项 | 发生概率 | 影响程度 | 风险等级 | 应对策略 |
|--------|----------|----------|----------|----------|
| Portal ↔ Center 内部跳转失效 | 高 | 高 | **高** | 修改 Portal/Center 源码，iframe 内跳转使用 `window.top.location.href` |
| HashRouter URL 不可分享 | 中 | 中 | **中** | postMessage 同步路由状态（可选） |
| 构建耦合与版本不一致 | 中 | 中 | **中** | 统一发布流程，构建脚本增加版本校验 |
| base 路径变更 | 低 | 高 | **高** | 建立变更检查清单 |
| HashRouter → BrowserRouter | 低 | 高 | **高** | 同步更新 Nginx 配置 |
| 引入后端 API | 中 | 中 | **中** | 复用 ai-hub 的 systemd + Nginx 模式 |
| 技术栈升级（SSR） | 低 | 高 | **高** | 升级前评估整合架构影响 |
| 组件库重大变更 | 中 | 低 | **低** | iframe 天然隔离，无影响 |
| 增加认证/SSO | 中 | 中 | **中** | 统一认证机制 |

---

## 七、推荐实施顺序

**第一阶段（最小可行整合）**：
1. 注册两个模块（modules.json）
2. 创建包装页
3. 修改 module-switcher.js 支持 iframe 跳出
4. 更新 build-platform.mjs 复制 mywayaiops 产物
5. 本地验证：构建 → 访问 `/modules/ipe-portal/` → 切换回首页

**第二阶段（生产就绪）**：
1. 更新部署脚本和文档
2. 调整首页卡片网格布局（6-7 列适配）
3. 添加模块图标
4. 线上发布验证

**第三阶段（体验优化）**：
1. 解决 Portal ↔ Center 内部跳转问题
2. 可选：iframe 路由同步到地址栏
3. 统一帮助文档

---

## 八、关键决策建议

### 决策 1：Portal 和 Center 是否合并为一个模块？

**建议**：保持两个独立模块。

理由：
- 面向用户不同（外部客户 vs 内部运营）
- 功能域不同（服务申请 vs 运营管理）
- 独立模块权限控制更灵活（未来可基于用户角色显示/隐藏）

### 决策 2：是否需要在 Portal/Center 内部注入 module-switcher？

**建议**：不需要。module-switcher 放在 iframe 包装页的顶栏中即可。

理由：
- Portal/Center 有自己的顶栏和导航，再注入一个切换器会冲突
- 包装页的顶栏已提供"业务模块"切换按钮，足够使用
- 零侵入 mywayaiops 源码

### 决策 3：mywayaiops 是否应迁移到 autoops-workspace 的子目录中？

**建议**：保持独立仓库/目录，通过构建产物整合。

理由：
- mywayaiops 技术栈（React/Vite）与 autoops-workspace（原生 HTML/JS）差异大
- 独立演进避免构建脚本互相干扰
- 两个团队可独立开发、独立发布
