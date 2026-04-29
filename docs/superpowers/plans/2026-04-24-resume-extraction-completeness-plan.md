# 简历抽取完整性改造 · 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 LLM 抽取出简历里的项目经历、保留教育时间月份、记录求职意向与年龄，详情页展示完整 works/educations/projects 数组。

**Architecture:** 从数据层往上改：Zod schema → prompt → derive → DB schema → UI。后端内聚改动一个 commit、UI 一个 commit；不做老数据迁移，直接清库重来。

**Tech Stack:** Next.js 15 / TypeScript / Zod / Drizzle + `better-sqlite3` / Vitest / DeepSeek（运行时 stub）。

**Spec:** `docs/superpowers/specs/2026-04-24-resume-extraction-completeness-design.md`

---

## 文件结构总览

**修改：**
- `lib/validation.ts` — ExtractedResume + PatchCandidate schema
- `lib/extraction/prompt.ts` — SYSTEM_PROMPT + STUB_RESULT
- `lib/extraction/derive.ts` — parseDate 兼容 / FlatFields / deriveFlat
- `lib/db/schema.ts` — candidates 表加 `age` / `target_role`，`grad_year` → `grad_date`
- `components/CandidateDetailClient.tsx` — 从扁平字段改读 extractedJson 数组
- `tests/validation.test.ts` — 新字段用例
- `tests/prompt.test.ts` — 新规则关键字 + 新 STUB 校验
- `tests/derive.test.ts` — parseDate 格式 / FlatFields 新字段

**创建：**
- `tests/fixtures/resume-section-clean.ts` — 区段分明型简历 fixture（田金沙风格）
- `tests/fixtures/resume-section-embedded.ts` — 项目嵌在工作下的简历 fixture
- `tests/extraction-fixtures.test.ts` — fixture → parse → derive 管线测试

**删除后重生成：**
- `data/` 目录（DB + 上传 PDF）
- `lib/db/migrations/` 目录（旧 0000 migration）

**不改：**
- `lib/extraction/worker.ts` — 依靠 FlatFields/Schema 两端键名对齐，自然通过 `.set({ ...flat })` 传值
- `lib/extraction/llm.ts` / `lib/extraction/pdf.ts` / `lib/extraction/queue.ts`
- `app/candidates/[id]/page.tsx`
- `components/ui.tsx`（复用 `SkillTag`，不新增组件）

---

## Task 1: 更新 ExtractedResume & PatchCandidate schema（TDD）

**Files:**
- Modify: `lib/validation.ts`
- Modify: `tests/validation.test.ts`

### Step 1.1: 先写会失败的测试

**Edit `tests/validation.test.ts` — 整个文件替换成：**

```ts
// tests/validation.test.ts
import { describe, it, expect } from 'vitest';
import { ExtractedResume, PatchCandidate } from '@/lib/validation';

describe('ExtractedResume zod', () => {
  it('accepts a full valid payload (new shape)', () => {
    const input = {
      basic: { name: '张远哲', email: 'a@b.cn', phone: '138', city: '杭州', age: 28 },
      targetRole: '前端开发工程师 / TypeScript 全栈开发',
      educations: [{
        school: '浙江大学', major: '计算机', degree: '本科',
        startDate: '2015.09', endDate: '2019.07',
      }],
      works: [{
        company: '阿里', role: 'FE',
        startDate: '2021.07', endDate: '至今',
        highlights: ['架构升级'],
      }],
      projects: [{
        name: '建管家',
        url: 'https://cha.jiangongdata.com',
        role: '独立开发',
        techStack: ['Vue3', 'Nuxt.js', 'Element UI'],
        startDate: '2024.01',
        endDate: '至今',
        description: '全国建筑行业大数据服务平台',
        highlights: ['虚拟滚动表格', 'SSR + SEO'],
      }],
      skills: ['React', 'TypeScript'],
      summary: '高级前端工程师',
    };
    expect(() => ExtractedResume.parse(input)).not.toThrow();
  });

  it('accepts nulls in basic + null targetRole + empty projects', () => {
    const input = {
      basic: { name: null, email: null, phone: null, city: null, age: null },
      targetRole: null,
      educations: [], works: [], projects: [], skills: [], summary: '',
    };
    expect(() => ExtractedResume.parse(input)).not.toThrow();
  });

  it('rejects missing projects key', () => {
    const input = {
      basic: { name: null, email: null, phone: null, city: null, age: null },
      targetRole: null,
      educations: [], works: [], skills: [], summary: '',
    };
    expect(() => ExtractedResume.parse(input)).toThrow();
  });

  it('rejects missing age in basic', () => {
    const input = {
      basic: { name: null, email: null, phone: null, city: null },
      targetRole: null,
      educations: [], works: [], projects: [], skills: [], summary: '',
    };
    expect(() => ExtractedResume.parse(input)).toThrow();
  });

  it('rejects wrong types', () => {
    const bad = {
      basic: { name: 123, email: null, phone: null, city: null, age: null },
      targetRole: null,
      educations: [], works: [], projects: [], skills: [], summary: '',
    };
    expect(() => ExtractedResume.parse(bad)).toThrow();
  });

  it('defaults techStack / highlights / skills to empty arrays', () => {
    const input = {
      basic: { name: null, email: null, phone: null, city: null, age: null },
      targetRole: null,
      educations: [],
      works: [{ company: 'x', role: null, startDate: null, endDate: null }],
      projects: [{
        name: 'p', url: null, role: null,
        startDate: null, endDate: null,
        description: null,
      }],
      summary: '',
    };
    const parsed = ExtractedResume.parse(input);
    expect(parsed.works[0].highlights).toEqual([]);
    expect(parsed.projects[0].techStack).toEqual([]);
    expect(parsed.projects[0].highlights).toEqual([]);
    expect(parsed.skills).toEqual([]);
  });

  it('accepts string startDate / endDate in educations', () => {
    const input = {
      basic: { name: null, email: null, phone: null, city: null, age: null },
      targetRole: null,
      educations: [{
        school: 's', major: null, degree: null,
        startDate: '2016/06', endDate: '2019/07',
      }],
      works: [], projects: [], skills: [], summary: '',
    };
    expect(() => ExtractedResume.parse(input)).not.toThrow();
  });
});

describe('PatchCandidate zod', () => {
  it('accepts gradDate string', () => {
    expect(() => PatchCandidate.parse({ gradDate: '2019.07' })).not.toThrow();
  });

  it('accepts age number', () => {
    expect(() => PatchCandidate.parse({ age: 28 })).not.toThrow();
  });

  it('accepts targetRole string', () => {
    expect(() => PatchCandidate.parse({ targetRole: '前端工程师' })).not.toThrow();
  });

  it('rejects old gradYear field (unknown key passthrough is allowed, value typecheck not)', () => {
    // zod 默认 strip 未知字段,不会报错;这里只保证 gradDate 可设
    expect(() => PatchCandidate.parse({ gradYear: 2019 })).not.toThrow();
  });
});
```

