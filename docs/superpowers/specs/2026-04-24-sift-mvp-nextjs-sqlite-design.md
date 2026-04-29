# Sift MVP · Next.js + SQLite 全栈设计

**日期**:2026-04-24
**状态**:Draft,待用户 review
**作者**:Claude Opus 4.7 (1M context) + JaneyCobb
**前置工作**:`jianli-agent/`(Vite+React 视觉原型,7 个 UI kit + 设计系统)

## 1 · 背景与范围

思筛(Sift)是一款面向中国企业 HR 的 AI 简历筛选平台。视觉层已经通过 Claude Design 完成,并以 Vite+React 原型落在 `jianli-agent/`。本 spec 规划把它变成真正可用的全栈 MVP。

### 1.1 MVP 范围

完成最小闭环:**上传 PDF → AI 提取字段 → 候选人列表 → 候选人详情 + 编辑**。

**包括**

- 批量上传(客户端最多 5 并发 HTTP 请求)
- 后端文件存盘、SQLite 记账
- AI 提取(DeepSeek · concurrency=1 顺序处理)
- 客户端轮询拿状态(不引入 SSE)
- 候选人列表:状态 tab + 搜索 + 排序 + 表格/卡片视图切换
- 候选人详情 + 按字段分节编辑(PATCH)
- 状态流转:待筛选 / 初筛通过 / 面试中 / 已录用 / 已淘汰
- 失败后手动重试

**不包括**(留给后续子项目)

- JD 管理与评分算法(JDScoring 页面 MVP 只做占位)
- 候选人对比(Compare 页面 MVP 只做占位)
- SSE 流式输出
- 认证 / 多用户
- 导出 CSV / Excel
- 高级筛选面板(年限 / 学历 / 城市范围)
- 审计日志
- 真实部署(local `npm run dev` 即可)
- E2E 测试

### 1.2 目标与成功标准

MVP 视为"做完"必须满足以下 9 条,全部可手跑或 CI 通过:

1. `npm run dev` 启动后,`/upload` 可拖入 3 份真实 PDF
2. 前端看到 3 行进度,状态从「上传中」→「排队中」→「解析中」→「已完成」依次推进
3. 点任一行跳 `/candidates/:id`,看到 AI 提取的基本信息、教育、工作、技能、summary
4. 详情页「编辑」→ 改字段 → 保存 → 列表刷新能看到改动
5. Dashboard 切「初筛通过」tab,状态徽章与计数正确
6. 详情页点「推进到面试」→ Dashboard 状态随之变化
7. 故意上传加密 PDF → 错误徽章出现 + 具体中文文案 + 可点「重试」
8. 杀 `next dev` 重启,半完成的提取任务自动续跑
9. 单元 + 集成测试全绿,CI 不依赖 DeepSeek key

## 2 · 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| 框架 | Next.js 15 · App Router · TypeScript | 全栈一体、RSC 直连 DB、App Router 成熟 |
| DB | SQLite(文件)· `better-sqlite3` | 同步 API、零依赖、单文件便于备份 |
| ORM · 迁移 | `drizzle-orm` + `drizzle-kit` | TS schema、迁移 SQL 可读、未来换 Postgres 零改 |
| 队列 | `p-queue` 进程内 · AI concurrency=1 | MVP 无需 Redis / BullMQ,单进程够用 |
| 上传并发控制 | `p-limit(5)` 客户端 | 限到 5 并发,超出排队 |
| LLM | DeepSeek · `openai` SDK + `baseURL` 覆写 | OpenAI 兼容接口,中文好,价格低 |
| 提示词模型 | `deepseek-chat`,`response_format: json_object`,`temperature: 0` | 稳定结构化输出 |
| PDF 解析 | `pdf-parse` | 纯 JS,无原生依赖 |
| 校验 | `zod` | LLM 输出严格校验 + API 请求体校验 |
| 样式 | 沿用 `colors_and_type.css`(OKLCH tokens)+ inline styles | 不引入 Tailwind,与视觉原型零重写 |
| 测试 | `vitest` + in-memory SQLite | 启动快,支持 ESM/TS |
| 开发体验 | ESLint + Prettier(默认) | —— |

**样式策略**:原 `src/styles/tokens.css` 与 `src/styles/app.css` 整体拷入 `app/globals.css`(或分两个文件,在 `layout.tsx` 里分别 import),**tokens 作为真相源,严禁硬编码颜色**。

## 3 · 工程结构

