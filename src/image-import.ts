import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface PersistedQuestionImage {
  path: string
  mimeType: string
  name?: string
  attachmentId: string
}

export interface DurableImageRef {
  attachmentId: unknown
  mediaType: string
  name?: string
}

interface SessionImageState {
  turn: number
  refs: Map<string, DurableImageRef>
}

/**
 * Track current-turn direct user image attachments from durable session events.
 * This avoids deprecated synchronous Session history readers and only retains the
 * small set of image references needed by a live tool call.
 */
export function createCurrentTurnImageTracker(ctx: any){
  const states=new WeakMap<object,SessionImageState>()
  const stateFor=(session:object,turn=0)=>{
    let state=states.get(session)
    if(!state||state.turn!==turn){
      state={turn,refs:new Map()}
      states.set(session,state)
    }
    return state
  }
  ctx.on('session/event',(session:any,event:any)=>{
    if(!session||!event)return
    if(event.type==='turn/start'){
      states.set(session,{turn:Number(event.data?.turn??0),refs:new Map()})
      return
    }
    if(event.type!=='user/message'||event.data?.source?.kind!=='user')return
    const turnState=states.get(session)
    if(!turnState)return
    for(const block of event.data.content??[]){
      if(block?.type!=='image'||!block.attachment?.attachmentId)continue
      const ref=block.attachment as DurableImageRef
      const key=String(ref.attachmentId)
      if(!turnState.refs.has(key))turnState.refs.set(key,ref)
    }
  },{global:true})
  return {
    refsFor(session:any):DurableImageRef[]{
      if(!session)return[]
      const state=states.get(session)
      return state?Array.from(state.refs.values()):[]
    },
    reset(session:any){
      if(session)states.delete(session)
    }
  }
}

function extension(mediaType:string){
  switch(mediaType){
    case 'image/png': return '.png'
    case 'image/jpeg': return '.jpg'
    case 'image/webp': return '.webp'
    case 'image/gif': return '.gif'
    default: return ''
  }
}

function safeId(value:unknown){
  const normalized=String(value??'attachment').replace(/[^a-zA-Z0-9_-]/g,'_')
  return normalized.slice(0,128)||'attachment'
}

/**
 * Copy current-turn durable normalized images into the wrong-question-owned media directory.
 * DSH's attachment store remains the source of truth for admitted user images; this creates
 * a plugin-owned copy so the wrong-question record remains self-contained.
 */
export async function persistCurrentTurnImages(
  exec:any,
  attachments:any,
  wrongQuestionDir:string,
  questionId:string,
  refs:readonly DurableImageRef[]=[],
):Promise<PersistedQuestionImage[]>{
  if(refs.length===0)return[]
  if(!attachments||typeof attachments.readImage!=='function'){
    throw new Error('Current turn contains an image attachment, but DSH attachments service is unavailable')
  }
  const result:PersistedQuestionImage[]=[]
  const mediaDir=join(wrongQuestionDir,'media',questionId)
  await mkdir(mediaDir,{recursive:true})
  for(const ref of refs){
    const mimeType=String(ref.mediaType)
    const ext=extension(mimeType)
    if(!ext)throw new Error(`Unsupported image attachment type: ${mimeType}`)
    const attachmentId=safeId(ref.attachmentId)
    const filename=attachmentId+ext
    const absolute=join(mediaDir,filename)
    let data:Uint8Array
    try{
      const stored=await attachments.readImage(ref,exec?.signal)
      data=stored.data instanceof Uint8Array?stored.data:new Uint8Array(stored.data)
    }catch(error){
      throw new Error(`Failed to read current-turn image attachment ${attachmentId}: ${error instanceof Error?error.message:String(error)}`)
    }
    if(data.byteLength===0)throw new Error(`Current-turn image attachment ${attachmentId} is empty`)
    try{
      await writeFile(absolute,data,{flag:'wx'})
    }catch(error:any){
      if(error?.code!=='EEXIST')throw new Error(`Failed to persist current-turn image ${attachmentId}: ${error instanceof Error?error.message:String(error)}`)
    }
    result.push({
      path:join('media',questionId,filename),
      mimeType,
      name:typeof ref.name==='string'?ref.name:undefined,
      attachmentId:String(ref.attachmentId)
    })
  }
  return result
}
