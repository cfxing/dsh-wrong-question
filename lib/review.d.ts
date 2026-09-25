import type { ReviewGrade, ReviewState } from './domain.js';
export declare function scheduleReview(previous: ReviewState, grade: ReviewGrade, now?: Date): {
    quality: number;
    state: {
        reps: number;
        ease: number;
        intervalDays: number;
        dueAt: string;
        lastReviewedAt: string;
    };
};
export declare function isDue(state: ReviewState, now?: Date): boolean;
