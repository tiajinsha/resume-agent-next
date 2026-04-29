# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## 常用命令

```bash
npm run dev          # 开发服务器（Next.js）
npm run build        # 生产构建
npm run lint         # ESLint
npm test             # 运行全部测试（vitest）
npm run test:watch   # 测试 watch 模式
npx vitest run tests/derive.test.ts   # 运行单个测试文件
npx tsc --noEmit     # 类型检查（不编译输出）
npm run db:migrate   # 执行数据库迁移
npm run db:generate  # 生成 Drizzle 迁移文件（schema 变更后）
```

## 环境配置

复制 `.env.local.example` 为 `.env.local` 并填写：
- `DEEPSEEK_API_KEY` — DeepSeek API 密钥
- `LLM_STUB=1` — 跳过真实 LLM 调用（测试用），使用固定 stub 数据
- `DATABASE_URL` — SQLite 路径，默认 `data/sift.db`
- `UPLOADS_DIR` — PDF 存储目录，默认 `data/uploads`

## 架构概览

### 技术栈
- **Next.js 16** App Router（RSC + Client Components）
- **SQLite** via `better-sqlite3` + **Drizzle ORM**（同步 API，无 async/await）
- **DeepSeek AI**（兼容 OpenAI SDK）用于简历提取和 JD 匹配
- **Vitest** 测试框架

### 数据模型（`lib/db/schema.ts`）
三张核心表：`users`、`candidates`（含 `matchResults: MatchResult[]` JSON 列）、`jobDescriptions`。`Candidate.extractedJson` 存储完整提取结果，同时将常用字段展开到顶层列（通过 `lib/extraction/derive.ts` 的 `deriveFlat`）。

### 简历提取流水线
1. `POST /api/upload` → 保存 PDF → `enqueueExtraction(id)`（`lib/extraction/queue.ts`，concurrency=1 的 p-queue）
2. `runExtraction`（`lib/extraction/worker.ts`）：读 PDF → 解析文本 → `callDeepSeekStream` 流式调用 → `evalProjects` AI 项目评估 → 单次 DB 写入（parsed + eval 合并）→ 可选自动 JD 匹配（用户默认 JD）
3. SSE 推送：worker 通过 `bus.publish` 发事件；`GET /api/candidates/[id]/stream` 订阅并转发给浏览器；`useCandidateStream` hook 接收并以 80ms 防抖更新 UI

### SSE 事件总线（`lib/extraction/event-bus.ts`）
用 `globalThis.__streamEventBus` 跨 Next.js 热重载保持单例。事件类型：`chunk`（流式 JSON 片段）、`done`（含最终 Candidate 对象）、`error`。`chunk` 事件累积到 buffer，新订阅者（页面刷新）可通过 `snapshot` 事件追上当前进度。

### 认证
Session token 存 `sid` HttpOnly cookie，7 天有效。API 路由用 `getUserFromRequest(req)`（同步，从 `cookie` header 读取）；Server Component 用 `requireUser()`（async，使用 Next.js `cookies()`）。

### 全局单例模式
以下对象用 `globalThis.__xxx` 保持跨热重载单例：`__sqlite`（DB 连接）、`__streamEventBus`（SSE 事件总线）、`__queueInit`（提取队列初始化标志）、`__rateLimitStore`（速率限制计数器）。

### 前端关键组件
- `useCandidateStream`（`hooks/`）：EventSource 订阅 SSE，`best-effort-json-parser` 解析部分 JSON，80ms leading-edge 防抖减少渲染次数
- `CandidateDetailClient`：简历详情页主组件，包含 `PdfPanel`（左侧可折叠 PDF 预览）、`StreamingScroller`（自动追尾滚动）、`JdDrawer`（右侧固定 drawer）
- `JdDrawer` / `JdMatchPanel`：JD 匹配结果面板，通过 `onMatchComplete` 回调触发 Drawer 打开
- 所有 UI 组件在 `components/ui.tsx`，图标在 `components/icons.tsx`（自绘 SVG，无外部图标库）

### AI 调用
- **提取**：`lib/extraction/llm.ts` → `callDeepSeekStream`，流式返回 JSON，`response_format: json_object`
- **项目评估**：`lib/extraction/project-eval.ts` → `evalProjects`，非流式，返回 `aiSummary` + `valueTag`
- **JD 匹配**：`lib/matching/llm.ts` → `callMatchAI`，非流式，返回三维度评分（skill/experience/education），overall 分由服务端按 JD 权重计算

### 速率限制
`lib/rate-limit.ts` 提供内存级速率限制（`checkRateLimit(key, limit, windowMs)`）。上传：20次/小时/用户；匹配：60次/小时/用户。
