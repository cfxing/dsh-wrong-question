import { Database as KuzuDb, Connection as KuzuConn } from 'kuzu';
import type { Question } from './domain.js';
import type { Embedder } from './embedding.js';
export interface KGraphOptions {
    path: string;
    embedder: Embedder;
}
export interface VectorHit {
    id: string;
    distance: number;
}
export interface GraphTraversalHit {
    id: string;
    /** 该题命中的知识点链（含起点），用于解释推理路径。 */
    path: string[];
    hops: number;
}
/**
 * Kuzu 图存储层：错题本的知识图谱。
 * - 节点：QuestionNode(id, embedding[FLOAT[dim]], source, updatedAt)；WordNode(name) 知识点。
 * - 边：QuestionNode -[:HAS_POINT]-> WordNode。
 * - 向量召回：在 QuestionNode.embedding 建 HNSW 余弦索引（Kuzu 0.11.3 vector 扩展）。
 * - 图遍历：从知识点出发，沿 HAS_POINT 反查相关错题，支持共现多跳。
 *
 * Kuzu 是嵌入式图库，数据落在工作目录下的 `knowledge.kuzu`，无需服务进程。
 * 分工：词法落在 SQLite FTS；向量与图谱落在 Kuzu。
 */
export declare class KnowledgeGraph {
    readonly db: KuzuDb;
    readonly conn: KuzuConn;
    private readonly embedder;
    ready: Promise<void>;
    constructor(options: KGraphOptions);
    private init;
    close(): Promise<void>;
    private esc;
    /** 写入/更新一道错题：QuestionNode(含向量) + 关联知识点 WordNode + HAS_POINT 边。 */
    upsertQuestion(q: Question): Promise<void>;
    /** 删除错题（QuestionNode 及出边级联删除）。 */
    deleteQuestion(id: string): Promise<void>;
    /** 全量重建：清空节点后按现有错题重建。 */
    rebuild(questions: Question[]): Promise<void>;
    private q;
    /** 向量召回：对查询文本 embedding 做 top-k 余弦近邻（全表扫描；Node 绑定无 HNSW 索引）。 */
    vectorSearch(queryText: string, topK?: number): Promise<VectorHit[]>;
    /** 图遍历：从起点知识点出发，沿 HAS_POINT 反查相关错题；每跳扩展共现知识点。 */
    graphTraverse(startKnowledge: string[], maxHops?: number, topK?: number): Promise<GraphTraversalHit[]>;
}
/** 全量投影：将 SQLite 中的全部错题同步到 Kuzu 图。 */
export declare function projectAll(graph: KnowledgeGraph, questions: Question[]): Promise<void>;
