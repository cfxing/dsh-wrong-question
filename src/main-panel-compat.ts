import React from 'react'
import type { Context } from '@deepseek-ai/cordis'

export function registerMainPanel(ctx: Context,id:string,priority:number,render:(props:any)=>React.ReactElement,onHidden=()=>{}):()=>void{
  const ui=ctx as any
  const layout=ui.layout as {selectPanel?: (id:string|null)=>void}
  if(typeof layout.selectPanel!=='function') return ui.slots.register({name:'conversation',priority},render)
  const slots=ui.slots as {register(o:{name:'main';key:string},c:(p:any)=>React.ReactElement):()=>void}
  let disposed=false
  const remove=slots.register({name:'main',key:id},props=>React.createElement(PanelLifecycle,{onHidden},render(props)))
  try{layout.selectPanel(id)}catch(e){remove();throw e}
  return ()=>{if(disposed)return;disposed=true;remove()}
}
function PanelLifecycle({children,onHidden}:{children?:React.ReactElement;onHidden:()=>void}){
  React.useEffect(()=>()=>{queueMicrotask(onHidden)},[onHidden])
  return children??null
}
