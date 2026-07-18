#!/bin/bash
# IPE/AIOps 前端构建脚本
# 用法: ./build.sh [版本号]
# 示例: ./build.sh v1.2.0

set -e

VERSION="${1:-$(date +%Y%m%d_%H%M%S)}"
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC_DIR="$PROJECT_ROOT/src"
RELEASE_DIR="$PROJECT_ROOT/releases"

echo "========================================"
echo "  IPE/AIOps 前端构建"
echo "========================================"
echo "版本: $VERSION"
echo "源码: $SRC_DIR"
echo "输出: $RELEASE_DIR/$VERSION"
echo ""

# 1. 进入源码目录
cd "$SRC_DIR"

# 2. 安装依赖（如需要）
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules/.package-lock.json" ]; then
    echo "[1/4] 安装依赖..."
    npm install
else
    echo "[1/4] 依赖已安装，跳过"
fi

# 3. 构建
echo "[2/4] 构建..."
npm run build

# 4. 整理构建产物
echo "[3/4] 整理构建产物..."
rm -rf "$RELEASE_DIR/$VERSION"
mkdir -p "$RELEASE_DIR/$VERSION/portal" "$RELEASE_DIR/$VERSION/center"
cp -r "$SRC_DIR/packages/aiops-service-portal/dist/"* "$RELEASE_DIR/$VERSION/portal/"
cp -r "$SRC_DIR/packages/aiops-service-center/dist/"* "$RELEASE_DIR/$VERSION/center/"

# 5. 打包
echo "[4/4] 打包..."
cd "$RELEASE_DIR"
tar -czf "$VERSION.tar.gz" "$VERSION/"

echo ""
echo "========================================"
echo "  构建完成!"
echo "========================================"
echo "版本: $VERSION"
echo "目录: $RELEASE_DIR/$VERSION/"
echo "压缩包: $RELEASE_DIR/$VERSION.tar.gz"
echo ""
echo "部署命令:"
echo "  ./deploy.sh $VERSION"
