# K8s容器环境变量查看完整指南

## 🔍 方法一：直接查看（最快）

```bash
# 查看所有环境变量
kubectl exec -it deployment/backend -- env

# 查看数据库相关变量
kubectl exec -it deployment/backend -- env | grep DB_

# 查看特定变量
kubectl exec -it deployment/backend -- printenv DB_PASSWORD
kubectl exec -it deployment/backend -- printenv DB_HOST
kubectl exec -it deployment/backend -- printenv DB_PORT
```

## 🐳 方法二：进入容器交互式查看

```bash
# 1. 进入容器
kubectl exec -it deployment/backend -- sh

# 2. 在容器内执行命令
env                    # 查看所有环境变量
printenv              # 查看所有环境变量  
export               # 查看导出的变量
echo $DB_PASSWORD     # 查看特定变量
echo $HOME           # 查看HOME目录
echo $PATH           # 查看PATH环境变量
```

## 📊 方法三：格式化输出查看

```bash
# 排序后查看所有变量
kubectl exec -it deployment/backend -- sh -c 'env | sort'

# 查找特定模式的变量
kubectl exec -it deployment/backend -- sh -c 'env | grep -E "DB_|JWT_|PORT"'

# 统计环境变量数量
kubectl exec -it deployment/backend -- sh -c 'env | wc -l'
```

## 🔧 方法四：对比ConfigMap和Secret注入

```bash
# 验证ConfigMap注入的变量
kubectl exec -it deployment/backend -- printenv DB_HOST
kubectl exec -it deployment/backend -- printenv DB_PORT
kubectl exec -it deployment/backend -- printenv DB_USER
kubectl exec -it deployment/backend -- printenv DB_NAME

# 验证Secret注入的变量
kubectl exec -it deployment/backend -- printenv DB_PASSWORD

# 验证其他配置
kubectl exec -it deployment/backend -- printenv JWT_SECRET
kubectl exec -it deployment/backend -- printenv PORT
kubectl exec -it deployment/backend -- printenv NODE_ENV
```

## 🎯 常用查看命令

### 查看所有变量
```bash
kubectl exec -it deployment/backend -- env
```

### 查看数据库配置
```bash
kubectl exec -it deployment/backend -- sh -c 'env | grep DB_'
```

### 查看应用配置
```bash
kubectl exec -it deployment/backend -- sh -c 'env | grep -E "PORT|NODE_ENV|JWT_"'
```

### 查看特定变量
```bash
kubectl exec -it deployment/backend -- printenv <变量名>
```

## 🚀 高级用法

### 1. 查看多个容器的环境变量
```bash
# 查看所有backend容器的环境变量
kubectl get pods -l app=backend -o name | xargs -I {} kubectl exec -it {} -- env

# 查看所有frontend容器的环境变量  
kubectl get pods -l app=frontend -o name | xargs -I {} kubectl exec -it {} -- env
```

### 2. 比较不同Pod的环境变量
```bash
# 比较两个backend Pod的环境变量差异
kubectl exec -it deployment/backend -- env > /tmp/pod1.env
kubectl get pods -l app=backend -o name | tail -1 | xargs kubectl exec -it -- env > /tmp/pod2.env
diff /tmp/pod1.env /tmp/pod2.env
```

### 3. 监控环境变量变化
```bash
# 实时查看特定变量的值
kubectl exec -it deployment/backend -- sh -c 'watch -n 5 "echo $DB_PASSWORD"'
```

## 🔍 故障排查

### 问题1：环境变量未生效
```bash
# 检查Pod是否使用了最新的ConfigMap和Secret
kubectl describe pod <pod-name> | grep -A 20 "Environment:"

# 检查ConfigMap和Secret是否正确创建
kubectl get configmap vmconf-db-config -o yaml
kubectl get secret vmconf-db-secret -o yaml
```

### 问题2：环境变量值为空
```bash
# 检查Pod的YAML配置
kubectl get deployment backend -o yaml | grep -A 5 "valueFrom"

# 检查Secret中是否存在该key
kubectl get secret vmconf-db-secret -o jsonpath='{.data.DB_PASSWORD}'
```

### 问题3：环境变量编码问题
```bash
# Secret中的Base64编码值
kubectl get secret vmconf-db-secret -o jsonpath='{.data.DB_PASSWORD}' | base64 -d

# 在容器中查看解码后的值
kubectl exec -it deployment/backend -- sh -c 'echo $DB_PASSWORD | base64 -d'
```

## 💡 实用技巧

### 1. 快速检查数据库连接配置
```bash
kubectl exec -it deployment/backend -- sh -c 'echo "数据库连接信息:" && echo "主机: $DB_HOST" && echo "端口: $DB_PORT" && echo "用户: $DB_USER" && echo "密码: $DB_PASSWORD" && echo "数据库: $DB_NAME"'
```

### 2. 验证所有必需的环境变量
```bash
kubectl exec -it deployment/backend -- sh -c 'for var in DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME; do eval "echo \${var}=\$$var"; done'
```

### 3. 导出环境变量到文件
```bash
kubectl exec -it deployment/backend -- sh -c 'env' > /tmp/backend-env.txt
cat /tmp/backend-env.txt
```

## 📋 典型输出示例

```bash
$ kubectl exec -it deployment/backend -- env | grep DB_

DB_HOST=172.25.254.5
DB_PORT=3306
DB_USER=vmconf_user
DB_PASSWORD=Db68#$68
DB_NAME=vmconf_db
```

## 🎯 总结

### 最常用的命令：
```bash
# 查看所有环境变量
kubectl exec -it deployment/backend -- env

# 查看数据库配置
kubectl exec -it deployment/backend -- sh -c 'env | grep DB_'

# 查看特定变量
kubectl exec -it deployment/backend -- printenv DB_PASSWORD

# 进入容器交互式查看
kubectl exec -it deployment/backend -- sh
```

### 进入容器后的常用命令：
```bash
env                    # 所有环境变量
printenv              # 所有环境变量
echo $变量名          # 特定变量
export               # 导出的变量
set                  # 所有变量（包括shell变量）
```

---

**现在您就可以轻松查看K8s容器中的环境变量了！**
