## 项目概述
`dsh-wrong-question`：DeepSeek Harness（DSH）的独立错题本插件。通过 cordis 插件协议注册到 Harness 宿主，提供左栏「错题库」侧边栏项、主工作区、仪表盘、错题增删改查、答题隐藏式复习（Again/Hard/Good/Easy 排程）、知识图谱等。独立 SQLite 存储，不依赖 `@lemoncat7/dsh-knowledge`。

## 技术栈
- Node.js（ESM，`type: module`）+ TypeScript + React 18（客户端 bundle，JSX）
- 宿主框架：`@deepseek-ai/cordis`（插件注册）
- SQLite 持久化（`node:sqlite`，自研 `WrongQuestionDb`）——错题主存储与词法召回（FTS）
- **Kuzu 0.11.3**（嵌入式图库，`knowledge.kuzu`）——知识图谱：向量召回 + 图遍历
- **Ollama embedder**（`qwen3-embedding-4b`，Q4_K_M，2560 维）——embedding 来源，不可达时降级为本地哈希向量
- 三路混合检索 + RRF 融合：SQLite FTS（词法） + Kuzu 向量（`ARRAY_COSINE_SIMILARITY`） + Kuzu 图遍历（`HAS_POINT`）
- 无独立 web 框架；HTTP 路由注册进宿主 `webServer` 的 same-origin 前缀
- 构建：`tsc` + `node scripts/build-client.mjs`（客户端打包为 `window.__ModuleLoader__.load(...)` bundle）
- 包管理器：npm（注意：仓库现有 `package-lock.json`，属存量 npm 工程）

## 目录结构
- `src/index.ts` —— 插件入口 `apply(ctx)`，注册工具与 web；组装 Kuzu 图 + embedder，注册 `hybrid_search_questions`；`initGraph()` 做全量投影
- `src/web.ts` —— 注册 `/wrong-question-control/v1` API（含 `POST /hybrid`）与 `/wrong-question/` 静态资源
- `src/db.ts` —— `WrongQuestionDb`（SQLite 存取/search/similar/dashboard/graph），通过 `GraphSyncHook` 在 upsert/delete 时联动同步 Kuzu
- `src/knowledge-graph.ts` —— `KnowledgeGraph`（Kuzu 图存储层）：节点 `QuestionNode`(含 embedding FLOAT[2560])/`WordNode`，边 `HAS_POINT`；`vectorSearch`（余弦全表扫描）+ `graphTraverse`（多跳）+ `rebuild`
- `src/embedding.ts` —— `OllamaEmbedder`（Ollama `/api/embed`，失败降级本地哈希向量）
- `src/hybrid.ts` —— `hybridSearch`：三路检索 + RRF（`1/(k+60)`）融合
- `src/review.ts` —— 复习排程（只要瘃格式 scheduleReview）
- `src/client.tsx` / `client.css` —— 浏览器端 UI 源码（被打包）
- `src/main-panel-compat.ts` —— DSH 0.1.5+ main 工作区 + 旧会话槽兼容
- `web/` —— 打包产物占位（index.html/app.js/app.css），运行时由 `build-client.mjs` 生成
- `cordis.patch.yml` —— 插件 bundle 补丁
- `docs/graph-schema.md` —— 图谱 Schema 设计（Kuzu 节点/边）
- `test/` —— `node --test` 单测（db/review）

## 关键入口 / 核心模块
- 插件入口：`src/index.ts` → `apply(ctx)`；SQLite 路径由 `DSH_HOME` 或 `~/.dsh` 决定；Kuzu 图落在 `<DSH_HOME>/wrong-question/knowledge.kuzu`
- API 前缀：`/wrong-question-control/v1`（dashboard/graph/questions/search/similar/hybrid/review 等）
- Agent 工具：`add_question`、`analyze_question`、`get_question`、`update_question`、`delete_question`、`list_questions`、`search_questions`、`find_similar_questions`、`recall_wrong_questions`、`review_question`、`get_due_reviews`、`get_learning_dashboard`、`get_knowledge_graph`、`hybrid_search_questions`（三路 RRF）

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
- **客户端 bundle 无法引入 npm 第三方库**（build-client 仅 `transpileModule` 不做依赖打包，只有宿主提供的 require 可用，如 react）。因此知识图谱可视化须用原生 SVG 自研（GraphView 已实现：滚轮缩放、拖拽节点、悬停高亮关联、边权重标签），不能依赖 react-force-graph/Sigma 等图库
- **图谱节点拖拽越界**：`GraphView.onMove` 里节点会直接跟随鼠标世界坐标；必须用 `Math.max(labelRoom, Math.min(720-labelRoom, wx))`（x）与 `Math.min(480-labelRoom, wy)`（y）约束在 720×480 viewBox 内（labelRoom = 节点半径 + 34，为下方文字留空间），否则节点能被拖出边界
- **图谱必须整体 fit，不能固定 `scale=1,tx=0`**：`GraphView` 用 `computeFit()` 按所有节点（含下方文本标签 `y+n.r+34`）的包围盒计算初始缩放与居中平移，并 `setVp`；`reset()` 也回到 fit 态。否则节点/标签超出 720×480 画布被左/下边缘裁剪。fit 用 `useEffect([fittedKey])`（fittedKey = 排序后的节点 id 串）触发，避免 render 期 setState
- **UI 视觉设计基线**：整体风格沉淀在 `DESIGN.md`（墨蓝品牌 `#4f46e5` + `--brand`/`--brand-soft` 变量、低饱和背景 `#f7f8fb`、卡片层级 + 柔和阴影 + 圆角、hover 上浮动效）。颜色统一走 `client.css` 顶部的 CSS 变量，不散写硬编码色值
- **复习视图用 `MediaGallery compact`** 渲染错题图片/视频/HTML 动态卡片（不仅详情 Sheet）；后台生成的动画卡片/视频通过 `artifacts`（kind=image/video/html）经 `MediaGallery` 展示，`review-view`/`question-sheet` 均可复用
- API 有 same-origin 校验与 8MB body 上限；图片仅限 PNG/JPEG/WebP/GIF 且 ≤5MB/≤8MB 校验
- **Kuzu Node 绑定（0.11.3）无法加载 vector 扩展**：`LOAD EXTENSION vector` 静默 no-op，`CREATE_VECTOR_INDEX`（HNSW）不可用；向量召回须用核心函数 `ARRAY_COSINE_SIMILARITY` 全表扫描（对小数据足够）
- **Kuzu embedding 列用 `FLOAT[N]`，查询向量须 `CAST([...], 'FLOAT[N]')`**，否则报 `requires argument type to be FLOAT[]`；`ARRAY_COSINE_SIMILARITY` 返回相似度（越近越大），与下游 `1 - sim` 转换
- **Kuzu 表必须有主键**（`id STRING PRIMARY KEY`），否则建表报 `Can not find primary key`
- **Kuzu 进程退出可能 segfault（原生析构）**：运行时逻辑正常；如需干净退出用 `process.exit(0)` 或由宿主常驻回收
- **index.ts 里 `graph` 必须在独立函数中初始化**（如 `initGraph`），不能直接在 `apply` 内 Async IIFE 中 `graph = new KnowledgeGraph(...)` —— 会触发 TS 作用域类型收窄，导致 `WrongQuestionDb` 被误判"无构造签名"