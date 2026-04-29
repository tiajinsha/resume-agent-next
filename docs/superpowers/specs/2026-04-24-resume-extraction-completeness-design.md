# 简历抽取完整性改造 · 设计

**日期**：2026-04-24
**状态**：Draft，待用户 review
**作者**：Claude Opus 4.7 (1M context) + JaneyCobb
**前置**：`2026-04-24-sift-mvp-nextjs-sqlite-design.md`（MVP 基础设计）

## 1 · 背景

现有抽取流程对中国技术简历覆盖不全：

- **项目经历全部丢失**：prompt 和 Zod schema 均无 `projects` 字段；候选人"做过什么"在筛选阶段不可见。
- **教育月份被截断**：schema 用 `startYear / endYear: number`，`"2016/06"` 被截成 `2016`，"入学/毕业时间"只剩年份。
- **求职意向与年龄无落点**：`basic` 只有 `name / email / phone / city`，顶层无 `targetRole`；简历头部信息进不了结构化字段。
- **UI 只展示扁平"最新一条"**：`CandidateDetailClient` 读 `c.role / c.company / c.school` 等派生字段，真实的 `extractedJson.works[]` / `educations[]` 多段数据进了 DB 但不展示。

以一份真实简历（田金沙）为样例：5 个项目 + 3 段工作 + 1 段教育 + 求职意向 + 年龄，现状抽取后只留了 1 条工作 + 1 条教育（去月份）+ skills + summary，**信息丢失约 70%**。

## 2 · 目标与非目标

### 2.1 目标

1. LLM 能抽取"项目经历"段的所有项目，每个项目保留名称、URL、技术栈、时间、描述、亮点。
2. 教育时间保留月份精度，与 works 的时间字符串风格一致。
3. 求职意向和年龄有专门字段，能在详情页露出。
4. 详情页展示完整 works / educations / projects 数组，而不是单条派生。
5. works 与 projects 的边界有明确规则，LLM 行为可预测。

### 2.2 非目标

- 不做复杂的 works/projects 关联（如"项目归属于哪家公司"）。
- 不做折叠/展开交互（MVP 用简单列表）。
- 不做老数据迁移兼容（直接清空 DB）。
- 不引入新的抽取字段（如证书、语言、出版物）。

## 3 · 决策记录

| # | 决策 | 选择 |
|---|---|---|
| 1 | projects 字段粒度 | **B：7 字段均衡版**（不含 `value`） |
| 2 | education 时间精度 | **A：改 `startDate / endDate: string`** |
| 3 | 新增字段 | **A：加 `basic.age` + 顶层 `targetRole`** |
| 4 | works / projects 混写时的分拆规则 | **A：严格按原简历区段** |
| 5 | 老数据迁移 | **D：清空 DB 重来** |
| 6 | UI 展示形式 | **A：简单列表，不折叠** |

## 4 · 数据模型（`lib/validation.ts`）

```ts
export const ExtractedResume = z.object({
  basic: z.object({
    name:  z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    city:  z.string().nullable(),
    age:   z.number().int().nullable(),        // 新增
  }),
  targetRole: z.string().nullable(),           // 新增
  educations: z.array(z.object({
    school:    z.string(),
    major:     z.string().nullable(),
    degree:    z.string().nullable(),
    startDate: z.string().nullable(),          // 原 startYear: number
    endDate:   z.string().nullable(),          // 原 endYear: number
  })),
  works: z.array(z.object({
    company:    z.string(),
    role:       z.string().nullable(),
    startDate:  z.string().nullable(),
    endDate:    z.string().nullable(),
    highlights: z.array(z.string()).default([]),
  })),
  projects: z.array(z.object({                 // 新增
    name:        z.string(),
    url:         z.string().nullable(),
    role:        z.string().nullable(),
    techStack:   z.array(z.string()).default([]),
    startDate:   z.string().nullable(),
    endDate:     z.string().nullable(),
    description: z.string().nullable(),
    highlights:  z.array(z.string()).default([]),
  })),
  skills:  z.array(z.string()).default([]),
  summary: z.string(),
});
```

`PatchCandidate` 同步更新：

```ts
age:        z.number().int().nullable().optional(),
targetRole: z.string().nullable().optional(),
gradDate:   z.string().nullable().optional(),   // 原 gradYear: number
```

## 5 · Prompt（`lib/extraction/prompt.ts`）