- [ ] **Step 1.2: 跑测试，应该全失败**

Run:
```bash
npm test -- tests/validation.test.ts
```

Expected: 多条 FAIL（因为当前 schema 还是旧的，没 `projects` / `age` / `targetRole`，且 `educations.startDate` 不存在）。

- [ ] **Step 1.3: 替换 `lib/validation.ts` 整个内容：**

```ts
// lib/validation.ts
import { z } from 'zod';

export const ExtractedResume = z.object({
  basic: z.object({
    name:  z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    city:  z.string().nullable(),
    age:   z.number().int().nullable(),
  }),
  targetRole: z.string().nullable(),
  educations: z.array(z.object({
    school:    z.string(),
    major:     z.string().nullable(),
    degree:    z.string().nullable(),
    startDate: z.string().nullable(),
    endDate:   z.string().nullable(),
  })),
  works: z.array(z.object({
    company:    z.string(),
    role:       z.string().nullable(),
    startDate:  z.string().nullable(),
    endDate:    z.string().nullable(),
    highlights: z.array(z.string()).default([]),
  })),
  projects: z.array(z.object({
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
export type ExtractedResume = z.infer<typeof ExtractedResume>;

// ---- API 请求体 schema ----
export const PatchCandidate = z.object({
  name:       z.string().nullable().optional(),
  email:      z.string().nullable().optional(),
  phone:      z.string().nullable().optional(),
  city:       z.string().nullable().optional(),
  age:        z.number().int().nullable().optional(),
  targetRole: z.string().nullable().optional(),
  role:       z.string().nullable().optional(),
  company:    z.string().nullable().optional(),
  years:      z.number().int().nullable().optional(),
  school:     z.string().nullable().optional(),
  major:      z.string().nullable().optional(),
  degree:     z.string().nullable().optional(),
  gradDate:   z.string().nullable().optional(),
  skills:     z.array(z.string()).optional(),
  summary:    z.string().optional(),
  status:     z.enum(['待筛选', '初筛通过', '面试中', '已录用', '已淘汰']).optional(),
});
export type PatchCandidateBody = z.infer<typeof PatchCandidate>;
```

- [ ] **Step 1.4: 再跑测试，应该全过**

Run:
```bash
npm test -- tests/validation.test.ts
```

Expected: PASS（全部 10 个 case）。

- [ ] **Step 1.5: 提交**

```bash
git add lib/validation.ts tests/validation.test.ts
git commit -m "$(cat <<'EOF'
feat(validation): add projects/age/targetRole and switch edu to string dates

Spec: docs/superpowers/specs/2026-04-24-resume-extraction-completeness-design.md § 4

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: 更新 SYSTEM_PROMPT 和 STUB_RESULT

**Files:**
- Modify: `lib/extraction/prompt.ts`
- Modify: `tests/prompt.test.ts`

### Step 2.1: 先写会失败的测试

**Edit `tests/prompt.test.ts` — 整个文件替换成：**

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

  it('SYSTEM_PROMPT mentions projects / techStack / targetRole rules', () => {
    expect(/projects/i.test(SYSTEM_PROMPT)).toBe(true);
    expect(/techStack/i.test(SYSTEM_PROMPT)).toBe(true);
    expect(/targetRole/i.test(SYSTEM_PROMPT)).toBe(true);
  });

  it('SYSTEM_PROMPT explains works/projects section split', () => {
    expect(/项目经历/.test(SYSTEM_PROMPT)).toBe(true);
    expect(/工作经历/.test(SYSTEM_PROMPT)).toBe(true);
  });

  it('SYSTEM_PROMPT documents age extraction', () => {
    expect(/age|岁/.test(SYSTEM_PROMPT)).toBe(true);
  });

  it('STUB_RESULT passes ExtractedResume validation', () => {
    expect(() => ExtractedResume.parse(STUB_RESULT)).not.toThrow();
  });

  it('STUB_RESULT has at least one project (for UI smoke)', () => {
    expect(STUB_RESULT.projects.length).toBeGreaterThan(0);
  });

  it('STUB_RESULT has targetRole', () => {
    expect(typeof STUB_RESULT.targetRole).toBe('string');
  });
});
```

- [ ] **Step 2.2: 跑测试，应该失败**

Run:
```bash
npm test -- tests/prompt.test.ts
```

Expected: FAIL（`STUB_RESULT.projects` 不存在，`targetRole` 不存在，关键字检查失败）。

- [ ] **Step 2.3: 替换 `lib/extraction/prompt.ts` 整个内容：**

```ts
// lib/extraction/prompt.ts
import type { ExtractedResume } from '../validation';

export const SYSTEM_PROMPT = `你是一个严格的简历信息抽取器。从下面简历原文中抽取结构化字段,严格按 JSON 返回。

规则:
- 所有不确定的字段填 null,严禁编造
- 日期保留原样("2019.06" / "2019/06" / "至今" / "2021.07 - 至今")
- 严格按原简历区段拆分 works 与 projects:
  · 若原简历有独立的"项目经历"段,其中每个有明确名字的项目抽入 projects
  · 原简历"工作经历"段里的条目抽入 works;若该段未写 bullet,works[].highlights 留空数组
  · 同一段内容不要同时写入 works 和 projects
