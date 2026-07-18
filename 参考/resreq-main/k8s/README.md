# Kubernetes 部署指南

## 快速开始

### 1. 构建Docker镜像

```bash
# 构建前后端镜像
./build-images.sh
```

### 2. 配置外部MySQL连接

编辑 `k8s/configmap.yaml`，设置正确的MySQL虚拟机地址：

```yaml
# 请修改为您的MySQL虚拟机IP地址
DB_HOST: "192.168.1.100"  
DB_PORT: "3306"
DB_USER: "vmconf_user"
DB_NAME: "vmconf_db"
```

在 `k8s/configmap.yaml` 的Secret部分设置数据库密码：

```yaml
stringData:
  DB_PASSWORD: "your_actual_password"  # 修改为实际密码
```

### 3. 部署到Kubernetes

```bash
# 一键部署
./deploy-k8s.sh
```

### 4. 访问应用

```bash
# 端口转发前端服务
kubectl port-forward svc/frontend-service 8080:80

# 浏览器访问
open http://localhost:8080
```

## 系统架构

```
┌─────────────────────────┐
│   Kubernetes Cluster    │
│                         │
│  ┌──────────────────┐   │
│  │   Frontend       │   │ (Nginx + Vue3)
│  │   (前端服务)       │   │  Port: 80
│  └────────┬─────────┘   │
│           │             │
│  ┌────────▼─────────┐   │
│  │   Backend        │   │ (Node.js + Express)
│  │   (后端API)       │   │  Port: 3000
│  └────────┬─────────┘   │
└───────────┼─────────────┘
            │
            │ 网络连接
            │
┌───────────▼─────────────┐
│   外部MySQL虚拟机         │
│   (MySQL 8.0)           │
│   IP: 192.168.1.100     │
│   Port: 3306            │
└─────────────────────────┘
```

## 重要说明

### MySQL外部部署

本方案中MySQL部署在**外部虚拟机**上，不在Kubernetes集群内：

- **优势**: 
  - 数据库独立管理，便于维护
  - 不占用K8s集群资源
  - 可以使用现有的MySQL服务
  
- **要求**:
  - K8s集群必须能够访问MySQL虚拟机的3306端口
  - 需要在MySQL虚拟机上提前创建好数据库和用户
  - 确保网络连通性和防火墙配置

### 网络配置

确保Kubernetes集群能够访问MySQL虚拟机：

```bash
# 测试从K8s Pod访问MySQL
kubectl run -it --rm debug --image=mysql:8.0 -- mysql -h 192.168.1.100 -u vmconf_user -p
```

## 部署步骤详解

### 1. MySQL虚拟机准备

在MySQL虚拟机上执行：

```sql
-- 创建数据库
CREATE DATABASE IF NOT EXISTS vmconf_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户
CREATE USER IF NOT EXISTS 'vmconf_user'@'%' IDENTIFIED BY 'your_password';

-- 授权
GRANT ALL PRIVILEGES ON vmconf_db.* TO 'vmconf_user'@'%';

-- 刷新权限
FLUSH PRIVILEGES;
```

### 2. 配置数据库连接

编辑 `k8s/configmap.yaml`：

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: vmconf-db-config
  namespace: default
data:
  # 修改为您的MySQL虚拟机IP
  DB_HOST: "192.168.1.100"
  DB_PORT: "3306"
  DB_USER: "vmconf_user"
  DB_NAME: "vmconf_db"
  # ... 其他配置
```

编辑Secret部分：

```yaml
stringData:
  DB_PASSWORD: "your_actual_password"  # 修改为实际密码
```

### 3. 部署到K8s

```bash
# 方式一：一键部署
./deploy-k8s.sh

# 方式二：手动分步部署
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
```

## 验证部署

### 检查Pod状态

```bash
kubectl get pods
```

预期输出：
```
NAME                       READY   STATUS    RESTARTS   AGE
backend-xxxxxxxxxx-xxxxx   1/1     Running   0          2m
frontend-xxxxxxxxxx-xxxxx  1/1     Running   0          1m
```

### 检查服务状态

```bash
kubectl get svc
```

预期输出：
```
NAME                TYPE        CLUSTER-IP       PORT(S)          AGE
backend-service     ClusterIP   10.96.0.1        3000/TCP         3m
frontend-service    ClusterIP   10.96.0.2        80/TCP           2m
```

### 测试数据库连接

```bash
# 从后端Pod测试数据库连接
kubectl exec -it deployment/backend -- sh

# 在Pod内测试
node -e "console.log('DB Host:', process.env.DB_HOST)"
```

## 访问应用

### 端口转发（推荐开发环境）

```bash
# 前端服务
kubectl port-forward svc/frontend-service 8080:80
# 访问: http://localhost:8080

# 后端API
kubectl port-forward svc/backend-service 3000:3000
# 访问: http://localhost:3000
```

### NodePort（可选）

修改服务类型为NodePort以对外暴露服务。

## 配置管理

### 修改数据库连接

```bash
# 编辑ConfigMap
kubectl edit configmap vmconf-db-config

