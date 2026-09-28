import type { Context } from '@deepseek-ai/cordis'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { createCurrentTurnImageTracker, persistCurrentTurnImages } from './image-import.js'
import { WrongQuestionDb } from './db.js'
import type { GraphSyncHook } from './db.js'
import { scheduleReview } from './review.js'
import type { ReviewGrade } from './domain.js'
import { registerWrongQuestionWeb } from './web.js'
import { KnowledgeGraph } from './knowledge-graph.js'
import { OllamaEmbedder, type Embedder } from './embedding.js'
import { hybridSearch } from './hybrid.js'

export const name='wrong-question'
export const inject=['tools']

function wrongQuestionDir(){const home=process.env.DSH_HOME||join(homedir(),'.dsh');const dir=join(home,'wrong-question');mkdirSync(dir,{recursive:true});return dir}
function dbPath(){return join(wrongQuestionDir(),'wrong-questions.sqlite')}

export function apply(ctx:Context){
  const embedder = new OllamaEmbedder()
  let graph: KnowledgeGraph | null = null
  const graphSync: GraphSyncHook = {
    upsert: (q) => { if (graph) return graph.upsertQuestion(q) },
    delete: (id) => { if (graph) return graph.deleteQuestion(id) },
    close: () => { if (graph) return graph.close() },
  }
  const db=new WrongQuestionDb(dbPath(), graphSync)
  const currentTurnImages=createCurrentTurnImageTracker(ctx)
  const webRuntime={graph:null as KnowledgeGraph|null,embedder}
  void initGraph(db, embedder).then((g) => { graph = g; webRuntime.graph = g })
  ctx.effect(()=>()=>db.close(),'dsh-wrong-question: sqlite')
  // Browser workspace and server API share the same SQLite connection.
  const runtime=ctx as any
  if(runtime.inject)runtime.inject(['webServer'],(http:any)=>registerWrongQuestionWeb(http,db,webRuntime))
  else if(runtime.webServer)registerWrongQuestionWeb(runtime,db,webRuntime)

  // Tool registration is intentionally kept compact here; the Web workspace uses
  // the same domain service, so Agents and UI cannot diverge in persistence.
  const tools:any=(ctx as any).tools
  const artifacts={type:'array',description:'Generated media to show with the question. HTML runs in a sandboxed iframe.',items:{type:'object',additionalProperties:false,properties:{kind:{type:'string',enum:['image','video','html']},title:{type:'string'},source:{type:'string',description:'HTTP(S), data URL, or same-origin URL for image/video; optional URL for HTML.'},content:{type:'string',description:'Inline HTML document for an interactive card.'},poster:{type:'string'}},required:['kind']}}
  const register=(name:string,description:string,properties:any,required:string[],execute:any)=>{
    tools.register({
      name, description,
      parameters:{type:'object',additionalProperties:false,properties,required},
      output:{schema:{type:'string'},render:(_args:any,value:string)=>[{type:'text',text:value}]},
      execute:async(args:any)=>toToolJson(await execute(args))
    })
  }
  register('add_question','Create a wrong-question record. When the current user turn contains durable image attachments and no explicit image_path/image_data is supplied, automatically copy those images into the wrong-question media directory and link them to the new record.',
    {content:{type:'string'},answer:{type:'string'},knowledge_points:{type:'array',items:{type:'string'}},tags:{type:'array',items:{type:'string'}},difficulty:{type:'number'},mistake_cause:{type:'string'},analysis:{type:'string'},followup_question:{type:'string'},source:{type:'string'},image_path:{type:'string'},image_data:{type:'string',description:'Optional data:image/... base64 URL from the workspace.'},artifacts,ocr_text:{type:'string'}},
    ['content'],async(a:any,exec:any)=>{
      const id=crypto.randomUUID()
      const imported=!a.image_path&&!a.image_data
        ? await persistCurrentTurnImages(exec,(ctx as any).attachments??(ctx as any).get?.('attachments'),wrongQuestionDir(),id,currentTurnImages.refsFor(exec.agent?.session))
        : []
      const extraArtifacts=imported.slice(1).map(image=>({kind:'image' as const,title:image.name,source:image.path}))
      return db.upsert({
        id,content:a.content,answer:a.answer,knowledgePoints:a.knowledge_points,tags:a.tags,difficulty:a.difficulty,
        mistakeCause:a.mistake_cause,analysis:a.analysis,followupQuestion:a.followup_question,source:a.source,
        imagePath:a.image_path??imported[0]?.path,
        imageData:a.image_data,artifacts:[...(a.artifacts??[]),...extraArtifacts],ocrText:a.ocr_text
      })
    })
  register('get_question','Get one wrong question together with structured analysis, learning gaps, generated variants, and recent attempts.',
    {question_id:{type:'string'}},['question_id'],
    async(a:any)=>{const detail=db.getQuestionDetail(a.question_id);if(!detail)throw new Error('Question not found');return detail})
  register('update_question','Update a wrong question.',
    {question_id:{type:'string'},content:{type:'string'},answer:{type:'string'},knowledge_points:{type:'array',items:{type:'string'}},tags:{type:'array',items:{type:'string'}},difficulty:{type:'number'},mistake_cause:{type:'string'},analysis:{type:'string'},followup_question:{type:'string'},artifacts},
    ['question_id'],async(a:any)=>{const q=db.getQuestion(a.question_id);if(!q)throw new Error('Question not found');return db.upsert({id:q.id,content:a.content??q.content,answer:a.answer??q.answer,knowledgePoints:a.knowledge_points??q.knowledgePoints,tags:a.tags??q.tags,difficulty:a.difficulty??q.difficulty,mistakeCause:a.mistake_cause??q.mistakeCause,analysis:a.analysis??q.analysis,followupQuestion:a.followup_question??q.followupQuestion,artifacts:a.artifacts??q.artifacts})})
  register('analyze_question','Save structured Agent/Vision analysis for an existing wrong question. Use this after OCR/reasoning to record the solution, mistake diagnosis, learning gaps, reasoning gaps, correction strategy, and variant suggestions.',
    {
      question_id:{type:'string'},
      content:{type:'string'},
      ocr_text:{type:'string'},
      answer:{type:'string'},
      knowledge_points:{type:'array',items:{type:'string'}},
      tags:{type:'array',items:{type:'string'}},
      difficulty:{type:'number'},
      mistake_cause:{type:'string'},
      analysis:{type:'string',description:'Legacy free-form summary kept for backward compatibility.'},
      solution:{type:'string',description:'Correct solution/explanation.'},
      mistake_type:{type:'string',description:'Normalized mistake category, e.g. concept_gap, calculation, misread, method, reasoning, memory, careless, transfer.'},
      reasoning_error:{type:'string',description:'The reasoning step or misconception that caused the error.'},
      learning_gaps:{
        type:'array',
        items:{
          type:'object',
          additionalProperties:false,
          properties:{
            name:{type:'string'},
            description:{type:'string'},
            severity:{type:'number'},
            confidence:{type:'number'}
          },
          required:['name']
        },
        description:'Concrete things the learner does not yet master.'
      },
      reasoning_gaps:{type:'array',items:{type:'string'}},
      correction_strategy:{type:'array',items:{type:'string'}},
      variant_suggestions:{type:'array',items:{type:'string'}},
      confidence:{type:'number'},
      generated_by:{type:'string'},
      followup_question:{type:'string'},
      artifacts
    },
    ['question_id'],async(a:any)=>{
      const q=db.getQuestion(a.question_id)
      if(!q)throw new Error('Question not found')
      const updated=db.upsert({
        id:q.id,
        content:a.content??q.content,
        ocrText:a.ocr_text??q.ocrText,
        answer:a.answer??q.answer,
        knowledgePoints:a.knowledge_points??q.knowledgePoints,
        tags:a.tags??q.tags,
        difficulty:a.difficulty??q.difficulty,
        mistakeCause:a.mistake_cause??q.mistakeCause,
        analysis:a.analysis??q.analysis,
        followupQuestion:a.followup_question??q.followupQuestion,
        artifacts:a.artifacts??q.artifacts
      })
      const imported=await persistCurrentTurnImages(exec,(ctx as any).attachments??(ctx as any).get?.('attachments'),wrongQuestionDir(),updated.id,currentTurnImages.refsFor(exec.agent?.session))
      for(const image of imported)db.addQuestionImage({questionId:updated.id,source:image.path,mimeType:image.mimeType,title:image.name})
      const structured=db.saveQuestionAnalysis({
        questionId:updated.id,
        solution:a.solution,
        mistakeType:a.mistake_type,
        reasoningError:a.reasoning_error,
        knowledgeGaps:a.learning_gaps,
        reasoningGaps:a.reasoning_gaps,
        correctionStrategy:a.correction_strategy,
        variantSuggestions:a.variant_suggestions,
        confidence:a.confidence,
        generatedBy:a.generated_by
      })
      return {question:updated,analysis:structured,learningGaps:db.getLearningGaps(20)}
    })
  register('delete_question','Delete a wrong question.',
    {question_id:{type:'string'}},['question_id'],async(a:any)=>({deleted:db.delete(a.question_id)}))
  register('list_questions','List wrong questions.',
    {limit:{type:'integer'},offset:{type:'integer'},tag:{type:'string'},knowledge_point:{type:'string'},due_only:{type:'boolean'}},[],
    async(a:any)=>db.list({limit:a.limit,offset:a.offset,tag:a.tag,knowledgePoint:a.knowledge_point,dueOnly:a.due_only}))
  register('search_questions','Search the learner\'s wrong-question history by question, answer, OCR, knowledge point, tag, mistake cause, or analysis.',
    {query:{type:'string'},limit:{type:'integer'}},['query'],
    async(a:any)=>db.search(a.query,Math.min(50,a.limit??10)))
  register('find_similar_questions','Find lexical/knowledge-point similar questions.',
    {question_id:{type:'string'},limit:{type:'integer'}},['question_id'],
    async(a:any)=>db.findSimilar(a.question_id,Math.min(50,a.limit??10)))
  register('recall_wrong_questions','Use before answering a new academic question to recall related past mistakes and adapt the explanation. Pass the user question as query.',
    {query:{type:'string'},limit:{type:'integer'}},['query'],
    async(a:any)=>db.recall(a.query,Math.min(10,a.limit??5)))
  register('add_question_variant','Create a targeted variant of an existing wrong question. Use after analysis to generate same-level, number-change, condition-change, reverse, reasoning, or transfer practice.',
    {
      question_id:{type:'string'},
      variant_type:{type:'string'},
      content:{type:'string'},
      answer:{type:'string'},
      analysis:{type:'string'},
      difficulty:{type:'number'},
      source:{type:'string'},
      generated_by:{type:'string'}
    },
    ['question_id','variant_type','content'],
    async(a:any)=>db.addQuestionVariant({
      questionId:a.question_id,
      variantType:a.variant_type,
      content:a.content,
      answer:a.answer,
      analysis:a.analysis,
      difficulty:a.difficulty,
      source:a.source,
      generatedBy:a.generated_by
    }))

  register('list_question_variants','List generated variants for a wrong question.',
    {
      question_id:{type:'string'},
      limit:{type:'integer'}
    },
    ['question_id'],
    async(a:any)=>db.listQuestionVariants(a.question_id,a.limit??20))

  register('record_question_attempt','Record the learner\'s actual attempt on a wrong question. Keep this separate from Again/Hard/Good/Easy review scheduling.',
    {
      question_id:{type:'string'},
      variant_id:{type:'string'},
      user_answer:{type:'string'},
      is_correct:{type:'boolean'},
      score:{type:'number'},
      time_spent_ms:{type:'integer'},
      mistake_cause:{type:'string'},
      analysis:{type:'string'}
    },
    ['question_id'],
    async(a:any)=>db.recordQuestionAttempt({
      questionId:a.question_id,
      variantId:a.variant_id,
      userAnswer:a.user_answer,
      isCorrect:a.is_correct,
      score:a.score,
      timeSpentMs:a.time_spent_ms,
      mistakeCause:a.mistake_cause,
      analysis:a.analysis
    }))

  register('list_question_attempts','List recent actual attempts for a wrong question.',
    {
      question_id:{type:'string'},
      limit:{type:'integer'}
    },
    ['question_id'],
    async(a:any)=>db.listQuestionAttempts(a.question_id,a.limit??20))

  register('get_learning_gaps','Get the learner\'s current learning gaps aggregated from analyzed wrong questions. Use this instead of treating raw knowledge-point counts as mastery.',
    {limit:{type:'integer'}},
    [],
    async(a:any)=>db.getLearningGaps(a.limit??20))

  register('review_question','Review a question using Again/Hard/Good/Easy.',
    {question_id:{type:'string'},grade:{type:'string',enum:['again','hard','good','easy']}},['question_id','grade'],
    async(a:any)=>{const q=db.getQuestion(a.question_id);if(!q)throw new Error('Question not found');const grade=a.grade as ReviewGrade;return db.review(q.id,grade,scheduleReview(q.review,grade).state)})
  register('get_due_reviews','List due reviews.',
    {limit:{type:'integer'}},[],async(a:any)=>db.due(a.limit??20))
  register('get_learning_dashboard','Get learning dashboard.',{},[],async()=>db.dashboard())
  register('get_knowledge_graph','Get knowledge graph.',{},[],async()=>db.graph())
  register('hybrid_search_questions','Hybrid retrieval: fuse lexical (FTS), vector (semantic embedding), and knowledge-graph traversal ranking via Reciprocal Rank Fusion. Use for queries where any single retrieval mode is insufficient.',
    {query:{type:'string'},limit:{type:'integer'}},['query'],
    async(a:any)=>hybridSearch(db,graph,embedder,a.query,{topK:Math.min(50,a.limit??10)}))
}

function toToolJson(value:unknown):string{
  const json=JSON.stringify(value,(_key,item)=>typeof item==='bigint'?item.toString():item)
  return json===undefined?'null':json
}

/** 初始化 Kuzu 图存储并做全量投影；失败（如原生绑定缺失/库不可用）返回 null，系统降级为纯 SQLite。 */
export async function initGraph(db: WrongQuestionDb, embedder: Embedder): Promise<KnowledgeGraph | null> {
  try {
    const home = process.env.DSH_HOME || join(homedir(), '.dsh')
    const dir = join(home, 'wrong-question')
    mkdirSync(dir, { recursive: true })
    const graph = new KnowledgeGraph({ path: join(dir, 'knowledge.kuzu'), embedder })
    await graph.ready
    await graph.rebuild(db.all())
    return graph
  } catch {
    return null
  }
}
