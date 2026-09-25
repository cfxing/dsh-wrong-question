import { Database as KuzuDb, Connection as KuzuConn } from 'kuzu';
const DEFAULT_TOP_K = 20;
/**
 * Kuzu 图存储层：错题本的知识图谱。
 * - 节点：QuestionNode(id, embedding[FLOAT[dim]], source, updatedAt)；WordNode(name) 知识点。
 * - 边：QuestionNode -[:HAS_POINT]-> WordNode。
 * - 向量召回：在 QuestionNode.embedding 建 HNSW 余弦索引（Kuzu 0.11.3 vector 扩展）。
 * - 图遍历：从知识点出发，沿 HAS_POINT 反查相关错题，支持共现多跳。
 *
 * Kuzu 是嵌入式图库，数据落在工作目录下的 `knowledge.kuzu`，无需服务进程。
 * 分工：词法落在 SQLite FTS；向量与图谱落在 Kuzu。
 */
export class KnowledgeGraph {
    db;
    conn;
    embedder;
    ready;
    constructor(options) {
        this.embedder = options.embedder;
        this.db = new KuzuDb(options.path);
        this.conn = new KuzuConn(this.db);
        this.ready = this.init();
    }
    async init() {
        await this.conn.init();
        // 0.11.3 内置向量/数组函数（ARRAY_COSINE_SIMILARITY 等）可直接使用。
        // 注意：HNSW 向量索引（CREATE_VECTOR_INDEX）依赖 vector 扩展，Node 绑定当前无法加载，
        // 故向量召回退化为全表余弦扫描——对错题本小数据规模足够。
        await this.conn.query(`
      CREATE NODE TABLE IF NOT EXISTS QuestionNode (
        id STRING PRIMARY KEY,
        text STRING,
        embedding FLOAT[${this.embedder.dim}],
        source STRING,
        updatedAt STRING
      )
    `);
        await this.conn.query(`
      CREATE NODE TABLE IF NOT EXISTS WordNode (
        name STRING PRIMARY KEY
      )
    `);
        await this.conn.query(`
      CREATE REL TABLE IF NOT EXISTS HAS_POINT (FROM QuestionNode TO WordNode)
    `);
    }
    async close() {
        await this.conn.close();
        this.db.close();
    }
    esc(s) {
        return s.replace(/'/g, "''");
    }
    /** 写入/更新一道错题：QuestionNode(含向量) + 关联知识点 WordNode + HAS_POINT 边。 */
    async upsertQuestion(q) {
        const text = [q.content, q.answer, q.analysis, q.ocrText, ...q.knowledgePoints, ...q.tags]
            .filter((x) => typeof x === 'string' && x.length > 0)
            .join(' ');
        const vec = await this.embedder.embed(text);
        const vecLit = `[${vec.join(',')}]`;
        await this.q(`MERGE (qn:QuestionNode {id: '${this.esc(q.id)}'})
      SET qn.text = '${this.esc(text)}', qn.embedding = ${vecLit}, qn.source = '${this.esc(q.source ?? '')}', qn.updatedAt = '${this.esc(q.updatedAt)}'`);
        // 清旧边，重建知识点关联，避免重复。
        await this.q(`MATCH (qn:QuestionNode {id: '${this.esc(q.id)}'})-[h:HAS_POINT]->(:WordNode) DELETE h`).catch(() => { });
        for (const kp of q.knowledgePoints) {
            const name = kp.trim();
            if (!name)
                continue;
            await this.q(`MERGE (w:WordNode {name: '${this.esc(name)}'})`);
            await this.q(`MATCH (qn:QuestionNode {id: '${this.esc(q.id)}'}), (w:WordNode {name: '${this.esc(name)}'})
        MERGE (qn)-[:HAS_POINT]->(w)`);
        }
    }
    /** 删除错题（QuestionNode 及出边级联删除）。 */
    async deleteQuestion(id) {
        await this.q(`MATCH (qn:QuestionNode {id: '${this.esc(id)}'}) DELETE qn`).catch(() => { });
    }
    /** 全量重建：清空节点后按现有错题重建。 */
    async rebuild(questions) {
        for (const t of ['QuestionNode', 'WordNode']) {
            await this.q(`MATCH (n:${t}) DELETE n`).catch(() => { });
        }
        for (const q of questions)
            await this.upsertQuestion(q);
    }
    async q(text) {
        const rs = await this.conn.query(text);
        const res = Array.isArray(rs) ? rs[0] : rs;
        return (await res.getAll());
    }
    /** 向量召回：对查询文本 embedding 做 top-k 余弦近邻（全表扫描；Node 绑定无 HNSW 索引）。 */
    async vectorSearch(queryText, topK = DEFAULT_TOP_K) {
        const vec = await this.embedder.embed(queryText);
        const vecLit = `[${vec.join(',')}]`;
        const cast = `CAST(${vecLit}, 'FLOAT[${this.embedder.dim}]')`;
        const rs = await this.q(`MATCH (qn:QuestionNode)
      WHERE qn.embedding IS NOT NULL
      WITH qn.id AS qid, ARRAY_COSINE_SIMILARITY(qn.embedding, ${cast}) AS sim
      ORDER BY sim DESC
      LIMIT ${topK}
      RETURN qid, sim`);
        return rs.map((r) => ({ id: String(r.qid), distance: 1 - Number(r.sim) }));
    }
    /** 图遍历：从起点知识点出发，沿 HAS_POINT 反查相关错题；每跳扩展共现知识点。 */
    async graphTraverse(startKnowledge, maxHops = 2, topK = DEFAULT_TOP_K) {
        const seen = new Map();
        let boundary = [...new Set(startKnowledge.map((s) => s.trim()).filter(Boolean))];
        if (boundary.length === 0)
            return [];
        for (let hop = 1; hop <= maxHops && boundary.length > 0; hop++) {
            const names = boundary.map((n) => `'${this.esc(n)}'`).join(',');
            const rs = await this.q(`MATCH (qn:QuestionNode)-[:HAS_POINT]->(w:WordNode)
        WHERE w.name IN [${names}]
        RETURN DISTINCT qn.id AS id, w.name AS kp`).catch(() => null);
            if (!rs)
                continue;
            const rows = rs;
            for (const r of rows) {
                const id = String(r.id);
                const kp = String(r.kp);
                const prev = seen.get(id);
                if (prev) {
                    if (!prev.path.includes(kp))
                        prev.path.push(kp);
                    if (hop > prev.hops)
                        prev.hops = hop;
                }
                else {
                    seen.set(id, { id, path: [kp], hops: hop });
                }
            }
            // 下一跳边界：本跳出现过的知识点（去重），形成共现扩散。
            boundary = [...new Set(rows.map((r) => String(r.kp)))];
        }
        return [...seen.values()].slice(0, topK);
    }
}
/** 全量投影：将 SQLite 中的全部错题同步到 Kuzu 图。 */
export function projectAll(graph, questions) {
    return graph.rebuild(questions);
}
