# 用户需求录入模块设计文档

**日期**: 2026-07-07  
**状态**: 设计阶段  
**类型**: 新功能开发

## 1. 项目概述

### 1.1 目标
在现有资源申请管理系统中新增「用户需求录入」模块。用户可以在线填写《资源申请用户需求.xlsx》中的「用户侧回答」列内容；管理员可以维护问题分类和题目；系统支持把填写结果导出为 Excel 多 sheet 文件中的一个 sheet。

### 1.2 核心需求
- **独立模块**: 不依附于 VM/容器/网络策略等现有资源申请单，一期也不与它们关联。
- **可配置分类**: 支持管理员维护大类/小类/问题项三层结构。
- **无审批流程**: 保存即生效，任何状态下都可以编辑和删除。
- **权限控制**: 普通用户只能管理自己的需求单；管理员可以查看全部并维护分类。
- **Excel 导出**: 复用现有 Excel 导出能力，将「用户需求」作为多 sheet 文件中的一个 sheet 导出。

## 2. 架构设计

### 2.1 整体架构
```
┌─────────────────────────────────────────────────────────────┐
│                        前端 (Vue 3)                          │
├─────────────────────────────────────────────────────────────┤
│  UserRequirement.vue        - 需求单列表（搜索/分页/导出）     │
│  UserRequirementForm.vue    - 新增/编辑表单                   │
│  UserRequirementDetail.vue  - 详情弹窗                        │
│  RequirementCategoryManage.vue - 分类维护（仅管理员）         │
└─────────────────────────────────────────────────────────────┘
                            ↓ API 调用
┌─────────────────────────────────────────────────────────────┐
│                    后端 (Express.js)                         │
├─────────────────────────────────────────────────────────────┤
│  /api/user-requirements       - 需求单 CRUD 与导出           │
│  /api/requirement-categories  - 分类维护                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      数据库 (MySQL)                          │
├─────────────────────────────────────────────────────────────┤
│  user_requirements            - 需求单主表                   │
│  requirement_categories       - 可配置分类与问题项           │
│  requirement_answers          - 用户填写的答案             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 设计原则
- **遵循现有模式**: 复用现有请求模块的 Vue 视图、Express 控制器/模型、权限校验、分页组件。
- **数据解耦**: 分类配置与填写答案分离，修改分类不影响历史数据。
- **配置优先**: 问题项由管理员在独立页面维护，避免每次调整都改代码。
- **Excel 复用**: 不维护模板单元格坐标，而是按行导出为结构化 sheet，与现有导出风格一致。

## 3. 数据库设计

### 3.1 分类与问题项表
```sql
CREATE TABLE requirement_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  parent_id INT NULL COMMENT '父分类 ID，顶层为 NULL',
  name VARCHAR(200) NOT NULL COMMENT '名称（大类/小类/问题项）',
  description TEXT COMMENT '填写说明',
  reference TEXT COMMENT '参考示例',
  level TINYINT NOT NULL COMMENT '层级：1 大类，2 小类，3 问题项',
  sort_order INT DEFAULT 0 COMMENT '排序',
  is_active TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_parent_sort (parent_id, sort_order),
  INDEX idx_level (level),
  FOREIGN KEY (parent_id) REFERENCES requirement_categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='需求分类与问题项配置';
```

### 3.2 用户需求单主表
```sql
CREATE TABLE user_requirements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL COMMENT '需求标题',
  applicant_id INT NOT NULL COMMENT '申请人ID',
  applicant_name VARCHAR(100) COMMENT '申请人姓名',
  status VARCHAR(50) DEFAULT 'active' COMMENT '状态，默认 active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_applicant (applicant_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户需求单';
