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
    path: string[];
    hops: number;
}
/**
 * Kuzu is an optional acceleration layer for the wrong-question plugin.
 *
 * IMPORTANT: do not statically import the native Kuzu binding here. A broken or
 * unavailable native binding must not prevent the whole DSH plugin from loading;
 * initGraph() will catch the async initialization failure and fall back to
 * SQLite/FTS. This mirrors the "host capability must not take down the plugin"
 * rule used by the working teacher marketplace stack.
 */
export declare class KnowledgeGraph {
    db: any;
    conn: any;
    private readonly embedder;
    ready: Promise<void>;
    constructor(options: KGraphOptions);
    private init;
    private pathForDb;
    private readonly _path;
    close(): Promise<void>;
    private esc;
    private q;
    upsertQuestion(q: Question): Promise<void>;
    private rebuildCoOccurs;
    deleteQuestion(id: string): Promise<void>;
    rebuild(questions: Question[]): Promise<void>;
    vectorSearch(queryText: string, topK?: number): Promise<VectorHit[]>;
    findKnowledgePoints(query: string, topK?: number): Promise<string[]>;
    graphTraverse(startKnowledge: string[], maxHops?: number, topK?: number): Promise<GraphTraversalHit[]>;
}
export declare function projectAll(graph: KnowledgeGraph, questions: Question[]): Promise<void>;
