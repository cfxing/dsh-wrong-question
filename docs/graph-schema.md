# 错题本图数据库 Schema

SQLite 是业务数据唯一事实源；Kuzu 是知识图谱与语义召回的投影层。

## SQLite

核心表：

- `questions`：题干、答案、OCR、难度、错因文本、分析、举一反三
- `question_media`：图片、视频、HTML 等题目附件
- `knowledge_points` + `question_knowledge_points`：知识点标准化实体与题目关联
- `tags` + `question_tags`：标签标准化实体与题目关联
- `mistake_causes` + `question_mistake_causes`：标准化错因与题目关联
- `review_states`：当前 SM-2 风格复习状态
- `review_logs`：每次复习历史
- `questions_fts`：SQLite FTS5 检索投影，不是业务事实源

旧开发数据库不做数据迁移。schema version 变化时直接重建数据库。

## Kuzu

4 类节点：

- `Question`
- `KnowledgePoint`
- `Tag`
- `MistakeCause`

5 类关系：

- `HAS_POINT`: Question -> KnowledgePoint
- `HAS_TAG`: Question -> Tag
- `HAS_CAUSE`: Question -> MistakeCause
- `CO_OCCURS`: KnowledgePoint -> KnowledgePoint，记录同题共现权重
- `SIMILAR_TO`: Question -> Question，预留给相似题投影

Kuzu 保存题目 embedding，并承担向量召回和图遍历；复习状态不作为 Kuzu 的事实源。

## 三路 RRF

```
用户查询
   ├── SQLite FTS ─────────┐
   ├── Kuzu Vector ────────┼──> RRF ──> Question IDs ──> SQLite 完整记录
   └── Query -> KP -> Graph┘
```

图路现在有独立的 query -> knowledge point 召回，不再要求题目先被 FTS 或向量命中。

## 图查询语义

从查询命中的知识点开始：

1. 找到直接关联错题；
2. 沿 `CO_OCCURS` 扩展 1~2 跳；
3. 汇总图路候选；
4. 与 FTS、Vector 两路做 RRF。

这样知识图谱既能解释“为什么这些题相关”，也不会成为向量/关键词检索的附属过滤器。
