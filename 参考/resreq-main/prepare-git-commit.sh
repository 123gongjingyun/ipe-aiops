#!/bin/bash

# 虚拟机申请导出功能完善 - Git提交准备脚本

echo "🔄 准备Git提交..."

# 添加所有修改的文件
echo "📝 添加修改的文件..."
git add backend/server.js
git add backend/src/controllers/vmRequestController.js
git add backend/src/routes/vmRequest.js
git add frontend/src/api/vmRequest.js
git add frontend/src/views/Dashboard.vue
git add frontend/src/views/CreateRequest.vue
git add frontend/src/views/PermissionRequest.vue

# 添加文档文件
echo "📄 添加文档文件..."
git add CHANGELOG_VM_REQUEST_EXPORT.md

echo "✅ 文件已添加到Git暂存区"
echo ""
echo "📋 暂存的文件列表:"
git status --short

echo ""
echo "🚀 准备提交..."
echo "📝 提交信息已准备完成"
echo ""
echo "如需提交，请运行："
echo "  git commit -F GIT_COMMIT_MESSAGE.txt"
echo ""
echo "或手动提交："
echo "  git commit -m \"feat: 完善虚拟机申请导出功能和权限申请搜索功能\""

# 显示修改统计
echo ""
echo "📊 修改统计:"
git diff --cached --stat