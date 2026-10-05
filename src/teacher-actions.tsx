import React from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'

export const TEACHING_ACTIONS = [
  { id: 'learning-variant', icon: '🔄', label: '举一反三', instruction: '请根据刚才的题目或知识点开始递进式举一反三练习，一次先给我一道题。' },
  { id: 'learning-animation', icon: '🎬', label: '生成动画', instruction: '请把刚才讨论的内容制作成学习动画，默认包含中文旁白。' },
] as const

type Props = PropsRuntime<'conversation.input.right'>

export function registerTeachingActions(ctx: Context): void {
  const ui = ctx as any
  if (!ui.slots || typeof ui.slots.inject !== 'function') return
  ui.slots.inject('conversation.input.right', () => ui.slots.register({
    name: 'conversation.input.right',
    id: 'learning-actions',
    order: 80,
  }, TeachingActionBar))
}

function TeachingActionBar({ useInput, inputActions }: Props) {
  const input = useInput((snapshot: any) => ({ phase: snapshot.phase, draft: snapshot.draft }))
  const disabled = input.phase === 'submitting' || input.phase === 'adjudicating'

  const invoke = (skill: string, instruction: string) => {
    if (disabled) return
    const draft = input.draft.trim()
    const nextDraft = draft === ''
      ? `/${skill} ${instruction}`
      : `${input.draft}\n/${skill} ${instruction}`
    inputActions.setDraft(nextDraft)
    inputActions.submit()
  }

  return <div className='dsh-learning-actions' aria-label='学习工具'>
    {TEACHING_ACTIONS.map(action => (
      <button
        key={action.id}
        type='button'
        className='dsh-learning-action'
        disabled={disabled}
        title={action.label}
        onClick={() => invoke(action.id, action.instruction)}
      >
        <span aria-hidden='true'>{action.icon}</span>
        <span>{action.label}</span>
      </button>
    ))}
  </div>
}
