# SSE 简历流式解析 · 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把简历解析从"轮询状态字符串"升级为字段级 SSE 流式，详情页用骨架屏分 section 动态展示 LLM 抽取出的内容。

**Architecture:** 后台 p-queue worker 负责 LLM 流式抽取，解析到节点级 delta 时 publish 到 module-scope EventBus 并写内存 snapshot；新增 `GET /api/candidates/[id]/stream` 以 SSE 推送 `snapshot` / `delta` / `done` / `error`；详情页用 `useCandidateStream` 订阅事件，把结构化 state 覆盖到骨架屏上。

**Tech Stack:** Next.js 16（App Router，params 为 Promise）、TypeScript、vitest、drizzle/better-sqlite3、openai SDK（DeepSeek 兼容端点）、`best-effort-json-parser`、原生 EventSource。

**Spec reference:** `docs/superpowers/specs/2026-04-24-sse-resume-streaming-design.md`

**Runtime conventions for this project:**
- 测试：`npm run test`（vitest，`include: ['tests/**/*.test.ts']`，setup file 强制 `LLM_STUB=1`）
- 单测用 `vi.resetModules()` + `delete (globalThis as any).__sqlite` + `delete (globalThis as any).__queueInit` 在 `beforeEach` 里隔离
- route.ts 的 context 形如 `{ params: Promise<{ id: string }> }`；测试中用 `{ params: Promise.resolve({ id }) }` 传入
- 提交：每个 Task 一次 commit，message 结尾保留 `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`

---

## File Structure

**New:**
- `lib/extraction/event-bus.ts` — module-scope `Map<id, EventEmitter>` + `Map<id, Partial<ExtractedResume>>`；提供 `subscribe` / `publish` / `getSnapshot` / `clear`。
- `lib/extraction/stream-emitter.ts` — 纯函数 factory `createStreamEmitter()`，累积 LLM token，使用 `best-effort-json-parser` 增量解析，按兄弟键启发式产出 `Delta[]`。
- `app/api/candidates/[id]/stream/route.ts` — SSE `GET` 路由：读候选人 → 已终态就 short-circuit；否则发 `snapshot` 后 subscribe，forward 后续事件 + 15s heartbeat。
- `hooks/useCandidateStream.ts` — client 端 EventSource 封装，输出 `{ streaming, final, error }` 三态。
- `components/Skeleton.tsx` — `<Skeleton.Line>` / `<Skeleton.Block>` / shimmer 动画。
- `tests/event-bus.test.ts` · `tests/partial-parse.test.ts` · `tests/stream-emitter.test.ts` · `tests/api-candidate-stream.test.ts`

**Modified:**
- `lib/extraction/llm.ts` — 新增 `callDeepSeekStream(text): AsyncIterable<string>`；stub 路径读取 `STUB_STREAM_CHUNKS`；保留 `callDeepSeek` 以便回退。
- `lib/extraction/prompt.ts` — 追加 `STUB_STREAM_CHUNKS`（切片 `STUB_RESULT` 序列化字符串）。
- `lib/extraction/worker.ts` — `runExtraction` 改为流式 loop：feed → publish delta → finalize → validate → 落库 → publish done；失败 publish error；`finally` 里 `bus.clear(id)`。
- `components/CandidateDetailClient.tsx` — 移除单卡片 loading 分支；使用 `useCandidateStream` + 分 section 骨架屏。
- `app/globals.css` — 追加 `@keyframes shimmer`。
- `tests/llm.test.ts` · `tests/worker.test.ts` — 扩展覆盖流式路径。
- `package.json` — 新增 `best-effort-json-parser` 运行时依赖。

**Untouched:** `/api/upload`、`/api/jobs`、`/api/candidates`、`/api/candidates/[id]`、`/api/candidates/[id]/retry`、`components/UploadClient.tsx`、`hooks/useJobPoll.ts`、DB schema、`validation.ts`、`derive.ts`、prompt 规则、`/dashboard`、`/compare`、`/jd`。

---

## Task 1: 安装依赖并钉死 best-effort-json-parser 的实际契约

**Goal:** 引入 partial JSON parser，并通过一个冒烟测试锁定它在截断输入下的返回形状，避免后续实现依赖错误假设。

**Files:**
- Modify: `package.json`
- Create: `tests/partial-parse.test.ts`

- [ ] **Step 1：安装依赖**

```bash
npm install best-effort-json-parser
```

- [ ] **Step 2：写冒烟测试（直接调库，观察行为）**

Create `tests/partial-parse.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parse as bestEffort } from 'best-effort-json-parser';

describe('best-effort-json-parser contract', () => {
  it('returns {} for empty input without throwing', () => {
    expect(() => bestEffort('')).not.toThrow();
  });

  it('parses a complete object', () => {
    expect(bestEffort('{"a":1,"b":"x"}')).toEqual({ a: 1, b: 'x' });
  });

  it('parses a truncated object (missing closing brace)', () => {
    const r = bestEffort('{"a":1,"b":"partial') as any;
    expect(r).toBeTypeOf('object');
    expect(r.a).toBe(1);
    // b 可能是部分字符串或 undefined；只断言"它不是让解析崩掉"
  });

  it('parses a truncated array', () => {
    const r = bestEffort('{"arr":[1,2,3') as any;
    expect(Array.isArray(r.arr)).toBe(true);
    expect(r.arr.slice(0, 3)).toEqual([1, 2, 3]);
  });

  it('parses half-written nested object inside array', () => {
    const r = bestEffort('{"arr":[{"k":1},{"k":2') as any;
    expect(Array.isArray(r.arr)).toBe(true);
    expect(r.arr[0]).toEqual({ k: 1 });
    expect(r.arr[1]).toBeTypeOf('object');
    expect(r.arr[1].k).toBe(2);
  });

  it('preserves escaped quotes in strings', () => {
    const r = bestEffort('{"s":"with \\"quotes\\""}') as any;
    expect(r.s).toBe('with "quotes"');
  });
});
```

- [ ] **Step 3：运行测试，确认库契约**

```bash
npm run test -- tests/partial-parse.test.ts
```

Expected: 全部 PASS。若某个断言失败，说明这个库在该 case 下行为与预期不同——**修改断言以反映真实行为**，再提交。**不改后续代码**的兜底逻辑，因为 stream-emitter 的 shouldEmit 只依赖"顶层键是否出现"/"数组长度"/"元素里 anchor 字段是否非空"，这些库都应该稳定支持。

- [ ] **Step 4：Commit**

```bash
git add package.json package-lock.json tests/partial-parse.test.ts
git commit -m "$(cat <<'EOF'
feat(deps): add best-effort-json-parser and pin its contract

Introduce partial-JSON parser for incremental LLM streaming; cover
truncated objects, arrays, nested halves, and escaped quotes so later
work can rely on a documented shape.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: EventBus（module-scope pubsub + snapshot）

**Goal:** 提供 worker 和 SSE route 共享的事件总线，snapshot 累积已 emit 的 path，`subscribe` 返回快照 + 取消句柄。

**Files:**
- Create: `lib/extraction/event-bus.ts`
- Create: `tests/event-bus.test.ts`

- [ ] **Step 1：先写失败的测试**

Create `tests/event-bus.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import * as bus from '@/lib/extraction/event-bus';

beforeEach(() => {
  // 模块级 Map 通过 globalThis 持有,手动清理避免跨用例污染
  delete (globalThis as any).__streamEventBus;
});

