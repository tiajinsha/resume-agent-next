# Bug & 优化点清单

> 生成日期：2026-04-28  
> 基于对 `lib/`、`app/api/`、`components/`、`hooks/` 的全量代码审查

---

## P1 — 影响功能 / 数据一致性

### 1. 搜索大小写不一致（`DashboardClient.tsx:39`）

**现象**：姓名、岗位、学校搜索区分大小写，但技能搜索不区分，导致同一个词搜不到预期结果。

```ts
// 有问题
(c.name ?? '').includes(search)       // 区分大小写
(c.skills ?? []).some(s => s.toLowerCase().includes(q))  // 不区分

// 修复
const qLower = search.toLowerCase();
(c.name ?? '').toLowerCase().includes(qLower)
(c.role ?? '').toLowerCase().includes(qLower)
(c.school ?? '').toLowerCase().includes(qLower)
(c.skills ?? []).some(s => s.toLowerCase().includes(qLower))
```

---

### 2. 项目 AI 评估失败后状态显示"已解析"但数据缺失（`worker.ts:58`）

**现象**：`evalProjects` 抛出异常时，只打 console.error，候选人状态仍为 `parsed`，但项目卡片的 `aiSummary` / `valueTag` 全部为空，用户无法感知。

```ts
// 当前
} catch (e) {
  console.error(`[project-eval:${id}]`, e);  // 静默失败
}
```

**建议**：在 `extractedJson` 中增加 `projectEvalError: boolean` 字段，UI 侧可在项目卡片显示"AI 评估暂时不可用"提示。

---

### 3. SSE abort 监听器在流关闭后未清除（`stream/route.ts:64`）

**现象**：`ReadableStream.cancel()` 只清理 `hb` 和 `unsubscribe`，但 `req.signal.addEventListener('abort', closeAll)` 绑定的 listener 从未调用 `removeEventListener`。流被 `controller.close()` 关闭后，该 listener 仍悬挂在 `req.signal` 上。

```ts
// 修复：在 cancel() 回调和 closeAll 里都清理
let abortHandler: (() => void) | null = null;
abortHandler = closeAll;
req.signal.addEventListener('abort', abortHandler);

// cancel() 里补上
if (abortHandler) req.signal.removeEventListener('abort', abortHandler);
```

---

## P2 — 体验 / 性能

### 4. `useJobPoll` 使用 `ids.join(',')` 作为 `useEffect` 依赖（`hooks/useJobPoll.ts:38`）

**现象**：`ids.join(',')` 是在 render 中动态生成的字符串，违反 React exhaustive-deps 规则。当 `ids` 数组引用变化但内容不变时，会触发不必要的重新订阅和 tick；同时内部闭包捕获的是当时的 `ids` 快照，不是最新值。

```ts
// 当前
}, [enabled, ids.join(','), intervalMs]);

// 建议：稳定化依赖
const idsKey = useMemo(() => [...ids].sort().join(','), [ids]);
}, [enabled, idsKey, intervalMs]);
```

---

### 5. 搜索关键词无最小/最大长度限制（`api/candidates/route.ts:26`）

**现象**：单字符查询（如 `%a%`）会触发全字段模糊扫描，在候选人数量大时产生慢查询。

```ts
// 建议加入前置校验
if (q && q.length >= 2 && q.length <= 100) {
  const pat = `%${q}%`;
  wheres.push(or(...));
}
```

---

### 6. `StreamingScroller` 每个 chunk 都触发 layout reflow（`CandidateDetailClient.tsx`）

**现象**：`useEffect([streaming, isStreaming])` 在每片 SSE chunk 到来时执行，内部读取 `scrollHeight / scrollTop / clientHeight`，强制浏览器同步 layout。在长简历高频推送时可能造成卡顿。

**建议**：对 scroll 检查加节流（100–150 ms），或仅在 `streaming` 长度变化超过阈值时才触发。

---

### 7. 自动 JD 匹配失败时无任何前端反馈（`worker.ts:100`）