**新目录**:`C:\Users\75467\Desktop\jianli-agent-next\`(与原 `jianli-agent/` 同级)。原项目保留作为视觉参考,不做修改。

```
jianli-agent-next/
├── app/                                # Next.js App Router
│   ├── layout.tsx                      # 根布局 · 主题初始化 · 顶栏 Chrome
│   ├── globals.css                     # import tokens + app.css
│   ├── page.tsx                        # /              Marketing
│   ├── upload/page.tsx                 # /upload        上传 (Client)
│   ├── dashboard/page.tsx              # /dashboard     列表 (RSC + Client 包装)
│   ├── candidates/[id]/
│   │   ├── page.tsx                    # /candidates/:id       详情 (RSC + Client 包装)
│   │   └── edit/page.tsx               # /candidates/:id/edit  编辑 (Client)
│   ├── jd/page.tsx                     # /jd            占位
│   ├── compare/page.tsx                # /compare       占位
│   ├── design/page.tsx                 # /design        设计系统
│   └── api/
│       ├── upload/route.ts             # POST
│       ├── candidates/route.ts         # GET
│       ├── candidates/[id]/route.ts    # GET / PATCH / DELETE
│       ├── candidates/[id]/retry/route.ts  # POST
│       └── jobs/route.ts               # GET
├── lib/
│   ├── db/
│   │   ├── client.ts                   # better-sqlite3 单例 + WAL
│   │   ├── schema.ts                   # drizzle TS schema
│   │   └── migrations/                 # drizzle-kit 输出
│   ├── extraction/
│   │   ├── queue.ts                    # p-queue 单例 + 启动扫描
│   │   ├── worker.ts                   # 取 job → 解析 → LLM → 写回
│   │   ├── llm.ts                      # DeepSeek 客户端 (含 stub 分支)
│   │   ├── prompt.ts                   # 系统提示词
│   │   ├── pdf.ts                      # pdf-parse 封装
│   │   └── derive.ts                   # ExtractedResume → 主表平铺字段
│   ├── storage.ts                      # 上传文件路径 / 读写 / unlink
│   ├── validation.ts                   # zod schemas (ExtractedResume, API bodies)
│   └── errors.ts                       # ExtractionError + toUserMessage
├── components/                         # 从 jianli-agent/ 拷贝并 TS 化
│   ├── ui.tsx
│   └── icons.tsx
├── hooks/
│   └── useJobPoll.ts                   # 统一轮询 /api/jobs
├── public/assets/                      # logo.svg / logo-mark.svg / brand-gradient.svg
├── data/                               # gitignore
│   ├── sift.db
│   └── uploads/
├── tests/
│   ├── unit/
│   └── integration/
├── drizzle.config.ts
├── next.config.mjs
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

## 4 · 数据模型

### 4.1 `candidates` 表(唯一主表)

提取状态直接落在候选人行上,不做独立 `jobs` 表:worker 的「取下一条」即一条普通 SELECT,避免双实体一致性问题。

```ts
// lib/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const candidateStatus = [
  '待筛选', '初筛通过', '面试中', '已录用', '已淘汰',
] as const;

export const extractionStatus = [
  'uploaded',    // 文件已落盘,排队中
  'extracting',  // worker 正在处理
  'parsed',      // 成功
  'error',       // 失败
] as const;

export const candidates = sqliteTable('candidates', {
  id: text('id').primaryKey(),                       // nanoid(12)

  // ---- 展示字段(LLM 提取后填充,可编辑)----
  name:      text('name'),
  email:     text('email'),
  phone:     text('phone'),
  city:      text('city'),
  role:      text('role'),
  company:   text('company'),
  years:     integer('years'),
  school:    text('school'),
  major:     text('major'),
  degree:    text('degree'),
  gradYear:  integer('grad_year'),
  skills:    text('skills', { mode: 'json' }).$type<string[]>(),
  summary:   text('summary'),

  // ---- LLM 完整输出(只读,留作未来扩展)----
  extractedJson: text('extracted_json', { mode: 'json' }).$type<ExtractedResume>(),

  // ---- 流程状态 ----
  status: text('status').$type<typeof candidateStatus[number]>()
    .notNull().default('待筛选'),
  extractionStatus: text('extraction_status').$type<typeof extractionStatus[number]>()
    .notNull().default('uploaded'),
  extractionError:    text('extraction_error'),
  extractionAttempts: integer('extraction_attempts').notNull().default(0),

  // ---- 文件 ----
  pdfPath:  text('pdf_path').notNull(),
  pdfSize:  integer('pdf_size').notNull(),
  pdfPages: integer('pdf_pages'),

  // ---- 时间 ----
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});
```

