# K8s部署中db-secret的使用详解

## 🔒 db-secret使用位置

### 1️⃣ Secret定义 (k8s/configmap.yaml)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: vmconf-db-secret
  namespace: default
type: Opaque
stringData:
  # 数据库密码（敏感信息）
  DB_PASSWORD: "Db68#$68"
```

### 2️⃣ Secret使用 (k8s/backend-deployment.yaml)

```yaml
# 在后端Deployment的环境变量部分
spec:
  containers:
  - name: backend
    image: vmconf-backend:latest
    env:
    # 普通配置从ConfigMap读取
    - name: DB_HOST
      valueFrom:
        configMapKeyRef:
          name: vmconf-db-config
          key: DB_HOST
    
    - name: DB_USER
      valueFrom:
        configMapKeyRef:
          name: vmconf-db-config
          key: DB_USER
    
    # ⚠️ 密码从Secret读取（关键！）
    - name: DB_PASSWORD
      valueFrom:
        secretKeyRef:
          name: vmconf-db-secret    # 引用Secret名称
          key: DB_PASSWORD          # Secret中的key
```

---

## 🎯 使用流程图

```
┌─────────────────────────────────────────────────────────┐
│              Kubernetes集群                             │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │        vmconf-db-secret (Secret)                │  │
│  │  name: vmconf-db-secret                         │  │
│  │  data:                                          │  │
│  │    DB_PASSWORD: "Db68#$68"                     │  │
│  └───────────────┬──────────────────────────────────┘  │
│                  │ K8s自动注入                           │
│                  ▼                                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │        backend Pod (容器)                       │  │
│  │  环境变量:                                       │  │
│  │  DB_HOST=172.25.254.5  (从ConfigMap)           │  │
│  │  DB_USER=vmconf_user   (从ConfigMap)           │  │
│  │  DB_PASSWORD=***       (从Secret) ✨            │  │
│  └───────────────┬──────────────────────────────────┘  │
│                  │                                      │
│                  │ 读取环境变量                           │
│                  ▼                                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │     backend/src/config/database.js              │  │
│  │  process.env.DB_PASSWORD                        │  │
│  │  ↓                                               │  │
│  │  mysql.createPool({                             │  │
│  │    password: process.env.DB_PASSWORD            │  │
│  │  })                                              │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 🔍 详细使用步骤

### Step 1: 定义Secret
```bash
# 在k8s/configmap.yaml中定义
kubectl apply -f k8s/configmap.yaml
```

### Step 2: Backend Pod引用Secret
```yaml
# 在backend-deployment.yaml中引用
env:
- name: DB_PASSWORD
  valueFrom:
    secretKeyRef:
      name: vmconf-db-secret    # Secret名称
      key: DB_PASSWORD          # 数据项key
```

### Step 3: K8s自动注入环境变量
```bash
# K8s自动将Secret中的值注入到Pod
# 在Pod内部可以访问:
echo $DB_PASSWORD  # 输出: Db68#$68
```

### Step 4: 后端代码读取
```javascript
// backend/src/config/database.js
const pool = mysql.createPool({
  password: process.env.DB_PASSWORD  // 从环境变量读取
});
```

---

## 📊 对比：ConfigMap vs Secret

### ConfigMap (普通配置)
```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: vmconf-db-config
data:
  DB_HOST: "172.25.254.5"        # 明文存储
  DB_PORT: "3306"               # 明文存储
  DB_USER: "vmconf_user"        # 明文存储
```

### Secret (敏感信息)
```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: Secret
metadata:
  name: vmconf-db-secret
stringData:
  DB_PASSWORD: "Db68#$68"      # Base64编码存储
```

---

## 🛡️ 为什么使用Secret？

### 1. 安全性增强
- **Base64编码**：数据以Base64格式存储
- **访问控制**：Secret有更严格的权限控制
- **加密存储**：可以配置etcd加密Secret数据

### 2. 与ConfigMap的区别
```bash
# ConfigMap - 明文存储
kubectl get configmap vmconf-db-config -o yaml
# 所有信息都是明文可见

# Secret - Base64编码
kubectl get secret vmconf-db-secret -o yaml  
# 密码是Base64编码的: RGY2OCMjNjg=
```

### 3. 权限隔离
```bash
# 普通用户可以查看ConfigMap
kubectl get configmap

# 但不一定能查看Secret
kubectl get secret  # 需要特殊权限
```

---

## 🔧 实际使用示例

### 部署时应用Secret
```bash
# 1. 创建Secret
kubectl apply -f k8s/configmap.yaml

# 2. 部署Backend (自动引用Secret)
kubectl apply -f k8s/backend-deployment.yaml

# 3. 验证Secret已注入
kubectl exec -it deployment/backend -- env | grep DB_PASSWORD
# 输出: DB_PASSWORD=Db68#$68
```

### 修改数据库密码
```bash
# 1. 更新Secret
kubectl create secret generic vmconf-db-secret \
  --from-literal=DB_PASSWORD='new_password' \
  --dry-run=client -o yaml | kubectl apply -f -

# 2. 重启Backend Pod加载新密码
kubectl rollout restart deployment backend

# 3. 验证新密码生效
kubectl exec -it deployment/backend -- env | grep DB_PASSWORD
```

---

## 🚨 重要注意事项

### 1. Secret并非完全安全
```bash
# Secret只是Base64编码，可以解码
echo "RGY2OCMjNjg=" | base64 -d
# 输出: Db68#$68
```

### 2. 生产环境建议
```yaml
# 启用etcd加密
# 在apiserver配置中启用Secret加密
--encryption-provider-config
```

### 3. 更安全的做法
```bash
# 使用外部密钥管理系统
# 如: HashiCorp Vault, AWS Secrets Manager, Azure Key Vault

# 或使用Sealed Secrets
# kubeseal -f secret.yaml -o sealedsecret.yaml
```

---

## 📋 总结

### db-secret在K8s部署中的作用:

1. **存储敏感信息**: 数据库密码
2. **环境变量注入**: 自动注入到Pod
3. **权限控制**: 比ConfigMap更严格的访问控制
4. **配置管理**: 与ConfigMap分离，便于安全管理

### 使用位置:
- **定义**: `k8s/configmap.yaml` (Secret部分)
- **引用**: `k8s/backend-deployment.yaml` (env部分)
- **使用**: `backend/src/config/database.js` (读取环境变量)

### 核心优势:
✅ 安全性: 比明文ConfigMap更安全
✅ 灵活性: 独立管理敏感信息
✅ 合规性: 满足安全审计要求

---

**这就是db-secret在K8s部署中的完整使用流程！**