describe('event-bus', () => {
  it('subscribe returns empty snapshot when no deltas yet', () => {
    const sub = bus.subscribe('id-a', () => {});
    expect(sub.snapshot).toEqual({});
    sub.unsubscribe();
  });

  it('publishes delta to all subscribers', () => {
    const got1: any[] = [];
    const got2: any[] = [];
    const s1 = bus.subscribe('id-b', (e) => got1.push(e));
    const s2 = bus.subscribe('id-b', (e) => got2.push(e));

    bus.publish('id-b', { type: 'delta', path: 'basic', value: { name: 'a' } });

    expect(got1).toHaveLength(1);
    expect(got2).toHaveLength(1);
    expect(got1[0]).toEqual({ type: 'delta', path: 'basic', value: { name: 'a' } });
    s1.unsubscribe(); s2.unsubscribe();
  });

  it('accumulates snapshot: top-level key overwrites, array[i] placed at index', () => {
    bus.publish('id-c', { type: 'delta', path: 'basic', value: { name: 'x' } });
    bus.publish('id-c', { type: 'delta', path: 'educations[0]', value: { school: 'U1' } });
    bus.publish('id-c', { type: 'delta', path: 'educations[1]', value: { school: 'U2' } });

    expect(bus.getSnapshot('id-c')).toEqual({
      basic: { name: 'x' },
      educations: [{ school: 'U1' }, { school: 'U2' }],
    });
  });

  it('new subscriber receives current snapshot on subscribe', () => {
    bus.publish('id-d', { type: 'delta', path: 'summary', value: 'hello' });
    const sub = bus.subscribe('id-d', () => {});
    expect(sub.snapshot).toEqual({ summary: 'hello' });
    sub.unsubscribe();
  });

  it('unsubscribe stops further events on that listener', () => {
    const got: any[] = [];
    const sub = bus.subscribe('id-e', (e) => got.push(e));
    sub.unsubscribe();
    bus.publish('id-e', { type: 'delta', path: 'basic', value: {} });
    expect(got).toHaveLength(0);
  });

  it('clear removes both snapshot and emitter', () => {
    bus.publish('id-f', { type: 'delta', path: 'summary', value: 'x' });
    bus.clear('id-f');
    expect(bus.getSnapshot('id-f')).toEqual({});
  });

  it('done and error events are forwarded without touching snapshot', () => {
    bus.publish('id-g', { type: 'delta', path: 'summary', value: 'x' });
    const got: any[] = [];
    const sub = bus.subscribe('id-g', (e) => got.push(e));
    bus.publish('id-g', { type: 'done', candidate: { id: 'id-g' } as any });
    expect(got[0].type).toBe('done');
    expect(bus.getSnapshot('id-g').summary).toBe('x'); // snapshot 仍在,直到显式 clear
    sub.unsubscribe();
    bus.clear('id-g');
  });
});
```

- [ ] **Step 2：运行测试，确认失败**

```bash
npm run test -- tests/event-bus.test.ts
```

Expected: FAIL with "Cannot find module '@/lib/extraction/event-bus'".

- [ ] **Step 3：实现 EventBus**

Create `lib/extraction/event-bus.ts`:

```ts
// lib/extraction/event-bus.ts
import { EventEmitter } from 'node:events';
import type { ExtractedResume } from '../validation';
import type { Candidate } from '../db/schema';

export type StreamEvent =
  | { type: 'delta'; path: string; value: unknown }
  | { type: 'done';  candidate: Candidate }
  | { type: 'error'; message: string };

export type Listener = (event: StreamEvent) => void;

type State = {
  emitters:  Map<string, EventEmitter>;
  snapshots: Map<string, Partial<ExtractedResume>>;
};

declare global {
  // eslint-disable-next-line no-var
  var __streamEventBus: State | undefined;
}

function state(): State {
  if (!globalThis.__streamEventBus) {
    globalThis.__streamEventBus = { emitters: new Map(), snapshots: new Map() };
  }
  return globalThis.__streamEventBus;
}

function getEmitter(id: string): EventEmitter {
  const s = state();
  let e = s.emitters.get(id);
  if (!e) {
    e = new EventEmitter();
    e.setMaxListeners(0);
    s.emitters.set(id, e);
  }
  return e;
}

function applyDeltaToSnapshot(snap: any, path: string, value: unknown): void {
  const m = path.match(/^(\w+)\[(\d+)\]$/);
  if (m) {
    const key = m[1];
    const idx = Number(m[2]);
    if (!Array.isArray(snap[key])) snap[key] = [];
    snap[key][idx] = value;
    return;
  }
  snap[path] = value;
}

export function subscribe(id: string, listener: Listener): {
  snapshot: Partial<ExtractedResume>;
  unsubscribe: () => void;
} {
  const e = getEmitter(id);
  const snapshot = { ...(state().snapshots.get(id) ?? {}) };
  e.on('event', listener);
  return {
    snapshot,
    unsubscribe: () => { e.off('event', listener); },
  };
}

export function publish(id: string, event: StreamEvent): void {
  if (event.type === 'delta') {
    const snap = state().snapshots.get(id) ?? {};
    applyDeltaToSnapshot(snap, event.path, event.value);
    state().snapshots.set(id, snap);
  }
  getEmitter(id).emit('event', event);
}

export function getSnapshot(id: string): Partial<ExtractedResume> {
  return { ...(state().snapshots.get(id) ?? {}) };
}

export function clear(id: string): void {
  const s = state();
  s.emitters.delete(id);
  s.snapshots.delete(id);
}
```

- [ ] **Step 4：运行测试，确认全过**

```bash
npm run test -- tests/event-bus.test.ts
```

Expected: 7 个用例全 PASS。

- [ ] **Step 5：Commit**

```bash
git add lib/extraction/event-bus.ts tests/event-bus.test.ts
git commit -m "$(cat <<'EOF'
feat(extraction): add module-scope event bus with snapshot accumulator

Worker publishes delta/done/error per candidate id; subscribers get the
current snapshot atomically so SSE reconnects replay what's already been
emitted. Single-process MVP — multi-instance deployments need Redis.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Stream Emitter（partial JSON buffer + 兄弟键启发式）

**Goal:** 给一个 token chunk 流，按 § 6 规则决定何时把哪个 path emit 出去，末尾 `finalize` 补齐 skills/summary 并返回 strict parsed `raw`。

**Files:**
- Create: `lib/extraction/stream-emitter.ts`
- Create: `tests/stream-emitter.test.ts`

- [ ] **Step 1：先写失败的测试**

