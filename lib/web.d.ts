import type { RuntimeContextLike } from './runtime.js';
import { WrongQuestionDb } from './db.js';
import type { KnowledgeGraph } from './knowledge-graph.js';
import type { Embedder } from './embedding.js';
export declare function registerWrongQuestionWeb(ctx: RuntimeContextLike, db: WrongQuestionDb, hybrid?: {
    graph: KnowledgeGraph | null;
    embedder: Embedder;
}): () => void;
