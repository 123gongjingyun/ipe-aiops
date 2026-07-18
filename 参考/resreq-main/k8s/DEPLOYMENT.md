# Kubernetes 部署指南

## 概述

本指南介绍如何将虚拟机资源申请管理系统部署到Kubernetes集群。

## 架构组件

- **Frontend**: Vue 3 + Element Plus + Nginx
- **Backend**: Node.js + Express
- **Database**: MySQL 8.0
- **Storage**: PersistentVolumeClaim

## 前置要求

- Kubernetes集群 (v1.20+)
- kubectl配置正确
- Docker环境
- Ingress Controller (可选，用于域名访问)

## 部署步骤

### 1. 构建Docker镜像

#### 构建后端镜像
```bash
cd backend
docker build -t vmconf-backend:latest .
```

#### 构建前端镜像
```bash
cd frontend
docker build -t vmconf-frontend:latest .
```

### 2. 镜像标签管理（推送到镜像仓库）

如果使用私有镜像仓库：
```bash
# 标记镜像
docker tag vmconf-backend:latest your-registry/vmconf-backend:latest
docker tag vmconf-frontend:latest your-registry/vmconf-frontend:latest

# 推送镜像
docker push your-registry/vmconf-backend:latest
docker push your-registry/vmconf-frontend:latest
```

如果使用本地镜像（Minikube/Kind）：
```bash
# 对于Minikube
eval $(minikube docker-env)
docker build -t vmconf-backend:latest backend/
docker build -t vmconf-frontend:latest frontend/

# 对于Kind
kind load docker-image vmconf-backend:latest
kind load docker-image vmconf-frontend:latest
```

### 3. 创建命名空间（可选）

```bash
kubectl create namespace vmconf
```

如果使用独立命名空间，需要修改所有YAML文件中的`namespace: default`为`namespace: vmconf`。

### 4. 部署顺序

#### 步骤1：创建配置和Secret
```bash
kubectl apply -f k8s/configmap.yaml
```

#### 步骤2：部署MySQL
```bash
kubectl apply -f k8s/mysql-deployment.yaml

# 等待MySQL初始化完成
kubectl wait --for=condition=complete job/mysql-init -n default --timeout=300s
```

#### 步骤3：部署后端
```bash
kubectl apply -f k8s/backend-deployment.yaml
```

#### 步骤4：部署前端
```bash
kubectl apply -f k8s/frontend-deployment.yaml
```

#### 步骤5：创建Ingress（可选）
```bash
kubectl apply -f k8s/ingress.yaml
```

### 5. 验证部署

#### 检查Pod状态
```bash
kubectl get pods
```

预期输出：
```
NAME                       READY   STATUS    RESTARTS   AGE
backend-xxxxxxxxxx-xxxxx   1/1     Running   0          2m
frontend-xxxxxxxxxx-xxxxx  1/1     Running   0          1m
mysql-xxxxxxxxxx-xxxxx     1/1     Running   0          5m
```

#### 检查服务状态
```bash
kubectl get svc
```

预期输出：
```
NAME                TYPE        CLUSTER-IP       PORT(S)          AGE
backend-service     ClusterIP   10.96.0.1        3000/TCP         3m
frontend-service    ClusterIP   10.96.0.2        80/TCP           2m
mysql-service       ClusterIP   10.96.0.3        3306/TCP         6m
kubernetes          ClusterIP   10.96.0.1        443/TCP          1d
```

#### 查看日志
```bash
# 查看后端日志
kubectl logs -l app=backend --tail=50 -f

# 查看前端日志
kubectl logs -l app=frontend --tail=50 -f

# 查看MySQL日志
kubectl logs -l app=mysql --tail=50 -f
```

### 6. 访问应用

#### 通过端口转发（开发环境）
```bash
# 转发前端服务
kubectl port-forward svc/frontend-service 8080:80

# 转发后端服务
kubectl port-forward svc/backend-service 3000:3000
```

然后访问：http://localhost:8080

#### 通过Ingress（生产环境）
1. 确保已安装Ingress Controller
2. 修改`ingress.yaml`中的`host: vmconf.local`为你的域名
3. 配置DNS解析或修改本地hosts文件：
```bash
echo "YOUR_INGRESS_IP vmconf.local" | sudo tee -a /etc/hosts
```

