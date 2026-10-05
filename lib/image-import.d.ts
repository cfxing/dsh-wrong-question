export interface PersistedQuestionImage {
    path: string;
    mimeType: string;
    name?: string;
    attachmentId: string;
}
export interface DurableImageRef {
    attachmentId: unknown;
    mediaType: string;
    name?: string;
}
/**
 * Track current-turn direct user image attachments from durable session events.
 * This avoids deprecated synchronous Session history readers and only retains the
 * small set of image references needed by a live tool call.
 */
export declare function createCurrentTurnImageTracker(ctx: any): {
    refsFor(session: any): DurableImageRef[];
    reset(session: any): void;
};
/**
 * Copy current-turn durable normalized images into the wrong-question-owned media directory.
 * DSH's attachment store remains the source of truth for admitted user images; this creates
 * a plugin-owned copy so the wrong-question record remains self-contained.
 */
export declare function persistCurrentTurnImages(exec: any, attachments: any, wrongQuestionDir: string, questionId: string, refs?: readonly DurableImageRef[]): Promise<PersistedQuestionImage[]>;
