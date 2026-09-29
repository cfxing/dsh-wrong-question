import type { QuestionArtifact } from './domain.js'

export interface CurrentTurnTeachingArtifact extends QuestionArtifact {
  kind: 'html'
  content: string
}

interface State {
  artifacts: Map<string, CurrentTurnTeachingArtifact>
}

/**
 * Capture OpenMAIC visual results from the authoritative tool-result boundary.
 *
 * dsh-openmaic attaches the replayable teaching content to ToolResult.meta:
 * - openmaic_render -> { kind: 'openmaic-render', fragment, title }
 * - openmaic_widget -> { kind: 'openmaic-widget', html, title }
 *
 * This is more reliable than reading session/event because tools/result is the
 * canonical post-normalization observation point of the tool runtime.
 */
export function createCurrentTurnTeachingArtifactTracker(ctx: any) {
  const states = new WeakMap<object, State>()

  ctx.on('turn/start', (event: any) => {
    const session = event?.session ?? event?.data?.session
    if (session && typeof session === 'object') {
      states.set(session, { artifacts: new Map() })
    }
  })

  ctx.on('tools/result', (exec: any, result: any) => {
    const name = String(exec?.name ?? '')
    if (name !== 'openmaic_render' && name !== 'openmaic_widget') return

    const session = exec?.agent?.session
    if (!session || typeof session !== 'object') return

    const meta = result?.meta
    if (!meta || typeof meta !== 'object') return

    let artifact: CurrentTurnTeachingArtifact | undefined

    if (meta.kind === 'openmaic-render'
      && typeof meta.fragment === 'string'
      && meta.fragment.trim()) {
      artifact = {
        kind: 'html',
        title: typeof meta.title === 'string' && meta.title.trim()
          ? '解题图示 · ' + meta.title.trim()
          : '解题图示',
        content: meta.fragment,
      }
    } else if (meta.kind === 'openmaic-widget'
      && typeof meta.html === 'string'
      && meta.html.trim()) {
      artifact = {
        kind: 'html',
        title: typeof meta.title === 'string' && meta.title.trim()
          ? '解题互动 · ' + meta.title.trim()
          : '解题互动',
        content: meta.html,
      }
    }

    if (!artifact) return

    const state = states.get(session) ?? { artifacts: new Map() }
    const callId = String(exec?.callId ?? exec?.token ?? artifact.title)
    state.artifacts.set(callId, artifact)
    states.set(session, state)
  })

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