#### 通过LoadBalancer（如果支持）
修改服务类型为LoadBalancer：
```yaml
spec:
  type: LoadBalancer  # 修改为LoadBalancer
```

## 配置管理

### 修改配置

所有配置都在`k8s/configmap.yaml`中：

- **数据库配置**: DB_HOST, DB_PORT, DB_USER, DB_NAME
- **JWT配置**: JWT_SECRET, JWT_EXPIRE
- **服务器配置**: PORT, NODE_ENV
- **其他配置**: 文件上传大小、日志级别等

修改后重新应用：
```bash
kubectl apply -f k8s/configmap.yaml

# 重启Pod以加载新配置
kubectl rollout restart deployment backend
```

### 修改密码

修改Secret中的数据库密码：
```bash
kubectl create secret generic vmconf-db-secret \
  --from-literal=DB_PASSWORD='new_password' \
  --dry-run=client -o yaml | kubectl apply -f -

# 重启依赖的Pod
kubectl rollout restart deployment backend
kubectl rollout restart statefulset mysql
```

## 扩展和管理

### 水平扩展

扩展后端副本数：
```bash
kubectl scale deployment backend --replicas=3
```

扩展前端副本数：
```bash
kubectl scale deployment frontend --replicas=3
```

### 查看资源使用
```bash
kubectl top pods
kubectl top nodes
```

### 进入容器调试
```bash
# 进入后端容器
kubectl exec -it deployment/backend -- sh

# 进入MySQL容器
kubectl exec -it deployment/mysql -- mysql -u root -p
```

## 数据持久化

MySQL数据存储在PVC中，即使Pod重新创建数据也不会丢失。

查看PVC状态：
```bash
kubectl get pvc
```

## 备份和恢复

### 数据库备份
```bash
kubectl exec -it deployment/mysql -- mysqldump -u root -p vmconf_db > backup.sql
```

### 数据库恢复
```bash
cat backup.sql | kubectl exec -i deployment/mysql -- mysql -u root -p vmconf_db
```

## 监控和日志

### 查看事件
```bash
kubectl get events --sort-by='.lastTimestamp'
```

### 查看特定资源描述
```bash
kubectl describe pod <pod-name>
kubectl describe svc <service-name>
```

### 日志聚合
可以考虑集成ELK、Loki等日志系统。

## 故障排查

### Pod无法启动
```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

### 服务无法访问
```bash
# 检查服务端点
kubectl get endpoints

# 测试服务连通性
kubectl run -it --rm debug --image=busybox -- sh
wget -O- http://service-name:port
```

### 数据库连接问题
```bash
# 检查MySQL Pod状态
kubectl get pods -l app=mysql

# 测试数据库连接
kubectl exec -it deployment/backend -- node -e "console.log(process.env.DB_HOST)"
```

## 清理

### 删除所有资源
```bash
kubectl delete -f k8s/ingress.yaml
kubectl delete -f k8s/frontend-deployment.yaml
kubectl delete -f k8s/backend-deployment.yaml
kubectl delete -f k8s/mysql-deployment.yaml
kubectl delete -f k8s/configmap.yaml
```

### 删除命名空间（如果使用）
```bash
kubectl delete namespace vmconf
```

## 生产环境建议

1. **镜像管理**: 使用固定的镜像标签而非`latest`
2. **资源限制**: 根据实际负载调整CPU和内存限制
3. **健康检查**: 调整探针的参数以适应应用启动时间
4. **安全加固**:
   - 使用NetworkPolicy限制Pod间通信
   - 启用RBAC
   - 使用PodSecurityPolicy
5. **高可用**:
   - 使用StatefulSet部署MySQL并配置主从复制
   - 配置Pod反亲和性规则
6. **监控告警**: 集成Prometheus+Grafana
7. **日志管理**: 集成ELK或类似系统
8. **自动扩展**: 配置HPA（Horizontal Pod Autoscaler）

## 安全注意事项

1. 修改默认密码
2. 使用强密码和密钥
3. 定期更新镜像和依赖
4. 限制容器权限
5. 启用网络策略
6. 配置资源配额

## 联系支持

如有问题，请查看日志或联系系统管理员。
