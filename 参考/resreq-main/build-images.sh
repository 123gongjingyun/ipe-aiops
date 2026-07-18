#!/bin/bash

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  VMconf Docker镜像构建脚本${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}错误: Docker未运行，请先启动Docker${NC}"
    exit 1
fi

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "\n${YELLOW}1. 构建后端镜像...${NC}"
cd backend
if docker build -t vmconf-backend:latest .; then
    echo -e "${GREEN}✓ 后端镜像构建成功${NC}"
else
    echo -e "${RED}✗ 后端镜像构建失败${NC}"
    exit 1
fi

echo -e "\n${YELLOW}2. 构建前端镜像...${NC}"
cd ../frontend
if docker build -t vmconf-frontend:latest .; then
    echo -e "${GREEN}✓ 前端镜像构建成功${NC}"
else
    echo -e "${RED}✗ 前端镜像构建失败${NC}"
    exit 1
fi

cd "$SCRIPT_DIR"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  镜像构建完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${YELLOW}构建的镜像:${NC}"
docker images | grep vmconf

echo -e "\n${YELLOW}下一步:${NC}"
echo -e "1. 如需推送到镜像仓库，请运行: ${GREEN}./push-images.sh${NC}"
echo -e "2. 部署到Kubernetes，请运行: ${GREEN}kubectl apply -f k8s/${NC}"
echo -e "3. 查看部署状态: ${GREEN}kubectl get pods${NC}"