**现象**：`callMatchAI` 抛出异常后，仍然广播 `done` 事件，用户不知道自动匹配是否成功。

```ts
} catch (e) {
  console.error(`[auto-match:${id}]`, e);
  bus.publish(id, { type: 'done', candidate: updated });  // 无匹配结果，无提示
}
```

**建议**：在 `done` 事件 payload 中增加 `autoMatchError: true`，让前端在 JD 面板展示"自动匹配失败，请手动匹配"提示。

---

## P3 — 代码质量 / 可维护性

### 8. `parseCookies` 未导出，`logout` 路由重复实现（`session.ts:50`、`logout/route.ts:5`）

```ts
// logout/route.ts 的手写版本（易出错）
const sid = raw.split(';').map(s => s.trim())
  .find(s => s.startsWith(SESSION_COOKIE + '='))?.split('=')[1];

// 建议：将 session.ts 中的 parseCookies export 出去，logout 直接复用
export function parseCookies(header: string): Record<string, string> { ... }
```

---

### 9. Session `Max-Age` 硬编码，与 `TTL_MS` 脱钩（`session.ts:10,63`）

```ts
const TTL_MS = 7 * 24 * 3600 * 1000;   // 毫秒
return `...Max-Age=604800`;              // 硬编码秒数

// 建议：派生自同一来源
const TTL_S = 7 * 24 * 3600;
const TTL_MS = TTL_S * 1000;
return `...Max-Age=${TTL_S}`;
```

---

### 10. `verifyPassword` 格式错误时提前 return，绕过恒定时间比较（`password.ts:8`）

```ts
const [salt, hash] = stored.split(':');
if (!salt || !hash) return false;  // 跳过 scrypt，泄露时序
```

虽然 scrypt 本身很慢能部分缓解，但严格来说应走完流程：

```ts
const salt = parts[0] ?? 'placeholder';
const hash = parts[1] ?? '0'.repeat(128);
try {
  const candidate = scryptSync(pwd, salt, 64);
  return timingSafeEqual(Buffer.from(hash, 'hex'), candidate);
} catch {
  return false;
}
```

---

### 11. `project-eval.ts` JSON 解析过度宽松（`project-eval.ts:64`）

```ts
const arr = Array.isArray(raw) ? raw
  : (raw.results ?? raw.items ?? raw.data
     ?? Object.values(raw).find(Array.isArray) ?? []);
```

`Object.values(raw).find(Array.isArray)` 会接受 LLM 返回的任意嵌套数组，可能误匹配无关字段。建议只接受 `raw.results` 格式（Prompt 已明确要求），其余情况抛出可识别的错误：

```ts
const arr = raw.results ?? (() => { throw new Error('unexpected eval format'); })();
```

---

### 12. `Spinner` 组件已无引用（`JdMatchPanel.tsx:29`）

匹配状态改为骨架屏后，`Spinner` 函数已不被使用，可直接删除。

---

## 优化建议（非 Bug）

| # | 建议 | 收益 |
|---|------|------|
| A | 对 `/api/upload`、`/api/candidates/[id]/match` 加速率限制 | 防止 AI 接口被滥用 |
| B | `Card` 组件增加 `forwardRef` | 替代当前 `<div ref>` 包裹方式，减少冗余 DOM 节点 |
| C | 关键写操作使用 `db.transaction()` | 防止 eval + auto-match 两次 UPDATE 之间 crash 导致数据半更新 |
| D | 候选人状态变更写入 `audit_log` 表 | 操作可追溯 |
| E | SSE 响应增加 `Content-Encoding: identity` 头 | 防止某些反向代理尝试 gzip 压缩导致流中断 |

---

## 汇总

| 级别 | 数量 |
|------|------|
| P1 影响功能 | 3 |
| P2 体验/性能 | 4 |
| P3 代码质量 | 5 |
| 优化建议 | 5 |

**优先修复**：#1（搜索大小写）、#2（项目评估无声失败）、#4（useJobPoll 依赖）。
