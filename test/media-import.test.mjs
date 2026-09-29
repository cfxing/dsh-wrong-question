import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { persistQuestionArtifacts } from '../lib/media-import.js'

test('persists video and html artifacts together for one question',async()=>{
  const sourceRoot=mkdtempSync(join(process.cwd(),'dsh-wq-media-src-'))
  const targetRoot=mkdtempSync(join(process.cwd(),'dsh-wq-media-dst-'))
  try{
    const video=join(sourceRoot,'lesson.mp4')
    writeFileSync(video,'VIDEO')
    const artifacts=await persistQuestionArtifacts(
      {agent:{session:{header:{cwd:sourceRoot}}}},
      [
        {kind:'video',title:'错题动画',source:'lesson.mp4'},
        {kind:'html',title:'交互卡片',content:'<html><body>card</body></html>'}
      ],
      targetRoot,
      'q1'
    )
    assert.equal(artifacts.length,2)
    assert.equal(artifacts[0].kind,'video')
    assert.equal(artifacts[0].source,'media/q1/01-lesson.mp4')
    assert.equal(readFileSync(join(targetRoot,artifacts[0].source),'utf8'),'VIDEO')
    assert.equal(artifacts[1].kind,'html')
    assert.match(artifacts[1].source??'',/^media\/q1\/02-/)
    assert.equal(readFileSync(join(targetRoot,artifacts[1].source??''),'utf8'),'<html><body>card</body></html>')
  }finally{
    rmSync(sourceRoot,{recursive:true,force:true})
    rmSync(targetRoot,{recursive:true,force:true})
  }
})
