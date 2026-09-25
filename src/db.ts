import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { Question, QuestionArtifact, ReviewGrade, ReviewLog, ReviewState, SearchHit, Dashboard, KnowledgeGraph } from './domain.js'
import { isDue } from './review.js'

function json(value: unknown): string { return JSON.stringify(value ?? []) }

function parseQuestion(row: any): Question {
  return {
    id: row.id, content: row.content, answer: row.answer ?? '',
    source: row.source ?? undefined, imagePath: row.image_path ?? undefined,
    imageData: row.image_data ?? undefined,
    artifacts: parseArtifacts(row.artifacts),
    ocrText: row.ocr_text ?? undefined,
    knowledgePoints: JSON.parse(row.knowledge_points || '[]'),
    tags: JSON.parse(row.tags || '[]'),
    difficulty: Number(row.difficulty ?? 3),
    mistakeCause: row.mistake_cause ?? undefined,
    analysis: row.analysis ?? undefined,
    followupQuestion: row.followup_question ?? undefined,
    createdAt: row.created_at, updatedAt: row.updated_at,
    review: {
      reps: Number(row.reps ?? 0), ease: Number(row.ease ?? 2.5),
      intervalDays: Number(row.interval_days ?? 0), dueAt: row.due_at,
      lastReviewedAt: row.last_reviewed_at ?? undefined
    }
  }
}

