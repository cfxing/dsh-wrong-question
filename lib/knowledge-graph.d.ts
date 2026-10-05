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
    path: string[];
    hops: number;
}
export declare class KnowledgeGraph {
    readonly db: KuzuDb;
    readonly conn: KuzuConn;
    private readonly embedder;
    ready: Promise<void>;
    constructor(options: KGraphOptions);
    private init;
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