### 4.2 索引

```sql
CREATE INDEX idx_candidates_extraction_status ON candidates(extraction_status);
CREATE INDEX idx_candidates_status            ON candidates(status);
CREATE INDEX idx_candidates_created_at        ON candidates(created_at DESC);
```

### 4.3 LLM 输出契约(zod,派生 TS 类型)

```ts
// lib/validation.ts
import { z } from 'zod';

export const ExtractedResume = z.object({
  basic: z.object({
    name:  z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    city:  z.string().nullable(),
  }),
  educations: z.array(z.object({
    school:    z.string(),
    major:     z.string().nullable(),
    degree:    z.string().nullable(),
    startYear: z.number().int().nullable(),
    endYear:   z.number().int().nullable(),
  })),
  works: z.array(z.object({
    company:    z.string(),
    role:       z.string().nullable(),
    startDate:  z.string().nullable(),  // 原样字符串:"YYYY.MM"
    endDate:    z.string().nullable(),  // "至今" 或 "YYYY.MM"
    highlights: z.array(z.string()).default([]),
  })),
  skills:  z.array(z.string()).default([]),
  summary: z.string(),
});
export type ExtractedResume = z.infer<typeof ExtractedResume>;
```

### 4.4 主表平铺字段派生规则(`lib/extraction/derive.ts`)

| 主表列 | 从 `ExtractedResume` 派生方式 |
|---|---|
| name / email / phone / city | `basic.*` |
| school / major / degree | `educations` 按 `endYear` 倒序,取第 0 条 |
| gradYear | `educations[0].endYear` |
| company / role | `works` 按 `endDate` 倒序(`"至今"` 视为最新),取第 0 条 |
| years | 遍历 `works` 累加起止时长差(忽略为 null 的项),取整 |
| skills | 直接 `skills` 数组 |
| summary | 直接 `summary` |

## 5 · API 端点

| 方法 | 路径 | 请求 | 响应 | 行为 |
|---|---|---|---|---|
| POST | `/api/upload` | `FormData { file: File }` | `{ id, extractionStatus }` | 校验 PDF + 大小 → 写盘 → 插入 candidate → `enqueueExtraction(id)` |
| GET | `/api/candidates` | query: `status?`, `q?`, `sort?=recent\|oldest\|name` | `{ items: Candidate[] }` | 过滤 / 排序列表。MVP 不排分(分数是评分子项目) |
| GET | `/api/candidates/:id` | —— | `Candidate` (含 `extractedJson`) | 详情 |
| PATCH | `/api/candidates/:id` | 部分字段 JSON | 更新后的 `Candidate` | 字段编辑 or 状态推进;zod 校验 |
| DELETE | `/api/candidates/:id` | —— | `{ ok: true }` | unlink PDF → 删 DB |
| POST | `/api/candidates/:id/retry` | —— | `{ id, extractionStatus: 'uploaded' }` | 仅 `error` 态可调:清错、置 uploaded、重新入队 |
| GET | `/api/jobs?ids=a,b,c` | —— | `{ items: [{ id, extractionStatus, extractionError? }] }` | 批量轮询用,响应体轻 |

**通用响应规则**

- 成功 2xx + JSON;客户端错误 4xx + `{ error: string, code?: string }`;服务器错误 5xx + `{ error: string }`
- PDF 校验失败 → 415;大小超限 → 413;未找到 → 404;状态机不允许 → 409
- 所有端点都用 `zod` 校验请求体

## 6 · 上传与提取流水线

### 6.1 单候选人状态机

```
[客户端选文件]
    │
uploading   (HTTP 上传中,并发≤5)
    │ 200
uploaded    (文件落盘,候选人行已建,入队列)
    │ worker 取到
extracting  (PDF 解析 + DeepSeek 调用)
    │
    ├─→ parsed  ✓
    └─→ error   ✗ ─(手动重试)→ uploaded
```

### 6.2 客户端上传(`app/upload/page.tsx` · Client)

- 用户选 N ≤ 20 份 PDF,超过当场拒绝
- 单份 > 10MB 当场拒绝
- 用 `p-limit(5)` 把上传任务限到 5 并发
- 每个任务用 `XMLHttpRequest`(fetch 原生不给上传进度)打 `POST /api/upload`,带 `onprogress` 刷新条
- 拿到 `{ id }` 后把 id 加入轮询集合
- UI 每行:占位缩略图 / 文件名 / 进度条 / 状态徽章 / 错误文案 / 重试按钮(error 态)

