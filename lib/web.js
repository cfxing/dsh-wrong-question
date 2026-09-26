import { readFileSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { join, isAbsolute } from 'node:path';
import { homedir } from 'node:os';
import { scheduleReview } from './review.js';
import { hybridSearch } from './hybrid.js';
const PREFIX = '/wrong-question-control/v1';
const WEB = '/wrong-question/';
const html = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');
const js = readFileSync(new URL('../web/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../web/app.css', import.meta.url), 'utf8');
function send(res, status, body) { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)); }
function error(res, e) { send(res, 400, { error: e instanceof Error ? e.message : String(e) }); }
async function body(req) { let s = ''; for await (const c of req) {
    s += c;
    if (s.length > 8_000_000)
        throw new Error('request body too large');
} return s ? JSON.parse(s) : {}; }
function sameOrigin(req) { const origin = req.headers.origin; if (!origin)
    return true; const host = req.headers.host ?? ''; try {
    return new URL(origin).host === host;
}
catch {
    return false;
} }
/** 解析题目图片的磁盘绝对路径。imagePath 可能为绝对路径、相对进程 CWD 或相对 DSH_HOME；逐个候选基目录探测。 */
async function resolveImagePath(imagePath) {
    const candidates = [];
    if (isAbsolute(imagePath)) {
        candidates.push(imagePath);
    }
    else {
        const home = process.env.DSH_HOME || join(homedir(), '.dsh');
        candidates.push(join(home, 'wrong-question', imagePath), join(home, imagePath), join(process.cwd(), imagePath), join(process.cwd(), 'wrong-question', imagePath));
    }
    for (const c of candidates) {
        try {
            if ((await stat(c)).isFile())
                return c;
        }
        catch { /* 继续探测下一个 */ }
    }
    return null;
}
export function registerWrongQuestionWeb(ctx, db, hybrid = { graph: null, embedder: undefined }) {
    const ws = ctx.webServer ?? ctx.get('webServer');
    if (!ws)
        throw new Error('dsh-wrong-question requires webServer');
    const routes = [
        ws.register({ kind: 'exact', path: WEB, handler: (_req, res) => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(html); } }),
        ws.register({ kind: 'exact', path: WEB + 'app.js', handler: (_req, res) => { res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-cache' }); res.end(js); } }),
        ws.register({ kind: 'exact', path: WEB + 'app.css', handler: (_req, res) => { res.writeHead(200, { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'no-cache' }); res.end(css); } }),
        ws.register({ kind: 'prefix', path: PREFIX, handler: async (req, res) => {
                if (!sameOrigin(req)) {
                    res.writeHead(403).end();
                    return;
                }
                try {
                    const u = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
                    const p = u.pathname.slice(PREFIX.length);
                    if (req.method === 'GET' && p === '/dashboard')
                        return send(res, 200, db.dashboard());
                    if (req.method === 'GET' && p === '/graph')
                        return send(res, 200, db.graph());
                    if (req.method === 'GET' && p === '/questions') {
                        return send(res, 200, db.list({ limit: Number(u.searchParams.get('limit') ?? 100), offset: Number(u.searchParams.get('offset') ?? 0), tag: u.searchParams.get('tag') ?? undefined, knowledgePoint: u.searchParams.get('knowledgePoint') ?? undefined, dueOnly: u.searchParams.get('dueOnly') === '1' }));
                    }
                    if (req.method === 'POST' && p === '/search') {
                        const b = await body(req);
                        return send(res, 200, db.search(String(b.query ?? ''), Math.min(50, Number(b.limit ?? 20))));
                    }
                    if (req.method === 'POST' && p === '/hybrid') {
                        const b = await body(req);
                        return send(res, 200, await hybridSearch(db, hybrid.graph, hybrid.embedder, String(b.query ?? ''), { topK: Math.min(50, Number(b.limit ?? 20)) }));
                    }
                    if (req.method === 'POST' && p === '/similar') {
                        const b = await body(req);
                        return send(res, 200, db.findSimilar(String(b.questionId ?? ''), Math.min(50, Number(b.limit ?? 10))));
                    }
                    const m = p.match(/^\/questions\/([^/]+)$/);
                    const image = p.match(/^\/questions\/([^/]+)\/image$/);
                    if (image && req.method === 'GET') {
                        const q = db.getQuestion(decodeURIComponent(image[1]));
                        if (!q?.imagePath)
                            throw new Error('Question image not found');
                        const abs = await resolveImagePath(q.imagePath);
                        if (!abs)
                            throw new Error('Question image file not found');
                        const info = await stat(abs);
                        if (!info.isFile() || info.size > 8_000_000)
                            throw new Error('Question image is invalid or too large');
                        const data = await readFile(abs);
                        const type = imageMime(data);
                        if (!type)
                            throw new Error('Unsupported question image');
                        res.writeHead(200, { 'content-type': type, 'content-length': String(data.length), 'cache-control': 'private, max-age=300' });
                        res.end(data);
                        return;
                    }
                    if (m && req.method === 'GET') {
                        const q = db.getQuestion(decodeURIComponent(m[1]));
                        if (!q)
                            throw new Error('Question not found');
                        return send(res, 200, q);
                    }
                    if (m && req.method === 'DELETE') {
                        return send(res, 200, { deleted: db.delete(decodeURIComponent(m[1])) });
                    }
                    const review = p.match(/^\/questions\/([^/]+)\/review$/);
                    if (review && req.method === 'POST') {
                        const id = decodeURIComponent(review[1]);
                        const b = await body(req);
                        const grade = b.grade;
                        if (!['again', 'hard', 'good', 'easy'].includes(grade))
                            throw new Error('invalid review grade');
                        const q = db.getQuestion(id);
                        if (!q)
                            throw new Error('Question not found');
                        return send(res, 200, db.review(id, grade, scheduleReview(q.review, grade).state));
                    }
                    if (req.method === 'POST' && p === '/questions') {
                        const b = await body(req);
                        return send(res, 201, db.upsert({ content: String(b.content ?? '').trim(), answer: String(b.answer ?? ''), knowledgePoints: Array.isArray(b.knowledgePoints) ? b.knowledgePoints : [], tags: Array.isArray(b.tags) ? b.tags : [], difficulty: Number(b.difficulty ?? 3), mistakeCause: b.mistakeCause, analysis: b.analysis, followupQuestion: b.followupQuestion, source: b.source, imagePath: b.imagePath, imageData: validImage(b.imageData), artifacts: validArtifacts(b.artifacts), ocrText: b.ocrText }));
                    }
                    if (req.method === 'PATCH' && m) {
                        const q = db.getQuestion(decodeURIComponent(m[1]));
                        if (!q)
                            throw new Error('Question not found');
                        const b = await body(req);
                        return send(res, 200, db.upsert({ id: q.id, content: String(b.content ?? q.content).trim(), answer: b.answer ?? q.answer, knowledgePoints: b.knowledgePoints ?? q.knowledgePoints, tags: b.tags ?? q.tags, difficulty: b.difficulty ?? q.difficulty, mistakeCause: b.mistakeCause ?? q.mistakeCause, analysis: b.analysis ?? q.analysis, followupQuestion: b.followupQuestion ?? q.followupQuestion, source: b.source ?? q.source, imagePath: b.imagePath ?? q.imagePath, imageData: b.imageData === undefined ? q.imageData : validImage(b.imageData), artifacts: b.artifacts === undefined ? q.artifacts : validArtifacts(b.artifacts), ocrText: b.ocrText ?? q.ocrText }));
                    }
                    throw new Error('route not found');
                }
                catch (e) {
                    error(res, e);
                }
            } })
    ];
    return () => routes.forEach(x => x());
}
function validImage(value) {
    if (value == null || value === '')
        return value;
    if (typeof value !== 'string' || !/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(value) || value.length > 7_500_000)
        throw new Error('invalid or oversized image');
    return value;
}
function validArtifacts(value) {
    if (value == null)
        return [];
    if (!Array.isArray(value) || value.length > 20)
        throw new Error('invalid artifacts');
    return value.map((item) => {
        if (!item || !['image', 'video', 'html'].includes(item.kind))
            throw new Error('invalid artifact kind');
        const source = typeof item.source === 'string' ? item.source.slice(0, 2_000_000) : undefined;
        const content = typeof item.content === 'string' ? item.content.slice(0, 1_000_000) : undefined;
        if (item.kind === 'html' && !content && !source)
            throw new Error('HTML artifact needs content or source');
        if (item.kind !== 'html' && !source)
            throw new Error('media artifact needs source');
        return { kind: item.kind, title: typeof item.title === 'string' ? item.title.slice(0, 200) : undefined, source, content, poster: typeof item.poster === 'string' ? item.poster.slice(0, 2000) : undefined };
    });
}
function imageMime(data) {
    if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
        return 'image/png';
    if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff)
        return 'image/jpeg';
    if (data.subarray(0, 6).toString('ascii') === 'GIF87a' || data.subarray(0, 6).toString('ascii') === 'GIF89a')
        return 'image/gif';
    if (data.subarray(0, 4).toString('ascii') === 'RIFF' && data.subarray(8, 12).toString('ascii') === 'WEBP')
        return 'image/webp';
    return undefined;
}
