# syntax=docker/dockerfile:1.7
# =====================================================================
# Sift 思筛 — 多阶段 Dockerfile
# 阶段 1 (deps)    : 装 build-tools + 编译 better-sqlite3 native addon
# 阶段 2 (builder) : 跑 next build,产出 .next/standalone (含裁剪 node_modules)
# 阶段 3 (runner)  : 最小运行环境,无 toolchain,非 root 用户,持久化 volume
# =====================================================================

# ---------- deps: 装完整依赖(含 dev),编译原生模块 ----------
FROM node:20-bookworm-slim AS deps
WORKDIR /app

# better-sqlite3 通过 node-gyp 从源码编译,需要 python3 + g++ + make
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund


# ---------- builder: 跑 build,产出 standalone server ----------
FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# next.config.ts 已配 output: 'standalone',这会产出
#   .next/standalone/  (含 server.js + 裁剪过的 node_modules)
#   .next/static/      (静态资源,需要单独 copy)
RUN npm run build


# ---------- runner: 最终镜像,只装 wget(供 HEALTHCHECK)----------
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL=/var/lib/sift/data/sift.db \
    UPLOADS_DIR=/var/lib/sift/data/uploads \
    RUN_MIGRATIONS_ON_BOOT=1

RUN apt-get update && apt-get install -y --no-install-recommends \
      wget ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# standalone 产物已包含编译好的 better-sqlite3 .node 二进制(因 serverExternalPackages 配置)
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

# Drizzle migrations 文件,启动时由 RUN_MIGRATIONS_ON_BOOT 触发自动执行
COPY --from=builder --chown=node:node /app/lib/db/migrations ./lib/db/migrations

# 持久化数据目录(SQLite + PDF 上传),作为 volume mount point
RUN mkdir -p /var/lib/sift/data/uploads && chown -R node:node /var/lib/sift

USER node
EXPOSE 3000
VOLUME ["/var/lib/sift/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

# server.js 由 Next.js standalone 输出生成
CMD ["node", "server.js"]
