#!/bin/bash

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  VMconf 镜像推送脚本${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查是否提供了镜像仓库地址
if [ -z "$1" ]; then
    echo -e "${RED}使用方法: $0 <镜像仓库地址>${NC}"
    echo -e "${YELLOW}示例: $0 registry.example.com/project${NC}"
    echo -e "${YELLOW}或者: $0 docker.io/username${NC}"
    exit 1
fi

REGISTRY=$1
VERSION=${2:-latest}

echo -e "${YELLOW}镜像仓库: $REGISTRY${NC}"
echo -e "${YELLOW}版本标签: $VERSION${NC}"

# 标记并推送后端镜像
echo -e "\n${YELLOW}1. 推送后端镜像...${NC}"
docker tag vmconf-backend:latest $REGISTRY/vmconf-backend:$VERSION
if docker push $REGISTRY/vmconf-backend:$VERSION; then
    echo -e "${GREEN}✓ 后端镜像推送成功${NC}"
else
    echo -e "${RED}✗ 后端镜像推送失败${NC}"
    exit 1
fi

# 标记并推送前端镜像
echo -e "\n${YELLOW}2. 推送前端镜像...${NC}"
docker tag vmconf-frontend:latest $REGISTRY/vmconf-frontend:$VERSION
if docker push $REGISTRY/vmconf-frontend:$VERSION; then
    echo -e "${GREEN}✓ 前端镜像推送成功${NC}"
else
    echo -e "${RED}✗ 前端镜像推送失败${NC}"
    exit 1
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  镜像推送完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${YELLOW}推送的镜像:${NC}"
echo -e "  - $REGISTRY/vmconf-backend:$VERSION"
echo -e "  - $REGISTRY/vmconf-frontend:$VERSION"

echo -e "\n${YELLOW}注意: 如果使用私有镜像仓库，请确保已登录:${NC}"
echo -e "  ${GREEN}docker login $REGISTRY${NC}"

echo -e "\n${YELLOW}下一步:${NC}"
echo -e "1. 修改k8s/*.yaml中的镜像地址"
echo -e "2. 部署到Kubernetes: ${GREEN}kubectl apply -f k8s/${NC}"