```
你是一个严格的简历信息抽取器。从下面简历原文中抽取结构化字段,严格按 JSON 返回。

规则:
- 所有不确定的字段填 null,严禁编造
- 日期保留原样("2019.06" / "2019/06" / "至今" / "2021.07 - 至今")
- 严格按原简历区段拆分 works 与 projects:
  · 若原简历有独立的"项目经历"段,其中每个有明确名字的项目抽入 projects
  · 原简历"工作经历"段里的条目抽入 works;若该段未写 bullet,works[].highlights 留空数组
  · 同一段内容不要同时写入 works 和 projects
- projects[].techStack 从"技术栈"一行拆成数组,按原书写顺序保留
- projects[].description 取"产品与业务"一段压成一句,不要合并核心技术
- projects[].highlights 合并"核心技术"和"工程化"两列的 bullet,每条一个字符串,保留原写法
- projects[].url 从"地址/仓库"行提取 http(s) 链接;无则 null
- targetRole 从"求职意向"一行提取原字符串;无则 null
- basic.age 从简历中提取数字("28 岁" → 28);无则 null
- educations / works 按结束时间倒序排,"至今" 视作最新
- 技能从文本直接抽取,不总结、不分类、保留原写法
- summary 用一到两句客观描述候选人画像,不吹嘘,不使用感叹号,不用 emoji

返回的 JSON 严格符合以下 schema:
{ ...展开 § 4 的全部字段清单,保留 `string|null` / `number|null` 等类型注解... }

只返回 JSON 对象,不要任何说明文字、markdown 代码块围栏。
```

> **实施注意**：上面 schema 块在真实 `SYSTEM_PROMPT` 字符串里必须完整展开所有字段（参照现有 `prompt.ts:15-21` 的写法），不能留占位符。

`STUB_RESULT` 同步更新为符合新 schema 的完整示例，用于 `LLM_STUB=1` 本地开发模式。

## 6 · 派生层（`lib/extraction/derive.ts`）

```ts
// parseDate 兼容 "2019.06" / "2019/06" / "2019-06" / "2019"
function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})(?:[.\-\/](\d{1,2}))?/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = m[2] ? Number(m[2]) : 1;
  return new Date(y, mo - 1, 1);
}

function pickLatestEducation(list: EduItem[]): EduItem | null {
  if (list.length === 0) return null;
  return [...list].sort((a, b) => {
    const ae = parseDate(a.endDate)?.getTime() ?? -Infinity;
    const be = parseDate(b.endDate)?.getTime() ?? -Infinity;
    return be - ae;
  })[0];
}

export interface FlatFields {
  name, email, phone, city: string | null;
  age:        number | null;    // 新增
  targetRole: string | null;    // 新增,直接取 data.targetRole
  role:       string | null;    // 仍来自 pickLatestWork
  company:    string | null;
  years:      number | null;
  school:     string | null;
  major:      string | null;
  degree:     string | null;
  gradDate:   string | null;    // 原 gradYear: number → gradDate: string
  skills:     string[];
  summary:    string;
}
```

`computeYears`、`pickLatestWork`、`parseEndDate`（处理 "至今"）均不变 — 它们都经由更新后的 `parseDate` 天然兼容新格式。

## 7 · DB Schema（`lib/db/schema.ts`）

```ts
export const candidates = sqliteTable('candidates', {
  // ... 现有字段 ...
  age:        integer('age'),           // 新增
  targetRole: text('target_role'),      // 新增
  gradDate:   text('grad_date'),        // 原 gradYear: integer → text
  // ... 其他不变 ...
});
```

`extractedJson` 仍按完整 `ExtractedResume` 类型存储（Drizzle `$type<ExtractedResume>()` 自然带新字段）。

## 8 · DB 清理与 Migration

选择方案 D：清空重来。

```bash
# 清数据
rm -rf data/

# 清旧 migration(项目刚起步,只有 0000_heavy_venus.sql)
rm -rf lib/db/migrations/

# 改完 schema.ts 后重新生成一份干净的 0000
npm run db:generate

# 启动时按 worker 现有逻辑自动跑 migration
npm run dev
```

`data/` 目录会在 `lib/storage.ts:17` 与 `lib/db/client.ts:14` 首次访问时自动重建。

## 9 · 详情页 UI（`components/CandidateDetailClient.tsx`）

数据源从扁平字段改读 `c.extractedJson` 完整数组；扁平字段保留给列表页筛选和排序使用。

布局：

