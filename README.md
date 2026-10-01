# dsh-wrong-question

DeepSeek Harness（DSH）的**独立错题本插件**。通过 cordis 插件协议注册到 Harness 宿主，为学习者提供错题收集、分析、复习排程与知识图谱，不依赖其他错题数据源。

- 左栏「错题库」侧边栏项 + 主工作区 + 仪表盘
- 错题增删改查、图片/视频/HTML 动态卡片、隐藏式复习（Again / Hard / Good / Easy）
- 三路混合检索（SQLite FTS + 语义向量 + 知识图谱遍历）经 RRF 融合
- 独立 SQLite 存储，嵌入 Kuzu 图库做向量召回与图遍历

## 功能特性

- **多形态录入**：手动表单录入、随当前会话图片自动归档、`add_question` 工具直接写入。
- **结构化分析**：保存 OCR 文本、解题思路、错因类型、学习缺口（learning gaps）、推理缺口、纠正策略、变式建议。
- **隐藏式复习**：Spaced-repetition 排程（Again/Hard/Good/Easy），到期题目聚合到复习视图。
- **知识图谱**：题 ↔ 知识点/标签/错因 的关系图；可视化支持缩放、拖拽、悬停高亮。
- **混合召回**：`hybrid_search_questions` / `recall_wrong_questions` 在答题前召回相关历史错题。
- **OpenMAIC 联动**（可选）：捕获当前回合 `openmaic_render` / `openmaic_widget` 产出，随题目以互动卡片留存。

## 技术栈

- Node.js（ESM，`type: module`）+ TypeScript + React 18（客户端 bundle）
- 宿主框架：`@deepseek-ai/cordis`（插件注册、工具与 web 注入）
- `node:sqlite`（`DatabaseSync`）+ FTS5 —— 错题主存储与词法检索
- Kuzu `0.11.3`（嵌入式图库）—— 向量召回 + 图遍历
- Ollama `qwen3-embedding-4b` —— embedding 来源，不可达时降级为本地哈希向量
- 无独立 web 框架：HTTP 路由注册进宿主 `webServer` 的 same-origin 前缀
- 构建：`tsc` + `scripts/build-client.mjs`（客户端打包为 `window.__ModuleLoader__.load(...)` bundle）

## 目录结构

```
src/
  index.ts            插件入口 apply(ctx)；注册所有 Agent 工具；initGraph 全量投影
  web.ts              注册 /wrong-question-control/v1 API 与 /wrong-question/* 静态资源
  db.ts               WrongQuestionDb（SQLite 存取/search/recall/dashboard/graph）+ GraphSyncHook
  knowledge-graph.ts  KnowledgeGraph（Kuzu 图存储）：节点/边、vectorSearch、graphTraverse、rebuild
  embedding.ts        OllamaEmbedder（/api/embed，失败降级本地哈希向量）
  hybrid.ts           hybridSearch：三路检索 + RRF 融合（1/(k+60)）
  review.ts           复习排程（scheduleReview）
  domain.ts           领域模型（Question / ReviewState / KnowledgeGraph 等）
  image-import.ts     当前回合直接用户图片的归档
  media-import.ts     视频/HTML 产物持久化到题目的媒体目录
  artifact-tracker.ts 捕获 OpenMAIC 技术产出（tools/result 边界）
  client.tsx / client.css  浏览器端 UI 源码（被打包）
  main-panel-compat.ts     DSH 0.1.5+ main 工作区 + 旧会话槽兼容
web/                 打包产物占位（index.html/app.js/app.css，运行时生成）
test/                node --test 单测（db/review/image-import/media-import/artifact-tracker）
scripts/build-client.mjs  客户端 bundle 生成
cordis.patch.yml     插件 bundle 补丁
```

## 数据存储

所有数据落在 `<DSH_HOME>/wrong-question/`（`DSH_HOME` 缺省为 `~/.dsh`）：

| 数据 | 位置 | 说明 |
|---|---|---|
| 错题主存储 | `wrong-questions.sqlite` | SQLite + FTS5 |
| 知识图谱 | `knowledge.kuzu` | Kuzu 图目录，SQLite 的可再生投影 |
| 题目图片 | `images/` | 统一收编到此目录，跨工作区间可读 |

> 图库（`knowledge.kuzu`）是**可再生的投影**：数据源在 SQLite，进程启动时 `initGraph()` 全量重建。删除该目录不会有数据丢失，重启会自动重建。

## 安装与使用

插件需在安装了 DSH Harness 宿主的 Node 环境中运行（web UI 与 API 依赖宿主注入的 `webServer` / `tools`），不能独立运行。

```bash
# 构建
npm run build          # tsc 到 lib/ + 生成 web 客户端 bundle

# 打包为插件包（输出 tarball，添加到 DSH 插件目录）
npm pack
# 或用 pnpm pack
```

