# 数据库初始化指南

## 前提条件

- MySQL服务器已安装并运行
- 有数据库管理员权限
- 网络连接正常

## 初始化步骤

### 1. 创建数据库和用户

连接到您的MySQL服务器，执行以下命令：

```sql
-- 创建数据库
CREATE DATABASE IF NOT EXISTS vmconf_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建专用用户（建议）
CREATE USER IF NOT EXISTS 'vmconf_user'@'%' IDENTIFIED BY 'your_secure_password_here';

-- 授权
GRANT ALL PRIVILEGES ON vmconf_db.* TO 'vmconf_user'@'%';

-- 刷新权限
FLUSH PRIVILEGES;
```

### 2. 执行初始化脚本

使用项目中的 `database-design.sql` 文件初始化数据库表结构和初始数据：

```bash
# 方法1：使用MySQL命令行
mysql -u your_admin_user -p -h your_mysql_server_ip vmconf_db < database-design.sql

# 方法2：使用MySQL客户端工具
# 打开Navicat、MySQL Workbench等工具，连接到数据库
# 然后打开database-design.sql文件并执行
```

### 3. 验证初始化结果

```sql
-- 切换到项目数据库
USE vmconf_db;

-- 查看创建的表
SHOW TABLES;

-- 验证数据
SELECT COUNT(*) FROM config_types;
SELECT COUNT(*) FROM environments;
SELECT COUNT(*) FROM config_options;
SELECT COUNT(*) FROM users;
```

### 4. 配置项目连接

修改后端配置文件 `backend/.env`：

```bash
# 数据库配置
DB_HOST=your_mysql_server_ip
DB_PORT=3306
DB_USER=vmconf_user
DB_PASSWORD=your_secure_password_here
DB_NAME=vmconf_db

# JWT密钥（请修改为随机字符串）
JWT_SECRET=your_very_long_random_secret_key_here
```

### 5. 测试连接

启动后端服务测试数据库连接：

```bash
cd backend
npm install
npm run dev
```

## 生产环境建议

### 安全配置

1. **修改默认管理员密码**
```sql
-- 首次登录后立即修改
UPDATE users SET password = '$2b$10$新的bcrypt密码哈希' WHERE username = 'admin';
```

2. **限制数据库用户权限**
```sql
-- 如果不需要完全权限，可以限制为特定权限
GRANT SELECT, INSERT, UPDATE, DELETE ON vmconf_db.* TO 'vmconf_user'@'%';
```

3. **配置防火墙**
- 只允许应用服务器IP访问MySQL
- 禁用远程root登录

### 备份策略

```bash
# 每日备份脚本
mysqldump -u vmconf_user -p -h your_mysql_server vmconf_db > backup_$(date +%Y%m%d).sql

# 定期清理旧备份（保留30天）
find /path/to/backups -name "backup_*.sql" -mtime +30 -delete
```

## 故障排除

### 连接失败
1. 检查MySQL服务器是否运行：`systemctl status mysql`
2. 检查防火墙设置
3. 验证用户名密码和权限
4. 确认数据库已创建

### 字符集问题
确保使用UTF-8字符集：
```sql
ALTER DATABASE vmconf_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 权限问题
```sql
-- 检查用户权限
SHOW GRANTS FOR 'vmconf_user'@'%';

-- 重新授权
GRANT ALL PRIVILEGES ON vmconf_db.* TO 'vmconf_user'@'%';
FLUSH PRIVILEGES;
```

---
*完成数据库初始化后，请告知我，我们继续实现Excel导出功能*