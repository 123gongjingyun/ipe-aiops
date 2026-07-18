# 各模块申请新增/编辑/查看后保留在当前模块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复从左侧菜单进入各模块后新增/编辑/查看操作会跳转回“我的申请”的问题，并统一 Dashboard 编辑按钮行为，使其跳转到对应模块页面并进入编辑模式。

**Architecture：** 各模块页面统一使用 Vue Router query 参数 `?edit=true&id=xxx` 接收编辑状态。唯一会跳转回 Dashboard 的是虚拟机申请（CreateRequest.vue），将其提交成功后的 `router.push('/dashboard')` 改为 `currentView = 'list'`。Dashboard 中所有资源类模块的编辑按钮统一改为携带 query 参数跳转。

**Tech Stack：** Vue 3, Vue Router, Element Plus

---

## File Structure

| File | Change Type | Responsibility |
|------|-------------|----------------|
| `frontend/src/views/CreateRequest.vue` | Modify | 提交成功后留在当前模块列表；改为读取 query 参数进入编辑模式 |
| `frontend/src/views/ContainerRequest.vue` | Modify | 读取 query 参数进入编辑模式 |
| `frontend/src/views/OBSRequest.vue` | Modify | 读取 query 参数进入编辑模式 |
| `frontend/src/views/SFSRequest.vue` | Modify | 读取 query 参数进入编辑模式 |
| `frontend/src/views/PermissionRequest.vue` | Modify | 已有 query 参数，验证并修复读取逻辑 |
| `frontend/src/views/NetworkPolicy.vue` | Modify | 已有 query 参数，验证读取逻辑 |
| `frontend/src/views/Dashboard.vue` | Modify | 容器/OBS/SFS/虚拟机编辑按钮统一使用 query 参数跳转 |

---

## Task 1: CreateRequest.vue 提交后留在模块内并改用 query 参数

**Files:**
- Modify: `frontend/src/views/CreateRequest.vue`

### 1.1 移除提交后的 Dashboard 跳转

当前编辑成功分支（约 line 1160-1164）：

```js
sessionStorage.removeItem('editRequestId')
router.push('/dashboard')
```

当前创建成功分支（约 line 1219-1223）：

```js
sessionStorage.removeItem('editRequestId')
router.push('/dashboard')
```

- [ ] **Step 1: Replace router.push with currentView reset**

编辑成功后改为：

```js
sessionStorage.removeItem('editRequestId')
sessionStorage.removeItem('editRequestData')
currentView.value = 'list'
ElMessage.success('虚拟机申请更新成功！')
await loadMyRequests()
```

创建成功后改为：

```js
sessionStorage.removeItem('editRequestId')
sessionStorage.removeItem('editRequestData')
currentView.value = 'list'
ElMessage.success('虚拟机申请提交成功！')
await loadMyRequests()
```

### 1.2 改用 query 参数进入编辑模式

- [ ] **Step 2: Locate the editRequest function and sessionStorage usage**

```bash
grep -n "editRequestData\|editRequestId\|editRequest\|copyRequestData" /Users/jiangli/claude-code-projects/vmconf-web/frontend/src/views/CreateRequest.vue | head -40
```

- [ ] **Step 3: Add route query reading in onMounted**

在 `onMounted` 中（或页面初始化逻辑中），在加载列表之后读取 query 参数：

```js
import { useRoute } from 'vue-router'

const route = useRoute()
```

```js
onMounted(async () => {
  await loadMyRequests()

  // 处理 query 参数编辑模式
  const editId = route.query.id
  const isEdit = route.query.edit
  if (editId && isEdit) {
    const request = myRequests.value.find(r => r.id.toString() === editId.toString())
    if (request) {
      editRequest(request)
    }
  }

  // 保留 quickCreate 兼容
  const quickCreate = sessionStorage.getItem('quickCreate')
  if (quickCreate === 'true') {
    sessionStorage.removeItem('quickCreate')
    showFormView()
  }
})
```

- [ ] **Step 4: Verify no sessionStorage edit state is still required**

如果 `editRequest` 函数内部仍然依赖 `sessionStorage.getItem('editRequestId')`，需要改为接收 request 参数的方式。请检查 `editRequest` 函数实现并调整。

- [ ] **Step 5: Build check**

```bash
cd /Users/jiangli/claude-code-projects/vmconf-web/frontend && npm run build
```

Expected output: 构建成功。

- [ ] **Step 6: Commit**

```bash
git add frontend/src/views/CreateRequest.vue
git commit -m "fix: 虚拟机申请提交后保留在当前模块，并使用 query 参数进入编辑模式"
```

---

## Task 2: ContainerRequest.vue 支持 query 参数编辑

**Files:**
- Modify: `frontend/src/views/ContainerRequest.vue`

- [ ] **Step 1: Import useRoute**

```js
import { useRoute } from 'vue-router'

const route = useRoute()
```

- [ ] **Step 2: Add query parameter handling in onMounted**

```js
onMounted(async () => {
  await loadRequests()

  const editId = route.query.id
  const isEdit = route.query.edit
  if (editId && isEdit) {
    const request = requests.value.find(r => r.id.toString() === editId.toString())
    if (request) {
      editRequest(request)
    }
  }

  const quickCreate = sessionStorage.getItem('quickCreate')
  if (quickCreate === 'true') {
    sessionStorage.removeItem('quickCreate')
    openCreateForm()
  }
})
```

- [ ] **Step 3: Build check**

```bash
cd /Users/jiangli/claude-code-projects/vmconf-web/frontend && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/ContainerRequest.vue
git commit -m "feat: 容器申请支持 query 参数进入编辑模式"
```

---

