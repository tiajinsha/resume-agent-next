# 简历解析 SSE 流式渲染 · 设计

**日期**：2026-04-24
**状态**：Draft，待用户 review
**作者**：Claude Opus 4.7 (1M context) + JaneyCobb
**前置**：
- `2026-04-24-sift-mvp-nextjs-sqlite-design.md`（MVP 基础设计）
- `2026-04-24-resume-extraction-completeness-design.md`（抽取字段完整性）

## 1 · 背景

现状：

- `POST /api/upload` 同步入库 + `enqueueExtraction` 入 p-queue；
- 后台 `worker.ts` 调 `callDeepSeek` 非流式拿整段 JSON，Zod 校验后一次性写 DB；
- 上传页 `UploadClient.tsx` 用 `useJobPoll` 每 2s 轮询 `/api/jobs` 拿 `extractionStatus` 字符串，渲染队列徽章；
- 详情页 `CandidateDetailClient.tsx` 在 `extracting` / `uploaded` 时显示单个 "AI 正在解析…" 卡片，`parsed` 时一次性渲染完整页面。

问题：

- **反馈节奏粗**：用户从上传完到看到结构化数据之间是黑盒的几秒到十几秒；
- **轮询既低效又不实时**：2s 间隔 + 只有状态字符串，无法承载"边解析边看字段"的体验；
- **骨架屏 / 流式 UI 缺失**：详情页没有任何进度感，只有"AI 正在解析…"一句话。

目标：把后端 DeepSeek 调用改成流式，通过 SSE 把节点级字段增量推给前端，详情页用骨架屏分 section 展示"简历一段一段长出来"。

## 2 · 目标与非目标

### 2.1 目标

1. LLM 调用改为流式；worker 边收边解析、边通过 SSE 推送节点级增量。
2. 新增 `GET /api/candidates/[id]/stream`（SSE），支持快照续订、断线重连、多订阅者。
3. 详情页 `CandidateDetailClient` 替换单卡片 loading 为分 section 骨架屏；字段按到达顺序替换骨架。
4. 失败（流中断 / schema 校验失败）整体回滚到错误卡片，与当前行为一致。
5. 上传页流程完全不变。

### 2.2 非目标

- 不动现有 DB schema、`validation.ts`、`derive.ts`、`prompt.ts` 规则。
- 不在上传页做流式渲染（`/upload` 一次 20 份时不开 20 个 EventSource）。
- 不做部分数据持久化（失败时不写 `extractedJson`）。
- 不做多进程部署下的 pubsub（Redis / PG notify）；本期仍依赖单机 module-scope EventEmitter。
- 不做字段级（`basic.name` 打字机）粒度。
- 不做骨架屏的视觉回归测试 / RTL 组件测试。

## 3 · 决策记录

| # | 决策 | 选择 |
|---|---|---|
| 1 | 流式粒度 | **A：字段级流式（DeepSeek stream + 部分 JSON 解析）** |
| 2 | 承载位置 | **A：详情页 `/candidates/[id]`** |
| 3 | 断线 / 刷新语义 | **A：快照 + 续订**；内存保留 PartialSnapshot，SSE 连上时先 emit `snapshot` 再续传 `delta` |
| 4 | 失败回滚 | **A：整体回滚到错误卡片，不持久化部分数据** |
| 5 | delta 粒度 | **B：节点级**（完整可渲染单元才推） |
| 6 | 上传页是否接 SSE | **否**，继续轮询 `/api/jobs` |
| 7 | 部分 JSON 解析 | 使用 `best-effort-json-parser`（或等价库），不自造轮子 |
| 8 | 单元完成判定 | **兄弟键启发式**：下一 sibling key 出现视为当前键写完 |

## 4 · 架构

```
  Upload Client              Detail Client                    API routes
  ────────────               ─────────────                    ──────────
  POST /api/upload  ──→      GET /candidates/[id]             /api/upload   (不变)
  GET  /api/jobs    ──→      EventSource /api/candidates/[id]/stream   (新增)
                             │
                             ▼
                             SSE route (新增) ── subscribe(id) ── EventBus (新增)
                                                                  │
  p-queue worker (现有) ── callDeepSeekStream (新增) ── stream-emitter (新增)
                                                     ├─ publish(delta) → EventBus
                                                     ├─ 写入 snapshot cache
                                                     └─ 完成后 ExtractedResume.parse + DB 落库
```

