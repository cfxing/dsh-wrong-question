import { mkdir, copyFile, stat, writeFile } from 'node:fs/promises';
import { basename, extname, isAbsolute, join, resolve } from 'node:path';
function slug(value) {
    const normalized = value.normalize('NFKC').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
    return normalized.slice(0, 80) || 'artifact';
}
function safeExtension(kind, source) {
    const ext = extname(source ?? '').toLowerCase();
    if (kind === 'video' && ['.mp4', '.webm', '.ogg', '.mov', '.m4v'].includes(ext))
        return ext;
    if (kind === 'image' && ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext))
        return ext;
    if (kind === 'html' && ['.html', '.htm'].includes(ext))
        return ext;
    return kind === 'html' ? '.html' : kind === 'video' ? '.mp4' : '.bin';
}
function isDocumentHtml(content) {
    return /<!doctype\b|<\s*(?:html|head|body)\b/iu.test(content);
}
function wrapHtmlFragment(fragment, title) {
    const escaped = title.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://esm.sh https://fonts.bunny.net https://fonts.googleapis.com https://fonts.gstatic.com https://unpkg.com blob: data:; style-src 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://fonts.bunny.net https://fonts.googleapis.com https://fonts.gstatic.com https://unpkg.com; img-src https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://esm.sh https://fonts.bunny.net https://fonts.googleapis.com https://fonts.gstatic.com https://unpkg.com blob: data:; media-src https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://esm.sh https://fonts.bunny.net https://fonts.googleapis.com https://fonts.gstatic.com https://unpkg.com blob: data:; connect-src blob: data:; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
<title>${escaped}</title>
<style>
html,body{margin:0;padding:0;background:transparent}
body{padding:4px 2px;font-family:system-ui,sans-serif}
</style>
</head>
<body>
${fragment}
</body>
</html>
`;
}
function sourcePath(source, exec) {
    if (!source || /^(?:https?:|data:|blob:|file:)/i.test(source))
        return null;
    const cwd = exec?.agent?.session?.header?.cwd;
    return isAbsolute(source) ? source : resolve(cwd ?? process.cwd(), source);
}
async function copyLocalArtifact(exec, source, targetDir, questionId, index, kind) {
    const abs = sourcePath(source, exec);
    if (!abs)
        return null;
    let info;
    try {
        info = await stat(abs);
    }
    catch {
        return null;
    }
    if (!info.isFile())
        throw new Error(`Generated ${kind} artifact is not a regular file: ${source}`);
    if (info.size > 512_000_000)
        throw new Error(`Generated ${kind} artifact is too large: ${source}`);
    const ext = safeExtension(kind, source);
    const stem = slug(basename(source, ext));
    const filename = `${String(index + 1).padStart(2, '0')}-${stem}${ext}`;
    const mediaDir = join(targetDir, 'media', questionId);
    await mkdir(mediaDir, { recursive: true });
    const destination = join(mediaDir, filename);
    try {
        await copyFile(abs, destination);
    }
    catch (error) {
        throw new Error(`Failed to copy generated ${kind} artifact: ${error instanceof Error ? error.message : String(error)}`);
    }
    return join('media', questionId, filename);
}
/**
 * Make generated local artifacts plugin-owned.
 * - video.source: copy the generated local media file into wrong-question/media
 * - html.content: write the HTML card into wrong-question/media as a standalone .html file
 * - html.source/local image/source: copy local files when available
 * - remote/data URLs remain unchanged because they cannot be safely assumed to be downloadable artifacts.
 *
 * Multiple artifacts are preserved independently, so a question can have a video and an HTML card at the same time.
 */
export async function persistQuestionArtifacts(exec, artifacts, wrongQuestionDir, questionId) {
    const result = [];
    const usedNames = new Set();
    for (let index = 0; index < artifacts.length; index++) {
        const artifact = artifacts[index];
        if (!artifact || !['image', 'video', 'html'].includes(artifact.kind))
            continue;
        let source = artifact.source;
        let content = artifact.content;
        if (artifact.kind === 'html' && content?.trim()) {
            const mediaDir = join(wrongQuestionDir, 'media', questionId);
            await mkdir(mediaDir, { recursive: true });
            const filename = `${String(index + 1).padStart(2, '0')}-${slug(artifact.title ?? 'card')}.html`;
            let finalName = filename, seq = 2;
            while (usedNames.has(finalName)) {
                finalName = `${String(index + 1).padStart(2, '0')}-${slug(artifact.title ?? 'card')}-${seq++}.html`;
            }
            usedNames.add(finalName);
            const html = isDocumentHtml(content) ? content : wrapHtmlFragment(content, artifact.title ?? '学习卡片');
            await writeFile(join(mediaDir, finalName), html, { encoding: 'utf8' });
            source = join('media', questionId, finalName);
            content = undefined;
        }
        else if (source) {
            const copied = await copyLocalArtifact(exec, source, wrongQuestionDir, questionId, index, artifact.kind);
            if (copied)
                source = copied;
        }
        result.push({ ...artifact, source, content });
    }
    return result;
}
