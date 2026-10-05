import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createCurrentTurnImageTracker, persistCurrentTurnImages } from '../lib/image-import.js'

test('tracks only direct user images in the current turn',()=>{
  const events=[]
  const listeners=[]
  const ctx={on:(name,fn)=>{if(name==='session/event')listeners.push(fn)}}
  const tracker=createCurrentTurnImageTracker(ctx)
  const session={}
  const emit=(event)=>listeners.forEach(fn=>fn(session,event))
  emit({type:'turn/start',data:{turn:1}})
  emit({type:'user/message',data:{source:{kind:'user'},content:[{type:'image',attachment:{attachmentId:'old',mediaType:'image/png'}}]}})
  emit({type:'turn/start',data:{turn:2}})
  emit({type:'user/message',data:{source:{kind:'user'},content:[{type:'image',attachment:{attachmentId:'current',mediaType:'image/png',name:'question.png'}}]}})
  emit({type:'user/message',data:{source:{kind:'plugin'},content:[{type:'image',attachment:{attachmentId:'generated',mediaType:'image/png'}}]}})
  assert.deepEqual(tracker.refsFor(session).map(x=>String(x.attachmentId)),['current'])
  void events
})

test('persists current-turn image bytes into question media directory',async()=>{
  const root=mkdtempSync(join(tmpdir(),'dsh-wq-image-'))
  try{
    const refs=[{attachmentId:'abc123',mediaType:'image/png',name:'题目.png'}]
    const exec={signal:new AbortController().signal}
    const result=await persistCurrentTurnImages(exec,{readImage:async()=>({data:Buffer.from('PNGDATA')})},root,'question-1',refs)
    assert.equal(result.length,1)
    const full=join(root,result[0].path)
    assert.equal(existsSync(full),true)
    assert.equal(readFileSync(full,'utf8'),'PNGDATA')
  }finally{
    rmSync(root,{recursive:true,force:true})
  }
})