### 6.3 `/api/upload` 服务端

```ts
// app/api/upload/route.ts(伪代码)
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return bad(400, 'missing file');

  await assertPdf(file);                     // mime + magic bytes 校验
  if (file.size > 10 * 1024 * 1024) return bad(413, 'file too large');

  const id = nanoid(12);
  const pdfPath = `data/uploads/${id}.pdf`;
  await fs.writeFile(absolute(pdfPath), Buffer.from(await file.arrayBuffer()));

  const now = new Date();
  db.insert(candidates).values({
    id, pdfPath, pdfSize: file.size,
    extractionStatus: 'uploaded',
    status: '待筛选',
    createdAt: now, updatedAt: now,
  }).run();  // drizzle + better-sqlite3 是同步的,统一用 .run()

  enqueueExtraction(id);

  return Response.json({ id, extractionStatus: 'uploaded' });
}
```

### 6.4 提取队列(`lib/extraction/queue.ts`)

```ts
import PQueue from 'p-queue';
import { db } from '@/lib/db/client';
import { candidates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { runExtraction } from './worker';

export const queue = new PQueue({ concurrency: 1 });

declare global { var __queueInit: boolean | undefined; }

if (!globalThis.__queueInit) {
  globalThis.__queueInit = true;

  // 重置残留 extracting(进程崩溃重启)
  db.update(candidates)
    .set({ extractionStatus: 'uploaded' })
    .where(eq(candidates.extractionStatus, 'extracting'))
    .run();

  // 把所有未终态的 candidate 重新入队
  const pending = db.select({ id: candidates.id })
    .from(candidates)
    .where(eq(candidates.extractionStatus, 'uploaded'))
    .all();

  for (const p of pending) enqueueExtraction(p.id);
}

export function enqueueExtraction(id: string) {
  queue.add(() => runExtraction(id));
}
```

**注意**:`globalThis.__queueInit` 防止 Next.js dev 模式热重载导致重复初始化。

### 6.5 Worker(`lib/extraction/worker.ts`)

```ts
export async function runExtraction(id: string) {
  const row = db.select().from(candidates).where(eq(candidates.id, id)).get();
  if (!row || row.extractionStatus === 'parsed') return;  // 幂等

  db.update(candidates).set({
    extractionStatus: 'extracting',
    extractionAttempts: sql`extraction_attempts + 1`,
    updatedAt: new Date(),
  }).where(eq(candidates.id, id)).run();

  try {
    const buf = await fs.readFile(absolute(row.pdfPath));
    const { text, numpages } = await parsePdf(buf);
    if (!text.trim()) throw new ExtractionError('pdf_empty');

    const raw = await callDeepSeek(text.slice(0, 30_000));  // 截断超长简历
    const parsed = ExtractedResume.parse(raw);               // zod 校验
    const flat = deriveFlat(parsed);

    db.update(candidates).set({
      ...flat,
      extractedJson: parsed,
      pdfPages: numpages,
      extractionStatus: 'parsed',
      extractionError: null,
      updatedAt: new Date(),
    }).where(eq(candidates.id, id)).run();

  } catch (err) {
    const message = toUserMessage(err);
    db.update(candidates).set({
      extractionStatus: 'error',
      extractionError: message,
      updatedAt: new Date(),
    }).where(eq(candidates.id, id)).run();
    console.error(`[extraction:${id}]`, err);
  }
}
```

### 6.6 DeepSeek 客户端(`lib/extraction/llm.ts`)

```ts
import OpenAI from 'openai';
import { STUB_RESULT, SYSTEM_PROMPT } from './prompt';

const USE_STUB = process.env.LLM_STUB === '1';
const client = USE_STUB ? null : new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

export async function callDeepSeek(resumeText: string): Promise<unknown> {
  if (USE_STUB) return STUB_RESULT;

  const res = await client!.chat.completions.create({
    model: 'deepseek-chat',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: resumeText },
    ],
  });
  const content = res.choices[0]?.message?.content;
  if (!content) throw new ExtractionError('llm_empty');
  try { return JSON.parse(content); }
  catch { throw new ExtractionError('llm_invalid_json'); }
}
```

### 6.7 系统提示词(`lib/extraction/prompt.ts`,节选)

