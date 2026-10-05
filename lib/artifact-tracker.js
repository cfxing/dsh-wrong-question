/**
 * Capture OpenMAIC visual results from the authoritative tool-result boundary.
 *
 * dsh-openmaic attaches the replayable teaching content to ToolResult.meta:
 * - openmaic_render -> { kind: 'openmaic-render', fragment, title }
 * - openmaic_widget -> { kind: 'openmaic-widget', html, title }
 *
 * We use session/event only for the turn boundary. The actual OpenMAIC capture
 * happens on tools/result, where the normalized immutable ToolResult is already
 * available with its presentation metadata.
 */
export function createCurrentTurnTeachingArtifactTracker(ctx) {
    const states = new WeakMap();
    ctx.on('session/event', (session, event) => {
        if (!session || !event)
            return;
        if (event.type === 'turn/start') {
            states.set(session, { artifacts: new Map() });
        }
    }, { global: true });
    ctx.on('tools/result', (exec, result) => {
        const name = String(exec?.name ?? '');
        if (name !== 'openmaic_render' && name !== 'openmaic_widget')
            return;
        const session = exec?.agent?.session;
        if (!session || typeof session !== 'object')
            return;
        const meta = result?.meta;
        if (!meta || typeof meta !== 'object')
            return;
        let artifact;
        if (meta.kind === 'openmaic-render'
            && typeof meta.fragment === 'string'
            && meta.fragment.trim()) {
            artifact = {
                kind: 'html',
                title: typeof meta.title === 'string' && meta.title.trim()
                    ? '解题图示 · ' + meta.title.trim()
                    : '解题图示',
                content: meta.fragment,
            };
        }
        else if (meta.kind === 'openmaic-widget'
            && typeof meta.html === 'string'
            && meta.html.trim()) {
            artifact = {
                kind: 'html',
                title: typeof meta.title === 'string' && meta.title.trim()
                    ? '解题互动 · ' + meta.title.trim()
                    : '解题互动',
                content: meta.html,
            };
        }
        if (!artifact)
            return;
        const state = states.get(session) ?? { artifacts: new Map() };
        const callId = String(exec?.callId ?? exec?.token ?? artifact.title);
        state.artifacts.set(callId, artifact);
        states.set(session, state);
    });
    return {
        artifactsFor(session) {
            if (!session)
                return [];
            const state = states.get(session);
            return state ? Array.from(state.artifacts.values()) : [];
        },
        reset(session) {
            if (session)
                states.delete(session);
        },
    };
}