- projects[].techStack 从"技术栈"一行拆成数组,按原书写顺序保留("Vue3 / Nuxt.js / Element UI" → ["Vue3","Nuxt.js","Element UI"])
- projects[].description 取"产品与业务"一段压成一句,不要合并核心技术
- projects[].highlights 合并"核心技术"和"工程化"两列的 bullet,每条一个字符串,保留原写法
- projects[].url 从"地址/仓库"行提取 http(s) 链接;无则 null
- targetRole 从"求职意向"一行提取原字符串;无则 null
- basic.age 从简历中提取数字("28 岁" → 28);无则 null
- educations / works 按结束时间倒序排,"至今" 视作最新
- 技能从文本直接抽取,不总结、不分类、保留原写法(React / TypeScript 等)
- summary 用一到两句客观描述候选人画像,不吹嘘,不使用感叹号,不用 emoji

返回的 JSON 严格符合以下 schema:
{
  "basic":      { "name": string|null, "email": string|null, "phone": string|null, "city": string|null, "age": number|null },
  "targetRole": string|null,
  "educations": [{ "school": string, "major": string|null, "degree": string|null, "startDate": string|null, "endDate": string|null }],
  "works":      [{ "company": string, "role": string|null, "startDate": string|null, "endDate": string|null, "highlights": string[] }],
  "projects":   [{ "name": string, "url": string|null, "role": string|null, "techStack": string[], "startDate": string|null, "endDate": string|null, "description": string|null, "highlights": string[] }],
  "skills":     string[],
  "summary":    string
}

只返回 JSON 对象,不要任何说明文字、markdown 代码块围栏。`;

export const STUB_RESULT: ExtractedResume = {
  basic: { name: '张远哲', email: 'zhang.yz@mail.cn', phone: '138-0000-0012', city: '杭州', age: 29 },
  targetRole: '前端开发工程师 / TypeScript 全栈开发',
  educations: [
    { school: '浙江大学', major: '计算机科学与技术', degree: '本科', startDate: '2015.09', endDate: '2019.07' },
  ],
  works: [
    { company: '阿里巴巴', role: '高级前端工程师', startDate: '2021.07', endDate: '至今', highlights: ['主导 B 端中台前端架构升级'] },
    { company: '字节跳动', role: '前端工程师', startDate: '2019.08', endDate: '2021.06', highlights: [] },
  ],
  projects: [
    {
      name: '中台前端脚手架',
      url: 'https://github.com/example/scaffold',
      role: '负责人',
      techStack: ['React', 'TypeScript', 'Vite', 'Monorepo'],
      startDate: '2022.03',
      endDate: '至今',
      description: '团队内统一的中台应用脚手架,覆盖 20+ 业务中台前端',
      highlights: [
        '基于 Vite + pnpm workspace 的 monorepo 架构,首启动 <2s',
        '统一权限中间件、埋点 SDK、错误上报、主题切换',
        'CI 集成类型检查 / 单测 / 构建产物体积门禁',
      ],
    },
    {
      name: '性能可观测平台',
      url: null,
      role: '独立交付',
      techStack: ['Next.js', 'ClickHouse', 'Web Vitals'],
      startDate: '2023.02',
      endDate: '2023.11',
      description: '首屏性能与交互指标的实时可视化与告警',
      highlights: [
        'Web Vitals + Resource Timing 双端上报,采样率动态调节',
        '按页面 / 地域 / 设备多维切片,P75 延迟可追溯到单次会话',
      ],
    },
  ],
  skills: ['React', 'TypeScript', 'Next.js', 'Node.js', 'GraphQL'],
  summary: '在前端性能优化与大型 SPA 架构方面有深入积累。',
};
```

- [ ] **Step 2.4: 再跑测试，应该全过**

Run:
```bash
npm test -- tests/prompt.test.ts tests/llm.test.ts
```

Expected: PASS（prompt 8 个 case + llm 2 个 case）。

- [ ] **Step 2.5: 提交**

```bash
git add lib/extraction/prompt.ts tests/prompt.test.ts
git commit -m "$(cat <<'EOF'
feat(prompt): extract projects/age/targetRole, preserve edu months

SYSTEM_PROMPT 新增 works/projects 分拆规则、techStack/url/description 约束;
STUB_RESULT 更新为含 2 个项目与多段工作的完整示例。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 更新 derive.ts（parseDate + FlatFields）

**Files:**
- Modify: `lib/extraction/derive.ts`
- Modify: `tests/derive.test.ts`

### Step 3.1: 先写会失败的测试

**Edit `tests/derive.test.ts` — 整个文件替换成：**

```ts
// tests/derive.test.ts
import { describe, it, expect } from 'vitest';
import { deriveFlat, computeYears } from '@/lib/extraction/derive';
import type { ExtractedResume } from '@/lib/validation';

const base: ExtractedResume = {
  basic: { name: '张远哲', email: 'a@b.cn', phone: '138', city: '杭州', age: 28 },
  targetRole: '前端工程师',
  educations: [],
  works: [],
  projects: [],
  skills: ['React'],
  summary: 'hi',
};

