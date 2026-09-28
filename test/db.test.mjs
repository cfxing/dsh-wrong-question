import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { WrongQuestionDb } from '../lib/db.js'

function database(t){
  const dir=mkdtempSync(join(tmpdir(),'dsh-wq-'))
  const db=new WrongQuestionDb(join(dir,'test.sqlite'))
  t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true})})
  return db
}

test('stores image data and searches every text field',t=>{
  const db=database(t)
  const q=db.upsert({content:'求二次方程的根',answer:'x=1',ocrText:'试卷第十二题',imageData:'data:image/png;base64,AA==',knowledgePoints:['方程'],tags:['期末'],mistakeCause:'计算错误'})
  assert.equal(db.getQuestion(q.id)?.imageData,'data:image/png;base64,AA==')
  assert.equal(db.search('试卷第十二题')[0]?.question.id,q.id)
})

test('similarity combines knowledge points, tags and question text',t=>{
  const db=database(t)
  const a=db.upsert({content:'求一元二次方程的根',knowledgePoints:['一元二次方程'],tags:['代数']})
  const b=db.upsert({content:'解二次方程并验根',knowledgePoints:['一元二次方程'],tags:['代数']})
  db.upsert({content:'计算三角形面积',knowledgePoints:['几何'],tags:['面积']})
  assert.equal(db.findSimilar(a.id,2)[0]?.question.id,b.id)
})

test('dashboard exposes trends and weekly summary',t=>{
  const db=database(t)
  db.upsert({content:'测试题',difficulty:4,knowledgePoints:['函数'],mistakeCause:'审题错误'})
  const dashboard=db.dashboard()
  assert.equal(dashboard.reviewTrend.length,30)
  assert.deepEqual(dashboard.difficulty.find(x=>x.level===4),{level:4,count:1})
  assert.equal(dashboard.weeklyReport.added,1)
  assert.equal(dashboard.mistakeCauses[0]?.name,'审题错误')
})

test('stores structured analysis and aggregates learning gaps',t=>{
  const db=database(t)
  const q=db.upsert({content:'求二次函数顶点',knowledgePoints:['二次函数']})
  const analysis=db.saveQuestionAnalysis({
    questionId:q.id,
    solution:'先配方，再读取顶点坐标',
    mistakeType:'concept_gap',
    reasoningError:'没有把配方法与顶点公式联系起来',
    knowledgeGaps:[
      {name:'配方法理解',description:'不会通过配方法解释顶点公式',severity:.9,confidence:.95},
      {name:'最值判断',severity:.7}
    ],
    reasoningGaps:['不会从变形结果反推图像性质'],
    correctionStrategy:['复习完全平方公式','用配方法重新推导顶点'],
    variantSuggestions:['改变参数后再求顶点','给定顶点反求参数'],
    confidence:.92,
    generatedBy:'harness-agent'
  })
  assert.equal(analysis.mistakeType,'concept_gap')
  assert.deepEqual(analysis.knowledgeGaps,['配方法理解','最值判断'])
  const gaps=db.getLearningGaps()
  assert.equal(gaps.length,2)
  assert.equal(gaps[0]?.name,'配方法理解')
  assert.equal(gaps[0]?.questionCount,1)
  assert.equal(db.getQuestionAnalysis(q.id)?.reasoningGaps[0],'不会从变形结果反推图像性质')
})

test('links a persisted image file as question media without storing bytes in SQLite',t=>{
  const db=database(t)
  const q=db.upsert({content:'图片错题'})
  const media=db.addQuestionImage({
    questionId:q.id,
    source:'media/'+q.id+'/abc.png',
    mimeType:'image/png',
    title:'题目原图'
  })
  assert.equal(media.kind,'image')
  assert.equal(db.getQuestion(q.id)?.imagePath,'media/'+q.id+'/abc.png')
  assert.equal(db.getMedia(q.id,media.id)?.mime_type,'image/png')
})

test('stores generated variants and real attempts independently from review logs',t=>{
  const db=database(t)
  const q=db.upsert({content:'一元二次方程求根'})
  const variant=db.addQuestionVariant({
    questionId:q.id,
    variantType:'number_change',
    content:'改变系数后重新求根',
    answer:'x=2,-3',
    analysis:'检查求根公式代入',
    difficulty:3,
    generatedBy:'harness-agent'
  })
  assert.equal(db.listQuestionVariants(q.id)[0]?.id,variant.id)
  const attempt=db.recordQuestionAttempt({
    questionId:q.id,
    variantId:variant.id,
    userAnswer:'x=2',
    isCorrect:false,
    score:.5,
    timeSpentMs:12000,
    mistakeCause:'计算错误',
    analysis:'判别式计算出错'
  })
  assert.equal(db.listQuestionAttempts(q.id)[0]?.isCorrect,false)
  assert.equal(db.listQuestionAttempts(q.id)[0]?.variantId,variant.id)
  assert.equal(db.listQuestionAttempts(q.id)[0]?.timeSpentMs,12000)
  assert.equal(db.listQuestionAttempts(q.id)[0]?.mistakeCause,'计算错误')
  assert.equal(db.logs().length,0)
})
