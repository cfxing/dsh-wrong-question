import React,{useEffect,useMemo,useState} from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { registerMainPanel } from './main-panel-compat.js'
import clientCss from './client.css'

const PLUGIN_ID='dsh-wrong-question'
const API='/wrong-question-control/v1'
type Tab='dashboard'|'questions'|'review'|'graph'
type Artifact={kind:'image'|'video'|'html';title?:string;source?:string;content?:string;poster?:string}
type Question={id:string;content:string;answer:string;source?:string;imagePath?:string;imageData?:string;artifacts:Artifact[];ocrText?:string;knowledgePoints:string[];tags:string[];difficulty:number;mistakeCause?:string;analysis?:string;followupQuestion?:string;createdAt:string;updatedAt:string;review:{reps:number;ease:number;intervalDays:number;dueAt:string;lastReviewedAt?:string}}

export const inject=['slots','layout']

export function apply(ctx:Context){
  installStyles()
  const ui=ctx as any
  let dispose:(()=>void)|undefined
  const open=()=>{dispose?.();dispose=registerMainPanel(ctx,PLUGIN_ID,-1,()=> <WrongQuestionWorkspace close={()=>{dispose?.();dispose=undefined}} />)}
  ui.slots.inject('sidebar.footer.action',()=>ui.slots.register({name:'sidebar.footer.action',id:'wrong-question',order:-9},()=>(
    <button className="dsh-wq-launcher" title="错题库" onClick={open}><span className="dsh-wq-icon">错</span><span>错题库</span></button>
  )))
  ctx.effect(()=>()=>dispose?.(),'dsh-wrong-question: workspace lifecycle')
}

function installStyles(){
  const id='dsh-wrong-question'
  if(document.querySelector(`style[data-plugin="${id}"]`))return
  const tag=document.createElement('style')
  tag.dataset.plugin=id
  tag.textContent=clientCss
  document.head.appendChild(tag)
}

function WrongQuestionWorkspace({close}:{close:()=>void}){
  const [tab,setTab]=useState<Tab>('dashboard')
  const [questions,setQuestions]=useState<Question[]>([])
  const [dashboard,setDashboard]=useState<any>()
  const [graph,setGraph]=useState<any>()
  const [selected,setSelected]=useState<Question>()
  const [editing,setEditing]=useState<Question|null|undefined>()
  const [search,setSearch]=useState('')
  const [focusPoint,setFocusPoint]=useState<string|null>(null)
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const load=async()=>{
    setLoading(true);setError('')
    try{const [d,q,g]=await Promise.all([get('/dashboard'),get('/questions?limit=100'),get('/graph')]);setDashboard(d);setQuestions(q);setGraph(g)}
    catch(e){setError(message(e))}finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[])
  const filtered=useMemo(()=>{if(focusPoint){return questions.filter(q=>q.knowledgePoints.map(k=>k.toLocaleLowerCase()).includes(focusPoint.toLocaleLowerCase()))}const s=search.trim().toLocaleLowerCase();return s?questions.filter(q=>questionText(q).includes(s)):questions},[questions,search,focusPoint])
  const due=questions.filter(q=>new Date(q.review.dueAt)<=new Date())
  const openKnowledgePoint=(name:string)=>{setFocusPoint(name);setTab('questions')}
  const clearFocus=()=>setFocusPoint(null)
  return <div className="dsh-wq-shell">
    <header className="dsh-wq-header">
      <div><button className="dsh-wq-back" onClick={close} aria-label="返回">‹</button><div><h1>错题库</h1><p>收集 · 分析 · 复习 · 掌握</p></div></div>
      <div className="dsh-wq-header-actions"><input value={search} onChange={e=>{setSearch(e.target.value);setFocusPoint(null)}} placeholder="搜索题目、答案、标签、知识点…" /><button className="primary" onClick={()=>setEditing(null)}>＋ 新建错题</button></div>
    </header>
    <nav className="dsh-wq-tabs">
      {([['dashboard','总览'],['questions',`错题 ${questions.length}`],['review',`复习 ${due.length}`],['graph','知识图谱']] as const).map(([id,label])=><button className={tab===id?'active':''} onClick={()=>setTab(id)} key={id}>{label}</button>)}
    </nav>
    <main className="dsh-wq-main">
      {error&&<div className="dsh-wq-error">{error}<button onClick={()=>void load()}>重试</button></div>}
      {loading&&<div className="dsh-wq-loading">正在加载…</div>}
      {!loading&&tab==='dashboard'&&<DashboardView d={dashboard} openTab={setTab}/>}
      {!loading&&tab==='questions'&&<>{focusPoint&&<div className="kp-focus"><span>聚焦知识点：<b>{focusPoint}</b></span><button onClick={clearFocus}>✕ 清除</button></div>}<QuestionList qs={filtered} onSelect={setSelected} onRefresh={load}/></>}
      {!loading&&tab==='review'&&<ReviewView qs={due} onReviewed={load}/>}
      {!loading&&tab==='graph'&&<GraphView g={graph} onPick={openKnowledgePoint}/>}
    </main>
    {selected&&<QuestionSheet q={selected} close={()=>setSelected(undefined)} edit={()=>{setEditing(selected);setSelected(undefined)}} refresh={async()=>{await load();setSelected(undefined)}}/>}
    {editing!==undefined&&<QuestionEditor question={editing} close={()=>setEditing(undefined)} saved={async q=>{setEditing(undefined);await load();setSelected(q)}}/>}
  </div>
}

