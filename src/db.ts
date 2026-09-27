import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { Question, QuestionArtifact, ReviewGrade, ReviewLog, ReviewState, SearchHit, Dashboard, KnowledgeGraph } from './domain.js'
import { isDue } from './review.js'

const SCHEMA_VERSION = 2

function parseArray(value: unknown): string[] {
  try { const v = JSON.parse(String(value ?? '[]')); return Array.isArray(v) ? v.map(String) : [] } catch { return [] }
}

function parseQuestion(row: any): Question {
  const media = Array.isArray(row.__media) ? row.__media : []
  const artifacts: QuestionArtifact[] = media.filter((m:any) => ['image','video','html'].includes(m.kind))
    .map((m:any) => ({kind:m.kind,title:m.title ?? undefined,source:m.source ?? undefined,content:m.content ?? undefined,poster:m.poster ?? undefined}))
  const image = media.find((m:any) => m.kind === 'image')
  return {
    id:row.id, content:row.content, answer:row.answer ?? '', source:row.source ?? undefined,
    imagePath:image?.source ?? undefined, imageData:image?.content?.startsWith('data:image/') ? image.content : undefined,
    artifacts, ocrText:row.ocr_text ?? undefined, knowledgePoints:parseArray(row.__knowledge_points),
    tags:parseArray(row.__tags), difficulty:Number(row.difficulty ?? 3), mistakeCause:row.mistake_cause ?? undefined,
    analysis:row.analysis ?? undefined, followupQuestion:row.followup_question ?? undefined,
    createdAt:row.created_at, updatedAt:row.updated_at,
    review:{reps:Number(row.reps ?? 0),ease:Number(row.ease ?? 2.5),intervalDays:Number(row.interval_days ?? 0),dueAt:row.due_at,lastReviewedAt:row.last_reviewed_at ?? undefined}
  }
}

export interface GraphSyncHook { upsert(question:Question):Promise<void>|void; delete(id:string):Promise<void>|void; close():Promise<void>|void }

export class WrongQuestionDb {
  readonly db: DatabaseSync
  private graphSync?: GraphSyncHook

  constructor(path:string, graphSync?:GraphSyncHook) {
    mkdirSync(dirname(path),{recursive:true}); this.graphSync=graphSync; this.db=new DatabaseSync(path)
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;')
    this.ensureSchema()
  }

  private ensureSchema() {
    const version=Number((this.db.prepare('PRAGMA user_version').get() as any)?.user_version ?? 0)
    if(version===SCHEMA_VERSION)return
    this.db.exec('DROP TABLE IF EXISTS questions_fts; DROP TABLE IF EXISTS review_logs; DROP TABLE IF EXISTS review_states; DROP TABLE IF EXISTS question_media; DROP TABLE IF EXISTS question_mistake_causes; DROP TABLE IF EXISTS mistake_causes; DROP TABLE IF EXISTS question_tags; DROP TABLE IF EXISTS tags; DROP TABLE IF EXISTS question_knowledge_points; DROP TABLE IF EXISTS knowledge_points; DROP TABLE IF EXISTS questions;')
    this.db.exec(
      'CREATE TABLE questions (' +
      'id TEXT PRIMARY KEY, content TEXT NOT NULL, answer TEXT NOT NULL DEFAULT "", ocr_text TEXT, source TEXT, ' +
      'difficulty INTEGER NOT NULL DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5), mistake_cause TEXT, analysis TEXT, followup_question TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);' +
      'CREATE TABLE question_media (id TEXT PRIMARY KEY, question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE, ' +
      'kind TEXT NOT NULL CHECK (kind IN ("image","video","html","text")), title TEXT, source TEXT, content TEXT, mime_type TEXT, poster TEXT, sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);' +
      'CREATE TABLE knowledge_points (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT, parent_id TEXT REFERENCES knowledge_points(id) ON DELETE SET NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);' +
      'CREATE TABLE question_knowledge_points (question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE, knowledge_point_id TEXT NOT NULL REFERENCES knowledge_points(id) ON DELETE CASCADE, importance REAL NOT NULL DEFAULT 1.0, PRIMARY KEY(question_id,knowledge_point_id));' +
      'CREATE TABLE tags (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL);' +
      'CREATE TABLE question_tags (question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE, tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE, PRIMARY KEY(question_id,tag_id));' +
      'CREATE TABLE mistake_causes (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT, created_at TEXT NOT NULL);' +
      'CREATE TABLE question_mistake_causes (question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE, mistake_cause_id TEXT NOT NULL REFERENCES mistake_causes(id) ON DELETE CASCADE, confidence REAL NOT NULL DEFAULT 1.0, PRIMARY KEY(question_id,mistake_cause_id));' +
      'CREATE TABLE review_states (question_id TEXT PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE, reps INTEGER NOT NULL DEFAULT 0, ease REAL NOT NULL DEFAULT 2.5, interval_days INTEGER NOT NULL DEFAULT 0, due_at TEXT NOT NULL, last_reviewed_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);' +
      'CREATE TABLE review_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE, grade TEXT NOT NULL CHECK (grade IN ("again","hard","good","easy")), quality INTEGER NOT NULL, previous_interval_days INTEGER NOT NULL, next_interval_days INTEGER NOT NULL, ease_before REAL NOT NULL, ease_after REAL NOT NULL, reviewed_at TEXT NOT NULL);' +
      'CREATE INDEX idx_questions_updated ON questions(updated_at); CREATE INDEX idx_review_due ON review_states(due_at); ' +
      'CREATE INDEX idx_qkp_kp ON question_knowledge_points(knowledge_point_id); CREATE INDEX idx_qtag_tag ON question_tags(tag_id); CREATE INDEX idx_qcause_cause ON question_mistake_causes(mistake_cause_id);' +
      'CREATE VIRTUAL TABLE questions_fts USING fts5(question_id UNINDEXED,content,ocr_text,answer,knowledge_points,tags,mistake_cause,analysis);' +
      'PRAGMA user_version = 2;'
    )
  }

