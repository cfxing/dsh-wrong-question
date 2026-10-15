import type { Context } from '@deepseek-ai/cordis';
export declare const name = "wrong-question";
export declare const inject: string[];
/**
 * Keep the plugin entrypoint intentionally tiny.
 *
 * DeepSeek Harness evaluates this module during web boot. Runtime modules are
 * loaded only after the entrypoint has activated, so a SQLite/Kuzu/Web/media
 * failure is reported as a bootstrap error instead of making plugin loading
 * fail before activation.
 */
export declare function apply(ctx: Context): void;