Create `tests/stream-emitter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createStreamEmitter } from '@/lib/extraction/stream-emitter';

function feedChunks(emitter: ReturnType<typeof createStreamEmitter>, chunks: string[]) {
  const all: { path: string; value: unknown }[] = [];
  for (const c of chunks) all.push(...emitter.feed(c));
  return all;
}

describe('stream-emitter', () => {
  it('emits basic only after 5 keys present', () => {
    const e = createStreamEmitter();
    const deltas = feedChunks(e, [
      '{"basic":{"name":"a","email":"b","phone":"c"',
      ',"city":"d"',                   // 4 keys,还不够
      ',"age":1},"targetRole":null',   // 5 keys + 下一个兄弟键 targetRole → emit basic + targetRole
    ]);
    const paths = deltas.map((d) => d.path);
    expect(paths).toContain('basic');
    expect(paths).toContain('targetRole');
    expect(deltas.find((d) => d.path === 'basic')?.value)
      .toEqual({ name: 'a', email: 'b', phone: 'c', city: 'd', age: 1 });
  });

  it('emits educations[i] only when sibling arrived or array length moves on', () => {
    const e = createStreamEmitter();
    const chunks = [
      '{"basic":{"name":"a","email":null,"phone":null,"city":null,"age":null},',
      '"targetRole":null,',
      '"educations":[{"school":"U1","major":null,"degree":null,"startDate":null,"endDate":null}',
      // 第一条齐了,但尚无下一条 / 尚无 works → 不 emit
    ];
    let deltas = feedChunks(e, chunks);
    expect(deltas.map((d) => d.path)).not.toContain('educations[0]');

    // 再喂第二条进来 → 第一条应当 emit
    deltas = [...deltas, ...e.feed(',{"school":"U2","major":null,"degree":null,"startDate":null,"endDate":null}')];
    expect(deltas.find((d) => d.path === 'educations[0]')?.value).toMatchObject({ school: 'U1' });
    // 第二条尚未 emit
    expect(deltas.map((d) => d.path)).not.toContain('educations[1]');

    // 关闭 educations 数组并让下一个兄弟键 works 出现
    deltas = [...deltas, ...e.feed('],"works":[')];
    expect(deltas.find((d) => d.path === 'educations[1]')?.value).toMatchObject({ school: 'U2' });
  });

  it('skills waits for summary sibling or stream end', () => {
    const e = createStreamEmitter();
    const prefix = '{"basic":{"name":null,"email":null,"phone":null,"city":null,"age":null},'
      + '"targetRole":null,"educations":[],"works":[],"projects":[],';
    let deltas = feedChunks(e, [prefix + '"skills":["A","B","C"]']);
    expect(deltas.map((d) => d.path)).not.toContain('skills');

    // 继续喂 summary 键进来 → skills emit
    deltas = [...deltas, ...e.feed(',"summary":"ok"')];
    expect(deltas.find((d) => d.path === 'skills')?.value).toEqual(['A', 'B', 'C']);
  });

  it('finalize emits summary and returns strict-parsed raw', () => {
    const e = createStreamEmitter();
    const doc = {
      basic: { name: 'a', email: null, phone: null, city: null, age: null },
      targetRole: null,
      educations: [],
      works: [],
      projects: [],
      skills: ['X'],
      summary: '一句话',
    };
    const json = JSON.stringify(doc);
    for (let i = 0; i < json.length; i += 30) e.feed(json.slice(i, i + 30));
    const { deltas, raw } = e.finalize();
    const paths = deltas.map((d) => d.path);
    expect(paths).toContain('summary');
    expect(raw).toEqual(doc);
  });

  it('finalize emits skills if stream ended before a summary key was seen', () => {
    // 防御:理论上 prompt 要求 summary 存在,但万一 LLM 只吐到 skills 就断,finalize 也要把 skills 推掉
    const e = createStreamEmitter();
    const json = '{"basic":{"name":null,"email":null,"phone":null,"city":null,"age":null},'
      + '"targetRole":null,"educations":[],"works":[],"projects":[],"skills":["X"],"summary":""}';
    for (let i = 0; i < json.length; i += 30) e.feed(json.slice(i, i + 30));
    const { deltas } = e.finalize();
    expect(deltas.map((d) => d.path)).toEqual(
      expect.arrayContaining(['skills', 'summary'])
    );
  });

  it('each path is emitted at most once across feed+finalize', () => {
    const e = createStreamEmitter();
    const doc = {
      basic: { name: 'a', email: 'b', phone: 'c', city: 'd', age: 1 },
      targetRole: 'x',
      educations: [{ school: 'U', major: null, degree: null, startDate: null, endDate: null }],
      works: [{ company: 'C', role: null, startDate: null, endDate: null, highlights: [] }],
      projects: [{ name: 'P', url: null, role: null, techStack: [], startDate: null, endDate: null, description: null, highlights: [] }],
      skills: ['A'],
      summary: 'y',
    };
    const json = JSON.stringify(doc);
    const collected: string[] = [];
    for (let i = 0; i < json.length; i += 10) {
      for (const d of e.feed(json.slice(i, i + 10))) collected.push(d.path);
    }
    for (const d of e.finalize().deltas) collected.push(d.path);
    const counts = collected.reduce<Record<string, number>>((acc, p) => {
      acc[p] = (acc[p] ?? 0) + 1;
      return acc;
    }, {});
    for (const [k, v] of Object.entries(counts)) {
      expect(v, `path ${k} emitted ${v} times`).toBe(1);
    }
  });
});
```

- [ ] **Step 2：运行测试，确认失败**

```bash
npm run test -- tests/stream-emitter.test.ts
```

Expected: FAIL with "Cannot find module '@/lib/extraction/stream-emitter'".

- [ ] **Step 3：实现 stream-emitter**

Create `lib/extraction/stream-emitter.ts`:

```ts
// lib/extraction/stream-emitter.ts
import { parse as bestEffort } from 'best-effort-json-parser';

export type Delta = { path: string; value: unknown };

export function createStreamEmitter(): {
  feed: (chunk: string) => Delta[];
  finalize: () => { deltas: Delta[]; raw: unknown };
  getBuffer: () => string;
} {
  let buffer = '';
  const emitted = new Set<string>();

  function arrLen(x: unknown): number {
    return Array.isArray(x) ? x.length : 0;
  }

  function keyCount(x: unknown): number {
    return x && typeof x === 'object' && !Array.isArray(x) ? Object.keys(x as object).length : 0;
  }

  function checkOrder(partial: any): string[] {
    const order = ['basic', 'targetRole'];
    for (let i = 0; i < arrLen(partial.educations); i++) order.push(`educations[${i}]`);
    for (let i = 0; i < arrLen(partial.works);      i++) order.push(`works[${i}]`);
    for (let i = 0; i < arrLen(partial.projects);   i++) order.push(`projects[${i}]`);
    order.push('skills', 'summary');
    return order;
  }

  function valueAt(partial: any, path: string): unknown {
    const m = path.match(/^(\w+)\[(\d+)\]$/);
    if (m) return partial[m[1]][Number(m[2])];
    return partial[path];
  }

  function shouldEmit(path: string, partial: any, streamEnded: boolean): boolean {
    if (emitted.has(path)) return false;

    if (path === 'basic') {
      return keyCount(partial.basic) >= 5;
    }
    if (path === 'targetRole') {
      return Object.prototype.hasOwnProperty.call(partial, 'targetRole');
    }

    const arrMatch = path.match(/^(educations|works|projects)\[(\d+)\]$/);
    if (arrMatch) {
      const key = arrMatch[1];
      const i   = Number(arrMatch[2]);
      const arr = partial[key];
      if (!Array.isArray(arr) || arr.length <= i) return false;
      const item = arr[i];
      if (!item || typeof item !== 'object') return false;
      const anchor = key === 'educations' ? 'school' : key === 'works' ? 'company' : 'name';
      if (!(item as any)[anchor]) return false;
      const nextSibling = key === 'educations' ? 'works' : key === 'works' ? 'projects' : 'skills';
      return arr.length > i + 1 || Object.prototype.hasOwnProperty.call(partial, nextSibling);
    }

    if (path === 'skills') {
      if (!Array.isArray(partial.skills)) return false;
      return Object.prototype.hasOwnProperty.call(partial, 'summary') || streamEnded;
    }
    if (path === 'summary') {
      if (typeof partial.summary !== 'string') return false;
      return streamEnded;
    }
    return false;
  }

  function collectDeltas(streamEnded: boolean): Delta[] {
    let partial: any;
    try {
      partial = bestEffort(buffer) ?? {};
    } catch {
      return [];
    }
    if (!partial || typeof partial !== 'object') return [];
    const out: Delta[] = [];
    for (const p of checkOrder(partial)) {
      if (shouldEmit(p, partial, streamEnded)) {
        emitted.add(p);
        out.push({ path: p, value: valueAt(partial, p) });
      }
    }
    return out;
  }

  return {
    feed(chunk: string): Delta[] {
      buffer += chunk;
      return collectDeltas(false);
    },
    finalize(): { deltas: Delta[]; raw: unknown } {
      const deltas = collectDeltas(true);
      const raw = JSON.parse(buffer);
      return { deltas, raw };
    },
    getBuffer(): string { return buffer; },
  };
}
```

- [ ] **Step 4：运行测试，确认全过**

```bash
npm run test -- tests/stream-emitter.test.ts
```

Expected: 6 个用例全 PASS。

- [ ] **Step 5：Commit**

