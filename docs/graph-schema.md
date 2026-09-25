# 错题本图数据库 Schema 设计

> 关联项目：`dsh-wrong-question`
> 定位：在"以小知识点为枢纽、以错题为载体"的业务语义下，用图数据库承载知识图谱与关系推理。
> 引擎：Kuzu（嵌入式属性图，免服务）+ Graphology（算法与可视化）组合；本设计为引擎无关的语义模型，均可落地。

## 1. 设计原则

- **一个小知识点为枢纽**：关系绕开题目本体，让"知识点之间的关系"成为图的骨架。
- **错题为载体**：认错题携带属性与派生关系（共现、相似），不把每次复习膨胀成常驻节点。
- **主存储不迁移**：SQLite 仍是错题 CRUD + FTS + 向量（sqlite-vec）的唯一数据源；图库作为知识图谱的关系层。
- **增量写入 + 一次性投影**：写错题时同步图，共现/相似等派生关系由投影批量刷新，避免每次更新重算全图。

## 2. 节点类型（4 类）

| 节点 | 主键 | 关键属性 | 数据来源（现有 SQLite 字段） |
|---|---|---|---|
| `KnowledgePoint` | `name` | `mastery`、`questionCount`、`dueCount` | `knowledge_points[]` 聚合 |
| `Question` | `id` | `content`、`answer`、`difficulty`、`reps`、`ease`、`dueAt`、`source` | 错题表 |
| `Tag` | `name` | — | `tags[]` |
| `MistakeCause` | `cause` | — | `mistakeCause`（可拆分数组） |

> 仅 4 类即可。`Artifact`、`ReviewLog` 不作为常驻节点：前者以免破坏"图=知识地图"的简洁性，后者用关系属性承载，避免每次复习膨胀图。

## 3. 边类型（5 类）

| 边 | 方向 | 权重/属性 | 业务语义 | 对应 SQLite |
|---|---|---|---|---|
| `HAS_POINT` | Question→KnowledgePoint | — | 某道题覆盖哪个知识点 | `knowledge_points` |
| `HAS_TAG` | Question→Tag | — | 归类 | `tags` |
| `HAS_CAUSE` | Question→MistakeCause | — | 为什么错 | `mistakeCause` |
| `CO_OCCURS` | KnowledgePoint→KnowledgePoint | `weight` | 两知识点同题出现（**多跳链主力**） | 由 `HAS_POINT` 派生 |
| `SIMILAR_TO` | Question→Question | `weight` | 结构/内容相近错题 | `findSimilar` 派生，可预建 |

## 4. Kuzu DDL（Cypher 落地）

```cypher
CREATE NODE TABLE KnowledgePoint(name STRING, mastery DOUBLE, questionCount INT64, PRIMARY KEY(name));
CREATE NODE TABLE Question(
  id STRING, content STRING, answer STRING, difficulty INT64,
  reps INT64, ease DOUBLE, dueAt TIMESTAMP, PRIMARY KEY(id)
);
CREATE NODE TABLE Tag(name STRING, PRIMARY KEY(name));
CREATE NODE TABLE MistakeCause(cause STRING, PRIMARY KEY(cause));

CREATE REL TABLE HAS_POINT(FROM Question TO KnowledgePoint);
CREATE REL TABLE HAS_TAG   (FROM Question TO Tag);
CREATE REL TABLE HAS_CAUSE (FROM Question TO MistakeCause);
CREATE REL TABLE CO_OCCURS (FROM KnowledgePoint TO KnowledgePoint, weight INT64);
CREATE REL TABLE SIMILAR_TO(FROM Question TO Question, weight DOUBLE);
```

可在 `CO_OCCURS(weight)`、`SIMILAR_TO(weight)` 上建立型/表级索引以加速权重排序查询。

## 5. 存量与新增数据的职责划分

### 增量写入（`upsert()` 时同步）
- 创建/更新 `Question` 节点及其 `HAS_POINT` / `HAS_TAG` / `HAS_CAUSE` 边。
- 就地增量刷新 `CO_OCCURS`（知识点增减时重算受影响对）与 `SIMILAR_TO`（对新增/变更题重算）。
- 复习更新：仅更新 `Question` 上 `reps/ease/dueAt` 属性，不新增边。

### 一次性投影（`RECONNECT`）
- `CO_OCCURS`：复用现有 SQLite 共现算法先算好权重，批量 `MERGE` 建边。
- `SIMILAR_TO`：复用 `findSimilar` 结果批量写入。
- 投影由脚本触发，避免写题热点路径承担重算成本。

## 6. 每条边对上文价值点的支撑

| 价值点 | 使用方式 | Cypher 示意 |
|---|---|---|
| 多跳薄弱链 | 多跳共现遍历 | `MATCH (q:Question)-[:HAS_POINT]->(k1)-[:CO_OCCURS*1..2]->(k2)` |
| 结构相似推荐 | 共同邻居 / 相近题 | `MATCH (k)-[:CO_OCCURS]->(k2)<-[:HAS_POINT]-(q2)` |
| 社区/关键节点 | 喂给 louvain / pagerank | 导出 `KnowledgePoint`+`CO_OCCURS` 到 Graphology |

## 7. 推荐最小集合（MVP）

先上 **4 节点 + `HAS_POINT` + `HAS_CAUSE` + `CO_OCCURS`**，即可支撑"薄弱链 + 模块分组 + 结构相似推荐"。
`Tag`、`SIMILAR_TO` 视业务需要后加，避免一开始过度建模。

## 8. 与引擎的搭配

- **Kuzu**：正式图存储 + Cypher 多跳查询（替代 Neo4j 对应能力的最小成本项；需实测 Node 原生绑定加载）。
- **Graphology**：从 Kuzu 或现有 SQLite `graph()` 读出数据，运行 louvain / pagerank / 路径算法，配合 Sigma 做可视化；算法生态比 Kuzu/Neo4j 的 Node 侧更省事。

## 备注
- 该图设计仅在知识图谱/关系推理层面生效，不替代 SQLite 作为主存储；
- sqlite-vec 的向量召回与本图层可并行，后续如需"向量 + 图谱 + RRF 融合"再做跨层整合，本设计不阻塞该演进。