加载后，在 DSH 左侧出现「错题库」入口；Agent 可通过下方工具与插件交互。

### Ollama（可选）

向量路依赖 Ollama 的 `qwen3-embedding-4b` 模型（2560 维）。Ollama 不可达时插件自动降级为确定性本地哈希向量，保证检索链路不中断；该情况 `knowledge.kuzu` 仍能建立。

## Agent 工具

| 工具 | 用途 |
|---|---|
| `add_question` | 新建错题（支持随会话图片自动归档） |
| `analyze_question` | 保存结构化分析/错因/学习缺口 |
| `get_question` / `update_question` / `delete_question` | 查改删 |
| `list_questions` | 列表 |
| `search_questions` | SQLite FTS 词法检索 |
| `find_similar_questions` | 词法/知识点相似题 |
| `recall_wrong_questions` | 答题前召回相关错题（三路混合 + RRF） |
| `hybrid_search_questions` | 三路混合检索（FTS + 向量 + 图谱） |
| `review_question` / `get_due_reviews` | 复习排程 |
| `record_question_attempt` / `list_question_attempts` | 记录真实作答 |
| `get_learning_gaps` / `get_learning_dashboard` | 学习缺口与仪表盘 |
| `add_question_variant` / `list_question_variants` | 变式练习 |
| `get_knowledge_graph` | 返回知识图谱（SQLite 投影） |

## HTTP API

注册在宿主 `webServer` 的 same-origin 前缀 `/wrong-question-control/v1`，含跨域校验与 8MB body 上限。常用：

- `GET /dashboard`、`GET /graph`、`GET /questions`
- `POST /questions`、`PATCH/DELETE /questions/:id`
- `POST /search`、`POST /hybrid`、`POST /similar`
- `GET /questions/:id/image`（从规范 `images/` 目录或探测路径读取图片）

静态资源：`/wrong-question/`（index.html / app.js / app.css）。

## 混合检索（hybrid）

三种检索路，结果用 Reciprocal Rank Fusion（`RRF_K = 60`）融合：

1. **FTS（词法）**：SQLite FTS5 按 `bm25` 打分。
2. **向量（语义）**：query 嵌入后对图内题目节点做余弦全表扫描。
3. **图遍历**：query 分词匹配知识点节点作 seed（`HAS_POINT`），沿 `CO_OCCURS` 向外多跳找题。

每条命中按 `1/(60 + rank + 1)` 累加为 `score`，按分排序。返回结构：

```ts
interface HybridHit {
  question: Question        // 完整错题
  score: number             // RRF 融合分
  source: ('fts'|'vector'|'graph')[]  // 哪几路命中
  ranks: Partial<Record<'fts'|'vector'|'graph', number>> // 各路内排名
  path?: string[]           // 图路的知识关联轨迹
}
```

中文语义召回主要依赖图路与向量路：FTS5（unicode61）对中文多词弱召回，整串 `LIKE` 兜底几乎不命中。

## 知识图谱存储（Kuzu）

节点：`Question`（含 `embedding FLOAT[2560]`）、`KnowledgePoint`、`Tag`、`MistakeCause`
边：`HAS_POINT`、`HAS_TAG`、`HAS_CAUSE`、`CO_OCCURS`（知识点共现，`weight`）、`SIMILAR_TO`

详见 `docs/graph-schema.md`。

## 开发

```bash
npm run build        # 编译 TS + 生成客户端 bundle
npm run typecheck    # 类型检查
npm test             # 构建 + node --test 单测
```

## 已知限制与注意事项

- **Kuzu 是嵌入式单写者库**：同一个 `knowledge.kuzu` 同时只允许一个进程打开写入。若启动多个 DSH 进程共用同一 `DSH_HOME`，后起进程会报 `Could not set lock on file` 并回退为纯 FTS 检索（启动日志会输出 `[wrong-question] Kuzu knowledge-graph init failed`）。多个进程需各自独立的 `DSH_HOME`（SQLite 同理建议隔离）。
- **客户端 bundle 不能引入 npm 第三方库**：`build-client.mjs` 仅 transpile 不打包依赖；图谱可视化用原生 SVG 自研。
- **Kuzu Node 绑定无法加载 `vector` 扩展**：`CREATE_VECTOR_INDEX`（HNSW）不可用，向量召回用核心 `ARRAY_COSINE_SIMILARITY` 全表扫描（小数据量足够）。
- **存储图片仅限 PNG/JPEG/WebP/GIF**，≤5MB/8MB 校验。
- 中文检索的 Unicode 属性正则必须用单反斜杠 `\p{L}`/`\p{Script=Han}`（双反斜杠会使中文分词恒空、检索返空）。