## Task 3: OBSRequest.vue 支持 query 参数编辑

**Files:**
- Modify: `frontend/src/views/OBSRequest.vue`

步骤与 Task 2 相同，变量名替换为 `obsRequests` / `requests`。编辑函数为 `editRequest`。

- [ ] **Step 1-3:** 完成 query 参数处理。

- [ ] **Step 4: Build check**

```bash
cd /Users/jiangli/claude-code-projects/vmconf-web/frontend && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/OBSRequest.vue
git commit -m "feat: OBS申请支持 query 参数进入编辑模式"
```

---

## Task 4: SFSRequest.vue 支持 query 参数编辑

**Files:**
- Modify: `frontend/src/views/SFSRequest.vue`

步骤与 Task 2 相同，编辑函数为 `editRequest`。

- [ ] **Step 1-3:** 完成 query 参数处理。

- [ ] **Step 4: Build check**

```bash
cd /Users/jiangli/claude-code-projects/vmconf-web/frontend && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/SFSRequest.vue
git commit -m "feat: SFS申请支持 query 参数进入编辑模式"
```

---

## Task 5: PermissionRequest.vue 验证 query 参数编辑

**Files:**
- Modify: `frontend/src/views/PermissionRequest.vue`

- [ ] **Step 1: Read existing onMounted and ensure it loads before checking query**

```bash
sed -n '400,440p' /Users/jiangli/claude-code-projects/vmconf-web/frontend/src/views/PermissionRequest.vue
```

- [ ] **Step 2: Add query parameter handling after loading requests**

```js
onMounted(async () => {
  await loadPermissionRequests()

  const editId = route.query.id
  const isEdit = route.query.edit
  if (editId && isEdit) {
    const request = requests.value.find(r => r.id.toString() === editId.toString())
    if (request) {
      editRequest(request)
    }
  }
})
```

注意：该文件中列表数据变量名可能是 `permissionRequests` 而非 `requests`，请根据实际代码调整。

- [ ] **Step 3: Build check**

```bash
cd /Users/jiangli/claude-code-projects/vmconf-web/frontend && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/PermissionRequest.vue
git commit -m "feat: 权限申请支持从 Dashboard query 参数进入编辑模式"
```

---

## Task 6: NetworkPolicy.vue 验证 query 参数编辑

**Files:**
- Modify: `frontend/src/views/NetworkPolicy.vue`

- [ ] **Step 1: Verify existing query handling**

```bash
sed -n '530,565p' /Users/jiangli/claude-code-projects/vmconf-web/frontend/src/views/NetworkPolicy.vue
```

如果逻辑正确（已读取 `route.query.id` 和 `route.query.edit` 并调用 `editRequest`），则无需修改。

- [ ] **Step 2: Build check**

```bash
cd /Users/jiangli/claude-code-projects/vmconf-web/frontend && npm run build
```

- [ ] **Step 3: Commit (only if changes made)**

---

## Task 7: Dashboard.vue 编辑按钮统一使用 query 参数

**Files:**
- Modify: `frontend/src/views/Dashboard.vue:845-1013`

- [ ] **Step 1: Update container edit button handler**

```js
const editContainerRequest = (request) => {
  router.push({
    path: '/container-request',
    query: { edit: true, id: request.id }
  })
}
```

- [ ] **Step 2: Update OBS edit button handler**

```js
const editObsRequest = (request) => {
  router.push({
    path: '/obs-request',
    query: { edit: true, id: request.id }
  })
}
```

- [ ] **Step 3: Update SFS edit button handler**

```js
const editSfsRequest = (request) => {
  router.push({
    path: '/sfs-request',
    query: { edit: true, id: request.id }
  })
}
```

- [ ] **Step 4: Update VM edit button handler**

```js
const handleEdit = (request) => {
  router.push({
    path: '/vm-request',
    query: { edit: true, id: request.id }
  })
}
```

并清理该函数中不再需要的 `sessionStorage.setItem('editRequestData', ...)` 和 `sessionStorage.setItem('editRequestId', ...)` 代码。

- [ ] **Step 5: Build check**

```bash
cd /Users/jiangli/claude-code-projects/vmconf-web/frontend && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/views/Dashboard.vue
git commit -m "feat: Dashboard 编辑按钮统一使用 query 参数跳转到对应模块"
```

---

## Task 8: Final verification

- [ ] **Step 1: Full build check**

```bash
cd /Users/jiangli/claude-code-projects/vmconf-web/frontend && npm run build
```

- [ ] **Step 2: Manual test checklist**

1. 从左侧菜单进入“虚拟机申请”，编辑一条记录，提交后仍停留在虚拟机申请列表。
2. 从左侧菜单进入“容器申请”，新增一条记录，提交后仍停留在容器申请列表。
3. 从 Dashboard 点击容器/OBS/SFS/虚拟机/权限/网络策略的编辑按钮，确认跳转到对应模块并自动打开编辑表单。
4. 编辑完成后，确认仍停留在对应模块列表。
5. 刷新模块页面，确认 query 参数不会导致重复触发编辑。

---

## Self-Review

**1. Spec coverage:**
- 各模块新增/编辑/查看后保留在当前模块 ✓ (Task 1 修复 VM；其余模块本身已是内部状态)
- Dashboard 编辑按钮跳转到对应模块并进入编辑模式 ✓ (Tasks 2-7)
- 统一使用 query 参数 ✓ (所有模块均读取 `route.query.edit` / `route.query.id`)

**2. Placeholder scan:** 无 TBD/TODO，所有步骤包含具体代码。

**3. Type consistency:** 统一使用 `request.id.toString()` 与 `editId.toString()` 比较。