```
你是一个严格的简历信息抽取器。从下面简历原文中抽取结构化字段,严格按 JSON 返回。

规则:
- 所有不确定的字段填 null,严禁编造
- 日期保留原样("2019.06" / "至今" / "2021.07 - 至今")
- 教育按毕业时间倒序排
- 工作按结束时间倒序排,"至今" 视作最新
- 技能从文本直接抽取,不总结、不分类、保留原写法(React / TypeScript 等)
- summary 用一到两句客观描述候选人画像,不吹嘘,不用感叹号,不用 emoji

返回的 JSON 严格符合 schema:
{
  "basic":      { "name", "email", "phone", "city" },
  "educations": [{ "school", "major", "degree", "startYear", "endYear" }],
  "works":      [{ "company", "role", "startDate", "endDate", "highlights": [] }],
  "skills":     [],
  "summary":    ""
}
```

### 6.8 错误分类(`lib/errors.ts`)

| code | 触发 | `extractionError` 中文 |
|---|---|---|
| `pdf_parse_failed` | pdf-parse 抛错 · 加密 | 文件无法解析,可能已加密或损坏 |
| `pdf_empty` | 解析出空文本 | PDF 无可提取文本,可能是图像版简历 |
| `llm_empty` | 200 但 content 为空 | AI 服务异常,请稍后重试 |
| `llm_invalid_json` | content 无法 `JSON.parse` | AI 返回格式错误,请重新解析 |
| `llm_schema_invalid` | `zod.parse` 失败 | AI 输出结构不完整 |
| `llm_http_error` | 非 200 | AI 服务返回错误(HTTP \${status}) |
| `unknown` | 其他 | 解析失败,请重新尝试 |

### 6.9 客户端轮询(`hooks/useJobPoll.ts`)

```ts
export function useJobPoll(ids: string[], enabled: boolean) {
  const [states, setStates] = useState<Record<string, JobState>>({});
  useEffect(() => {
    if (!enabled || ids.length === 0) return;
    const tick = async () => {
      const r = await fetch(`/api/jobs?ids=${ids.join(',')}`);
      const { items } = await r.json();
      setStates(prev => ({ ...prev, ...indexBy(items, 'id') }));
    };
    tick();
    const t = setInterval(tick, 2000);
    return () => clearInterval(t);
  }, [enabled, ids.join(',')]);
  return states;
}
```

- 某个 id 进入终态(`parsed` / `error`)后,调用方从 ids 中移除,停止对它的轮询
- Dashboard 页只要有任一候选人非终态,hook 就持续轮询

### 6.10 SQLite 并发

- `PRAGMA journal_mode = WAL` — 读不阻塞写
- 提取 worker concurrency=1 → 写从不重叠
- API 路由读请求并行,不被写阻塞

## 7 · 前端适配(Vite → Next.js App Router)

### 7.1 组件迁移

| 原(`jianli-agent/src/*`) | 新(`jianli-agent-next/*`) | 改动 |
|---|---|---|
| `components/ui.jsx` | `components/ui.tsx` | 加 TS 类型;文件顶 `'use client'` |
| `components/icons.jsx` | `components/icons.tsx` | 加类型;可标 client 或 server(无 hooks) |
| `App.jsx` 顶栏 Chrome | `app/layout.tsx` 的 client section | —— |
| `main.jsx` + `index.html` | `app/layout.tsx` + `app/globals.css` | —— |
| `index.html` 主题脚本 | 内联到 `layout.tsx` 的 `<head>` | 防止首屏闪烁 |

### 7.2 路由 API 切换

| React Router | Next.js App Router |
|---|---|
| `import { Link } from 'react-router-dom'` | `import Link from 'next/link'` |
| `<Link to="/">` | `<Link href="/">` |
| `useLocation()` | `usePathname()` |
| `useNavigate()` | `useRouter()` from `next/navigation` |

### 7.3 每个路由的 server / client 归属

| 路径 | 类型 | 说明 |
|---|---|---|
| `/` | RSC | 纯静态 |
| `/design` | RSC + 少量 client 片段 | 基本静态,图标交互用 client |
| `/upload` | Client | 文件输入 · XHR · 轮询 |
| `/dashboard` | RSC 壳 + Client 内层 | RSC 初次拉列表,Client 做筛选/排序/搜索/视图切换 |
| `/candidates/[id]` | RSC 壳 + Client 轮询 | RSC 初次拉,未终态时 Client 轮询自身 |
| `/candidates/[id]/edit` | Client | 表单 + PATCH |
| `/jd` / `/compare` | RSC | 空状态占位 |

