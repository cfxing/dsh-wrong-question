import type { Context } from '@deepseek-ai/cordis'

export const name='wrong-question'
export const inject=['tools']

/**
 * Keep the plugin entrypoint intentionally tiny.
 *
 * DeepSeek Harness evaluates this module during web boot. Runtime modules are
 * loaded only after the entrypoint has activated, so a SQLite/Kuzu/Web/media
 * failure is reported as a bootstrap error instead of making plugin loading
 * fail before activation.
 */
export function apply(ctx:Context): void {
  void import('./runtime.js')
    .then(({ bootstrap }) => bootstrap(ctx))
    .catch((err) => {
      console.error('[dsh-wrong-question] bootstrap failed:', err)
    })
}
