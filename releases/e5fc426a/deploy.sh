#!/bin/bash
# IPE/AIOps 前端静态文件部署脚本
# 用法: ./deploy.sh [user@host] [remote_path]

set -e

REMOTE_HOST="${1:-root@www.getpre.cn}"
REMOTE_PATH="${2:-/var/www/getpre.cn}"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== IPE/AIOps 静态文件部署 ==="
echo "远程主机: $REMOTE_HOST"
echo "远程目录: $REMOTE_PATH"
echo "本地目录: $LOCAL_DIR"
echo ""

# 上传 portal
 echo "[1/2] 上传 portal 静态文件..."
rsync -avz --delete "$LOCAL_DIR/portal/" "$REMOTE_HOST:$REMOTE_PATH/portal/"

# 上传 center
echo "[2/2] 上传 center 静态文件..."
rsync -avz --delete "$LOCAL_DIR/center/" "$REMOTE_HOST:$REMOTE_PATH/center/"

echo ""
echo "=== 部署完成 ==="
echo "访问地址:"
echo "  https://www.getpre.cn/portal/"
echo "  https://www.getpre.cn/center/"
