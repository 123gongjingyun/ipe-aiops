# IPE 模块发布指南

本文档描述的是：

> `project-mywayaiops-refactor-V1` 作为 `autoops-workspace` 现网平台中的一个业务功能模块，如何在云上发布 `Portal / Center` 两个入口。

当前现网主体不是本仓库本身，而是：

- `autoops-workspace` 平台壳层
- `project-mywayaiops-refactor-V1` 只提供 `/portal/` 与 `/center/` 两个模块页面

---

## 一、现网真实结构

### 1.1 访问入口

- 平台首页：`https://www.getpre.cn/`
- Portal：`https://www.getpre.cn/portal/`
- Center：`https://www.getpre.cn/center/`

### 1.2 容器与目录

- 容器：`presales-frontend`
- 宿主机真实发布目录：`/home/deploy/project-myway-platform/`
- Portal 生效目录：`/home/deploy/project-myway-platform/portal/`
- Center 生效目录：`/home/deploy/project-myway-platform/center/`
- 容器内只读映射目录：`/usr/share/nginx/platform/portal/`
- 容器内只读映射目录：`/usr/share/nginx/platform/center/`
- Nginx 配置源文件：`/opt/presales-platform/frontend/nginx.conf`

### 1.3 重要结论

现网发布时：

- 不要再把 `/home/deploy/demo-static` 误以为是最终生效目录
- 不要再默认认为 `docker cp` 到 `/usr/share/nginx/html/...` 就能生效
- 现网真正生效的是宿主机目录 `/home/deploy/project-myway-platform/...`

---

## 二、本地构建

在本地执行：

```bash
cd /Users/gjy/project-mywayaiops-refactor-V1
npm run test --prefix src
./build.sh <version>
```

例如：

```bash
./build.sh demo-static
```

构建后会生成：

- `releases/<version>/portal/`
- `releases/<version>/center/`
- `releases/<version>.tar.gz`

同名版本重复构建时，`build.sh` 会先清空 `releases/<version>/` 再复制新产物，避免旧 hash 资产混入发布包。

---

## 三、标准发布步骤

### 3.1 本地上传产物

```bash
scp /Users/gjy/project-mywayaiops-refactor-V1/releases/<version>.tar.gz deploy@www.getpre.cn:/home/deploy/
```

例如：

```bash
scp /Users/gjy/project-mywayaiops-refactor-V1/releases/demo-static.tar.gz deploy@www.getpre.cn:/home/deploy/
```

### 3.2 云上备份现网目录

```bash
ssh deploy@www.getpre.cn
cd /home/deploy

BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR/portal" "$BACKUP_DIR/center"

cp -r /home/deploy/project-myway-platform/portal/. "$BACKUP_DIR/portal/"
cp -r /home/deploy/project-myway-platform/center/. "$BACKUP_DIR/center/"
```

### 3.3 云上解压发布包

```bash
cd /home/deploy
rm -rf <version>
mkdir -p <version>
tar -xzf <version>.tar.gz
```

例如：

```bash
cd /home/deploy
rm -rf demo-static
mkdir -p demo-static
tar -xzf demo-static.tar.gz
```

### 3.4 覆盖现网真实生效目录

```bash
cp -r /home/deploy/<version>/portal/. /home/deploy/project-myway-platform/portal/
cp -r /home/deploy/<version>/center/. /home/deploy/project-myway-platform/center/
```

例如：

```bash
cp -r /home/deploy/demo-static/portal/. /home/deploy/project-myway-platform/portal/
cp -r /home/deploy/demo-static/center/. /home/deploy/project-myway-platform/center/
```

### 3.5 检查并重载 Nginx

```bash
docker exec presales-frontend nginx -t
docker exec presales-frontend nginx -s reload
```

---

## 四、发布后验证

### 4.1 验证 Portal / Center 返回码

```bash
curl -kI https://www.getpre.cn/portal/
curl -kI https://www.getpre.cn/center/
```

预期：

- `200 OK`

### 4.2 验证 HTML 是否已切到新资源

```bash
curl -ks https://www.getpre.cn/portal/ | head -20
curl -ks https://www.getpre.cn/center/ | head -20
```

