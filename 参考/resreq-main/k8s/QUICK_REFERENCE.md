# Kubernetes部署快速参考

## 快速部署

```bash
# 1. 构建镜像
./build-images.sh

# 2. 部署到K8s
./deploy-k8s.sh

# 3. 访问应用
kubectl port-forward svc/frontend-service 8080:80
open http://localhost:8080
```

## 常用命令

### 部署管理
```bash
# 部署所有服务
./deploy-k8s.sh

# 单独部署组件
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/mysql-deployment.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml

# 删除所有部署
kubectl delete -f k8s/
```

### 状态查看
```bash
# 查看Pod状态
kubectl get pods

# 查看服务状态
kubectl get svc

# 查看所有资源
kubectl get all

# 查看Pod详情
kubectl describe pod <pod-name>

# 查看资源使用
kubectl top pods
kubectl top nodes
```

### 日志查看
```bash
# 实时查看后端日志
kubectl logs -l app=backend --tail=50 -f

# 实时查看前端日志
kubectl logs -l app=frontend --tail=50 -f

# 查看MySQL日志
kubectl logs -l app=mysql --tail=50 -f

# 查看特定Pod日志
kubectl logs <pod-name> --tail=100 -f
```

### 服务访问
```bash
# 端口转发前端
kubectl port-forward svc/frontend-service 8080:80

# 端口转发后端
kubectl port-forward svc/backend-service 3000:3000

# 进入后端容器
kubectl exec -it deployment/backend -- sh

# 进入MySQL容器
kubectl exec -it deployment/mysql -- sh
```

### 扩缩容
```bash
# 扩展后端到3个副本
kubectl scale deployment backend --replicas=3

# 扩展前端到2个副本
kubectl scale deployment frontend --replicas=2

# 自动扩缩容（需要metrics-server）
kubectl autoscale deployment backend --min=2 --max=5 --cpu-percent=80
```

### 更新与回滚
```bash
# 重启后端服务
kubectl rollout restart deployment backend

# 重启前端服务
kubectl rollout restart deployment frontend

# 查看更新历史
kubectl rollout history deployment backend

# 回滚到上一个版本
kubectl rollout undo deployment backend
```

### 配置管理
```bash
# 编辑ConfigMap
kubectl edit configmap vmconf-db-config

# 查看ConfigMap
kubectl describe configmap vmconf-db-config

# 查看Secret
kubectl describe secret vmconf-db-secret

# 修改数据库密码
kubectl create secret generic vmconf-db-secret \
  --from-literal=DB_PASSWORD='new_password' \
  --dry-run=client -o yaml | kubectl apply -f -
```

### 数据库管理
```bash
# 备份数据库
kubectl exec -it deployment/mysql -- mysqldump -u root -p vmconf_db > backup.sql

# 恢复数据库
cat backup.sql | kubectl exec -i deployment/mysql -- mysql -u root -p vmconf_db

# 连接数据库
kubectl exec -it deployment/mysql -- mysql -u root -p vmconf_db
```

### 故障排查
```bash
# 查看事件
kubectl get events --sort-by='.lastTimestamp'

# 查看端点
kubectl get endpoints

# 测试服务连通性
kubectl run -it --rm debug --image=busybox -- sh
wget -O- http://backend-service:3000/health

# 查看资源详情
kubectl describe deployment backend
kubectl describe svc backend-service
```

## 服务地址

| 服务 | Kubernetes内部地址 |
|------|------------------|
| Frontend | http://frontend-service:80 |
| Backend | http://backend-service:3000 |
| MySQL | mysql-service:3306 |

## 环境变量

后端主要环境变量（从ConfigMap读取）：

- `DB_HOST`: 数据库主机
- `DB_PORT`: 数据库端口
- `DB_USER`: 数据库用户
- `DB_NAME`: 数据库名称
- `DB_PASSWORD`: 数据库密码（从Secret读取）
- `JWT_SECRET`: JWT密钥
- `JWT_EXPIRE`: JWT过期时间
- `PORT`: 服务端口
- `NODE_ENV`: 运行环境

## 镜像管理

```bash
# 构建镜像
./build-images.sh

# 推送到镜像仓库
./push-images.sh registry.example.com/project

# 在Minikube中使用镜像
eval $(minikube docker-env)
docker build -t vmconf-backend:latest backend/
docker build -t vmconf-frontend:latest frontend/

# 在Kind中使用镜像
kind load docker-image vmconf-backend:latest
kind load docker-image vmconf-frontend:latest
```

## 监控与健康检查

```bash
# 检查Pod健康状态
kubectl get pods -o wide

# 检查就绪状态
kubectl get pods -o=jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.conditions[?(@.type=="Ready")].status}{"\n"}{end}'

# 查看资源使用情况
kubectl top pods -l app=backend
kubectl top pods -l app=frontend

# 检查存储
kubectl get pvc
kubectl get pv
```

## 清理命令

```bash
# 删除所有Pod
kubectl delete pods -l app in (backend,frontend,mysql)

# 删除所有服务
kubectl delete svc backend-service frontend-service mysql-service

# 删除所有部署
kubectl delete deployment backend frontend mysql

# 删除所有资源
kubectl delete all -l app in (backend,frontend,mysql)

# 完全清理
kubectl delete -f k8s/
```

## 配置文件说明

| 文件 | 说明 |
|------|------|
| configmap.yaml | 配置和Secret定义 |
| mysql-deployment.yaml | MySQL部署和服务 |
| backend-deployment.yaml | 后端部署和服务 |
| frontend-deployment.yaml | 前端部署和服务 |

## 常见端口

| 服务 | 端口 | 说明 |
|------|------|------|
| Frontend | 80 | HTTP服务 |
| Backend | 3000 | API服务 |
| MySQL | 3306 | 数据库服务 |

## 默认账户

根据系统配置，默认管理员账户：

- 用户名: admin
- 密码: admin123

**重要**: 首次登录后请立即修改密码！
