import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { Question, QuestionArtifact, ReviewGrade, ReviewLog, ReviewState, SearchHit, Dashboard, KnowledgeGraph, WrongQuestionAnalysis, LearningGap, QuestionVariant, QuestionAttempt } from './domain.js'
import { isDue } from './review.js'

function parseArray(value: unknown): string[] {
  try { const v = JSON.parse(String(value ?? '[]')); return Array.isArray(v) ? v.map(String) : [] } catch { return [] }
}

function parseQuestion(row: any): Question {
  const media = Array.isArray(row.__media) ? row.__media : []
  const image = media.find((m:any) => m.kind === 'image')
  const primaryImageSource = image?.source ?? undefined
  const seenArtifacts = new Set<string>()
  const artifacts: QuestionArtifact[] = media.filter((m:any) => ['image','video','html'].includes(m.kind))
    .filter((m:any) => {
      if (m.kind === 'image' && primaryImageSource && m.source === primaryImageSource) return false
      const key = [m.kind, m.source ?? '', m.content ?? '', m.poster ?? ''].join('\\0')
      if (seenArtifacts.has(key)) return false
      seenArtifacts.add(key)
      return true
    })
    .map((m:any) => ({id:m.id,kind:m.kind,title:m.title ?? undefined,source:m.source ?? undefined,content:m.content ?? undefined,poster:m.poster ?? undefined}))
  return {
    id:row.id, content:row.content, answer:row.answer ?? '', source:row.source ?? undefined,
    imagePath:image?.source ?? undefined, imageData:image?.content?.startsWith('data:image/') ? image.content : undefined, imageMediaId:image?.id ?? undefined,
    artifacts, ocrText:row.ocr_text ?? undefined, knowledgePoints:parseArray(row.__knowledge_points),
    tags:parseArray(row.__tags), difficulty:Number(row.difficulty ?? 3), mistakeCause:row.mistake_cause ?? undefined,
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
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        answer TEXT NOT NULL DEFAULT '',
        ocr_text TEXT,
        source TEXT,
        difficulty INTEGER NOT NULL DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
        mistake_cause TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS question_media (
        id TEXT PRIMARY KEY,
        question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        kind TEXT NOT NULL CHECK (kind IN ('image','video','html','text')),
        title TEXT,
        source TEXT,
        content TEXT,
        mime_type TEXT,
        poster TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS knowledge_points (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        parent_id TEXT REFERENCES knowledge_points(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS question_knowledge_points (
        question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        knowledge_point_id TEXT NOT NULL REFERENCES knowledge_points(id) ON DELETE CASCADE,
        importance REAL NOT NULL DEFAULT 1.0,
        PRIMARY KEY(question_id,knowledge_point_id)
      );
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS question_tags (
        question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY(question_id,tag_id)
      );
      CREATE TABLE IF NOT EXISTS mistake_causes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS question_mistake_causes (
        question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        mistake_cause_id TEXT NOT NULL REFERENCES mistake_causes(id) ON DELETE CASCADE,
        confidence REAL NOT NULL DEFAULT 1.0,
        PRIMARY KEY(question_id,mistake_cause_id)
      );
      CREATE TABLE IF NOT EXISTS review_states (
        question_id TEXT PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
        reps INTEGER NOT NULL DEFAULT 0,
        ease REAL NOT NULL DEFAULT 2.5,
        interval_days INTEGER NOT NULL DEFAULT 0,
        due_at TEXT NOT NULL,
        last_reviewed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS review_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        grade TEXT NOT NULL CHECK (grade IN ('again','hard','good','easy')),
        quality INTEGER NOT NULL,
        previous_interval_days INTEGER NOT NULL,
        next_interval_days INTEGER NOT NULL,
        ease_before REAL NOT NULL,
        ease_after REAL NOT NULL,
        reviewed_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS question_analyses (
        question_id TEXT PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
        solution TEXT,
        mistake_type TEXT,
        reasoning_error TEXT,
        knowledge_gaps TEXT NOT NULL DEFAULT '[]',
        reasoning_gaps TEXT NOT NULL DEFAULT '[]',
        correction_strategy TEXT NOT NULL DEFAULT '[]',
        variant_suggestions TEXT NOT NULL DEFAULT '[]',
        confidence REAL,
        generated_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS learning_gaps (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        severity REAL NOT NULL DEFAULT 0.5 CHECK (severity BETWEEN 0 AND 1),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS question_learning_gaps (
        question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        gap_id TEXT NOT NULL REFERENCES learning_gaps(id) ON DELETE CASCADE,
        confidence REAL NOT NULL DEFAULT 1 CHECK (confidence BETWEEN 0 AND 1),
        severity REAL NOT NULL DEFAULT 0.5 CHECK (severity BETWEEN 0 AND 1),
        PRIMARY KEY(question_id,gap_id)
      );
      CREATE TABLE IF NOT EXISTS question_variants (
        id TEXT PRIMARY KEY,
        question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        variant_type TEXT NOT NULL,
        content TEXT NOT NULL,
        answer TEXT NOT NULL DEFAULT '',
        analysis TEXT,
        difficulty INTEGER NOT NULL DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
        source TEXT,
        generated_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS question_attempts (
        id TEXT PRIMARY KEY,
        question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        variant_id TEXT REFERENCES question_variants(id) ON DELETE CASCADE,
        user_answer TEXT,
        is_correct INTEGER CHECK (is_correct IN (0,1)),
        score REAL,
        time_spent_ms INTEGER CHECK (time_spent_ms IS NULL OR time_spent_ms >= 0),
        mistake_cause TEXT,
        analysis TEXT,
        attempted_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_questions_updated ON questions(updated_at);
      CREATE INDEX IF NOT EXISTS idx_review_due ON review_states(due_at);
      CREATE INDEX IF NOT EXISTS idx_qkp_kp ON question_knowledge_points(knowledge_point_id);
      CREATE INDEX IF NOT EXISTS idx_qtag_tag ON question_tags(tag_id);
      CREATE INDEX IF NOT EXISTS idx_qcause_cause ON question_mistake_causes(mistake_cause_id);
      CREATE INDEX IF NOT EXISTS idx_qanalysis_updated ON question_analyses(updated_at);
      CREATE INDEX IF NOT EXISTS idx_qlg_gap ON question_learning_gaps(gap_id);
      CREATE INDEX IF NOT EXISTS idx_variant_question ON question_variants(question_id,created_at);
      CREATE INDEX IF NOT EXISTS idx_attempt_question ON question_attempts(question_id,attempted_at);
      CREATE VIRTUAL TABLE IF NOT EXISTS questions_fts USING fts5(
        question_id UNINDEXED,
        content,
        ocr_text,
        answer,
        knowledge_points,
        tags,
        mistake_cause
      );
    `)
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

  getMedia(questionId:string,mediaId:string){return this.db.prepare('SELECT * FROM question_media WHERE id=? AND question_id=?').get(mediaId,questionId) as any ?? null}

  addQuestionImage(input:{questionId:string;source:string;mimeType?:string;title?:string}){
    if(!this.getQuestion(input.questionId))throw new Error('Question not found')
    const existing=this.db.prepare('SELECT * FROM question_media WHERE question_id=? AND kind=\'image\' AND source=? LIMIT 1')
      .get(input.questionId,input.source) as any
    if(existing){
      return {
        id:String(existing.id),questionId:String(existing.question_id),kind:'image' as const,
        title:existing.title??undefined,source:String(existing.source),mimeType:existing.mime_type??undefined
      }
    }
    const id=crypto.randomUUID(),now=new Date().toISOString()
    const order=Number((this.db.prepare('SELECT COALESCE(MAX(sort_order),-1)+1 AS next FROM question_media WHERE question_id=?')
      .get(input.questionId) as any).next??0)
    this.db.prepare('INSERT INTO question_media(id,question_id,kind,title,source,mime_type,sort_order,created_at) VALUES(?,?,?,?,?,?,?,?)')
      .run(id,input.questionId,'image',input.title??null,input.source,input.mimeType??null,order,now)
    return {id,questionId:input.questionId,kind:'image' as const,title:input.title,source:input.source,mimeType:input.mimeType}
  }

  getQuestionDetail(questionId:string){
    const question=this.getQuestion(questionId)
    if(!question)return null
    const learningGaps=this.db.prepare(`
      SELECT g.id,g.name,g.description,g.severity,g.created_at,g.updated_at,qlg.confidence,qlg.severity AS question_severity
      FROM learning_gaps g
      JOIN question_learning_gaps qlg ON qlg.gap_id=g.id
      WHERE qlg.question_id=?
      ORDER BY qlg.severity DESC,g.name
    `).all(questionId) as any[]
    return {
      question,
      analysis:this.getQuestionAnalysis(questionId),
      learningGaps:learningGaps.map(g=>({
        id:String(g.id),name:String(g.name),description:g.description??undefined,
        severity:Number(g.question_severity??g.severity??0),
        confidence:Number(g.confidence??0),
        createdAt:String(g.created_at),updatedAt:String(g.updated_at)
      })),
      variants:this.listQuestionVariants(questionId,100),
      attempts:this.listQuestionAttempts(questionId,100)
    }
  }

  getQuestionAnalysis(questionId:string):WrongQuestionAnalysis|null{
    const row=this.db.prepare('SELECT * FROM question_analyses WHERE question_id=?').get(questionId) as any
    if(!row)return null
    return {
      questionId:String(row.question_id),
      solution:row.solution??undefined,
      mistakeType:row.mistake_type??undefined,
      reasoningError:row.reasoning_error??undefined,
      knowledgeGaps:parseArray(row.knowledge_gaps),
      reasoningGaps:parseArray(row.reasoning_gaps),
      correctionStrategy:parseArray(row.correction_strategy),
      variantSuggestions:parseArray(row.variant_suggestions),
      confidence:row.confidence==null?undefined:Number(row.confidence),
      generatedBy:row.generated_by??undefined,
      createdAt:String(row.created_at),
      updatedAt:String(row.updated_at)
    }
  }

  private ensureLearningGap(name:string,description:string|undefined,severity:number,now:string):string{
    const normalized=name.trim()
    const existing=this.db.prepare('SELECT id FROM learning_gaps WHERE name=?').get(normalized) as any
    if(existing){
      this.db.prepare('UPDATE learning_gaps SET description=COALESCE(?,description),severity=MAX(severity,?),updated_at=? WHERE id=?')
        .run(description??null,Math.min(1,Math.max(0,severity)),now,existing.id)
      return String(existing.id)
    }
    const id=crypto.randomUUID()
    this.db.prepare('INSERT INTO learning_gaps(id,name,description,severity,created_at,updated_at) VALUES(?,?,?,?,?,?)')
      .run(id,normalized,description??null,Math.min(1,Math.max(0,severity)),now,now)
    return id
  }

  saveQuestionAnalysis(input:{
    questionId:string
    solution?:string
    mistakeType?:string
    reasoningError?:string
    knowledgeGaps?:Array<string|{name:string;description?:string;severity?:number;confidence?:number}>
    reasoningGaps?:string[]
    correctionStrategy?:string[]
    variantSuggestions?:string[]
    confidence?:number
    generatedBy?:string
  }):WrongQuestionAnalysis{
    if(!this.getQuestion(input.questionId))throw new Error('Question not found')
    const now=new Date().toISOString()
    const old=this.getQuestionAnalysis(input.questionId)
    const knowledgeGaps=(input.knowledgeGaps??[]).map(x=>typeof x==='string'?{name:x}:x).filter(x=>x.name?.trim())
    this.db.exec('BEGIN')
    try{
      this.db.prepare(`
        INSERT INTO question_analyses(
          question_id,solution,mistake_type,reasoning_error,knowledge_gaps,
          reasoning_gaps,correction_strategy,variant_suggestions,confidence,generated_by,created_at,updated_at
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(question_id) DO UPDATE SET
          solution=excluded.solution,
          mistake_type=excluded.mistake_type,
          reasoning_error=excluded.reasoning_error,
          knowledge_gaps=excluded.knowledge_gaps,
          reasoning_gaps=excluded.reasoning_gaps,
          correction_strategy=excluded.correction_strategy,
          variant_suggestions=excluded.variant_suggestions,
          confidence=excluded.confidence,
          generated_by=excluded.generated_by,
          updated_at=excluded.updated_at
      `).run(
        input.questionId,input.solution??null,input.mistakeType??null,input.reasoningError??null,
        JSON.stringify(knowledgeGaps.map(x=>x.name.trim())),
        JSON.stringify((input.reasoningGaps??[]).map(String).filter(Boolean)),
        JSON.stringify((input.correctionStrategy??[]).map(String).filter(Boolean)),
        JSON.stringify((input.variantSuggestions??[]).map(String).filter(Boolean)),
        input.confidence==null?null:Math.min(1,Math.max(0,Number(input.confidence))),
        input.generatedBy??null,
        old?.createdAt??now,now
      )
      this.db.prepare('DELETE FROM question_learning_gaps WHERE question_id=?').run(input.questionId)
      for(const gap of knowledgeGaps){
        const severity=gap.severity==null?0.5:Math.min(1,Math.max(0,Number(gap.severity)))
        const confidence=gap.confidence==null?1:Math.min(1,Math.max(0,Number(gap.confidence)))
        const gapId=this.ensureLearningGap(gap.name,gap.description,severity,now)
        this.db.prepare('INSERT INTO question_learning_gaps(question_id,gap_id,confidence,severity) VALUES(?,?,?,?)')
          .run(input.questionId,gapId,confidence,severity)
      }
      this.db.exec('COMMIT')
    }catch(e){try{this.db.exec('ROLLBACK')}catch{};throw e}
    return this.getQuestionAnalysis(input.questionId)!
  }

  getLearningGaps(limit=20):Array<LearningGap & {questionCount:number;dueCount:number;confidence:number}>{
    const rows=this.db.prepare(`
      SELECT
        g.*,
        COUNT(DISTINCT qlg.question_id) AS question_count,
        COUNT(DISTINCT CASE WHEN rs.due_at<=? THEN qlg.question_id END) AS due_count,
        COALESCE(AVG(qlg.confidence),0) AS confidence
      FROM learning_gaps g
      JOIN question_learning_gaps qlg ON qlg.gap_id=g.id
      JOIN questions q ON q.id=qlg.question_id
      LEFT JOIN review_states rs ON rs.question_id=q.id
      GROUP BY g.id
      ORDER BY g.severity DESC, question_count DESC, g.updated_at DESC
      LIMIT ?
    `).all(new Date().toISOString(),Math.min(100,Math.max(1,limit))) as any[]
    return rows.map(r=>({
      id:String(r.id),
      name:String(r.name),
      description:r.description??undefined,
      severity:Number(r.severity??0),
      createdAt:String(r.created_at),
      updatedAt:String(r.updated_at),
      questionCount:Number(r.question_count??0),
      dueCount:Number(r.due_count??0),
      confidence:Number(r.confidence??0)
    }))
  }

  addQuestionVariant(input:{
    questionId:string
    variantType:string
    content:string
    answer?:string
    analysis?:string
    difficulty?:number
    source?:string
    generatedBy?:string
  }):QuestionVariant{
    if(!this.getQuestion(input.questionId))throw new Error('Question not found')
    const now=new Date().toISOString(),id=crypto.randomUUID()
    this.db.prepare(`
      INSERT INTO question_variants(
        id,question_id,variant_type,content,answer,analysis,difficulty,source,generated_by,created_at,updated_at
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      id,input.questionId,input.variantType.trim(),input.content,input.answer??'',
      input.analysis??null,Math.min(5,Math.max(1,Number(input.difficulty??3))),
      input.source??null,input.generatedBy??null,now,now
    )
    return {
      id,questionId:input.questionId,variantType:input.variantType.trim(),content:input.content,
      answer:input.answer??'',analysis:input.analysis??undefined,
      difficulty:Math.min(5,Math.max(1,Number(input.difficulty??3))),
      source:input.source??undefined,generatedBy:input.generatedBy??undefined,
      createdAt:now,updatedAt:now
    }
  }

  listQuestionVariants(questionId:string,limit=20):QuestionVariant[]{
    const rows=this.db.prepare('SELECT * FROM question_variants WHERE question_id=? ORDER BY created_at DESC LIMIT ?')
      .all(questionId,Math.min(100,Math.max(1,limit))) as any[]
    return rows.map(r=>({
      id:String(r.id),questionId:String(r.question_id),variantType:String(r.variant_type),
      content:String(r.content),answer:r.answer??'',analysis:r.analysis??undefined,
      difficulty:Number(r.difficulty??3),source:r.source??undefined,generatedBy:r.generated_by??undefined,
      createdAt:String(r.created_at),updatedAt:String(r.updated_at)
    }))
  }

  recordQuestionAttempt(input:{
    questionId:string
    variantId?:string
    userAnswer?:string
    isCorrect?:boolean
    score?:number
    timeSpentMs?:number
    mistakeCause?:string
    analysis?:string
  }):QuestionAttempt{
    if(!this.getQuestion(input.questionId))throw new Error('Question not found')
    if(input.variantId){
      const variant=this.db.prepare('SELECT id,question_id FROM question_variants WHERE id=?').get(input.variantId) as any
      if(!variant)throw new Error('Variant not found')
      if(String(variant.question_id)!==input.questionId)throw new Error('Variant does not belong to question')
    }
    const id=crypto.randomUUID(),now=new Date().toISOString()
    this.db.prepare(`
      INSERT INTO question_attempts(
        id,question_id,variant_id,user_answer,is_correct,score,time_spent_ms,mistake_cause,analysis,attempted_at
      ) VALUES(?,?,?,?,?,?,?,?,?,?)
    `).run(
      id,input.questionId,input.variantId??null,input.userAnswer??null,
      input.isCorrect==null?null:(input.isCorrect?1:0),
      input.score==null?null:Number(input.score),
      input.timeSpentMs==null?null:Math.max(0,Math.round(Number(input.timeSpentMs))),
      input.mistakeCause??null,input.analysis??null,now
    )
    return {
      id,questionId:input.questionId,variantId:input.variantId??undefined,userAnswer:input.userAnswer??undefined,
      isCorrect:input.isCorrect,score:input.score==null?undefined:Number(input.score),
      timeSpentMs:input.timeSpentMs==null?undefined:Math.max(0,Math.round(Number(input.timeSpentMs))),
      mistakeCause:input.mistakeCause??undefined,analysis:input.analysis??undefined,attemptedAt:now
    }
  }

  listQuestionAttempts(questionId:string,limit=20):QuestionAttempt[]{
    const rows=this.db.prepare('SELECT * FROM question_attempts WHERE question_id=? ORDER BY attempted_at DESC LIMIT ?')
      .all(questionId,Math.min(100,Math.max(1,limit))) as any[]
    return rows.map(r=>({
      id:String(r.id),questionId:String(r.question_id),variantId:r.variant_id??undefined,userAnswer:r.user_answer??undefined,
      isCorrect:r.is_correct==null?undefined:Boolean(r.is_correct),score:r.score==null?undefined:Number(r.score),
      timeSpentMs:r.time_spent_ms==null?undefined:Number(r.time_spent_ms),
      mistakeCause:r.mistake_cause??undefined,analysis:r.analysis??undefined,attemptedAt:String(r.attempted_at)
    }))
  }


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
      this.db.prepare('INSERT INTO questions(id,content,answer,ocr_text,source,difficulty,mistake_cause,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET content=excluded.content,answer=excluded.answer,ocr_text=excluded.ocr_text,source=excluded.source,difficulty=excluded.difficulty,mistake_cause=excluded.mistake_cause,updated_at=excluded.updated_at').run(
        id,input.content,input.answer??old?.answer??'',input.ocrText??old?.ocrText??null,input.source??old?.source??null,
        Math.min(5,Math.max(1,Number(input.difficulty??old?.difficulty??3))),input.mistakeCause??old?.mistakeCause??null,created,now)
      this.db.prepare('DELETE FROM question_media WHERE question_id=?').run(id)
      let order=0;const path=input.imagePath??old?.imagePath,data=input.imageData??old?.imageData
      if(path)this.db.prepare('INSERT INTO question_media(id,question_id,kind,source,sort_order,created_at) VALUES(?,?,?,?,?,?)').run(crypto.randomUUID(),id,'image',path,order++,now)
      if(data)this.db.prepare('INSERT INTO question_media(id,question_id,kind,content,mime_type,sort_order,created_at) VALUES(?,?,?,?,?,?,?)').run(crypto.randomUUID(),id,'image',data,data.match(/^data:(image\/[^;]+);/i)?.[1] ?? null,order++,now)
      for(const a of input.artifacts??old?.artifacts??[])this.db.prepare('INSERT INTO question_media(id,question_id,kind,title,source,content,poster,sort_order,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(crypto.randomUUID(),id,a.kind,a.title??null,a.source??null,a.content??null,a.poster??null,order++,now)
      // Do not keep the same media twice (for example the current-turn primary image also passed as an image artifact).
      this.db.prepare(`DELETE FROM question_media WHERE question_id=? AND id NOT IN (
        SELECT MIN(id) FROM question_media WHERE question_id=?
        GROUP BY kind, COALESCE(source,''), COALESCE(content,''), COALESCE(poster,'')
      )`).run(id,id)
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

  private reindex(id:string){const q=this.getQuestion(id);if(!q)return;this.db.prepare('DELETE FROM questions_fts WHERE question_id=?').run(id);this.db.prepare('INSERT INTO questions_fts(question_id,content,ocr_text,answer,knowledge_points,tags,mistake_cause) VALUES(?,?,?,?,?,?,?)').run(id,q.content,q.ocrText??'',q.answer,q.knowledgePoints.join(' '),q.tags.join(' '),q.mistakeCause??'')}

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
    try{
      const match=tokens.map(t=>'"'+t.replaceAll('"','""')+'"').join(' OR ')
      const rows=this.db.prepare('SELECT q.*,rs.reps,rs.ease,rs.interval_days,rs.due_at,rs.last_reviewed_at,bm25(questions_fts) rank FROM questions_fts f JOIN questions q ON q.id=f.question_id JOIN review_states rs ON rs.question_id=q.id WHERE questions_fts MATCH ? ORDER BY rank LIMIT ?').all(match,limit) as any[]
      for(const q of this.hydrate(rows))found.set(q.id,{question:q,score:1,matchType:'fts'})
    }catch{}
    if(found.size<limit){
      const rows=this.db.prepare(`
        SELECT q.*,rs.reps,rs.ease,rs.interval_days,rs.due_at,rs.last_reviewed_at
        FROM questions q
        JOIN review_states rs ON rs.question_id=q.id
        LEFT JOIN question_analyses qa ON qa.question_id=q.id
        WHERE lower(
          coalesce(q.content,'')||' '||coalesce(q.answer,'')||' '||coalesce(q.ocr_text,'')||' '||
          coalesce(q.mistake_cause,'')||' '||coalesce(qa.solution,'')||' '||
          coalesce(qa.mistake_type,'')||' '||coalesce(qa.reasoning_error,'')||' '||
          coalesce(qa.knowledge_gaps,'')||' '||coalesce(qa.reasoning_gaps,'')||' '||
          coalesce(qa.correction_strategy,'')||' '||coalesce(qa.variant_suggestions,'')
        ) LIKE ?
        ORDER BY q.updated_at DESC LIMIT ?
      `).all('%'+query.trim().toLocaleLowerCase()+'%',limit-found.size) as any[]
      for(const q of this.hydrate(rows))if(!found.has(q.id))found.set(q.id,{question:q,score:.5,matchType:'fts'})
    }
    return[...found.values()].slice(0,limit)
  }

  findSimilar(id:string,limit=10):SearchHit[]{
    const source=this.getQuestion(id)
    if(!source)throw new Error('Question not found')
    const sourceTerms=terms(source.content+' '+(source.ocrText??'')+' '+(source.mistakeCause??''))
    return this.all()
      .filter(q=>q.id!==id)
      .map(question=>{
        const kp=jaccard(source.knowledgePoints,question.knowledgePoints)
        const tags=jaccard(source.tags,question.tags)
        const text=jaccard(sourceTerms,terms(question.content+' '+(question.ocrText??'')+' '+(question.mistakeCause??'')))
        return {question,score:Number((kp*.5+tags*.25+text*.25).toFixed(4)),matchType:'similarity' as const}
      })
      .filter(x=>x.score>0)
      .sort((a,b)=>b.score-a.score)
      .slice(0,Math.min(50,Math.max(1,limit)))
  }

  recall(query:string,limit=5):SearchHit[]{
    const exact=this.search(query,limit),found=new Map(exact.map(x=>[x.question.id,x])),qt=terms(query)
    const rows=this.db.prepare('SELECT question_id,solution,mistake_type,reasoning_error,knowledge_gaps,reasoning_gaps,correction_strategy,variant_suggestions FROM question_analyses').all() as any[]
    const byQuestion=new Map(rows.map(row=>[String(row.question_id),row]))
    for(const q of this.all()){
      if(found.has(q.id))continue
      const a=byQuestion.get(q.id)
      const analysisText=a
        ? [a.solution,a.mistake_type,a.reasoning_error,a.knowledge_gaps,a.reasoning_gaps,a.correction_strategy,a.variant_suggestions].filter(Boolean).join(' ')
        : ''
      const score=jaccard(qt,terms(q.content+' '+(q.ocrText??'')+' '+(q.mistakeCause??'')+' '+analysisText))
      if(score>=.08)found.set(q.id,{question:q,score:Number(score.toFixed(4)),matchType:'similarity'})
    }
    return[...found.values()].sort((a,b)=>b.score-a.score).slice(0,limit)
  }
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
    const qs=this.all(),logs=this.logs(10000),now=new Date()
    const attempts=this.db.prepare('SELECT * FROM question_attempts ORDER BY attempted_at DESC').all() as any[]
    const validAttempts=attempts.filter(a=>a.is_correct!==null)
    const due=qs.filter(q=>isDue(q.review,now)).length
    const reviewed=qs.filter(q=>q.review.reps>0).length
    const attemptAccuracy=validAttempts.length?validAttempts.filter(a=>Number(a.is_correct)===1).length/validAttempts.length:0

    const attemptsByQuestion=new Map<string,{correct:number;total:number;latest?:string}>()
    for(const a of validAttempts){
      const x=attemptsByQuestion.get(String(a.question_id))??{correct:0,total:0}
      x.total++
      if(Number(a.is_correct)===1)x.correct++
      if(!x.latest||String(a.attempted_at)>x.latest)x.latest=String(a.attempted_at)
      attemptsByQuestion.set(String(a.question_id),x)
    }

    const gapRows=this.db.prepare('SELECT question_id,gap_id,severity,confidence FROM question_learning_gaps').all() as any[]
    const gapsByQuestion=new Map<string,{severity:number;confidence:number;count:number}>()
    for(const g of gapRows){
      const key=String(g.question_id),x=gapsByQuestion.get(key)??{severity:0,confidence:0,count:0}
      x.severity+=Number(g.severity??0)
      x.confidence+=Number(g.confidence??0)
      x.count++
      gapsByQuestion.set(key,x)
    }

    const questionMastery=(q:Question)=>{
      const reviewProgress=Math.min(1,q.review.reps/3)*0.7+Math.min(1,q.review.intervalDays/30)*0.3
      const a=attemptsByQuestion.get(q.id)
      if(!a||!a.total)return reviewProgress
      const accuracy=a.correct/a.total
      return accuracy*0.65+reviewProgress*0.35
    }

    const mastered=qs.filter(q=>{
      const m=questionMastery(q),a=attemptsByQuestion.get(q.id)
      return m>=0.8&&((a?.total??0)>=2||q.review.reps>=3)
    }).length

    const kp=new Map<string,{count:number;mastery:number;correct:number;attempts:number;gaps:number}>()
    for(const q of qs){
      const mastery=questionMastery(q)
      const a=attemptsByQuestion.get(q.id)
      const gapCount=gapsByQuestion.get(q.id)?.count??0
      for(const p of q.knowledgePoints){
        const x=kp.get(p)??{count:0,mastery:0,correct:0,attempts:0,gaps:0}
        x.count++
        x.mastery+=mastery
        x.gaps+=gapCount
        if(a){x.correct+=a.correct;x.attempts+=a.total}
        kp.set(p,x)
      }
    }

    const knowledgePoints=[...kp.entries()].map(([name,x])=>({
      name,
      questionCount:x.count,
      mastery:Math.round((x.mastery/x.count)*100),
      accuracy:x.attempts?Number((x.correct/x.attempts).toFixed(3)):0,
      gapCount:x.gaps
    })).sort((a,b)=>a.mastery-b.mastery)

    const activityMap=new Map<string,number>()
    for(const l of logs)activityMap.set(l.reviewedAt.slice(0,10),(activityMap.get(l.reviewedAt.slice(0,10))??0)+1)
    for(const a of attempts)activityMap.set(String(a.attempted_at).slice(0,10),(activityMap.get(String(a.attempted_at).slice(0,10))??0)+1)

    let d=new Date(now);d.setHours(0,0,0,0);let streak=0
    while(activityMap.has(d.toISOString().slice(0,10))){streak++;d.setDate(d.getDate()-1)}

    const success=logs.filter(l=>l.quality>=3).length
    const days=lastDays(30,now)
    const daily=new Map<string,ReviewLog[]>()
    for(const l of logs){const date=l.reviewedAt.slice(0,10);const x=daily.get(date)??[];x.push(l);daily.set(date,x)}
    const reviewTrend=days.map(date=>{const x=daily.get(date)??[];return{date,reviews:x.length,successRate:x.length?Number((x.filter(v=>v.quality>=3).length/x.length).toFixed(3)):0}})
    const masteryTrend=days.map(date=>({date,mastered:qs.filter(q=>questionMastery(q)>=0.8&&(q.review.lastReviewedAt??q.createdAt).slice(0,10)<=date).length}))

    const mm=new Map<string,number>()
    for(const q of qs){const c=(q.mistakeCause??'未分类').trim()||'未分类';mm.set(c,(mm.get(c)??0)+1)}
    const mistakeCauses=[...mm].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count).slice(0,10)
    const difficulty=[1,2,3,4,5].map(level=>({level,count:qs.filter(q=>q.difficulty===level).length}))
    const learningGaps=this.getLearningGaps(10)
    const weakPoints=knowledgePoints.slice(0,10)
    const seven=new Date(now);seven.setDate(seven.getDate()-6);seven.setHours(0,0,0,0)
    const weekly=logs.filter(x=>new Date(x.reviewedAt)>=seven)
    const weeklyAttempts=validAttempts.filter(x=>new Date(String(x.attempted_at))>=seven)
    const active=new Set<string>([
      ...weekly.map(x=>x.reviewedAt.slice(0,10)),
      ...weeklyAttempts.map(x=>String(x.attempted_at).slice(0,10))
    ])
    const ordered=[...knowledgePoints].sort((a,b)=>b.mastery-a.mastery)

    return{
      totalQuestions:qs.length,
      reviewed,
      due,
      mastered,
      streak,
      reviewCount:logs.length,
      successRate:logs.length?Number((success/logs.length).toFixed(3)):0,
      attemptCount:validAttempts.length,
      attemptAccuracy:Number(attemptAccuracy.toFixed(3)),
      learningGapCount:learningGaps.length,
      knowledgePoints,
      weakPoints,
      learningGaps:learningGaps.map(x=>({
        name:x.name,
        questionCount:x.questionCount,
        dueCount:x.dueCount,
        severity:x.severity,
        confidence:x.confidence
      })),
      activity:[...activityMap.entries()].sort().slice(-30).map(([date,count])=>({date,count})),
      reviewTrend,
      masteryTrend,
      mistakeCauses,
      difficulty,
      reviewCompletionRate:reviewed+due?Number((reviewed/(reviewed+due)).toFixed(3)):0,
      weeklyReport:{
        added:qs.filter(x=>new Date(x.createdAt)>=seven).length,
        reviews:weekly.length,
        successfulReviews:weekly.filter(x=>x.quality>=3).length,
        activeDays:active.size,
        strongestKnowledgePoint:ordered[0]?.name,
        weakestKnowledgePoint:knowledgePoints[0]?.name
      }
    }
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