export class WrongQuestionDb {
  readonly db: DatabaseSync

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true })
    this.db = new DatabaseSync(path)
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;')
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        answer TEXT NOT NULL DEFAULT '',
        source TEXT,
        image_path TEXT,
        image_data TEXT,
        artifacts TEXT NOT NULL DEFAULT '[]',
        ocr_text TEXT,
        knowledge_points TEXT NOT NULL DEFAULT '[]',
        tags TEXT NOT NULL DEFAULT '[]',
        difficulty INTEGER NOT NULL DEFAULT 3,
        mistake_cause TEXT,
        analysis TEXT,
        followup_question TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        reps INTEGER NOT NULL DEFAULT 0,
        ease REAL NOT NULL DEFAULT 2.5,
        interval_days INTEGER NOT NULL DEFAULT 0,
        due_at TEXT NOT NULL,
        last_reviewed_at TEXT
      );
      CREATE TABLE IF NOT EXISTS review_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        grade TEXT NOT NULL,
        quality INTEGER NOT NULL,
        previous_interval_days INTEGER NOT NULL,
        next_interval_days INTEGER NOT NULL,
        ease_after REAL NOT NULL,
        reviewed_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_questions_due ON questions(due_at);
      CREATE INDEX IF NOT EXISTS idx_questions_updated ON questions(updated_at);
      CREATE VIRTUAL TABLE IF NOT EXISTS questions_fts USING fts5(
        question_id UNINDEXED, content, answer, tags, knowledge_points, mistake_cause, analysis
      );
    `)
    // 0.1 databases did not have analysis. SQLite migration is intentionally tiny.
    try { this.db.exec('ALTER TABLE questions ADD COLUMN analysis TEXT') } catch {}
    try { this.db.exec('ALTER TABLE questions ADD COLUMN image_data TEXT') } catch {}
    try { this.db.exec("ALTER TABLE questions ADD COLUMN artifacts TEXT NOT NULL DEFAULT '[]'") } catch {}
  }

  close() { this.db.close() }

  getQuestion(id: string): Question | null {
    const row = this.db.prepare('SELECT * FROM questions WHERE id=?').get(id)
    return row ? parseQuestion(row) : null
  }

  upsert(input: Partial<Omit<Question, 'review' | 'createdAt' | 'updatedAt'>> & { content: string; id?: string }): Question {
    const now = new Date().toISOString()
    const id = input.id ?? crypto.randomUUID()
    const old = this.getQuestion(id)
    const review = old?.review ?? { reps: 0, ease: 2.5, intervalDays: 0, dueAt: now }
    const created = old?.createdAt ?? now
    this.db.prepare(`
      INSERT INTO questions
      (id,content,answer,source,image_path,image_data,artifacts,ocr_text,knowledge_points,tags,difficulty,mistake_cause,analysis,followup_question,created_at,updated_at,reps,ease,interval_days,due_at,last_reviewed_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET
      content=excluded.content,answer=excluded.answer,source=excluded.source,image_path=excluded.image_path,
      image_data=excluded.image_data,artifacts=excluded.artifacts,ocr_text=excluded.ocr_text,knowledge_points=excluded.knowledge_points,tags=excluded.tags,
      difficulty=excluded.difficulty,mistake_cause=excluded.mistake_cause,analysis=excluded.analysis,
      followup_question=excluded.followup_question,updated_at=excluded.updated_at
    `).run(
      id, input.content, input.answer ?? old?.answer ?? '', input.source ?? old?.source ?? null,
      input.imagePath ?? old?.imagePath ?? null, input.imageData ?? old?.imageData ?? null,
      json(input.artifacts ?? old?.artifacts ?? []), input.ocrText ?? old?.ocrText ?? null,
      json(input.knowledgePoints ?? old?.knowledgePoints ?? []), json(input.tags ?? old?.tags ?? []),
      Math.min(5, Math.max(1, Number(input.difficulty ?? old?.difficulty ?? 3))),
      input.mistakeCause ?? old?.mistakeCause ?? null, input.analysis ?? old?.analysis ?? null,
      input.followupQuestion ?? old?.followupQuestion ?? null, created, now,
      review.reps, review.ease, review.intervalDays, review.dueAt, review.lastReviewedAt ?? null
    )
    this.reindex(id)
    return this.getQuestion(id)!
  }

  private reindex(id: string) {
    const q = this.getQuestion(id); if (!q) return
    this.db.prepare('DELETE FROM questions_fts WHERE question_id=?').run(id)
    this.db.prepare('INSERT INTO questions_fts(question_id,content,answer,tags,knowledge_points,mistake_cause,analysis) VALUES(?,?,?,?,?,?,?)')
      .run(id,q.content,q.answer,q.tags.join(' '),q.knowledgePoints.join(' '),q.mistakeCause ?? '',q.analysis ?? '')
  }

  delete(id: string) {
    const result = this.db.prepare('DELETE FROM questions WHERE id=?').run(id)
    this.db.prepare('DELETE FROM questions_fts WHERE question_id=?').run(id)
    return Number(result.changes) > 0
  }

  list({limit=20,offset=0,tag,knowledgePoint,dueOnly=false}: {limit?:number;offset?:number;tag?:string;knowledgePoint?:string;dueOnly?:boolean} = {}) {
    const where:string[]=[]; const args:any[]=[]
    if(tag){where.push('tags LIKE ?');args.push(`%"${tag}"%`)}
    if(knowledgePoint){where.push('knowledge_points LIKE ?');args.push(`%"${knowledgePoint}"%`)}
    if(dueOnly){where.push('due_at <= ?');args.push(new Date().toISOString())}
    args.push(Math.min(100,Math.max(1,limit)),Math.max(0,offset))
    return this.db.prepare(`SELECT * FROM questions ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY updated_at DESC LIMIT ? OFFSET ?`).all(...args).map(parseQuestion)
  }

  search(query:string,limit=10):SearchHit[]{
    const tokens=searchTokens(query);if(!tokens.length)return[]
    const found=new Map<string,SearchHit>()
    try{
      const match=tokens.map(t=>`"${t.replaceAll('"','""')}"`).join(' OR ')
      const rows=this.db.prepare(`SELECT q.*,bm25(questions_fts) rank FROM questions_fts f JOIN questions q ON q.id=f.question_id WHERE questions_fts MATCH ? ORDER BY rank LIMIT ?`).all(match,limit)
      for(const r of rows as any[])found.set(r.id,{question:parseQuestion(r),score:1/(1+Math.max(0,Number(r.rank))),matchType:'fts'})
    }catch{}
    if(found.size<limit){
      const needle=`%${query.trim().toLocaleLowerCase()}%`
      const rows=this.db.prepare(`SELECT * FROM questions WHERE lower(content||' '||answer||' '||knowledge_points||' '||tags||' '||coalesce(mistake_cause,'')||' '||coalesce(analysis,'')||' '||coalesce(ocr_text,'')) LIKE ? ORDER BY updated_at DESC LIMIT ?`).all(needle,limit)
      for(const r of rows as any[])if(!found.has(r.id))found.set(r.id,{question:parseQuestion(r),score:.5,matchType:'fts'})
    }
    return [...found.values()].slice(0,limit)
  }

  findSimilar(id:string,limit=10):SearchHit[]{
    const source=this.getQuestion(id);if(!source)throw new Error('Question not found')
    const sourceTerms=terms(source.content+' '+source.ocrText)
    return this.all().filter(q=>q.id!==id).map(question=>{
      const kp=jaccard(source.knowledgePoints,question.knowledgePoints)
      const tags=jaccard(source.tags,question.tags)
      const text=jaccard(sourceTerms,terms(question.content+' '+question.ocrText))
      return {question,score:Number((kp*.5+tags*.25+text*.25).toFixed(4)),matchType:'similarity' as const}
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,limit)
  }

  recall(query:string,limit=5):SearchHit[]{
    const exact=this.search(query,limit),found=new Map(exact.map(x=>[x.question.id,x]))
    const queryTerms=terms(query)
    for(const question of this.all()){
      if(found.has(question.id))continue
      const score=jaccard(queryTerms,terms(`${question.content} ${question.ocrText??''} ${question.analysis??''}`))
      if(score>=.08)found.set(question.id,{question,score:Number(score.toFixed(4)),matchType:'similarity'})
    }
    return [...found.values()].sort((a,b)=>b.score-a.score).slice(0,limit)
  }

  due(limit=20){return this.list({limit,dueOnly:true})}

  review(id:string,grade:ReviewGrade,next:ReviewState):ReviewLog{
    const q=this.getQuestion(id);if(!q)throw new Error('Question not found')
    const now=new Date().toISOString(); const quality=({again:0,hard:3,good:4,easy:5} as const)[grade]
    const inserted=this.db.prepare('UPDATE questions SET reps=?,ease=?,interval_days=?,due_at=?,last_reviewed_at=?,updated_at=? WHERE id=?')
      .run(next.reps,next.ease,next.intervalDays,next.dueAt,next.lastReviewedAt??now,now,id)
    if(!inserted.changes)throw new Error('Question update failed')
    const row=this.db.prepare('INSERT INTO review_logs(question_id,grade,quality,previous_interval_days,next_interval_days,ease_after,reviewed_at) VALUES(?,?,?,?,?,?,?)')
      .run(id,grade,quality,q.review.intervalDays,next.intervalDays,next.ease,now)
    return {id:Number(row.lastInsertRowid),questionId:id,grade,quality,previousIntervalDays:q.review.intervalDays,nextIntervalDays:next.intervalDays,easeAfter:next.ease,reviewedAt:now}
  }

  logs(limit=1000):ReviewLog[]{return this.db.prepare('SELECT * FROM review_logs ORDER BY reviewed_at DESC LIMIT ?').all(limit).map((r:any)=>({
    id:Number(r.id),questionId:r.question_id,grade:r.grade,quality:Number(r.quality),
    previousIntervalDays:Number(r.previous_interval_days),nextIntervalDays:Number(r.next_interval_days),
    easeAfter:Number(r.ease_after),reviewedAt:r.reviewed_at
  }))}

  all(){return this.db.prepare('SELECT * FROM questions ORDER BY created_at ASC').all().map(parseQuestion)}

  dashboard():Dashboard{
    const qs=this.all(), logs=this.logs(10000), now=new Date()
    const due=qs.filter(q=>isDue(q.review,now)).length
    const reviewed=qs.filter(q=>q.review.reps>0).length
    const mastered=qs.filter(q=>q.review.reps>=3&&q.review.intervalDays>=14).length
    const kp=new Map<string,{count:number;reviewed:number;interval:number}>()
    for(const q of qs)for(const p of q.knowledgePoints){
      const x=kp.get(p)??{count:0,reviewed:0,interval:0};x.count++
      if(q.review.reps>0)x.reviewed++;x.interval+=Math.min(1,q.review.intervalDays/30);kp.set(p,x)
    }
    const knowledgePoints=[...kp.entries()].map(([name,x])=>({name,questionCount:x.count,mastery:Math.round(((x.reviewed/x.count)*.7+(x.interval/x.count)*.3)*100)})).sort((a,b)=>a.mastery-b.mastery)
    const activityMap=new Map<string,number>()
    for(const l of logs)activityMap.set(l.reviewedAt.slice(0,10),(activityMap.get(l.reviewedAt.slice(0,10))??0)+1)
    let d=new Date(now);d.setHours(0,0,0,0);let streak=0
    while(activityMap.has(d.toISOString().slice(0,10))){streak++;d.setDate(d.getDate()-1)}
    const success=logs.filter(l=>l.quality>=3).length
    const days=lastDays(30,now),daily=new Map<string,ReviewLog[]>()
    for(const l of logs){const date=l.reviewedAt.slice(0,10);const xs=daily.get(date)??[];xs.push(l);daily.set(date,xs)}
    const reviewTrend=days.map(date=>{const xs=daily.get(date)??[];return{date,reviews:xs.length,successRate:xs.length?Number((xs.filter(x=>x.quality>=3).length/xs.length).toFixed(3)):0}})
    const masteryTrend=days.map(date=>({date,mastered:qs.filter(q=>q.review.reps>=3&&q.review.intervalDays>=14&&(q.review.lastReviewedAt??q.createdAt).slice(0,10)<=date).length}))
    const mistakeMap=new Map<string,number>()
    for(const q of qs){const cause=(q.mistakeCause??'未分类').trim()||'未分类';mistakeMap.set(cause,(mistakeMap.get(cause)??0)+1)}
    const mistakeCauses=[...mistakeMap].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count).slice(0,10)
    const difficulty=[1,2,3,4,5].map(level=>({level,count:qs.filter(q=>q.difficulty===level).length}))
    const sevenDaysAgo=new Date(now);sevenDaysAgo.setDate(sevenDaysAgo.getDate()-6);sevenDaysAgo.setHours(0,0,0,0)
    const weeklyLogs=logs.filter(x=>new Date(x.reviewedAt)>=sevenDaysAgo)
    const weeklyAdded=qs.filter(x=>new Date(x.createdAt)>=sevenDaysAgo).length
    const weekDays=new Set(weeklyLogs.map(x=>x.reviewedAt.slice(0,10)))
    const ordered=[...knowledgePoints].sort((a,b)=>b.mastery-a.mastery)
    return {totalQuestions:qs.length,reviewed,due,mastered,streak,reviewCount:logs.length,successRate:logs.length?Number((success/logs.length).toFixed(3)):0,knowledgePoints,weakPoints:knowledgePoints.slice(0,10),activity:[...activityMap.entries()].sort().slice(-30).map(([date,count])=>({date,count})),reviewTrend,masteryTrend,mistakeCauses,difficulty,reviewCompletionRate:reviewed+due?Number((reviewed/(reviewed+due)).toFixed(3)):0,weeklyReport:{added:weeklyAdded,reviews:weeklyLogs.length,successfulReviews:weeklyLogs.filter(x=>x.quality>=3).length,activeDays:weekDays.size,strongestKnowledgePoint:ordered[0]?.name,weakestKnowledgePoint:knowledgePoints[0]?.name}}
  }

  graph():KnowledgeGraph{
    const nodes=new Map<string,{count:number;mastery:number;due:number}>(),edges=new Map<string,number>()
    for(const q of this.all()){
      const ps=[...new Set(q.knowledgePoints.map(x=>x.trim()).filter(Boolean))]
      for(const p of ps){const x=nodes.get(p)??{count:0,mastery:0,due:0};x.count++;x.mastery+=Math.min(100,Math.round((Math.min(1,q.review.reps/3)*.7+Math.min(1,q.review.intervalDays/30)*.3)*100));if(isDue(q.review))x.due++;nodes.set(p,x)}
      for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){const [a,b]=[ps[i],ps[j]].sort();const k=a+'\0'+b;edges.set(k,(edges.get(k)??0)+1)}
    }
    return {nodes:[...nodes].map(([id,x])=>({id,count:x.count,mastery:Math.round(x.mastery/x.count),due:x.due})),edges:[...edges].map(([k,weight])=>{const [source,target]=k.split('\0');return{source,target,weight}})}
  }
}

