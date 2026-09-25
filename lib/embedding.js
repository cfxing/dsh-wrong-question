const DEFAULT_DIM = 2560;
/** 基于 Ollama embed API 的 embedding 提供者；Ollama 不可用时回退到确定性本地向量。 */
export class OllamaEmbedder {
    dim;
    model;
    baseUrl;
    timeoutMs;
    available = true;
    constructor(config = {}) {
        this.dim = config.dim ?? DEFAULT_DIM;
        this.model = config.model ?? 'qwen3-embedding-4b';
        this.baseUrl = (config.baseUrl ?? 'http://127.0.0.1:11434').replace(/\/$/, '');
        this.timeoutMs = config.timeoutMs ?? 5000;
    }
    get isAvailable() {
        return this.available;
    }
    async embed(text) {
        if (!this.available)
            return this.localVector(text);
        try {
            const url = `${this.baseUrl}/api/embed`;
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), this.timeoutMs);
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    signal: controller.signal,
                    body: JSON.stringify({ model: this.model, input: text.slice(0, 8000) }),
                });
                if (!res.ok)
                    throw new Error(`ollama embed ${res.status}`);
                const data = (await res.json());
                const vec = data.embeddings?.[0];
                if (!vec?.length)
                    throw new Error('empty embeddings');
                return this.normalize(vec);
            }
            finally {
                clearTimeout(timer);
            }
        }
        catch {
            // Ollama 不可用时降级到本地向量，保证向量路不阻塞整条检索链。
            this.available = false;
            return this.localVector(text);
        }
    }
    /** 确定性本地哈希向量：同一文本始终得到相同向量，可跨索引比较。 */
    localVector(text) {
        const vec = new Array(this.dim).fill(0);
        const tokens = text.normalize('NFKC').match(/[\p{L}\p{N}]+/gu) ?? [];
        for (const token of tokens) {
            // 用 token 的 3 字节混合生成索引与符号，近似词袋分布。
            let h = 0;
            for (let i = 0; i < token.length; i++)
                h = (h * 31 + token.charCodeAt(i)) >>> 0;
            const idx = h % this.dim;
            vec[idx] += ((h >>> 8) % 2 === 0 ? 1 : -1) * (0.5 + (h % 100) / 100);
        }
        // 归一化，便于余弦比较。
        const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
        return vec.map((v) => v / norm);
    }
    normalize(vec) {
        if (vec.length !== this.dim) {
            // 维度不匹配时截断/补零，避免下游 FLOAT[N] 建表失败。
            const out = new Array(this.dim).fill(0);
            for (let i = 0; i < Math.min(vec.length, this.dim); i++)
                out[i] = vec[i];
            vec = out;
        }
        const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
        return vec.map((v) => v / norm);
    }
}
/** 组合题目文本供 embedding。 */
export function questionText(q) {
    return [q.content, q.answer, q.analysis, q.mistakeCause, q.ocrText, ...q.tags, ...q.knowledgePoints]
        .filter((x) => typeof x === 'string' && x.length > 0)
        .join(' ');
}
