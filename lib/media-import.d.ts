export interface QuestionArtifactInput {
    kind: 'image' | 'video' | 'html';
    title?: string;
    source?: string;
    content?: string;
    poster?: string;
}
/**
 * Make generated local artifacts plugin-owned.
 * - video.source: copy the generated local media file into wrong-question/media
 * - html.content: write the HTML card into wrong-question/media as a standalone .html file
 * - html.source/local image/source: copy local files when available
 * - remote/data URLs remain unchanged because they cannot be safely assumed to be downloadable artifacts.
 *
 * Multiple artifacts are preserved independently, so a question can have a video and an HTML card at the same time.
 */
export declare function persistQuestionArtifacts(exec: any, artifacts: readonly QuestionArtifactInput[], wrongQuestionDir: string, questionId: string): Promise<QuestionArtifactInput[]>;
