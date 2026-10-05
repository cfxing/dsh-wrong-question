import type { Context } from '@deepseek-ai/cordis';
import { KnowledgeGraph } from './knowledge-graph.js';
import { type Embedder } from './embedding.js';
export declare const name = "wrong-question";
export declare const inject: string[];
export declare function apply(ctx: Context): void;
/** 初始化 Kuzu 图存储并做全量投影；失败（如原生绑定缺失/库不可用）返回 null，系统降级为纯 SQLite。 */
export declare function initGraph(questions: import('./domain.js').Question[], embedder: Embedder): Promise<KnowledgeGraph | null>;
