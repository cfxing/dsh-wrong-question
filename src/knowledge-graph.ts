import { Database as KuzuDb, Connection as KuzuConn } from 'kuzu'
import type { Question } from './domain.js'
import type { Embedder } from './embedding.js'

export interface KGraphOptions { path:string; embedder:Embedder }
export interface VectorHit { id:string; distance:number }
export interface GraphTraversalHit { id:string; path:string[]; hops:number }
const DEFAULT_TOP_K=20

export class KnowledgeGraph {
  readonly db:KuzuDb
  readonly conn:KuzuConn
  private readonly embedder:Embedder
  ready:Promise<void>

  constructor(options:KGraphOptions){this.embedder=options.embedder;this.db=new KuzuDb(options.path);this.conn=new KuzuConn(this.db);this.ready=this.init()}

  private async init(){
    await this.conn.init()
    await this.conn.query('CREATE NODE TABLE IF NOT EXISTS Question (id STRING PRIMARY KEY,text STRING,embedding FLOAT['+this.embedder.dim+'],source STRING,updatedAt STRING)')
    await this.conn.query('CREATE NODE TABLE IF NOT EXISTS KnowledgePoint (name STRING PRIMARY KEY)')
    await this.conn.query('CREATE NODE TABLE IF NOT EXISTS Tag (name STRING PRIMARY KEY)')
    await this.conn.query('CREATE NODE TABLE IF NOT EXISTS MistakeCause (name STRING PRIMARY KEY)')
    await this.conn.query('CREATE REL TABLE IF NOT EXISTS HAS_POINT (FROM Question TO KnowledgePoint)')
    await this.conn.query('CREATE REL TABLE IF NOT EXISTS HAS_TAG (FROM Question TO Tag)')
    await this.conn.query('CREATE REL TABLE IF NOT EXISTS HAS_CAUSE (FROM Question TO MistakeCause)')
    await this.conn.query('CREATE REL TABLE IF NOT EXISTS CO_OCCURS (FROM KnowledgePoint TO KnowledgePoint, weight INT32)')
    await this.conn.query('CREATE REL TABLE IF NOT EXISTS SIMILAR_TO (FROM Question TO Question, score DOUBLE)')
  }