  close(){this.db.close();void this.graphSync?.close?.()}

  private hydrate(rows:any[]):Question[] {
    if(!rows.length)return []
    const ids=rows.map(r=>String(r.id)), ph=ids.map(()=>'?').join(',')
    const media=this.db.prepare('SELECT * FROM question_media WHERE question_id IN ('+ph+') ORDER BY sort_order,created_at').all(...ids) as any[]
    const kps=this.db.prepare('SELECT qkp.question_id,kp.name FROM question_knowledge_points qkp JOIN knowledge_points kp ON kp.id=qkp.knowledge_point_id WHERE qkp.question_id IN ('+ph+') ORDER BY kp.name').all(...ids) as any[]
    const tags=this.db.prepare('SELECT qt.question_id,t.name FROM question_tags qt JOIN tags t ON t.id=qt.tag_id WHERE qt.question_id IN ('+ph+') ORDER BY t.name').all(...ids) as any[]
    const states=this.db.prepare('SELECT * FROM review_states WHERE question_id IN ('+ph+')').all(...ids) as any[]
    const mb=new Map<string,any[]>(),kb=new Map<string,string[]>(),tb=new Map<string,string[]>(),sb=new Map<string,any>()
    for(const x of media){const a=mb.get(x.question_id)??[];a.push(x);mb.set(x.question_id,a)}
    for(const x of kps){const a=kb.get(x.question_id)??[];a.push(String(x.name));kb.set(x.question_id,a)}
    for(const x of tags){const a=tb.get(x.question_id)??[];a.push(String(x.name));tb.set(x.question_id,a)}
    for(const x of states)sb.set(x.question_id,x)
    return rows.map(r=>parseQuestion({...r,__media:mb.get(r.id)??[],__knowledge_points:JSON.stringify(kb.get(r.id)??[]),__tags:JSON.stringify(tb.get(r.id)??[]),...(sb.get(r.id)??{})}))
  }

  getQuestion(id:string){const rows=this.db.prepare('SELECT * FROM questions WHERE id=?').all(id) as any[];return this.hydrate(rows)[0]??null}

  private ensure(table:'knowledge_points'|'tags'|'mistake_causes',name:string,now:string) {
    const id=crypto.randomUUID()
    if(table==='knowledge_points')this.db.prepare('INSERT OR IGNORE INTO knowledge_points(id,name,created_at,updated_at) VALUES(?,?,?,?)').run(id,name,now,now)
    else if(table==='tags')this.db.prepare('INSERT OR IGNORE INTO tags(id,name,created_at) VALUES(?,?,?)').run(id,name,now)
    else this.db.prepare('INSERT OR IGNORE INTO mistake_causes(id,name,created_at) VALUES(?,?,?)').run(id,name,now)
    return String((this.db.prepare('SELECT id FROM '+table+' WHERE name=?').get(name) as any).id)
  }

