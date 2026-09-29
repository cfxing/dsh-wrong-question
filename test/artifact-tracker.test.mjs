import test from 'node:test'
import assert from 'node:assert/strict'
import { createCurrentTurnTeachingArtifactTracker } from '../lib/artifact-tracker.js'

test('captures OpenMAIC render and widget visuals from the current turn',()=>{
  const listeners=[]
  const ctx={on:(name,fn)=>{if(name==='session/event')listeners.push(fn)}}
  const tracker=createCurrentTurnTeachingArtifactTracker(ctx)
  const session={}
  const emit=(event)=>listeners.forEach(fn=>fn(session,event))

  emit({type:'turn/start',data:{turn:1}})
  emit({
    type:'tool/result',
    seq:2,
    data:{
      message:{source:{callId:'render-1'}},
      meta:{kind:'openmaic-render',title:'平面镜成像',fragment:'<svg>solution</svg>'}
    }
  })
  emit({
    type:'tool/result',
    seq:3,
    data:{
      message:{source:{callId:'widget-1'}},
      meta:{kind:'openmaic-widget',title:'受力互动',html:'<!doctype html><html><body>widget</body></html>'}
    }
  })

  const artifacts=tracker.artifactsFor(session)
  assert.equal(artifacts.length,2)
  assert.equal(artifacts[0]?.kind,'html')
  assert.equal(artifacts[0]?.title,'解题图示 · 平面镜成像')
  assert.equal(artifacts[0]?.content,'<svg>solution</svg>')
  assert.equal(artifacts[1]?.title,'解题互动 · 受力互动')

  emit({type:'turn/start',data:{turn:2}})
  assert.deepEqual(tracker.artifactsFor(session),[])
})