  async close(){await this.conn.close();this.db.close()}
  private esc(s:string){return s.replace(/'/g,"''")}
  private async q(text:string):Promise<Record<string,unknown>[]> {const rs=await this.conn.query(text);const res=Array.isArray(rs)?rs[0]:rs;return(await res.getAll()) as Record<string,unknown>[]}

  async upsertQuestion(q:Question){
    const text=[q.content,q.answer,q.analysis,q.mistakeCause,q.ocrText,...q.knowledgePoints,...q.tags].filter((x):x is string=>!!x).join(' ')
    const vec=await this.embedder.embed(text),lit='['+vec.join(',')+']',id=this.esc(q.id)
    await this.q("MERGE (n:Question {id:'"+id+"'}) SET n.text='"+this.esc(text)+"', n.embedding="+lit+", n.source='"+this.esc(q.source??'')+"', n.updatedAt='"+this.esc(q.updatedAt)+"'")
    for(const rel of ['HAS_POINT','HAS_TAG','HAS_CAUSE'])await this.q("MATCH (n:Question {id:'"+id+"'})-[r:"+rel+"]->() DELETE r").catch(()=>{})
    for(const name of [...new Set(q.knowledgePoints.map(x=>x.trim()).filter(Boolean))]){
      await this.q("MERGE (k:KnowledgePoint {name:'"+this.esc(name)+"'})")
      await this.q("MATCH (n:Question {id:'"+id+"'}),(k:KnowledgePoint {name:'"+this.esc(name)+"'}) MERGE (n)-[:HAS_POINT]->(k)")
    }
    for(const name of [...new Set(q.tags.map(x=>x.trim()).filter(Boolean))]){
      await this.q("MERGE (t:Tag {name:'"+this.esc(name)+"'})")
      await this.q("MATCH (n:Question {id:'"+id+"'}),(t:Tag {name:'"+this.esc(name)+"'}) MERGE (n)-[:HAS_TAG]->(t)")
    }
    if(q.mistakeCause?.trim()){
      const name=q.mistakeCause.trim()
      await this.q("MERGE (c:MistakeCause {name:'"+this.esc(name)+"'})")
      await this.q("MATCH (n:Question {id:'"+id+"'}),(c:MistakeCause {name:'"+this.esc(name)+"'}) MERGE (n)-[:HAS_CAUSE]->(c)")
    }
    for(let i=0;i<q.knowledgePoints.length;i++)for(let j=i+1;j<q.knowledgePoints.length;j++){
      const a=q.knowledgePoints[i].trim(),b=q.knowledgePoints[j].trim();if(!a||!b||a===b)continue
      await this.q("MERGE (a:KnowledgePoint {name:'"+this.esc(a)+"'})");await this.q("MERGE (b:KnowledgePoint {name:'"+this.esc(b)+"'})")
      await this.q("MATCH (a:KnowledgePoint {name:'"+this.esc(a)+"'}),(b:KnowledgePoint {name:'"+this.esc(b)+"'}) MERGE (a)-[r:CO_OCCURS]->(b) SET r.weight=coalesce(r.weight,0)+1")
      await this.q("MATCH (a:KnowledgePoint {name:'"+this.esc(b)+"'}),(b:KnowledgePoint {name:'"+this.esc(a)+"'}) MERGE (a)-[r:CO_OCCURS]->(b) SET r.weight=coalesce(r.weight,0)+1")
    }
  }

  async deleteQuestion(id:string){await this.q("MATCH (n:Question {id:'"+this.esc(id)+"'}) DETACH DELETE n").catch(()=>{})}

  async rebuild(questions:Question[]){
    for(const t of ['Question','KnowledgePoint','Tag','MistakeCause'])await this.q('MATCH (n:'+t+') DETACH DELETE n').catch(()=>{})
    for(const q of questions)await this.upsertQuestion(q)
  }

  async vectorSearch(queryText:string,topK=DEFAULT_TOP_K):Promise<VectorHit[]>{
    const vec=await this.embedder.embed(queryText),cast="CAST(["+vec.join(',')+"], 'FLOAT["+this.embedder.dim+"]')"
    const rows=await this.q("MATCH (n:Question) WHERE n.embedding IS NOT NULL WITH n.id AS id, ARRAY_COSINE_SIMILARITY(n.embedding,"+cast+") AS sim ORDER BY sim DESC LIMIT "+Math.max(1,Math.min(100,topK))+" RETURN id,sim")
    return rows.map(r=>({id:String(r.id),distance:1-Number(r.sim)}))
  }

  async findKnowledgePoints(query:string,topK=20):Promise<string[]>{
    const terms=query.normalize('NFKC').toLocaleLowerCase().match(/[\\p{L}\\p{N}]+/gu)??[]
    const rows=await this.q('MATCH (k:KnowledgePoint) RETURN k.name AS name').catch(()=>[])
    const scored=(rows as Record<string,unknown>[]).map(r=>{const name=String(r.name),low=name.toLocaleLowerCase();let score=0;for(const t of terms)if(low.includes(t)||t.includes(low))score+=1;return{name,score}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score)
    return scored.slice(0,topK).map(x=>x.name)
  }

  async graphTraverse(startKnowledge:string[],maxHops=2,topK=DEFAULT_TOP_K):Promise<GraphTraversalHit[]>{
    const seeds=[...new Set(startKnowledge.map(s=>s.trim()).filter(Boolean))];if(!seeds.length)return[]
    const seen=new Map<string,GraphTraversalHit>();let boundary=seeds
    for(let hop=1;hop<=maxHops&&boundary.length;hop++){
      const names=boundary.map(n=>"'"+this.esc(n)+"'").join(',')
      const rows=await this.q("MATCH (q:Question)-[:HAS_POINT]->(k:KnowledgePoint) WHERE k.name IN ["+names+"] RETURN DISTINCT q.id AS id,k.name AS kp").catch(()=>[])
      for(const r of rows){const id=String(r.id),kp=String(r.kp),old=seen.get(id);if(old){if(!old.path.includes(kp))old.path.push(kp);old.hops=Math.max(old.hops,hop)}else seen.set(id,{id,path:[kp],hops:hop})}
      const next=await this.q("MATCH (a:KnowledgePoint)-[:CO_OCCURS]->(b:KnowledgePoint) WHERE a.name IN ["+names+"] RETURN DISTINCT b.name AS name").catch(()=>[])
      boundary=[...new Set((next as Record<string,unknown>[]).map(r=>String(r.name)).filter(x=>x))]
    }
    return[...seen.values()].slice(0,topK)
  }
}

export function projectAll(graph:KnowledgeGraph,questions:Question[]):Promise<void>{return graph.rebuild(questions)}
