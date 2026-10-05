import type { Context } from '@deepseek-ai/cordis';
export type RuntimeContextLike = Context & {
    webServer?: {
        register(route: {
            kind: 'exact' | 'prefix';
            path: string;
            handler: (req: any, res: any) => void | Promise<void>;
        }): () => void;
    };
};