核心不变量：

- **worker 仍然是 p-queue 驱动的后台任务**；SSE 路由只做 pub/sub，不拥有 LLM 生命周期。浏览器页签关闭不影响 extraction。
- **EventBus 是 module-scope 单例**：`Map<id, EventEmitter>` + `Map<id, PartialSnapshot>`。单进程 MVP 够用，多实例部署时需要换实现。
- **延迟新订阅者**：SSE 路由 onOpen 时，先从 EventBus 读当前 snapshot 一次性 emit，再 attach listener 转发后续事件；保证刷新后 UI 立刻对齐。
- **幂等语义**：client 对 delta 按 `path` 做覆盖写；同一 path 重复 apply 结果相同。

## 5 · SSE 事件协议

`Content-Type: text/event-stream`，单连接对应单 candidate。

| event | 何时发 | payload (JSON) | 前端动作 |
|---|---|---|---|
| `snapshot` | 连上时 extraction 仍在进行 | `{ partial: Partial<ExtractedResume> }` | 用 partial 覆盖初始 streaming 状态 |
| `delta` | worker 解析出一个完整单元 | `{ path: string, value: any }` | 按 path 写入 client state |
| `done` | LLM 流成功 + schema 校验通过 + 落库成功；**或**客户端连上时 extraction 已 `parsed` | `{ candidate: Candidate }` | 替换本地状态；close EventSource |
| `error` | 任意阶段失败；**或**客户端连上时 extraction 已 `error` | `{ message: string }`（走 `toUserMessage`） | 回滚到错误卡片；close EventSource |
| `:hb` (comment) | 每 15s | — | 无；仅防代理断流 |

`snapshot.partial` 的形状约定：**仅包含已 publish 过 `delta` 的 path**（用 key 缺省表达"未到"）。客户端合并时：key 存在 = 用 value 覆盖 state；key 缺省 = 保持当前骨架态。这条约定让 snapshot 语义与 `delta` 序列严格对齐——snapshot 等价于"把历史所有 delta 按 path 合并成一个对象"。

`done` 事件在两种路径下的 `candidate` 来源：worker 落库成功路径下由 worker 在 publish 时直接携带；客户端打开时已 `parsed` 的短路路径下由 SSE route 从 DB 读取构造。

**`path` 语法**（受限 jsonpath）：
- 顶层：`basic` / `targetRole` / `skills` / `summary`；
- 数组元素：`educations[i]` / `works[i]` / `projects[i]`。

不支持子路径（例如 `basic.name`、`projects[0].highlights[2]`）——由 § 6 的粒度规则保证不需要。

**生命周期**：

- `done` / `error` 后服务端立即 `controller.close()`；
- 客户端 `EventSource` 收到 `done` / `error` 后主动 `close()` 阻止浏览器自动重连；
- `request.signal.aborted` → EventBus.unsubscribe（由 Route Handler 的 `ReadableStream.cancel` 触发）。

**顺序保证**：worker 按 LLM 吐出顺序 publish；由于 prompt 里字段顺序固定（basic → targetRole → educations → works → projects → skills → summary），delta 序列天然按 schema 顺序到达。

## 6 · 部分 JSON 解析与单元完成判定

### 6.1 解析库

使用 `best-effort-json-parser`（或等价 `partial-json` / `untruncated-json`）。语义：给一个不完整 JSON 字符串，尽力返回能解析出的结构，缺失尾部以 `null` / 空字符串填充。

**不自造轮子**——一个稳健的 incremental JSON parser 至少几百行边界代码（转义、嵌套、UTF-8 截断），造轮子 ROI 太低。

### 6.2 解析节奏

每收到一个 OpenAI SDK chunk（10–50 tokens/chunk）触发一次 `bestEffortParse(buffer)`；每份简历累计 30–80 次 tryParse，CPU 开销毫秒级。

### 6.3 单元完成判定规则

