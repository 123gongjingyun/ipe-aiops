# 各模块申请新增/编辑/查看后保留在当前模块设计

## 背景

当前左侧菜单包含多个独立模块：容器申请、虚拟机申请、OBS申请、SFS申请、用户权限申请、网络需求收集等。每个模块都有独立的列表页面和表单页面（或同页内的列表/表单视图）。

存在的问题：
- 用户从左侧菜单进入某个模块后，点击“新增”“编辑”或“查看”，操作完成或取消后，页面状态或路由可能回到“我的申请”汇总页，而不是用户进入的模块页。
- 这种跳转打断了用户的工作流，尤其需要连续处理同一类型申请时效率较低。

## 目标

确保用户从左侧菜单进入任意模块后，进行新增、编辑、查看等操作，完成或取消后仍停留在该模块对应的页面/视图中。

同时，"我的申请"（Dashboard）中的编辑按钮也应跳转到对应模块页面并携带编辑状态，保持全站行为一致。

## 涉及模块

- 容器申请（`/container-request`）→ `ContainerRequest.vue`
- 虚拟机申请（`/vm-request`）→ `CreateRequest.vue`
- OBS申请（`/obs-request`）→ `OBSRequest.vue`
- SFS申请（`/sfs-request`）→ `SFSRequest.vue`
- 用户权限申请（`/permission-request`）→ `PermissionRequest.vue`
- 网络需求收集（`/network-policy`）→ `NetworkPolicy.vue`

## 方案

### 方案一（推荐）：模块内列表/表单同页切换

各模块页面自身维护 `currentView` 状态（list / form / detail），新增、编辑、查看都在当前路由下通过组件状态切换完成，不离开当前页面。取消或提交成功后切换回 list 视图。

优点：
- 无需修改路由
- 用户体验最流畅
- 刷新页面后可通过 query 参数恢复状态

缺点：
- 需要各模块页面支持内部视图切换
- 部分模块可能当前使用弹窗或跳转，需要统一改造

### 方案二：路由参数驱动同一页面

在同一页面内通过 `?view=form&mode=edit&id=123` 等 query 参数控制显示列表还是表单。取消或提交成功后清除 query 参数即可回到列表。

优点：
- URL 可分享/可刷新
- 无需新增路由

缺点：
- 需要各模块页面读取 query 并响应
- 如果模块当前未使用 query 驱动，改动量较大

### 方案三：每个操作使用独立路由

为新增、编辑分别配置独立路由，如 `/vm-request/create`、`/vm-request/edit/:id`。操作完成后 `router.back()` 或 `router.push('/vm-request')`。

优点：
- 路由语义清晰
- 适合复杂表单页面

缺点：
- 需要新增多个路由
- 返回逻辑需要确保来源正确

## 推荐方案

采用**方案一（模块内列表/表单同页切换）**，对于当前已经使用路由或弹窗的模块，根据其实际实现做最小化调整：

1. 如果模块当前是同页内视图切换（如 CreateRequest.vue），确保提交/取消后回到 list 视图即可。
2. 如果模块当前使用弹窗进行编辑/查看，保持弹窗方式，关闭弹窗即回到当前列表。
3. 如果模块当前跳转到 Dashboard 或其他页面，需要改为在当前模块内打开表单或弹窗。

## Dashboard 编辑按钮行为

Dashboard 中各模块的编辑按钮统一跳转到对应模块路由，并通过 query 或 sessionStorage 传递编辑状态：

- 容器申请：`/container-request?edit=1&id=<id>`
- 虚拟机申请：`/vm-request`（通过 sessionStorage 传递 editRequestId/editRequestData）
- OBS申请：`/obs-request?edit=1&id=<id>`
- SFS申请：`/sfs-request?edit=1&id=<id>`
- 用户权限申请：`/permission-request?edit=1&id=<id>`
- 网络需求收集：`/network-policy?edit=1&id=<id>`

目标模块页面在加载时读取这些状态，自动进入编辑模式。

## 影响范围

- 前端各模块页面：`ContainerRequest.vue`、`CreateRequest.vue`、`OBSRequest.vue`、`SFSRequest.vue`、`PermissionRequest.vue`、`NetworkPolicy.vue`
- Dashboard 编辑按钮：`Dashboard.vue`
- 路由文件：`router/index.js`（可能不需要改动，视实现而定）

## 验收标准

- [ ] 从左侧菜单进入任意模块，点击新增后仍在该模块页面内
- [ ] 从左侧菜单进入任意模块，点击编辑后仍在该模块页面内
- [ ] 从左侧菜单进入任意模块，点击查看详情后仍在该模块页面内
- [ ] 取消或提交成功后，回到该模块的列表视图
- [ ] 从 Dashboard 点击各模块编辑按钮，跳转到对应模块并进入编辑模式
- [ ] 页面刷新后，如果通过 Dashboard 进入编辑模式，仍能正确恢复编辑状态
