import type { Question } from './domain.js'
import type { WrongQuestionDb } from './db.js'
import type { KnowledgeGraph } from './knowledge-graph.js'
import type { Embedder } from './embedding.js'

export type HybridSource='fts'|'vector'|'graph'
export interface HybridHit { question:Question; score:number; source:HybridSource[]; path?:string[]; ranks:Partial<Record<HybridSource,number>> }
export interface HybridSearchOptions { topK?:number; includeVector?:boolean; includeGraph?:boolean }
const RRF_K=60

export async function hybridSearch(db:WrongQuestionDb,graph:KnowledgeGraph|null,embedder:Embedder,query:string,options:HybridSearchOptions={}):Promise<HybridHit[]>{
  const topK=Math.min(50,Math.max(1,options.topK??20)),runVector=options.includeVector??true,runGraph=options.includeGraph??true
  const ftsHits=db.search(query,topK)
  let vectorHits:Array<{id:string}>=[]
  if(runVector&&graph){try{vectorHits=await graph.vectorSearch(query,topK)}catch{}}
  let graphHits:Array<{id:string;path:string[]}>=[],seed:string[]=[]
  if(runGraph&&graph){
    try{
      // 图路拥有独立的 query -> knowledge point recall，不再依赖 FTS/vector 命中。
      seed=await graph.findKnowledgePoints(query,topK)
      const ftsSeed=ftsHits.flatMap(h=>h.question.knowledgePoints)
      seed=[...new Set([...seed,...ftsSeed])].slice(0,topK)
      graphHits=(await graph.graphTraverse(seed,2,topK)).map(x=>({id:x.id,path:x.path}))
    }catch{}
  }
  const merged=new Map<string,HybridHit>()
  const add=(id:string,source:HybridSource,rank:number,path?:string[])=>{
    const hit=merged.get(id)??({question:null as unknown as Question,score:0,source:[],ranks:{}} as HybridHit)
    if(!hit.source.includes(source))hit.source.push(source)
    hit.ranks[source]=rank;hit.score+=1/(RRF_K+rank+1);if(path)hit.path=path;merged.set(id,hit)
  }
  ftsHits.forEach((h,i)=>add(h.question.id,'fts',i))
  vectorHits.forEach((h,i)=>add(h.id,'vector',i))
  graphHits.forEach((h,i)=>add(h.id,'graph',i,h.path))
  const out:HybridHit[]=[]
  for(const [id,h] of merged){const q=db.getQuestion(id);if(q)out.push({...h,question:q})}
  return out.sort((a,b)=>b.score-a.score).slice(0,topK)
}
