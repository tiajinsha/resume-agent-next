import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker / 自部署使用 standalone 输出:
  // build 后 .next/standalone/ 包含独立 server.js + 裁剪过的 node_modules
  // 配合 Dockerfile 多阶段构建,最终镜像只需 node:20-slim
  output: "standalone",

  // Native / CJS packages that should not be bundled by Next.js:
  // - better-sqlite3: native N-API addon (Task 5+)
  // - pdf-parse: CJS with debug-on-import side effects (Task 11+)
  serverExternalPackages: ["better-sqlite3", "pdf-parse"],
};

export default nextConfig;