describe('deriveFlat', () => {
  it('fills basic fields including age/targetRole', () => {
    const flat = deriveFlat(base);
    expect(flat.name).toBe('张远哲');
    expect(flat.email).toBe('a@b.cn');
    expect(flat.phone).toBe('138');
    expect(flat.city).toBe('杭州');
    expect(flat.age).toBe(28);
    expect(flat.targetRole).toBe('前端工程师');
    expect(flat.skills).toEqual(['React']);
    expect(flat.summary).toBe('hi');
  });

  it('picks newest education by endDate desc (string dates)', () => {
    const e: ExtractedResume = {
      ...base,
      educations: [
        { school: '本科校', major: 'CS', degree: '本科', startDate: '2011.09', endDate: '2015.07' },
        { school: '硕士校', major: 'CS', degree: '硕士', startDate: '2015.09', endDate: '2018.07' },
      ],
    };
    const flat = deriveFlat(e);
    expect(flat.school).toBe('硕士校');
    expect(flat.degree).toBe('硕士');
    expect(flat.gradDate).toBe('2018.07');
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
    expect(flat.gradDate).toBeNull();
    expect(flat.company).toBeNull();
    expect(flat.years).toBeNull();
  });

  it('age and targetRole default to null when missing in basic / top-level', () => {
    const b: ExtractedResume = {
      ...base,
      basic: { ...base.basic, age: null },
      targetRole: null,
    };
    const flat = deriveFlat(b);
    expect(flat.age).toBeNull();
    expect(flat.targetRole).toBeNull();
  });
});

