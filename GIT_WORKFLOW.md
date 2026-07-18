# Git 工作流规范

> 适用范围：`project-mywayaiops-refactor-V2`
> 目的：防止回滚/恢复时覆盖未保存的优化，确保每次改动可追踪、可回退。

---

## 1. 基本原则

- **所有改动必须通过 Git 管理**，禁止直接 `cp` 覆盖核心文件。
- **一个分支只做一件事**：字段调整、UI 优化、校验逻辑，各开一个分支。
- **提交前必须自己看 diff**：确保没有 unintended 的改动。
- **核心文件改动前必须先 commit 或 stash 当前状态**。

---

## 2. 核心文件清单

以下文件属于高风险文件，改动前必须按本规范操作：

```text
src/packages/aiops-service-portal/src/pages/workbench.tsx
src/packages/aiops-service-portal/src/pages/request-records.tsx
src/packages/aiops-service-portal/src/pages/request-review-export.tsx
src/packages/aiops-service-portal/src/components/apply-wizard.tsx
src/packages/aiops-service-portal/src/components/apply-service.tsx
src/packages/aiops-service-portal/src/components/portal-layout.tsx
src/packages/aiops-service-portal/src/pages/common-requests.tsx
src/packages/aiops-service-portal/src/components/fill-guide-dialog.tsx
```

---

## 3. 推荐工作流

### 3.1 开始新任务前

```bash
# 确保当前分支干净
git status

# 从 main 切出新分支，分支名说明意图
git checkout -b feature/container-fields-finalize
```

### 3.2 开发过程中

```bash
# 小步提交，message 说明清楚
git add src/packages/aiops-service-portal/src/pages/workbench.tsx
git commit -m "容器申请：调整字段为单实例 CPU/内存，总资源自动计算"
```

### 3.3 开发完成后

```bash
# 先看 diff 确认只改了该改的内容
git diff main...feature/container-fields-finalize

# 合并回 main
git checkout main
git merge feature/container-fields-finalize
```

---

## 4. 回滚规范（重点）

### 4.1 禁止行为

❌ 禁止直接用历史文件覆盖当前文件：

```bash
# 错误示例
cp workbench.tsx.bak.20260717 workbench.tsx
```

### 4.2 正确做法

**场景 A：只想恢复某个历史版本的某部分代码**

```bash
# 查看该文件历史
git log --oneline -- src/pages/workbench.tsx

# 查看某次提交改了什么
git show <commit-hash> -- src/pages/workbench.tsx

# 只提取某个函数/字段到当前文件
git show <commit-hash>:src/pages/workbench.tsx > /tmp/workbench_old.tsx
# 然后手工 diff / patch，不要把整个文件复制回来
```

**场景 B：需要整体回退到某次提交**

```bash
# 先保存当前状态到一个分支
git checkout -b backup/before-rollback

# 然后 main 回退
git checkout main
git reset --hard <commit-hash>

# 或者只回退单个文件
git checkout <commit-hash> -- src/pages/workbench.tsx
```

**场景 C：想撤销某次提交但保留后续提交**

```bash
git revert <commit-hash>
```

---

## 5. 提交信息规范

提交信息必须说明「改了什么」和「为什么」：

```text
类型: 简短描述

- 改动范围：
- 影响页面/组件：
- 是否涉及字段/接口变更：
```

示例：

```text
feat: 容器申请表单增加单实例 CPU/内存与自动计算

- 移除镜像、命名空间字段
- 新增 containerCpuPerInstance / containerMemoryPerInstance
- 总 CPU/内存根据实例数自动计算
- 影响页面：workbench.tsx / request-review-export.tsx
```

---

## 6. 提交前 Checklist

- [ ] `git diff --cached` 检查改动范围
- [ ] 确认没有无关文件被改动
- [ ] 运行 `npx tsc --noEmit` 通过
- [ ] 运行 `npm run dev` 验证页面正常
- [ ] 提交信息写清楚范围和影响

---

## 7. 紧急恢复

如果不小心覆盖了文件：

```bash
# 查看 reflog，找到覆盖前的 commit
git reflog

# 恢复到该状态
git reset --hard <commit-hash>
```

`git reflog` 可以找回几乎所有本地操作历史，是最后的保险。
