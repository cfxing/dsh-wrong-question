import { DatabaseSync } from 'node:sqlite';
import type { Question, ReviewGrade, ReviewLog, ReviewState, SearchHit, Dashboard, KnowledgeGraph, WrongQuestionAnalysis, LearningGap, QuestionVariant, QuestionAttempt } from './domain.js';
export interface GraphSyncHook {
    upsert(question: Question): Promise<void> | void;
    delete(id: string): Promise<void> | void;
    close(): Promise<void> | void;
}
export declare class WrongQuestionDb {
    readonly db: DatabaseSync;
    private graphSync?;
    constructor(path: string, graphSync?: GraphSyncHook);
    private ensureSchema;
    close(): void;
    private hydrate;
    getQuestion(id: string): Question;
    getMedia(questionId: string, mediaId: string): any;
    addQuestionImage(input: {
        questionId: string;
        source: string;
        mimeType?: string;
        title?: string;
    }): {
        id: string;
        questionId: string;
        kind: "image";
        title: any;
        source: string;
        mimeType: any;
    };
    getQuestionDetail(questionId: string): {
        question: Question;
        analysis: WrongQuestionAnalysis | null;
        learningGaps: {
            id: string;
            name: string;
            description: any;
            severity: number;
            confidence: number;
            createdAt: string;
            updatedAt: string;
        }[];
        variants: QuestionVariant[];
        attempts: QuestionAttempt[];
    } | null;
    getQuestionAnalysis(questionId: string): WrongQuestionAnalysis | null;
    private ensureLearningGap;
    saveQuestionAnalysis(input: {
        questionId: string;
        solution?: string;
        mistakeType?: string;
        reasoningError?: string;
        knowledgeGaps?: Array<string | {
            name: string;
            description?: string;
            severity?: number;
            confidence?: number;
        }>;
        reasoningGaps?: string[];
        correctionStrategy?: string[];
        variantSuggestions?: string[];
        confidence?: number;
        generatedBy?: string;
    }): WrongQuestionAnalysis;
    getLearningGaps(limit?: number): Array<LearningGap & {
        questionCount: number;
        dueCount: number;
        confidence: number;
    }>;
    addQuestionVariant(input: {
        questionId: string;
        variantType: string;
        content: string;
        answer?: string;
        analysis?: string;
        difficulty?: number;
        source?: string;
        generatedBy?: string;
    }): QuestionVariant;
    listQuestionVariants(questionId: string, limit?: number): QuestionVariant[];
    recordQuestionAttempt(input: {
        questionId: string;
        variantId?: string;
        userAnswer?: string;
        isCorrect?: boolean;
        score?: number;
        timeSpentMs?: number;
        mistakeCause?: string;
        analysis?: string;
    }): QuestionAttempt;
    listQuestionAttempts(questionId: string, limit?: number): QuestionAttempt[];
    private ensure;
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
