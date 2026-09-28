import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { currentTurnImageRefs, persistCurrentTurnImages } from '../lib/image-import.js'

test('selects only direct user images from the current turn',()=>{
  const refs=currentTurnImageRefs({
    agent:{session:{
      snapshotEvents:()=>[
        {type:'turn/start',data:{turn:1}},
        {type:'user/message',data:{source:{kind:'user'},content:[{type:'image',attachment:{attachmentId:'old',mediaType:'image/png'}}]}},
        {type:'turn/end',data:{turn:1}},
        {type:'turn/start',data:{turn:2}},
        {type:'user/message',data:{source:{kind:'user'},content:[{type:'image',attachment:{attachmentId:'current',mediaType:'image/png',name:'question.png'}},{type:'text',text:'题目'}]}},
        {type:'user/message',data:{source:{kind:'plugin'},content:[{type:'image',attachment:{attachmentId:'generated',mediaType:'image/png'}}]}},
      ]
    }}
  })
  assert.deepEqual(refs.map(x=>String(x.attachmentId)),['current'])
})

test('persists current-turn image bytes into question media directory',async()=>{
  const root=mkdtempSync(join(tmpdir(),'dsh-wq-image-'))
  try{
    const exec={agent:{session:{snapshotEvents:()=>[
      {type:'turn/start',data:{turn:1}},
      {type:'user/message',data:{source:{kind:'user'},content:[{type:'image',attachment:{attachmentId:'abc123',mediaType:'image/png',name:'题目.png'}}]}
    ]}},signal:new AbortController().signal}
    const result=await persistCurrentTurnImages(exec,{readImage:async()=>({data:Buffer.from('PNGDATA')})},root,'question-1')
    assert.equal(result.length,1)
    const full=join(root,result[0].path)
    assert.equal(existsSync(full),true)
    assert.equal(readFileSync(full,'utf8'),'PNGDATA')
  }finally{
    rmSync(root,{recursive:true,force:true})
  }
})
