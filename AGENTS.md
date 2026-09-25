## 项目概述
`dsh-wrong-question`：DeepSeek Harness（DSH）的独立错题本插件。通过 cordis 插件协议注册到 Harness 宿主，提供左栏「错题库」侧边栏项、主工作区、仪表盘、错题增删改查、答题隐藏式复习（Again/Hard/Good/Easy 排程）、知识图谱等。独立 SQLite 存储，不依赖 `@lemoncat7/dsh-knowledge`。

## 技术栈
- Node.js（ESM，`type: module`）+ TypeScript + React 18（客户端 bundle，JSX）
- 宿主框架：`@deepseek-ai/cordis`（插件注册）
- SQLite 持久化（`node:sqlite`，自研 `WrongQuestionDb`）
- 无独立 web 框架；HTTP 路由注册进宿主 `webServer` 的 same-origin 前缀
- 构建：`tsc` + `node scripts/build-client.mjs`（客户端打包为 `window.__ModuleLoader__.load(...)` bundle）
- 包管理器：npm（注意：仓库现有 `package-lock.json`，属存量 npm 工程）

## 目录结构
- `src/index.ts` —— 插件入口 `apply(ctx)`，注册工具与 web
- `src/web.ts` —— 注册 `/wrong-question-control/v1` API 与 `/wrong-question/` 静态资源
- `src/db.ts` —— `WrongQuestionDb`（SQLite 存取/search/similar/dashboard/graph）
- `src/review.ts` —— 复习排程（只要瘃格式 scheduleReview）
- `src/client.tsx` / `client.css` —— 浏览器端 UI 源码（被打包）
- `src/main-panel-compat.ts` —— DSH 0.1.5+ main 工作区 + 旧会话槽兼容
- `web/` —— 打包产物占位（index.html/app.js/app.css），运行时由 `build-client.mjs` 生成
- `cordis.patch.yml` —— 插件 bundle 补丁
- `test/` —— `node --test` 单测（db/review）

## 关键入口 / 核心模块
- 插件入口：`src/index.ts` → `apply(ctx)`；SQLite 路径由 `DSH_HOME` 或 `~/.dsh` 决定
- API 前缀：`/wrong-question-control/v1`（dashboard/graph/questions/search/similar/review 等）
- Agent 工具：`add_question`、`analyze_question`、`get_question`、`update_question`、`delete_question`、`list_questions`、`search_questions`、`find_similar_questions`、`recall_wrong_questions`、`review_question`、`get_due_reviews`、`get_learning_dashboard`、`get_knowledge_graph`

## 运行与预览
- 构建：`npm run build`（tsc 编译到 `lib/` + 生成 web 客户端 bundle）
- 类型检查：`npm run typecheck`；测试：`npm run test`
- **不可预览、不可部署**（非预览/非服务型产物）：`.coze` 中 `project_type = ""`、`preview_enable = "disabled"`、无 `[dev]`、无 `[deploy]`
- 该插件需在 DSH HARness 宿主（含 `webServer`/`tools` 注入）中运行，否则 web UI 与 API 无宿主挂载点；本沙箱内只能做构建/类型检查/单测验证

## 用户偏好与长期约束
- Node.js 项目只用 `pnpm`；本项目为存量 npm 工程（有 `package-lock.json`），迁移前需与用户确认，不擅动

## 常见问题和预防
- 客户端必须通过 `window.__ModuleLoader__.load(...)` 注册，不能发布裸 ESM `client.js`（会打断同响应内其他插件注册）
- `build-client.mjs` 强制生成单一注册 payload，内部模块不可拆成独立文件
- API 有 same-origin 校验与 8MB body 上限；图片仅限 PNG/JPEG/WebP/GIF 且 ≤5MB/≤8MB 校验