  upsert(input:Partial<Omit<Question,'review'|'createdAt'|'updatedAt'>> & {content:string;id?:string}):Question {
    const now=new Date().toISOString(),id=input.id??crypto.randomUUID(),old=this.getQuestion(id)
    const review=old?.review??{reps:0,ease:2.5,intervalDays:0,dueAt:now},created=old?.createdAt??now
    this.db.exec('BEGIN')
    try {
      this.db.prepare('INSERT INTO questions(id,content,answer,ocr_text,source,difficulty,mistake_cause,analysis,followup_question,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET content=excluded.content,answer=excluded.answer,ocr_text=excluded.ocr_text,source=excluded.source,difficulty=excluded.difficulty,mistake_cause=excluded.mistake_cause,analysis=excluded.analysis,followup_question=excluded.followup_question,updated_at=excluded.updated_at').run(
        id,input.content,input.answer??old?.answer??'',input.ocrText??old?.ocrText??null,input.source??old?.source??null,
        Math.min(5,Math.max(1,Number(input.difficulty??old?.difficulty??3))),input.mistakeCause??old?.mistakeCause??null,input.analysis??old?.analysis??null,input.followupQuestion??old?.followupQuestion??null,created,now)
      this.db.prepare('DELETE FROM question_media WHERE question_id=?').run(id)
      let order=0;const path=input.imagePath??old?.imagePath,data=input.imageData??old?.imageData
      if(path)this.db.prepare('INSERT INTO question_media(id,question_id,kind,source,sort_order,created_at) VALUES(?,?,?,?,?,?)').run(crypto.randomUUID(),id,'image',path,order++,now)
      if(data)this.db.prepare('INSERT INTO question_media(id,question_id,kind,content,mime_type,sort_order,created_at) VALUES(?,?,?,?,?,?,?)').run(crypto.randomUUID(),id,'image',data,data.match(/^data:(image\/[^;]+);/i)?.[1] ?? null,order++,now)
      for(const a of input.artifacts??old?.artifacts??[])this.db.prepare('INSERT INTO question_media(id,question_id,kind,title,source,content,poster,sort_order,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(crypto.randomUUID(),id,a.kind,a.title??null,a.source??null,a.content??null,a.poster??null,order++,now)
      this.db.prepare('DELETE FROM question_knowledge_points WHERE question_id=?').run(id)
      for(const name of [...new Set((input.knowledgePoints??old?.knowledgePoints??[]).map(String).map(x=>x.trim()).filter(Boolean))])this.db.prepare('INSERT INTO question_knowledge_points(question_id,knowledge_point_id,importance) VALUES(?,?,?)').run(id,this.ensure('knowledge_points',name,now),1)
      this.db.prepare('DELETE FROM question_tags WHERE question_id=?').run(id)
      for(const name of [...new Set((input.tags??old?.tags??[]).map(String).map(x=>x.trim()).filter(Boolean))])this.db.prepare('INSERT INTO question_tags(question_id,tag_id) VALUES(?,?)').run(id,this.ensure('tags',name,now))
      this.db.prepare('DELETE FROM question_mistake_causes WHERE question_id=?').run(id)
      const cause=(input.mistakeCause??old?.mistakeCause??'').trim()
      if(cause)this.db.prepare('INSERT INTO question_mistake_causes(question_id,mistake_cause_id,confidence) VALUES(?,?,?)').run(id,this.ensure('mistake_causes',cause,now),1)
      this.db.prepare('INSERT INTO review_states(question_id,reps,ease,interval_days,due_at,last_reviewed_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(question_id) DO UPDATE SET reps=excluded.reps,ease=excluded.ease,interval_days=excluded.interval_days,due_at=excluded.due_at,last_reviewed_at=excluded.last_reviewed_at,updated_at=excluded.updated_at').run(id,review.reps,review.ease,review.intervalDays,review.dueAt,review.lastReviewedAt??null,created,now)
      this.db.exec('COMMIT')
    } catch(e){try{this.db.exec('ROLLBACK')}catch{};throw e}
    this.reindex(id);const q=this.getQuestion(id)!;void this.graphSync?.upsert?.(q);return q
  }

  private reindex(id:string){const q=this.getQuestion(id);if(!q)return;this.db.prepare('DELETE FROM questions_fts WHERE question_id=?').run(id);this.db.prepare('INSERT INTO questions_fts(question_id,content,ocr_text,answer,knowledge_points,tags,mistake_cause,analysis) VALUES(?,?,?,?,?,?,?,?)').run(id,q.content,q.ocrText??'',q.answer,q.knowledgePoints.join(' '),q.tags.join(' '),q.mistakeCause??'',q.analysis??'')}

  delete(id:string){const r=this.db.prepare('DELETE FROM questions WHERE id=?').run(id);this.db.prepare('DELETE FROM questions_fts WHERE question_id=?').run(id);void this.graphSync?.delete?.(id);return Number(r.changes)>0}

  list({limit=20,offset=0,tag,knowledgePoint,dueOnly=false}:{limit?:number;offset?:number;tag?:string;knowledgePoint?:string;dueOnly?:boolean}={}){
    const w:string[]=[],a:any[]=[];if(tag){w.push('EXISTS (SELECT 1 FROM question_tags qt JOIN tags t ON t.id=qt.tag_id WHERE qt.question_id=q.id AND t.name=?)');a.push(tag)}
    if(knowledgePoint){w.push('EXISTS (SELECT 1 FROM question_knowledge_points qkp JOIN knowledge_points kp ON kp.id=qkp.knowledge_point_id WHERE qkp.question_id=q.id AND kp.name=?)');a.push(knowledgePoint)}
    if(dueOnly){w.push('rs.due_at<=?');a.push(new Date().toISOString())}
    a.push(Math.min(100,Math.max(1,limit)),Math.max(0,offset))
    const rows=this.db.prepare('SELECT q.*,rs.reps,rs.ease,rs.interval_days,rs.due_at,rs.last_reviewed_at FROM questions q JOIN review_states rs ON rs.question_id=q.id '+(w.length?'WHERE '+w.join(' AND '):'')+' ORDER BY q.updated_at DESC LIMIT ? OFFSET ?').all(...a) as any[]
    return this.hydrate(rows)
  }

  search(query:string,limit=10):SearchHit[]{
    const tokens=searchTokens(query);if(!tokens.length)return[];const found=new Map<string,SearchHit>()
    try{const match=tokens.map(t=>'"'+t.replaceAll('"','""')+'"').join(' OR ');const rows=this.db.prepare('SELECT q.*,rs.reps,rs.ease,rs.interval_days,rs.due_at,rs.last_reviewed_at,bm25(questions_fts) rank FROM questions_fts f JOIN questions q ON q.id=f.question_id JOIN review_states rs ON rs.question_id=q.id WHERE questions_fts MATCH ? ORDER BY rank LIMIT ?').all(match,limit) as any[];for(const q of this.hydrate(rows))found.set(q.id,{question:q,score:1,matchType:'fts'})}catch{}
    if(found.size<limit){const rows=this.db.prepare('SELECT q.*,rs.reps,rs.ease,rs.interval_days,rs.due_at,rs.last_reviewed_at FROM questions q JOIN review_states rs ON rs.question_id=q.id WHERE lower(q.content||" "||q.answer||" "||coalesce(q.ocr_text,"")||" "||coalesce(q.mistake_cause,"")||" "||coalesce(q.analysis,"")) LIKE ? ORDER BY q.updated_at DESC LIMIT ?').all('%'+query.trim().toLocaleLowerCase()+'%',limit-found.size) as any[];for(const q of this.hydrate(rows))if(!found.has(q.id))found.set(q.id,{question:q,score:.5,matchType:'fts'})}
    return[...found.values()].slice(0,limit)
  }

  findSimilar(id:string,limit=10):SearchHit[]{const source=this.getQuestion(id);if(!source)throw new Error('Question not found');const st=terms(source.content+' '+source.ocrText);return this.all().filter(q=>q.id!==id).map(q=>({question:q,score:Number((jaccard(source.knowledgePoints,q.knowledgePoints)*.5+jaccard(source.tags,q.tags)*.25+jaccard(st,terms(q.content+' '+q.ocrText))*.25).toFixed(4)),matchType:'similarity' as const})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,limit)}
  recall(query:string,limit=5):SearchHit[]{const exact=this.search(query,limit),found=new Map(exact.map(x=>[x.question.id,x])),qt=terms(query);for(const q of this.all()){if(found.has(q.id))continue;const score=jaccard(qt,terms(q.content+' '+(q.ocrText??'')+' '+(q.analysis??'')));if(score>=.08)found.set(q.id,{question:q,score:Number(score.toFixed(4)),matchType:'similarity'})}return[...found.values()].sort((a,b)=>b.score-a.score).slice(0,limit)}
  due(limit=20){return this.list({limit,dueOnly:true})}

  review(id:string,grade:ReviewGrade,next:ReviewState):ReviewLog{
    const q=this.getQuestion(id);if(!q)throw new Error('Question not found');const now=new Date().toISOString(),quality=({again:0,hard:3,good:4,easy:5} as const)[grade]
    this.db.prepare('UPDATE review_states SET reps=?,ease=?,interval_days=?,due_at=?,last_reviewed_at=?,updated_at=? WHERE question_id=?').run(next.reps,next.ease,next.intervalDays,next.dueAt,next.lastReviewedAt??now,now,id)
    const row=this.db.prepare('INSERT INTO review_logs(question_id,grade,quality,previous_interval_days,next_interval_days,ease_before,ease_after,reviewed_at) VALUES(?,?,?,?,?,?,?,?)').run(id,grade,quality,q.review.intervalDays,next.intervalDays,q.review.ease,next.ease,now)
    return{id:Number(row.lastInsertRowid),questionId:id,grade,quality,previousIntervalDays:q.review.intervalDays,nextIntervalDays:next.intervalDays,easeAfter:next.ease,reviewedAt:now}
  }

  logs(limit=1000):ReviewLog[]{return(this.db.prepare('SELECT * FROM review_logs ORDER BY reviewed_at DESC LIMIT ?').all(limit) as any[]).map(r=>({id:Number(r.id),questionId:r.question_id,grade:r.grade,quality:Number(r.quality),previousIntervalDays:Number(r.previous_interval_days),nextIntervalDays:Number(r.next_interval_days),easeAfter:Number(r.ease_after),reviewedAt:r.reviewed_at}))}
  all(){return this.hydrate(this.db.prepare('SELECT q.*,rs.reps,rs.ease,rs.interval_days,rs.due_at,rs.last_reviewed_at FROM questions q JOIN review_states rs ON rs.question_id=q.id ORDER BY q.created_at ASC').all() as any[])}

  dashboard():Dashboard{
    const qs=this.all(),logs=this.logs(10000),now=new Date(),due=qs.filter(q=>isDue(q.review,now)).length,reviewed=qs.filter(q=>q.review.reps>0).length,mastered=qs.filter(q=>q.review.reps>=3&&q.review.intervalDays>=14).length
    const kp=new Map<string,{count:number;reviewed:number;interval:number}>()
    for(const q of qs)for(const p of q.knowledgePoints){const x=kp.get(p)??{count:0,reviewed:0,interval:0};x.count++;if(q.review.reps>0)x.reviewed++;x.interval+=Math.min(1,q.review.intervalDays/30);kp.set(p,x)}
    const knowledgePoints=[...kp.entries()].map(([name,x])=>({name,questionCount:x.count,mastery:Math.round(((x.reviewed/x.count)*.7+(x.interval/x.count)*.3)*100)})).sort((a,b)=>a.mastery-b.mastery)
    const activityMap=new Map<string,number>();for(const l of logs)activityMap.set(l.reviewedAt.slice(0,10),(activityMap.get(l.reviewedAt.slice(0,10))??0)+1)
    let d=new Date(now);d.setHours(0,0,0,0);let streak=0;while(activityMap.has(d.toISOString().slice(0,10))){streak++;d.setDate(d.getDate()-1)}
    const success=logs.filter(l=>l.quality>=3).length,days=lastDays(30,now),daily=new Map<string,ReviewLog[]>();for(const l of logs){const date=l.reviewedAt.slice(0,10);const x=daily.get(date)??[];x.push(l);daily.set(date,x)}
    const reviewTrend=days.map(date=>{const x=daily.get(date)??[];return{date,reviews:x.length,successRate:x.length?Number((x.filter(v=>v.quality>=3).length/x.length).toFixed(3)):0}})
    const masteryTrend=days.map(date=>({date,mastered:qs.filter(q=>q.review.reps>=3&&q.review.intervalDays>=14&&(q.review.lastReviewedAt??q.createdAt).slice(0,10)<=date).length}))
    const mm=new Map<string,number>();for(const q of qs){const c=(q.mistakeCause??'未分类').trim()||'未分类';mm.set(c,(mm.get(c)??0)+1)}
    const mistakeCauses=[...mm].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count).slice(0,10),difficulty=[1,2,3,4,5].map(level=>({level,count:qs.filter(q=>q.difficulty===level).length}))
    const seven=new Date(now);seven.setDate(seven.getDate()-6);seven.setHours(0,0,0,0);const weekly=logs.filter(x=>new Date(x.reviewedAt)>=seven),active=new Set(weekly.map(x=>x.reviewedAt.slice(0,10))),ordered=[...knowledgePoints].sort((a,b)=>b.mastery-a.mastery)
    return{totalQuestions:qs.length,reviewed,due,mastered,streak,reviewCount:logs.length,successRate:logs.length?Number((success/logs.length).toFixed(3)):0,knowledgePoints,weakPoints:knowledgePoints.slice(0,10),activity:[...activityMap.entries()].sort().slice(-30).map(([date,count])=>({date,count})),reviewTrend,masteryTrend,mistakeCauses,difficulty,reviewCompletionRate:reviewed+due?Number((reviewed/(reviewed+due)).toFixed(3)):0,weeklyReport:{added:qs.filter(x=>new Date(x.createdAt)>=seven).length,reviews:weekly.length,successfulReviews:weekly.filter(x=>x.quality>=3).length,activeDays:active.size,strongestKnowledgePoint:ordered[0]?.name,weakestKnowledgePoint:knowledgePoints[0]?.name}}
  }

