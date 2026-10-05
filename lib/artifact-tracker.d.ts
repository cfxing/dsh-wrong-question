import type { QuestionArtifact } from './domain.js';
export interface CurrentTurnTeachingArtifact extends QuestionArtifact {
    kind: 'html';
    content: string;
}
/**
 * Capture OpenMAIC visual results from the authoritative tool-result boundary.
 *
 * dsh-openmaic attaches the replayable teaching content to ToolResult.meta:
 * - openmaic_render -> { kind: 'openmaic-render', fragment, title }
 * - openmaic_widget -> { kind: 'openmaic-widget', html, title }
 *
 * We use session/event only for the turn boundary. The actual OpenMAIC capture
 * happens on tools/result, where the normalized immutable ToolResult is already
 * available with its presentation metadata.
 */
export declare function createCurrentTurnTeachingArtifactTracker(ctx: any): {
    artifactsFor(session: any): CurrentTurnTeachingArtifact[];
    reset(session: any): void;
};
