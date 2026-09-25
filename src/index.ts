import type { Context } from '@deepseek-ai/cordis'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { WrongQuestionDb } from './db.js'
import { scheduleReview } from './review.js'
import type { ReviewGrade } from './domain.js'
import { registerWrongQuestionWeb } from './web.js'

export const name='wrong-question'
export const inject=['tools']

function dbPath(){const home=process.env.DSH_HOME||join(homedir(),'.dsh');const dir=join(home,'wrong-question');mkdirSync(dir,{recursive:true});return join(dir,'wrong-questions.sqlite')}

export function apply(ctx:Context){
  const db=new WrongQuestionDb(dbPath())
  ctx.effect(()=>()=>db.close(),'dsh-wrong-question: sqlite')
  // Browser workspace and server API share the same SQLite connection.
  const runtime=ctx as any
  if(runtime.inject)runtime.inject(['webServer'],(http:any)=>registerWrongQuestionWeb(http,db))
  else if(runtime.webServer)registerWrongQuestionWeb(runtime,db)

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
  register('add_question','Create a wrong-question record.',
    {content:{type:'string'},answer:{type:'string'},knowledge_points:{type:'array',items:{type:'string'}},tags:{type:'array',items:{type:'string'}},difficulty:{type:'number'},mistake_cause:{type:'string'},analysis:{type:'string'},followup_question:{type:'string'},source:{type:'string'},image_path:{type:'string'},image_data:{type:'string',description:'Optional data:image/... base64 URL from the workspace.'},artifacts,ocr_text:{type:'string'}},
    ['content'],async(a:any)=>db.upsert({content:a.content,answer:a.answer,knowledgePoints:a.knowledge_points,tags:a.tags,difficulty:a.difficulty,mistakeCause:a.mistake_cause,analysis:a.analysis,followupQuestion:a.followup_question,source:a.source,imagePath:a.image_path,imageData:a.image_data,artifacts:a.artifacts,ocrText:a.ocr_text}))
  register('get_question','Get one wrong question.',
    {question_id:{type:'string'}},['question_id'],
    async(a:any)=>{const q=db.getQuestion(a.question_id);if(!q)throw new Error('Question not found');return q})
  register('update_question','Update a wrong question.',
    {question_id:{type:'string'},content:{type:'string'},answer:{type:'string'},knowledge_points:{type:'array',items:{type:'string'}},tags:{type:'array',items:{type:'string'}},difficulty:{type:'number'},mistake_cause:{type:'string'},analysis:{type:'string'},followup_question:{type:'string'},artifacts},
    ['question_id'],async(a:any)=>{const q=db.getQuestion(a.question_id);if(!q)throw new Error('Question not found');return db.upsert({id:q.id,content:a.content??q.content,answer:a.answer??q.answer,knowledgePoints:a.knowledge_points??q.knowledgePoints,tags:a.tags??q.tags,difficulty:a.difficulty??q.difficulty,mistakeCause:a.mistake_cause??q.mistakeCause,analysis:a.analysis??q.analysis,followupQuestion:a.followup_question??q.followupQuestion,artifacts:a.artifacts??q.artifacts})})
  register('analyze_question','Save structured Vision/Agent analysis for an existing wrong question.',
    {question_id:{type:'string'},content:{type:'string'},ocr_text:{type:'string'},answer:{type:'string'},knowledge_points:{type:'array',items:{type:'string'}},tags:{type:'array',items:{type:'string'}},difficulty:{type:'number'},mistake_cause:{type:'string'},analysis:{type:'string'},followup_question:{type:'string'},artifacts},
    ['question_id'],async(a:any)=>{const q=db.getQuestion(a.question_id);if(!q)throw new Error('Question not found');return db.upsert({id:q.id,content:a.content??q.content,ocrText:a.ocr_text??q.ocrText,answer:a.answer??q.answer,knowledgePoints:a.knowledge_points??q.knowledgePoints,tags:a.tags??q.tags,difficulty:a.difficulty??q.difficulty,mistakeCause:a.mistake_cause??q.mistakeCause,analysis:a.analysis??q.analysis,followupQuestion:a.followup_question??q.followupQuestion,artifacts:a.artifacts??q.artifacts})})
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
  register('review_question','Review a question using Again/Hard/Good/Easy.',
    {question_id:{type:'string'},grade:{type:'string',enum:['again','hard','good','easy']}},['question_id','grade'],
    async(a:any)=>{const q=db.getQuestion(a.question_id);if(!q)throw new Error('Question not found');const grade=a.grade as ReviewGrade;return db.review(q.id,grade,scheduleReview(q.review,grade).state)})
  register('get_due_reviews','List due reviews.',
    {limit:{type:'integer'}},[],async(a:any)=>db.due(a.limit??20))
  register('get_learning_dashboard','Get learning dashboard.',{},[],async()=>db.dashboard())
  register('get_knowledge_graph','Get knowledge graph.',{},[],async()=>db.graph())

}

function toToolJson(value:unknown):string{
  const json=JSON.stringify(value,(_key,item)=>typeof item==='bigint'?item.toString():item)
  return json===undefined?'null':json
}
