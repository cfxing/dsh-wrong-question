import type { Context } from '@deepseek-ai/cordis'

export const name='wrong-question'
// `webServer` is acquired by runtime bootstrap after activation.  Declaring it
// here makes the whole entrypoint fail on DSH 0.2.0-rc.2 when the web service
// is registered after plugin boot (the plugin then shows as "web boot: failed").
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