# 修改Secret
kubectl edit secret vmconf-db-secret

# 重启后端服务加载新配置
kubectl rollout restart deployment backend
```

### 修改数据库密码

```bash
# 创建新的Secret
kubectl create secret generic vmconf-db-secret \
  --from-literal=DB_PASSWORD='new_password' \
  --dry-run=client -o yaml | kubectl apply -f -

# 重启后端服务
kubectl rollout restart deployment backend
```

## 管理命令

### 查看日志

```bash
# 后端日志
kubectl logs -l app=backend --tail=50 -f

# 前端日志
kubectl logs -l app=frontend --tail=50 -f
```

### 扩展服务

```bash
# 扩展后端到3个副本
kubectl scale deployment backend --replicas=3

# 扩展前端到2个副本
kubectl scale deployment frontend --replicas=2
```

### 重启服务

```bash
# 重启后端
kubectl rollout restart deployment backend

# 重启前端
kubectl rollout restart deployment frontend
```

### 进入容器调试

```bash
# 进入后端容器
kubectl exec -it deployment/backend -- sh

# 进入前端容器
kubectl exec -it deployment/frontend -- sh
```

## 故障排查

### Pod启动失败

```bash
# 查看Pod详情
kubectl describe pod <pod-name>

# 查看日志
kubectl logs <pod-name>
```

### 数据库连接问题

```bash
# 检查后端Pod配置
kubectl exec -it deployment/backend -- node -e "console.log(process.env.DB_HOST, process.env.DB_PORT, process.env.DB_USER)"

# 检查网络连通性
kubectl run -it --rm debug --image=mysql:8.0 -- mysql -h 192.168.1.100 -u vmconf_user -p

# 查看后端日志
kubectl logs -l app=backend --tail=50 -f
```

### 常见问题

**Q: 后端Pod无法连接数据库？**
- 检查MySQL虚拟机IP地址是否正确
- 确认K8s集群网络能访问MySQL虚拟机
- 验证数据库用户名和密码
- 检查MySQL虚拟机防火墙规则

**Q: 配置修改后不生效？**
- 重启后端服务: `kubectl rollout restart deployment backend`
- 检查ConfigMap是否正确更新: `kubectl describe configmap vmconf-db-config`

## 环境变量说明

| 环境变量 | 来源 | 说明 |
|---------|------|------|
| DB_HOST | ConfigMap | MySQL虚拟机IP地址 |
| DB_PORT | ConfigMap | MySQL端口 |
| DB_USER | ConfigMap | 数据库用户名 |
| DB_NAME | ConfigMap | 数据库名称 |
| DB_PASSWORD | Secret | 数据库密码 |
| JWT_SECRET | ConfigMap | JWT密钥 |
| JWT_EXPIRE | ConfigMap | JWT过期时间 |
| PORT | ConfigMap | 后端服务端口 |
| NODE_ENV | ConfigMap | 运行环境 |

## 资源配置

### Frontend
- **请求**: 50m CPU, 64Mi 内存
- **限制**: 200m CPU, 128Mi 内存
- **副本数**: 2

### Backend
- **请求**: 100m CPU, 256Mi 内存
- **限制**: 500m CPU, 512Mi 内存
- **副本数**: 2

## 清理资源

```bash
# 删除所有部署
kubectl delete -f k8s/

# 或者分步删除
kubectl delete -f k8s/frontend-deployment.yaml
kubectl delete -f k8s/backend-deployment.yaml
kubectl delete -f k8s/configmap.yaml
```

## 生产环境建议

1. **网络配置**
   - 使用VPN或专线连接K8s集群和MySQL虚拟机
   - 配置防火墙规则限制访问

2. **安全加固**
   - 使用强密码和密钥
   - 定期更新密码
   - 配置网络策略

3. **监控告警**
   - 监控数据库连接状态
   - 设置资源使用告警
   - 配置日志聚合

4. **备份策略**
   - 在MySQL虚拟机上配置定期备份
   - 测试备份恢复流程

## 支持信息

- **详细文档**: `k8s/README.md`
- **快速参考**: `k8s/QUICK_REFERENCE.md`
- **部署清单**: `DEPLOYMENT_CHECKLIST.md`
- **总体指南**: `K8S_DEPLOYMENT_GUIDE.md`

## 注意事项

1. **MySQL网络**: 确保K8s集群可以访问MySQL虚拟机网络
2. **密码安全**: 修改默认密码，使用强密码
3. **防火墙**: 配置MySQL虚拟机防火墙允许K8s集群访问
4. **监控**: 监控数据库连接状态和性能
5. **备份**: 在MySQL虚拟机上配置定期备份

---

**版本**: 1.0.0  
**更新日期**: 2026-05-22  
**架构**: K8s外部MySQL部署方案