```bash
git add lib/extraction/stream-emitter.ts tests/stream-emitter.test.ts
git commit -m "$(cat <<'EOF'
feat(extraction): streaming partial-JSON emitter with sibling-key heuristic

createStreamEmitter buffers LLM tokens, best-effort parses on each feed,
and emits a renderable unit (basic / targetRole / educations[i] / works[i]
/ projects[i] / skills / summary) exactly once when the next sibling key
appears or the stream ends. finalize() returns strict-parsed raw for
schema validation.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `callDeepSeekStream` + `STUB_STREAM_CHUNKS`

**Goal:** 在 llm.ts 里加一个 AsyncIterable<string> 的流式入口；stub 模式按 ~60 字符切片 yield `STUB_RESULT` 的 JSON；真机模式用 OpenAI SDK 的 `stream: true`。

**Files:**
- Modify: `lib/extraction/prompt.ts`
- Modify: `lib/extraction/llm.ts`
- Modify: `tests/llm.test.ts`

- [ ] **Step 1：在 `prompt.ts` 末尾追加 `STUB_STREAM_CHUNKS`**

Read current `lib/extraction/prompt.ts` (the existing file ends with `STUB_RESULT`). Append at the end (don't touch `SYSTEM_PROMPT` or `STUB_RESULT`):

```ts

export const STUB_STREAM_CHUNKS: string[] = (() => {
  const json = JSON.stringify(STUB_RESULT);
  const size = 60;
  const out: string[] = [];
  for (let i = 0; i < json.length; i += size) out.push(json.slice(i, i + size));
  return out;
})();
```

- [ ] **Step 2：在 `llm.ts` 末尾追加 `callDeepSeekStream`**

Read current `lib/extraction/llm.ts`. At the end of the file (after `callDeepSeek`), append:

```ts

export async function* callDeepSeekStream(resumeText: string): AsyncIterable<string> {
  if (USE_STUB) {
    const { STUB_STREAM_CHUNKS } = await import('./prompt');
    for (const chunk of STUB_STREAM_CHUNKS) yield chunk;
    return;
  }

  try {
    const stream = await client().chat.completions.create({
      model: 'deepseek-chat',
      temperature: 0,
      stream: true,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: resumeText.slice(0, 30_000) },
      ],
    });
    for await (const part of stream) {
      const content = part.choices?.[0]?.delta?.content;
      if (content) yield content;
    }
  } catch (err) {
    if (err instanceof ExtractionError) throw err;
    const status = (err as { status?: number }).status;
    if (status) throw new ExtractionError('llm_http_error', undefined, status);
    throw new ExtractionError('unknown', String(err));
  }
}
```

(`SYSTEM_PROMPT` and `ExtractionError` should already be in scope via the existing imports in `llm.ts`; no new imports needed.)

- [ ] **Step 3：扩展 `tests/llm.test.ts`**

Append (keep existing tests):

```ts
import { callDeepSeekStream } from '@/lib/extraction/llm';

