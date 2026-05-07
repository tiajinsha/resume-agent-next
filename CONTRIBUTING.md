# 贡献指南

感谢对 Sift 思筛感兴趣!这份文档帮你快速上手开发,以及说明 PR 提交规范。

## 🚀 本地开发环境

需要 **Node 20+** 和 **npm 10+**。

```bash
# 1. Fork 这个仓库,clone 你的 fork
git clone https://github.com/<你的用户名>/resume-agent-next.git
cd resume-agent-next

# 2. 装依赖
npm install

# 3. 配环境变量
cp .env.local.example .env.local
# 编辑 .env.local,把 DEEPSEEK_API_KEY 填进去
# 或者设 LLM_STUB=1 跳过真实 LLM 调用,用固定假数据开发

# 4. 跑数据库迁移
npm run db:migrate

# 5. 启动 dev server
npm run dev
# 访问 http://localhost:3000
```

第一次注册账号:进 `/login`,有"注册"入口。

## 🧪 提交前必跑

PR 不通过 CI 不会被合,请本地先跑一遍:

```bash
npx tsc --noEmit       # 类型检查
npm run lint           # ESLint
LLM_STUB=1 npm test    # Vitest (LLM_STUB 跳过真实 API 调用)
```

## 🌿 分支模型

- `main` — 主分支,始终保持可部署
- 功能分支命名:`feat/<功能简述>` / `fix/<bug 简述>` / `docs/<文档简述>`
- 一个 PR 只做一件事,小步快跑

## 📝 Commit 信息规范

不强制 conventional-commits,但请用中文写清楚**做了什么 + 为什么**:

```
✅ 好:
对比页:技能归一化剥离尾部版本号

✅ 也好:
fix(compare): normalize skills with trailing version numbers

❌ 差:
update
fix bug
123
```

PR 标题同理。

## 🏗 代码风格

- 用 TypeScript strict;不写 `any`,用 `unknown` 兜底
- 组件文件首字母大写驼峰,工具文件小写连字符
- 不写不必要的注释:命名清晰 + 类型表达 = 自解释代码;只为"为什么这样而不是那样"加注释
- 不引入新依赖前先想想标准库 / 现有依赖能不能搞定

## 🎯 优先解决什么

- 🐛 Issues 里有 `good-first-issue` / `help-wanted` 标签的优先
- 性能、安全、可访问性(a11y)的修复永远欢迎
- 大功能改动建议先开 Issue 讨论再写代码

## 💬 有问题怎么问

- 实现细节问题:直接在 PR 上 review 讨论
- 架构问题、产品方向:开一个 Discussion 或 Issue
- 安全问题:**不要开 public issue**,见 [SECURITY.md](./SECURITY.md)

## 📜 行为准则

参与本项目即表示你同意遵守 [Code of Conduct](./CODE_OF_CONDUCT.md)。

---

再次感谢 🎉