describe('computeYears (date format variants)', () => {
  it('accepts "2018.01" format', () => {
    const years = computeYears([
      { company: 'x', role: null, startDate: '2018.01', endDate: '2020.01', highlights: [] },
      { company: 'y', role: null, startDate: '2020.07', endDate: '2023.07', highlights: [] },
    ]);
    expect(years).toBe(5);
  });

  it('accepts "2018/01" format', () => {
    const years = computeYears([
      { company: 'x', role: null, startDate: '2018/01', endDate: '2020/01', highlights: [] },
    ]);
    expect(years).toBe(2);
  });

  it('accepts "2018-01" format', () => {
    const years = computeYears([
      { company: 'x', role: null, startDate: '2018-01', endDate: '2020-01', highlights: [] },
    ]);
    expect(years).toBe(2);
  });

  it('accepts bare year "2018" as January', () => {
    const years = computeYears([
      { company: 'x', role: null, startDate: '2018', endDate: '2020', highlights: [] },
    ]);
    expect(years).toBe(2);
  });

  it('treats 至今 as now', () => {
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

- [ ] **Step 3.2: 跑测试，应该失败**

Run:
```bash
npm test -- tests/derive.test.ts
```

Expected: FAIL（`flat.age` 不存在、`educations[].endDate` 不存在、`gradDate` 不存在、`projects` key 缺失等）。

- [ ] **Step 3.3: 替换 `lib/extraction/derive.ts` 整个内容：**

```ts
// lib/extraction/derive.ts
import type { ExtractedResume } from '../validation';

type WorkItem = ExtractedResume['works'][number];
type EduItem  = ExtractedResume['educations'][number];

export interface FlatFields {
  name:       string | null;
  email:      string | null;
  phone:      string | null;
  city:       string | null;
  age:        number | null;
  targetRole: string | null;
  role:       string | null;
  company:    string | null;
  years:      number | null;
  school:     string | null;
  major:      string | null;
  degree:     string | null;
  gradDate:   string | null;
  skills:     string[];
  summary:    string;
}

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})(?:[.\-\/](\d{1,2}))?/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = m[2] ? Number(m[2]) : 1;
  if (isNaN(y) || isNaN(mo)) return null;
  return new Date(y, mo - 1, 1);
}

function parseEndDate(s: string | null, now: Date): Date | null {
  if (s === '至今') return now;
  return parseDate(s);
}

function pickLatestEducation(list: EduItem[]): EduItem | null {
  if (list.length === 0) return null;
  return [...list].sort((a, b) => {
    const ae = parseDate(a.endDate)?.getTime() ?? -Infinity;
    const be = parseDate(b.endDate)?.getTime() ?? -Infinity;
    return be - ae;
  })[0];
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
    name:       data.basic.name,
    email:      data.basic.email,
    phone:      data.basic.phone,
    city:       data.basic.city,
    age:        data.basic.age,
    targetRole: data.targetRole,
    role:       work?.role ?? null,
    company:    work?.company ?? null,
    years:      computeYears(data.works, now),
    school:     edu?.school ?? null,
    major:      edu?.major ?? null,
    degree:     edu?.degree ?? null,
    gradDate:   edu?.endDate ?? null,
    skills:     data.skills,
    summary:    data.summary,
  };
}
```

- [ ] **Step 3.4: 再跑测试，应该全过**

Run:
```bash
npm test -- tests/derive.test.ts
```

Expected: PASS（deriveFlat 5 个 + computeYears 7 个）。

- [ ] **Step 3.5: 提交**

```bash
git add lib/extraction/derive.ts tests/derive.test.ts
git commit -m "$(cat <<'EOF'
feat(derive): parseDate accepts 4 formats; FlatFields adds age/targetRole/gradDate

parseDate 现在兼容 "2019.06" / "2019/06" / "2019-06" / "2019";
deriveFlat 从 data.basic.age 与 data.targetRole 直接取值;
pickLatestEducation 用 endDate 字符串排序。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: 新增 fixture 管线测试

**Files:**
- Create: `tests/fixtures/resume-section-clean.ts`
- Create: `tests/fixtures/resume-section-embedded.ts`
- Create: `tests/extraction-fixtures.test.ts`

**目的：** 验证"当 LLM 输出某个形状的 JSON 时，`ExtractedResume.parse` + `deriveFlat` 的下游管线正确"。fixture 是**预先构造的、模拟 LLM 应该返回的 JSON**，而不是简历文本本身。

### Step 4.1: 创建 fixture 1（区段分明型：田金沙风格）

**Create `tests/fixtures/resume-section-clean.ts`:**

```ts
// tests/fixtures/resume-section-clean.ts
// 模拟 LLM 对"工作经历表格 + 项目经历独立段"的简历的抽取输出
import type { ExtractedResume } from '@/lib/validation';

export const RESUME_SECTION_CLEAN: ExtractedResume = {
  basic: {
    name:  '田金沙',
    email: '754671297@qq.com',
    phone: '19973361472',
    city:  '重庆',
    age:   28,
  },
  targetRole: '前端开发工程师 / TypeScript 全栈开发',
  educations: [
    {
      school:    '重庆航天',
      major:     '软件工程',
      degree:    null,
      startDate: '2016/06',
      endDate:   '2019/07',
    },
  ],
  works: [
    { company: '开林企业管理', role: '前端开发工程师', startDate: '2023/03', endDate: '2026/02', highlights: [] },
    { company: '誉存科技',     role: '前端开发工程师', startDate: '2021/01', endDate: '2022/12', highlights: [] },
    { company: '微创软件',     role: '前端开发工程师', startDate: '2019/10', endDate: '2020/11', highlights: [] },
  ],
  projects: [
    {
      name:        '建管家大数据查询平台',
      url:         'https://cha.jiangongdata.com',
      role:        null,
      techStack:   ['Vue3', 'Nuxt.js', 'Element UI'],
      startDate:   null,
      endDate:     null,
      description: '全国建筑行业大数据服务平台,提供招标 / 中标 / 企业 / 资质 / 证书一站式查询服务',
      highlights: [
        '基于 Vue Hooks 封装大量业务通用钩子(请求、缓存、弹窗、列表、筛选等)',
        '自研高性能表格体系,支持虚拟滚动、树形展开、排序、分页',
        'Gzip + Brotli 双算法预压缩,优先级 br > gzip,阈值 10KB',
      ],
    },
    {
      name:        'JKVideo',
      url:         'https://github.com/tiajinsha/JKVideo',
      role:        '独立开发',
      techStack:   ['React Native', 'TypeScript', 'Expo', 'DASH'],
      startDate:   null,
      endDate:     null,
      description: '独立开发的第三方网络视频客户端,Android / iOS / Web 三端一套代码运行',
      highlights: [
        'DASH 流媒体播放引擎,支持 4K / HDR / 杜比、清晰度切换、秒开优化',
        'Zustand 多模块状态管理:auth / download / video / live / settings 分域隔离',
        'Sentry 错误追踪 + Web Shim 隔离',
      ],
    },
  ],
  skills: ['Vue3', 'React', 'React Native', 'TypeScript', 'Nuxt.js', 'Next.js', 'Node.js', 'NestJS'],
  summary: '5 年前端开发经验,专注中大型 Web 应用与跨端工程化,具备从 0 到 1 的架构设计与独立交付能力。',
};
```

### Step 4.2: 创建 fixture 2（项目嵌在工作下的简历）

**Create `tests/fixtures/resume-section-embedded.ts`:**

```ts
// tests/fixtures/resume-section-embedded.ts
// 模拟 LLM 对"工作经历里嵌项目、无独立项目经历段"的简历的抽取输出
// 按规则应当:所有项目内容留在 works[].highlights,projects 为空
import type { ExtractedResume } from '@/lib/validation';

export const RESUME_SECTION_EMBEDDED: ExtractedResume = {
  basic: {
    name:  '李小明',
    email: 'liming@example.com',
    phone: '13800000000',
    city:  '北京',
    age:   null,
  },
  targetRole: null,
  educations: [
    {
      school:    '清华大学',
      major:     '计算机',
      degree:    '硕士',
      startDate: '2018.09',
      endDate:   '2021.06',
    },
  ],
  works: [
    {
      company:   '美团',
      role:      '高级前端工程师',
      startDate: '2021.07',
      endDate:   '至今',
      highlights: [
        '负责外卖 C 端首页改版:React + TypeScript,首屏 LCP 从 3.2s 降到 1.4s',
        '主导 Mini 框架重构:去掉老 Redux,改用 Zustand + Immer',
        '搭建前端监控体系:Sentry + 自研性能埋点',
      ],
    },
  ],
  projects: [],
  skills: ['React', 'TypeScript', 'Node.js'],
  summary: '5 年大厂前端经验,擅长 C 端性能优化与框架升级。',
};
```

### Step 4.3: 创建 fixture 测试

**Create `tests/extraction-fixtures.test.ts`:**

```ts
// tests/extraction-fixtures.test.ts
import { describe, it, expect } from 'vitest';
import { ExtractedResume } from '@/lib/validation';
import { deriveFlat } from '@/lib/extraction/derive';
import { RESUME_SECTION_CLEAN } from './fixtures/resume-section-clean';
import { RESUME_SECTION_EMBEDDED } from './fixtures/resume-section-embedded';

describe('fixture: section-clean (田金沙 风格)', () => {
  it('passes schema validation', () => {
    expect(() => ExtractedResume.parse(RESUME_SECTION_CLEAN)).not.toThrow();
  });

  it('projects contain 2 entries, all works have empty highlights', () => {
    expect(RESUME_SECTION_CLEAN.projects.length).toBe(2);
    for (const w of RESUME_SECTION_CLEAN.works) {
      expect(w.highlights).toEqual([]);
    }
  });

  it('education months preserved as "YYYY/MM"', () => {
    expect(RESUME_SECTION_CLEAN.educations[0].startDate).toBe('2016/06');
    expect(RESUME_SECTION_CLEAN.educations[0].endDate).toBe('2019/07');
  });

  it('deriveFlat gets targetRole, age, gradDate, latest work', () => {
    const flat = deriveFlat(RESUME_SECTION_CLEAN, new Date('2026-04-24'));
    expect(flat.targetRole).toBe('前端开发工程师 / TypeScript 全栈开发');
    expect(flat.age).toBe(28);
    expect(flat.gradDate).toBe('2019/07');
    expect(flat.company).toBe('开林企业管理');
    expect(flat.role).toBe('前端开发工程师');
    expect(flat.years).toBeGreaterThanOrEqual(5);
  });
});

describe('fixture: section-embedded (项目嵌工作)', () => {
  it('passes schema validation', () => {
    expect(() => ExtractedResume.parse(RESUME_SECTION_EMBEDDED)).not.toThrow();
  });

  it('projects array is empty, works have highlights', () => {
    expect(RESUME_SECTION_EMBEDDED.projects).toEqual([]);
    expect(RESUME_SECTION_EMBEDDED.works[0].highlights.length).toBeGreaterThan(0);
  });

  it('targetRole is null when absent', () => {
    expect(RESUME_SECTION_EMBEDDED.targetRole).toBeNull();
  });

  it('deriveFlat handles null targetRole/age gracefully', () => {
    const flat = deriveFlat(RESUME_SECTION_EMBEDDED);
    expect(flat.targetRole).toBeNull();
    expect(flat.age).toBeNull();
  });
});
```

- [ ] **Step 4.4: 跑所有测试**

Run:
```bash
npm test
```

Expected: PASS（原有 46 测试 + 新加的 fixture + 本 task 之前三个 task 新加的，合计 >= 60 PASS，0 FAIL）。

- [ ] **Step 4.5: 提交**

```bash
git add tests/fixtures/ tests/extraction-fixtures.test.ts
git commit -m "$(cat <<'EOF'
test(extraction): add fixture-based pipeline tests

验证 schema / derive 管线能正确处理两种典型简历形态:
- 田金沙风格: 独立项目经历段,works[].highlights 为空
- 嵌套风格: 项目嵌在工作经历下,projects 为空

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 更新 DB schema + 清库 + 重生成 migration

**Files:**
- Modify: `lib/db/schema.ts`
- Delete: `data/` 目录
- Delete: `lib/db/migrations/` 目录
- Create: `lib/db/migrations/*`（drizzle-kit 生成）

### Step 5.1: 清库

Run（powershell 或 bash 任一）：

```bash
rm -rf data
rm -rf lib/db/migrations
```

Expected: 两个目录消失。确认：

```bash
ls data 2>/dev/null || echo "data missing ok"
ls lib/db/migrations 2>/dev/null || echo "migrations missing ok"
```

- [ ] **Step 5.2: 更新 `lib/db/schema.ts`**

替换表定义中的相关字段块。**只改下面这几行，其他不动：**

找到：
```ts
  gradYear:  integer('grad_year'),
```

改为：
```ts
  age:        integer('age'),
  targetRole: text('target_role'),
  gradDate:   text('grad_date'),
```

（即：删掉 `gradYear` 那一行，换成三行。）

改完后的 schema.ts 前半部分应该是这样：

```ts
export const candidates = sqliteTable('candidates', {
  id: text('id').primaryKey(),

  name:       text('name'),
  email:      text('email'),
  phone:      text('phone'),
  city:       text('city'),
  age:        integer('age'),
  targetRole: text('target_role'),
  role:       text('role'),
  company:    text('company'),
  years:      integer('years'),
  school:     text('school'),
  major:      text('major'),
  degree:     text('degree'),
  gradDate:   text('grad_date'),
  skills:     text('skills', { mode: 'json' }).$type<string[]>(),
  summary:    text('summary'),

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
```

- [ ] **Step 5.3: 生成新 migration**

```bash
npm run db:generate
```

Expected: 看到 `lib/db/migrations/0000_<generated-name>.sql` 生成，日志里包含 `CREATE TABLE candidates` 且字段包含 `age`, `target_role`, `grad_date`，不包含 `grad_year`。

- [ ] **Step 5.4: 跑 migration 建库**

```bash
npm run db:migrate
```

Expected: 输出 `migration done`。`data/sift.db` 文件出现。

- [ ] **Step 5.5: 跑全量测试 + tsc**

```bash
npm test && npx tsc --noEmit
```

Expected: 测试全过；tsc 无类型错误（因为 FlatFields 和 schema 现在两端对齐，`worker.ts` 里 `.set({ ...flat })` 类型检查会通过）。

- [ ] **Step 5.6: 提交**

```bash
git add lib/db/schema.ts lib/db/migrations/
git commit -m "$(cat <<'EOF'
feat(db): add age/target_role/grad_date columns; regenerate migration

schema.ts: drop grad_year(integer) → grad_date(text); add age(integer), target_role(text).
data/ 目录由用户手动清空;migrations/0000 重新生成,单表完整 DDL。

BREAKING: 老 candidates 记录已清理,无迁移路径。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: 更新详情页 UI

**Files:**
- Modify: `components/CandidateDetailClient.tsx`

> **注意**：`worker.ts` 不需要改动 — `deriveFlat` 返回的 FlatFields 与 schema 列名一一对应，`db.update(candidates).set({ ...flat })` 在 Task 5 tsc 通过后即正确落库。

### Step 6.1: 替换详情页数据渲染部分

打开 `components/CandidateDetailClient.tsx`，**保留 import、组件框架、头部、extracting/error 分支**，只改**"parsed 分支"的 JSX**（即 `: (` 之后到 `)}` 之间的整个 `<div>` 块）。

替换 **第 91 行到第 127 行** 的整个 parsed 分支为：

```tsx
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 1200 }}>
              {/* AI 评语 */}
              <Card style={{ padding: 18, gridColumn: 'span 2' }}>
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500, marginBottom: 10 }}>AI 评语</div>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--fg)', margin: 0 }}>{c.summary ?? '—'}</p>
              </Card>

              {/* 工作经历(全部) */}
              <Card style={{ padding: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>工作经历</div>
                {(c.extractedJson?.works?.length ?? 0) === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--fg-subtle)' }}>—</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {c.extractedJson!.works.map((w, i) => (
                      <div key={i} style={{ paddingLeft: 12, borderLeft: '2px solid var(--accent-300)' }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{w.company} · {w.role ?? '—'}</div>
                        <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginTop: 2 }}>
                          {(w.startDate ?? '—')} — {(w.endDate ?? '—')}
                        </div>
                        {w.highlights.length > 0 && (
                          <ul style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '6px 0 0 14px', padding: 0, lineHeight: 1.6 }}>
                            {w.highlights.map((h, j) => <li key={j}>{h}</li>)}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* 教育背景(全部) */}
              <Card style={{ padding: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>教育背景</div>
                {(c.extractedJson?.educations?.length ?? 0) === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--fg-subtle)' }}>—</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {c.extractedJson!.educations.map((e, i) => (
                      <div key={i} style={{ paddingLeft: 12, borderLeft: '2px solid var(--info-300)' }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{e.school}</div>
                        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>
                          {e.major ?? '—'} · {e.degree ?? '—'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginTop: 2 }}>
                          {(e.startDate ?? '—')} — {(e.endDate ?? '—')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* 项目经历(全部) */}
              <Card style={{ padding: 18, gridColumn: 'span 2' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>项目经历</div>
                {(c.extractedJson?.projects?.length ?? 0) === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--fg-subtle)' }}>—</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {c.extractedJson!.projects.map((p, i) => (
                      <div key={i} style={{ paddingLeft: 12, borderLeft: '2px solid var(--accent)' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</span>
                          {p.role && <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>· {p.role}</span>}
                          {(p.startDate || p.endDate) && (
                            <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
                              · {(p.startDate ?? '—')} — {(p.endDate ?? '—')}
                            </span>
                          )}
                          {p.url && (
                            <a
                              href={p.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: 12, color: 'var(--accent)', marginLeft: 'auto' }}
                            >
                              🔗 {new URL(p.url).host}
                            </a>
                          )}
                        </div>
                        {p.techStack.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                            {p.techStack.map((t, j) => <SkillTag key={j}>{t}</SkillTag>)}
                          </div>
                        )}
                        {p.description && (
                          <div style={{ fontSize: 13, color: 'var(--fg)', marginTop: 8, lineHeight: 1.6 }}>{p.description}</div>
                        )}
                        {p.highlights.length > 0 && (
                          <ul style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '8px 0 0 14px', padding: 0, lineHeight: 1.65 }}>
                            {p.highlights.map((h, j) => <li key={j}>{h}</li>)}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* 技能 */}
              <Card style={{ padding: 18, gridColumn: 'span 2' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>技能</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(c.skills ?? []).map((s) => <SkillTag key={s}>{s}</SkillTag>)}
                </div>
              </Card>

              {/* 状态流转 */}
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
```

### Step 6.2: 头部加"求职意向"徽章和年龄

**找到当前（约第 56-67 行）这段：**

```tsx
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
```

**替换为：**

```tsx
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--fg)', margin: 0 }}>{c.name ?? '(未提取)'}</h1>
              {c.extractionStatus === 'parsed' && <StatusPill status={c.status} />}
            </div>
            {c.extractionStatus === 'parsed' && c.targetRole && (
              <div style={{ marginTop: 6 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 4,
                  fontSize: 12, fontWeight: 500,
                  background: 'var(--accent-bg-subtle)', color: 'var(--accent-700)',
                }}>🎯 {c.targetRole}</span>
              </div>
            )}
            {c.extractionStatus === 'parsed' && (
              <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 13, color: 'var(--fg-muted)', flexWrap: 'wrap' }}>
                {c.role && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><I.Briefcase size={13} />{c.role}</span>}
                {c.city && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><I.MapPin size={13} />{c.city}</span>}
                {c.email && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><I.Mail size={13} />{c.email}</span>}
                {c.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><I.Phone size={13} />{c.phone}</span>}
                {c.age != null && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>🎂 {c.age} 岁</span>}
              </div>
            )}
```

- [ ] **Step 6.3: 类型检查 + 构建**

```bash
npx tsc --noEmit
```

Expected: 无错。特别注意 `c.extractedJson.works[i].highlights` 类型应为 `string[]`（来自 Drizzle `$type<ExtractedResume>()` 推断）。

- [ ] **Step 6.4: 跑全量测试**

```bash
npm test
```

Expected: 全绿。

- [ ] **Step 6.5: 提交**

```bash
git add components/CandidateDetailClient.tsx
git commit -m "$(cat <<'EOF'
feat(ui): detail page shows full works/educations/projects arrays

数据源从扁平字段改读 c.extractedJson 数组;
头部新增求职意向徽章和年龄;
项目卡片展示 URL 链接、techStack 徽章、description、highlights。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: 更新编辑表单（CandidateEditClient）

**Files:**
- Modify: `components/CandidateEditClient.tsx`

**Why:** PatchCandidate schema 已把 `gradYear: number` 换成 `gradDate: string`，编辑表单还在发 `gradYear` 会被 Zod 静默 strip，导致"改毕业时间"永远失效。同时顺手加上 `age` 和 `targetRole` 两个新字段的编辑入口。

### Step 7.1: 替换 `components/CandidateEditClient.tsx` 整个文件

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar, Btn, Input, Card, Avatar } from './ui';
import { I } from './icons';
import type { Candidate } from '@/lib/db/schema';

