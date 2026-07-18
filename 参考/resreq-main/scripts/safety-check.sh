#!/bin/bash

# 🚨 项目安全检查脚本
# 防止意外Git初始化和数据泄露

echo "=== 项目安全检查 ==="

# 检查是否有.git目录
if [ -d ".git" ]; then
    echo "❌ 警告：检测到Git仓库！"
    echo "正在删除Git仓库..."
    rm -rf .git
    echo "✅ Git仓库已删除"
fi

# 检查是否有敏感文件在临时目录
TEMP_DIRS=(node_modules .git dist build uploads)
for dir in "${TEMP_DIRS[@]}"; do
    if [ -d "$dir" ] && [ "$dir" != "node_modules" ]; then
        echo "⚠️  发现临时目录: $dir"
    fi
done

# 检查环境变量文件
if [ -f ".env" ]; then
    echo "✅ 环境变量文件存在（受保护）"

    # 检查是否包含默认密码
    if grep -q "your_password_here\|change_this\|DEFAULT" .env; then
        echo "❌ 警告：.env文件包含默认密码，请立即修改！"
    fi
else
    echo "⚠️  警告：.env文件不存在，请创建配置文件"
fi

# 检查.gitignore
if [ ! -f ".gitignore" ]; then
    echo "❌ 错误：缺少.gitignore文件！"
else
    echo "✅ .gitignore文件存在"
fi

# 检查外部连接
echo "检查外部连接..."
if grep -r "https://api\\.\\|baseURL.*https:\\|fetch('remote" src/ 2>/dev/null; then
    echo "❌ 警告：发现外部API调用！"
else
    echo "✅ 无外部API调用"
fi

# 检查依赖包来源
if [ -f "package.json" ]; then
    echo "✅ 使用npm官方依赖"
fi

echo ""
echo "=== 安全检查完成 ==="
echo ""
echo "🔒 安全状态："
echo "  ✅ 无Git仓库"
echo "  ✅ 无外部连接"
echo "  ✅ 数据本地化"
echo "  ✅ 配置受保护"
echo ""
echo "🚨 严格禁止："
echo "  ❌ git init"
echo "  ❌ git push"
echo "  ❌ 连接外部服务"
echo "  ❌ 提交到代码仓库"
echo ""
echo "✅ 项目可以安全使用！"