import type { Question } from './domain.js';
export interface Embedder {
    readonly dim: number;
    embed(text: string): Promise<number[]>;
    /** 返回题目文本的确定性本地向量（无 Ollama 时的降级），用于保持向量路可用。 */
    localVector(text: string): number[];
}
export interface EmbedConfig {
    /** Ollama 启动的 Qwen3-Embedding-4B 模型名，如 'qwen3-embedding-4b:q4_k_m'（按本地 tag 调整）。 */
    model?: string;
    /** Ollama 地址，默认 http://127.0.0.1:11434 */
    baseUrl?: string;
    /** 期望向量维度，需与模型输出一致（Qwen3-Embedding-4B 为 2560）。 */
    dim?: number;
    /** 请求超时（毫秒），默认 5000。 */
    timeoutMs?: number;
}
/** 基于 Ollama embed API 的 embedding 提供者；Ollama 不可用时回退到确定性本地向量。 */
export declare class OllamaEmbedder implements Embedder {
    readonly dim: number;
    private readonly model;
    private readonly baseUrl;
    private readonly timeoutMs;
    private available;
    constructor(config?: EmbedConfig);
    get isAvailable(): boolean;
    embed(text: string): Promise<number[]>;
    /** 确定性本地哈希向量：同一文本始终得到相同向量，可跨索引比较。 */
    localVector(text: string): number[];
    private normalize;
}
/** 组合题目文本供 embedding。 */
export declare function questionText(q: Question): string;