export default function CandidateEditClient({ initial }: { initial: Candidate }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name:       initial.name ?? '',
    email:      initial.email ?? '',
    phone:      initial.phone ?? '',
    city:       initial.city ?? '',
    age:        initial.age ?? '',
    targetRole: initial.targetRole ?? '',
    role:       initial.role ?? '',
    company:    initial.company ?? '',
    years:      initial.years ?? 0,
    school:     initial.school ?? '',
    major:      initial.major ?? '',
    degree:     initial.degree ?? '',
    gradDate:   initial.gradDate ?? '',
    skills:     (initial.skills ?? []).join(', '),
    summary:    initial.summary ?? '',
  });
  const [saving, setSaving] = useState(false);

  const setField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function save() {
    setSaving(true);
    const body = {
      name:       form.name    || null,
      email:      form.email   || null,
      phone:      form.phone   || null,
      city:       form.city    || null,
      age:        form.age === '' ? null : Number(form.age),
      targetRole: form.targetRole || null,
      role:       form.role    || null,
      company:    form.company || null,
      years:      Number(form.years) || null,
      school:     form.school  || null,
      major:      form.major   || null,
      degree:     form.degree  || null,
      gradDate:   form.gradDate || null,
      skills:     form.skills.split(',').map((s) => s.trim()).filter(Boolean),
      summary:    form.summary,
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
              <div><div style={labelStyle}>姓名</div><Input value={form.name} onChange={setField('name') as any} /></div>
              <div><div style={labelStyle}>邮箱</div><Input value={form.email} onChange={setField('email') as any} /></div>
              <div><div style={labelStyle}>电话</div><Input value={form.phone} onChange={setField('phone') as any} /></div>
              <div><div style={labelStyle}>城市</div><Input value={form.city} onChange={setField('city') as any} /></div>
              <div><div style={labelStyle}>年龄</div><Input type="number" value={form.age} onChange={setField('age') as any} /></div>
              <div><div style={labelStyle}>求职意向</div><Input value={form.targetRole} onChange={setField('targetRole') as any} /></div>
            </div>
          </Card>

          <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>工作</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: 14 }}>
              <div><div style={labelStyle}>公司</div><Input value={form.company} onChange={setField('company') as any} /></div>
              <div><div style={labelStyle}>岗位</div><Input value={form.role} onChange={setField('role') as any} /></div>
              <div><div style={labelStyle}>总年限</div><Input type="number" value={form.years} onChange={setField('years') as any} /></div>
            </div>
          </Card>

          <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>教育</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: 14 }}>
              <div><div style={labelStyle}>学校</div><Input value={form.school} onChange={setField('school') as any} /></div>
              <div><div style={labelStyle}>专业</div><Input value={form.major} onChange={setField('major') as any} /></div>
              <div><div style={labelStyle}>学历</div><Input value={form.degree} onChange={setField('degree') as any} /></div>
              <div><div style={labelStyle}>毕业时间</div><Input placeholder="如 2019.07" value={form.gradDate} onChange={setField('gradDate') as any} /></div>
            </div>
          </Card>

          <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>技能(英文逗号分隔)</div>
            <Input value={form.skills} onChange={setField('skills') as any} />
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

