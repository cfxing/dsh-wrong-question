import type { Question } from './domain.js';
import type { WrongQuestionDb } from './db.js';
import type { KnowledgeGraph } from './knowledge-graph.js';
import type { Embedder } from './embedding.js';
export type HybridSource = 'fts' | 'vector' | 'graph';
export interface HybridHit {
    question: Question;
    /** RRF 融合得分（1/(k+rank)），用于排序展示。 */
    score: number;
    source: HybridSource[];
    /** 图路推理路径（若图路命中）。 */
    path?: string[];
    /** 各来源的原始下标排名。 */
    ranks: Partial<Record<HybridSource, number>>;
}
export interface HybridSearchOptions {
    topK?: number;
    /** 是否运行向量路（默认 true；embedding 不可用自动降级）。 */
    includeVector?: boolean;
    /** 是否运行图遍历路（默认 true；图库异常自动降级）。 */
    includeGraph?: boolean;
}
/**
 * 三路混合检索：SQLite FTS（词法）+ Kuzu 向量（语义）+ Kuzu 图遍历（关系），经 RRF 融合。
 * 任一路失败都会降级跳过，不阻塞整体。
 */
export declare function hybridSearch(db: WrongQuestionDb, graph: KnowledgeGraph | null, embedder: Embedder, query: string, options?: HybridSearchOptions): Promise<HybridHit[]>;
