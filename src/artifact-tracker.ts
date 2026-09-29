import type { QuestionArtifact } from './domain.js'

export interface CurrentTurnTeachingArtifact extends QuestionArtifact {
  kind: 'html'
  content: string
}

interface State {
  turn: number
  artifacts: Map<string, CurrentTurnTeachingArtifact>
}

/**
 * Capture OpenMAIC visual results produced during the current turn.
 *
 * dsh-openmaic persists its authored visual in tool/result meta:
 * - openmaic_render -> meta.fragment
 * - openmaic_widget -> meta.html
 *
 * We retain the authored HTML instead of replacing it with a prose summary.
 * This makes the visual card available to the wrong-question media gallery.
 */
export function createCurrentTurnTeachingArtifactTracker(ctx: any) {
  const states = new WeakMap<object, State>()

  ctx.on('session/event', (session: any, event: any) => {
    if (!session || !event) return
    if (event.type === 'turn/start') {
      states.set(session, { turn: Number(event.data?.turn ?? 0), artifacts: new Map() })
      return
    }
    if (event.type !== 'tool/result') return

    const state = states.get(session)
    if (!state) return

    const meta = event.data?.meta
    if (!meta || typeof meta !== 'object') return

    let artifact: CurrentTurnTeachingArtifact | undefined
    if (meta.kind === 'openmaic-render' && typeof meta.fragment === 'string' && meta.fragment.trim()) {
      artifact = {
        kind: 'html',
        title: typeof meta.title === 'string' && meta.title.trim() ? '解题图示 · ' + meta.title.trim() : '解题图示',
        content: meta.fragment,
      }
    } else if (meta.kind === 'openmaic-widget' && typeof meta.html === 'string' && meta.html.trim()) {
      artifact = {
        kind: 'html',
        title: typeof meta.title === 'string' && meta.title.trim() ? '解题互动 · ' + meta.title.trim() : '解题互动',
        content: meta.html,
      }
    }

    if (!artifact) return
    const callId = String(event.data?.message?.source?.callId ?? event.seq ?? (artifact.kind + ':' + artifact.title))
    state.artifacts.set(callId, artifact)
  }, { global: true })

  return {
    artifactsFor(session: any): CurrentTurnTeachingArtifact[] {
      if (!session) return []
      const state = states.get(session)
      return state ? Array.from(state.artifacts.values()) : []
    },
    reset(session: any) {
      if (session) states.delete(session)
    },
  }
}