| path | 判定条件 |
|---|---|
| `basic` | `partial.basic` 是对象且键数 ≥ 5（name/email/phone/city/age 全齐） |
| `targetRole` | 顶层 `targetRole` 键被解析到（即便 value 是 null） |
| `educations[i]` | `partial.educations.length > i` 且该元素 `school` 非空；且 `partial.educations.length > i+1` **或** 已出现 `works` 键 |
| `works[i]` | 同上，`company` 为必填锚点 |
| `projects[i]` | 同上，`name` 为必填锚点 |
| `skills` | 顶层 `skills` 数组存在，且 `summary` 已出现 **或** 流已结束 |
| `summary` | 顶层 `summary` 字符串存在 **且** 流已结束 |

核心技巧：**"下一个兄弟键已出现 = 当前键已写完"**。prompt 里字段顺序固定，99% 情况成立；剩余边缘情况最终会在 `ExtractedResume.parse` 校验时抛错，走 § 8 错误路径，不会推出损坏数据。

**为什么不按 `}` 闭合判断**：嵌套数组（如 `highlights`）让括号计数不稳；sibling-key 启发式比闭合符鲁棒。

## 7 · 前端状态模型与骨架屏

### 7.1 state 模型

```ts
type StreamingResume = {
  basic:      Partial<ExtractedResume['basic']> | null;   // null = 未到
  targetRole: string | null | undefined;                  // undefined = 未到
  educations: ExtractedResume['educations'];              // 数组,长度逐增
  works:      ExtractedResume['works'];
  projects:   ExtractedResume['projects'];
  skills:     string[] | null;
  summary:    string | null;
};
```

**`undefined` vs `null`**：
- `undefined` → 渲染骨架；
- `null` / `""` / `[]` → 渲染 `—` 或空 section（LLM 明确"无"）。

### 7.2 hook

新增 `hooks/useCandidateStream.ts`，替代详情页里的 `useJobPoll`：

```ts
function useCandidateStream(initial: Candidate): {
  streaming: StreamingResume | null;   // extracting 时有值,其它为 null
  final: Candidate;                    // done 时替换
  error: string | null;
}
```

- `initial.extractionStatus ∈ {parsed, error}` → 不建 SSE，直接返回。
- 其它 → `new EventSource(/api/candidates/${id}/stream)`；按 event 分别处理。

### 7.3 骨架屏组件

新增 `components/Skeleton.tsx`：
- `<Skeleton.Line w h />` / `<Skeleton.Block />` / `<Skeleton.Card>`；
- CSS `@keyframes shimmer` 背景位移动画，1.6s 循环；
- `@media (prefers-reduced-motion: reduce)` 降级为静态灰条。

### 7.4 分 section 渲染规则

```
头部区
  Avatar                    |
  姓名 line (basic 未到):   骨架 120px
  姓名 (basic 到):           真实 name + StatusPill
  targetRole undefined:      骨架 badge 100px
  targetRole = null:         不渲染
  targetRole = string:       徽章
  role/city/email/phone/age:
    basic 未到 → 各 1 条骨架 80–120px
    basic 到   → 真实值,为 null 的项隐藏

AI 评语 Card (span 2)
  summary === null:   3 行骨架 w=100%/95%/60%
  summary 到:         真实文字

工作经历 Card                教育背景 Card
  length=0 且流未完 → 2 条骨架      length=0 且流未完 → 1 条骨架
  流结束 length=0   → "—"           流结束 length=0   → "—"
  有数据 → 现有布局,逐条 append

项目经历 Card (span 2)
  length=0 且流未完 → 3 条骨架
  有数据 → 第 N 条到达时第 N 个骨架变实;完成后裁掉剩余骨架

技能 Card (span 2)
  skills === null → 6 个骨架徽章 w=60/80/70/90/55/75
  skills 到       → 真实 SkillTag

状态流转 Card
  流式期间不渲染;done 之后出现
```

**骨架占位数固定估值**（edu=1, works=2, projects=3, skills=6），不预测真实条数。

**面包屑**：`candidate · 解析中` → basic 到后切为 `candidate · {name}`。

## 8 · 错误处理与重连

### 8.1 失败回滚

