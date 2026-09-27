import { readFileSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { join, isAbsolute } from 'node:path'
import { homedir } from 'node:os'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { RuntimeContextLike } from './runtime.js'
import { scheduleReview } from './review.js'
import type { ReviewGrade } from './domain.js'
import { WrongQuestionDb } from './db.js'
import type { KnowledgeGraph } from './knowledge-graph.js'
import type { Embedder } from './embedding.js'
import { hybridSearch } from './hybrid.js'

const PREFIX='/wrong-question-control/v1'
const WEB='/wrong-question/'
const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8')
const js=readFileSync(new URL('../web/app.js',import.meta.url),'utf8')
const css=readFileSync(new URL('../web/app.css',import.meta.url),'utf8')

function send(res:ServerResponse,status:number,body:unknown){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(body))}
function error(res:ServerResponse,e:unknown){send(res,400,{error:e instanceof Error?e.message:String(e)})}
async function body(req:IncomingMessage){let s='';for await(const c of req){s+=c;if(s.length>8_000_000)throw new Error('request body too large')}return s?JSON.parse(s):{}}
function sameOrigin(req:IncomingMessage){const origin=req.headers.origin;if(!origin)return true;const host=req.headers.host??'';try{return new URL(origin).host===host}catch{return false}}

/** 解析题目图片的磁盘绝对路径。imagePath 可能为绝对路径、相对进程 CWD 或相对 DSH_HOME；逐个候选基目录探测。 */
async function resolveImagePath(imagePath:string):Promise<string|null>{
  return resolveMediaPath(imagePath)
}

async function resolveMediaPath(source:string):Promise<string|null>{
  const candidates:string[]=[]
  if(isAbsolute(source)){candidates.push(source)}
  else{
    const home=process.env.DSH_HOME||join(homedir(),'.dsh')
    candidates.push(join(home,'wrong-question',source),join(home,source),join(process.cwd(),source),join(process.cwd(),'wrong-question',source))
  }
  for(const c of candidates){try{if((await stat(c)).isFile())return c}catch{/* continue */}}
  return null
}

function mediaMime(path:string,fallback?:string){
  if(fallback)return fallback
  const ext=path.toLowerCase().split('.').pop()??''
  const map:Record<string,string>={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml',mp4:'video/mp4',webm:'video/webm',ogg:'video/ogg',mov:'video/quicktime',m4v:'video/mp4',html:'text/html',htm:'text/html'}
  return map[ext]
}

function streamMedia(res:ServerResponse,req:IncomingMessage,path:string,size:number,type:string){
  const range=req.headers.range
  if(!range){
    res.writeHead(200,{'content-type':type,'content-length':String(size),'accept-ranges':'bytes','cache-control':'private, max-age=300'})
    readFile(path).then(data=>res.end(data)).catch(()=>{if(!res.headersSent)res.writeHead(500);res.end()})
    return
  }
  const m=/bytes=(\d*)-(\d*)/i.exec(range)
  if(!m){res.writeHead(416,{'content-range':`bytes */${size}`}).end();return}
  const start=m[1]?Number(m[1]):Math.max(0,size-Number(m[2]||0))
  const end=m[2]?Math.min(size-1,Number(m[2])):size-1
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||start>end||start>=size){res.writeHead(416,{'content-range':`bytes */${size}`}).end();return}
  res.writeHead(206,{'content-type':type,'content-length':String(end-start+1),'content-range':`bytes ${start}-${end}/${size}`,'accept-ranges':'bytes','cache-control':'private, max-age=300'})
  import('node:fs').then(({createReadStream})=>createReadStream(path,{start,end}).pipe(res)).catch(()=>res.end())
}

function sendMedia(res:ServerResponse,req:IncomingMessage,data:Buffer,type:string,_allowRange:boolean){
  res.writeHead(200,{'content-type':type,'content-length':String(data.length),'accept-ranges':'bytes','cache-control':'private, max-age=300'})
  res.end(data)
}

