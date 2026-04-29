# Sift MVP · Next.js + SQLite 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `C:\Users\75467\Desktop\jianli-agent-next\` 构建 Next.js 15 + SQLite 全栈 MVP:批量上传 PDF → DeepSeek AI 提取 → 候选人列表 → 详情 + 编辑,完整错误处理与进程重启恢复。

**Architecture:** Next.js 15 App Router(RSC + Client 组件混合);`better-sqlite3` 同步驱动 + `drizzle-orm`;进程内 `p-queue` 顺序消费提取任务(concurrency=1);客户端 `p-limit(5)` 控制上传并发,2s 轮询拿提取状态;DeepSeek 通过 `openai` SDK 兼容接口调用。

**Tech Stack:** Next.js 15 · TypeScript · better-sqlite3 · drizzle-orm/kit · openai (DeepSeek) · pdf-parse · nanoid · p-queue · p-limit · zod · vitest (scaffolded with create-next-app@latest which installed Next.js 16; all App Router APIs in this plan are compatible)

**Spec:** `docs/superpowers/specs/2026-04-24-sift-mvp-nextjs-sqlite-design.md`

---

## 文件总览

### 新建文件(按任务顺序)

| 路径 | 责任 | 首次出现的任务 |
|---|---|---|
| `package.json` · `tsconfig.json` · `next.config.ts` · `.gitignore` · `.env.local.example` | 工程脚手架 | 1 |
| `drizzle.config.ts` · `vitest.config.ts` · `vitest.setup.ts` | 工具配置 | 3 |
| `app/globals.css` | 导入 tokens + app.css | 3 |
| `public/assets/{logo,logo-mark,brand-gradient}.svg` | 品牌资产(从 `jianli-agent/public/assets/` 拷贝) | 3 |
| `lib/db/schema.ts` | drizzle TS schema | 4 |
| `lib/db/client.ts` | better-sqlite3 单例 + WAL | 5 |
| `lib/db/migrations/` | drizzle-kit 生成 | 5 |
| `lib/validation.ts` | `ExtractedResume` zod + API 请求体 zod | 6 |
| `lib/extraction/derive.ts` | `ExtractedResume → 主表扁平字段` | 7 |
| `lib/errors.ts` | `ExtractionError` + `toUserMessage` | 8 |
| `lib/extraction/prompt.ts` | `SYSTEM_PROMPT` + `STUB_RESULT` | 9 |
| `lib/extraction/llm.ts` | DeepSeek 客户端(支持 stub) | 10 |
| `lib/extraction/pdf.ts` | pdf-parse 封装 | 11 |
| `lib/storage.ts` | uploads 目录路径 · 读写 · unlink | 11 |
| `lib/extraction/worker.ts` | `runExtraction(id)` 主流程 | 12 |
| `lib/extraction/queue.ts` | `p-queue` 单例 · 启动恢复 | 13 |
| `app/api/upload/route.ts` | `POST` 上传 | 14 |
| `app/api/candidates/route.ts` | `GET` 列表 | 15 |
| `app/api/candidates/[id]/route.ts` | `GET` / `PATCH` / `DELETE` | 16 |
| `app/api/candidates/[id]/retry/route.ts` | `POST` 重试 | 17 |
| `app/api/jobs/route.ts` | `GET` 批量轮询 | 18 |
| `components/icons.tsx` | 35 个 Lucide 图标(从 `jianli-agent/src/components/icons.jsx` 拷贝 + 加类型) | 19 |
| `components/ui.tsx` | Btn/Badge/SkillTag/... 组件(同上) | 20 |
| `hooks/useJobPoll.ts` | 统一轮询 `/api/jobs` | 21 |
| `app/layout.tsx` | 根布局 + Chrome + 主题初始化 | 22 |
| `app/page.tsx` | `/` 落地页 | 23 |
| `app/design/page.tsx` | `/design` 设计系统 | 23 |
| `app/upload/page.tsx` + `UploadClient.tsx` | `/upload` 客户端上传 | 24 |
| `app/dashboard/page.tsx` + `DashboardClient.tsx` | `/dashboard` | 25 |
| `app/candidates/[id]/page.tsx` + `CandidateDetailClient.tsx` | 详情 + 状态推进 | 26 |
| `app/candidates/[id]/edit/page.tsx` | 字段编辑 | 27 |
| `app/jd/page.tsx` · `app/compare/page.tsx` | 占位 | 28 |
| `tests/fixtures/` | 样本 PDF · stub payload 等 | 6 起 |

### 修改 / 复用(从 `jianli-agent/`)

| 源 | 目标 | 方式 |
|---|---|---|
| `src/styles/tokens.css` | `app/globals.css` 内容 | 合并拷贝 |
| `src/styles/app.css` | `app/globals.css` 内容 | 合并拷贝 |
| `public/assets/*.svg` | `public/assets/*.svg` | 原样拷贝 |
| `src/components/icons.jsx` | `components/icons.tsx` | 拷贝后加 TS 类型 |
| `src/components/ui.jsx` | `components/ui.tsx` | 拷贝 + TS 类型 + 路由 hook 替换 + `'use client'` |
| `src/data/mock.js` | **不复用**(改为真 DB) | —— |
| `src/pages/*.jsx` | `app/<route>/page.tsx` | 重新组织 server/client 边界 |

---

## Phase 1 · 工程脚手架

### Task 1 · 创建 Next.js 项目 + git init

**Files:**
- Create: `C:\Users\75467\Desktop\jianli-agent-next\` 整个目录

**Steps:**

- [ ] **Step 1.1: 运行 create-next-app**

```bash
cd "C:/Users/75467/Desktop/"
npx create-next-app@latest jianli-agent-next \
  --typescript \
  --eslint \
  --no-tailwind \
  --app \
  --src-dir=false \
  --import-alias="@/*" \
  --no-turbopack \
  --use-npm
```

Expected:项目创建成功,`jianli-agent-next/` 目录生成,包含 `package.json` / `tsconfig.json` / `app/layout.tsx` / `app/page.tsx` / `.gitignore`。

- [ ] **Step 1.2: 初始化 git 并加入 `.gitignore` 条目**

向 `jianli-agent-next/.gitignore` 末尾追加:

```
# Sift MVP
data/
.env.local
.env*.local
```

```bash
cd "C:/Users/75467/Desktop/jianli-agent-next"
git init
git add -A
git commit -m "chore: scaffold Next.js 15 + TypeScript"
```

Expected:`git log --oneline` 看到第 1 条 commit。

---

### Task 2 · 安装运行时 + 开发依赖

**Files:**
- Modify: `package.json`

**Steps:**

- [ ] **Step 2.1: 安装运行时依赖**

```bash
cd "C:/Users/75467/Desktop/jianli-agent-next"
npm install better-sqlite3@^11 drizzle-orm@^0.36 openai@^4 pdf-parse@^1.1 nanoid@^5 p-queue@^8 p-limit@^6 zod@^3
```

- [ ] **Step 2.2: 安装开发依赖**

```bash
npm install -D drizzle-kit@^0.28 vitest@^2 @vitest/ui @types/better-sqlite3 @types/pdf-parse
```

- [ ] **Step 2.3: 验证 + commit**

```bash
npm ls better-sqlite3 drizzle-orm openai pdf-parse zod p-queue p-limit nanoid
git add package.json package-lock.json
git commit -m "chore: add runtime and dev dependencies"
```

Expected:`npm ls` 每个依赖都显示具体版本,无 `UNMET`。

---

### Task 3 · 工具配置 + 拷贝样式 / 资产

**Files:**
- Create: `drizzle.config.ts` · `vitest.config.ts` · `app/globals.css`(覆盖默认) · `public/assets/{logo,logo-mark,brand-gradient}.svg` · `.env.local.example`
- Modify: `app/layout.tsx`(去掉 Next 默认字体)

**Steps:**

- [ ] **Step 3.1: 写 `drizzle.config.ts`**

```ts
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'sqlite',
  dbCredentials: { url: 'data/sift.db' },
  verbose: true,
  strict: true,
} satisfies Config;
```

- [ ] **Step 3.2: 写 `vitest.config.ts`**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 10_000,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

- [ ] **Step 3.3: 写 `vitest.setup.ts`**

```ts
// vitest.setup.ts
process.env.LLM_STUB = '1';
process.env.DATABASE_URL = ':memory:';
```

- [ ] **Step 3.4: 拷贝 SVG 资产**

```bash
cp "C:/Users/75467/Desktop/jianli-agent/public/assets/logo.svg"           public/assets/logo.svg
cp "C:/Users/75467/Desktop/jianli-agent/public/assets/logo-mark.svg"      public/assets/logo-mark.svg
cp "C:/Users/75467/Desktop/jianli-agent/public/assets/brand-gradient.svg" public/assets/brand-gradient.svg
```

- [ ] **Step 3.5: 合并样式到 `app/globals.css`**

完全覆盖 `app/globals.css`:

```css
/* Sift · 思筛 design tokens + app shell. Combined from jianli-agent/src/styles/*. */

/* === tokens === */
/* [把 C:/Users/75467/Desktop/jianli-agent/src/styles/tokens.css 的全部内容粘贴到这里] */

/* === app shell === */
/* [把 C:/Users/75467/Desktop/jianli-agent/src/styles/app.css 的全部内容粘贴到这里] */
```

注:实施时用 Read 工具读那两个文件,将内容拼进来。不要省略,两份合计约 230 行。

- [ ] **Step 3.6: 简化 `app/layout.tsx` + 内联主题脚本**

覆盖 `app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sift · 思筛 — AI 简历筛选',
  icons: { icon: '/assets/logo-mark.svg' },
};

const THEME_INIT = `
  (function () {
    try {
      var t = localStorage.getItem('sift-theme');
      if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t;
    } catch (e) {}
  })();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

注:此处的 layout 仅打基础,顶栏 Chrome 在 Task 22 补。

- [ ] **Step 3.7: 写 `.env.local.example`**

```
DEEPSEEK_API_KEY=sk-your-key-here
LLM_STUB=0
```

- [ ] **Step 3.8: 把 `dev:migrate` 脚本加入 `package.json`**

修改 `package.json` 中 `"scripts"` 对象,变成:

```jsonc
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "tsx lib/db/migrate.ts"
}
```

并添加 devDep:`npm install -D tsx`

- [ ] **Step 3.9: 验证 dev server 起得来 + commit**

```bash
npm run dev
```

在浏览器打开 `http://localhost:3000`,看到默认 Next.js 欢迎页即可。Ctrl+C 关停。

```bash
git add -A
git commit -m "chore: configure drizzle, vitest, assets, globals.css"
```

---

## Phase 2 · 数据层

### Task 4 · Drizzle schema

**Files:**
- Create: `lib/db/schema.ts`

**Steps:**

- [ ] **Step 4.1: 写 schema**

```ts
// lib/db/schema.ts
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import type { ExtractedResume } from '../validation';

export const CANDIDATE_STATUS = [
  '待筛选', '初筛通过', '面试中', '已录用', '已淘汰',
] as const;
export type CandidateStatus = typeof CANDIDATE_STATUS[number];

export const EXTRACTION_STATUS = [
  'uploaded', 'extracting', 'parsed', 'error',
] as const;
export type ExtractionStatus = typeof EXTRACTION_STATUS[number];

export const candidates = sqliteTable('candidates', {
  id: text('id').primaryKey(),

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

  extractedJson: text('extracted_json', { mode: 'json' }).$type<ExtractedResume>(),

  status: text('status').$type<CandidateStatus>()
    .notNull().default('待筛选'),
  extractionStatus: text('extraction_status').$type<ExtractionStatus>()
    .notNull().default('uploaded'),
  extractionError:    text('extraction_error'),
  extractionAttempts: integer('extraction_attempts').notNull().default(0),

  pdfPath:  text('pdf_path').notNull(),
  pdfSize:  integer('pdf_size').notNull(),
  pdfPages: integer('pdf_pages'),

  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, (t) => ({
  extractionStatusIdx: index('idx_candidates_extraction_status').on(t.extractionStatus),
  statusIdx:           index('idx_candidates_status').on(t.status),
  createdAtIdx:        index('idx_candidates_created_at').on(t.createdAt),
}));

export type Candidate = typeof candidates.$inferSelect;
export type NewCandidate = typeof candidates.$inferInsert;
```

注:此处 import `ExtractedResume` 来自 `lib/validation.ts`,该文件 Task 6 才创建。用 TS 的 `import type` 延迟解析,执行 `tsc --noEmit` 此时会报错,这是**预期的**——Task 6 完成后才通过。为让 git commit 可在当前任务完成,本任务允许 type error(下条 commit 会解决)。

**但是**——为避免任务间耦合,让本任务自包含:**临时**在本文件顶部加:

```ts
// 临时类型定义,Task 6 会替换为 import type from '../validation'
type ExtractedResume = Record<string, unknown>;
```

Task 6 完成时,把这两行换成真正的 import。

- [ ] **Step 4.2: 验证可编译 + commit**

```bash
npx tsc --noEmit
```

Expected:通过,无错误。

```bash
git add lib/db/schema.ts
git commit -m "feat(db): add candidates schema"
```

---

### Task 5 · DB 客户端 + 迁移脚本

**Files:**
- Create: `lib/db/client.ts` · `lib/db/migrate.ts` · `lib/db/migrations/` (by drizzle-kit)
- Create test: `tests/db.test.ts`

**Steps:**

- [ ] **Step 5.1: 写测试**

```ts
// tests/db.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { candidates } from '@/lib/db/schema';

describe('db migrate + roundtrip', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'sift-db-'));
  });

  it('creates table and roundtrips a row', () => {
    const sqlite = new Database(join(dir, 'test.db'));
    sqlite.pragma('journal_mode = WAL');
    const db = drizzle(sqlite);
    migrate(db, { migrationsFolder: './lib/db/migrations' });

    const now = new Date();
    db.insert(candidates).values({
      id: 'abc123',
      pdfPath: 'data/uploads/abc123.pdf',
      pdfSize: 1234,
      createdAt: now,
      updatedAt: now,
    }).run();

    const rows = db.select().from(candidates).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('abc123');
    expect(rows[0].status).toBe('待筛选');
    expect(rows[0].extractionStatus).toBe('uploaded');

    sqlite.close();
    rmSync(dir, { recursive: true });
  });
});
```