### 7.4 数据获取规则

- RSC 内直接 `import { db }`,不经过自己的 `/api/*`
- Client 组件统一走 `/api/*` 端点

## 8 · 部署 / env / gitignore

### 8.1 `.env.local`(gitignore)

```
DEEPSEEK_API_KEY=sk-...
LLM_STUB=0
```

### 8.2 `.gitignore` 关键项

```
data/
.env.local
node_modules/
.next/
```

### 8.3 部署(**不在 MVP**)

- 推荐单 Node.js 进程(Next.js standalone build)+ 持久化 volume(存 `data/`)
- 候选方案:VPS/Docker、Railway、Render、Fly.io、自托管
- Vercel 配 Turso / LibSQL 是另一个子项目的事

## 9 · 测试策略

### 9.1 三层

| 层 | 工具 | 覆盖 |
|---|---|---|
| 单元 | `vitest` | `deriveFlat()`、`toUserMessage()`、zod schema 正反例、prompt 常量存在性 |
| 集成 | `vitest` + `:memory:` SQLite | 4 条核心 API:POST `/api/upload`(LLM stub)、GET `/api/candidates`、PATCH 编辑、DELETE 清理;轮询 `/api/jobs` |
| 手动冒烟 | 一份真实简历 PDF + 真 DeepSeek key | 一次性端到端验证 |

### 9.2 LLM stub

`LLM_STUB=1` → `callDeepSeek()` 直接返回 `STUB_RESULT`(一份合法的 `ExtractedResume` JSON)。CI 不依赖 API key,也不产生费用。

### 9.3 不在 MVP

- E2E(Playwright / Cypress)
- 视觉回归
- LLM 输出的语义质量评测

## 10 · 依赖清单

```jsonc
// dependencies
"next": "^15",
"react": "^18",
"react-dom": "^18",
"better-sqlite3": "^11",
"drizzle-orm": "^0.36",
"openai": "^4",
"pdf-parse": "^1.1",
"nanoid": "^5",
"p-queue": "^8",
"p-limit": "^6",
"zod": "^3"

// devDependencies
"typescript": "^5",
"@types/node": "*",
"@types/react": "^18",
"@types/react-dom": "^18",
"@types/better-sqlite3": "*",
"@types/pdf-parse": "*",
"drizzle-kit": "^0.28",
"vitest": "^2",
"eslint": "^9",
"eslint-config-next": "^15"
```

## 11 · 风险与开放议题

| 风险 / 议题 | 说明 / 缓解 |
|---|---|
| DeepSeek 输出偶尔不符合 schema | zod 校验 → error 态;手动重试;必要时后续加"自动重试 1 次"的策略(不在 MVP) |
| `pdf-parse` 对扫描版 PDF 无效(图像) | 现表现为 `pdf_empty` 错误,明确告知用户"图像版"。OCR 是后续子项目 |
| Next.js 热重载导致模块重载 → queue 被重置 | `globalThis.__queueInit` 守护 + 启动扫描 uploaded 行补跑 |
| 进程内队列,进程挂了丢进度 | 启动扫描 + extracting 行重置为 uploaded,幂等入队 |
| 单进程 SQLite → 水平扩展困难 | MVP 不考虑;后续换 Postgres / Turso 时,drizzle schema 基本无改 |
| `data/` 存盘满 | MVP 不加 GC;提醒用户监控磁盘;文件删除在 candidate 删除时同步进行 |
| 中文简历里的电话 / 邮箱格式千奇百怪 | 目前不做格式验证,以 LLM 输出为准;编辑页允许人工修正 |
| Dashboard 排序没有"评分"档 | MVP 无 score 列,排序只含 `recent` / `oldest` / `name`。Dashboard.jsx 视觉里的"评分 · 高→低"选项改为"最近上传",评分排序待评分子项目补齐 |

## 12 · 下一步

此 spec 批准后:

1. 调用 `superpowers:writing-plans` 生成详细实施计划(任务列表 / 顺序 / 验收标准)
2. 按实施计划逐任务落地,每完成一大块用 `superpowers:verification-before-completion` 自检

后续子项目(按优先级排):

1. JD 管理 + AI 评分引擎
2. 候选人对比
3. SSE 流式提取(把轮询换成流式文本)
4. 认证 + 多用户
5. 部署(Vercel + Turso / 自托管 / Docker)
6. E2E 测试

