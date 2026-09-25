import { DatabaseSync } from 'node:sqlite';
import type { Question, ReviewGrade, ReviewLog, ReviewState, SearchHit, Dashboard, KnowledgeGraph } from './domain.js';
export interface GraphSyncHook {
    upsert(question: Question): Promise<void> | void;
    delete(id: string): Promise<void> | void;
    close(): Promise<void> | void;
}
export declare class WrongQuestionDb {
    readonly db: DatabaseSync;
    /** 写入 SQLite 时同步更新 Kuzu 图谱的旁路钩子（可空）。 */
    private graphSync?;
    constructor(path: string, graphSync?: GraphSyncHook);
    close(): void;
    getQuestion(id: string): Question | null;
    upsert(input: Partial<Omit<Question, 'review' | 'createdAt' | 'updatedAt'>> & {
        content: string;
        id?: string;
    }): Question;
    private reindex;
    delete(id: string): boolean;
    list({ limit, offset, tag, knowledgePoint, dueOnly }?: {
        limit?: number;
        offset?: number;
        tag?: string;
        knowledgePoint?: string;
        dueOnly?: boolean;
    }): Question[];
    search(query: string, limit?: number): SearchHit[];
    findSimilar(id: string, limit?: number): SearchHit[];
    recall(query: string, limit?: number): SearchHit[];
    due(limit?: number): Question[];
    review(id: string, grade: ReviewGrade, next: ReviewState): ReviewLog;
    logs(limit?: number): ReviewLog[];
    all(): Question[];
    dashboard(): Dashboard;
    graph(): KnowledgeGraph;
}