重点确认：

- HTML 中引用的 `assets/index-*.js`
- 是否已经变成这次构建对应的新文件名

### 4.3 验证宿主机目录是否是新版本

```bash
grep -n "index-" /home/deploy/project-myway-platform/portal/index.html
grep -n "index-" /home/deploy/project-myway-platform/center/index.html
```

---

## 五、共享演示模式发布

如果只是“让别人点开看效果”，只要按上面的标准发布步骤发布前端即可。

如果目标是“让多人看到同一批共享测试数据”，还需要增加 `orders-sync` 服务和 Nginx 同源代理。

同步服务默认监听 `0.0.0.0:3011`，便于 `presales-frontend` 容器内 Nginx 通过宿主机网关 `172.18.0.1:3011` 访问。

### 5.1 上传并启动同步服务

```bash
ssh deploy@www.getpre.cn "mkdir -p /home/deploy/scripts /home/deploy/.dev-data"
scp /Users/gjy/project-mywayaiops-refactor-V1/src/scripts/dev-orders-sync-server.mjs deploy@www.getpre.cn:/home/deploy/scripts/dev-orders-sync-server.mjs
ssh deploy@www.getpre.cn "cd /home/deploy/scripts && nohup node ./dev-orders-sync-server.mjs > /home/deploy/orders-sync.log 2>&1 &"
```

### 5.2 验证同步服务

```bash
curl http://127.0.0.1:3011/api/dev/orders-sync
cat /home/deploy/orders-sync.log
```

日志中如果显示 `listening on http://0.0.0.0:3011/api/dev/orders-sync`，属于正常结果。

### 5.3 在现网 Nginx 增加同源代理

修改文件：

- `/opt/presales-platform/frontend/nginx.conf`

增加：

```nginx
location /api/dev/orders-sync {
    proxy_pass http://172.18.0.1:3011/api/dev/orders-sync;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

注意：

- 这里不要写 `127.0.0.1:3011`。Nginx 在 `presales-frontend` 容器内运行，`127.0.0.1` 会指向容器自身。
- 当前同步服务运行在宿主机，容器访问宿主机服务使用 `172.18.0.1:3011`。

### 5.4 重载并验证

```bash
docker exec presales-frontend nginx -t
docker exec presales-frontend nginx -s reload

curl -I https://www.getpre.cn/api/dev/orders-sync
curl http://127.0.0.1:3011/api/dev/orders-sync
```

---

## 六、回滚步骤

如果发布后需要回滚：

```bash
ssh deploy@www.getpre.cn
cd /home/deploy

BACKUP_DIR="backup_20260625_120000"

cp -r "$BACKUP_DIR/portal/." /home/deploy/project-myway-platform/portal/
cp -r "$BACKUP_DIR/center/." /home/deploy/project-myway-platform/center/

docker exec presales-frontend nginx -t
docker exec presales-frontend nginx -s reload
```

回滚后验证：

```bash
curl -kI https://www.getpre.cn/portal/
curl -kI https://www.getpre.cn/center/
```

---

## 七、证书说明

现网 HTTPS 证书不在本仓库目录内维护，真实证书目录是：

- `/opt/presales-platform/getpre.cn_nginx`

当前 Nginx 引用的是：

- `getpre.cn_bundle.crt`
- `getpre.cn.key`

详细步骤见：

- [docs/现网证书更新说明.md](/Users/gjy/project-mywayaiops-refactor-V1/docs/现网证书更新说明.md:1)

---

## 八、相关文档

- [README.md](/Users/gjy/project-mywayaiops-refactor-V1/README.md:1)
- [docs/与autoops-workspace整合方案.md](/Users/gjy/project-mywayaiops-refactor-V1/docs/与autoops-workspace整合方案.md:1)
- [docs/现网升级实施清单-2026-06.md](/Users/gjy/project-mywayaiops-refactor-V1/docs/现网升级实施清单-2026-06.md:1)
- [docs/现网升级执行命令清单-2026-06.md](/Users/gjy/project-mywayaiops-refactor-V1/docs/现网升级执行命令清单-2026-06.md:1)
