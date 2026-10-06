import React from 'react'
import type { Context } from '@deepseek-ai/cordis'

export function registerMainPanel(ctx: Context,id:string,priority:number,render:(props:any)=>React.ReactElement,onHidden=()=>{}):()=>void{
  const ui=ctx as any
  // `layout` is optional in newer DSH web entries. Cordis contexts can throw
  // when an undeclared service property is read, so probe it defensively.
  let layout:{selectPanel?: (id:string|null)=>void}|undefined
  try { layout=ui.layout as {selectPanel?: (id:string|null)=>void} } catch { layout=undefined }
  if(!ui.slots||typeof ui.slots.register!=='function') return ()=>{}
  const slots=ui.slots as {register(o:{name:'main';key:string},c:(p:any)=>React.ReactElement):()=>void}
  let disposed=false
  const remove=slots.register({name:'main',key:id},props=>React.createElement(PanelLifecycle,{onHidden},render(props)))
  if(typeof layout?.selectPanel==='function'){
    try{layout.selectPanel(id)}catch(e){remove();throw e}
  }
  return ()=>{if(disposed)return;disposed=true;remove()}
}
function PanelLifecycle({children,onHidden}:{children?:React.ReactElement;onHidden:()=>void}){
  React.useEffect(()=>()=>{queueMicrotask(onHidden)},[onHidden])
  return children??null
}