```

### 3.3 答案表
```sql
CREATE TABLE requirement_answers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  requirement_id INT NOT NULL COMMENT '需求单ID',
  category_id INT NOT NULL COMMENT '问题项ID',
  answer_text TEXT COMMENT '用户填写的答案',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_requirement_category (requirement_id, category_id),
  INDEX idx_requirement (requirement_id),
  FOREIGN KEY (requirement_id) REFERENCES user_requirements(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES requirement_categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户需求答案';
```

## 4. API 设计

### 4.1 用户需求单
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/user-requirements | 列表（用户只能看自己的，管理员可看全部，支持分页/搜索） |
| GET | /api/user-requirements/:id | 详情（含分类树和答案） |
| POST | /api/user-requirements | 创建（连同答案一起提交） |
| PUT | /api/user-requirements/:id | 更新（任何状态可编辑） |
| DELETE | /api/user-requirements/:id | 删除 |
| POST | /api/user-requirements/:id/export | 导出当前需求单为 Excel |

### 4.2 分类维护（仅管理员）
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/requirement-categories | 获取树形分类 |
| POST | /api/requirement-categories | 新增分类/问题项 |
| PUT | /api/requirement-categories/:id | 更新 |
| DELETE | /api/requirement-categories/:id | 软删除（is_active=0） |
| PUT | /api/requirement-categories/sort | 批量更新排序 |

### 4.3 请求/响应示例
创建需求单：
```json
POST /api/user-requirements
{
  "title": "车联网平台新增模块需求",
  "answers": [
    { "category_id": 3, "answer_text": "新增用户、社区功能" },
    { "category_id": 5, "answer_text": "e.IT供应商" }
  ]
}
```

## 5. 前端设计

### 5.1 页面清单
| 页面 | 路径 | 说明 |
|---|---|---|
| 列表页 | /user-requirements | 展示需求单，支持搜索、分页、导出 |
| 表单页 | /user-requirements/create 和 /user-requirements/:id/edit | 按分类展示问题项并填写答案 |
| 详情弹窗 | - | 在列表页点击行弹出，展示完整答案 |
| 分类维护页 | /requirement-categories | 仅管理员可见，维护三层分类 |

### 5.2 表单页交互
- 左侧或顶部按「大类 → 小类」分组展示问题项。
- 每个问题项显示名称、填写说明、参考示例。
- 答案使用多行文本框，支持长文本。
- 未填写的题目也占位，保存时统一提交。

### 5.3 导航入口
在 `Main.vue` 侧边栏增加「用户需求录入」菜单项，所有登录用户可见；分类维护仅管理员可见。

## 6. Excel 导出设计

复用现有 `excelController.js` / `excelExporter.js` 的多 sheet 导出能力。

- **Sheet 名称**: `用户需求`。
- **表头**: 大类、小类、问题项、用户侧回答、填写说明、参考示例。
- **数据行**: 按 `sort_order` 展开所有问题项，每个问题项一行，取对应答案；无答案时留空。
- **批量导出**: 后续若支持，每个需求单可作为一个独立 sheet，或在单个 sheet 中用标题行分隔。

## 7. 权限设计

沿用现有 JWT + 角色模式：

- **普通用户**
  - 只能看到自己的需求单。
  - 可以新增、编辑、删除自己的需求单。
  - 可以导出自己的需求单。
- **管理员**
  - 可以看到全部需求单。
  - 可以编辑、删除任意需求单。
  - 可以维护分类/问题项。
  - 可以导出任意需求单。

后端通过 `req.user.id` 与 `applicant_id` 比较；管理员跳过所有权校验。

## 8. 边界与错误处理

- **删除问题项**: 若已有答案关联，执行软删除（`is_active = 0`），避免历史数据断裂。
- **新增问题项**: 已存在的需求单自动显示为新题目且答案为空。
- **排序调整**: 即时生效，已填写的答案按新排序展示。
- **编辑冲突**: 无审批流，后保存覆盖，本期不处理并发冲突。
- **空答案保存**: 允许空答案，但保留 `requirement_answers` 记录，确保导出时顺序稳定。

## 9. 依赖与复用

- **前端**: 复用 `axios` 实例、`userStore`、分页组件、`Main.vue` 侧边栏布局、Element Plus 表单/表格/弹窗组件。
- **后端**: 复用 `auth` 中间件、`isAdmin` 校验、`excelExporter.js` 工具、统一响应格式。
- **数据库**: 仅新增三张表，不改动现有业务表。