function searchTokens(value:string){return value.normalize('NFKC').match(/[\p{L}\p{N}]+/gu)?.filter(Boolean).slice(0,20)??[]}
function parseArtifacts(value:unknown):QuestionArtifact[]{try{const xs=JSON.parse(String(value||'[]'));return Array.isArray(xs)?xs.filter(x=>x&&['image','video','html'].includes(x.kind)):[]}catch{return[]}}
function terms(value:string){
  const normalized=String(value??'').normalize('NFKC').toLocaleLowerCase()
  const chunks=normalized.match(/[a-z0-9]+|[\p{Script=Han}]+/gu)??[],words:string[]=[]
  for(const chunk of chunks){if(!/^[\p{Script=Han}]+$/u.test(chunk)||chunk.length===1)words.push(chunk);else for(let i=0;i<chunk.length-1;i++)words.push(chunk.slice(i,i+2))}
  return [...new Set(words)]
}
function jaccard(a:string[],b:string[]){const x=new Set(a.map(v=>v.trim().toLocaleLowerCase()).filter(Boolean)),y=new Set(b.map(v=>v.trim().toLocaleLowerCase()).filter(Boolean));if(!x.size&&!y.size)return 0;let common=0;for(const v of x)if(y.has(v))common++;return common/(x.size+y.size-common)}
function lastDays(count:number,now:Date){const out:string[]=[];for(let i=count-1;i>=0;i--){const d=new Date(now);d.setHours(0,0,0,0);d.setDate(d.getDate()-i);out.push(d.toISOString().slice(0,10))}return out}
