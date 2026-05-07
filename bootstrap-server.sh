#!/bin/bash
# Sift 思筛 一键部署脚本 — Alibaba Cloud Linux 3
# Usage: bash bootstrap-server.sh
set -euo pipefail

REPO_URL="https://github.com/tiajinsha/resume-agent-next.git"
APP_DIR="/opt/sift"
DATA_DIR="/var/lib/sift/data"
NGINX_CONF="/etc/nginx/conf.d/sift.conf"

echo "==> [1/8] 安装基础工具 (git / build-tools)"
dnf install -y -q git curl tar gcc-c++ make python3 >/dev/null

echo "==> [2/8] 安装 Node 20 LTS (NodeSource)"
if ! command -v node >/dev/null || [[ "$(node -v)" != v20.* ]]; then
  curl -fsSL https://rpm.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
  dnf install -y -q nodejs
fi
node -v
npm -v

echo "==> [3/8] 安装 Nginx + PM2"
dnf install -y -q nginx >/dev/null
npm install -g pm2 --silent

echo "==> [4/8] 准备数据目录 ($DATA_DIR)"
mkdir -p "$DATA_DIR/uploads" /var/log/sift

echo "==> [5/8] 拉取代码 ($APP_DIR)"
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR" && git fetch --all --quiet && git reset --hard origin/main
else
  rm -rf "$APP_DIR"
  git clone --quiet "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

echo "==> [6/8] 写入 .env.local + 安装依赖 + 迁移 + 构建"
cat > "$APP_DIR/.env.local" <<EOF
NODE_ENV=production
PORT=3000
HOSTNAME=127.0.0.1
DATABASE_URL=$DATA_DIR/sift.db
UPLOADS_DIR=$DATA_DIR/uploads
DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY:-PLACEHOLDER_REPLACE_ME}
EOF

cd "$APP_DIR"
npm install --no-audit --no-fund --loglevel=error
npm run db:migrate
npm run build

echo "==> [7/8] PM2 启动 + 开机自启"
pm2 delete sift 2>/dev/null || true
pm2 start npm --name sift --cwd "$APP_DIR" -- start
pm2 save
# 注册 systemd 服务(幂等)
pm2 startup systemd -u root --hp /root | tail -1 | bash || true
sleep 2
pm2 list

echo "==> [8/8] 配置 Nginx 反代 (80 -> 3000)"
cat > "$NGINX_CONF" <<'NGINX'
server {
    listen 80 default_server;
    server_name _;

    client_max_body_size 20m;

    # SSE / 流式响应需要关闭缓冲与缓存,加长超时
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 600s;
    proxy_send_timeout 600s;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

# 移除默认 server,避免抢 80
[ -f /etc/nginx/conf.d/default.conf ] && rm /etc/nginx/conf.d/default.conf
# Alibaba Cloud Linux 默认 nginx.conf 里也可能有一个 server 块,改成不监听 80
sed -i 's/listen       80;/listen       8081;/' /etc/nginx/nginx.conf 2>/dev/null || true

nginx -t
systemctl enable --now nginx
systemctl reload nginx

echo ""
echo "============================================"
echo "✅ 部署完成"
echo "本机访问:  curl http://127.0.0.1:3000/"
echo "外网访问:  http://116.62.34.146/  (需安全组放行 80)"
echo "PM2 状态:  pm2 list"
echo "查看日志:  pm2 logs sift --lines 50"
echo "环境变量文件: $APP_DIR/.env.local"
echo "数据目录: $DATA_DIR"
echo "============================================"
