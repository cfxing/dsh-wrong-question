export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy';
export interface ReviewState {
    reps: number;
    ease: number;
    intervalDays: number;
    dueAt: string;
    lastReviewedAt?: string;
}
export interface Question {
    id: string;
    content: string;
    answer: string;
    source?: string;
    imagePath?: string;
    imageData?: string;
    artifacts: QuestionArtifact[];
    ocrText?: string;
    knowledgePoints: string[];
    tags: string[];
    difficulty: number;
    mistakeCause?: string;
    analysis?: string;
    followupQuestion?: string;
    createdAt: string;
    updatedAt: string;
    review: ReviewState;
}
export interface QuestionArtifact {
    kind: 'image' | 'video' | 'html';
    title?: string;
    source?: string;
    content?: string;
    poster?: string;
}
export interface ReviewLog {
    id: number;
    questionId: string;
    grade: ReviewGrade;
    quality: number;
    previousIntervalDays: number;
    nextIntervalDays: number;
    easeAfter: number;
    reviewedAt: string;
}
export interface SearchHit {
    question: Question;
    score: number;
    matchType: 'fts' | 'similarity';
}
export interface Dashboard {
    totalQuestions: number;
    reviewed: number;
    due: number;
    mastered: number;
    streak: number;
    reviewCount: number;
    successRate: number;
    knowledgePoints: Array<{
        name: string;
        questionCount: number;
        mastery: number;
    }>;
    weakPoints: Array<{
        name: string;
        questionCount: number;
        mastery: number;
    }>;
    activity: Array<{
        date: string;
        count: number;
    }>;
    reviewTrend: Array<{
        date: string;
        reviews: number;
        successRate: number;
    }>;
    masteryTrend: Array<{
        date: string;
        mastered: number;
    }>;
    mistakeCauses: Array<{
        name: string;
        count: number;
    }>;
    difficulty: Array<{
        level: number;
        count: number;
    }>;
    reviewCompletionRate: number;
    weeklyReport: {
        added: number;
        reviews: number;
        successfulReviews: number;
        activeDays: number;
        strongestKnowledgePoint?: string;
        weakestKnowledgePoint?: string;
    };
}
export interface KnowledgeGraph {
    nodes: Array<{
        id: string;
        count: number;
        mastery: number;
        due: number;
    }>;
    edges: Array<{
        source: string;
        target: string;
        weight: number;
    }>;
}
