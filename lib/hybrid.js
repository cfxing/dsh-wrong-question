const RRF_K = 60;
export async function hybridSearch(db, graph, embedder, query, options = {}) {
    const topK = Math.min(50, Math.max(1, options.topK ?? 20)), runVector = options.includeVector ?? true, runGraph = options.includeGraph ?? true;
    const ftsHits = db.search(query, topK);
    let vectorHits = [];
    if (runVector && graph) {
        try {
            vectorHits = await graph.vectorSearch(query, topK);
        }
        catch { }
    }
    let graphHits = [], seed = [];
    if (runGraph && graph) {
        try {
            // 图路拥有独立的 query -> knowledge point recall，不再依赖 FTS/vector 命中。
            seed = await graph.findKnowledgePoints(query, topK);
            const ftsSeed = ftsHits.flatMap(h => h.question.knowledgePoints);
            seed = [...new Set([...seed, ...ftsSeed])].slice(0, topK);
            graphHits = (await graph.graphTraverse(seed, 2, topK)).map(x => ({ id: x.id, path: x.path }));
        }
        catch { }
    }
    const merged = new Map();
    const add = (id, source, rank, path) => {
        const hit = merged.get(id) ?? { question: null, score: 0, source: [], ranks: {} };
        if (!hit.source.includes(source))
            hit.source.push(source);
        hit.ranks[source] = rank;
        hit.score += 1 / (RRF_K + rank + 1);
        if (path)
            hit.path = path;
        merged.set(id, hit);
    };
    ftsHits.forEach((h, i) => add(h.question.id, 'fts', i));
    vectorHits.forEach((h, i) => add(h.id, 'vector', i));
    graphHits.forEach((h, i) => add(h.id, 'graph', i, h.path));
    const out = [];
    for (const [id, h] of merged) {
        const q = db.getQuestion(id);
        if (q)
            out.push({ ...h, question: q });
    }
    return out.sort((a, b) => b.score - a.score).slice(0, topK);
}