  graph():KnowledgeGraph{
    const nodes=new Map<string,{count:number;mastery:number;due:number}>(),edges=new Map<string,number>()
    for(const q of this.all()){const ps=[...new Set(q.knowledgePoints.map(x=>x.trim()).filter(Boolean))];for(const p of ps){const x=nodes.get(p)??{count:0,mastery:0,due:0};x.count++;x.mastery+=Math.min(100,Math.round((Math.min(1,q.review.reps/3)*.7+Math.min(1,q.review.intervalDays/30)*.3)*100));if(isDue(q.review))x.due++;nodes.set(p,x)}for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){const[a,b]=[ps[i],ps[j]].sort(),k=a+'\\0'+b;edges.set(k,(edges.get(k)??0)+1)}}
    return{nodes:[...nodes].map(([id,x])=>({id,count:x.count,mastery:Math.round(x.mastery/x.count),due:x.due})),edges:[...edges].map(([k,weight])=>{const[source,target]=k.split('\\0');return{source,target,weight}})}
  }
}

function searchTokens(value:string){return value.normalize('NFKC').match(/[\\p{L}\\p{N}]+/gu)?.slice(0,20)??[]}
function terms(value:string){const chunks=String(value??'').normalize('NFKC').toLocaleLowerCase().match(/[a-z0-9]+|[\\p{Script=Han}]+/gu)??[],out:string[]=[];for(const c of chunks){if(!/^[\\p{Script=Han}]+$/u.test(c)||c.length===1)out.push(c);else for(let i=0;i<c.length-1;i++)out.push(c.slice(i,i+2))}return[...new Set(out)]}
function jaccard(a:string[],b:string[]){const x=new Set(a.map(v=>v.trim().toLocaleLowerCase()).filter(Boolean)),y=new Set(b.map(v=>v.trim().toLocaleLowerCase()).filter(Boolean));if(!x.size&&!y.size)return 0;let n=0;for(const v of x)if(y.has(v))n++;return n/(x.size+y.size-n)}
function lastDays(count:number,now:Date){const out:string[]=[];for(let i=count-1;i>=0;i--){const d=new Date(now);d.setHours(0,0,0,0);d.setDate(d.getDate()-i);out.push(d.toISOString().slice(0,10))}return out}
