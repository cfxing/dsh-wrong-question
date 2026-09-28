import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface PersistedQuestionImage {
  path: string
  mimeType: string
  name?: string
  attachmentId: string
}

type DurableImageRef = {
  attachmentId: unknown
  mediaType: string
  name?: string
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
 * Return image attachments belonging to direct user messages in the current turn.
 * Injected/generated images are intentionally ignored to avoid attaching unrelated media.
 */
export function currentTurnImageRefs(exec:any):DurableImageRef[]{
  const session=exec?.agent?.session
  if(!session||typeof session.snapshotEvents!=='function')return[]
  const events=Array.from(session.snapshotEvents()) as any[]
  let start=0
  for(let i=events.length-1;i>=0;i--){
    if(events[i]?.type==='turn/start'){
      start=i+1
      break
    }
  }
  const refs:DurableImageRef[]=[]
  for(let i=start;i<events.length;i++){
    const event=events[i]
    if(event?.type!=='user/message'||event?.data?.source?.kind!=='user')continue
    for(const block of event.data.content??[]){
      if(block?.type==='image'&&block.attachment?.attachmentId)refs.push(block.attachment as DurableImageRef)
    }
  }
  const seen=new Set<string>()
  return refs.filter(ref=>{
    const key=String(ref.attachmentId)
    if(seen.has(key))return false
    seen.add(key)
    return true
  })
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
):Promise<PersistedQuestionImage[]>{
  const refs=currentTurnImageRefs(exec)
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
