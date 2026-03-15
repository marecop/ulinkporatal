# VPS 部署手册

这份文档按当前项目的实际结构来写，目标是把项目部署到一台 Ubuntu VPS 上，并由 `Nginx + Node.js + systemd` 提供服务。

项目在 VPS 上的运行方式是：

1. 用 `git` 拉取代码
2. 用 `npm ci` 安装依赖
3. 用 `npm run build` 打包前端
4. 用 `npm start` 启动 `server.ts`
5. 由 `Nginx` 反向代理到 `127.0.0.1:3000`

## 1. 服务器准备

推荐配置：

- `1 vCPU`
- `2 GB RAM`
- `20 GB` SSD
- Ubuntu `22.04` 或 `24.04`

如果只是自用测试，`1 GB RAM` 也可以，但建议加 swap。

## 2. 域名与 DNS

假设正式域名为 `portal.flaps1f.com`，需要先把 DNS A 记录指向 VPS 公网 IP。

可先在本地测试解析：

```bash
ping portal.flaps1f.com
```

## 3. 系统初始化

先用 root 登录服务器：

```bash
ssh root@你的VPS_IP
```

更新系统：

```bash
apt update && apt upgrade -y
```

安装基础工具：

```bash
apt install -y git curl unzip build-essential nginx ufw certbot python3-certbot-nginx
```

## 4. 安装 Node.js

这个项目在 `package.json` 里要求 `Node 22.x`，不要用 `Node 20`。

安装 Node 22：

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
```

确认版本：

```bash
node -v
npm -v
```

你应该看到 `v22.x.x`。

## 5. 创建部署用户

建议不要长期用 root 直接跑项目。

```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

## 6. 配置 Git 拉取

如果仓库是私有的，先生成 SSH key：

```bash
ssh-keygen -t ed25519 -C "deploy@portal"
```

查看公钥：

```bash
cat ~/.ssh/id_ed25519.pub
```

把公钥添加到 GitHub 或 GitLab 后，测试：

```bash
ssh -T git@github.com
```

## 7. 拉取项目代码

创建目录并拉代码：

```bash
sudo mkdir -p /var/www/portal
sudo chown -R deploy:deploy /var/www/portal
cd /var/www/portal
git clone 你的仓库地址 .
```

例如：

```bash
git clone git@github.com:yourname/your-repo.git .
```

## 8. 配置环境变量

复制模板：

```bash
cd /var/www/portal
cp .env.example .env
```

编辑：

```bash
nano .env
```

建议至少配置：

```bash
PORT=3000
NODE_ENV=production

SESSION_SECRET=replace-with-a-long-random-string
DATABASE_URL=postgresql://user:password@host:5432/database
TOKEN_ENCRYPTION_KEY=replace-with-another-long-random-string

APP_URL=https://portal.flaps1f.com
ALLOWED_ORIGINS=https://portal.flaps1f.com

MICROSOFT_CLIENT_ID=replace-with-client-id
MICROSOFT_CLIENT_SECRET=replace-with-client-secret
MICROSOFT_TENANT_ID=replace-with-tenant-id
MICROSOFT_REDIRECT_URI=https://portal.flaps1f.com/api/microsoft/callback
MICROSOFT_SCOPES=offline_access openid profile email Files.Read Sites.Read.All
```

生成随机字符串可以用：

```bash
openssl rand -base64 48
```

## 9. 安装依赖与打包

正式环境推荐：

```bash
cd /var/www/portal
npm ci
npm run build
```

如果 `npm ci` 不行，再退回：

```bash
npm install
npm run build
```

## 10. 先手动运行测试

在 systemd 之前，先手动跑一次：

```bash
cd /var/www/portal
set -a
source .env
set +a
npm start
```

另开一个终端测试：

```bash
curl http://127.0.0.1:3000/api/health
```

正常会返回：

```json
{"status":"ok"}
```

## 11. 处理 `EADDRINUSE: address already in use 0.0.0.0:3000`

这个错误表示 `3000` 端口已经被别的进程占用了，不是代码语法错误。

先查谁占用了端口：

```bash
ss -ltnp | grep :3000
```

或者：

```bash
lsof -i :3000
```

常见情况：

- 你已经开过一次 `npm start`
- 旧的 `pm2` 进程还在跑
- `systemd` 服务已经启动
- 另一个 Node 服务占用了 `3000`

如果确认是旧 Node 进程，可以先结束：

```bash
pkill -f "tsx server.ts"
```

如果是 systemd 服务占用：

```bash
sudo systemctl status portal
sudo systemctl stop portal
```

如果是 pm2 占用：

```bash
pm2 status
pm2 stop portal
```

如果你不想用 `3000`，也可以改 `.env`：

```bash
PORT=3001
```

然后把 Nginx 里的反代端口一起改掉。

## 12. 使用 systemd 守护进程

建立 service 文件：

```bash
sudo nano /etc/systemd/system/portal.service
```

内容如下：

```ini
[Unit]
Description=Portal Node App
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/var/www/portal
EnvironmentFile=/var/www/portal/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
KillSignal=SIGINT
SyslogIdentifier=portal

[Install]
WantedBy=multi-user.target
```

加载并启动：

```bash
sudo systemctl daemon-reload
sudo systemctl start portal
sudo systemctl enable portal
```

查看状态：

```bash
sudo systemctl status portal
```

查看日志：

```bash
journalctl -u portal -f
```

## 13. 配置 Nginx

创建站点配置：

```bash
sudo nano /etc/nginx/sites-available/portal.flaps1f.com
```

内容如下：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name portal.flaps1f.com;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_read_timeout 120s;
        proxy_connect_timeout 30s;
        proxy_send_timeout 120s;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/portal.flaps1f.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 14. 开防火墙

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

## 15. 配置 HTTPS

申请证书：

```bash
sudo certbot --nginx -d portal.flaps1f.com
```

测试续期：

```bash
sudo certbot renew --dry-run
```

## 16. 更新部署流程

以后每次从 Git 更新，可按这个顺序：

```bash
cd /var/www/portal
git pull origin main
npm ci
npm run build
sudo systemctl restart portal
```

检查状态：

```bash
sudo systemctl status portal
journalctl -u portal -n 100 --no-pager
```

## 17. 常见排查命令

查看端口监听：

```bash
ss -ltnp | grep :3000
```

查看 Node 进程：

```bash
ps aux | grep node
```

查看应用日志：

```bash
journalctl -u portal -f
```

查看 Nginx 错误日志：

```bash
sudo tail -f /var/log/nginx/error.log
```

查看 Nginx 访问日志：

```bash
sudo tail -f /var/log/nginx/access.log
```

测试本机服务：

```bash
curl http://127.0.0.1:3000/api/health
```

测试正式域名：

```bash
curl -I https://portal.flaps1f.com
```

## 18. 关于稳定性

如果你是因为 Vercel 到上游站点间歇性 `ETIMEDOUT` 才迁移到 VPS，那么：

- VPS 通常会比 serverless 更稳定
- 固定出口 IP 更容易排查问题
- 可以自己控制机房区域、Nginx、日志和重试策略

但仍然建议在后端补上：

- 上游请求 `timeout`
- `ETIMEDOUT` / `ECONNRESET` 分类日志
- 简单重试机制

这样即使未来上游偶发波动，也更容易定位问题。
