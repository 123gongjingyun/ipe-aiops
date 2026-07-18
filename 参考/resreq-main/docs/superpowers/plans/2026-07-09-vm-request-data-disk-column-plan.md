# 虚拟机申请列表添加数据盘展示列 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在左侧菜单“虚拟机申请”对应的列表页面中，为表格新增“数据盘(GB)”列，展示每条记录的每节点数据盘大小。

**Architecture：** 在 `frontend/src/views/CreateRequest.vue` 的 el-table 列定义中，于“系统盘(GB)”列之后插入新的 el-table-column，绑定 `row.data_disk`，空值显示为 `-`，列宽 100px，居中对齐。不修改数据模型、API 或业务逻辑。

**Tech Stack：** Vue 3, Element Plus

---

## File Structure

| File | Change Type | Responsibility |
|------|-------------|----------------|
| `frontend/src/views/CreateRequest.vue` | Modify | 在“我的虚拟机申请列表”表格中新增“数据盘(GB)”列 |

---

## Task 1: Add data disk column to VM request list

**Files:**
- Modify: `frontend/src/views/CreateRequest.vue:53-67`

### Current code

```vue
              <el-table-column prop="system_disk" label="系统盘(GB)" width="100" align="center">
                <template #default="scope">
                  {{ scope.row.system_disk || '-' }}
                </template>
              </el-table-column>
              <el-table-column label="总数据盘(GB)" width="120" align="center">
                <template #default="scope">
                  {{ calculateTotalDataDisk(scope.row) }}
                </template>
              </el-table-column>
```

- [ ] **Step 1: Insert the data disk column after system disk column**

在“系统盘(GB)”列之后、“总数据盘(GB)”列之前插入如下列：

```vue
              <el-table-column prop="data_disk" label="数据盘(GB)" width="100" align="center">
                <template #default="scope">
                  {{ scope.row.data_disk || '-' }}
                </template>
              </el-table-column>
```

修改后的代码应为：

```vue
              <el-table-column prop="system_disk" label="系统盘(GB)" width="100" align="center">
                <template #default="scope">
                  {{ scope.row.system_disk || '-' }}
                </template>
              </el-table-column>
              <el-table-column prop="data_disk" label="数据盘(GB)" width="100" align="center">
                <template #default="scope">
                  {{ scope.row.data_disk || '-' }}
                </template>
              </el-table-column>
              <el-table-column label="总数据盘(GB)" width="120" align="center">
                <template #default="scope">
                  {{ calculateTotalDataDisk(scope.row) }}
                </template>
              </el-table-column>
```

- [ ] **Step 2: Verify the change locally**

打开文件确认插入位置正确，且未破坏相邻列的结构。

```bash
sed -n '50,75p' /Users/jiangli/claude-code-projects/vmconf-web/frontend/src/views/CreateRequest.vue
```

Expected output: 应看到新插入的“数据盘(GB)”列位于“系统盘(GB)”与“总数据盘(GB)”之间。

- [ ] **Step 3: Run lint/build check**

在前端目录下运行构建命令，确保没有语法错误。

```bash
cd /Users/jiangli/claude-code-projects/vmconf-web/frontend
npm run build
```

Expected output: 构建成功，无与 CreateRequest.vue 相关的错误。

- [ ] **Step 4: Manual verification in browser**

启动开发服务器并访问“虚拟机申请”页面：

```bash
cd /Users/jiangli/claude-code-projects/vmconf-web/frontend
npm run dev
```

1. 登录系统，进入左侧菜单“虚拟机申请”。
2. 确认列表表格中出现“数据盘(GB)”列，位于“系统盘(GB)”之后、“总数据盘(GB)”之前。
3. 确认有数据盘值的记录正确显示数值（如 `100`）。
4. 确认无数据盘值的记录显示为 `-`。
5. 确认“总数据盘(GB)”和“总磁盘(GB)”列仍然正常显示。

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/CreateRequest.vue
git commit -m "feat: 虚拟机申请列表新增数据盘(GB)列

在“我的虚拟机申请列表”表格中展示每节点数据盘大小，位于系统盘之后、总数据盘之前。空值显示为 '-'。"
```

---

## Self-Review

**1. Spec coverage:**
- 新增“数据盘(GB)”列 ✓ (Task 1 Step 1)
- 字段来源 `row.data_disk` ✓ (Step 1)
- 空值显示为 `-` ✓ (Step 1)
- 列宽 100px，居中对齐 ✓ (Step 1)
- 保留现有“总数据盘(GB)”和“总磁盘(GB)”列 ✓ (Step 1 未修改这两列)
- 布局无异常 ✓ (Step 3, Step 4)

**2. Placeholder scan:** 无 TBD/TODO，所有步骤包含具体代码和命令。

**3. Type consistency:** 使用 `scope.row.data_disk`，与详情对话框及现有计算函数中的字段名一致。