- [ ] **Step 7.2: 类型检查 + 测试**

```bash
npx tsc --noEmit && npm test
```

Expected: 全过。`initial.age` / `initial.targetRole` / `initial.gradDate` 应能从 Drizzle Candidate 类型推断到，无报错。

- [ ] **Step 7.3: 提交**

```bash
git add components/CandidateEditClient.tsx
git commit -m "$(cat <<'EOF'
feat(ui): edit form handles age / targetRole / gradDate

gradYear → gradDate (字符串,保留月份精度);
新增 age 和 targetRole 输入框,与新 PatchCandidate schema 对齐。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: 端到端手动验收

**前置：** 需要配好 `DEEPSEEK_API_KEY` 环境变量（或用 `.env.local`）。若仅想走 stub，执行 `export LLM_STUB=1`（bash）或 `$env:LLM_STUB="1"`（PowerShell）。

### Step 8.1: 启动 dev server

```bash
npm run dev
```

Expected: `Ready on http://localhost:3000`。

### Step 8.2: 上传田金沙简历

打开浏览器访问 `http://localhost:3000/upload`，拖入 `C:\Users\75467\Desktop\田金沙-19973361472.pdf`。

Expected:
- 上传进度 100%
- 状态从「上传中」→「排队中」→「解析中」→「已完成」

