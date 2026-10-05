import type { Question } from './domain.js';
import type { WrongQuestionDb } from './db.js';
import type { KnowledgeGraph } from './knowledge-graph.js';
import type { Embedder } from './embedding.js';
export type HybridSource = 'fts' | 'vector' | 'graph';
export interface HybridHit {
    question: Question;
    score: number;
    source: HybridSource[];
    path?: string[];
    ranks: Partial<Record<HybridSource, number>>;
}
export interface HybridSearchOptions {
    topK?: number;
    includeVector?: boolean;
    includeGraph?: boolean;
}
export declare function hybridSearch(db: WrongQuestionDb, graph: KnowledgeGraph | null, embedder: Embedder, query: string, options?: HybridSearchOptions): Promise<HybridHit[]>;