function DashboardView({d,openTab}:{d:any;openTab:(tab:Tab)=>void}){
  if(!d)return null
  return <div className="dsh-wq-dashboard">
    <div className="dsh-wq-metrics">{[['错题',d.totalQuestions],['待复习',d.due],['已复习',d.reviewed],['已掌握',d.mastered],['连续学习',d.streak+' 天']].map(([a,b])=><div className="metric" key={String(a)}><small>{a}</small><strong>{b}</strong></div>)}</div>
    <div className="dashboard-grid">
      <section><div className="section-title"><h2>30 天复习趋势</h2><span>正确率 {Math.round(d.successRate*100)}%</span></div><MiniBars data={d.reviewTrend} value="reviews" title={(x:any)=>`${x.date}：${x.reviews} 次，正确率 ${Math.round(x.successRate*100)}%`}/></section>
      <section><div className="section-title"><h2>本周报告</h2><span>活跃 {d.weeklyReport.activeDays} 天</span></div><div className="weekly"><b>新增 {d.weeklyReport.added} 道</b><b>复习 {d.weeklyReport.reviews} 次</b><b>成功 {d.weeklyReport.successfulReviews} 次</b><p>薄弱知识点：{d.weeklyReport.weakestKnowledgePoint||'暂无'}</p></div></section>
      <section><h2>薄弱知识点</h2>{d.weakPoints.length?<div className="weak-list">{d.weakPoints.slice(0,7).map((x:any)=><div className="weak" key={x.name}><span>{x.name}</span><b>{x.mastery}%</b><i><em style={{width:`${x.mastery}%`}}/></i></div>)}</div>:<p className="empty compact">还没有知识点数据。</p>}</section>
      <section><h2>难度分布</h2><MiniBars data={d.difficulty} value="count" labels title={(x:any)=>`难度 ${x.level}：${x.count} 道`}/></section>
      <section className="wide"><div className="section-title"><h2>错误类型</h2><button onClick={()=>openTab('questions')}>查看错题</button></div><div className="cause-list">{d.mistakeCauses.map((x:any)=><span key={x.name}>{x.name}<b>{x.count}</b></span>)}</div></section>
    </div>
  </div>
}