### Step 8.3: 验收详情页

点击候选人「田金沙」进入详情页。逐项核对：

- [ ] **头部**：
  - 名字"田金沙"
  - 🎯 徽章显示"前端开发工程师 / TypeScript 全栈开发"
  - 基本信息行包含 "28 岁"
  - 邮箱 `754671297@qq.com`、电话 `19973361472`、城市 `重庆`

- [ ] **工作经历 Card**（应有 3 条，按结束时间倒序）：
  1. `开林企业管理 · 前端开发工程师` · `2023/03 — 2026/02`
  2. `誉存科技 · 前端开发工程师` · `2021/01 — 2022/12`
  3. `微创软件 · 前端开发工程师` · `2019/10 — 2020/11`
  - 每条 highlights 可能为空（因为原简历工作表没写 bullet）

- [ ] **教育背景 Card**：
  - `重庆航天` · `软件工程 · —` · `2016/06 — 2019/07`（月份必须保留！）

- [ ] **项目经历 Card**（应有 ~5 条）：
  1. 建管家大数据查询平台（URL 链接可点，host 显示 `cha.jiangongdata.com`；techStack 至少含 Vue3/Nuxt.js）
  2. JKVideo（URL 指向 github.com/tiajinsha/JKVideo）
  3. 视频播放 AI Agent 评价市场后端
  4. TTIP 商机/商标企业级后台管理系统
  5. TTIP 商标电商 H5 移动端

  每个项目都应展示：名字、技术栈徽章行、description（一句话）、highlights（若干条 bullet）。

- [ ] **技能 Card**：至少 5 个徽章（React, TypeScript, Vue3, Node.js, Next.js 等任选）

- [ ] **状态流转**：5 个按钮正常显示

### Step 8.4: 如有问题的处理

若看到以下问题，对应修复：

| 症状 | 可能原因 | 修法 |
|---|---|---|
| 项目数为 0 或极少 | LLM 抽取不够激进 | 检查 prompt 中"项目经历"规则，必要时强化示例 |
| 教育只有年份没月份 | prompt 中"日期保留原样"被忽略 | 在规则中加一条强制 `"2016/06"` 风格示例 |
| 某个项目的 techStack 被拆错（`React 18` 拆成 `React` + `18`） | prompt 分词规则模糊 | 加明确反例："版本号整体保留" |
| 404 或 500 | worker 或 DB 问题 | 检查 next dev 终端日志 |

修完任何 prompt 变更都要：`npm test` 确保测试过 → 再手动复测。

### Step 8.5: 验收 commit

所有验收项通过后**不需要新提交**（前面每个 Task 都已提交），此步骤纯人工确认。

记录验收结果（可写到 commit body 或 PR 描述）：

```
端到端验收通过:
- 田金沙 PDF 上传后详情页 5 项目 / 3 工作 / 1 教育(含月份) / targetRole / age 全部展示
```

---

## 整体自查（实施完成后跑一次）

```bash
npm test && npx tsc --noEmit && npm run build
```

Expected: 测试全绿；tsc 无错；`next build` 成功。

如全过，改造收尾。
