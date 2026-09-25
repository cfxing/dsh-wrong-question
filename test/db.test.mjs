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