- [ ] **Step 5.2: 运行测试验证失败**

```bash
npm test -- tests/db.test.ts
```

Expected:FAIL(`lib/db/migrations` 不存在)。

- [ ] **Step 5.3: 生成初次迁移**

```bash
npm run db:generate
```

Expected:`lib/db/migrations/0000_*.sql` 与 `_meta/` 出现。

- [ ] **Step 5.4: 写 `lib/db/client.ts`**

```ts
// lib/db/client.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const dbUrl = process.env.DATABASE_URL ?? 'data/sift.db';

declare global {
  var __sqlite: Database.Database | undefined;
}

function createDb() {
  if (dbUrl !== ':memory:') mkdirSync(dirname(dbUrl), { recursive: true });
  const sqlite = new Database(dbUrl);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return sqlite;
}

const sqlite = globalThis.__sqlite ?? createDb();
if (process.env.NODE_ENV !== 'production') globalThis.__sqlite = sqlite;

export const db = drizzle(sqlite);
export { sqlite };
```

- [ ] **Step 5.5: 写 `lib/db/migrate.ts`**

```ts
// lib/db/migrate.ts
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db, sqlite } from './client';

migrate(db, { migrationsFolder: './lib/db/migrations' });
console.log('migration done');
sqlite.close();
```

- [ ] **Step 5.6: 运行迁移 + 再跑测试**

```bash
npm run db:migrate
npm test -- tests/db.test.ts
```

Expected:两者都 PASS。

- [ ] **Step 5.7: Commit**

```bash
git add lib/db/ tests/db.test.ts
git commit -m "feat(db): client, migrations, roundtrip test"
```

---

## Phase 3 · 纯工具(TDD)

### Task 6 · `ExtractedResume` zod schema

**Files:**
- Create: `lib/validation.ts` · `tests/validation.test.ts`
- Modify: `lib/db/schema.ts`(替换临时类型为真正 import)

**Steps:**

- [ ] **Step 6.1: 写测试**

```ts
// tests/validation.test.ts
import { describe, it, expect } from 'vitest';
import { ExtractedResume } from '@/lib/validation';

describe('ExtractedResume zod', () => {
  it('accepts a full valid payload', () => {
    const input = {
      basic: { name: '张远哲', email: 'a@b.cn', phone: '138', city: '杭州' },
      educations: [{ school: '浙江大学', major: '计算机', degree: '本科', startYear: 2015, endYear: 2019 }],
      works: [{ company: '阿里', role: 'FE', startDate: '2021.07', endDate: '至今', highlights: ['架构升级'] }],
      skills: ['React', 'TypeScript'],
      summary: '高级前端工程师',
    };
    expect(() => ExtractedResume.parse(input)).not.toThrow();
  });

  it('accepts nulls in basic', () => {
    const input = {
      basic: { name: null, email: null, phone: null, city: null },
      educations: [], works: [], skills: [], summary: '',
    };
    expect(() => ExtractedResume.parse(input)).not.toThrow();
  });

  it('rejects missing required top-level keys', () => {
    expect(() => ExtractedResume.parse({ basic: {}, educations: [] })).toThrow();
  });

  it('rejects wrong types', () => {
    const bad = {
      basic: { name: 123, email: null, phone: null, city: null },
      educations: [], works: [], skills: [], summary: '',
    };
    expect(() => ExtractedResume.parse(bad)).toThrow();
  });

  it('defaults highlights and skills to empty arrays', () => {
    const input = {
      basic: { name: null, email: null, phone: null, city: null },
      educations: [],
      works: [{ company: 'x', role: null, startDate: null, endDate: null }],
      summary: '',
    };
    const parsed = ExtractedResume.parse(input);
    expect(parsed.works[0].highlights).toEqual([]);
    expect(parsed.skills).toEqual([]);
  });
});
```

- [ ] **Step 6.2: 运行测试验证失败**

```bash
npm test -- tests/validation.test.ts
```

Expected:FAIL(模块不存在)。

- [ ] **Step 6.3: 写 `lib/validation.ts`**

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
    startDate:  z.string().nullable(),
    endDate:    z.string().nullable(),
    highlights: z.array(z.string()).default([]),
  })),
  skills:  z.array(z.string()).default([]),
  summary: z.string(),
});
export type ExtractedResume = z.infer<typeof ExtractedResume>;

// ---- API 请求体 schema ----
export const PatchCandidate = z.object({
  name:     z.string().nullable().optional(),
  email:    z.string().nullable().optional(),
  phone:    z.string().nullable().optional(),
  city:     z.string().nullable().optional(),
  role:     z.string().nullable().optional(),
  company:  z.string().nullable().optional(),
  years:    z.number().int().nullable().optional(),
  school:   z.string().nullable().optional(),
  major:    z.string().nullable().optional(),
  degree:   z.string().nullable().optional(),
  gradYear: z.number().int().nullable().optional(),
  skills:   z.array(z.string()).optional(),
  summary:  z.string().optional(),
  status:   z.enum(['待筛选', '初筛通过', '面试中', '已录用', '已淘汰']).optional(),
});
export type PatchCandidateBody = z.infer<typeof PatchCandidate>;
```

- [ ] **Step 6.4: 替换 `lib/db/schema.ts` 顶部的临时类型**

把 Task 4 里加的:

```ts
type ExtractedResume = Record<string, unknown>;
```

删除,改为:

```ts
import type { ExtractedResume } from '../validation';
```

- [ ] **Step 6.5: 运行所有测试 + commit**

```bash
npm test
npx tsc --noEmit
```

Expected:全 PASS,tsc 无错误。

```bash
git add lib/validation.ts lib/db/schema.ts tests/validation.test.ts
git commit -m "feat(validation): ExtractedResume zod + patch body"
```

---

### Task 7 · `deriveFlat` 派生函数

**Files:**
- Create: `lib/extraction/derive.ts` · `tests/derive.test.ts`

**Steps:**

- [ ] **Step 7.1: 写测试**

```ts
// tests/derive.test.ts
import { describe, it, expect } from 'vitest';
import { deriveFlat, computeYears } from '@/lib/extraction/derive';
import type { ExtractedResume } from '@/lib/validation';

const base: ExtractedResume = {
  basic: { name: '张远哲', email: 'a@b.cn', phone: '138', city: '杭州' },
  educations: [],
  works: [],
  skills: ['React'],
  summary: 'hi',
};

describe('deriveFlat', () => {
  it('fills basic fields', () => {
    const flat = deriveFlat(base);
    expect(flat.name).toBe('张远哲');
    expect(flat.email).toBe('a@b.cn');
    expect(flat.phone).toBe('138');
    expect(flat.city).toBe('杭州');
    expect(flat.skills).toEqual(['React']);
    expect(flat.summary).toBe('hi');
  });

  it('picks newest education by endYear desc', () => {
    const e: ExtractedResume = {
      ...base,
      educations: [
        { school: '本科校', major: 'CS', degree: '本科', startYear: 2011, endYear: 2015 },
        { school: '硕士校', major: 'CS', degree: '硕士', startYear: 2015, endYear: 2018 },
      ],
    };
    const flat = deriveFlat(e);
    expect(flat.school).toBe('硕士校');
    expect(flat.degree).toBe('硕士');
    expect(flat.gradYear).toBe(2018);
  });

  it('picks newest work; "至今" treated as latest', () => {
    const w: ExtractedResume = {
      ...base,
      works: [
        { company: '前公司', role: 'A', startDate: '2018.01', endDate: '2020.06', highlights: [] },
        { company: '现公司', role: 'B', startDate: '2020.07', endDate: '至今', highlights: [] },
      ],
    };
    const flat = deriveFlat(w);
    expect(flat.company).toBe('现公司');
    expect(flat.role).toBe('B');
  });

  it('returns null flat fields when arrays empty', () => {
    const flat = deriveFlat(base);
    expect(flat.school).toBeNull();
    expect(flat.gradYear).toBeNull();
    expect(flat.company).toBeNull();
    expect(flat.years).toBeNull();
  });
});

describe('computeYears', () => {
  it('sums up work durations in years (rounded)', () => {
    const years = computeYears([
      { company: 'x', role: null, startDate: '2018.01', endDate: '2020.01', highlights: [] },
      { company: 'y', role: null, startDate: '2020.07', endDate: '2023.07', highlights: [] },
    ]);
    expect(years).toBe(5);
  });

  it('treats 至今 as now', () => {
    // 测试时冻结时间为 2026-04-24
    const years = computeYears([
      { company: 'x', role: null, startDate: '2020.04', endDate: '至今', highlights: [] },
    ], new Date('2026-04-24'));
    expect(years).toBe(6);
  });

  it('returns null when no parseable dates', () => {
    const years = computeYears([
      { company: 'x', role: null, startDate: null, endDate: null, highlights: [] },
    ]);
    expect(years).toBeNull();
  });

  it('returns null when array empty', () => {
    expect(computeYears([])).toBeNull();
  });
});
```

- [ ] **Step 7.2: 运行测试验证失败**

```bash
npm test -- tests/derive.test.ts
```

Expected:FAIL。

- [ ] **Step 7.3: 写实现**

```ts
// lib/extraction/derive.ts
import type { ExtractedResume } from '../validation';

type WorkItem = ExtractedResume['works'][number];
type EduItem  = ExtractedResume['educations'][number];

export interface FlatFields {
  name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  role: string | null;
  company: string | null;
  years: number | null;
  school: string | null;
  major: string | null;
  degree: string | null;
  gradYear: number | null;
  skills: string[];
  summary: string;
}

/** "YYYY.MM" -> Date; null 若无法解析 */
function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})\.(\d{1,2})/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (isNaN(y) || isNaN(mo)) return null;
  return new Date(y, mo - 1, 1);
}

/** "至今" → now;否则按 YYYY.MM 解析 */
function parseEndDate(s: string | null, now: Date): Date | null {
  if (s === '至今') return now;
  return parseDate(s);
}

function pickLatestEducation(list: EduItem[]): EduItem | null {
  if (list.length === 0) return null;
  return [...list].sort((a, b) => (b.endYear ?? -1) - (a.endYear ?? -1))[0];
}

function pickLatestWork(list: WorkItem[], now = new Date()): WorkItem | null {
  if (list.length === 0) return null;
  return [...list].sort((a, b) => {
    const ae = parseEndDate(a.endDate, now)?.getTime() ?? -Infinity;
    const be = parseEndDate(b.endDate, now)?.getTime() ?? -Infinity;
    return be - ae;
  })[0];
}

export function computeYears(works: WorkItem[], now = new Date()): number | null {
  if (works.length === 0) return null;
  let totalMs = 0;
  let any = false;
  for (const w of works) {
    const s = parseDate(w.startDate);
    const e = parseEndDate(w.endDate, now);
    if (s && e) {
      totalMs += e.getTime() - s.getTime();
      any = true;
    }
  }
  if (!any) return null;
  const years = totalMs / (365.25 * 24 * 3600 * 1000);
  return Math.round(years);
}

export function deriveFlat(data: ExtractedResume, now = new Date()): FlatFields {
  const edu = pickLatestEducation(data.educations);
  const work = pickLatestWork(data.works, now);
  return {
    name:  data.basic.name,
    email: data.basic.email,
    phone: data.basic.phone,
    city:  data.basic.city,
    role:    work?.role ?? null,
    company: work?.company ?? null,
    years:   computeYears(data.works, now),
    school:   edu?.school ?? null,
    major:    edu?.major ?? null,
    degree:   edu?.degree ?? null,
    gradYear: edu?.endYear ?? null,
    skills:  data.skills,
    summary: data.summary,
  };
}
```

- [ ] **Step 7.4: 跑测试 + commit**

```bash
npm test -- tests/derive.test.ts
```

Expected:PASS。

```bash
git add lib/extraction/derive.ts tests/derive.test.ts
git commit -m "feat(extraction): deriveFlat + computeYears"
```

---

### Task 8 · `ExtractionError` + `toUserMessage`

**Files:**
- Create: `lib/errors.ts` · `tests/errors.test.ts`

**Steps:**

- [ ] **Step 8.1: 写测试**

```ts
// tests/errors.test.ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ExtractionError, toUserMessage } from '@/lib/errors';

describe('toUserMessage', () => {
  it('maps known ExtractionError codes to Chinese text', () => {
    expect(toUserMessage(new ExtractionError('pdf_parse_failed'))).toMatch(/加密|损坏/);
    expect(toUserMessage(new ExtractionError('pdf_empty'))).toMatch(/图像版|无可提取/);
    expect(toUserMessage(new ExtractionError('llm_empty'))).toMatch(/AI 服务/);
    expect(toUserMessage(new ExtractionError('llm_invalid_json'))).toMatch(/格式错误/);
  });

  it('maps zod errors to llm_schema_invalid message', () => {
    const z1 = z.object({ a: z.string() });
    let caught: unknown;
    try { z1.parse({ a: 1 }); } catch (e) { caught = e; }
    expect(toUserMessage(caught)).toMatch(/结构不完整/);
  });

  it('wraps unknown errors with generic message', () => {
    expect(toUserMessage(new Error('boom'))).toMatch(/请重新尝试/);
    expect(toUserMessage('random string')).toMatch(/请重新尝试/);
  });

  it('caps message length to 500 chars', () => {
    const long = new ExtractionError('unknown', 'x'.repeat(1000));
    const msg = toUserMessage(long);
    expect(msg.length).toBeLessThanOrEqual(500);
  });
});
```

- [ ] **Step 8.2: 运行测试验证失败**

```bash
npm test -- tests/errors.test.ts
```

- [ ] **Step 8.3: 写实现**

```ts
// lib/errors.ts
import { ZodError } from 'zod';

export type ExtractionErrorCode =
  | 'pdf_parse_failed'
  | 'pdf_empty'
  | 'llm_empty'
  | 'llm_invalid_json'
  | 'llm_schema_invalid'
  | 'llm_http_error'
  | 'unknown';