export function registerWrongQuestionWeb(ctx:RuntimeContextLike,db:WrongQuestionDb,hybrid: { graph: KnowledgeGraph | null; embedder: Embedder } = { graph: null, embedder: undefined as unknown as Embedder }){
  const ws=ctx.webServer??ctx.get('webServer') as RuntimeContextLike['webServer']
  if(!ws)throw new Error('dsh-wrong-question requires webServer')
  const routes=[
    ws.register({kind:'exact',path:WEB,handler:(_req,res)=>{res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(html)}}),
    ws.register({kind:'exact',path:WEB+'app.js',handler:(_req,res)=>{res.writeHead(200,{'content-type':'text/javascript; charset=utf-8','cache-control':'no-cache'});res.end(js)}}),
    ws.register({kind:'exact',path:WEB+'app.css',handler:(_req,res)=>{res.writeHead(200,{'content-type':'text/css; charset=utf-8','cache-control':'no-cache'});res.end(css)}}),
    ws.register({kind:'prefix',path:PREFIX,handler:async(req,res)=>{
      if(!sameOrigin(req)){res.writeHead(403).end();return}
      try{
        const u=new URL(req.url??'/',`http://${req.headers.host??'localhost'}`)
        const p=u.pathname.slice(PREFIX.length)
        if(req.method==='GET'&&p==='/dashboard')return send(res,200,db.dashboard())
        if(req.method==='GET'&&p==='/graph')return send(res,200,db.graph())
        if(req.method==='GET'&&p==='/questions'){
          return send(res,200,db.list({limit:Number(u.searchParams.get('limit')??100),offset:Number(u.searchParams.get('offset')??0),tag:u.searchParams.get('tag')??undefined,knowledgePoint:u.searchParams.get('knowledgePoint')??undefined,dueOnly:u.searchParams.get('dueOnly')==='1'}))
        }
        if(req.method==='POST'&&p==='/search'){const b=await body(req);return send(res,200,db.search(String(b.query??''),Math.min(50,Number(b.limit??20))))}
        if(req.method==='POST'&&p==='/hybrid'){const b=await body(req);return send(res,200,await hybridSearch(db,hybrid.graph,hybrid.embedder,String(b.query??''),{topK:Math.min(50,Number(b.limit??20))}))}
        if(req.method==='POST'&&p==='/similar'){const b=await body(req);return send(res,200,db.findSimilar(String(b.questionId??''),Math.min(50,Number(b.limit??10))))}
        const media=p.match(/^\/questions\/([^/]+)\/media\/([^/]+)$/)
        if(media&&req.method==='GET'){
          const questionId=decodeURIComponent(media[1]),mediaId=decodeURIComponent(media[2])
          const item=db.getMedia(questionId,mediaId)
          if(!item)throw new Error('Media not found')
          if(item.content){
            const match=String(item.content).match(/^data:([^;]+);base64,(.*)$/is)
            if(match){
              const data=Buffer.from(match[2],'base64')
              return sendMedia(res,req,data,match[1],false)
            }
          }
          const source=String(item.source??'').trim()
          if(!source)throw new Error('Media source not found')
          if(/^https?:\/\//i.test(source))return res.writeHead(302,{location:source}).end()
          const abs=await resolveMediaPath(source)
          if(!abs)throw new Error('Media file not found')
          const info=await stat(abs)
          if(!info.isFile()||info.size>512_000_000)throw new Error('Media file is invalid or too large')
          const type=mediaMime(abs,item.mime_type)
          if(!type)throw new Error('Unsupported media type')
          return streamMedia(res,req,abs,info.size,type)
        }
        const m=p.match(/^\/questions\/([^/]+)$/)
        const image=p.match(/^\/questions\/([^/]+)\/image$/)
        if(image&&req.method==='GET'){
          const q=db.getQuestion(decodeURIComponent(image[1]));if(!q?.imagePath)throw new Error('Question image not found')
          const abs=await resolveMediaPath(q.imagePath);if(!abs)throw new Error('Question image file not found')
          const info=await stat(abs);if(!info.isFile()||info.size>8_000_000)throw new Error('Question image is invalid or too large')
          const data=await readFile(abs);const type=imageMime(data);if(!type)throw new Error('Unsupported question image')
          res.writeHead(200,{'content-type':type,'content-length':String(data.length),'cache-control':'private, max-age=300'});res.end(data);return
        }
        if(m&&req.method==='GET'){const q=db.getQuestion(decodeURIComponent(m[1]));if(!q)throw new Error('Question not found');return send(res,200,q)}
        if(m&&req.method==='DELETE'){return send(res,200,{deleted:db.delete(decodeURIComponent(m[1]))})}
        const review=p.match(/^\/questions\/([^/]+)\/review$/)
        if(review&&req.method==='POST'){
          const id=decodeURIComponent(review[1]);const b=await body(req);const grade=b.grade as ReviewGrade
          if(!['again','hard','good','easy'].includes(grade))throw new Error('invalid review grade')
          const q=db.getQuestion(id);if(!q)throw new Error('Question not found')
          return send(res,200,db.review(id,grade,scheduleReview(q.review,grade).state))
        }
        if(req.method==='POST'&&p==='/questions'){const b=await body(req);return send(res,201,db.upsert({content:String(b.content??'').trim(),answer:String(b.answer??''),knowledgePoints:Array.isArray(b.knowledgePoints)?b.knowledgePoints:[],tags:Array.isArray(b.tags)?b.tags:[],difficulty:Number(b.difficulty??3),mistakeCause:b.mistakeCause,analysis:b.analysis,followupQuestion:b.followupQuestion,source:b.source,imagePath:b.imagePath,imageData:validImage(b.imageData),artifacts:validArtifacts(b.artifacts),ocrText:b.ocrText}))}
        if(req.method==='PATCH'&&m){const q=db.getQuestion(decodeURIComponent(m[1]));if(!q)throw new Error('Question not found');const b=await body(req);return send(res,200,db.upsert({id:q.id,content:String(b.content??q.content).trim(),answer:b.answer??q.answer,knowledgePoints:b.knowledgePoints??q.knowledgePoints,tags:b.tags??q.tags,difficulty:b.difficulty??q.difficulty,mistakeCause:b.mistakeCause??q.mistakeCause,analysis:b.analysis??q.analysis,followupQuestion:b.followupQuestion??q.followupQuestion,source:b.source??q.source,imagePath:b.imagePath??q.imagePath,imageData:b.imageData===undefined?q.imageData:validImage(b.imageData),artifacts:b.artifacts===undefined?q.artifacts:validArtifacts(b.artifacts),ocrText:b.ocrText??q.ocrText}))}
        throw new Error('route not found')
      }catch(e){error(res,e)}
    }})
  ]
  return ()=>routes.forEach(x=>x())
}

function validImage(value:unknown){
  if(value==null||value==='')return value as undefined
  if(typeof value!=='string'||!/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(value)||value.length>7_500_000)throw new Error('invalid or oversized image')
  return value
}
function validArtifacts(value:unknown){
  if(value==null)return[]
  if(!Array.isArray(value)||value.length>20)throw new Error('invalid artifacts')
  return value.map((item:any)=>{
    if(!item||!['image','video','html'].includes(item.kind))throw new Error('invalid artifact kind')
    const source=typeof item.source==='string'?item.source.slice(0,2_000_000):undefined
    const content=typeof item.content==='string'?item.content.slice(0,1_000_000):undefined
    if(item.kind==='html'&&!content&&!source)throw new Error('HTML artifact needs content or source')
    if(item.kind!=='html'&&!source)throw new Error('media artifact needs source')
    return {kind:item.kind,title:typeof item.title==='string'?item.title.slice(0,200):undefined,source,content,poster:typeof item.poster==='string'?item.poster.slice(0,2000):undefined}
  })
}
function imageMime(data:Buffer){
  if(data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return'image/png'
  if(data[0]===0xff&&data[1]===0xd8&&data[2]===0xff)return'image/jpeg'
  if(data.subarray(0,6).toString('ascii')==='GIF87a'||data.subarray(0,6).toString('ascii')==='GIF89a')return'image/gif'
  if(data.subarray(0,4).toString('ascii')==='RIFF'&&data.subarray(8,12).toString('ascii')==='WEBP')return'image/webp'
  return undefined
}
