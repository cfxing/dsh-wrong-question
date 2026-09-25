import type { Question } from './domain.js'
import type { WrongQuestionDb } from './db.js'
import type { KnowledgeGraph } from './knowledge-graph.js'
import type { Embedder } from './embedding.js'

export type HybridSource = 'fts' | 'vector' | 'graph'

export interface HybridHit {
  question: Question
  /** RRF 融合得分（1/(k+rank)），用于排序展示。 */
  score: number
  source: HybridSource[]
  /** 图路推理路径（若图路命中）。 */
  path?: string[]
  /** 各来源的原始下标排名。 */
  ranks: Partial<Record<HybridSource, number>>
}

export interface HybridSearchOptions {
  topK?: number
  /** 是否运行向量路（默认 true；embedding 不可用自动降级）。 */
  includeVector?: boolean
  /** 是否运行图遍历路（默认 true；图库异常自动降级）。 */
  includeGraph?: boolean
}

const RRF_K = 60

/**
 * 三路混合检索：SQLite FTS（词法）+ Kuzu 向量（语义）+ Kuzu 图遍历（关系），经 RRF 融合。
 * 任一路失败都会降级跳过，不阻塞整体。
 */
export async function hybridSearch(
  db: WrongQuestionDb,
  graph: KnowledgeGraph | null,
  embedder: Embedder,
  query: string,
  options: HybridSearchOptions = {},
): Promise<HybridHit[]> {
  const topK = options.topK ?? 20
  const runVector = options.includeVector ?? true
  const runGraph = options.includeGraph ?? true

  // 路 1：词法（SQLite FTS）
  const ftsHits = db.search(query, topK)

  // 路 2：向量（Kuzu HNSW 余弦近邻）
  let vectorHits: Array<{ id: string }> = []
  if (runVector && embedder && graph) {
    try {
      vectorHits = await graph.vectorSearch(query, topK)
    } catch { /* 降级 */ }
  }

  // 路 3：图遍历（以词法+向量命中的知识点为起点，沿 HAS_POINT 反查相关题）
  let graphHits: Array<{ id: string; path: string[] }> = []
  if (runGraph && graph) {
    try {
      const seed = new Set<string>()
      for (const h of ftsHits) for (const kp of h.question.knowledgePoints) seed.add(kp)
      for (const v of vectorHits) {
        const q = db.getQuestion(v.id)
        if (q) for (const kp of q.knowledgePoints) seed.add(kp)
      }
      graphHits = (await graph.graphTraverse([...seed], 2, topK)).map((w) => ({ id: w.id, path: w.path }))
    } catch { /* 降级 */ }
  }

  // RRF 融合：各路有序候选，得分 = Σ 1/(k+rank)
  const merged = new Map<string, HybridHit>()
  const add = (id: string, source: HybridSource, rank: number, path?: string[]) => {
    const hit = merged.get(id) ?? { question: {}, score: 0, source: [], ranks: {} } as unknown as HybridHit
    hit.source.push(source)
    hit.ranks[source] = rank
    hit.score += 1 / (RRF_K + rank)
    if (path) hit.path = path
    merged.set(id, hit)
  }
  ftsHits.forEach((h, i) => add(h.question.id, 'fts', i))
  vectorHits.forEach((v, i) => add(v.id, 'vector', i))
  graphHits.forEach((g, i) => add(g.id, 'graph', i, g.path))

  const out: HybridHit[] = []
  for (const [id, hit] of merged) {
    const question = db.getQuestion(id)
    if (!question) continue
    out.push({ ...hit, question })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, topK)
}