function MiniBars({data,value,title,labels=false}:{data:any[];value:string;title:(x:any)=>string;labels?:boolean}){
  const max=Math.max(1,...data.map(x=>Number(x[value])||0))
  return <div className="mini-bars">{data.map((x,i)=><div className="bar-wrap" key={x.date??x.level??i} title={title(x)}><i style={{height:`${Math.max(3,(Number(x[value])||0)/max*72)}px`}}/>{labels&&<small>{x.level}</small>}</div>)}</div>
}

function QuestionList({qs,onSelect,onRefresh}:{qs:Question[];onSelect:(q:Question)=>void;onRefresh:()=>void}){
  return <div className="dsh-wq-list"><div className="list-toolbar"><span>{qs.length} 道</span><button onClick={onRefresh}>刷新</button></div>
    {qs.map(q=><button className="question-row" key={q.id} onClick={()=>onSelect(q)}><div>{q.imageData&&<span className="image-badge">图片</span>}<strong>{q.content.slice(0,120)}</strong><p>{q.knowledgePoints.map(x=><span key={x}>{x}</span>)}{q.tags.map(x=><span key={x}>#{x}</span>)}</p></div><small>{isDue(q)?'待复习':q.review.reps?'复习中':'待学习'}</small></button>)}
    {!qs.length&&<div className="empty">没有匹配的错题。</div>}
  </div>
}

function ReviewView({qs,onReviewed}:{qs:Question[];onReviewed:()=>Promise<void>}){
  const [index,setIndex]=useState(0),[revealed,setRevealed]=useState(false),[busy,setBusy]=useState(false)
  useEffect(()=>{setIndex(0);setRevealed(false)},[qs.length])
  const q=qs[index]
  if(!q)return <div className="review-empty"><span>✓</span><h2>今天的复习完成了</h2><p>新的到期错题会自动出现在这里。</p></div>
  const grade=async(g:string)=>{setBusy(true);try{await post(`/questions/${q.id}/review`,{grade:g});await onReviewed();setRevealed(false);setIndex(i=>Math.min(i,Math.max(0,qs.length-2)))}finally{setBusy(false)}}
  return <div className="review-card"><div className="review-progress">第 {index+1} / {qs.length} 题</div><MediaGallery q={q} compact/><h2>{q.content}</h2><div className="chips">{q.knowledgePoints.map(x=><span key={x}>{x}</span>)}</div>
    {!revealed?<button className="reveal" onClick={()=>setRevealed(true)}>显示答案</button>:<div className="review-answer"><h3>正确答案</h3><pre>{q.answer||'尚未填写'}</pre>{q.analysis&&<><h3>解析</h3><p>{q.analysis}</p></>}<div className="review-buttons">{(['again','hard','good','easy'] as const).map(g=><button disabled={busy} key={g} onClick={()=>void grade(g)}><b>{labelGrade(g)}</b><small>{nextHint(q,g)}</small></button>)}</div></div>}
  </div>
}

function QuestionSheet({q,close,edit,refresh}:{q:Question;close:()=>void;edit:()=>void;refresh:()=>Promise<void>}){
  const [similar,setSimilar]=useState<Question[]>([]),[error,setError]=useState('')
  useEffect(()=>{post('/similar',{questionId:q.id,limit:5}).then((xs:any[])=>setSimilar(xs.map(x=>x.question))).catch(()=>setSimilar([]))},[q.id])
  const del=async()=>{if(window.confirm('确定删除这道错题及其复习记录吗？')){try{await request(`/questions/${q.id}`,'DELETE');await refresh()}catch(e){setError(message(e))}}}
  return <div className="dsh-wq-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><article className="dsh-wq-sheet"><header><button onClick={close}>×</button><span>错题详情</span><div><button onClick={edit}>编辑</button><button className="danger" onClick={()=>void del()}>删除</button></div></header><div className="sheet-body">
    {error&&<div className="dsh-wq-error">{error}</div>}<MediaGallery q={q}/><h2>{q.content}</h2><div className="chips">{q.knowledgePoints.map(x=><span key={x}>{x}</span>)}{q.tags.map(x=><span key={x}>#{x}</span>)}</div><div className="meta">难度 {'★'.repeat(q.difficulty)}{'☆'.repeat(5-q.difficulty)} · 复习 {q.review.reps} 次 · 间隔 {q.review.intervalDays} 天</div>
    <Detail title="正确答案" value={q.answer}/><Detail title="解析" value={q.analysis}/><Detail title="错误原因" value={q.mistakeCause}/><Detail title="举一反三" value={q.followupQuestion}/><Detail title="OCR 文本" value={q.ocrText}/>
    {!!similar.length&&<section><h3>相似错题</h3>{similar.map(x=><div className="similar" key={x.id}>{x.content.slice(0,90)}</div>)}</section>}
  </div></article></div>
}

function Detail({title,value}:{title:string;value?:string}){return value?<section><h3>{title}</h3><p className="preserve">{value}</p></section>:null}

function MediaGallery({q,compact}:{q:Question;compact?:boolean}){
  const primary=questionImage(q)
  const artifacts=q.artifacts??[]
  if(!primary&&!artifacts.length)return q.imagePath?<div className="media-missing">原题图片路径无法在浏览器中访问：{q.imagePath}</div>:null
  return <section className={`artifact-gallery${compact?' compact':''}`}>{!compact&&<h3>原题与互动内容</h3>}{primary&&<img className="question-image" src={primary} alt="原题图片"/>}{artifacts.map((a,i)=>{
    const title=a.title||`${a.kind} ${i+1}`
    if(a.kind==='image'){const src=mediaUrl(a.source,'image');return src?<figure key={i}><img className="question-image" src={src} alt={title}/>{compact?null:<figcaption>{title}</figcaption>}</figure>:null}
    if(a.kind==='video'){const src=mediaUrl(a.source,'video');return src?<figure key={i}><video className="question-video" src={src} poster={mediaUrl(a.poster,'image')} controls preload="metadata"/>{compact?null:<figcaption>{title}</figcaption>}</figure>:null}
    if(a.kind==='html'&&a.content)return <figure key={i}><iframe className="question-html" title={title} srcDoc={a.content} sandbox="allow-scripts"/>{compact?null:<figcaption>{title}</figcaption>}</figure>
    const src=mediaUrl(a.source,'html');return src?<figure key={i}><iframe className="question-html" title={title} src={src} sandbox="allow-scripts"/>{compact?null:<figcaption>{title}</figcaption>}</figure>:null
  })}</section>
}

function QuestionEditor({question,close,saved}:{question:Question|null;close:()=>void;saved:(q:Question)=>Promise<void>}){
  const [form,setForm]=useState(()=>({content:question?.content??'',answer:question?.answer??'',analysis:question?.analysis??'',mistakeCause:question?.mistakeCause??'',followupQuestion:question?.followupQuestion??'',ocrText:question?.ocrText??'',source:question?.source??'',knowledgePoints:(question?.knowledgePoints??[]).join('，'),tags:(question?.tags??[]).join('，'),difficulty:question?.difficulty??3,imageData:question?.imageData??'',mediaKind:(question?.artifacts??[]).find(x=>x.kind!=='html')?.kind??'image',mediaUrl:(question?.artifacts??[]).find(x=>x.kind!=='html')?.source??'',htmlTitle:(question?.artifacts??[]).find(x=>x.kind==='html')?.title??'',htmlContent:(question?.artifacts??[]).find(x=>x.kind==='html')?.content??''}))
  const [busy,setBusy]=useState(false),[error,setError]=useState('')
  const set=(key:string,value:any)=>setForm(x=>({...x,[key]:value}))
  const chooseImage=async(e:React.ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;if(file.size>5_000_000){setError('图片不能超过 5 MB');return}set('imageData',await readImage(file));if(!form.content)set('content',file.name.replace(/\.[^.]+$/,''))}
  const save=async()=>{if(!form.content.trim()){setError('请填写题目内容');return}setBusy(true);setError('');try{const artifacts:Artifact[]=[];if(form.mediaUrl.trim())artifacts.push({kind:form.mediaKind as 'image'|'video',title:'相关媒体',source:form.mediaUrl.trim()});if(form.htmlContent.trim())artifacts.push({kind:'html',title:form.htmlTitle.trim()||'互动卡片',content:form.htmlContent});const payload={...form,content:form.content.trim(),knowledgePoints:splitList(form.knowledgePoints),tags:splitList(form.tags),difficulty:Number(form.difficulty),artifacts};const q=await request(question?`/questions/${question.id}`:'/questions',question?'PATCH':'POST',payload);await saved(q)}catch(e){setError(message(e))}finally{setBusy(false)}}
  return <div className="dsh-wq-overlay"><article className="dsh-wq-sheet editor"><header><button onClick={close}>×</button><span>{question?'编辑错题':'新建错题'}</span><button className="primary" disabled={busy} onClick={()=>void save()}>{busy?'保存中…':'保存'}</button></header><div className="sheet-body form">
    {error&&<div className="dsh-wq-error">{error}</div>}<label className="image-picker">{form.imageData?<img src={form.imageData} alt="待导入错题"/>:<span>🖼️ 选择错题图片（可选）</span>}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>void chooseImage(e)}/></label>{form.imageData&&<button className="text-button" onClick={()=>set('imageData','')}>移除图片</button>}
    <Field label="题目" value={form.content} set={v=>set('content',v)} rows={5}/><div className="form-row"><Field label="知识点（逗号分隔）" value={form.knowledgePoints} set={v=>set('knowledgePoints',v)}/><Field label="标签（逗号分隔）" value={form.tags} set={v=>set('tags',v)}/></div><label>难度<select value={form.difficulty} onChange={e=>set('difficulty',e.target.value)}>{[1,2,3,4,5].map(x=><option value={x} key={x}>{x} 星</option>)}</select></label>
    <Field label="正确答案" value={form.answer} set={v=>set('answer',v)} rows={4}/><Field label="解析" value={form.analysis} set={v=>set('analysis',v)} rows={5}/><Field label="错误原因" value={form.mistakeCause} set={v=>set('mistakeCause',v)} rows={3}/><Field label="举一反三" value={form.followupQuestion} set={v=>set('followupQuestion',v)} rows={3}/><Field label="OCR 文本" value={form.ocrText} set={v=>set('ocrText',v)} rows={3}/><Field label="来源" value={form.source} set={v=>set('source',v)}/>
    <fieldset><legend>媒体与互动内容</legend><div className="form-row"><label>媒体类型<select value={form.mediaKind} onChange={e=>set('mediaKind',e.target.value)}><option value="image">图片</option><option value="video">视频</option></select></label><Field label="媒体 URL" value={form.mediaUrl} set={v=>set('mediaUrl',v)}/></div><Field label="互动卡片标题" value={form.htmlTitle} set={v=>set('htmlTitle',v)}/><Field label="互动卡片 HTML" value={form.htmlContent} set={v=>set('htmlContent',v)} rows={6}/></fieldset>
    <aside className="agent-tip"><b>用 Harness AI 自动填写</b><p>在对话中上传题图并说“分析后加入错题库”。Harness Vision 完成识别后会调用 add_question；对已有记录会调用 analyze_question。</p></aside>
  </div></article></div>
}

function Field({label,value,set,rows=1}:{label:string;value:string;set:(v:string)=>void;rows?:number}){return <label>{label}{rows>1?<textarea rows={rows} value={value} onChange={e=>set(e.target.value)}/>:<input value={value} onChange={e=>set(e.target.value)}/>}</label>}

function GraphView({g,onPick}:{g:any;onPick:(name:string)=>void}){
  const [vp,setVp]=useState<{scale:number;tx:number;ty:number}>({scale:1,tx:0,ty:0})
  const svgRef=React.useRef<SVGSVGElement>(null)
  const dragRef=React.useRef<{x:number;y:number;on:boolean}>({x:0,y:0,on:false})
  if(!g)return null
  const layout=layoutGraph(g)
  const [pos,setPos]=useState<Record<string,{x:number;y:number}>>({})
  const [hover,setHover]=useState<string|null>(null)
  const nodeDragRef=React.useRef<string|null>(null)
  const movedRef=React.useRef(false)
  const pairs=[...g.edges].sort((a:any,b:any)=>b.weight-a.weight).slice(0,8)
  const at=(n:any)=>pos[n.id]||{x:n.x,y:n.y}
  const computeFit=()=>{
    if(!layout.nodes.length)return {scale:1,tx:0,ty:0}
    const margin=48,WB=720,HB=480
    let minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9
    for(const n of layout.nodes){const bottom=n.y+n.r+34;minX=Math.min(minX,n.x-n.r);maxX=Math.max(maxX,n.x+n.r);minY=Math.min(minY,n.y-n.r);maxY=Math.max(maxY,bottom)}
    const bw=Math.max(1,maxX-minX),bh=Math.max(1,maxY-minY)
    const scale=Math.min(4,Math.max(0.4,Math.min((WB-2*margin)/bw,(HB-2*margin)/bh)))
    return {scale,tx:(WB-bw*scale)/2-minX*scale,ty:(HB-bh*scale)/2-minY*scale}
  }
  const fittedKey=JSON.stringify(g.nodes.map((n:any)=>n.id).sort())
  const reset=()=>{setPos({});setVp(computeFit())}
  React.useEffect(()=>{setPos({});setVp(computeFit())},[fittedKey])
  const zoomAt=(px:number,py:number,factor:number)=>{
    setVp(v=>{
      const scale=Math.min(4,Math.max(0.4,v.scale*factor))
      const k=scale/v.scale
      return {scale,tx:px-(px-v.tx)*k,ty:py-(py-v.ty)*k}
    })
  }
  const onWheel=(e:React.WheelEvent)=>{
    if(!svgRef.current)return
    const rect=svgRef.current.getBoundingClientRect()
    zoomAt(e.clientX-rect.left,e.clientY-rect.top,e.deltaY<0?1.12:1/1.12)
  }
  const onDown=(e:React.PointerEvent)=>{
    if(nodeDragRef.current)return
    dragRef.current={x:e.clientX,y:e.clientY,on:true}
    svgRef.current?.setPointerCapture(e.pointerId)
  }
  const onMove=(e:React.PointerEvent)=>{
    const nd=nodeDragRef.current
    if(nd){ // 拖动节点：换算到世界坐标并约束在画布内
      const rect=svgRef.current?.getBoundingClientRect();if(!rect)return
      movedRef.current=true
      const node=layout.nodes.find((n:any)=>n.id===nd)
      const radius=node?.r??24,labelRoom=radius+34
      const wx=(e.clientX-rect.left-vp.tx)/vp.scale,wy=(e.clientY-rect.top-vp.ty)/vp.scale
      const cx=Math.max(labelRoom,Math.min(720-labelRoom,wx)),cy=Math.max(labelRoom,Math.min(480-labelRoom,wy))
      setPos(p=>({...p,[nd]:{x:cx,y:cy,clamped:true}}))
      return
    }
    if(!dragRef.current.on)return
    setVp(v=>({...v,tx:v.tx+e.clientX-dragRef.current.x,ty:v.ty+e.clientY-dragRef.current.y}))
    dragRef.current={x:e.clientX,y:e.clientY,on:true}
  }
  const onUp=()=>{
    const wasNode=!!nodeDragRef.current
    dragRef.current.on=false
    nodeDragRef.current=null
    setHover(null)
    if(!wasNode)movedRef.current=false // 平移重置; 节点拖拽保留给 onClick 判断
  }
  const nodeDown=(e:React.PointerEvent,n:any)=>{
    e.stopPropagation();e.preventDefault()
    movedRef.current=false
    nodeDragRef.current=n.id;setPos(p=>({...p,[n.id]:{...at(n)}}))
  }
  const dim=(n:any,nab:Set<unknown>)=>!!hover&&hover!==n.id&&!nab.has(n.id)
  return <div className="graph-page"><h2>知识图谱</h2><p>节点大小代表错题数量，连线粗细代表共同出现的频率。可拖拽节点、滚轮缩放，点击节点查看错题，悬停高亮关联。</p>
    {layout.nodes.length?<div className="knowledge-map">
      <div className="graph-stage">
        <svg ref={svgRef} viewBox="0 0 720 480" role="img" aria-label="知识点关系图" onWheel={onWheel} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} style={{cursor:nodeDragRef.current?'move':dragRef.current.on?'grabbing':'grab'}}>
          <g transform={`translate(${vp.tx} ${vp.ty}) scale(${vp.scale})`}>
            <g className="graph-lines">{layout.edges.map((e:any)=>{
              const s=at(e.source),t=at(e.target),on=!hover||hover===e.source.id||hover===e.target.id
              return <g key={e.source.id+'-'+e.target.id} className={`graph-edge${on?'':' dim'}`}><line x1={s.x} y1={s.y} x2={t.x} y2={t.y} strokeWidth={Math.min(7,1+e.weight)} /><text x={(s.x+t.x)/2} y={(s.y+t.y)/2}>{e.weight}次</text></g>
            })}</g>
            <g>{layout.nodes.map((n:any)=>{
              const p=at(n),nabors=new Set(layout.edges.filter((e:any)=>e.source.id===n.id||e.target.id===n.id).flatMap((e:any)=>[e.source.id,e.target.id]))
              return <g className={`graph-vertex${hover===n.id?' on':''}${dim(n,nabors)?' dim':''}`} key={n.id} role="button" tabIndex={0} onPointerDown={e=>nodeDown(e,n)} onClick={ev=>{ev.stopPropagation();if(movedRef.current)movedRef.current=false;else onPick(n.id)}} onPointerEnter={()=>setHover(n.id)} onPointerLeave={()=>setHover(null)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')onPick(n.id)}}><circle cx={p.x} cy={p.y} r={n.r} fill={n.color}/><text x={p.x} y={p.y+n.r+16} textAnchor="middle">{n.id} ({n.count})</text><title>{n.id}：{n.count} 道，掌握 {n.mastery}%，待复习 {n.due}</title></g>
            })}</g>
          </g>
        </svg>
        <div className="graph-controls">
          <button onClick={(e)=>{const r=svgRef.current?.getBoundingClientRect();zoomAt((r?.width||720)/2,(r?.height||480)/2,1.2)}} aria-label="放大">＋</button>
          <button onClick={(e)=>{const r=svgRef.current?.getBoundingClientRect();zoomAt((r?.width||720)/2,(r?.height||480)/2,1/1.2)}} aria-label="缩小">－</button>
          <button onClick={reset} aria-label="重置">⟲</button>
        </div>
        <span className="graph-zoom">{Math.round(vp.scale*100)}%</span>
      </div>
      <aside><h3>关联最强的知识点对</h3>{pairs.map((e:any)=><button key={e.source+e.target} onClick={()=>onPick(e.source)}><span>{e.source}</span><i>×</i><span>{e.target}</span><b>{e.weight} 次</b></button>)}{!pairs.length&&<p>需要至少一道包含两个知识点的错题。</p>}</aside>
    </div>:<div className="empty">添加知识点后会生成关系图。</div>}
  </div>
}

function layoutGraph(g:any){
  const source=[...g.nodes].sort((a:any,b:any)=>b.count-a.count).slice(0,50)
  const allowed=new Set(source.map((x:any)=>x.id));const max=Math.max(1,...source.map((x:any)=>x.count))
  const colors=['#4f46e5','#0ea5e9','#10b981','#8b5cf6','#ef4444','#f59e0b','#06b6d4','#ec4899']
  const nodes=source.map((n:any,i:number)=>{const angle=2*Math.PI*i/Math.max(1,source.length);return{...n,x:300+Math.cos(angle)*170,y:235+Math.sin(angle)*170,r:16+22*Math.sqrt(n.count/max),color:colors[i%colors.length]}})
  const byId=new Map(nodes.map((n:any)=>[n.id,n]));const edges=g.edges.filter((e:any)=>allowed.has(e.source)&&allowed.has(e.target)).map((e:any)=>({...e,source:byId.get(e.source),target:byId.get(e.target)}))
  for(let step=0;step<140;step++){
    const force=nodes.map(()=>({x:0,y:0}))
    for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const dx=nodes[i].x-nodes[j].x,dy=nodes[i].y-nodes[j].y,d2=Math.max(100,dx*dx+dy*dy),f=9000/d2,dist=Math.sqrt(d2);force[i].x+=dx/dist*f;force[i].y+=dy/dist*f;force[j].x-=dx/dist*f;force[j].y-=dy/dist*f}
    for(const e of edges){const dx=e.target.x-e.source.x,dy=e.target.y-e.source.y,dist=Math.max(1,Math.hypot(dx,dy)),f=(dist-125)*.012;const sx=dx/dist*f,sy=dy/dist*f;const a=nodes.indexOf(e.source),b=nodes.indexOf(e.target);force[a].x+=sx;force[a].y+=sy;force[b].x-=sx;force[b].y-=sy}
    nodes.forEach((n:any,i:number)=>{force[i].x+=(300-n.x)*.002;force[i].y+=(230-n.y)*.002;n.x=Math.max(n.r+15,Math.min(585-n.r,n.x+force[i].x*.35));n.y=Math.max(n.r+15,Math.min(445-n.r,n.y+force[i].y*.35))})
  }
  return{nodes,edges}
}

function get(path:string){return request(path,'GET')}
function post(path:string,body:any){return request(path,'POST',body)}
async function request(path:string,method='GET',body?:any){const r=await fetch(API+path,{method,credentials:'same-origin',headers:{'content-type':'application/json','x-dsh-wrong-question-client':'workspace'},body:body===undefined?undefined:JSON.stringify(body)});const data=await r.json().catch(()=>null);if(!r.ok)throw new Error(data?.error||`HTTP ${r.status}`);return data}
function splitList(value:string){return [...new Set(value.split(/[,，;；\n]/).map(x=>x.trim()).filter(Boolean))]}
function questionText(q:Question){return [q.content,q.answer,q.analysis,q.mistakeCause,q.ocrText,...q.tags,...q.knowledgePoints].join(' ').toLocaleLowerCase()}
function isDue(q:Question){return new Date(q.review.dueAt)<=new Date()}
function message(e:unknown){return e instanceof Error?e.message:String(e)}
function labelGrade(g:string){return ({again:'Again',hard:'Hard',good:'Good',easy:'Easy'} as Record<string,string>)[g]}
function nextHint(q:Question,g:string){if(g==='again')return'稍后重来';if(q.review.reps===0)return g==='easy'?'约 1 天':'1 天';const factor=g==='hard'?1.2:g==='easy'?1.3*q.review.ease:q.review.ease;return `约 ${Math.max(1,Math.round(Math.max(1,q.review.intervalDays)*factor))} 天`}
function readImage(file:File){return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file)})}
function mediaUrl(value:unknown,kind:'image'|'video'|'html'){
  if(typeof value!=='string'||!value.trim())return undefined
  const url=value.trim()
  if(url.startsWith('/')||/^https?:\/\//i.test(url))return url
  if(kind==='image'&&/^data:image\/(png|jpeg|webp|gif);base64,/i.test(url))return url
  if(kind==='video'&&/^data:video\/(mp4|webm|ogg);base64,/i.test(url))return url
  return undefined
}
function questionImage(q:Question){return mediaUrl(q.imageData,'image')||mediaUrl(q.imagePath,'image')||(q.imagePath?`${API}/questions/${encodeURIComponent(q.id)}/image`:undefined)}
