#!/bin/bash
# IPE/AIOps 前端部署脚本
# 用法: ./deploy.sh [版本号] [服务器地址] [部署路径]
# 示例: ./deploy.sh 20260521_152030 deploy@www.getpre.cn /home/deploy

set -e

VERSION="${1:-latest}"
SERVER="${2:-deploy@www.getpre.cn}"
REMOTE_DEPLOY_DIR="${3:-/home/deploy}"
CONTAINER_NAME="presales-frontend"

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
RELEASE_DIR="$PROJECT_ROOT/releases"

# 如果版本号是 latest，找到最新的版本
if [ "$VERSION" = "latest" ]; then
    VERSION=$(ls -t "$RELEASE_DIR" | grep -E '^[0-9]{8}_[0-9]{6}$' | head -1)
    if [ -z "$VERSION" ]; then
        echo "错误: 未找到构建版本，请先执行 ./build.sh"
        exit 1
    fi
    echo "使用最新版本: $VERSION"
fi

BUILD_DIR="$RELEASE_DIR/$VERSION"
TAR_FILE="$RELEASE_DIR/$VERSION.tar.gz"

if [ ! -d "$BUILD_DIR" ] && [ ! -f "$TAR_FILE" ]; then
    echo "错误: 版本 $VERSION 不存在，请先执行 ./build.sh $VERSION"
    exit 1
fi

echo "========================================"
echo "  IPE/AIOps 云部署"
echo "========================================"
echo "版本:     $VERSION"
echo "服务器:   $SERVER"
echo "远程目录: $REMOTE_DEPLOY_DIR"
echo "容器:     $CONTAINER_NAME"
echo ""

# 1. 上传
echo "[1/4] 上传构建产物..."
if [ -f "$TAR_FILE" ]; then
    scp "$TAR_FILE" "$SERVER:$REMOTE_DEPLOY_DIR/"
else
    # 如果没有 tar.gz，上传整个目录
    rsync -avz --delete "$BUILD_DIR/" "$SERVER:$REMOTE_DEPLOY_DIR/$VERSION/"
fi

# 2. 服务器端部署
echo "[2/4] 部署到容器..."
ssh "$SERVER" '
    DEPLOY_DIR="'$REMOTE_DEPLOY_DIR'"
    VERSION="'$VERSION'"
    CONTAINER="'$CONTAINER_NAME'"
    
    cd "$DEPLOY_DIR"
    
    # 备份当前版本
    echo "备份当前版本..."
    BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_NAME"
    docker cp "$CONTAINER:/usr/share/nginx/html/portal" "$BACKUP_NAME/" 2>/dev/null || true
    docker cp "$CONTAINER:/usr/share/nginx/html/center" "$BACKUP_NAME/" 2>/dev/null || true
    
    # 如果是 tar.gz，先解压
    if [ -f "$VERSION.tar.gz" ]; then
        rm -rf "$VERSION"
        tar -xzf "$VERSION.tar.gz"
    fi
    
    # 复制到容器
    echo "复制到容器..."
    docker cp "$VERSION/portal/." "$CONTAINER:/usr/share/nginx/html/portal/"
    docker cp "$VERSION/center/." "$CONTAINER:/usr/share/nginx/html/center/"
    
    echo "文件已复制到容器"
'

# 3. 重载 Nginx
echo "[3/4] 重载 Nginx..."
ssh "$SERVER" "docker exec $CONTAINER_NAME nginx -t && docker exec $CONTAINER_NAME nginx -s reload"

# 4. 验证
echo "[4/4] 验证..."
sleep 1
ssh "$SERVER" 'curl -s -L -o /dev/null -w "Portal: %{http_code}\n" http://localhost/portal/'
ssh "$SERVER" 'curl -s -L -o /dev/null -w "Center: %{http_code}\n" http://localhost/center/'

echo ""
echo "========================================"
echo "  部署完成!"
echo "========================================"
echo "版本: $VERSION"
echo "访问地址:"
echo "  https://www.getpre.cn/portal/"
echo "  https://www.getpre.cn/center/"