export class ExtractionError extends Error {
  code: ExtractionErrorCode;
  httpStatus?: number;
  constructor(code: ExtractionErrorCode, detail?: string, httpStatus?: number) {
    super(detail ?? code);
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

const MESSAGES: Record<ExtractionErrorCode, (e?: ExtractionError) => string> = {
  pdf_parse_failed:   () => '文件无法解析,可能已加密或损坏',
  pdf_empty:          () => 'PDF 无可提取文本,可能是图像版简历',
  llm_empty:          () => 'AI 服务异常,请稍后重试',
  llm_invalid_json:   () => 'AI 返回格式错误,请重新解析',
  llm_schema_invalid: () => 'AI 输出结构不完整',
  llm_http_error:     (e) => `AI 服务返回错误(HTTP ${e?.httpStatus ?? '未知'})`,
  unknown:            () => '解析失败,请重新尝试',
};

export function toUserMessage(err: unknown): string {
  let msg: string;
  if (err instanceof ExtractionError) {
    msg = MESSAGES[err.code](err);
  } else if (err instanceof ZodError) {
    msg = MESSAGES.llm_schema_invalid();
  } else {
    msg = MESSAGES.unknown();
  }
  return msg.slice(0, 500);
}
```

- [ ] **Step 8.4: 跑测试 + commit**

```bash
npm test -- tests/errors.test.ts
git add lib/errors.ts tests/errors.test.ts
git commit -m "feat(errors): ExtractionError + toUserMessage"
```

---

## Phase 4 · LLM 集成

### Task 9 · Prompt 常量 + Stub 结果

**Files:**
- Create: `lib/extraction/prompt.ts` · `tests/prompt.test.ts`

**Steps:**

- [ ] **Step 9.1: 写测试**

```ts
// tests/prompt.test.ts
import { describe, it, expect } from 'vitest';
import { SYSTEM_PROMPT, STUB_RESULT } from '@/lib/extraction/prompt';
import { ExtractedResume } from '@/lib/validation';

describe('prompt constants', () => {
  it('SYSTEM_PROMPT is a non-empty Chinese string', () => {
    expect(typeof SYSTEM_PROMPT).toBe('string');
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(100);
    expect(/简历|提取|JSON/.test(SYSTEM_PROMPT)).toBe(true);
  });

  it('SYSTEM_PROMPT forbids emoji / 夸张语气 explicitly', () => {
    expect(/不吹嘘|客观|不使用感叹号|no emoji|emoji/i.test(SYSTEM_PROMPT)).toBe(true);
  });

  it('STUB_RESULT passes ExtractedResume validation', () => {
    expect(() => ExtractedResume.parse(STUB_RESULT)).not.toThrow();
  });
});
```

- [ ] **Step 9.2: 运行测试**

```bash
npm test -- tests/prompt.test.ts
```

Expected:FAIL。

- [ ] **Step 9.3: 写实现**

```ts
// lib/extraction/prompt.ts
import type { ExtractedResume } from '../validation';

export const SYSTEM_PROMPT = `你是一个严格的简历信息抽取器。从下面简历原文中抽取结构化字段,严格按 JSON 返回。

规则:
- 所有不确定的字段填 null,严禁编造
- 日期保留原样("2019.06" / "至今" / "2021.07 - 至今")
- 教育按毕业时间倒序排,最新排第 0 位
- 工作按结束时间倒序排,"至今" 视作最新
- 技能从文本直接抽取,不总结、不分类、保留原写法(React / TypeScript 等)
- summary 用一到两句客观描述候选人画像,不吹嘘,不使用感叹号,不用 emoji

返回的 JSON 严格符合以下 schema:
{
  "basic":      { "name": string|null, "email": string|null, "phone": string|null, "city": string|null },
  "educations": [{ "school": string, "major": string|null, "degree": string|null, "startYear": number|null, "endYear": number|null }],
  "works":      [{ "company": string, "role": string|null, "startDate": string|null, "endDate": string|null, "highlights": string[] }],
  "skills":     string[],
  "summary":    string
}

只返回 JSON 对象,不要任何说明文字、markdown 代码块围栏。`;

export const STUB_RESULT: ExtractedResume = {
  basic: { name: '张远哲', email: 'zhang.yz@mail.cn', phone: '138-0000-0012', city: '杭州' },
  educations: [
    { school: '浙江大学', major: '计算机科学与技术', degree: '本科', startYear: 2015, endYear: 2019 },
  ],
  works: [
    { company: '阿里巴巴', role: '高级前端工程师', startDate: '2021.07', endDate: '至今', highlights: ['主导 B 端中台前端架构升级'] },
  ],
  skills: ['React', 'TypeScript', 'Next.js', 'Node.js', 'GraphQL'],
  summary: '在前端性能优化与大型 SPA 架构方面有深入积累。',
};
```

- [ ] **Step 9.4: 跑测试 + commit**

```bash
npm test -- tests/prompt.test.ts
git add lib/extraction/prompt.ts tests/prompt.test.ts
git commit -m "feat(extraction): system prompt + stub result"
```

---

### Task 10 · DeepSeek 客户端(含 stub 分支)

**Files:**
- Create: `lib/extraction/llm.ts` · `tests/llm.test.ts`

**Steps:**

- [ ] **Step 10.1: 写测试(stub 分支)**

```ts
// tests/llm.test.ts
import { describe, it, expect } from 'vitest';
// 注:全局 vitest.setup.ts 已置 LLM_STUB=1
import { callDeepSeek } from '@/lib/extraction/llm';
import { ExtractedResume } from '@/lib/validation';

describe('callDeepSeek (stub mode)', () => {
  it('returns STUB_RESULT that validates', async () => {
    const res = await callDeepSeek('任何简历文本');
    expect(() => ExtractedResume.parse(res)).not.toThrow();
  });

  it('is deterministic across calls', async () => {
    const a = await callDeepSeek('x');
    const b = await callDeepSeek('y');
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 10.2: 运行测试**

```bash
npm test -- tests/llm.test.ts
```

Expected:FAIL。

- [ ] **Step 10.3: 写实现**

```ts
// lib/extraction/llm.ts
import OpenAI from 'openai';
import { ExtractionError } from '../errors';
import { SYSTEM_PROMPT, STUB_RESULT } from './prompt';

const USE_STUB = process.env.LLM_STUB === '1';

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com',
    });
  }
  return _client;
}

export async function callDeepSeek(resumeText: string): Promise<unknown> {
  if (USE_STUB) return STUB_RESULT;

  try {
    const res = await client().chat.completions.create({
      model: 'deepseek-chat',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: resumeText.slice(0, 30_000) },
      ],
    });
    const content = res.choices[0]?.message?.content;
    if (!content) throw new ExtractionError('llm_empty');
    try {
      return JSON.parse(content);
    } catch {
      throw new ExtractionError('llm_invalid_json');
    }
  } catch (err) {
    if (err instanceof ExtractionError) throw err;
    // OpenAI 客户端抛出的 APIError 带 status
    const status = (err as { status?: number }).status;
    if (status) throw new ExtractionError('llm_http_error', undefined, status);
    throw new ExtractionError('unknown', String(err));
  }
}
```

- [ ] **Step 10.4: 跑测试 + commit**

```bash
npm test -- tests/llm.test.ts
git add lib/extraction/llm.ts tests/llm.test.ts
git commit -m "feat(extraction): DeepSeek client with stub branch"
```

---

## Phase 5 · PDF + Storage + Worker

### Task 11 · PDF 解析 + 存储工具

**Files:**
- Create: `lib/extraction/pdf.ts` · `lib/storage.ts` · `tests/pdf.test.ts` · `tests/fixtures/sample.pdf`(手动准备一份)

**Steps:**

- [ ] **Step 11.1: 准备 fixture PDF**

把任何一份**简短、可文本提取**的 PDF 放到 `tests/fixtures/sample.pdf`。如果手头没有,生成一个:

```bash
mkdir -p tests/fixtures
# 在能访问的任意电脑上用 Word/Pages 导出一个带"张远哲 / 阿里巴巴 / React"字样的 PDF 到该路径
```

(实施时用户需提供 sample.pdf。若实施中发现没有,本任务用 node 脚本生成一个最简单的 PDF:见下一步)

- [ ] **Step 11.2: (备用)用 Node 生成一个最小 PDF**

如果 Step 11.1 没现成 PDF,加一个 dev dep:

```bash
npm install -D pdfkit
```

写 `tests/fixtures/make-sample.mjs`:

```js
// tests/fixtures/make-sample.mjs
import PDFDocument from 'pdfkit';
import fs from 'node:fs';
const doc = new PDFDocument();
doc.pipe(fs.createWriteStream('tests/fixtures/sample.pdf'));
doc.fontSize(20).text('Zhang Yuanzhe');
doc.fontSize(12).text('Senior Frontend Engineer at Alibaba. Skills: React, TypeScript.');
doc.end();
```

运行 `node tests/fixtures/make-sample.mjs`。

- [ ] **Step 11.3: 写测试**

```ts
// tests/pdf.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parsePdf } from '@/lib/extraction/pdf';
import { ExtractionError } from '@/lib/errors';

describe('parsePdf', () => {
  it('extracts text and page count from a valid PDF', async () => {
    const buf = readFileSync('tests/fixtures/sample.pdf');
    const result = await parsePdf(buf);
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.numpages).toBeGreaterThanOrEqual(1);
  });

  it('throws ExtractionError(pdf_parse_failed) on non-PDF bytes', async () => {
    await expect(parsePdf(Buffer.from('not a pdf'))).rejects.toMatchObject({
      code: 'pdf_parse_failed',
    });
    expect(() => { throw new ExtractionError('pdf_parse_failed'); }).toThrow();
  });
});
```

- [ ] **Step 11.4: 运行测试**

```bash
npm test -- tests/pdf.test.ts
```

Expected:FAIL。

- [ ] **Step 11.5: 写 `lib/extraction/pdf.ts`**

```ts
// lib/extraction/pdf.ts
import pdfParse from 'pdf-parse';
import { ExtractionError } from '../errors';

export interface ParsedPdf {
  text: string;
  numpages: number;
}

export async function parsePdf(buffer: Buffer): Promise<ParsedPdf> {
  try {
    const result = await pdfParse(buffer);
    return { text: result.text, numpages: result.numpages };
  } catch (err) {
    throw new ExtractionError('pdf_parse_failed', String(err));
  }
}
```

- [ ] **Step 11.6: 写 `lib/storage.ts`**

```ts
// lib/storage.ts
import { mkdirSync, writeFileSync, readFileSync, unlinkSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? 'data/uploads';

export function pdfPathFor(id: string): string {
  return `${UPLOADS_DIR}/${id}.pdf`;
}

export function absolutePath(p: string): string {
  return resolve(p);
}

export function writePdf(relPath: string, buffer: Buffer): void {
  const abs = absolutePath(relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, buffer);
}

export function readPdf(relPath: string): Buffer {
  return readFileSync(absolutePath(relPath));
}

export function deletePdf(relPath: string): void {
  const abs = absolutePath(relPath);
  if (existsSync(abs)) unlinkSync(abs);
}
```

- [ ] **Step 11.7: 跑测试 + commit**

```bash
npm test -- tests/pdf.test.ts
git add lib/extraction/pdf.ts lib/storage.ts tests/pdf.test.ts tests/fixtures/
git commit -m "feat(extraction): pdf parser + storage helpers"
```

---

### Task 12 · Worker `runExtraction`

**Files:**
- Create: `lib/extraction/worker.ts` · `tests/worker.test.ts`

**Steps:**

- [ ] **Step 12.1: 写测试(集成:fixture PDF + stub LLM + in-memory DB)**

```ts
// tests/worker.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtempSync } from 'node:fs';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import { candidates } from '@/lib/db/schema';

describe('runExtraction (stub LLM + fixture PDF)', () => {
  let dir: string;
  const sampleBuf = readFileSync('tests/fixtures/sample.pdf');

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'sift-worker-'));
    process.env.DATABASE_URL = join(dir, 'test.db');
    process.env.UPLOADS_DIR  = join(dir, 'uploads');
    // 重置 client.ts 的 module-level singleton 需要重置全局
    delete (globalThis as any).__sqlite;
  });

  it('parses fixture PDF and writes flat fields + extracted_json', async () => {
    // setup DB
    const sqlite = new Database(process.env.DATABASE_URL!);
    sqlite.pragma('journal_mode = WAL');
    const db = drizzle(sqlite);
    migrate(db, { migrationsFolder: './lib/db/migrations' });

    // put fixture where storage expects
    mkdirSync(process.env.UPLOADS_DIR!, { recursive: true });
    writeFileSync(join(process.env.UPLOADS_DIR!, 'test123.pdf'), sampleBuf);

    const now = new Date();
    db.insert(candidates).values({
      id: 'test123',
      pdfPath: `${process.env.UPLOADS_DIR}/test123.pdf`,
      pdfSize: sampleBuf.length,
      createdAt: now, updatedAt: now,
    }).run();
    sqlite.close();

    // run
    const { runExtraction } = await import('@/lib/extraction/worker');
    await runExtraction('test123');

    // assert
    const sqlite2 = new Database(process.env.DATABASE_URL!);
    const row = drizzle(sqlite2).select().from(candidates).where(eq(candidates.id, 'test123')).get();
    expect(row?.extractionStatus).toBe('parsed');
    expect(row?.name).toBe('张远哲');               // from STUB_RESULT
    expect(Array.isArray(row?.skills)).toBe(true);
    expect(row?.extractedJson).toBeTruthy();
    expect(row?.extractionAttempts).toBe(1);
    sqlite2.close();

    rmSync(dir, { recursive: true });
  });

  it('records error when PDF missing', async () => {
    const sqlite = new Database(process.env.DATABASE_URL!);
    const db = drizzle(sqlite);
    migrate(db, { migrationsFolder: './lib/db/migrations' });

    const now = new Date();
    db.insert(candidates).values({
      id: 'missing1',
      pdfPath: `${process.env.UPLOADS_DIR}/does-not-exist.pdf`,
      pdfSize: 0,
      createdAt: now, updatedAt: now,
    }).run();
    sqlite.close();

    const { runExtraction } = await import('@/lib/extraction/worker');
    await runExtraction('missing1');

    const sqlite2 = new Database(process.env.DATABASE_URL!);
    const row = drizzle(sqlite2).select().from(candidates).where(eq(candidates.id, 'missing1')).get();
    expect(row?.extractionStatus).toBe('error');
    expect(row?.extractionError).toBeTruthy();
    sqlite2.close();
  });
});
```

- [ ] **Step 12.2: 运行测试验证失败**

```bash
npm test -- tests/worker.test.ts
```

- [ ] **Step 12.3: 写 `lib/extraction/worker.ts`**

```ts
// lib/extraction/worker.ts
import { sql, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { candidates } from '../db/schema';
import { readPdf } from '../storage';
import { parsePdf } from './pdf';
import { callDeepSeek } from './llm';
import { ExtractedResume } from '../validation';
import { ExtractionError, toUserMessage } from '../errors';
import { deriveFlat } from './derive';

export async function runExtraction(id: string): Promise<void> {
  const row = db.select().from(candidates).where(eq(candidates.id, id)).get();
  if (!row || row.extractionStatus === 'parsed') return;

  const now = new Date();
  db.update(candidates).set({
    extractionStatus: 'extracting',
    extractionAttempts: sql`extraction_attempts + 1`,
    updatedAt: now,
  }).where(eq(candidates.id, id)).run();

  try {
    const buf = readPdf(row.pdfPath);
    const { text, numpages } = await parsePdf(buf);
    if (!text.trim()) throw new ExtractionError('pdf_empty');

    const raw = await callDeepSeek(text);
    const parsed = ExtractedResume.parse(raw);
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

- [ ] **Step 12.4: 跑测试 + commit**

```bash
npm test -- tests/worker.test.ts
git add lib/extraction/worker.ts tests/worker.test.ts
git commit -m "feat(extraction): runExtraction worker with error handling"
```

---

### Task 13 · 提取队列 + 启动恢复

**Files:**
- Create: `lib/extraction/queue.ts` · `tests/queue.test.ts`

**Steps:**

- [ ] **Step 13.1: 写测试**

```ts
// tests/queue.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import { candidates } from '@/lib/db/schema';

describe('extraction queue', () => {
  let dir: string;
  const sampleBuf = readFileSync('tests/fixtures/sample.pdf');

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'sift-queue-'));
    process.env.DATABASE_URL = join(dir, 'test.db');
    process.env.UPLOADS_DIR  = join(dir, 'uploads');
    delete (globalThis as any).__sqlite;
    delete (globalThis as any).__queueInit;
  });

  it('processes a queued candidate end-to-end', async () => {
    const sqlite = new Database(process.env.DATABASE_URL!);
    sqlite.pragma('journal_mode = WAL');
    const db = drizzle(sqlite);
    migrate(db, { migrationsFolder: './lib/db/migrations' });

    mkdirSync(process.env.UPLOADS_DIR!, { recursive: true });
    writeFileSync(join(process.env.UPLOADS_DIR!, 'q1.pdf'), sampleBuf);

    const now = new Date();
    db.insert(candidates).values({
      id: 'q1',
      pdfPath: `${process.env.UPLOADS_DIR}/q1.pdf`,
      pdfSize: sampleBuf.length,
      createdAt: now, updatedAt: now,
    }).run();
    sqlite.close();

    const { queue, enqueueExtraction } = await import('@/lib/extraction/queue');
    enqueueExtraction('q1');
    await queue.onIdle();

    const s = new Database(process.env.DATABASE_URL!);
    const row = drizzle(s).select().from(candidates).where(eq(candidates.id, 'q1')).get();
    expect(row?.extractionStatus).toBe('parsed');
    s.close();
    rmSync(dir, { recursive: true });
  });

  it('startup scan resets extracting → uploaded and resumes', async () => {
    const sqlite = new Database(process.env.DATABASE_URL!);
    sqlite.pragma('journal_mode = WAL');
    const db = drizzle(sqlite);
    migrate(db, { migrationsFolder: './lib/db/migrations' });

    mkdirSync(process.env.UPLOADS_DIR!, { recursive: true });
    writeFileSync(join(process.env.UPLOADS_DIR!, 'stuck1.pdf'), sampleBuf);

    const now = new Date();
    db.insert(candidates).values({
      id: 'stuck1',
      pdfPath: `${process.env.UPLOADS_DIR}/stuck1.pdf`,
      pdfSize: sampleBuf.length,
      extractionStatus: 'extracting',   // 模拟进程崩溃残留
      createdAt: now, updatedAt: now,
    }).run();
    sqlite.close();

    // 导入 queue.ts 会触发启动扫描
    const { queue } = await import('@/lib/extraction/queue');
    await queue.onIdle();

    const s = new Database(process.env.DATABASE_URL!);
    const row = drizzle(s).select().from(candidates).where(eq(candidates.id, 'stuck1')).get();
    expect(row?.extractionStatus).toBe('parsed');
    s.close();
  });
});
```

注意:测试里的动态 `import('@/lib/extraction/queue')` 要求 vitest 每次用独立模块图。vitest 默认已隔离 test file,但同一 test file 的多个 it 如果共享已导入的 queue 会失败。**解决方式**:给每个 it 单独的测试文件,或用 `vi.resetModules()`。下面实现使用 `vi.resetModules()` 和 `vi.importActual()` 方式 — 改测试。

**Step 13.1 改写(加 `vi.resetModules()`):**

```ts
// tests/queue.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
// ... (同上 imports)

describe('extraction queue', () => {
  let dir: string;
  const sampleBuf = readFileSync('tests/fixtures/sample.pdf');

  beforeEach(() => {
    vi.resetModules();  // 让每次 import 都触发新的启动扫描
    dir = mkdtempSync(join(tmpdir(), 'sift-queue-'));
    process.env.DATABASE_URL = join(dir, 'test.db');
    process.env.UPLOADS_DIR  = join(dir, 'uploads');
    delete (globalThis as any).__sqlite;
    delete (globalThis as any).__queueInit;
  });
  // ... (同上两个 it)
});
```

- [ ] **Step 13.2: 运行测试**

```bash
npm test -- tests/queue.test.ts
```

Expected:FAIL。

- [ ] **Step 13.3: 写 `lib/extraction/queue.ts`**

```ts
// lib/extraction/queue.ts
import PQueue from 'p-queue';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { candidates } from '../db/schema';
import { runExtraction } from './worker';

export const queue = new PQueue({ concurrency: 1 });

declare global {
  var __queueInit: boolean | undefined;
}

function initOnce() {
  if (globalThis.__queueInit) return;
  globalThis.__queueInit = true;

  // 重置残留 extracting(进程重启)
  db.update(candidates)
    .set({ extractionStatus: 'uploaded' })
    .where(eq(candidates.extractionStatus, 'extracting'))
    .run();

  // 把所有 uploaded 重新入队
  const pending = db.select({ id: candidates.id })
    .from(candidates)
    .where(eq(candidates.extractionStatus, 'uploaded'))
    .all();

  for (const p of pending) enqueueExtraction(p.id);
}

export function enqueueExtraction(id: string): void {
  queue.add(() => runExtraction(id));
}

initOnce();
```

- [ ] **Step 13.4: 跑测试 + commit**

```bash
npm test -- tests/queue.test.ts
git add lib/extraction/queue.ts tests/queue.test.ts
git commit -m "feat(extraction): p-queue + startup recovery"
```

---

## Phase 6 · API 路由

### Task 14 · `POST /api/upload`

**Files:**
- Create: `app/api/upload/route.ts` · `tests/api-upload.test.ts`

**Steps:**

- [ ] **Step 14.1: 写测试**

```ts
// tests/api-upload.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { candidates } from '@/lib/db/schema';

describe('POST /api/upload', () => {
  let dir: string;
  const sampleBuf = readFileSync('tests/fixtures/sample.pdf');

  beforeEach(() => {
    vi.resetModules();
    dir = mkdtempSync(join(tmpdir(), 'sift-upload-'));
    process.env.DATABASE_URL = join(dir, 'test.db');
    process.env.UPLOADS_DIR  = join(dir, 'uploads');
    delete (globalThis as any).__sqlite;
    delete (globalThis as any).__queueInit;

    const sqlite = new Database(process.env.DATABASE_URL);
    sqlite.pragma('journal_mode = WAL');
    migrate(drizzle(sqlite), { migrationsFolder: './lib/db/migrations' });
    sqlite.close();
  });

  it('accepts a valid PDF, stores row, enqueues', async () => {
    const { POST } = await import('@/app/api/upload/route');
    const form = new FormData();
    form.append('file', new File([sampleBuf], 'resume.pdf', { type: 'application/pdf' }));
    const req = new Request('http://test/api/upload', { method: 'POST', body: form });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toMatch(/^[A-Za-z0-9_-]{12}$/);
    expect(body.extractionStatus).toBe('uploaded');

    // DB 里存在行
    const s = new Database(process.env.DATABASE_URL!);
    const rows = drizzle(s).select().from(candidates).all();
    s.close();
    expect(rows).toHaveLength(1);
    expect(rows[0].pdfSize).toBe(sampleBuf.length);
  });

  it('rejects non-PDF with 415', async () => {
    const { POST } = await import('@/app/api/upload/route');
    const form = new FormData();
    form.append('file', new File([Buffer.from('not a pdf')], 'x.txt', { type: 'text/plain' }));
    const req = new Request('http://test/api/upload', { method: 'POST', body: form });
    const res = await POST(req);
    expect(res.status).toBe(415);
  });

  it('rejects > 10MB with 413', async () => {
    const big = Buffer.alloc(10 * 1024 * 1024 + 1);
    big.write('%PDF-'); // 假装是 pdf
    const { POST } = await import('@/app/api/upload/route');
    const form = new FormData();
    form.append('file', new File([big], 'huge.pdf', { type: 'application/pdf' }));
    const req = new Request('http://test/api/upload', { method: 'POST', body: form });
    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  it('rejects missing file with 400', async () => {
    const { POST } = await import('@/app/api/upload/route');
    const form = new FormData();
    const req = new Request('http://test/api/upload', { method: 'POST', body: form });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 14.2: 运行测试**

```bash
npm test -- tests/api-upload.test.ts
```

Expected:FAIL。

- [ ] **Step 14.3: 写 `app/api/upload/route.ts`**

```ts
// app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db/client';
import { candidates } from '@/lib/db/schema';
import { writePdf, pdfPathFor } from '@/lib/storage';
import { enqueueExtraction } from '@/lib/extraction/queue';

const MAX_BYTES = 10 * 1024 * 1024;
const PDF_MAGIC = Buffer.from('%PDF-', 'utf8');

export async function POST(req: Request) {
  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: 'invalid_form' }, { status: 400 }); }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'missing_file' }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'file_too_large' }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // magic-bytes 校验比 mime 可靠
  if (!bytes.subarray(0, 5).equals(PDF_MAGIC)) {
    return NextResponse.json({ error: 'not_a_pdf' }, { status: 415 });
  }

  const id = nanoid(12);
  const path = pdfPathFor(id);
  writePdf(path, bytes);

  const now = new Date();
  db.insert(candidates).values({
    id,
    pdfPath: path,
    pdfSize: bytes.length,
    status: '待筛选',
    extractionStatus: 'uploaded',
    createdAt: now, updatedAt: now,
  }).run();

  enqueueExtraction(id);

  return NextResponse.json({ id, extractionStatus: 'uploaded' });
}
```

- [ ] **Step 14.4: 跑测试 + commit**

```bash
npm test -- tests/api-upload.test.ts
git add app/api/upload/route.ts tests/api-upload.test.ts
git commit -m "feat(api): POST /api/upload with validation"
```

---

### Task 15 · `GET /api/candidates`(列表)

**Files:**
- Create: `app/api/candidates/route.ts` · `tests/api-candidates-list.test.ts`

**Steps:**

- [ ] **Step 15.1: 写测试**

```ts
// tests/api-candidates-list.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { candidates } from '@/lib/db/schema';

describe('GET /api/candidates', () => {
  let dir: string;

  beforeEach(() => {
    vi.resetModules();
    dir = mkdtempSync(join(tmpdir(), 'sift-list-'));
    process.env.DATABASE_URL = join(dir, 'test.db');
    delete (globalThis as any).__sqlite;
    delete (globalThis as any).__queueInit;

    const sqlite = new Database(process.env.DATABASE_URL);
    sqlite.pragma('journal_mode = WAL');
    const d = drizzle(sqlite);
    migrate(d, { migrationsFolder: './lib/db/migrations' });

    const base = { pdfPath: 'x', pdfSize: 1, createdAt: new Date(), updatedAt: new Date() };
    d.insert(candidates).values([
      { id: 'a', name: '张', status: '初筛通过', extractionStatus: 'parsed', ...base, createdAt: new Date('2026-04-20') },
      { id: 'b', name: '林', status: '待筛选',   extractionStatus: 'parsed', ...base, createdAt: new Date('2026-04-22') },
      { id: 'c', name: '王', status: '初筛通过', extractionStatus: 'parsed', ...base, createdAt: new Date('2026-04-24') },
    ]).run();
    sqlite.close();
  });

  it('returns all by default, sorted by created_at desc', async () => {
    const { GET } = await import('@/app/api/candidates/route');
    const req = new Request('http://test/api/candidates');
    const body = await (await GET(req)).json();
    expect(body.items.map((x: any) => x.id)).toEqual(['c', 'b', 'a']);
  });

  it('filters by status', async () => {
    const { GET } = await import('@/app/api/candidates/route');
    const req = new Request('http://test/api/candidates?status=' + encodeURIComponent('初筛通过'));
    const body = await (await GET(req)).json();
    expect(body.items.map((x: any) => x.id).sort()).toEqual(['a', 'c']);
  });

  it('searches by q (name substring)', async () => {
    const { GET } = await import('@/app/api/candidates/route');
    const req = new Request('http://test/api/candidates?q=' + encodeURIComponent('林'));
    const body = await (await GET(req)).json();
    expect(body.items.map((x: any) => x.id)).toEqual(['b']);
  });

  it('sort=oldest returns ascending by created_at', async () => {
    const { GET } = await import('@/app/api/candidates/route');
    const req = new Request('http://test/api/candidates?sort=oldest');
    const body = await (await GET(req)).json();
    expect(body.items.map((x: any) => x.id)).toEqual(['a', 'b', 'c']);
  });
});
```

- [ ] **Step 15.2: 运行测试**

```bash
npm test -- tests/api-candidates-list.test.ts
```

- [ ] **Step 15.3: 写 `app/api/candidates/route.ts`**

```ts
// app/api/candidates/route.ts
import { NextResponse } from 'next/server';
import { and, desc, asc, eq, like, or, SQL } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { candidates, CANDIDATE_STATUS } from '@/lib/db/schema';

const VALID_SORTS = ['recent', 'oldest', 'name'] as const;
type SortOpt = typeof VALID_SORTS[number];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const q = url.searchParams.get('q')?.trim();
  const sortRaw = (url.searchParams.get('sort') ?? 'recent') as SortOpt;
  const sort: SortOpt = (VALID_SORTS as readonly string[]).includes(sortRaw) ? sortRaw : 'recent';

  const wheres: SQL[] = [];
  if (status && (CANDIDATE_STATUS as readonly string[]).includes(status)) {
    wheres.push(eq(candidates.status, status as any));
  }
  if (q) {
    const pat = `%${q}%`;
    wheres.push(or(
      like(candidates.name, pat),
      like(candidates.school, pat),
      like(candidates.role, pat),
    )!);
  }

  const orderBy =
    sort === 'oldest' ? asc(candidates.createdAt) :
    sort === 'name'   ? asc(candidates.name) :
                        desc(candidates.createdAt);

  const items = db.select().from(candidates)
    .where(wheres.length ? and(...wheres) : undefined)
    .orderBy(orderBy)
    .all();

  return NextResponse.json({ items });
}
```

- [ ] **Step 15.4: 跑测试 + commit**

```bash
npm test -- tests/api-candidates-list.test.ts
git add app/api/candidates/route.ts tests/api-candidates-list.test.ts
git commit -m "feat(api): GET /api/candidates with filter/sort/search"
```

---

### Task 16 · `GET / PATCH / DELETE /api/candidates/:id`

**Files:**
- Create: `app/api/candidates/[id]/route.ts` · `tests/api-candidate-crud.test.ts`

**Steps:**

- [ ] **Step 16.1: 写测试**

```ts
// tests/api-candidate-crud.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { candidates } from '@/lib/db/schema';

describe('api /candidates/:id', () => {
  let dir: string;
  const params = (id: string) => ({ params: Promise.resolve({ id }) });

  beforeEach(() => {
    vi.resetModules();
    dir = mkdtempSync(join(tmpdir(), 'sift-crud-'));
    process.env.DATABASE_URL = join(dir, 'test.db');
    process.env.UPLOADS_DIR  = join(dir, 'uploads');
    delete (globalThis as any).__sqlite;
    delete (globalThis as any).__queueInit;

    const sqlite = new Database(process.env.DATABASE_URL);
    sqlite.pragma('journal_mode = WAL');
    const d = drizzle(sqlite);
    migrate(d, { migrationsFolder: './lib/db/migrations' });

    mkdirSync(process.env.UPLOADS_DIR!, { recursive: true });
    writeFileSync(join(process.env.UPLOADS_DIR!, 'x1.pdf'), 'fake');

    d.insert(candidates).values({
      id: 'x1', name: '张', status: '待筛选', extractionStatus: 'parsed',
      pdfPath: `${process.env.UPLOADS_DIR}/x1.pdf`, pdfSize: 4,
      createdAt: new Date(), updatedAt: new Date(),
    }).run();
    sqlite.close();
  });

  it('GET returns candidate', async () => {
    const { GET } = await import('@/app/api/candidates/[id]/route');
    const res = await GET(new Request('http://t'), params('x1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('x1');
    expect(body.name).toBe('张');
  });

  it('GET 404 when not found', async () => {
    const { GET } = await import('@/app/api/candidates/[id]/route');
    const res = await GET(new Request('http://t'), params('nope'));
    expect(res.status).toBe(404);
  });

  it('PATCH updates fields', async () => {
    const { PATCH } = await import('@/app/api/candidates/[id]/route');
    const res = await PATCH(new Request('http://t', {
      method: 'PATCH',
      body: JSON.stringify({ name: '张远哲', status: '初筛通过' }),
      headers: { 'content-type': 'application/json' },
    }), params('x1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('张远哲');
    expect(body.status).toBe('初筛通过');
  });

  it('PATCH 400 on invalid body', async () => {
    const { PATCH } = await import('@/app/api/candidates/[id]/route');
    const res = await PATCH(new Request('http://t', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'invalid-value' }),
      headers: { 'content-type': 'application/json' },
    }), params('x1'));
    expect(res.status).toBe(400);
  });

  it('DELETE removes row and file', async () => {
    const { DELETE } = await import('@/app/api/candidates/[id]/route');
    const res = await DELETE(new Request('http://t'), params('x1'));
    expect(res.status).toBe(200);
    expect(existsSync(`${process.env.UPLOADS_DIR}/x1.pdf`)).toBe(false);
  });
});
```

- [ ] **Step 16.2: 运行测试**

```bash
npm test -- tests/api-candidate-crud.test.ts
```

- [ ] **Step 16.3: 写 `app/api/candidates/[id]/route.ts`**

```ts
// app/api/candidates/[id]/route.ts
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { candidates } from '@/lib/db/schema';
import { deletePdf } from '@/lib/storage';
import { PatchCandidate } from '@/lib/validation';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const row = db.select().from(candidates).where(eq(candidates.id, id)).get();
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const existing = db.select().from(candidates).where(eq(candidates.id, id)).get();
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const parsed = PatchCandidate.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });
  }

  const updated = {
    ...parsed.data,
    updatedAt: new Date(),
  };
  db.update(candidates).set(updated).where(eq(candidates.id, id)).run();

  const row = db.select().from(candidates).where(eq(candidates.id, id)).get();
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const row = db.select().from(candidates).where(eq(candidates.id, id)).get();
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  try { deletePdf(row.pdfPath); } catch (err) { console.error('unlink failed', err); }
  db.delete(candidates).where(eq(candidates.id, id)).run();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 16.4: 跑测试 + commit**

```bash
npm test -- tests/api-candidate-crud.test.ts
git add app/api/candidates/\[id\]/route.ts tests/api-candidate-crud.test.ts
git commit -m "feat(api): GET/PATCH/DELETE /api/candidates/:id"
```

---

### Task 17 · `POST /api/candidates/:id/retry`

**Files:**
- Create: `app/api/candidates/[id]/retry/route.ts` · `tests/api-candidate-retry.test.ts`

**Steps:**

- [ ] **Step 17.1: 写测试**

```ts
// tests/api-candidate-retry.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import { candidates } from '@/lib/db/schema';

describe('POST /api/candidates/:id/retry', () => {
  let dir: string;
  const params = (id: string) => ({ params: Promise.resolve({ id }) });
  const sampleBuf = readFileSync('tests/fixtures/sample.pdf');

  beforeEach(() => {
    vi.resetModules();
    dir = mkdtempSync(join(tmpdir(), 'sift-retry-'));
    process.env.DATABASE_URL = join(dir, 'test.db');
    process.env.UPLOADS_DIR  = join(dir, 'uploads');
    delete (globalThis as any).__sqlite;
    delete (globalThis as any).__queueInit;
  });

  it('resets error candidate to uploaded and re-enqueues', async () => {
    const sqlite = new Database(process.env.DATABASE_URL!);
    sqlite.pragma('journal_mode = WAL');
    const d = drizzle(sqlite);
    migrate(d, { migrationsFolder: './lib/db/migrations' });

    mkdirSync(process.env.UPLOADS_DIR!, { recursive: true });
    writeFileSync(join(process.env.UPLOADS_DIR!, 'err1.pdf'), sampleBuf);

    d.insert(candidates).values({
      id: 'err1',
      pdfPath: `${process.env.UPLOADS_DIR}/err1.pdf`,
      pdfSize: sampleBuf.length,
      extractionStatus: 'error',
      extractionError: '旧错误',
      createdAt: new Date(), updatedAt: new Date(),
    }).run();
    sqlite.close();

    const { POST } = await import('@/app/api/candidates/[id]/retry/route');
    const { queue } = await import('@/lib/extraction/queue');
    const res = await POST(new Request('http://t'), params('err1'));
    expect(res.status).toBe(200);
    await queue.onIdle();

    const s = new Database(process.env.DATABASE_URL!);
    const row = drizzle(s).select().from(candidates).where(eq(candidates.id, 'err1')).get();
    expect(row?.extractionStatus).toBe('parsed');
    expect(row?.extractionError).toBeNull();
    s.close();
  });

  it('returns 409 when not in error state', async () => {
    const sqlite = new Database(process.env.DATABASE_URL!);
    const d = drizzle(sqlite);
    migrate(d, { migrationsFolder: './lib/db/migrations' });

    d.insert(candidates).values({
      id: 'ok1',
      pdfPath: 'x', pdfSize: 1,
      extractionStatus: 'parsed',
      createdAt: new Date(), updatedAt: new Date(),
    }).run();
    sqlite.close();

    const { POST } = await import('@/app/api/candidates/[id]/retry/route');
    const res = await POST(new Request('http://t'), params('ok1'));
    expect(res.status).toBe(409);
  });
});
```

- [ ] **Step 17.2: 运行测试**

```bash
npm test -- tests/api-candidate-retry.test.ts
```

- [ ] **Step 17.3: 写 `app/api/candidates/[id]/retry/route.ts`**

```ts
// app/api/candidates/[id]/retry/route.ts
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { candidates } from '@/lib/db/schema';
import { enqueueExtraction } from '@/lib/extraction/queue';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const row = db.select().from(candidates).where(eq(candidates.id, id)).get();
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (row.extractionStatus !== 'error') {
    return NextResponse.json({ error: 'not_in_error_state' }, { status: 409 });
  }

  db.update(candidates).set({
    extractionStatus: 'uploaded',
    extractionError: null,
    updatedAt: new Date(),
  }).where(eq(candidates.id, id)).run();

  enqueueExtraction(id);
  return NextResponse.json({ id, extractionStatus: 'uploaded' });
}
```

- [ ] **Step 17.4: 跑测试 + commit**

```bash
npm test -- tests/api-candidate-retry.test.ts
git add app/api/candidates/\[id\]/retry/route.ts tests/api-candidate-retry.test.ts
git commit -m "feat(api): POST /api/candidates/:id/retry"
```

---

### Task 18 · `GET /api/jobs`(批量轮询)

**Files:**
- Create: `app/api/jobs/route.ts` · `tests/api-jobs.test.ts`

**Steps:**

- [ ] **Step 18.1: 写测试**

```ts
// tests/api-jobs.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { candidates } from '@/lib/db/schema';

describe('GET /api/jobs', () => {
  let dir: string;

  beforeEach(() => {
    vi.resetModules();
    dir = mkdtempSync(join(tmpdir(), 'sift-jobs-'));
    process.env.DATABASE_URL = join(dir, 'test.db');
    delete (globalThis as any).__sqlite;
    delete (globalThis as any).__queueInit;

    const sqlite = new Database(process.env.DATABASE_URL);
    const d = drizzle(sqlite);
    migrate(d, { migrationsFolder: './lib/db/migrations' });

    const base = { pdfPath: 'x', pdfSize: 1, createdAt: new Date(), updatedAt: new Date() };
    d.insert(candidates).values([
      { id: 'a', extractionStatus: 'parsed',  ...base },
      { id: 'b', extractionStatus: 'error',   extractionError: '出错了', ...base },
      { id: 'c', extractionStatus: 'uploaded', ...base },
    ]).run();
    sqlite.close();
  });

  it('returns requested ids with status and error', async () => {
    const { GET } = await import('@/app/api/jobs/route');
    const res = await GET(new Request('http://t/api/jobs?ids=a,b,c,nonexistent'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(3);
    const byId = Object.fromEntries(body.items.map((x: any) => [x.id, x]));
    expect(byId.a.extractionStatus).toBe('parsed');
    expect(byId.b.extractionStatus).toBe('error');
    expect(byId.b.extractionError).toBe('出错了');
    expect(byId.c.extractionStatus).toBe('uploaded');
  });

  it('returns empty items when ids missing', async () => {
    const { GET } = await import('@/app/api/jobs/route');
    const res = await GET(new Request('http://t/api/jobs'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toEqual([]);
  });
});
```

- [ ] **Step 18.2: 运行测试**

```bash
npm test -- tests/api-jobs.test.ts
```

- [ ] **Step 18.3: 写 `app/api/jobs/route.ts`**

```ts
// app/api/jobs/route.ts
import { NextResponse } from 'next/server';
import { inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { candidates } from '@/lib/db/schema';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get('ids')?.trim();
  if (!raw) return NextResponse.json({ items: [] });
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) return NextResponse.json({ items: [] });

  const rows = db.select({
    id: candidates.id,
    extractionStatus: candidates.extractionStatus,
    extractionError: candidates.extractionError,
  }).from(candidates).where(inArray(candidates.id, ids)).all();

  return NextResponse.json({ items: rows });
}
```

- [ ] **Step 18.4: 跑测试 + commit**

```bash
npm test -- tests/api-jobs.test.ts
git add app/api/jobs/route.ts tests/api-jobs.test.ts
git commit -m "feat(api): GET /api/jobs for polling"
```

---

## Phase 7 · 前端(组件 + 路由)

### Task 19 · 移植 icons.tsx

**Files:**
- Create: `components/icons.tsx`

**Steps:**

- [ ] **Step 19.1: 读源文件 + 拷贝**

读 `C:/Users/75467/Desktop/jianli-agent/src/components/icons.jsx`,整体拷贝到 `components/icons.tsx`。改动:

1. 顶部 `import React from 'react';` → `import type { SVGProps } from 'react';`
2. `const Icon = ({ size = 20, children, ...rest }) => (...)` → 加类型:

```tsx
type IconProps = SVGProps<SVGSVGElement> & { size?: number };
const Icon = ({ size = 20, children, ...rest }: IconProps) => ( /* ... */ );
```

3. 每个 `I.Xxx: (p) => ...` 里的 `p` 加类型 `IconProps`。

整体保留原 35 个图标 JSX 原样。

- [ ] **Step 19.2: `npx tsc --noEmit` 验证 + commit**

```bash
npx tsc --noEmit
git add components/icons.tsx
git commit -m "feat(components): port icons with TS types"
```

---

### Task 20 · 移植 ui.tsx

**Files:**
- Create: `components/ui.tsx`

**Steps:**

- [ ] **Step 20.1: 读源 + 拷贝 + 修改**

源:`C:/Users/75467/Desktop/jianli-agent/src/components/ui.jsx`。整体拷贝到 `components/ui.tsx`。改动:

1. 顶部加 `'use client';` 首行
2. `import React, { useState, useEffect } from 'react';` 保留
3. `import { Link, useLocation } from 'react-router-dom';` → `import Link from 'next/link'; import { usePathname } from 'next/navigation';`
4. `Sidebar` 的 `SIDEBAR_ITEMS` 不变,路由对比:
   ```ts
   const pathname = usePathname();
   // ...
   const isActive = item.id === active || pathname === item.to;
   ```
5. `<Link to={item.to}>` → `<Link href={item.to}>`
6. 给所有组件的 props 加类型。全部都是简单原始类型 + React 节点,无复杂泛型。具体类型如下:

```tsx
// Btn
type BtnProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactElement<{ size?: number }>;
  children?: React.ReactNode;
  style?: React.CSSProperties;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

// Badge
type BadgeProps = {
  tone?: 'neutral' | 'info' | 'warn' | 'success' | 'danger' | 'accent';
  dot?: boolean;
  children?: React.ReactNode;
};

// SkillTag
type SkillTagProps = { strong?: boolean; children?: React.ReactNode };

// StatusPill
type StatusPillProps = { status: '待筛选' | '初筛通过' | '面试中' | '已录用' | '已淘汰' };

// Avatar
type AvatarProps = { name?: string | null; size?: number };

// Card
type CardProps = {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  hover?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

// Input
type InputProps = {
  icon?: React.ReactElement<{ size?: number }>;
  style?: React.CSSProperties;
} & React.InputHTMLAttributes<HTMLInputElement>;

// ScoreRing
type ScoreRingProps = { score?: number; size?: number; label?: string };

// SiftLogo
type SiftLogoProps = { size?: number; showWord?: boolean };

// ThemeToggle — no props
// Sidebar
type SidebarProps = { active?: string };
// TopBar
type TopBarProps = { title: React.ReactNode; right?: React.ReactNode };
```

对应每个组件定义处加上 `: BtnProps` / `: BadgeProps` / 等。

- [ ] **Step 20.2: `npx tsc --noEmit` + commit**

```bash
npx tsc --noEmit
git add components/ui.tsx
git commit -m "feat(components): port ui with TS + Next.js routing"
```

---

### Task 21 · `useJobPoll` hook

**Files:**
- Create: `hooks/useJobPoll.ts`

**Steps:**

- [ ] **Step 21.1: 写 hook**

```ts
// hooks/useJobPoll.ts
'use client';
import { useEffect, useState } from 'react';
import type { ExtractionStatus } from '@/lib/db/schema';

export interface JobState {
  id: string;
  extractionStatus: ExtractionStatus;
  extractionError?: string | null;
}

export function useJobPoll(ids: string[], enabled = true, intervalMs = 2000) {
  const [states, setStates] = useState<Record<string, JobState>>({});

  useEffect(() => {
    if (!enabled || ids.length === 0) return;
    let alive = true;

    const tick = async () => {
      try {
        const r = await fetch(`/api/jobs?ids=${ids.join(',')}`);
        if (!r.ok) return;
        const body = (await r.json()) as { items: JobState[] };
        if (!alive) return;
        setStates((prev) => {
          const next = { ...prev };
          for (const it of body.items) next[it.id] = it;
          return next;
        });
      } catch (e) {
        // 轮询失败不阻塞
      }
    };

    tick();
    const t = setInterval(tick, intervalMs);
    return () => { alive = false; clearInterval(t); };
  }, [enabled, ids.join(','), intervalMs]);

  return states;
}
```

- [ ] **Step 21.2: Commit**

```bash
git add hooks/useJobPoll.ts
git commit -m "feat(hooks): useJobPoll"
```

---

### Task 22 · 根布局 + 顶栏 Chrome

**Files:**
- Modify: `app/layout.tsx`
- Create: `components/AppChrome.tsx`

**Steps:**

- [ ] **Step 22.1: 写 `components/AppChrome.tsx`**

```tsx
// components/AppChrome.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle, SiftLogo } from './ui';

const NAV = [
  { to: '/',           label: '落地' },
  { to: '/upload',     label: '上传' },
  { to: '/dashboard',  label: '候选人' },
  { to: '/jd',         label: 'JD 评分' },
  { to: '/compare',    label: '对比' },
  { to: '/design',     label: '设计系统' },
];

export default function AppChrome() {
  const pathname = usePathname();
  return (
    <header className="app-chrome">
      <Link href="/" className="brand">
        <SiftLogo showWord={false} size={20} />
        <span className="brand-text">Sift<span className="cjk">思筛</span></span>
      </Link>
      <span className="divider" />
      <nav>
        {NAV.map((n) => {
          const isActive = n.to === '/' ? pathname === '/' : pathname.startsWith(n.to);
          return (
            <Link key={n.to} href={n.to} className={isActive ? 'active' : ''}>
              {n.label}
            </Link>
          );
        })}
      </nav>
      <span className="spacer" />
      <ThemeToggle />
    </header>
  );
}
```

- [ ] **Step 22.2: 更新 `app/layout.tsx` 加入 Chrome**

```tsx
// app/layout.tsx
import type { Metadata } from 'next';
import AppChrome from '@/components/AppChrome';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sift · 思筛 — AI 简历筛选',
  icons: { icon: '/assets/logo-mark.svg' },
};

const THEME_INIT = `
  (function () {
    try {
      var t = localStorage.getItem('sift-theme');
      if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t;
    } catch (e) {}
  })();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        <AppChrome />
        <main className="app-shell">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 22.3: 起 dev server 验证没报错**

```bash
npm run dev
```

浏览器打开 `http://localhost:3000`,看到空壳页面但顶栏存在。Ctrl+C 关停。

- [ ] **Step 22.4: Commit**

```bash
git add app/layout.tsx components/AppChrome.tsx
git commit -m "feat(layout): root shell with Chrome nav"
```

---

## Phase 8 · 页面

### Task 23 · 落地页 + 设计系统页

**Files:**
- Create: `app/page.tsx` · `app/design/page.tsx`

**Steps:**

- [ ] **Step 23.1: 移植 Marketing**

读 `C:/Users/75467/Desktop/jianli-agent/src/pages/Marketing.jsx`,整体拷贝到 `app/page.tsx`。改动:

1. 顶部(因为 RSC 默认;Marketing 里有 `useTheme`?查源码 — Marketing 只用了 `ThemeToggle`,不直接用 useTheme。ThemeToggle 本身是 client 组件。Marketing 里没有 `useState`/`useEffect`,可以作为 RSC)。**如果 RSC 编译报错**(因为引入了 client-only 组件),加 `'use client';` 首行。
2. `import { Link } from 'react-router-dom'` → `import Link from 'next/link'`
3. `<Link to="/upload">` → `<Link href="/upload">`
4. 把 `import` 源路径从 `'../components/ui'` / `'../components/icons'` / `'../data/mock'` 改为 `@/components/ui` / `@/components/icons` / `@/data/mock`。但我们没有 `@/data/mock` — Marketing 里用了 `SAMPLE_CANDIDATES`。
5. **处理 mock 数据依赖**:Marketing 里 slice(0,3) 展示 3 张候选人卡。新项目没 mock.js。两个选择:
   - 手抄 3 个假候选人数据在 page.tsx 局部,仅落地页用。**推荐**——避免全局 mock 污染。
   - 从 DB 查真实前 3 位候选人。如果 DB 空就不展示。
6. 选推荐方案:在 page.tsx 顶部定义:
   ```ts
   const DEMO_CANDIDATES = [
     { id: 'demo1', name: '张远哲', years: 5, city: '杭州', score: 87, skills: ['React', 'TypeScript', 'Next.js'] },
     { id: 'demo2', name: '林雅婷', years: 3, city: '深圳', score: 74, skills: ['Vue', 'Node.js', 'Python'] },
     { id: 'demo3', name: '王浩然', years: 8, city: '北京', score: 93, skills: ['React', 'TypeScript', 'Rust'] },
   ];
   ```
   用它替换 `SAMPLE_CANDIDATES.slice(0, 3)`。

- [ ] **Step 23.2: 移植 DesignSystem**

源:`C:/Users/75467/Desktop/jianli-agent/src/pages/DesignSystem.jsx`,整体拷贝到 `app/design/page.tsx`。

1. 加 `'use client';` 首行(因为里面有交互,用了 ui 组件的 hover 态)
2. import 源路径:`@/components/ui` / `@/components/icons`
3. 没有其他改动。

- [ ] **Step 23.3: dev 验证 + commit**

```bash
npm run dev
```

访问 `/` 和 `/design` 看不到报错。Ctrl+C。

```bash
git add app/page.tsx app/design/page.tsx
git commit -m "feat(pages): marketing + design-system"
```

---

### Task 24 · 上传页(Client 组件)

**Files:**
- Create: `app/upload/page.tsx` · `components/UploadClient.tsx`

**Steps:**

- [ ] **Step 24.1: 写 `app/upload/page.tsx`**(RSC 壳)

```tsx
// app/upload/page.tsx
import UploadClient from '@/components/UploadClient';

export default function UploadPage() {
  return <UploadClient />;
}
```

- [ ] **Step 24.2: 写 `components/UploadClient.tsx`**

```tsx
// components/UploadClient.tsx
'use client';
import React, { useRef, useState, useMemo } from 'react';
import pLimit from 'p-limit';
import { Sidebar, TopBar, Btn, Badge, Card } from './ui';
import { I } from './icons';
import { useJobPoll } from '@/hooks/useJobPoll';

type UploadItem = {
  key: string;             // 客户端临时 key
  file: File;
  id?: string;             // 服务端返回的 candidate id
  status: 'queued' | 'uploading' | 'uploaded' | 'extracting' | 'parsed' | 'error';
  progress: number;
  error?: string;
};

const STATUS_META: Record<UploadItem['status'], { label: string; tone: 'neutral'|'info'|'accent'|'success'|'danger' }> = {
  queued:     { label: '排队中',    tone: 'neutral' },
  uploading:  { label: '上传中',    tone: 'info' },
  uploaded:   { label: '等待解析', tone: 'neutral' },
  extracting: { label: 'AI 解析中', tone: 'accent' },
  parsed:     { label: '已完成',    tone: 'success' },
  error:      { label: '解析失败', tone: 'danger' },
};

const limiter = pLimit(5);

export default function UploadClient() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const pollIds = useMemo(() =>
    items.filter((it) => it.id && (it.status === 'uploaded' || it.status === 'extracting')).map((it) => it.id!),
    [items]
  );
  const polled = useJobPoll(pollIds, pollIds.length > 0);

  React.useEffect(() => {
    setItems((prev) => prev.map((it) => {
      if (!it.id || !polled[it.id]) return it;
      const s = polled[it.id];
      if (s.extractionStatus === it.status) return it;
      return {
        ...it,
        status: s.extractionStatus,
        error: s.extractionError ?? undefined,
      };
    }));
  }, [polled]);

  function onPick(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files);
    const existing = items.length;
    if (existing + arr.length > 20) {
      alert(`一次最多 20 份,已阻止第 ${20 - existing + 1} 份起。`);
      arr.splice(20 - existing);
    }
    const newItems: UploadItem[] = arr.map((f) => ({
      key: `${Date.now()}-${Math.random()}`,
      file: f,
      status: 'queued',
      progress: 0,
    }));
    setItems((prev) => [...prev, ...newItems]);
    newItems.forEach((it) => limiter(() => uploadOne(it)));
  }

  function uploadOne(item: UploadItem) {
    return new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload');
      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        setItems((prev) => prev.map((i) => i.key === item.key
          ? { ...i, status: 'uploading', progress: Math.round((e.loaded / e.total) * 100) }
          : i));
      };
      xhr.onload = () => {
        if (xhr.status === 200) {
          const body = JSON.parse(xhr.responseText);
          setItems((prev) => prev.map((i) => i.key === item.key
            ? { ...i, id: body.id, status: 'uploaded', progress: 100 }
            : i));
        } else {
          setItems((prev) => prev.map((i) => i.key === item.key
            ? { ...i, status: 'error', error: `上传失败 (HTTP ${xhr.status})` }
            : i));
        }
        resolve();
      };
      xhr.onerror = () => {
        setItems((prev) => prev.map((i) => i.key === item.key
          ? { ...i, status: 'error', error: '网络错误' }
          : i));
        resolve();
      };
      const form = new FormData();
      form.append('file', item.file);
      xhr.send(form);
    });
  }

  async function retry(item: UploadItem) {
    if (!item.id) return;
    const r = await fetch(`/api/candidates/${item.id}/retry`, { method: 'POST' });
    if (r.ok) {
      setItems((prev) => prev.map((i) => i.key === item.key ? { ...i, status: 'uploaded', error: undefined } : i));
    }
  }

  const [dragging, setDragging] = useState(false);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 44px)', background: 'var(--bg-sunken)' }}>
      <Sidebar active="upload" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar title="上传与解析" />
        <div style={{ padding: '24px 32px', flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1080, margin: '0 auto', width: '100%' }}>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); onPick(e.dataTransfer.files); }}
            style={{
              border: '2px dashed ' + (dragging ? 'var(--accent-500)' : 'var(--border-strong)'),
              background: dragging ? 'var(--accent-bg-subtle)' : 'var(--bg-elevated)',
              borderRadius: 16, padding: '40px 24px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              transition: 'all var(--dur-base) var(--ease-sift)',
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: dragging ? 'var(--accent-500)' : 'var(--accent-bg-subtle)',
              color: dragging ? 'white' : 'var(--accent-500)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <I.Upload size={24} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--fg)', letterSpacing: '-0.01em' }}>
              {dragging ? '松开鼠标上传简历' : '拖拽简历到此处,或点击上传'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-subtle)' }}>支持批量 · 仅限 PDF · 单份最大 10MB · 最多 20 份</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <Btn variant="primary" icon={<I.Upload />} onClick={() => inputRef.current?.click()}>选择文件</Btn>
              <input ref={inputRef} type="file" accept="application/pdf" multiple hidden
                onChange={(e) => { onPick(e.target.files); e.target.value = ''; }} />
            </div>
          </div>

          {items.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)' }}>上传队列</span>
                  <span style={{ fontSize: 12, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {items.length} 份 · {items.filter((i) => i.status === 'parsed').length} 完成 · {items.filter((i) => i.status === 'error').length} 失败
                  </span>
                </div>
              </div>

              <Card style={{ padding: 0, overflow: 'hidden' }}>
                {items.map((it, i) => {
                  const meta = STATUS_META[it.status];
                  return (
                    <div key={it.key} style={{
                      display: 'grid', gridTemplateColumns: '1fr 200px 140px 100px 80px',
                      gap: 16, padding: '14px 18px', alignItems: 'center',
                      borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.file.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                          {Math.round(it.file.size / 1024)} KB
                        </div>
                        {it.error && <div style={{ fontSize: 11, color: 'var(--danger-700)', marginTop: 3 }}>{it.error}</div>}
                      </div>
                      <div>
                        {(it.status === 'uploading' || it.status === 'extracting') ? (
                          <div>
                            <div style={{ height: 4, background: 'var(--bg-sunken)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: it.progress + '%', background: it.status === 'extracting' ? 'var(--accent-500)' : 'var(--info-500)', borderRadius: 2 }} />
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>{it.progress}%</div>
                          </div>
                        ) : null}
                      </div>
                      <div><Badge tone={meta.tone} dot>{meta.label}</Badge></div>
                      <div style={{ fontSize: 12, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}>
                        {it.status === 'parsed' ? '完成' : '—'}
                      </div>
                      <div>
                        {it.status === 'error' && (
                          <Btn size="sm" onClick={() => retry(it)}>重试</Btn>
                        )}
                      </div>
                    </div>
                  );
                })}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 24.3: dev 验证 + commit**

```bash
npm run dev
```

打开 `/upload`,看到拖放区可用。Ctrl+C。

```bash
git add app/upload/page.tsx components/UploadClient.tsx
git commit -m "feat(pages): upload with XHR + p-limit + polling"
```

---

### Task 25 · Dashboard(RSC + Client 包装)

**Files:**
- Create: `app/dashboard/page.tsx` · `components/DashboardClient.tsx`

**Steps:**

- [ ] **Step 25.1: 写 `app/dashboard/page.tsx`**(RSC)

```tsx
// app/dashboard/page.tsx
import { desc } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { candidates } from '@/lib/db/schema';
import DashboardClient from '@/components/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const items = db.select().from(candidates).orderBy(desc(candidates.createdAt)).all();
  return <DashboardClient initial={items} />;
}
```

- [ ] **Step 25.2: 写 `components/DashboardClient.tsx`**

基于 `jianli-agent/src/pages/Dashboard.jsx` 改写:

1. 顶部 `'use client';`
2. 接 props `{ initial: Candidate[] }` 替代 mock 数据
3. 路由 `Link` 换成 `next/link`,`<Link href={`/candidates/${c.id}`}>` 给行/卡片加跳转
4. 轮询未终态候选人状态:
   ```ts
   const pollIds = useMemo(() => initial.filter(c => c.extractionStatus !== 'parsed' && c.extractionStatus !== 'error').map(c => c.id), [initial]);
   const polled = useJobPoll(pollIds, pollIds.length > 0);
   ```
   把 polled 状态 merge 到显示里。
5. 删掉原 `sort` 的"评分"选项,只留 `recent / oldest / name`
6. 删掉 `selected.size >= 2` 条件下的「对比 N」按钮(对比是后续子项目)
7. 其余视觉逻辑保留

核心代码:

```tsx
'use client';
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar, TopBar, Btn, Card, Input, Avatar, SkillTag, StatusPill } from './ui';
import { I } from './icons';
import { useJobPoll } from '@/hooks/useJobPoll';
import type { Candidate } from '@/lib/db/schema';

const STATUS_TABS = ['全部', '待筛选', '初筛通过', '面试中', '已录用', '已淘汰'] as const;

type SortOpt = 'recent' | 'oldest' | 'name';

export default function DashboardClient({ initial }: { initial: Candidate[] }) {
  const [view, setView] = useState<'table' | 'card'>('table');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('全部');
  const [sort, setSort] = useState<SortOpt>('recent');
  const [rows, setRows] = useState(initial);

  const pendingIds = useMemo(
    () => rows.filter((r) => r.extractionStatus !== 'parsed' && r.extractionStatus !== 'error').map((r) => r.id),
    [rows]
  );
  const polled = useJobPoll(pendingIds, pendingIds.length > 0);

  useEffect(() => {
    // 当任一候选人 status 改变,重新拉列表
    setRows((prev) => prev.map((r) => {
      const p = polled[r.id];
      if (!p || p.extractionStatus === r.extractionStatus) return r;
      return { ...r, extractionStatus: p.extractionStatus, extractionError: p.extractionError ?? null };
    }));
  }, [polled]);

  const filtered = useMemo(() => {
    let list = rows;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        (c.name ?? '').includes(search) ||
        (c.role ?? '').includes(search) ||
        (c.school ?? '').includes(search) ||
        (c.skills ?? []).some((s) => s.toLowerCase().includes(q))
      );
    }
    if (statusFilter !== '全部') list = list.filter((c) => c.status === statusFilter);
    list = [...list].sort((a, b) => {
      if (sort === 'recent') return b.createdAt.getTime() - a.createdAt.getTime();
      if (sort === 'oldest') return a.createdAt.getTime() - b.createdAt.getTime();
      return (a.name ?? '').localeCompare(b.name ?? '');
    });
    return list;
  }, [rows, search, statusFilter, sort]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { 全部: rows.length };
    for (const s of STATUS_TABS.slice(1)) c[s] = rows.filter((x) => x.status === s).length;
    return c;
  }, [rows]);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 44px)', background: 'var(--bg-sunken)' }}>
      <Sidebar active="dashboard" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar
          title="候选人"
          right={<Btn variant="primary" size="sm" icon={<I.Plus />} onClick={() => (window.location.href = '/upload')}>上传简历</Btn>}
        />
        <div style={{ padding: '20px 24px', flex: 1, overflow: 'auto' }}>
          {/* Pipeline strip */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {STATUS_TABS.map((s) => {
              const active = statusFilter === s;
              return (
                <button key={s} type="button" onClick={() => setStatusFilter(s)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '8px 14px', borderRadius: 8,
                    border: '1px solid ' + (active ? 'var(--accent-300)' : 'var(--border)'),
                    background: active ? 'var(--accent-bg-subtle)' : 'var(--bg-elevated)',
                    color: active ? 'var(--accent-700)' : 'var(--fg)',
                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  }}>
                  <span>{s}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: active ? 'var(--accent-600)' : 'var(--fg-subtle)' }}>{counts[s] ?? 0}</span>
                </button>
              );
            })}
          </div>

          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <div style={{ flex: 1, maxWidth: 360 }}>
              <Input icon={<I.Search />} placeholder="搜索姓名、技能、学校…" value={search} onChange={(e: any) => setSearch(e.target.value)} />
            </div>
            <Btn icon={<I.Sort />} size="md" onClick={() => setSort(sort === 'recent' ? 'oldest' : sort === 'oldest' ? 'name' : 'recent')}>
              {sort === 'recent' ? '最近上传' : sort === 'oldest' ? '最早上传' : '姓名 A→Z'}
            </Btn>
            <div style={{
              marginLeft: 'auto', display: 'flex', gap: 2, padding: 2,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8,
            }}>
              <button type="button" onClick={() => setView('table')} style={{ width: 32, height: 28, borderRadius: 6, border: 'none', background: view === 'table' ? 'var(--bg-sunken)' : 'transparent', color: 'var(--fg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <I.List size={16} />
              </button>
              <button type="button" onClick={() => setView('card')} style={{ width: 32, height: 28, borderRadius: 6, border: 'none', background: view === 'card' ? 'var(--bg-sunken)' : 'transparent', color: 'var(--fg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <I.Grid size={16} />
              </button>
            </div>
          </div>

          {/* Table / Card view */}
          {view === 'table' ? (
            <Card style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-sunken)' }}>
                    {['候选人', '目标岗位', '技能', '学校', '状态', '更新'].map((h) => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--fg-subtle)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                      onClick={() => (window.location.href = `/candidates/${c.id}`)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={c.name ?? '?'} size={32} />
                          <div>
                            <div style={{ fontWeight: 500, color: 'var(--fg)' }}>{c.name ?? '(未提取)'}</div>
                            <div style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>{c.city ?? ''} {c.email ? `· ${c.email}` : ''}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--fg)' }}>{c.role ?? '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 200 }}>
                          {(c.skills ?? []).slice(0, 3).map((s) => <SkillTag key={s}>{s}</SkillTag>)}
                          {(c.skills?.length ?? 0) > 3 && <span style={{ fontSize: 11, color: 'var(--fg-subtle)', alignSelf: 'center' }}>+{(c.skills?.length ?? 0) - 3}</span>}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--fg-muted)', fontSize: 12 }}>{c.school ?? '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {c.extractionStatus === 'parsed' ? <StatusPill status={c.status} /> :
                         c.extractionStatus === 'error' ? <StatusPill status="已淘汰" /> :
                         <span style={{ fontSize: 12, color: 'var(--accent-700)' }}>{c.extractionStatus === 'extracting' ? 'AI 解析中' : '等待解析'}</span>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--fg-subtle)' }}>{c.updatedAt.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {filtered.map((c) => (
                <Link key={c.id} href={`/candidates/${c.id}`} style={{ textDecoration: 'none' }}>
                  <Card style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <Avatar name={c.name ?? '?'} size={40} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{c.name ?? '(未提取)'}</div>
                        <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginTop: 2 }}>{c.role ?? '—'}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {(c.skills ?? []).slice(0, 4).map((s) => <SkillTag key={s}>{s}</SkillTag>)}
                    </div>
                    <div style={{ paddingTop: 10, borderTop: '1px dashed var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                      {c.extractionStatus === 'parsed' ? <StatusPill status={c.status} /> : <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>{c.extractionStatus === 'extracting' ? 'AI 解析中' : '等待解析'}</span>}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {filtered.length === 0 && (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--fg-subtle)' }}>
              还没有候选人。前往<Link href="/upload" style={{ color: 'var(--accent)', textDecoration: 'none', margin: '0 4px' }}>上传</Link>开始。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 25.3: dev 验证 + commit**

```bash
npm run dev
```

访问 `/dashboard`,看到空状态("还没有候选人")。Ctrl+C。

```bash
git add app/dashboard/page.tsx components/DashboardClient.tsx
git commit -m "feat(pages): dashboard with RSC + Client filter/poll"
```

---

### Task 26 · 候选人详情

**Files:**
- Create: `app/candidates/[id]/page.tsx` · `components/CandidateDetailClient.tsx`

**Steps:**

- [ ] **Step 26.1: 写 `app/candidates/[id]/page.tsx`**(RSC)

```tsx
// app/candidates/[id]/page.tsx
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { candidates } from '@/lib/db/schema';
import CandidateDetailClient from '@/components/CandidateDetailClient';

export const dynamic = 'force-dynamic';

export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = db.select().from(candidates).where(eq(candidates.id, id)).get();
  if (!row) notFound();
  return <CandidateDetailClient initial={row} />;
}
```

- [ ] **Step 26.2: 写 `components/CandidateDetailClient.tsx`**

基于 `jianli-agent/src/pages/Detail.jsx` 改写:

1. `'use client';`
2. 接 `{ initial: Candidate }` prop
3. 删除 `ScoreRing` 相关(无 score)
4. 详情页显示 loading 状态:`extractionStatus !== 'parsed'` 时显示"AI 解析中…"占位
5. 推进状态("推进到面试" / "标记为不合适")调 PATCH:
   ```ts
   async function updateStatus(next: CandidateStatus) {
     const r = await fetch(`/api/candidates/${row.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: next }) });
     if (r.ok) setRow(await r.json());
   }
   ```
6. 轮询 parsing 中的候选人:`useJobPoll([id], extractionStatus !== 'parsed')`
7. 删除 Compare 相关链接
8. 返回 Dashboard:`router.push('/dashboard')`

```tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar, Btn, Avatar, StatusPill, Card, SkillTag, ThemeToggle } from './ui';
import { I } from './icons';
import { useJobPoll } from '@/hooks/useJobPoll';
import type { Candidate, CandidateStatus } from '@/lib/db/schema';