```
worker 任意阶段错误 → EventBus.publish('error', { message })
                   → DB update { extractionStatus:'error', extractionError:message }
                   → snapshot.delete(id)
                   → SSE route forward + close

client.onError:
  streaming 状态整体丢弃 → 切错误卡片 + 重试按钮
  EventSource.close()
```

### 8.2 重试

不新增接口。`POST /api/candidates/[id]/retry` 现有实现把 `extractionStatus` 置回 `uploaded` + `enqueueExtraction(id)`。client 成功后重拉 candidate，`useCandidateStream` 见到 `uploaded` 自动建新 SSE 连接。

### 8.3 重连场景矩阵

| 场景 | 服务端 | 客户端看到 |
|---|---|---|
| 打开时 `uploaded`（队列排队中） | 空 snapshot + subscribe | 整页骨架，worker 取到后开始 delta |
| 打开时 `extracting`（流中） | 现有 snapshot + subscribe | 已填字段立刻出现，剩下继续长 |
| 打开时 `parsed` / `error` | emit `done` / `error` 后 close | 一次性渲染 final / 错误卡片 |
| 流中用户刷新 | 旧 subscriber 减一；新连接命中 `extracting` 分支 | 填充度在刷新后立即对齐 |
| 网络抖动 | 浏览器 EventSource 自动重连 | 新连 → snapshot 对齐 → 幂等覆盖 |

### 8.4 进程重启

`lib/extraction/queue.ts:initOnce` 已把 `extracting` 回滚为 `uploaded` 并重新入队。重启后现有订阅连接断开；新连接命中 `uploaded` 分支，worker 重跑一次，符合 at-least-once。**无需新代码**。

## 9 · 文件清单

### 新增

| 路径 | 作用 |
|---|---|
| `lib/extraction/stream-emitter.ts` | 维护 best-effort-json buffer，按 § 6 规则判定并产出 delta；纯函数单测友好 |
| `lib/extraction/event-bus.ts` | `Map<id, EventEmitter>` + `Map<id, PartialSnapshot>`；`subscribe`/`publish`/`getSnapshot`/`clear` |
| `app/api/candidates/[id]/stream/route.ts` | SSE 路由；`GET` 返回 `ReadableStream`；15s heartbeat；abort 时 unsubscribe |
| `hooks/useCandidateStream.ts` | client EventSource 封装 |
| `components/Skeleton.tsx` | 骨架基础组件 + shimmer CSS |
| `tests/partial-parse.test.ts` | 部分 JSON 解析封装测试 |
| `tests/stream-emitter.test.ts` | 兄弟键启发式核心逻辑 |
| `tests/event-bus.test.ts` | 订阅 / 快照 / 清理 |
| `tests/api-candidate-stream.test.ts` | SSE 路由集成测试 |

### 修改

| 路径 | 改动 |
|---|---|
| `lib/extraction/llm.ts` | 新增 `callDeepSeekStream(text)` AsyncIterable；`callDeepSeek` 保留以便回退 |
| `lib/extraction/worker.ts` | 改用 `callDeepSeekStream` 驱动 stream-emitter，publish 到 EventBus，末尾 `ExtractedResume.parse` + 落库；失败 publish('error') + 清 snapshot |
| `lib/extraction/prompt.ts` | 新增 `STUB_STREAM_CHUNKS`（派生自 `STUB_RESULT`，按 ~50 字符切片） |
| `components/CandidateDetailClient.tsx` | 移除单卡片 loading；接入 `useCandidateStream` + 分 section 骨架 |
| `tests/llm.test.ts` | 新增 stub 流路径 |
| `tests/worker.test.ts` | 新增流式路径 |

### 依赖

- `dependencies` 新增 `best-effort-json-parser`（≈3KB gzipped，MIT）。

### 不动

- `/api/upload`、`/api/jobs`、`/api/candidates`、`/api/candidates/[id]`、`/api/candidates/[id]/retry`
- `components/UploadClient.tsx`、`hooks/useJobPoll.ts`
- DB schema、`validation.ts`、`derive.ts`、prompt 规则
- `/dashboard`、`/compare`、`/jd` 等其它页面

## 10 · 测试策略

### 新增单元

