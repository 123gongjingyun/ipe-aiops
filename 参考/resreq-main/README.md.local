# 资源申请管理系统

基于Vue3 + Express.js + MySQL的现代化资源申请管理系统，用于替代传统Excel流程，提供便捷的资源申请、配置管理和数据导出功能。

## 技术栈

- **前端**: Vue3 + Element Plus + Vite
- **后端**: Express.js + MySQL
- **部署**: Docker + Docker Compose

## 功能特性

### 用户功能
- ✅ 用户注册/登录（账号密码认证）
- ✅ 批量创建资源申请（分页模式，每页5-10行）
- ✅ 实时配置预览
- ✅ 卡片式展示申请记录
- ✅ 基础搜索功能
- ✅ 编辑、复制、删除申请记录
- ✅ 导出Excel（保留原模板公式）

### 管理员功能
- ✅ 用户管理（增删改查、重置密码）
- ✅ 配置类型管理（数据库、RabbitMQ、Redis等）
- ✅ 环境管理（测试、生产）
- ✅ 配置选项管理（配置A-小型、配置B-中型等）
- ✅ 配置详细说明管理（性能指标、适用场景、推荐等级）
- ✅ 3级联动关系管理

## 数据库设计

系统包含以下核心数据表：
- `users` - 用户表
- `config_types` - 配置类型表
- `environments` - 环境表
- `config_options` - 配置选项表
- `config_descriptions` - 配置详细说明表
- `linkage_relations` - 3级联动关系表
- `resource_requests` - 资源申请表

## 快速开始

### 1. 使用Docker启动（推荐）

```bash
# 构建并启动所有服务
npm run docker:up

# 查看服务状态
docker-compose ps

# 停止服务
npm run docker:down
```

### 2. 本地开发

#### 后端开发
```bash
cd backend
npm install
npm run dev
```

#### 前端开发
```bash
cd frontend
npm install
npm run dev
```

### 3. 数据库初始化

系统首次启动时会自动执行 `database-design.sql` 初始化数据库。

**用户注册**：
- 系统支持用户自助注册功能
- 新注册用户默认为普通用户角色
- 普通用户只能查看和管理自己的资源申请

**管理员账户**：
- 系统初始化时会创建默认管理员账户
- 用户名：`admin`
- 密码：`bgt56yhN$`
- 管理员可以查看所有用户的申请记录，管理配置和用户

## 项目结构

```
vmconf-web/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── routes/         # 路由
│   │   ├── controllers/    # 控制器
│   │   ├── models/         # 数据模型
│   │   ├── middleware/     # 中间件
│   │   ├── utils/          # 工具函数
│   │   └── config/         # 配置文件
│   ├── server.js           # 服务入口
│   └── package.json
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── views/          # 页面组件
│   │   ├── components/     # 通用组件
│   │   ├── stores/         # 状态管理
│   │   ├── router/         # 路由配置
│   │   ├── api/            # API接口
│   │   └── utils/          # 工具函数
│   ├── index.html
│   └── package.json
├── database-design.sql     # 数据库设计
├── docker-compose.yml      # Docker编排文件
└── README.md
```

## 系统特性

### 统一配置字段结构
系统采用统一字段结构管理所有类型应用的配置详细说明：

- **性能指标**: 并发连接数、吞吐量、响应时间、IOPS等
- **资源配置**: CPU/内存/磁盘详细说明
- **适用场景**: 使用场景描述、用户规模
- **推荐等级**: 不推荐/一般/推荐/强烈推荐/顶级
- **技术说明**: 技术选型建议和注意事项

### 3级联动配置
支持类型 → 环境 → 配置选择的层级关系管理，用户选择时自动联动。

### 卡片式UI设计
现代化卡片界面，直观展示资源申请信息和配置详情。

## 开发计划

当前系统已完成基础架构和UI界面，后续开发计划：

- [ ] 后端API接口实现
- [ ] 数据库连接和操作
- [ ] 用户认证和权限管理
- [ ] Excel导出功能（保留公式）
- [ ] 配置管理完整功能
- [ ] 3级联动前端实现
- [ ] 表单验证和错误处理

## 贡献指南

欢迎提交Issue和Pull Request来改进项目。

## 许可证

MIT License