export default function CandidateDetailClient({ initial }: { initial: Candidate }) {
  const router = useRouter();
  const [c, setC] = useState(initial);
  const pendingIds = c.extractionStatus === 'parsed' || c.extractionStatus === 'error' ? [] : [c.id];
  const polled = useJobPoll(pendingIds, pendingIds.length > 0);

  useEffect(() => {
    if (polled[c.id] && polled[c.id].extractionStatus !== c.extractionStatus) {
      // 解析完成,拉最新数据
      fetch(`/api/candidates/${c.id}`).then((r) => r.json()).then(setC);
    }
  }, [polled, c.id, c.extractionStatus]);

  async function updateStatus(next: CandidateStatus) {
    const r = await fetch(`/api/candidates/${c.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    if (r.ok) setC(await r.json());
  }

  async function onDelete() {
    if (!confirm(`确认删除候选人「${c.name ?? c.id}」?`)) return;
    const r = await fetch(`/api/candidates/${c.id}`, { method: 'DELETE' });
    if (r.ok) router.push('/dashboard');
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 44px)', background: 'var(--bg-sunken)' }}>
      <Sidebar active="dashboard" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ height: 56, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12, background: 'var(--bg)' }}>
          <Btn size="sm" icon={<I.ChevL />} variant="ghost" onClick={() => router.push('/dashboard')}>返回</Btn>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>候选人 · {c.name ?? c.id}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Link href={`/candidates/${c.id}/edit`}><Btn size="sm" icon={<I.Edit />}>编辑</Btn></Link>
            <Btn size="sm" variant="danger" onClick={onDelete}>删除</Btn>
            <ThemeToggle />
          </div>
        </div>

        <div style={{ padding: '24px 32px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 20, alignItems: 'center' }}>
          <Avatar name={c.name ?? '?'} size={64} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--fg)', margin: 0 }}>{c.name ?? '(未提取)'}</h1>
              {c.extractionStatus === 'parsed' && <StatusPill status={c.status} />}
            </div>
            {c.extractionStatus === 'parsed' && (
              <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 13, color: 'var(--fg-muted)', flexWrap: 'wrap' }}>
                {c.role && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><I.Briefcase size={13} />{c.role}</span>}
                {c.city && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><I.MapPin size={13} />{c.city}</span>}
                {c.email && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><I.Mail size={13} />{c.email}</span>}
                {c.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><I.Phone size={13} />{c.phone}</span>}
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
          {c.extractionStatus === 'extracting' || c.extractionStatus === 'uploaded' ? (
            <Card style={{ padding: 40, textAlign: 'center', color: 'var(--fg-subtle)' }}>
              <I.Sparkles size={24} style={{ color: 'var(--accent)', margin: '0 auto 10px' }} />
              <div style={{ fontSize: 15, color: 'var(--fg)', fontWeight: 500, marginBottom: 4 }}>AI 正在解析…</div>
              <div style={{ fontSize: 13 }}>此页面会自动刷新,无需操作</div>
            </Card>
          ) : c.extractionStatus === 'error' ? (
            <Card style={{ padding: 32 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--danger-700)', marginBottom: 10 }}>解析失败</div>
              <div style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.6 }}>{c.extractionError ?? '未知错误'}</div>
              <div style={{ marginTop: 16 }}>
                <Btn variant="primary" onClick={async () => {
                  const r = await fetch(`/api/candidates/${c.id}/retry`, { method: 'POST' });
                  if (r.ok) {
                    const fresh = await (await fetch(`/api/candidates/${c.id}`)).json();
                    setC(fresh);
                  }
                }}>重试</Btn>
              </div>
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 1200 }}>
              <Card style={{ padding: 18, gridColumn: 'span 2' }}>
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500, marginBottom: 10 }}>AI 评语</div>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--fg)', margin: 0 }}>{c.summary ?? '无'}</p>
              </Card>
              <Card style={{ padding: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>工作经历(最新)</div>
                <div style={{ paddingLeft: 12, borderLeft: '2px solid var(--accent-300)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.company ?? '—'} · {c.role ?? '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginTop: 2 }}>{c.years ?? '—'} 年</div>
                </div>
              </Card>
              <Card style={{ padding: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>教育背景</div>
                <div style={{ paddingLeft: 12, borderLeft: '2px solid var(--info-300)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.school ?? '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{c.major ?? '—'} · {c.degree ?? '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginTop: 2 }}>毕业 {c.gradYear ?? '—'}</div>
                </div>
              </Card>
              <Card style={{ padding: 18, gridColumn: 'span 2' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>技能</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(c.skills ?? []).map((s) => <SkillTag key={s}>{s}</SkillTag>)}
                </div>
              </Card>
              <Card style={{ padding: 18, gridColumn: 'span 2' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>状态流转</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(['待筛选', '初筛通过', '面试中', '已录用', '已淘汰'] as const).map((s) => (
                    <Btn key={s} variant={c.status === s ? 'primary' : 'secondary'} onClick={() => updateStatus(s)}>{s}</Btn>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 26.3: dev 验证 + commit**

```bash
npm run dev
```

因为还没数据,访问 `/candidates/nonexistent` 应看到 Next.js not found 页面。Ctrl+C。

```bash
git add app/candidates/\[id\]/page.tsx components/CandidateDetailClient.tsx
git commit -m "feat(pages): candidate detail with status actions"
```

---

### Task 27 · 候选人编辑页

**Files:**
- Create: `app/candidates/[id]/edit/page.tsx` · `components/CandidateEditClient.tsx`

**Steps:**

- [ ] **Step 27.1: 写 `app/candidates/[id]/edit/page.tsx`**

```tsx
// app/candidates/[id]/edit/page.tsx
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { candidates } from '@/lib/db/schema';
import CandidateEditClient from '@/components/CandidateEditClient';

export const dynamic = 'force-dynamic';

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = db.select().from(candidates).where(eq(candidates.id, id)).get();
  if (!row) notFound();
  return <CandidateEditClient initial={row} />;
}
```

- [ ] **Step 27.2: 写 `components/CandidateEditClient.tsx`**

```tsx
// components/CandidateEditClient.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar, Btn, Input, Card, Avatar } from './ui';
import { I } from './icons';
import type { Candidate } from '@/lib/db/schema';

export default function CandidateEditClient({ initial }: { initial: Candidate }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name:     initial.name ?? '',
    email:    initial.email ?? '',
    phone:    initial.phone ?? '',
    city:     initial.city ?? '',
    role:     initial.role ?? '',
    company:  initial.company ?? '',
    years:    initial.years ?? 0,
    school:   initial.school ?? '',
    major:    initial.major ?? '',
    degree:   initial.degree ?? '',
    gradYear: initial.gradYear ?? 0,
    skills:   (initial.skills ?? []).join(', '),
    summary:  initial.summary ?? '',
  });
  const [saving, setSaving] = useState(false);

  const setField = (k: keyof typeof form) => (e: any) => setForm({ ...form, [k]: e.target.value });

  async function save() {
    setSaving(true);
    const body = {
      ...form,
      name:  form.name  || null,
      email: form.email || null,
      phone: form.phone || null,
      city:  form.city  || null,
      role:  form.role  || null,
      company: form.company || null,
      years: Number(form.years) || null,
      school: form.school || null,
      major:  form.major  || null,
      degree: form.degree || null,
      gradYear: Number(form.gradYear) || null,
      skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
      summary: form.summary,
    };
    const r = await fetch(`/api/candidates/${initial.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (r.ok) router.push(`/candidates/${initial.id}`);
    else alert(`保存失败 (HTTP ${r.status})`);
  }

  const labelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500, marginBottom: 6 };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 44px)', background: 'var(--bg-sunken)' }}>
      <Sidebar active="dashboard" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ height: 56, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12, background: 'var(--bg)' }}>
          <Btn size="sm" icon={<I.ChevL />} variant="ghost" onClick={() => router.push(`/candidates/${initial.id}`)}>返回详情</Btn>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Btn size="sm" onClick={() => router.push(`/candidates/${initial.id}`)}>取消</Btn>
            <Btn size="sm" variant="primary" icon={<I.Check />} onClick={save} disabled={saving}>{saving ? '保存中…' : '保存'}</Btn>
          </div>
        </div>

        <div style={{ padding: 24, flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 900, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar name={form.name || '?'} size={48} />
            <div style={{ fontSize: 18, fontWeight: 600 }}>{form.name || '(未命名)'}</div>
          </div>

          <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>基本信息</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><div style={labelStyle}>姓名</div><Input value={form.name} onChange={setField('name')} /></div>
              <div><div style={labelStyle}>邮箱</div><Input value={form.email} onChange={setField('email')} /></div>
              <div><div style={labelStyle}>电话</div><Input value={form.phone} onChange={setField('phone')} /></div>
              <div><div style={labelStyle}>城市</div><Input value={form.city} onChange={setField('city')} /></div>
            </div>
          </Card>

          <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>工作</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: 14 }}>
              <div><div style={labelStyle}>公司</div><Input value={form.company} onChange={setField('company')} /></div>
              <div><div style={labelStyle}>岗位</div><Input value={form.role} onChange={setField('role')} /></div>
              <div><div style={labelStyle}>总年限</div><Input type="number" value={form.years} onChange={setField('years')} /></div>
            </div>
          </Card>

          <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>教育</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: 14 }}>
              <div><div style={labelStyle}>学校</div><Input value={form.school} onChange={setField('school')} /></div>
              <div><div style={labelStyle}>专业</div><Input value={form.major} onChange={setField('major')} /></div>
              <div><div style={labelStyle}>学历</div><Input value={form.degree} onChange={setField('degree')} /></div>
              <div><div style={labelStyle}>毕业</div><Input type="number" value={form.gradYear} onChange={setField('gradYear')} /></div>
            </div>
          </Card>

          <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>技能(用英文逗号分隔)</div>
            <Input value={form.skills} onChange={setField('skills')} />
          </Card>

          <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>AI 评语</div>
            <textarea value={form.summary} onChange={setField('summary')} style={{
              minHeight: 80, padding: 12, borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--bg-elevated)', fontFamily: 'var(--font-sans)', fontSize: 13,
              color: 'var(--fg)', lineHeight: 1.55, resize: 'vertical', outline: 'none',
            }} />
          </Card>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 27.3: Commit**

```bash
git add app/candidates/\[id\]/edit/page.tsx components/CandidateEditClient.tsx
git commit -m "feat(pages): candidate edit form"
```

---

### Task 28 · 占位页 `/jd` / `/compare`

**Files:**
- Create: `app/jd/page.tsx` · `app/compare/page.tsx` · `components/Placeholder.tsx`

**Steps:**

- [ ] **Step 28.1: 写 `components/Placeholder.tsx`**

```tsx
// components/Placeholder.tsx
'use client';
import Link from 'next/link';
import { Sidebar, TopBar, Card, Btn } from './ui';
import { I } from './icons';

export default function Placeholder({ title, sidebarActive, description }: {
  title: string;
  sidebarActive: string;
  description: string;
}) {
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 44px)', background: 'var(--bg-sunken)' }}>
      <Sidebar active={sidebarActive} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar title={title} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <Card style={{ padding: 48, maxWidth: 480, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent-bg-subtle)', color: 'var(--accent-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <I.Sparkles size={24} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>即将上线</div>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.6, margin: '0 0 20px' }}>{description}</p>
            <Link href="/dashboard" style={{ textDecoration: 'none' }}>
              <Btn variant="secondary" icon={<I.ChevL />}>返回候选人列表</Btn>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 28.2: 写 `app/jd/page.tsx` 和 `app/compare/page.tsx`**

```tsx
// app/jd/page.tsx
import Placeholder from '@/components/Placeholder';
export default function Page() {
  return <Placeholder title="岗位 JD · 评分配置" sidebarActive="jd" description="基于 JD 的 AI 评分功能将在下个里程碑开放,届时可配置必备/加分技能、经验、学历等维度,自动为每位候选人打分并给出评语。" />;
}
```

```tsx
// app/compare/page.tsx
import Placeholder from '@/components/Placeholder';
export default function Page() {
  return <Placeholder title="候选人对比" sidebarActive="compare" description="并排对比 2–3 位候选人,一眼识别最契合的人选。此功能依赖 JD 评分,两个里程碑都完成后一同上线。" />;
}
```

- [ ] **Step 28.3: Commit**

```bash
git add app/jd/page.tsx app/compare/page.tsx components/Placeholder.tsx
git commit -m "feat(pages): placeholders for JD scoring and compare"
```

---

## Phase 9 · 冒烟验证 & 交付

### Task 29 · 端到端手动冒烟 + 修缺

**Files:** —— (不改代码,除非发现 bug)

**Steps:**

- [ ] **Step 29.1: 全量测试通过**

```bash
npm test
```

Expected:所有单元 + 集成测试绿。失败的修,修了 commit。

- [ ] **Step 29.2: `tsc --noEmit` 通过**

```bash
npx tsc --noEmit
```

Expected:无 type error。

- [ ] **Step 29.3: `next build` 通过**

```bash
npm run build
```

Expected:构建成功,无 error,只允许 warning。

- [ ] **Step 29.4: 准备真 DeepSeek key**

```bash
cp .env.local.example .env.local
# 编辑 .env.local,填入 DEEPSEEK_API_KEY,并确保 LLM_STUB=0
```

- [ ] **Step 29.5: 手动冒烟**

```bash
npm run db:migrate    # 初次建库
npm run dev
```

按下面 9 条一项项打钩(对应 spec §1.2 的完成定义):

- [ ] `/upload` 打开,拖 3 份真实 PDF
- [ ] 看到 3 行进度从「上传中」→「排队中」→「AI 解析中」→「已完成」
- [ ] 点任一行跳详情 `/candidates/:id`,AI 提取字段齐全
- [ ] 编辑 → 改字段 → 保存 → 列表刷新看到改动
- [ ] Dashboard 状态 tab「初筛通过」过滤正确,计数与徽章正确
- [ ] 详情页点状态按钮(例如「面试中」)→ Dashboard 对应数字 / 徽章变化
- [ ] 上传加密 PDF → 错误徽章 + 中文文案 + 重试按钮
- [ ] Ctrl+C 杀 `next dev`,再 `npm run dev`,半完成的任务自动续跑完成
- [ ] `npm test` 仍全绿,无 DeepSeek key 也能跑(因为 stub)

- [ ] **Step 29.6: 最终 commit**

```bash
git add -A
git commit --allow-empty -m "chore: MVP smoke test passed"
```

---

## 完成

MVP 交付后,下一里程碑候选:

1. JD 管理 + AI 评分引擎(单独 spec)
2. 候选人对比(依赖评分)
3. SSE 流式提取(替换轮询)
4. 认证与多用户
5. 部署(Vercel + Turso / VPS / Docker)
6. E2E 测试(Playwright)