| 文件 | 覆盖 |
|---|---|
| `tests/partial-parse.test.ts` | 切片序列能解析出当前可见结构；字符串内 `"}"` 转义；数组元素半成品；`null` vs `undefined` |
| `tests/stream-emitter.test.ts` | 输入模拟 chunk 序列 → 输出 delta 序列：basic 只 emit 一次、`educations[0]` 在 `educations[1]` 出现时 emit、`skills` 在 `summary` 出现时 emit、`summary` 在流结束时 emit |
| `tests/event-bus.test.ts` | subscribe / unsubscribe 引用计数、多订阅者广播、snapshot 读写、done/error 清理 |

### 更新现有

| 文件 | 改动 |
|---|---|
| `tests/llm.test.ts` | `LLM_STUB=1` 时 `callDeepSeekStream` 读 `STUB_STREAM_CHUNKS` 序列 yield |
| `tests/worker.test.ts` | 流式路径：mock `callDeepSeekStream`，断言按序 publish `delta`、成功落库 + `done`、mid-stream error + `error` |

### 新增集成

| 文件 | 覆盖 |
|---|---|
| `tests/api-candidate-stream.test.ts` | mock LLM chunk 源 → `GET /api/candidates/[id]/stream` → 断言 SSE 帧序列 `snapshot → delta × N → done`；已 parsed 立刻 `done`；不存在的 id 404 |

### 手跑端到端

1. 清库启动 dev
2. 上传 `田金沙-19973361472.pdf`
3. 点进详情页：
    - 整页先出骨架
    - basic / targetRole / 头部信息先到
    - 教育、工作、项目骨架按 § 6 规则依次变实
    - 技能徽章片出现
    - summary 压轴到
    - 状态流转 Card 此时才出现
4. 刷新 → 剩余字段继续长；已完成 → 直接 final 页
5. 设 `DEEPSEEK_API_KEY=bad` → 错误卡片 + 重试

### 不测

- 骨架视觉回归
- shimmer 动画

## 11 · 实施顺序

1. `event-bus.ts` + `stream-emitter.ts` + 单测 → 全绿
2. `llm.ts` `callDeepSeekStream` + stub + `tests/llm.test.ts` → 全绿
3. `worker.ts` 接流式 + EventBus publish + `tests/worker.test.ts` → 全绿
4. SSE 路由 + `tests/api-candidate-stream.test.ts` → 全绿
5. `Skeleton.tsx` + `useCandidateStream.ts` → 无单测
6. `CandidateDetailClient.tsx` 接入骨架屏
7. 手跑端到端（田金沙 PDF）
8. cleanup commit：删除 `callDeepSeek` 非流式版本和旧单卡 loading 分支（若彻底无调用方）

步骤 1–4 纯后端，`bun test` 全绿即合；步骤 5–7 UI 交付单独 commit 方便回滚。

## 12 · 风险

- **LLM 流式 + `response_format: json_object`**：DeepSeek 兼容 OpenAI 协议，但 `response_format` + `stream: true` 的行为需要真机验证；如果出现"流中途违反 JSON 语法"的情况，`best-effort-json-parser` 可吸收大多数，最终由 `ExtractedResume.parse` 兜底抛错走错误卡片。开发阶段跑 stub + 真 API 各一次。
- **兄弟键启发式误判**：prompt 字段顺序本就是约束，但 LLM 极端情况下可能乱序。后果是某 delta 迟到或缺失；最终校验通过时 `done` 事件的 `candidate` payload 会把状态补齐，用户看到的是"某一段突然从骨架跳到实体"而不是错误。可接受。
- **内存 snapshot 泄漏**：done/error 必须清；EventBus clear 必须清；通过 `tests/event-bus.test.ts` 覆盖。
- **SSE 在 Next.js 16 Route Handler 的行为**：Next 16 支持 streaming response via `ReadableStream`，但需验证 `request.signal` 的 abort 语义是否触发 ReadableStream 的 `cancel`。按 AGENTS.md 约束，落地前读 `node_modules/next/dist/docs/` 相关章节。
- **多进程部署**：module-scope EventBus 在多实例时 snapshot 不共享，订阅会丢事件。本期单机 MVP 接受；后续如需多实例部署，替换为 Redis PubSub + 共享 snapshot store 是局部改造。