```
头部卡片 (头像 + 姓名 + 状态标签)
  └ 求职意向徽章 (targetRole,null 时整行不渲染)
  └ 基本信息行: role · city · email · phone · age 岁

AI 评语 Card (跨 2 列)
  └ summary

工作经历 Card  ·  教育背景 Card  (各 1 列)
  └ 完整数组,倒序

项目经历 Card (跨 2 列,新增)
  └ 每项目: name · role · startDate—endDate · URL 链接
            techStack 徽章行
            description
            highlights · 每条一行

技能 Card (跨 2 列,不变)
状态流转 Card (跨 2 列,不变)
```

**渲染规则：**

- `works / educations / projects` 任一为空：渲染占位文字 `—`，不隐藏整个 Card。
- `projects[].url`：用 `<a target="_blank" rel="noopener noreferrer">`，显示文本为截短的 host。
- 时间段：`${startDate ?? '—'} — ${endDate ?? '—'}`，保留原格式。
- techStack 徽章：复用 `SkillTag` 组件，尺寸小一号。
- highlights 全展开显示，不折叠。

文件改动：

- `components/CandidateDetailClient.tsx`（主要）
- `components/ui.tsx`（可能加 `TechTag` 小尺寸变体）
- `app/candidates/[id]/page.tsx` 不改

## 10 · 测试策略

**更新现有：**

| 文件 | 改动 |
|---|---|
| `tests/validation.test.ts` | 新字段 valid/invalid 用例；`educations.startDate/endDate` 字符串；`PatchCandidate.gradDate` |
| `tests/prompt.test.ts` | 断言 `SYSTEM_PROMPT` 含新规则关键字；`STUB_RESULT` 过 `ExtractedResume.parse()` 不抛 |
| `tests/derive.test.ts` | `parseDate` 接受 4 种格式；`pickLatestEducation` 按字符串 endDate 排序；`deriveFlat` 返回新字段 |
| `tests/llm.test.ts` | STUB 路径结果符合新 schema |

**新增：**

- `tests/extraction-fixtures.test.ts` — 2 份代表性简历文本 fixture：
  - 区段分明型：所有项目入 projects，works[].highlights 空
  - 工作嵌项目型：项目全部留在 works[].highlights，projects 空
  - 教育月份保留（`"2016/06"` 原样）
  - targetRole 被抽到

  用 `callDeepSeek` 的 mock 返回固定 JSON，不在 CI 真调 LLM。

  > 注意：fixture 测试只验证 schema 与管线（解析、派生、落库正确），**不验证 prompt 质量**。Prompt 是否真的按区段分拆、月份是否保留，必须靠手跑端到端用真实简历验收。

**手跑端到端：**

1. 清库启动 dev
2. 上传 `田金沙-19973361472.pdf`
3. 确认详情页看到 5 个项目（含建管家、JKVideo、AI Agent 后端、TTIP 后台、TTIP H5）
4. 确认教育时间显示 `2016/06 — 2019/07`
5. 确认顶部徽章显示"前端开发工程师 / TypeScript 全栈开发"

## 11 · 风险

- **长简历 token 超限**：田金沙这份 5 个项目 × ~15 条 highlights，加上 works/educations，中文 token 估算 ~6k，prompt 还切到 30000 字符，绰绰有余。更长的简历（10+ 项目）可能会接近模型 context，先观察，必要时把 `resumeText.slice(0, 30_000)` 调小或分段。
- **techStack 分词**：`"Vue3 + Nuxt.js + Element UI"` 可以按 `+` / `、` / `,` 切；`"React 18"` 要整体保留。prompt 写了"按原书写顺序保留"，但模型可能偶尔把版本号拆开。测试里覆盖这个 case。
- **URL 过滤**：简历里有不少代码路径（`lib/package/table/`），prompt 明确要求 `http(s)` 前缀可以过掉绝大部分。
- **description 与 highlights 冗余**：prompt 强调 description 压缩成一句、不合并核心技术，实际效果需要跑真实简历验证。

## 12 · 实施顺序（交给 writing-plans）

1. `validation.ts` + `prompt.ts` + `derive.ts`（后端内聚一块）
2. 更新现有测试 + 新增 fixture 测试 → 通过
3. `schema.ts` + 清库重生成 migration
4. `worker.ts` 里的 flat 字段映射更新
5. UI 改造 `CandidateDetailClient.tsx`
6. 端到端：上传田金沙 PDF 验收