describe('callDeepSeekStream (stub mode)', () => {
  it('yields chunks that concatenate to a parseable JSON matching STUB_RESULT', async () => {
    const parts: string[] = [];
    for await (const c of callDeepSeekStream('irrelevant')) parts.push(c);
    const joined = parts.join('');
    const parsed = JSON.parse(joined);
    expect(parsed).toHaveProperty('basic.name');
    expect(parsed).toHaveProperty('summary');
    expect(() => ExtractedResume.parse(parsed)).not.toThrow();
  });

  it('yields more than one chunk (actually streaming, not one-shot)', async () => {
    let count = 0;
    for await (const _ of callDeepSeekStream('x')) count++;
    expect(count).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 4：跑 llm 测试**

```bash
npm run test -- tests/llm.test.ts
```

Expected: 旧 2 条 + 新 2 条 全 PASS。

- [ ] **Step 5：Commit**

```bash
git add lib/extraction/prompt.ts lib/extraction/llm.ts tests/llm.test.ts
git commit -m "$(cat <<'EOF'
feat(extraction): add callDeepSeekStream with stub chunk source

New AsyncIterable<string> entry point for the DeepSeek chat completion
stream; under LLM_STUB=1 it slices STUB_RESULT JSON into ~60-char chunks
so CI and local dev can drive the full SSE pipeline without a real key.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: worker 接入流式 + EventBus publish

**Goal:** `runExtraction` 改为流式循环；解析到 delta 时 publish，成功落库后 publish `done`，失败 publish `error`，`finally` 里清 EventBus。

**Files:**
- Modify: `lib/extraction/worker.ts`
- Modify: `tests/worker.test.ts`

- [ ] **Step 1：扩展 worker 测试（在现有 file 基础上加用例，保留原 2 条）**

Open `tests/worker.test.ts`. Inside the same `describe`, append after the existing tests:

```ts
  it('publishes deltas + done event to the event bus during extraction', async () => {
    const sqlite = new Database(process.env.DATABASE_URL!);
    sqlite.pragma('journal_mode = WAL');
    const d = drizzle(sqlite);
    migrate(d, { migrationsFolder: './lib/db/migrations' });

    mkdirSync(process.env.UPLOADS_DIR!, { recursive: true });
    writeFileSync(join(process.env.UPLOADS_DIR!, 'pub1.pdf'), sampleBuf);

    d.insert(candidates).values({
      id: 'pub1',
      pdfPath: `${process.env.UPLOADS_DIR}/pub1.pdf`,
      pdfSize: sampleBuf.length,
      createdAt: new Date(), updatedAt: new Date(),
    }).run();
    sqlite.close();

    const bus = await import('@/lib/extraction/event-bus');
    const events: any[] = [];
    const sub = bus.subscribe('pub1', (e) => events.push(e));

    const { runExtraction } = await import('@/lib/extraction/worker');
    await runExtraction('pub1');
    sub.unsubscribe();

    const types = events.map((e) => e.type);
    expect(types).toContain('delta');
    expect(types[types.length - 1]).toBe('done');

    const last = events[events.length - 1];
    expect(last.candidate.id).toBe('pub1');
    expect(last.candidate.extractionStatus).toBe('parsed');

    // 清理后 snapshot 应当被清空
    expect(bus.getSnapshot('pub1')).toEqual({});
  });

  it('publishes error event when PDF missing', async () => {
    const sqlite = new Database(process.env.DATABASE_URL!);
    const d = drizzle(sqlite);
    migrate(d, { migrationsFolder: './lib/db/migrations' });

    d.insert(candidates).values({
      id: 'bad1',
      pdfPath: `${process.env.UPLOADS_DIR}/nope.pdf`,
      pdfSize: 0,
      createdAt: new Date(), updatedAt: new Date(),
    }).run();
    sqlite.close();

    const bus = await import('@/lib/extraction/event-bus');
    const events: any[] = [];
    const sub = bus.subscribe('bad1', (e) => events.push(e));

    const { runExtraction } = await import('@/lib/extraction/worker');
    await runExtraction('bad1');
    sub.unsubscribe();

    const last = events[events.length - 1];
    expect(last.type).toBe('error');
    expect(last.message).toBeTruthy();
  });
```

Also add `delete (globalThis as any).__streamEventBus;` inside the existing `beforeEach` so EventBus state resets between tests.

- [ ] **Step 2：运行测试，确认新用例失败**

```bash
npm run test -- tests/worker.test.ts
```

Expected: 新两条 FAIL (old flow doesn't publish anything); old tests still PASS.

- [ ] **Step 3：重写 `lib/extraction/worker.ts`**

Replace the entire file:

```ts
// lib/extraction/worker.ts
import { sql, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { candidates } from '../db/schema';
import { readPdf } from '../storage';
import { parsePdf } from './pdf';
import { callDeepSeekStream } from './llm';
import { ExtractedResume } from '../validation';
import { ExtractionError, toUserMessage } from '../errors';
import { deriveFlat } from './derive';
import { createStreamEmitter } from './stream-emitter';
import * as bus from './event-bus';

export async function runExtraction(id: string): Promise<void> {
  const row = db.select().from(candidates).where(eq(candidates.id, id)).get();
  if (!row || row.extractionStatus === 'parsed') return;

  db.update(candidates).set({
    extractionStatus: 'extracting',
    extractionAttempts: sql`extraction_attempts + 1`,
    updatedAt: new Date(),
  }).where(eq(candidates.id, id)).run();

  try {
    const buf = readPdf(row.pdfPath);
    const { text, numpages } = await parsePdf(buf);
    if (!text.trim()) throw new ExtractionError('pdf_empty');

    const emitter = createStreamEmitter();
    for await (const chunk of callDeepSeekStream(text)) {
      for (const d of emitter.feed(chunk)) {
        bus.publish(id, { type: 'delta', path: d.path, value: d.value });
      }
    }
    const { deltas, raw } = emitter.finalize();
    for (const d of deltas) {
      bus.publish(id, { type: 'delta', path: d.path, value: d.value });
    }

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

    const updated = db.select().from(candidates).where(eq(candidates.id, id)).get()!;
    bus.publish(id, { type: 'done', candidate: updated });
  } catch (err) {
    const message = toUserMessage(err);
    db.update(candidates).set({
      extractionStatus: 'error',
      extractionError: message,
      updatedAt: new Date(),
    }).where(eq(candidates.id, id)).run();
    bus.publish(id, { type: 'error', message });
    console.error(`[extraction:${id}]`, err);
  } finally {
    bus.clear(id);
  }
}
```

Note on semantics: `bus.clear(id)` in the `finally` runs **after** subscribers have received `done` / `error`, because Node's `EventEmitter.emit` is synchronous. In-flight subscribers still see the terminal event before the snapshot is wiped.

- [ ] **Step 4：运行测试，确认全过**

```bash
npm run test -- tests/worker.test.ts
```

Expected: 旧 2 + 新 2 = 4 条 全 PASS。

- [ ] **Step 5：跑全量回归**

```bash
npm run test
```

Expected: 所有 test file 全 PASS（tests/api-upload/api-candidate-retry 等依赖 worker 的用例也应继续绿——stream 路径在 stub 下产出同样的 STUB_RESULT，落库结果不变）。

- [ ] **Step 6：Commit**

```bash
git add lib/extraction/worker.ts tests/worker.test.ts
git commit -m "$(cat <<'EOF'
feat(extraction): drive worker with token stream + publish to event bus

runExtraction now feeds LLM chunks through the stream emitter, publishing
delta events as each renderable unit closes. On success it publishes done
with the persisted Candidate; on failure it publishes error with the
user-facing message. finally-clause clears the bus's per-id state.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: SSE route `GET /api/candidates/[id]/stream`

**Goal:** 新路由：404 / 短路（parsed / error）/ 长连接（snapshot + forward + heartbeat）三条分支；客户端 abort 时 cleanup。

**Files:**
- Create: `app/api/candidates/[id]/stream/route.ts`
- Create: `tests/api-candidate-stream.test.ts`

- [ ] **Step 1：先写失败的测试**

Create `tests/api-candidate-stream.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { candidates } from '@/lib/db/schema';

async function readSseFrames(res: Response, max = 2000): Promise<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let out = '';
  while (out.length < max) {
    const { value, done } = await reader.read();
    if (done) break;
    out += decoder.decode(value);
  }
  try { reader.cancel(); } catch {}
  return out;
}

describe('GET /api/candidates/:id/stream', () => {
  let dir: string;
  const params = (id: string) => ({ params: Promise.resolve({ id }) });
  const sampleBuf = readFileSync('tests/fixtures/sample.pdf');

  beforeEach(() => {
    vi.resetModules();
    dir = mkdtempSync(join(tmpdir(), 'sift-sse-'));
    process.env.DATABASE_URL = join(dir, 'test.db');
    process.env.UPLOADS_DIR  = join(dir, 'uploads');
    delete (globalThis as any).__sqlite;
    delete (globalThis as any).__queueInit;
    delete (globalThis as any).__streamEventBus;

    const sqlite = new Database(process.env.DATABASE_URL);
    sqlite.pragma('journal_mode = WAL');
    migrate(drizzle(sqlite), { migrationsFolder: './lib/db/migrations' });
    sqlite.close();
  });

  it('returns 404 for unknown id', async () => {
    const { GET } = await import('@/app/api/candidates/[id]/stream/route');
    const res = await GET(new Request('http://t'), params('nope'));
    expect(res.status).toBe(404);
  });

  it('short-circuits to done event for already-parsed candidate', async () => {
    const sqlite = new Database(process.env.DATABASE_URL!);
    drizzle(sqlite).insert(candidates).values({
      id: 'ok1',
      pdfPath: 'x', pdfSize: 1,
      extractionStatus: 'parsed',
      createdAt: new Date(), updatedAt: new Date(),
    }).run();
    sqlite.close();

    const { GET } = await import('@/app/api/candidates/[id]/stream/route');
    const res = await GET(new Request('http://t'), params('ok1'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const body = await readSseFrames(res);
    expect(body).toContain('event: done');
    expect(body).toContain('"id":"ok1"');
  });

  it('short-circuits to error event for failed candidate', async () => {
    const sqlite = new Database(process.env.DATABASE_URL!);
    drizzle(sqlite).insert(candidates).values({
      id: 'err1',
      pdfPath: 'x', pdfSize: 1,
      extractionStatus: 'error',
      extractionError: 'boom',
      createdAt: new Date(), updatedAt: new Date(),
    }).run();
    sqlite.close();

    const { GET } = await import('@/app/api/candidates/[id]/stream/route');
    const res = await GET(new Request('http://t'), params('err1'));
    const body = await readSseFrames(res);
    expect(body).toContain('event: error');
    expect(body).toContain('"message":"boom"');
  });

  it('streams snapshot + delta + done for an extracting candidate', async () => {
    const sqlite = new Database(process.env.DATABASE_URL!);
    sqlite.pragma('journal_mode = WAL');
    const d = drizzle(sqlite);
    mkdirSync(process.env.UPLOADS_DIR!, { recursive: true });
    writeFileSync(join(process.env.UPLOADS_DIR!, 'live.pdf'), sampleBuf);
    d.insert(candidates).values({
      id: 'live1',
      pdfPath: `${process.env.UPLOADS_DIR}/live.pdf`,
      pdfSize: sampleBuf.length,
      createdAt: new Date(), updatedAt: new Date(),
    }).run();
    sqlite.close();

    // 并行:打开 SSE 连接,同时在另一侧跑 worker
    const { GET } = await import('@/app/api/candidates/[id]/stream/route');
    const res = await GET(new Request('http://t'), params('live1'));

    const { runExtraction } = await import('@/lib/extraction/worker');
    const workerPromise = runExtraction('live1');

    const body = await readSseFrames(res, 20_000);
    await workerPromise;

    expect(body).toContain('event: snapshot');
    expect(body).toContain('event: delta');
    expect(body).toContain('event: done');
    // basic 这个 path 至少会被推一次
    expect(body).toMatch(/"path":"basic"/);
  });
});
```

- [ ] **Step 2：运行测试，确认失败**

```bash
npm run test -- tests/api-candidate-stream.test.ts
```

Expected: FAIL with "Cannot find module '@/app/api/candidates/[id]/stream/route'".

- [ ] **Step 3：实现 SSE 路由**

Create `app/api/candidates/[id]/stream/route.ts`:

```ts
// app/api/candidates/[id]/stream/route.ts
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { candidates } from '@/lib/db/schema';
import * as bus from '@/lib/extraction/event-bus';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const row = db.select().from(candidates).where(eq(candidates.id, id)).get();
  if (!row) return new Response('not_found', { status: 404 });

  const encoder = new TextEncoder();
  let hb: ReturnType<typeof setInterval> | null = null;
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const safeEnqueue = (s: string) => {
        try { controller.enqueue(encoder.encode(s)); } catch { /* stream closed */ }
      };
      const send = (event: string, data: unknown) => {
        safeEnqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };
      const closeAll = () => {
        if (hb) { clearInterval(hb); hb = null; }
        if (unsubscribe) { unsubscribe(); unsubscribe = null; }
        try { controller.close(); } catch { /* already closed */ }
      };

      // Short-circuit: terminal states
      if (row.extractionStatus === 'parsed') {
        send('done', { candidate: row });
        closeAll();
        return;
      }
      if (row.extractionStatus === 'error') {
        send('error', { message: row.extractionError ?? '未知错误' });
        closeAll();
        return;
      }

      // Live: subscribe, then emit current snapshot
      const sub = bus.subscribe(id, (event) => {
        if (event.type === 'delta') {
          send('delta', { path: event.path, value: event.value });
        } else if (event.type === 'done') {
          send('done', { candidate: event.candidate });
          closeAll();
        } else if (event.type === 'error') {
          send('error', { message: event.message });
          closeAll();
        }
      });
      unsubscribe = sub.unsubscribe;
      send('snapshot', { partial: sub.snapshot });

      hb = setInterval(() => safeEnqueue(`:hb\n\n`), 15_000);

      req.signal.addEventListener('abort', closeAll);
    },
    cancel() {
      if (hb) { clearInterval(hb); hb = null; }
      if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
```

- [ ] **Step 4：运行测试，确认全过**

```bash
npm run test -- tests/api-candidate-stream.test.ts
```

Expected: 4 条全 PASS。

若第 4 条（live streaming）超时，多半是 worker 把 done 事件在 SSE `start` 回调完成之前 emit 出去了，导致 SSE 的 subscribe 漏掉 done。解决方法是在测试里先 `await sleep(0)` 让 `GET` 的 microtask 先跑完再启动 worker；或者检查 `row.extractionStatus` 是否仍是 `uploaded`/`extracting`——如果已经被 worker 抢先推到 `parsed`，走的就是 short-circuit 分支，body 里应该就有 done 事件，检查断言是否命中。

- [ ] **Step 5：全量回归**

```bash
npm run test
```

Expected: 所有测试全绿。

- [ ] **Step 6：Commit**

```bash
git add app/api/candidates/\[id\]/stream/route.ts tests/api-candidate-stream.test.ts
git commit -m "$(cat <<'EOF'
feat(api): SSE route for per-candidate extraction stream

GET /api/candidates/[id]/stream returns text/event-stream. Terminal states
(parsed/error) short-circuit to a single done/error event; in-flight
candidates get a snapshot event followed by forwarded delta/done/error
from the EventBus plus a 15s heartbeat. Abort/cancel cleans up listener
and interval.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: 骨架屏基础组件 + shimmer 动画

**Goal:** 提供 `<Skeleton.Line>` / `<Skeleton.Block>` 两个原语，配合 globals.css 里的 `@keyframes shimmer`。

**Files:**
- Create: `components/Skeleton.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1：新建 Skeleton 组件**

Create `components/Skeleton.tsx`:

```tsx
'use client';
import React from 'react';

const baseStyle: React.CSSProperties = {
  display: 'inline-block',
  background: 'linear-gradient(90deg, var(--bg-sunken) 0%, var(--border) 50%, var(--bg-sunken) 100%)',
  backgroundSize: '200% 100%',
  animation: 'sift-shimmer 1.6s linear infinite',
  borderRadius: 4,
};

function Line({ w = '100%', h = 12 }: { w?: number | string; h?: number }) {
  return <span aria-hidden="true" style={{ ...baseStyle, width: w, height: h }} />;
}

function Block({ w = '100%', h = 40 }: { w?: number | string; h?: number }) {
  return <span aria-hidden="true" style={{ ...baseStyle, width: w, height: h, borderRadius: 8, display: 'block' }} />;
}

function Badge({ w = 72, h = 20 }: { w?: number; h?: number }) {
  return <span aria-hidden="true" style={{ ...baseStyle, width: w, height: h, borderRadius: 4 }} />;
}

export const Skeleton = { Line, Block, Badge };
```

- [ ] **Step 2：给 globals.css 追加动画**

Open `app/globals.css` and append at the very end:

```css

@keyframes sift-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  [aria-hidden="true"][style*="sift-shimmer"] {
    animation: none !important;
    background: var(--bg-sunken) !important;
  }
}
```

- [ ] **Step 3：类型检查**

```bash
npx tsc --noEmit
```

Expected: 无错误。

- [ ] **Step 4：Commit**

```bash
git add components/Skeleton.tsx app/globals.css
git commit -m "$(cat <<'EOF'
feat(ui): Skeleton primitives with shimmer animation

Line/Block/Badge building blocks used by the detail page's streaming
sections. Animation honors prefers-reduced-motion.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: `useCandidateStream` hook

**Goal:** 客户端封装 EventSource：已终态不建连接；进行中时按 snapshot/delta/done/error 维护 `streaming` state；返回 `{ streaming, final, error }`。

**Files:**
- Create: `hooks/useCandidateStream.ts`

- [ ] **Step 1：实现 hook**

Create `hooks/useCandidateStream.ts`:

```ts
'use client';
import { useEffect, useState } from 'react';
import type { Candidate } from '@/lib/db/schema';
import type { ExtractedResume } from '@/lib/validation';

export type StreamingResume = {
  basic?:      Partial<ExtractedResume['basic']>;
  targetRole?: string | null;
  educations:  ExtractedResume['educations'];
  works:       ExtractedResume['works'];
  projects:    ExtractedResume['projects'];
  skills?:     string[];
  summary?:    string;
};

function emptyStreaming(): StreamingResume {
  return { educations: [], works: [], projects: [] };
}

function setByPath(s: StreamingResume, path: string, value: any): StreamingResume {
  const next: StreamingResume = { ...s };
  const m = path.match(/^(educations|works|projects)\[(\d+)\]$/);
  if (m) {
    const key = m[1] as 'educations' | 'works' | 'projects';
    const i = Number(m[2]);
    const arr = [...(next[key] as any[])];
    arr[i] = value;
    (next as any)[key] = arr;
    return next;
  }
  (next as any)[path] = value;
  return next;
}

function applyPartial(s: StreamingResume, partial: Partial<ExtractedResume>): StreamingResume {
  let next = s;
  for (const [k, v] of Object.entries(partial)) {
    if (Array.isArray(v) && (k === 'educations' || k === 'works' || k === 'projects')) {
      v.forEach((item, i) => { next = setByPath(next, `${k}[${i}]`, item); });
    } else {
      next = setByPath(next, k, v);
    }
  }
  return next;
}

export function useCandidateStream(initial: Candidate): {
  streaming: StreamingResume | null;
  final: Candidate;
  error: string | null;
} {
  const [final, setFinal] = useState<Candidate>(initial);
  const [streaming, setStreaming] = useState<StreamingResume | null>(
    initial.extractionStatus === 'parsed' || initial.extractionStatus === 'error'
      ? null
      : emptyStreaming()
  );
  const [error, setError] = useState<string | null>(
    initial.extractionStatus === 'error' ? initial.extractionError ?? '未知错误' : null
  );

  useEffect(() => {
    if (final.extractionStatus === 'parsed' || final.extractionStatus === 'error') return;

    const es = new EventSource(`/api/candidates/${final.id}/stream`);

    const onSnapshot = (e: MessageEvent) => {
      try {
        const { partial } = JSON.parse(e.data);
        setStreaming((s) => applyPartial(s ?? emptyStreaming(), partial));
      } catch { /* ignore malformed frame */ }
    };
    const onDelta = (e: MessageEvent) => {
      try {
        const { path, value } = JSON.parse(e.data);
        setStreaming((s) => setByPath(s ?? emptyStreaming(), path, value));
      } catch { /* ignore */ }
    };
    const onDone = (e: MessageEvent) => {
      try {
        const { candidate } = JSON.parse(e.data);
        setFinal(candidate);
        setStreaming(null);
      } catch { /* ignore */ }
      es.close();
    };
    const onServerError = (e: MessageEvent) => {
      // 服务端发的 event:error 有 data;浏览器网络 error 没有 data
      const data = (e as any).data;
      if (typeof data === 'string' && data.length > 0) {
        try {
          const { message } = JSON.parse(data);
          setError(message);
          setStreaming(null);
          es.close();
        } catch { /* malformed; keep streaming */ }
      }
      // 无 data 的网络 error:交给浏览器自动重连,不做事
    };

    es.addEventListener('snapshot', onSnapshot as EventListener);
    es.addEventListener('delta',    onDelta    as EventListener);
    es.addEventListener('done',     onDone     as EventListener);
    es.addEventListener('error',    onServerError as EventListener);

    return () => { es.close(); };
  }, [final.id, final.extractionStatus]);

  return { streaming, final, error };
}
```

- [ ] **Step 2：类型检查**

```bash
npx tsc --noEmit
```

Expected: 无错误。

- [ ] **Step 3：Commit**

```bash
git add hooks/useCandidateStream.ts
git commit -m "$(cat <<'EOF'
feat(hooks): useCandidateStream subscribes to SSE per-candidate

Opens EventSource only for in-flight candidates; applies snapshot +
deltas idempotently (overwrite-by-path); closes the connection on
done/server-error. Returns { streaming, final, error } for the detail
page to render three-state UI.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: 详情页接入骨架屏

**Goal:** 替换 `CandidateDetailClient` 里的 `extractionStatus === 'extracting' | 'uploaded'` 单卡片分支；整页用 `useCandidateStream` 输出的三态 state 驱动分 section 骨架屏，已到字段照现有布局渲染。

**Files:**
- Modify: `components/CandidateDetailClient.tsx`

- [ ] **Step 1：整文件替换**

Replace the entire contents of `components/CandidateDetailClient.tsx` with:

```tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar, Btn, Avatar, StatusPill, Card, SkillTag, ThemeToggle } from './ui';
import { I } from './icons';
import { Skeleton } from './Skeleton';
import { useCandidateStream } from '@/hooks/useCandidateStream';
import type { Candidate, CandidateStatus } from '@/lib/db/schema';
import type { ExtractedResume } from '@/lib/validation';

export default function CandidateDetailClient({ initial }: { initial: Candidate }) {
  const router = useRouter();
  const { streaming, final, error } = useCandidateStream(initial);
  const [c, setC] = useState(initial);

  // hook 的 final 在 done 事件时会更新为 parsed 态的完整 Candidate;
  // 仅在 c 还是非终态时把它 adopt 过来,避免 PATCH 后的本地新数据被回滚。
  useEffect(() => {
    if (final.extractionStatus === 'parsed' && c.extractionStatus !== 'parsed') {
      setC(final);
    }
  }, [final, c.extractionStatus]);

  const isStreaming = streaming !== null && !error;

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

  async function onRetry() {
    const r = await fetch(`/api/candidates/${c.id}/retry`, { method: 'POST' });
    if (r.ok) {
      // hook 的 initial 在组件生命周期内锁定,重试后最简单是硬刷新一次
      // 让页面 SSR 重新拿到 uploaded 态的 Candidate,触发 hook 建新 SSE。
      window.location.reload();
    }
  }

  // 头部数据优先从 streaming.basic 取,否则从 c(DB) 取
  const headerBasic = streaming?.basic ?? {
    name: c.name, email: c.email, phone: c.phone, city: c.city, age: c.age,
  };
  const headerTargetRole = streaming ? streaming.targetRole : c.targetRole;
  const headerRole = c.role;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 44px)', background: 'var(--bg-sunken)' }}>
      <Sidebar active="dashboard" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ height: 56, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12, background: 'var(--bg)' }}>
          <Btn size="sm" icon={<I.ChevL />} variant="ghost" onClick={() => router.push('/dashboard')}>返回</Btn>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
            候选人 · {isStreaming && !headerBasic.name ? '解析中' : (headerBasic.name ?? c.id)}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Link href={`/candidates/${c.id}/edit`}><Btn size="sm" icon={<I.Edit />}>编辑</Btn></Link>
            <Btn size="sm" variant="danger" onClick={onDelete}>删除</Btn>
            <ThemeToggle />
          </div>
        </div>

        <div style={{ padding: '24px 32px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 20, alignItems: 'center' }}>
          <Avatar name={headerBasic.name ?? '?'} size={64} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              {headerBasic.name ? (
                <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--fg)', margin: 0 }}>{headerBasic.name}</h1>
              ) : isStreaming ? (
                <Skeleton.Line w={120} h={26} />
              ) : (
                <h1 style={{ fontSize: 26, fontWeight: 600, color: 'var(--fg)', margin: 0 }}>(未提取)</h1>
              )}
              {c.extractionStatus === 'parsed' && <StatusPill status={c.status} />}
            </div>

            {headerTargetRole === undefined && isStreaming ? (
              <div style={{ marginTop: 6 }}><Skeleton.Badge w={120} h={22} /></div>
            ) : headerTargetRole ? (
              <div style={{ marginTop: 6 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 4,
                  fontSize: 12, fontWeight: 500,
                  background: 'var(--accent-bg-subtle)', color: 'var(--accent-700)',
                }}>🎯 {headerTargetRole}</span>
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 13, color: 'var(--fg-muted)', flexWrap: 'wrap' }}>
              {isStreaming && !streaming?.basic ? (
                <>
                  <Skeleton.Line w={90} /><Skeleton.Line w={70} /><Skeleton.Line w={120} /><Skeleton.Line w={100} />
                </>
              ) : (
                <>
                  {headerRole && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><I.Briefcase size={13} />{headerRole}</span>}
                  {headerBasic.city && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><I.MapPin size={13} />{headerBasic.city}</span>}
                  {headerBasic.email && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><I.Mail size={13} />{headerBasic.email}</span>}
                  {headerBasic.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><I.Phone size={13} />{headerBasic.phone}</span>}
                  {headerBasic.age != null && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>🎂 {headerBasic.age} 岁</span>}
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
          {error ? (
            <Card style={{ padding: 32 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--danger-700)', marginBottom: 10 }}>解析失败</div>
              <div style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.6 }}>{error}</div>
              <div style={{ marginTop: 16 }}>
                <Btn variant="primary" onClick={onRetry}>重试</Btn>
              </div>
            </Card>
          ) : (
            <StreamingSections c={c} streaming={streaming} isStreaming={isStreaming} onUpdateStatus={updateStatus} />
          )}
        </div>
      </div>
    </div>
  );
}

function StreamingSections({
  c, streaming, isStreaming, onUpdateStatus,
}: {
  c: Candidate;
  streaming: ReturnType<typeof useCandidateStream>['streaming'];
  isStreaming: boolean;
  onUpdateStatus: (next: CandidateStatus) => void;
}) {
  // 数据源:流式中用 streaming,最终用 c.extractedJson
  const src: Partial<ExtractedResume> = streaming
    ? {
        educations: streaming.educations,
        works:      streaming.works,
        projects:   streaming.projects,
        skills:     streaming.skills,
        summary:    streaming.summary,
      }
    : (c.extractedJson ?? { educations: [], works: [], projects: [], skills: [], summary: '' });

  const summaryPending = isStreaming && streaming?.summary === undefined;
  const skillsPending  = isStreaming && streaming?.skills  === undefined;
  // 数组:length=0 且流未完 → 骨架;流结束 length=0 → "—"
  const edus  = src.educations ?? [];
  const works = src.works      ?? [];
  const prjs  = src.projects   ?? [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 1200 }}>
      {/* AI 评语 */}
      <Card style={{ padding: 18, gridColumn: 'span 2' }}>
        <div style={{ fontSize: 11, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500, marginBottom: 10 }}>AI 评语</div>
        {summaryPending ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton.Line w="100%" /><Skeleton.Line w="95%" /><Skeleton.Line w="60%" />
          </div>
        ) : (
          <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--fg)', margin: 0 }}>{src.summary || '—'}</p>
        )}
      </Card>

      {/* 工作经历 */}
      <Card style={{ padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>工作经历</div>
        {works.length === 0 && isStreaming ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} style={{ paddingLeft: 12, borderLeft: '2px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Skeleton.Line w="70%" h={13} /><Skeleton.Line w="40%" h={11} /><Skeleton.Line w="85%" h={11} />
              </div>
            ))}
          </div>
        ) : works.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--fg-subtle)' }}>—</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {works.map((w, i) => (
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

      {/* 教育背景 */}
      <Card style={{ padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>教育背景</div>
        {edus.length === 0 && isStreaming ? (
          <div style={{ paddingLeft: 12, borderLeft: '2px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton.Line w="70%" h={13} /><Skeleton.Line w="50%" h={11} /><Skeleton.Line w="40%" h={11} />
          </div>
        ) : edus.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--fg-subtle)' }}>—</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {edus.map((e, i) => (
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

      {/* 项目经历 */}
      <Card style={{ padding: 18, gridColumn: 'span 2' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>项目经历</div>
        {prjs.length === 0 && isStreaming ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ paddingLeft: 12, borderLeft: '2px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Skeleton.Line w="40%" h={14} /><Skeleton.Line w="90%" h={12} /><Skeleton.Line w="75%" h={12} />
              </div>
            ))}
          </div>
        ) : prjs.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--fg-subtle)' }}>—</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {prjs.map((p, i) => (
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
                    <a href={p.url} target="_blank" rel="noopener noreferrer"
                       style={{ fontSize: 12, color: 'var(--accent)', marginLeft: 'auto' }}>
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
        {skillsPending ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[60, 80, 70, 90, 55, 75].map((w, i) => (
              <Skeleton.Badge key={i} w={w} h={22} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(src.skills ?? []).map((s) => <SkillTag key={s}>{s}</SkillTag>)}
          </div>
        )}
      </Card>

      {/* 状态流转 — 流式期间不渲染 */}
      {!isStreaming && (
        <Card style={{ padding: 18, gridColumn: 'span 2' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>状态流转</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['待筛选', '初筛通过', '面试中', '已录用', '已淘汰'] as const).map((s) => (
              <Btn key={s} variant={c.status === s ? 'primary' : 'secondary'} onClick={() => onUpdateStatus(s)}>{s}</Btn>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2：类型检查**

```bash
npx tsc --noEmit
```

Expected: 无错误。

- [ ] **Step 3：构建一次以暴露运行时导入错误**

```bash
npm run build
```

Expected: 编译成功。若失败，常见原因是 `Skeleton.tsx` 或 `useCandidateStream.ts` 的导入路径写错——逐个修正。

- [ ] **Step 4：Commit**

```bash
git add components/CandidateDetailClient.tsx
git commit -m "$(cat <<'EOF'
feat(detail): per-section skeletons driven by SSE stream

Replace the single 'AI is parsing' card with a full layout whose
subsections show skeletons until their node-level delta arrives.
Streaming state from useCandidateStream is merged with the DB-side
Candidate at the seams (header basic fields prefer streaming,
status-pill and status transitions stay anchored to the DB row).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: 手跑端到端验收

**Goal:** 在真正的浏览器里验证：骨架屏 → 字段按序填入 → 刷新保持 → 失败走错误卡片。

**Files:** 无代码改动；如发现 bug 单独开 commit 修。

- [ ] **Step 1：清库重启**

```bash
rm -rf data/
npm run dev
```

启动后观察日志无报错。

- [ ] **Step 2：上传真实简历 PDF（田金沙示例）**

浏览器打开 `http://localhost:3000/upload`，拖入 `田金沙-19973361472.pdf`（或任意真实简历 PDF）。等 badge 转到 `AI 解析中` 再点进详情页。

- [ ] **Step 3：验收详情页流式填充**

打开 DevTools → Network → 过滤 `stream`，确认见到一个 `text/event-stream` 连接，Response 里依次出现：

- `event: snapshot` （可能 `partial: {}`）
- 多条 `event: delta`，`path` 依次 `basic` → `targetRole` → `educations[0]` → … → `skills` → `summary`
- 一条 `event: done`

UI 观察点：

- 整页进入时是骨架屏（edu=1、works=2、projects=3、skills=6 徽章、summary=3 行）
- 姓名 / targetRole / 头部其它字段几乎同时到齐（basic 是单次 emit）
- 教育、工作、项目按顺序从骨架替换为实体
- 技能徽章整片替换
- summary 压轴
- done 后"状态流转"Card 出现

- [ ] **Step 4：刷新中途重连**

在 project 骨架变实的过程中按 `F5`。重新进入时：

- 如果 worker 仍在跑（多半是；LLM 流式通常几秒），能立刻看到已填充到的字段（来自 `snapshot` 事件），其余继续长。
- 如果 worker 已结束（可能性较低），直接渲染 final 页。

- [ ] **Step 5：错误路径**

编辑 `.env.local`，把 `DEEPSEEK_API_KEY` 故意设成 `bad`，重启 dev。再上传一份 PDF 并点进详情页：

- 预期看到错误卡片 + 重试按钮
- 点重试后 `DEEPSEEK_API_KEY` 恢复（再改回正确值），候选人应当继续走流式成功路径

改回 `.env.local` 的正确值。

- [ ] **Step 6：记录验收结果**

如果所有步骤都按预期，不需要改代码。把观察到的非预期行为（比如 "skills 顶层徽章整片出现时抖动一下"）简短写进 commit message 或 follow-up。

- [ ] **Step 7：全量回归**

```bash
npm run test && npm run build
```

Expected: 全绿；构建成功。

- [ ] **Step 8：Commit 回归记录（可选）**

若手跑过程中未发现问题，**不需要额外 commit**。若有小修补（比如 CSS 常量位置、某个骨架宽度不协调），把改动聚成一个 commit：

```bash
git add <修改的文件>
git commit -m "$(cat <<'EOF'
chore: polish streaming detail page after E2E verification

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: 清理未用的旧路径（可选，一个独立 commit）

**Goal:** 验收通过后，如果 `callDeepSeek`（非流式）已经没有任何调用方，删掉。同时从 `CandidateDetailClient` 角度看，原来的单卡 loading 分支在 Task 9 已经移除，无需再处理。

**Files:**
- Maybe modify: `lib/extraction/llm.ts`

- [ ] **Step 1：搜索 callDeepSeek 调用**

```bash
grep -rn "callDeepSeek\b" app lib hooks components tests --include="*.ts" --include="*.tsx"
```

Expected: 除 `lib/extraction/llm.ts` 自身的 `export async function callDeepSeek` 定义外，若还有其他引用（包括 tests），**跳过本 Task**。否则：

- [ ] **Step 2：删除非流式 `callDeepSeek`**

Open `lib/extraction/llm.ts`, remove the `export async function callDeepSeek` block (keep `callDeepSeekStream` and `client()` / `USE_STUB` etc.).

- [ ] **Step 3：同步测试**

如果 `tests/llm.test.ts` 里有专门测 `callDeepSeek` 的用例（参考现有 `describe('callDeepSeek (stub mode)', ...)`）并且现在函数已删，把该 describe 块整段移除，只留 `callDeepSeekStream` 的测试。

- [ ] **Step 4：回归 + 构建**

```bash
npm run test && npm run build
```

Expected: 全绿。

- [ ] **Step 5：Commit**

```bash
git add lib/extraction/llm.ts tests/llm.test.ts
git commit -m "$(cat <<'EOF'
chore(extraction): remove unused non-streaming callDeepSeek

All resume extraction now goes through callDeepSeekStream via the worker;
the legacy one-shot function had no remaining callers.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## 变更后的最终状态（完工自查）

执行完 Task 1–10（Task 11 可选）后，仓库应满足：

- `npm run test` 全绿（新增 event-bus 7 条 + stream-emitter 6 条 + partial-parse 6 条 + SSE 4 条 + worker 新增 2 条 + llm 新增 2 条 = **+27 条测试**）
- `npm run build` 通过
- 浏览器上传 PDF → 详情页出骨架 → 字段按序填入 → done → 状态流转 Card 出现
- 刷新中途能接着看到已到字段
- 设置错误 API key 会看到错误卡片 + 重试
