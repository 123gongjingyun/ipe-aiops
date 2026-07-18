#!/bin/bash

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  VMconf Kubernetes部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查kubectl是否可用
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}错误: kubectl未安装或不在PATH中${NC}"
    exit 1
fi

# 检查集群连接
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}错误: 无法连接到Kubernetes集群${NC}"
    exit 1
fi

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
K8S_DIR="$SCRIPT_DIR/k8s"

echo -e "${YELLOW}K8s配置目录: $K8S_DIR${NC}"

# 检查MySQL连接配置
echo -e "\n${YELLOW}检查外部MySQL配置...${NC}"
DB_HOST=$(kubectl get configmap vmconf-db-config -o jsonpath='{.data.DB_HOST}' 2>/dev/null)
if [ -z "$DB_HOST" ]; then
    echo -e "${YELLOW}提示: ConfigMap尚未创建，将在下一步创建${NC}"
else
    echo -e "${GREEN}✓ MySQL主机地址: $DB_HOST${NC}"
    echo -e "${YELLOW}  请确保此地址可以从前端Pod访问${NC}"
fi

# 部署顺序
echo -e "\n${YELLOW}步骤 1/3: 创建ConfigMap和Secret...${NC}"
if kubectl apply -f "$K8S_DIR/configmap.yaml"; then
    echo -e "${GREEN}✓ ConfigMap和Secret创建成功${NC}"
else
    echo -e "${RED}✗ ConfigMap和Secret创建失败${NC}"
    exit 1
fi

echo -e "\n${YELLOW}步骤 2/3: 部署后端服务...${NC}"
if kubectl apply -f "$K8S_DIR/backend-deployment.yaml"; then
    echo -e "${GREEN}✓ 后端服务部署成功${NC}"
    echo -e "${YELLOW}等待后端Pod就绪...${NC}"
    kubectl wait --for=condition=ready pod -l app=backend -n default --timeout=120s || {
        echo -e "${RED}警告: 后端Pod启动超时，请检查日志${NC}"
    }
else
    echo -e "${RED}✗ 后端服务部署失败${NC}"
    exit 1
fi

echo -e "\n${YELLOW}步骤 3/3: 部署前端服务...${NC}"
if kubectl apply -f "$K8S_DIR/frontend-deployment.yaml"; then
    echo -e "${GREEN}✓ 前端服务部署成功${NC}"
    echo -e "${YELLOW}等待前端Pod就绪...${NC}"
    kubectl wait --for=condition=ready pod -l app=frontend -n default --timeout=120s || {
        echo -e "${RED}警告: 前端Pod启动超时，请检查日志${NC}"
    }
else
    echo -e "${RED}✗ 前端服务部署失败${NC}"
    exit 1
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"

# 显示部署状态
echo -e "\n${YELLOW}检查Pod状态...${NC}"
kubectl get pods -l app in (backend,frontend) -o wide

echo -e "\n${YELLOW}检查服务状态...${NC}"
kubectl get svc

echo -e "\n${YELLOW}⚠️  重要提示:${NC}"
echo -e "1. 请确保在 k8s/configmap.yaml 中配置了正确的MySQL虚拟机地址"
echo -e "2. 确保K8s集群可以访问MySQL虚拟机的3306端口"
echo -e "3. MySQL数据库需要在虚拟机上提前创建好"

echo -e "\n${YELLOW}访问方式:${NC}"
echo -e "1. 端口转发前端: ${GREEN}kubectl port-forward svc/frontend-service 8080:80${NC}"
echo -e "   然后访问: http://localhost:8080"
echo -e ""
echo -e "2. 端口转发后端: ${GREEN}kubectl port-forward svc/backend-service 3000:3000${NC}"
echo -e "   然后访问: http://localhost:3000"

echo -e "\n${YELLOW}查看日志:${NC}"
echo -e "后端: ${GREEN}kubectl logs -l app=backend --tail=50 -f${NC}"
echo -e "前端: ${GREEN}kubectl logs -l app=frontend --tail=50 -f${NC}"

echo -e "\n${YELLOW}测试数据库连接:${NC}"
echo -e "${GREEN}kubectl exec -it deployment/backend -- node -e \"console.log(process.env.DB_HOST, process.env.DB_PORT)\"${NC}"
